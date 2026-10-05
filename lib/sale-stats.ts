import { getSupabase } from "./supabase/client";

// Seller stats (supabase/migrations/006). The browser keeps a random device code that isn't tied to
// anyone; the server stores only a hash of it per sale, so a view or save can't be traced back.
const DEVICE_KEY = "snab-device-v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type SaleStats = { views: number; saves: number };

function deviceCode(): string | null {
  try {
    let code = localStorage.getItem(DEVICE_KEY);
    if (!code) { code = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, code); }
    return code;
  } catch { return null; }
}
// Only real listed sales have ids the server knows; samples and device-only drafts are skipped.
function target(saleId: string) { const supabase = getSupabase(); const device = UUID.test(saleId) ? deviceCode() : null; return supabase && device ? { supabase, device } : null; }

// Counting is best effort: a failed call never gets in the buyer's way.
export function recordSaleView(saleId: string): void {
  const t = target(saleId); if (!t) return;
  void t.supabase.rpc("record_sale_view", { target_sale: saleId, device: t.device }).then(() => undefined, () => undefined);
}
export function recordSaleSave(saleId: string, saved: boolean): void {
  const t = target(saleId); if (!t) return;
  void t.supabase.rpc("set_sale_saved", { target_sale: saleId, device: t.device, is_saved: saved }).then(() => undefined, () => undefined);
}

// The seller's own numbers, or null when signed out, offline or not their sale.
export async function fetchSaleStats(saleId: string): Promise<SaleStats | null> {
  const supabase = getSupabase(); if (!supabase || !UUID.test(saleId)) return null;
  const { data, error } = await supabase.rpc("my_sale_stats", { target_sale: saleId });
  const row = (data as { views: number | string; saves: number | string }[] | null)?.[0];
  return error || !row ? null : { views: Number(row.views), saves: Number(row.saves) };
}
