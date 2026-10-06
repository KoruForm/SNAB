"use client";
/* eslint-disable @next/next/no-img-element -- photos are local blob URLs, which next/image can't optimise */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cleanPhoto } from "../lib/drafts/clean-photo";
import { deleteShot, listShots, saveShot, type ScanShot, type ScanVerdict } from "../lib/ai/scan-test-store";
import { SCAN_SUPPLIERS, type ScanResult, type ScanSupplier } from "../lib/ai/scan-test-types";

// Field test of AI photo scanning: snap sale tables quickly, let each AI answer in the background,
// then mark every item right or wrong later. The AIs show as A, B and C so marking stays blind until the reveal.
const NAMES: Record<ScanSupplier, string> = { claude: "Claude", gemini: "Gemini", openai: "OpenAI" };
const ORDER_KEY = "snab-scan-order";

function blindOrder(): ScanSupplier[] {
  try {
    const saved = JSON.parse(localStorage.getItem(ORDER_KEY) || "null");
    if (Array.isArray(saved) && saved.length === SCAN_SUPPLIERS.length && SCAN_SUPPLIERS.every(s => saved.includes(s))) return saved;
  } catch { /* fall through to a new order */ }
  const order = [...SCAN_SUPPLIERS].sort(() => Math.random() - 0.5);
  try { localStorage.setItem(ORDER_KEY, JSON.stringify(order)); } catch { /* order just won't persist */ }
  return order;
}

type Change = Pick<ScanShot, "results" | "errors">;
const pending = (shot: ScanShot) => SCAN_SUPPLIERS.filter(s => !shot.results[s] && !shot.errors[s]);
const unmarked = (shot: ScanShot) => SCAN_SUPPLIERS.reduce((n, s) => n + (shot.results[s]?.answer.items.filter((_, i) => !shot.verdicts[`${s}:${i}`]).length ?? 0), 0);

export function ScanTest() {
  const [shots, setShots] = useState<ScanShot[]>([]);
  const [order, setOrder] = useState<ScanSupplier[]>([...SCAN_SUPPLIERS]);
  const [ready, setReady] = useState<Record<string, boolean> | null>(null);
  const [online, setOnline] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [message, setMessage] = useState("");
  const busy = useRef(new Set<string>());
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listShots().then(saved => { setOrder(blindOrder()); setShots(saved); }).catch(e => setMessage(e.message));
    fetch("/api/scan-test").then(r => (r.ok ? r.json() : null)).then(d => setReady(d?.ready ?? {})).catch(() => setReady({}));
    const update = () => setOnline(navigator.onLine);
    update();
    addEventListener("online", update); addEventListener("offline", update);
    return () => { removeEventListener("online", update); removeEventListener("offline", update); };
  }, []);

  const update = useCallback(async (shot: ScanShot) => {
    await saveShot(shot);
    setShots(all => all.map(s => (s.id === shot.id ? shot : s)));
  }, []);

  // Background queue: send each waiting photo to each AI, a few at a time, whenever there's signal.
  useEffect(() => {
    if (!online || !ready) return;
    const jobs = shots.flatMap(shot => pending(shot).filter(s => ready[s]).map(s => ({ shot, supplier: s }))).filter(j => !busy.current.has(`${j.shot.id}:${j.supplier}`));
    for (const { shot, supplier } of jobs.slice(0, Math.max(0, 3 - busy.current.size))) {
      const job = `${shot.id}:${supplier}`;
      busy.current.add(job);
      const form = new FormData();
      form.set("supplier", supplier); form.set("photo", shot.photo, "photo.jpg");
      fetch("/api/scan-test", { method: "POST", body: form })
        .then(async r => {
          const body = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(body.error || `Server said ${r.status}`);
          return body as ScanResult;
        })
        .then((result): Change => ({ results: { [supplier]: result }, errors: {} }), (e: Error): Change | null => (navigator.onLine ? { results: {}, errors: { [supplier]: e.message } } : null))
        .then(async change => {
          busy.current.delete(job);
          const latest = (await listShots()).find(s => s.id === shot.id);
          if (!latest) return setShots(s => [...s]);
          if (!change) return setShots(s => [...s]);
          await update({ ...latest, results: { ...latest.results, ...change.results }, errors: { ...latest.errors, ...change.errors } });
        });
    }
  }, [shots, online, ready, update]);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setMessage("");
    for (const file of Array.from(files)) {
      try {
        const shot: ScanShot = { id: crypto.randomUUID(), takenAt: new Date().toISOString(), photo: await cleanPhoto(file), results: {}, errors: {}, verdicts: {}, missed: "" };
        await saveShot(shot);
        setShots(s => [...s, shot]);
      } catch (e) { setMessage(e instanceof Error ? e.message : "Couldn’t add that photo"); }
    }
  }

  async function retry(shot: ScanShot) { await update({ ...shot, errors: {} }); }

  async function exportResults() {
    const toBase64 = (blob: Blob) => new Promise<string>(resolve => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.readAsDataURL(blob); });
    const data = { exportedAt: new Date().toISOString(), blindOrder: order, shots: await Promise.all(shots.map(async s => ({ ...s, photo: await toBase64(s.photo) }))) };
    const file = new File([JSON.stringify(data)], `snab-scan-test-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`, { type: "application/json" });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "SNAB scan test results" }).catch(() => {}); return; }
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file); link.download = file.name; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  }

  async function clearAll() {
    if (!confirm("Delete every photo and mark from this phone? Save your results first.")) return;
    for (const s of shots) await deleteShot(s.id);
    setShots([]); setOpenId(null);
  }

  const urls = useMemo(() => new Map(shots.map(s => [s.id, URL.createObjectURL(s.photo)])), [shots]);
  useEffect(() => () => urls.forEach(u => URL.revokeObjectURL(u)), [urls]);

  const label = (s: ScanSupplier) => (reveal ? NAMES[s] : `AI ${"ABC"[order.indexOf(s)]}`);
  const waiting = shots.reduce((n, s) => n + pending(s).length, 0);
  const open = shots.find(s => s.id === openId);
  const missingKeys = ready ? SCAN_SUPPLIERS.filter(s => !ready[s]) : [];

  if (open) return <Review key={open.id} shot={open} url={urls.get(open.id)!} order={order} label={label} onChange={update} onRetry={retry}
    onClose={() => setOpenId(null)} onNext={() => { const next = shots.find(s => s.id !== open.id && unmarked(s) > 0); setOpenId(next?.id ?? null); }} />;

  return (
    <main className="scan-test">
      <h1>Scan test</h1>
      <p className="scan-muted">Snap tables and boxes now. Mark what each AI got right later.</p>
      {ready === null ? null : Object.keys(ready).length === 0 ? <p className="scan-alert">Open your preview link first, then come back here.</p>
        : missingKeys.length > 0 && <p className="scan-alert">Waiting on {missingKeys.map(s => NAMES[s]).join(", ")} key in Hostinger.</p>}
      {!online && <p className="scan-alert">No signal. Keep snapping; photos send when you’re back online.</p>}
      {message && <p className="scan-alert">{message}</p>}

      <div className="scan-actions">
        <button className="scan-primary" onClick={() => camera.current?.click()}>Take photo</button>
        <button onClick={() => gallery.current?.click()}>Add from gallery</button>
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={e => { add(e.target.files); e.target.value = ""; }} />
        <input ref={gallery} type="file" accept="image/*" multiple hidden onChange={e => { add(e.target.files); e.target.value = ""; }} />
      </div>

      <p className="scan-muted">{shots.length} photos · {waiting ? `${waiting} AI answers on the way` : "all answered"} · {shots.reduce((n, s) => n + unmarked(s), 0)} items to mark</p>

      <div className="scan-grid">
        {shots.map(s => (
          <button key={s.id} className="scan-thumb" onClick={() => setOpenId(s.id)}>
            <img src={urls.get(s.id)} alt="" />
            <span>{pending(s).length ? "Scanning…" : Object.keys(s.errors).length ? "Error" : unmarked(s) ? `${unmarked(s)} to mark` : "Done ✓"}</span>
          </button>
        ))}
      </div>

      {shots.length > 0 && <Scores shots={shots} order={order} label={label} reveal={reveal} onReveal={() => setReveal(r => !r)} />}

      {shots.length > 0 && (
        <div className="scan-actions">
          <button className="scan-primary" onClick={exportResults}>Save results file</button>
          <button className="scan-danger" onClick={clearAll}>Clear phone</button>
        </div>
      )}
    </main>
  );
}

function Scores({ shots, order, label, reveal, onReveal }: { shots: ScanShot[]; order: ScanSupplier[]; label: (s: ScanSupplier) => string; reveal: boolean; onReveal: () => void }) {
  return (
    <section className="scan-scores">
      <h2>Scores so far</h2>
      <table>
        <thead><tr><th /><th>Right</th><th>Wrong</th><th>Avg time</th><th>Cost</th></tr></thead>
        <tbody>
          {order.map(s => {
            const results = shots.map(x => x.results[s]).filter(Boolean) as ScanResult[];
            const verdicts = shots.flatMap(x => Object.entries(x.verdicts).filter(([k]) => k.startsWith(`${s}:`)).map(([, v]) => v));
            const right = verdicts.filter(v => v === "right").length;
            return (
              <tr key={s}>
                <th>{label(s)}</th>
                <td>{right}</td>
                <td>{verdicts.length - right}</td>
                <td>{results.length ? `${(results.reduce((t, r) => t + r.ms, 0) / results.length / 1000).toFixed(0)}s` : "–"}</td>
                <td>{`US$${results.reduce((t, r) => t + r.costUsd, 0).toFixed(2)}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button onClick={onReveal}>{reveal ? "Hide names" : "Reveal which AI is which"}</button>
    </section>
  );
}

function Review({ shot, url, order, label, onChange, onRetry, onClose, onNext }: {
  shot: ScanShot; url: string; order: ScanSupplier[]; label: (s: ScanSupplier) => string;
  onChange: (s: ScanShot) => Promise<void>; onRetry: (s: ScanShot) => void; onClose: () => void; onNext: () => void;
}) {
  const [tab, setTab] = useState<ScanSupplier>(order[0]);
  const [active, setActive] = useState<number | null>(null);
  const result = shot.results[tab];
  const mark = (index: number, verdict: ScanVerdict) => onChange({ ...shot, verdicts: { ...shot.verdicts, [`${tab}:${index}`]: verdict } });

  return (
    <main className="scan-test">
      <div className="scan-actions"><button onClick={onClose}>← All photos</button><button className="scan-primary" onClick={onNext}>Next photo →</button></div>
      <div className="scan-photo">
        <img src={url} alt="Sale photo" />
        {result?.answer.items.map((item, i) => (
          <span key={i} className={`scan-box${active === i ? " is-active" : ""}${shot.verdicts[`${tab}:${i}`] ? ` is-${shot.verdicts[`${tab}:${i}`]}` : ""}`}
            style={{ left: `${item.box.x_min / 10}%`, top: `${item.box.y_min / 10}%`, width: `${(item.box.x_max - item.box.x_min) / 10}%`, height: `${(item.box.y_max - item.box.y_min) / 10}%` }}>
            {i + 1}
          </span>
        ))}
      </div>
      <div className="scan-tabs">
        {order.map(s => <button key={s} className={s === tab ? "is-on" : ""} onClick={() => { setTab(s); setActive(null); }}>{label(s)}</button>)}
      </div>
      {shot.errors[tab] ? <p className="scan-alert">{shot.errors[tab]} <button onClick={() => onRetry(shot)}>Try again</button></p>
        : !result ? <p className="scan-muted">Still scanning…</p>
        : (
          <>
            <p className="scan-muted">{result.answer.summary}</p>
            {result.answer.privacy_flags.length > 0 && <p className="scan-alert">Privacy flags: {result.answer.privacy_flags.join(", ")}</p>}
            <ol className="scan-items">
              {result.answer.items.map((item, i) => {
                const verdict = shot.verdicts[`${tab}:${i}`];
                return (
                  <li key={i} onClick={() => setActive(i)} className={active === i ? "is-active" : ""}>
                    <div><b>{i + 1}. {item.label}</b>{item.highlight && " ★"}<br /><small>{item.category} · {item.description}</small></div>
                    <div className="scan-verdict">
                      <button aria-label="Right" className={verdict === "right" ? "is-right" : ""} onClick={e => { e.stopPropagation(); mark(i, "right"); }}>✓</button>
                      <button aria-label="Wrong" className={verdict === "wrong" ? "is-wrong" : ""} onClick={e => { e.stopPropagation(); mark(i, "wrong"); }}>✗</button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      <label className="scan-missed">Anything they all missed?
        <textarea defaultValue={shot.missed} placeholder="e.g. green Crown Lynn vase, box of DVDs" onBlur={e => onChange({ ...shot, missed: e.target.value })} />
      </label>
    </main>
  );
}
