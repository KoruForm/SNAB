import { getSupabase } from "./supabase/client";

// Partners (real estate agents, movers, local businesses) share a link like /p/acme-realty. The code is kept in
// this browser for 30 days, and a sale started in that time is linked to the partner (migration 013).
export type Partner = { code: string; name: string; kind: "agent" | "mover" | "business" | "community"; blurb: string; website: string };
const KEY = "snab-partner-v1";
const DAYS = 30;
export const PARTNER_CODE = /^[a-z0-9-]{2,30}$/;

export async function fetchPartner(code: string): Promise<Partner | null> {
  const supabase = getSupabase(); const clean = code.toLowerCase();
  if (!supabase || !PARTNER_CODE.test(clean)) return null;
  const { data, error } = await supabase.rpc("partner_info", { partner: clean });
  return error ? null : ((data ?? []) as Partner[])[0] ?? null;
}
export function rememberPartner(code: string): void {
  try { localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() })); } catch { /* the link still works without it */ }
}
export function rememberedPartner(now = Date.now()): string | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "null");
    return value && PARTNER_CODE.test(value.code) && now - value.at < DAYS * 86400000 ? value.code : undefined;
  } catch { return undefined; }
}
