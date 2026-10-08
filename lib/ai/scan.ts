// Server side of the live photo scan in the Sell flow (app/api/scan). One photo at a time, with the seller's own
// sign-in: row-level security means a seller can only scan photos on their own sales, and every answer is saved
// to photo_scans (migration 015) so wrong suggestions can be found and the instructions improved.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PHOTO_BUCKET } from "../drafts/remote";
import { callClaude } from "./scan-test";
import type { ScanAnswer } from "./scan-test-types";

// Bump when PROMPT or SCHEMA in scan-test.ts changes, so results from each version can be compared.
export const PROMPT_VERSION = "2026-10-08";
// Haiku 5.5 scored close to Sonnet in the 2026-10-08 test at a fifteenth of the cost. SCAN_MODEL switches it.
const DEFAULT_MODEL = "claude-haiku-5-5";
// US$ per million tokens (input, output), checked 2026-10-08.
const PRICES: Record<string, [number, number]> = { "claude-haiku-5-5": [0.1, 0.5], "claude-sonnet-5-5": [2, 10], "claude-opus-5-5": [4, 20] };
// The Claude API takes images up to 5 MB; SNAB photos are resized to 2560px JPEGs, usually around 1 MB.
const MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export class ScanError extends Error { constructor(message: string, readonly status: number) { super(message); } }
export type LiveScan = { scanId: string; answer: ScanAnswer };

export function scanModel(): string { return process.env.SCAN_MODEL?.trim() || DEFAULT_MODEL; }
export function scanDailyLimit(): number { return Number(process.env.SCAN_DAILY_LIMIT) || 60; }
export function scanReady(): boolean { return Boolean(process.env.ANTHROPIC_API_KEY?.trim() && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); }

// A Supabase client acting as the signed-in seller, so their row-level security applies to every read and write.
export async function sellerClient(token: string): Promise<{ supabase: SupabaseClient; userId: string }> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await supabase.auth.getUser(token);
  if (!data.user) throw new ScanError("Sign in again to scan photos.", 401);
  return { supabase, userId: data.user.id };
}

export async function scanSalePhoto(supabase: SupabaseClient, userId: string, photoId: string): Promise<LiveScan> {
  const photo = (await supabase.from("sale_photos").select("id, sale_id, storage_path, content_type").eq("id", photoId).maybeSingle()).data;
  if (!photo) throw new ScanError("That photo couldn’t be found.", 404);
  const model = scanModel();

  // A photo already scanned with the same model and instructions isn't paid for twice.
  const earlier = (await supabase.from("photo_scans").select("id, result").eq("photo_id", photoId).eq("model", model).eq("prompt_version", PROMPT_VERSION)
    .order("created_at", { ascending: false }).limit(1).maybeSingle()).data;
  if (earlier) return { scanId: earlier.id, answer: earlier.result as ScanAnswer };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase.from("photo_scans").select("id", { count: "exact", head: true }).eq("owner_id", userId).gte("created_at", since);
  if ((count ?? 0) >= scanDailyLimit()) throw new ScanError("You’ve scanned a lot of photos today. Add the rest of your highlights yourself, or try again tomorrow.", 429);

  const file = (await supabase.storage.from(PHOTO_BUCKET).download(photo.storage_path)).data;
  if (!file) throw new ScanError("Couldn’t open that photo.", 404);
  const mediaType = IMAGE_TYPES.includes(file.type) ? file.type : IMAGE_TYPES.includes(photo.content_type) ? photo.content_type : "";
  if (!mediaType || file.size > MAX_BYTES) throw new ScanError("That photo can’t be scanned. Add its highlights yourself.", 422);

  const started = Date.now();
  const raw = await callClaude(model, process.env.ANTHROPIC_API_KEY!.trim(), Buffer.from(await file.arrayBuffer()).toString("base64"), mediaType, "medium");
  let answer: ScanAnswer;
  try { answer = JSON.parse(raw.text); } catch { throw new ScanError("The scan’s answer couldn’t be read. Try again.", 502); }
  const [inPrice, outPrice] = PRICES[model] ?? [0, 0];
  const saved = await supabase.from("photo_scans").insert({
    sale_id: photo.sale_id, photo_id: photo.id, owner_id: userId, model, prompt_version: PROMPT_VERSION, result: answer,
    item_count: answer.items?.length ?? 0, ms: Date.now() - started, cost_usd: (raw.inputTokens * inPrice + raw.outputTokens * outPrice) / 1e6,
  }).select("id").single();
  if (saved.error || !saved.data) throw new ScanError("Couldn’t save the scan. Try again.", 500);
  return { scanId: saved.data.id, answer };
}
