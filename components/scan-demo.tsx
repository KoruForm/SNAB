"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { mergeScanItems } from "../lib/ai/scan-items";
import { scanAvailable, scanPhotos } from "../lib/ai/scan-client";
import { trackEvent } from "../lib/analytics";
import { getDraft, getPhotos, signedIn, updateDraft } from "../lib/drafts/storage";
import { simulateItems } from "../lib/mock/catalogue";
const messages = ["Taking a look around…", "Finding the good stuff…", "Picking out a few highlights…", "Ready for your review."];
// Signed-in sellers get a real scan of their saved photos (lib/ai/scan.ts). Everyone else, and the ready-made
// demo sale, gets the demo: sample highlights that show how the review works.
export default function ScanDemo() {
  const router = useRouter(); const params = useSearchParams(); const id = params.get("draft"); const [progress, setProgress] = useState(0); const [error, setError] = useState(""); const [retry, setRetry] = useState(0);
  const [real, setReal] = useState(false); const [total, setTotal] = useState(0); const [done, setDone] = useState(0);
  useEffect(() => {
    if (!id) return; let cancelled = false; const timers: ReturnType<typeof setTimeout>[] = []; const review = `/sell/review?draft=${id}`;
    async function scan() {
      const found = await getDraft(id!); if (!found) throw new Error("This draft couldn’t be found."); if (cancelled) return;
      if (await signedIn() && !found.readyMade) {
        setReal(true);
        const photos = await getPhotos(id!);
        if (!photos.length || !(await scanAvailable())) { if (!cancelled) router.replace(review); return; }
        setTotal(photos.length); setDone(0);
        const { scans, errors } = await scanPhotos(photos.map(p => p.id), n => { if (!cancelled) setDone(n); });
        if (cancelled) return;
        if (!scans.length) throw new Error(errors[0] ?? "The scan didn’t work this time.");
        const items = mergeScanItems(found.items ?? [], scans);
        await updateDraft(id!, { items, highlights: items.map(i => i.label), categories: [...new Set([...found.categories, ...items.map(i => i.category)])], demoScan: false });
        trackEvent("Photos scanned", { photos: photos.length, failed: errors.length, suggested: items.length - (found.items?.length ?? 0) });
        if (!cancelled) router.replace(review);
        return;
      }
      [1, 2, 3].forEach((n, i) => timers.push(setTimeout(() => { if (!cancelled) setProgress(n); }, (i + 1) * 850)));
      timers.push(setTimeout(async () => { try { const items = found.items?.length ? found.items : simulateItems(); await updateDraft(id!, { items, highlights: items.map(i => i.label), categories: [...new Set(items.map(i => i.category))], demoScan: true }); if (!cancelled) router.replace(review); } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Couldn’t save the highlights."); } }, 3000));
    }
    scan().catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Couldn’t scan your photos."); }); return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [id, router, retry]);
  if (!id) return <div className="empty-state"><h1>Start a sale first.</h1><Link className="button button-primary" href="/sell">Start a sale</Link></div>;
  const status = real ? (total ? (done < total ? `Looking through your photos… ${done} of ${total} done` : messages[3]) : messages[0]) : messages[progress];
  return <section className="scan-demo"><p className="eyebrow">A little help with the highlights</p><h1>Finding the<br /><span className="highlight">good stuff.</span></h1><div className="scan-illustration"><Image src="/brand/categories/tools.svg" alt="" width={110} height={110} /><Image src="/brand/categories/electronics.svg" alt="" width={110} height={110} /><Image src="/brand/categories/books.svg" alt="" width={90} height={90} /></div><p role="status">{status}</p><progress max={real ? Math.max(total, 1) : 3} value={real ? done : progress} aria-label={real ? "Photo scan progress" : "Demo scan progress"} /><p className="field-help">{real ? "SNAB’s AI suggests highlights from your photos. You’ll check each one before buyers see anything." : "Demo scan · these sample highlights show how the review works. Your photos aren’t being analysed."}</p>{error && <div className="form-message error-message" role="alert"><p>{error}</p><button className="button button-primary" onClick={() => { setError(""); setProgress(0); setRetry(retry + 1); }}>Try again</button></div>}<Link href={`/sell/review?draft=${id}`} className="text-link">{real ? "Add highlights myself" : "Skip to review"}</Link></section>;
}
