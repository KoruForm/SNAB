"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createDraft, updateDraft } from "../lib/drafts/storage";
import { formatDay, localDateKey, validateDays, type Draft, type DraftPatch } from "../lib/drafts/types";
import { fetchSaleTreasureLists } from "../lib/demand";
import { markPosted, placesFor, readPosted, shareSale } from "../lib/advertise";
import { PICKUP_OPTIONS } from "../lib/leftovers";
import { CATEGORIES } from "../lib/drafts/types";
import { clock, leftoversOn, moveSaleDay, PRICE_GUIDE } from "../lib/sale-details";

// Sale-day tools on the Manage page. Each one saves through the page's change(), which shows the message.
type Change = (patch: DraftPatch, message: string) => Promise<void>;

// "On 9 treasure lists": buyers hunting for something this sale has. Signed-in sellers only.
export function TreasureListsTile({ id }: { id: string }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => { let active = true; fetchSaleTreasureLists(id).then(n => { if (active) setCount(n); }, () => undefined); return () => { active = false; }; }, [id]);
  if (count === null) return null;
  return <div><strong>{count}</strong><span>{count === 1 ? "Treasure list" : "Treasure lists"}</span></div>;
}

// One place to post the sale: the phone's share sheet first, then each local spot with the text copied ready to paste.
export function AdvertisePanel({ draft, text, url, postImage }: { draft: Draft; text: string; url: string; postImage: () => Promise<Blob | undefined> }) {
  const [posted, setPosted] = useState<string[]>([]); const [note, setNote] = useState("");
  useEffect(() => { queueMicrotask(() => setPosted(readPosted(draft.id))); }, [draft.id]);
  const places = placesFor(draft.details?.saleType);
  async function share() {
    const result = await shareSale(text, url, await postImage().catch(() => undefined));
    setNote(result === "unsupported" ? "This browser can’t open the share menu. Use the places below instead." : result === "shared" ? "Shared. Try a couple of local groups too." : "");
  }
  async function open(id: string, link: string) {
    try { await navigator.clipboard.writeText(text); setNote("Post text copied. Paste it in, add your post image and post."); } catch { setNote("Copy the post text from “Facebook post” above, then paste it in."); }
    setPosted(markPosted(draft.id, id)); window.open(link, "_blank", "noopener,noreferrer");
  }
  return <div className="sale-day-panel advertise-panel">
    <h2>Post it everywhere</h2>
    <p className="field-help">Most buyers find sales in local groups. Share once, then tick off each place.</p>
    <button className="button button-primary full-width" onClick={() => void share()}>Share my sale…</button>
    <ul className="advertise-list">{places.map(p => <li key={p.id}><span aria-hidden="true">{posted.includes(p.id) ? "✓" : "○"}</span><span><strong>{p.name}</strong><small>{p.why}</small></span><button className="text-button" onClick={() => void open(p.id, p.url)}>{posted.includes(p.id) ? "Again" : "Copy & open"}</button></li>)}</ul>
    {note && <p className="form-message" role="status">{note}</p>}
  </div>;
}

// Weather looking bad? Move the next sale day; buyers who saved it see the new date on the sale and in Saved.
export function RainPlan({ draft, busy, change }: { draft: Draft; busy: boolean; change: Change }) {
  const today = localDateKey(new Date());
  const next = [...draft.days].sort((a, b) => a.date.localeCompare(b.date)).find(d => d.date >= today);
  const [open, setOpen] = useState(false); const [to, setTo] = useState(""); const [problem, setProblem] = useState("");
  if (!next || draft.status === "closed") return null;
  async function move() {
    try {
      const moved = moveSaleDay(draft.days, draft.details, next!.date, to);
      const invalid = validateDays(moved.days); if (invalid) throw new Error(invalid);
      setProblem(""); await change({ days: moved.days, details: moved.details, dayMode: "auto" }, `Moved to ${formatDay({ date: to, starts: "", finishes: "" })}. Buyers will see the new date.`); setOpen(false);
    } catch (e) { setProblem(e instanceof Error ? e.message : "Couldn’t move the sale."); }
  }
  return <div className="sale-day-panel">
    <h2>Rain on the way?</h2>
    {!open ? <><p className="field-help">Move {formatDay(next)} to another day. Your times stay the same.</p><button className="button button-quiet full-width" disabled={busy} onClick={() => setOpen(true)}>Move my sale day</button></>
      : <><label>New date<input type="date" value={to} min={today} onChange={e => setTo(e.target.value)} /></label>
        {problem && <p className="form-message error-message" role="alert">{problem}</p>}
        <div className="action-row"><button className="button button-primary" disabled={busy || !to} onClick={() => void move()}>Move it</button><button className="text-button" onClick={() => setOpen(false)}>Cancel</button></div>
        <p className="field-help">Reprint your sign after moving, so the date on it is right.</p></>}
  </div>;
}

// When the selling's done: keep the sale on the map as "free leftovers" until a set time, or book a charity pick-up.
export function LeftoversPanel({ draft, busy, change }: { draft: Draft; busy: boolean; change: Change }) {
  const today = localDateKey(new Date()); const lastDay = draft.days.map(d => d.date).sort().at(-1);
  const [until, setUntil] = useState("18:00"); const [late, setLate] = useState(false);
  const on = leftoversOn(draft.details, draft.days);
  if (lastDay !== today) return null;
  const { leftoversUntil: _ended, ...rest } = draft.details ?? {}; void _ended;
  return <div className="sale-day-panel leftovers-panel">
    <h2>Got leftovers?</h2>
    {on ? <><p>Your leftovers show as <strong>free to collect until {clock(draft.details!.leftoversUntil!)}</strong>. Leave them by the footpath.</p>
        <button className="button button-quiet full-width" disabled={busy} onClick={() => void change({ details: rest }, "Leftovers taken off the map.")}>Everything’s gone</button></>
      : <><p className="field-help">Keep your sale on the map as free stuff, so neighbours come and take the rest.</p>
        <label>Free to collect until<input type="time" value={until} onChange={e => setUntil(e.target.value)} /></label>
        {late && <p className="form-message error-message" role="alert">Pick a time later than now.</p>}<button className="button button-primary full-width" disabled={busy || !until} onClick={() => { if (!leftoversOn({ leftoversUntil: until }, draft.days)) { setLate(true); return; } setLate(false); void change({ status: "published", dayMode: "closed", details: { ...rest, leftoversUntil: until } }, "Your leftovers are on the map as free to collect."); }}>Give the leftovers away</button></>}
    <p className="field-label">Or have them picked up</p>
    <ul className="pickup-list">{PICKUP_OPTIONS.map(o => <li key={o.name}><a href={o.url} target="_blank" rel="noopener noreferrer">{o.name} →</a><small>{o.note}</small></li>)}</ul>
  </div>;
}

// Run it again: a new draft with the same details, place and highlights, ready for new dates.
export function RunAgain({ draft }: { draft: Draft }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [problem, setProblem] = useState("");
  async function copy() {
    setBusy(true); setProblem("");
    try {
      const created = await createDraft(); const { leftoversUntil: _l, movedFrom: _m, ...details } = draft.details ?? {}; void _l; void _m;
      await updateDraft(created.id, { title: draft.title, description: draft.description, location: draft.location, categories: draft.categories, highlights: draft.highlights, items: draft.items?.map(i => ({ ...i, available: true })), details, partner: draft.partner, eventCode: draft.eventCode });
      router.push(`/sell/when?draft=${created.id}`);
    } catch (e) { setProblem(e instanceof Error ? e.message : "Couldn’t copy this sale."); setBusy(false); }
  }
  return <div className="sale-day-panel">
    <h2>Run it again</h2>
    <p className="field-help">Hold sales often, like a market or car boot? Start the next one from this one. You’ll pick new dates and photos.</p>
    <button className="button button-quiet full-width" disabled={busy} onClick={() => void copy()}>{busy ? "Copying…" : "Copy to a new sale"}</button>
    {problem && <p className="form-message error-message" role="alert">{problem}</p>}
  </div>;
}

// The printable sheet of coloured price dots and the key to go with it.
export function StickerSheet() {
  const [url, setUrl] = useState(""); const [problem, setProblem] = useState("");
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  async function make() {
    try { const { createStickerSheet } = await import("../lib/stickers"); setUrl(URL.createObjectURL(new Blob([createStickerSheet()], { type: "application/pdf" }))); }
    catch { setProblem("Couldn’t make the sticker sheet. Try again."); }
  }
  return <div className="sale-day-panel">
    <h2>Price stickers</h2>
    <p className="field-help">One colour per price: $1, $2, $5, $10, $20 and free. Print, cut out and stick on.</p>
    {url ? <a className="button button-primary full-width" href={url} download="SNAB-price-stickers.pdf">Save sticker sheet ↓</a> : <button className="button button-quiet full-width" onClick={() => void make()}>Make my sticker sheet</button>}
    {problem && <p className="form-message error-message" role="alert">{problem}</p>}
    <PriceGuide />
  </div>;
}

// Rough prices by category, for sellers who don't know what to charge.
export function PriceGuide({ open = false }: { open?: boolean }) {
  return <details className="price-guide" open={open}><summary>Not sure what to charge?</summary>
    <p className="field-help">Typical garage-sale prices. Price to sell: most buyers expect a bargain and like to haggle a little.</p>
    <dl>{CATEGORIES.map(c => <div key={c}><dt>{c}</dt><dd>{PRICE_GUIDE[c]}</dd></div>)}</dl>
  </details>;
}
