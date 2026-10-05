import { getSupabase } from "./supabase/client";

// Listing reports (supabase/migrations/006). Reports go to Josh's review list; three from different
// signed-in people hide the sale until it's checked.
export type ReportReason = "wrong-details" | "not-running" | "unsafe" | "offensive" | "other";
export const reportReasons: { value: ReportReason; label: string }[] = [
  { value: "wrong-details", label: "Wrong details" },
  { value: "not-running", label: "Sale isn’t running" },
  { value: "unsafe", label: "Unsafe or scam" },
  { value: "offensive", label: "Offensive photos or text" },
  { value: "other", label: "Something else" },
];
export const REPORT_NOTE_MAX = 500;
const DEVICE_KEY = "snab-report-device";

// Tells apart reports from people who aren't signed in, so one browser counts once per sale.
function deviceKey(): string | null {
  try {
    let key = localStorage.getItem(DEVICE_KEY);
    if (!key) { key = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, key); }
    return key;
  } catch { return null; }
}

export async function reportSale(saleId: string, reason: ReportReason, note: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Reports aren’t switched on for this site yet. Please try again soon.");
  const { error } = await supabase.rpc("report_sale", { report_sale_id: saleId, report_reason: reason, report_note: note.trim().slice(0, REPORT_NOTE_MAX), report_device_key: deviceKey() });
  if (error) throw new Error("Couldn’t send your report just now. Please try again.");
}
