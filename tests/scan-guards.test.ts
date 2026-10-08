import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resetScanGuards, scanSalePhoto, ScanError } from "../lib/ai/scan";

// A stand-in for the seller's Supabase client: one photo, no earlier scans, `todays` scans counted today,
// and a photo download that waits until `release` is called.
function fakeSupabase(todays: number) {
  let release!: () => void; const gate = new Promise<void>(r => { release = r; });
  const chain = (result: unknown) => { const q: Record<string, unknown> = {}; for (const k of ["select", "eq", "gte", "order", "limit"]) q[k] = () => q; q.maybeSingle = async () => result; q.then = (ok: (v: unknown) => void) => ok(result); return q; };
  const supabase = {
    from: (table: string) => table === "sale_photos" ? chain({ data: { id: "p", sale_id: "s", storage_path: "u/s/p.jpg", content_type: "image/jpeg" } })
      : { select: (_c: string, opts?: { head?: boolean }) => opts?.head ? chain({ count: todays }) : chain({ data: null }) },
    storage: { from: () => ({ download: async () => { await gate; return { data: null }; } }) },
  } as unknown as SupabaseClient;
  return { supabase, release };
}
const photo = "00000000-0000-0000-0000-000000000001";

test("a seller can't run more than three scans at once, so a burst can't slip past the daily limit", async () => {
  resetScanGuards();
  const { supabase, release } = fakeSupabase(0);
  const running = [1, 2, 3].map(() => scanSalePhoto(supabase, "seller", photo).catch(e => e));
  await new Promise(r => setTimeout(r, 10));
  await assert.rejects(scanSalePhoto(supabase, "seller", photo), (e: ScanError) => e.status === 429 && /other photos/.test(e.message));
  release(); await Promise.all(running);
  await assert.rejects(scanSalePhoto(supabase, "seller", photo), (e: ScanError) => e.status === 404, "the slots free up once scans finish");
});

test("scans still running count toward the daily limit", async () => {
  resetScanGuards();
  const { supabase, release } = fakeSupabase(59);
  const first = scanSalePhoto(supabase, "seller", photo).catch(e => e);
  await new Promise(r => setTimeout(r, 10));
  await assert.rejects(scanSalePhoto(supabase, "seller", photo), (e: ScanError) => e.status === 429 && /a lot of photos/.test(e.message));
  release(); await first;
});
