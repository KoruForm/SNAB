import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanPhoto } from "./clean-photo";
import { MAX_PHOTOS, tooManyPhotos, validatePhotoBatch } from "./limits";
import { cleanDetails } from "../sale-details";
import { blankDraft, type Category, type Draft, type DraftPatch, type DraftPhoto, type MockItem, type SaleDay } from "./types";

// Supabase-backed drafts for signed-in sellers. Tables and policies: supabase/migrations/001 and 003.
export const PHOTO_BUCKET = "sale-photos";
const SIGNED_URL_SECONDS = 60 * 60;
const SALE_SELECT = "id, title, description, status, categories, highlights, items, demo_scan, event_code, day_mode, abundance, hidden, details, partner_code, created_at, updated_at, sale_days(sale_date, starts, finishes), sale_private_locations(address, town, reveal, exact_latitude, exact_longitude)";

export type SaleRow = {
  id: string; title: string; description: string; status: Draft["status"]; categories: string[]; highlights: string[]; items: MockItem[] | null;
  demo_scan: boolean; event_code: string | null; day_mode: Draft["dayMode"] | null; abundance: Draft["abundance"] | null; hidden?: boolean; details?: unknown; partner_code?: string | null; created_at: string; updated_at: string;
  sale_days: { sale_date: string; starts: string; finishes: string }[] | null;
  sale_private_locations: { address: string; town: string; reveal: Draft["location"]["reveal"]; exact_latitude?: number | null; exact_longitude?: number | null } | null;
};
export type PhotoRow = { id: string; sale_id: string; storage_path: string; sort_order: number; file_name: string; content_type: string; created_at: string };

const hhmm = (time: string) => time.slice(0, 5);
export function rowToDraft(row: SaleRow): Draft {
  const days: SaleDay[] = (row.sale_days || []).map(d => ({ date: d.sale_date, starts: hhmm(d.starts), finishes: hhmm(d.finishes) })).sort((a, b) => a.date.localeCompare(b.date));
  const draft: Draft = { ...blankDraft(row.id, row.created_at), title: row.title, description: row.description, status: row.status, categories: row.categories as Category[], highlights: row.highlights, updatedAt: row.updated_at };
  // A new draft has no dated days yet; keep the wizard's blank starter day.
  if (days.length) draft.days = days;
  if (row.sale_private_locations) {
    const { address, town, reveal, exact_latitude, exact_longitude } = row.sale_private_locations;
    draft.location = { address, town, reveal };
    if (typeof exact_latitude === "number" && typeof exact_longitude === "number") Object.assign(draft.location, { latitude: exact_latitude, longitude: exact_longitude });
  }
  if (row.items?.length) draft.items = row.items;
  if (row.demo_scan) draft.demoScan = true;
  if (row.event_code) draft.eventCode = row.event_code;
  if (row.day_mode) draft.dayMode = row.day_mode;
  if (row.abundance) draft.abundance = row.abundance;
  if (row.hidden) draft.hidden = true;
  const details = cleanDetails(row.details);
  if (Object.keys(details).length) draft.details = details;
  if (row.partner_code) draft.partner = row.partner_code;
  return draft;
}
// Only the sale-record columns present in the patch; days and location live in their own tables.
export function patchToSaleRow(patch: DraftPatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ("title" in patch) row.title = patch.title;
  if ("description" in patch) row.description = patch.description;
  if ("status" in patch) row.status = patch.status;
  if ("categories" in patch) row.categories = patch.categories;
  if ("highlights" in patch) row.highlights = patch.highlights;
  if ("items" in patch) row.items = patch.items ?? [];
  if ("demoScan" in patch) row.demo_scan = Boolean(patch.demoScan);
  if ("eventCode" in patch) row.event_code = patch.eventCode ?? null;
  if ("dayMode" in patch) row.day_mode = patch.dayMode ?? null;
  if ("abundance" in patch) row.abundance = patch.abundance ?? null;
  if ("details" in patch) row.details = cleanDetails(patch.details);
  if ("partner" in patch) row.partner_code = patch.partner ?? null;
  return row;
}
export function locationToRow(saleId: string, location: Draft["location"]) {
  return { sale_id: saleId, address: location.address, town: location.town, reveal: location.reveal, exact_latitude: location.latitude ?? null, exact_longitude: location.longitude ?? null };
}
// Days without a date are still being filled in by the wizard and are not stored.
export function daysToRows(days: SaleDay[]): { sale_date: string; starts: string; finishes: string }[] {
  return days.filter(d => d.date).map(d => ({ sale_date: d.date, starts: d.starts, finishes: d.finishes }));
}
export function photoPath(userId: string, saleId: string, photoId: string, file: { name: string; type: string }): string {
  const fromName = /\.([a-z0-9]{1,5})$/i.exec(file.name)?.[1];
  const ext = (fromName || file.type.split("/")[1] || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${userId}/${saleId}/${photoId}.${ext}`;
}

function check<T>(result: { data: T; error: { message: string } | null }, fallback: string): T {
  if (result.error) throw new Error(result.error.message || fallback);
  return result.data;
}
const SAVE_FAILED = "Couldn’t save to your account. Check your connection and try again.";

export async function createRemoteDraft(supabase: SupabaseClient, userId: string): Promise<Draft> {
  const draft = blankDraft(crypto.randomUUID());
  check(await supabase.from("sales").insert({ id: draft.id, owner_id: userId }), SAVE_FAILED);
  check(await supabase.from("sale_private_locations").insert({ sale_id: draft.id, address: "", town: "", reveal: draft.location.reveal }), SAVE_FAILED);
  return (await getRemoteDraft(supabase, draft.id)) ?? draft;
}
export async function getRemoteDraft(supabase: SupabaseClient, id: string): Promise<Draft | undefined> {
  const row = check(await supabase.from("sales").select(SALE_SELECT).eq("id", id).maybeSingle(), "Couldn’t open this sale.");
  return row ? rowToDraft(row as unknown as SaleRow) : undefined;
}
export async function listRemoteDrafts(supabase: SupabaseClient): Promise<Draft[]> {
  const rows = check(await supabase.from("sales").select(SALE_SELECT).order("updated_at", { ascending: false }), "Couldn’t open your sales.");
  return (rows as unknown as SaleRow[]).map(rowToDraft);
}
export async function updateRemoteDraft(supabase: SupabaseClient, id: string, patch: DraftPatch): Promise<Draft> {
  if (patch.days) check(await supabase.rpc("replace_sale_days", { p_sale_id: id, p_days: daysToRows(patch.days) }), SAVE_FAILED);
  if (patch.location) check(await supabase.from("sale_private_locations").upsert(locationToRow(id, patch.location)), SAVE_FAILED);
  // Always touch the sale row so updated_at moves (trigger) and a missing sale is reported.
  const updated = check(await supabase.from("sales").update({ ...patchToSaleRow(patch), updated_at: new Date().toISOString() }).eq("id", id).select("id"), SAVE_FAILED);
  if (!updated?.length) throw new Error("This draft no longer exists.");
  const draft = await getRemoteDraft(supabase, id);
  if (!draft) throw new Error("This draft no longer exists.");
  return draft;
}
export async function getRemotePhotos(supabase: SupabaseClient, saleId: string): Promise<DraftPhoto[]> {
  const rows = check(await supabase.from("sale_photos").select("id, sale_id, storage_path, sort_order, file_name, content_type, created_at").eq("sale_id", saleId).order("sort_order").order("created_at"), "Couldn’t open your photos.") as PhotoRow[];
  if (!rows.length) return [];
  const signed = check(await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(rows.map(r => r.storage_path), SIGNED_URL_SECONDS), "Couldn’t open your photos.");
  const urls = new Map((signed ?? []).map(s => [s.path, s.signedUrl]));
  return rows.map(r => ({ id: r.id, draftId: r.sale_id, name: r.file_name, type: r.content_type, url: urls.get(r.storage_path) || undefined, createdAt: r.created_at }));
}
export async function addRemotePhotos(supabase: SupabaseClient, userId: string, saleId: string, files: File[]): Promise<void> {
  const valid = validatePhotoBatch(files);
  const existing = await supabase.from("sale_photos").select("id", { count: "exact", head: true }).eq("sale_id", saleId);
  check(existing, "Couldn’t check your photos.");
  if (!(await getRemoteDraft(supabase, saleId))) throw new Error("This draft no longer exists.");
  const count = existing.count ?? 0;
  if (count + valid.length > MAX_PHOTOS) throw tooManyPhotos();
  const bucket = supabase.storage.from(PHOTO_BUCKET);
  const uploaded: string[] = [];
  try {
    const rows = [];
    for (const [index, original] of valid.entries()) {
      const file = await cleanPhoto(original);
      const id = crypto.randomUUID();
      const path = photoPath(userId, saleId, id, file);
      check(await bucket.upload(path, file, { contentType: file.type, upsert: false }), "Couldn’t upload a photo. Check your connection and try again.");
      uploaded.push(path);
      rows.push({ id, sale_id: saleId, storage_path: path, sort_order: count + index, file_name: file.name.slice(0, 255), content_type: file.type });
    }
    check(await supabase.from("sale_photos").insert(rows), SAVE_FAILED);
  } catch (error) {
    // Keep a batch all-or-nothing, as the local store does.
    if (uploaded.length) await bucket.remove(uploaded);
    throw error;
  }
  await supabase.from("sales").update({ updated_at: new Date().toISOString() }).eq("id", saleId);
}
export async function removeRemotePhoto(supabase: SupabaseClient, id: string): Promise<void> {
  const row = check(await supabase.from("sale_photos").select("storage_path").eq("id", id).maybeSingle(), SAVE_FAILED);
  if (!row) return;
  check(await supabase.from("sale_photos").delete().eq("id", id), SAVE_FAILED);
  await supabase.storage.from(PHOTO_BUCKET).remove([row.storage_path]);
}
export async function deleteRemoteDraft(supabase: SupabaseClient, id: string): Promise<void> {
  // Database rows cascade from the sale; stored files do not, so remove them first.
  const rows = check(await supabase.from("sale_photos").select("storage_path").eq("sale_id", id), SAVE_FAILED) as { storage_path: string }[];
  if (rows.length) check(await supabase.storage.from(PHOTO_BUCKET).remove(rows.map(r => r.storage_path)), "Couldn’t remove this sale’s photos. Try again.");
  check(await supabase.from("sales").delete().eq("id", id), SAVE_FAILED);
}
