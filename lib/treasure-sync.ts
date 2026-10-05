"use client";
import { useEffect } from "react";
import { readPreferences, savePreferences } from "./mock/preferences";
import { getSupabase } from "./supabase/client";
import { useAccount } from "./supabase/use-account";
import { mergeTreasures } from "./watchlist";

// The treasure list stays in the browser, and a signed-in buyer's copy is kept on their account
// (treasure_lists, supabase/migrations/006) so it follows them to any device and can trigger email alerts.
type Remote = { treasures: string[]; alerts: boolean };

async function push(userId: string, row: Partial<Remote>): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from("treasure_lists").upsert({ user_id: userId, ...row });
  if (error) throw new Error("Couldn’t save your treasure list to your account. Try again.");
}

// Turns email alerts on or off for the signed-in buyer, saving the list alongside.
export async function setTreasureAlerts(userId: string, alerts: boolean): Promise<void> {
  const { treasures } = readPreferences();
  await push(userId, { treasures, alerts });
  savePreferences({ treasureAlerts: alerts, treasuresSyncedFor: userId });
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((t, n) => t === b[n]);

// Mounted once in the app shell.
export function useTreasureSync(): void {
  const { userId } = useAccount();
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !userId) return;
    let live = true; let pushed: string[] | null = null;
    async function pull() {
      const { data, error } = await supabase!.from("treasure_lists").select("treasures, alerts").eq("user_id", userId).maybeSingle<Remote>();
      if (!live || error) return;
      const local = readPreferences();
      const treasures = data ? mergeTreasures(local.treasures, data.treasures, local.treasuresSyncedFor === userId) : local.treasures;
      savePreferences({ treasures, treasureAlerts: Boolean(data?.alerts), treasuresSyncedFor: userId! });
      pushed = data?.treasures ?? [];
      await sendChanges();
    }
    async function sendChanges() {
      const { treasures, treasuresSyncedFor } = readPreferences();
      if (!live || pushed === null || treasuresSyncedFor !== userId || sameList(treasures, pushed)) return;
      const before = pushed; pushed = treasures;
      // A failed save is tried again with the next change.
      try { await push(userId!, { treasures }); } catch { pushed = before; }
    }
    const onChange = () => void sendChanges();
    void pull();
    window.addEventListener("snab-preferences", onChange);
    return () => { live = false; window.removeEventListener("snab-preferences", onChange); };
  }, [userId]);
}

export function TreasureSync() { useTreasureSync(); return null; }
