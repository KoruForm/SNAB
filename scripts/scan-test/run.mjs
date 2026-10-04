// Supplier bake-off for sale-photo scanning. Sends every photo in ./photos to each supplier
// with the same instructions, image and answer format, and saves the raw and parsed answers.
// Run by .github/workflows/scan-test.yml; needs ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY.
import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PHOTO_DIR = path.join(here, "photos");
const RUNS = Number(process.env.SCAN_TEST_RUNS || 2);
const MAX_EDGE = 2560; // same as lib/drafts/clean-photo.ts, so every supplier sees what the app uploads

// Prices in US$ per million tokens (input, output), checked 2026-10-04.
export const SUPPLIERS = {
  claude: { model: process.env.CLAUDE_MODEL || "claude-sonnet-5-5", price: [2, 10] },
  gemini: { model: process.env.GEMINI_MODEL || "gemini-3.7-flash", price: [0.75, 3.75] }, // introductory rate, doubles from 2027
  openai: { model: process.env.OPENAI_MODEL || "gpt-6.1-sol", price: [2, 10] },
};

const CATEGORIES = ["Furniture", "Tools", "Books", "Electronics", "Clothing", "Kitchen", "Garden", "Toys", "Free", "Other"];

const SCHEMA = {
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
          category: { type: "string", enum: CATEGORIES },
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
- category: one of ${CATEGORIES.join(", ")}.
- description: one or two plain sentences on what it is and its visible condition. Don't guess prices.
- search_terms: 3 to 8 words or phrases a New Zealand buyer might type, including Kiwi words where they fit (chilly bin, jandals, bach, ute, tramping).
- highlight: true for the few items most likely to draw buyers.
- confidence: how sure you are the item is what you say.
- box: where the item is, as whole numbers from 0 to 1000 relative to the image width (x) and height (y), top-left is 0,0.

privacy_flags: list any visible faces, readable number plates, documents with personal details, screens showing personal content, or medication.
summary: one sentence describing the sale in this photo.`;

async function callClaude(model, jpeg) {
  const client = new Anthropic();
  const res = await client.messages.create({
    model,
    max_tokens: 16000,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpeg.toString("base64") } },
      { type: "text", text: PROMPT },
    ] }],
  });
  if (res.stop_reason === "refusal") throw new Error(`refusal: ${res.stop_details?.category ?? "unknown"}`);
  const text = res.content.filter(b => b.type === "text").map(b => b.text).join("");
  return { text, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens };
}

async function callGemini(model, jpeg) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: "image/jpeg", data: jpeg.toString("base64") } }, { text: PROMPT }] }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: SCHEMA },
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`gemini ${res.status}: ${JSON.stringify(body.error ?? body).slice(0, 500)}`);
  const text = (body.candidates?.[0]?.content?.parts ?? []).filter(p => !p.thought).map(p => p.text ?? "").join("");
  const u = body.usageMetadata ?? {};
  return { text, inputTokens: u.promptTokenCount ?? 0, outputTokens: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0) };
}

async function callOpenAI(model, jpeg) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model,
      input: [{ role: "user", content: [
        { type: "input_image", image_url: `data:image/jpeg;base64,${jpeg.toString("base64")}` },
        { type: "input_text", text: PROMPT },
      ] }],
      text: { format: { type: "json_schema", name: "sale_items", schema: SCHEMA, strict: true } },
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`openai ${res.status}: ${JSON.stringify(body.error ?? body).slice(0, 500)}`);
  const text = (body.output ?? []).filter(o => o.type === "message").flatMap(o => o.content).filter(c => c.type === "output_text").map(c => c.text).join("");
  return { text, inputTokens: body.usage?.input_tokens ?? 0, outputTokens: body.usage?.output_tokens ?? 0 };
}

const CALLERS = { claude: callClaude, gemini: callGemini, openai: callOpenAI };

async function withRetry(fn) {
  try { return await fn(); }
  catch (e) { await new Promise(r => setTimeout(r, 5000)); console.warn(`retrying after: ${e.message}`); return fn(); }
}

async function preparePhoto(file) {
  // Rotates by the camera's orientation, resizes like the app, and drops all metadata (GPS included).
  return sharp(await readFile(path.join(PHOTO_DIR, file))).rotate().resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
}

async function main() {
  const only = (process.env.SCAN_TEST_SUPPLIERS || Object.keys(SUPPLIERS).join(",")).split(",").map(s => s.trim()).filter(Boolean);
  const files = (await readdir(PHOTO_DIR)).filter(f => /\.(jpe?g|png|webp|heic|heif)$/i.test(f)).sort();
  if (!files.length) throw new Error(`No photos in ${PHOTO_DIR}`);
  const outDir = path.join(here, "results", new Date().toISOString().replace(/[:.]/g, "-"));
  await mkdir(outDir, { recursive: true });
  const rows = [];
  for (const file of files) {
    const jpeg = await preparePhoto(file);
    const meta = await sharp(jpeg).metadata();
    for (const supplier of only) {
      const { model, price } = SUPPLIERS[supplier];
      for (let run = 1; run <= RUNS; run++) {
        const started = Date.now();
        const row = { photo: file, width: meta.width, height: meta.height, supplier, model, run };
        try {
          const out = await withRetry(() => CALLERS[supplier](model, jpeg));
          row.ms = Date.now() - started;
          row.inputTokens = out.inputTokens; row.outputTokens = out.outputTokens;
          row.costUsd = (out.inputTokens * price[0] + out.outputTokens * price[1]) / 1e6;
          row.raw = out.text;
          try { row.answer = JSON.parse(out.text); } catch { row.error = "answer was not valid JSON"; }
        } catch (e) {
          row.ms = Date.now() - started; row.error = e.message;
        }
        rows.push(row);
        console.log(`${file} ${supplier} run ${run}: ${row.error ?? `${row.answer.items.length} items, ${(row.ms / 1000).toFixed(1)}s, $${row.costUsd.toFixed(4)}`}`);
      }
    }
  }
  await writeFile(path.join(outDir, "answers.json"), JSON.stringify({ prompt: PROMPT, schema: SCHEMA, suppliers: SUPPLIERS, rows }, null, 2));
  for (const supplier of only) {
    const mine = rows.filter(r => r.supplier === supplier);
    const ok = mine.filter(r => !r.error);
    const sum = k => ok.reduce((t, r) => t + r[k], 0);
    console.log(`${supplier}: ${ok.length}/${mine.length} ok, avg ${(sum("ms") / ok.length / 1000 || 0).toFixed(1)}s, avg $${(sum("costUsd") / ok.length || 0).toFixed(4)} per photo, avg ${(ok.reduce((t, r) => t + r.answer.items.length, 0) / ok.length || 0).toFixed(1)} items`);
  }
  console.log(`Saved ${path.relative(process.cwd(), outDir)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e); process.exit(1); });
