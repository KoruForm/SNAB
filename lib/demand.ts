import { getSupabase } from "./supabase/client";
import { treasureItems, type MatchItem } from "./treasure-match";

// What buyers are hunting for (public.treasure_demand(), migration 013): treasures on two or more buyers'
// lists, so no single person's list shows. Used to show sellers there are people looking before they list.
export type Demand = { treasure: string; lists: number };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchDemand(): Promise<Demand[]> {
  const supabase = getSupabase(); if (!supabase) return [];
  const { data, error } = await supabase.rpc("treasure_demand");
  if (error) return [];
  return ((data ?? []) as { treasure: string; lists: number | string }[]).map(d => ({ treasure: d.treasure, lists: Number(d.lists) }));
}

// The demand a seller's highlights answer, biggest first.
export function demandMet(items: MatchItem[], demand: Demand[]): Demand[] {
  return demand.filter(d => treasureItems(items.map(i => ({ ...i, available: true })), d.treasure).length).sort((a, b) => b.lists - a.lists);
}

// How many buyers' treasure lists the seller's sale is on, or null when it can't be counted.
export async function fetchSaleTreasureLists(saleId: string): Promise<number | null> {
  const supabase = getSupabase(); if (!supabase || !UUID.test(saleId)) return null;
  const { data, error } = await supabase.rpc("my_sale_treasure_lists", { target_sale: saleId });
  return error || data === null ? null : Number(data);
}
