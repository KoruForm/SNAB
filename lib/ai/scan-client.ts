// Browser side of the live photo scan: sends each of the seller's saved photos to /api/scan, a few at a time.
import { getSupabase } from "../supabase/client";
import type { PhotoScan } from "./scan-items";
import type { ScanAnswer } from "./scan-test-types";

export async function scanAvailable(): Promise<boolean> {
  try { const res = await fetch("/api/scan"); return Boolean(res.ok && (await res.json()).ready); } catch { return false; }
}

export async function scanPhotos(photoIds: string[], onDone: (done: number) => void): Promise<{ scans: PhotoScan[]; errors: string[] }> {
  const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
  if (!token) return { scans: [], errors: ["Sign in again to scan your photos."] };
  // Results stay in the photos' order, so suggestions from the cover photo come first when they rank the same.
  const results: Array<PhotoScan | undefined> = []; const errors: string[] = []; let next = 0; let done = 0;
  async function worker() {
    while (next < photoIds.length) {
      const index = next++; const photoId = photoIds[index];
      try {
        const res = await fetch("/api/scan", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ photoId }) });
        const body = await res.json().catch(() => ({})) as { scanId?: string; answer?: ScanAnswer; error?: string };
        if (res.ok && body.scanId && body.answer) results[index] = { scanId: body.scanId, items: body.answer.items ?? [] };
        else errors.push(body.error || "A photo couldn’t be scanned.");
      } catch { errors.push("A photo couldn’t be scanned. Check your connection."); }
      onDone(++done);
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  return { scans: results.filter((r): r is PhotoScan => Boolean(r)), errors };
}
