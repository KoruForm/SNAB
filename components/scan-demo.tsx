"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getDraft, updateDraft } from "../lib/drafts/storage";
import { simulateItems } from "../lib/mock/catalogue";
const messages = ["Taking a look around…", "Finding the good stuff…", "Picking out a few highlights…", "Ready for your review."];
export default function ScanDemo() {
  const router = useRouter(); const params = useSearchParams(); const id = params.get("draft"); const [progress, setProgress] = useState(0); const [error, setError] = useState(""); const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!id) return; let cancelled = false; const timers: ReturnType<typeof setTimeout>[] = [];
    getDraft(id).then(found => { if (!found) throw new Error("This draft couldn’t be found."); if (cancelled) return;
      [1, 2, 3].forEach((n, i) => timers.push(setTimeout(() => { if (!cancelled) setProgress(n); }, (i + 1) * 850)));
      timers.push(setTimeout(async () => { try { const items = found.items?.length ? found.items : simulateItems(); await updateDraft(id, { items, highlights: items.map(i => i.label), categories: [...new Set(items.map(i => i.category))], demoScan: true }); if (!cancelled) router.replace(`/sell/review?draft=${id}`); } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Couldn’t save the highlights."); } }, 3000));
    }).catch(e => { if (!cancelled) setError(e.message); }); return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [id, router, retry]);
  if (!id) return <div className="empty-state"><h1>Start a sale first.</h1><Link className="button button-primary" href="/sell">Start a sale</Link></div>;
  return <section className="scan-demo"><p className="eyebrow">A little help with the highlights</p><h1>Finding the<br /><span className="highlight">good stuff.</span></h1><div className="scan-illustration"><Image src="/brand/categories/tools.svg" alt="" width={110} height={110} /><Image src="/brand/categories/electronics.svg" alt="" width={110} height={110} /><Image src="/brand/categories/books.svg" alt="" width={90} height={90} /></div><p role="status">{messages[progress]}</p><progress max={3} value={progress} aria-label="Demo scan progress" /><p className="field-help">Demo scan · these sample highlights show how the review works. Your photos aren’t being analysed.</p>{error && <div className="form-message error-message" role="alert"><p>{error}</p><button className="button button-primary" onClick={() => { setError(""); setProgress(0); setRetry(retry + 1); }}>Try again</button></div>}<Link href={`/sell/review?draft=${id}`} className="text-link">Skip to review</Link></section>;
}
