"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { BuyerSale } from "../lib/mock/catalogue";
import { savePreferences } from "../lib/mock/preferences";
import { usePreferences } from "../lib/mock/use-catalogue";
import { CodeSignIn } from "./code-sign-in";
import { supabaseConfigured } from "../lib/supabase/client";
import { useAccount } from "../lib/supabase/use-account";
import { setTreasureAlerts } from "../lib/treasure-sync";
import { addTreasure, hitLabels, salesOnList, treasureMatches, watchHits } from "../lib/watchlist";

const STARTERS = ["Old computers", "Vintage books", "Garden tools", "Kids’ toys"];

function plural(count: number, one: string, many = `${one}s`) { return `${count} ${count === 1 ? one : many}`; }

// One small form used everywhere the list is offered.
export function TreasureAddForm({ label = "What are you hunting for?", compact = false, onAdded }: { label?: string; compact?: boolean; onAdded?: (name: string) => void }) {
  const { prefs, act, error } = usePreferences();
  const [notice, setNotice] = useState("");
  function add(name: string) {
    const next = addTreasure(prefs.treasures, name);
    if (!next) { setNotice(name.trim() ? "That’s already on your list." : ""); return false; }
    act(() => savePreferences({ treasures: next }));
    setNotice(`Added “${next[next.length - 1]}”. We’ll flag any sale that has it.`);
    onAdded?.(next[next.length - 1]);
    return true;
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (add(String(new FormData(form).get("treasure") || ""))) form.reset();
  }
  const starters = STARTERS.filter(s => !prefs.treasures.some(t => t.toLowerCase() === s.toLowerCase()));
  return <div className={`treasure-add${compact ? " treasure-add-compact" : ""}`}>
    <form className="treasure-form" onSubmit={submit}>
      <label>{label}<input name="treasure" placeholder="e.g. record player" required maxLength={80} autoComplete="off" /></label>
      <button className="button button-primary">＋ Add</button>
    </form>
    {!compact && starters.length > 0 && <div className="treasure-starters"><span>Popular</span>{starters.slice(0, 3).map(s => <button type="button" key={s} onClick={() => add(s)}>＋ {s}</button>)}</div>}
    {(notice || error) && <p role="status" className="treasure-notice">{error || notice}</p>}
  </div>;
}

// Find: a nudge to start the list, or a summary of which sales have something on it.
// For a search that found nothing: put the search on the treasure list so SNAB flags it when it turns up.
export function AddSearchToList({ query }: { query: string }) {
  const { prefs, act } = usePreferences();
  const clean = query.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!clean) return null;
  const listed = prefs.treasures.some(t => t.toLowerCase() === clean.toLowerCase());
  if (listed) return <p className="field-help" role="status">“{clean}” is on your treasure list. We’ll flag it when it turns up.</p>;
  return <button className="button button-primary" onClick={() => { const next = addTreasure(prefs.treasures, clean); if (next) act(() => savePreferences({ treasures: next })); }}>Add “{clean}” to my treasure list</button>;
}
export function WatchlistStrip({ sales, onPick }: { sales: BuyerSale[]; onPick: (treasure: string) => void }) {
  const { prefs } = usePreferences();
  if (!prefs.treasures.length) return <aside className="watch-card watch-promo" aria-labelledby="watch-promo-title">
    <span className="watch-tape">Treasure list</span>
    <Image className="watch-pin" src="/brand/snab-pin.png" alt="" width={22} height={31} />
    <h2 id="watch-promo-title">Hunting for something?</h2>
    <p>Put it on your treasure list. Every sale that has it gets flagged as you browse.</p>
    <TreasureAddForm label="Add a treasure" compact />
  </aside>;
  const matches = treasureMatches(sales, prefs.treasures);
  const onList = salesOnList(sales, prefs.treasures).length;
  return <aside className="watch-card watch-summary" aria-labelledby="watch-summary-title">
    <span className="watch-tape">Your treasure list</span>
    <h2 id="watch-summary-title">{onList ? <><span className="watch-mark">{plural(onList, "sale")}</span> {onList === 1 ? "has" : "have"} something you’re after.</> : "No matches yet. We’ll flag it when it turns up."}</h2>
    <div className="watch-chips">{matches.map(m => <button key={m.treasure} type="button" className={m.sales.length ? "has-hits" : ""} onClick={() => onPick(m.treasure)}>{m.treasure}<span>{m.sales.length}</span></button>)}</div>
    <Link className="small-link" href="/saved?tab=treasures">Edit your list →</Link>
  </aside>;
}

// Sale page: what on this sale is on your list, or an invitation to start one.
export function SaleWatchBanner({ sale }: { sale: BuyerSale }) {
  const { prefs } = usePreferences();
  const hits = watchHits(sale, prefs.treasures);
  if (hits.length) return <div className="watch-card watch-hit" role="note">
    <span className="watch-tape">On your treasure list</span>
    <p><strong>{hits.map(h => h.treasure).join(", ")}</strong></p>
    <p className="watch-hit-items">Look for: {hitLabels(hits).join(", ")}</p>
  </div>;
  if (prefs.treasures.length || sale.state === "closed") return null;
  return <Link className="watch-nudge" href="/saved?tab=treasures"><Image src="/brand/snab-pin.png" alt="" width={17} height={24} /><span><strong>Hunting for something specific?</strong><small>Start a treasure list and we’ll flag sales that have it.</small></span><span aria-hidden="true">→</span></Link>;
}

// Saved: the list itself, with the sales that have each treasure right underneath.
export function TreasureWatchlist({ sales }: { sales: BuyerSale[] }) {
  const { prefs, act } = usePreferences();
  const matches = treasureMatches(sales, prefs.treasures);
  return <>
    <TreasureAddForm label="What are you hunting for?" />
    {matches.length ? <div className="treasure-list">{matches.map(({ treasure, sales: hits }) => <article key={treasure} className={hits.length ? "has-hits" : ""}>
      <div className="treasure-head">
        <div><strong>{treasure}</strong><small>{hits.length ? `Spotted at ${plural(hits.length, "sale")}` : "Watching. Nothing yet."}</small></div>
        <button aria-label={`Remove ${treasure} from treasure list`} className="remove-interest" onClick={() => act(() => savePreferences({ treasures: prefs.treasures.filter(s => s !== treasure) }))}>×</button>
      </div>
      {hits.length > 0 && <ul className="treasure-hits">{hits.slice(0, 3).map(({ sale, items }) => <li key={sale.id}><Link href={`/sale/${sale.id}`}><span><b>{sale.title}</b><small>{sale.town} · {sale.state === "open" ? "Open now" : "Coming up"}</small><em>{items.map(i => i.label).join(", ")}</em></span><span aria-hidden="true">›</span></Link></li>)}</ul>}
      {hits.length > 3 && <Link className="small-link" href={`/map?q=${encodeURIComponent(treasure)}`}>See all {hits.length} sales →</Link>}
    </article>)}</div> : <div className="empty-card treasure-empty"><h2>A little list. Big possibilities.</h2><p>Add the things you’re after. Any sale that has one gets a yellow “On your list” tape in Find.</p></div>}
    {supabaseConfigured() && prefs.treasures.length > 0 ? <TreasureAlerts /> : <p className="field-help">Your treasure list is saved in this browser.</p>}
  </>;
}

// Email alerts: asked for only when a buyer wants them. Signing in by code also saves the list to their account.
function TreasureAlerts() {
  const account = useAccount();
  const { prefs } = usePreferences();
  const [wanted, setWanted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const userId = account.userId;
  const synced = Boolean(userId) && prefs.treasuresSyncedFor === userId;
  async function change(on: boolean) {
    if (!userId) return;
    setBusy(true); setError("");
    try { await setTreasureAlerts(userId, on); } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t change your alerts. Try again."); } finally { setBusy(false); }
  }
  // Just signed in from this card: switch alerts on once the account copy of the list is in.
  useEffect(() => {
    if (!wanted || !synced || !userId) return;
    queueMicrotask(() => { setWanted(false); setBusy(true); setTreasureAlerts(userId, true).catch(() => setError("Couldn’t turn on your alerts. Try again.")).finally(() => setBusy(false)); });
  }, [wanted, synced, userId]);
  if (account.loading) return null;
  const on = synced && prefs.treasureAlerts;
  return <aside className="watch-card treasure-alerts" aria-labelledby="treasure-alerts-title">
    <span className="watch-tape">{on ? "Alerts on" : "Treasure alerts"}</span>
    {on ? <>
      <h2 id="treasure-alerts-title">We’ll give you a ping.</h2>
      <p>When a new sale has something on your list, we’ll email {account.email}. Your list is saved to your account.</p>
      <button className="text-button" disabled={busy} onClick={() => void change(false)}>Turn off email alerts</button>
    </> : <>
      <h2 id="treasure-alerts-title">Get a ping when one turns up?</h2>
      {userId ? <>
        <p>We’ll email {account.email} when a new sale has something on your list.</p>
        <button className="button button-primary" disabled={busy || !synced} onClick={() => void change(true)}>{busy ? "Turning on…" : "Email me alerts"}</button>
      </> : <>
        <p>Enter your email and we’ll send a 6-digit code. Your list is saved to your account, so it’s on every device too.</p>
        <CodeSignIn sendLabel="Email me a code" onSignedIn={() => setWanted(true)} />
      </>}
    </>}
    {error && <p className="form-message error-message" role="alert">{error}</p>}
  </aside>;
}

// Home page: introduce the list and send people to Saved with their first treasure on it.
export function TreasurePromo() {
  const router = useRouter();
  return <div className="treasure-promo-card">
    <span className="find-preview-tape treasure-promo-tape">Your treasure list</span>
    <ul className="treasure-promo-list" aria-label="Example treasure list">
      <li className="is-hit"><span>Record player</span><b>Spotted at 2 sales</b></li>
      <li className="is-hit"><span>Kids’ bikes</span><b>Spotted at 1 sale</b></li>
      <li><span>Mid-century chair</span><b>Watching</b></li>
    </ul>
    <TreasureAddForm label="Start yours. What are you hunting for?" compact onAdded={() => router.push("/saved")} />
  </div>;
}
