// Server-side field test of hosted vision AI on sale photos: the same photo, instructions and answer format go to
// Claude, Gemini and OpenAI so their answers can be compared on real garage-sale tables. Mirrors the bake-off script
// (scripts/scan-test/run.mjs on the test branch). Keys come from ANTHROPIC_API_KEY, GEMINI_API_KEY and OPENAI_API_KEY.

import { SCAN_CATEGORIES, type ScanAnswer, type ScanResult, type ScanSupplier } from "./scan-test-types";

export { SCAN_SUPPLIERS } from "./scan-test-types";
export type { ScanAnswer, ScanResult, ScanSupplier } from "./scan-test-types";

// Prices in US$ per million tokens (input, output), checked 2026-10-04.
const SUPPLIERS: Record<ScanSupplier, { model: string; price: [number, number]; key: string }> = {
  claude: { model: process.env.CLAUDE_MODEL || "claude-sonnet-5-5", price: [2, 10], key: "ANTHROPIC_API_KEY" },
  gemini: { model: process.env.GEMINI_MODEL || "gemini-3.7-flash", price: [0.75, 3.75], key: "GEMINI_API_KEY" }, // introductory rate, doubles from 2027
  openai: { model: process.env.OPENAI_MODEL || "gpt-6.1-sol", price: [2, 10], key: "OPENAI_API_KEY" },
};

export const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "items", "privacy_flags"],
  properties: {
    summary: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "category", "description", "search_terms", "highlight", "confidence", "box"],
        properties: {
          label: { type: "string" },
          category: { type: "string", enum: SCAN_CATEGORIES },
          description: { type: "string" },
          search_terms: { type: "array", items: { type: "string" } },
          highlight: { type: "boolean" },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          box: {
            type: "object",
            additionalProperties: false,
            required: ["x_min", "y_min", "x_max", "y_max"],
            properties: { x_min: { type: "integer" }, y_min: { type: "integer" }, x_max: { type: "integer" }, y_max: { type: "integer" } },
          },
        },
      },
    },
    privacy_flags: { type: "array", items: { type: "string", enum: ["face", "number_plate", "document", "screen", "medication"] } },
  },
};

export const PROMPT = `This photo was taken by a seller at a New Zealand garage sale. Buyers will search the sale by item.

List every item or clearly grouped lot a buyer could pick up and buy. Group near-identical small things (for example "box of paperbacks", "set of 6 glasses") instead of listing each one. Do not list fixtures that aren't for sale, such as the garage door, the car or the house.

For each item give:
- label: a short name a buyer would recognise, with brand or era when visible ("Makita cordless drill", "1970s Crown Lynn vase").
- category: one of ${SCAN_CATEGORIES.join(", ")}.
- description: one or two plain sentences on what it is and its visible condition. Don't guess prices.
- search_terms: 3 to 8 words or phrases a New Zealand buyer might type, including Kiwi words where they fit (chilly bin, jandals, bach, ute, tramping).
- highlight: true for the few items most likely to draw buyers.
- confidence: how sure you are the item is what you say.
- box: where the item is, as whole numbers from 0 to 1000 relative to the image width (x) and height (y), top-left is 0,0.

privacy_flags: list any visible faces, readable number plates, documents with personal details, screens showing personal content, or medication.
summary: one sentence describing the sale in this photo.`;

export type Raw = { text: string; inputTokens: number; outputTokens: number };
const TIMEOUT = 120_000;

export async function callClaude(model: string, key: string, base64: string, mediaType = "image/jpeg", effort?: "low" | "medium" | "high"): Promise<Raw> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model,
      max_tokens: 16000,
      output_config: { format: { type: "json_schema", schema: SCHEMA }, ...(effort ? { effort } : {}) },
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
        { type: "text", text: PROMPT },
      ] }],
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Claude ${res.status}: ${JSON.stringify(body.error ?? body).slice(0, 300)}`);
  if (body.stop_reason === "refusal") throw new Error("Claude declined this photo");
  const text = (body.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
  return { text, inputTokens: body.usage?.input_tokens ?? 0, outputTokens: body.usage?.output_tokens ?? 0 };
}

async function callGemini(model: string, key: string, base64: string): Promise<Raw> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: "image/jpeg", data: base64 } }, { text: PROMPT }] }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: SCHEMA },
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${JSON.stringify(body.error ?? body).slice(0, 300)}`);
  const parts: Array<{ text?: string; thought?: boolean }> = body.candidates?.[0]?.content?.parts ?? [];
  const usage = body.usageMetadata ?? {};
  return { text: parts.filter(p => !p.thought).map(p => p.text ?? "").join(""), inputTokens: usage.promptTokenCount ?? 0, outputTokens: (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0) };
}

async function callOpenAI(model: string, key: string, base64: string): Promise<Raw> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      input: [{ role: "user", content: [
        { type: "input_image", image_url: `data:image/jpeg;base64,${base64}` },
        { type: "input_text", text: PROMPT },
      ] }],
      text: { format: { type: "json_schema", name: "sale_items", schema: SCHEMA, strict: true } },
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${JSON.stringify(body.error ?? body).slice(0, 300)}`);
  const text = (body.output ?? []).filter((o: { type: string }) => o.type === "message")
    .flatMap((o: { content: Array<{ type: string; text: string }> }) => o.content).filter((c: { type: string }) => c.type === "output_text").map((c: { text: string }) => c.text).join("");
  return { text, inputTokens: body.usage?.input_tokens ?? 0, outputTokens: body.usage?.output_tokens ?? 0 };
}

const CALLERS = { claude: callClaude, gemini: callGemini, openai: callOpenAI };

export function scanSupplierReady(supplier: ScanSupplier): boolean {
  return Boolean(process.env[SUPPLIERS[supplier].key]?.trim());
}

export async function scanPhoto(supplier: ScanSupplier, jpegBase64: string): Promise<ScanResult> {
  const { model, price, key } = SUPPLIERS[supplier];
  const apiKey = process.env[key]?.trim();
  if (!apiKey) throw new Error(`${key} isn’t set on the server`);
  const started = Date.now();
  const raw = await CALLERS[supplier](model, apiKey, jpegBase64);
  let answer: ScanAnswer;
  try { answer = JSON.parse(raw.text); } catch { throw new Error(`${supplier} answer wasn’t valid JSON`); }
  return { supplier, model, ms: Date.now() - started, costUsd: (raw.inputTokens * price[0] + raw.outputTokens * price[1]) / 1e6, answer };
}
