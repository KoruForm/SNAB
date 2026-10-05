"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CATEGORIES, formatDay, type Category, type MockItem } from "../lib/drafts/types";
import { matchedItems, withDistances, type BuyerSale, type Match } from "../lib/mock/catalogue";
import { distanceKm, roundKm } from "../lib/geo";
import { useBuyerLocation } from "../lib/use-buyer-location";
import { SaleMap } from "./sale-map";
import { findSales, readFindFilters } from "../lib/find-sales";
import { togglePreference } from "../lib/mock/preferences";
import { REPORT_NOTE_MAX, reportReasons, reportSale, type ReportReason } from "../lib/reports";
import { useCatalogue, usePreferences } from "../lib/mock/use-catalogue";
import { useAccount } from "../lib/supabase/use-account";
import { hitLabels, watchHits } from "../lib/watchlist";
import { SaleWatchBanner, TreasureWatchlist, WatchlistStrip } from "./treasure-list";
import DraftPhotoImage from "./draft-photo";
import { PHOTOS, type PhotoName } from "./snap-photo";

export function CategoryArt({ category, size = 100 }: { category: Category; size?: number }) {
  return <Image src={`/brand/categories/${category === "Other" ? "free" : category.toLowerCase()}.svg`} alt="" width={size} height={size} />;
}
// Sample sales borrow the placeholder photography so the demo reads like real listings.
const SAMPLE_COVERS: Record<string, PhotoName> = { "demo-garage": "hero", "demo-moving": "buyerDiscovery", "demo-neighbours": "communitySale", "demo-workshop": "reclaimedSpace", "demo-books": "startSale" };
export function SaleCover({ sale, large = false }: { sale: BuyerSale; large?: boolean }) {
  if (sale.photos[0]) return <DraftPhotoImage photo={sale.photos[0]} className={large ? "sale-cover" : "buyer-card-photo"} />;
  const sample = SAMPLE_COVERS[sale.id];
  if (sample) { const photo = PHOTOS[sample]; return <Image src={photo.src} alt={photo.alt} width={large ? 1200 : 320} height={large ? 800 : 320} sizes={large ? "(max-width: 760px) 100vw, 760px" : "(max-width: 620px) calc(100vw - 40px), 340px"} className={large ? "sale-cover" : "buyer-card-photo"} style={{ objectPosition: photo.position }} priority={large} />; }
  return <div className={`illustrated-cover ${large ? "large-cover" : ""}`}><CategoryArt category={sale.coverCategory} size={large ? 140 : 56} /></div>;
}
export function Icon({ name }: { name: "heart" | "calendar" | "pin" | "search" | "back" | "tag" }) {
  const paths = { heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />, calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>, pin: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>, search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>, back: <path d="m15 5-7 7 7 7" />, tag: <><path d="M3 12V4h8l10 10-8 8L3 12Z" /><circle cx="7.5" cy="8.5" r="1.5" /></> };
  return <svg className="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function HeartButton({ saved, label, onClick, className = "" }: { saved: boolean; label: string; onClick: () => void; className?: string }) {
  return <button className={`heart-button ${saved ? "is-saved" : ""} ${className}`} onClick={onClick} aria-label={`${saved ? "Unsave" : "Save"} ${label}`} aria-pressed={saved}><Icon name="heart" /></button>;
}
export function StateBadge({ state }: { state: BuyerSale["state"] }) {
  return <span className={`state-badge state-${state}`}>{state === "open" ? "Open now" : state === "closed" ? "Closed" : "Coming up"}</span>;
}
function SearchBox({ initial = "", onSearch, big = false }: { initial?: string; onSearch?: (query: string) => void; big?: boolean }) {
  function submit(e: FormEvent<HTMLFormElement>) { if (onSearch) { e.preventDefault(); onSearch(String(new FormData(e.currentTarget).get("q") || "")); } }
  return <form className={`search-box ${big ? "search-box-big" : ""}`} action="/map" onSubmit={submit}><div className="search-field"><button type="submit" aria-label="Search sales"><Icon name="search" /></button><label className="sr-only" htmlFor="find-stuff">What are you hunting for?</label><input id="find-stuff" name="q" type="search" defaultValue={initial} placeholder={big ? "e.g. wooden dining chair" : "Search for a find or a suburb…"} maxLength={150} /></div>{big && <button type="submit" className="button button-primary full-width">Find matches</button>}</form>;
}
export function SaleCard({ sale, match }: { sale: BuyerSale; match?: Match }) {
  const { prefs, act, error } = usePreferences(); const saved = prefs.savedSales.includes(sale.id); const hits = watchHits(sale, prefs.treasures);
  return <article className={`buyer-sale-card${hits.length ? " on-list" : ""}`}><div className="buyer-card-cover"><SaleCover sale={sale} />{hits.length > 0 && <span className="watch-tape card-tape">On your list</span>}</div><div className="buyer-card-body"><div className="card-topline">{match ? <span className="match-band">{match.band}</span> : <StateBadge state={sale.state} />}<span className="distance-pill">{sale.distance === null ? sale.town : `${sale.exactPoint ? "" : "about "}${sale.distance} km`}</span></div><h2><Link href={`/sale/${sale.id}`} className="card-link">{sale.title}</Link></h2><p className="card-date">{sale.days.map(formatDay).join(" + ")} · {sale.days[0]?.starts}–{sale.days[0]?.finishes}</p><p className="card-town">{sale.town}{sale.sample ? " · sample" : ""}</p>{hits.length ? <p className="match-reason watch-reason">You’re after: <strong>{hitLabels(hits).slice(0, 3).join(", ")}</strong></p> : match?.reasons.length ? <p className="match-reason">Worth a look: <strong>{match.reasons.join(", ")}</strong></p> : <div className="category-chips">{sale.categories.slice(0, 3).map(c => <span key={c}>{c}</span>)}</div>}</div><HeartButton saved={saved} label={sale.title} onClick={() => act(() => togglePreference("savedSales", sale.id))} className="card-heart" />{error && <p role="alert" className="card-save-error">{error}</p>}</article>;
}
function LoadingOrError({ loading, error }: { loading: boolean; error: string }) { return <>{loading && <p className="loading-state" role="status">Finding the good stuff…</p>}{error && <p role="alert" className="form-message error-message">{error}</p>}</>; }
function NoResults({ reset }: { reset?: () => void }) { return <div className="empty-card"><CategoryArt category="Free" size={70} /><h2>No finds just yet.</h2><p>Try a wider area, another day or a different hunt.</p>{reset && <button className="button button-quiet" onClick={reset}>Clear filters</button>}</div>; }
// Both existing discovery URLs share one URL-backed Find experience.
export function MapPage({ event = false }: { event?: boolean }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const filters = readFindFilters(params);
  const { sales: catalogue, loading, error } = useCatalogue();
  const { origin, locate, locating, problem: locationProblem, forget } = useBuyerLocation();
  const sales = withDistances(catalogue, origin);
  const [selected, setSelected] = useState("");
  const [moreFilters, setMoreFilters] = useState(false);
  const results = findSales(sales, filters, event);
  const picked = results.find(result => result.sale.id === selected);
  const towns = [...new Set(sales.map(sale => sale.town))].sort();
  const activeFilters = [filters.category, filters.town, filters.radius, filters.openOnly, filters.sort !== "match"].filter(Boolean).length;

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value); else next.delete(key);
    }
    router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }
  function reset() {
    update({ q: "", day: "", category: "", town: "", radius: "", open: "", sort: "" });
  }

  return <section className="buyer-page find-page">
    <div className="page-heading">
      <p className="eyebrow">{event ? "Community SNAB Day" : "A good day for a rummage"}</p>
      <h1>{event ? <>Hamilton<br /><span className="highlight">SNAB Day.</span></> : <>Find your next<br /><span className="highlight">good thing.</span></>}</h1>
      <p className="workspace-lede">{event ? "One neighbourhood. Loads to find." : "Garage sales, great finds and a reason to get out."}</p>
    </div>
    {event && <div className="event-banner"><strong>Make a day of it.</strong><p>Explore sales taking part in Hamilton SNAB Day.</p><Link href="/sell?event=HAMILTON" className="small-link">Join with your sale →</Link></div>}
    <SearchBox key={filters.query} initial={filters.query} onSearch={query => update({ q: query.trim() })} />
    <div className="find-quick-filters" role="group" aria-label="Filter sales by day">
      {[["all", "Any day"], ["today", "Today"], ["weekend", "This weekend"]].map(([value, label]) => <button key={value} className={filters.day === value ? "selected" : ""} aria-pressed={filters.day === value} onClick={() => update({ day: value === "all" ? "" : value })}>{label}</button>)}
      <button className={origin ? "selected" : ""} aria-pressed={Boolean(origin)} disabled={locating} onClick={() => origin ? forget() : locate()}>{locating ? "Finding you…" : "Near me"}</button>
      <button className={moreFilters || activeFilters ? "selected" : ""} aria-expanded={moreFilters} aria-controls="find-filters" onClick={() => setMoreFilters(!moreFilters)}>Filters{activeFilters ? ` (${activeFilters})` : ""}</button>
    </div>
    {moreFilters && <div className="find-filters" id="find-filters">
      <div className="find-filter-fields">
        <label>Area<select value={filters.town} onChange={e => update({ town: e.target.value })}><option value="">All areas</option>{towns.map(town => <option key={town}>{town}</option>)}</select></label>
        <label>Category<select value={filters.category} onChange={e => update({ category: e.target.value })}><option value="">Everything</option>{CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label>
        <label>Sort by<select value={filters.sort} onChange={e => update({ sort: e.target.value })}><option value="match">Best match</option><option value="distance">Nearest first</option></select></label>
        <label>Distance<select value={filters.radius} onChange={e => update({ radius: e.target.value })}><option value="">Any distance</option><option value="3">Within 3 km</option><option value="5">Within 5 km</option><option value="10">Within 10 km</option></select></label>
      </div>
      <p className="field-help">{origin ? "Distances are from where you are. A sale still keeping its street private is measured to the middle of its area." : "Tap Near me to see how far away each sale is."} Sales without a distance stay in the list.</p>
      <div className="find-filter-footer"><label className="inline-checkbox"><input type="checkbox" checked={filters.openOnly} onChange={e => update({ open: e.target.checked ? "1" : "" })} />Open now</label><button className="text-button" onClick={reset}>Clear filters</button></div>
    </div>}
    {locationProblem && <p role="status" className="field-help">{locationProblem}</p>}
    {!filters.query && !loading && <WatchlistStrip sales={sales} onPick={query => update({ q: query })} />}
    {!filters.query && <div className="find-suggestions"><span>Try</span>{["Old computers", "Books and plants", "Woodworking tools"].map(query => <button key={query} onClick={() => update({ q: query })}>{query}</button>)}</div>}
    <div className="results-toolbar">
      <h2 aria-live="polite">{loading ? "Finding sales…" : `${results.length} ${results.length === 1 ? "sale" : "sales"} to explore`}</h2>
      <div className="segmented" role="group" aria-label="Results view">{["list", "map"].map(view => <button key={view} className={filters.view === view ? "selected" : ""} aria-pressed={filters.view === view} onClick={() => update({ view: view === "list" ? "" : view })}>{view === "list" ? "List" : "Map"}</button>)}</div>
    </div>
    {filters.query && <div className="find-query"><p>Matches for <strong>“{filters.query}”</strong></p><button className="text-button" onClick={() => update({ q: "" })}>Clear search</button></div>}
    <LoadingOrError loading={loading} error={error} />
    {!loading && <>
      {filters.view === "map" && <><SaleMap sales={results.map(result => result.sale)} selected={selected} onSelect={setSelected} origin={origin} label="Map of sales" />{picked ? <div className="selected-sale"><SaleCard sale={picked.sale} match={filters.query ? picked : undefined} /><button className="text-button" onClick={() => setSelected("")}>Close selected sale</button></div> : <p className="field-help map-help">Tap a pin or circle to preview a sale. A circle means the seller is keeping their street private for now.{results.some(result => !result.sale.point) ? " Sales without a map spot yet are in the list below." : ""}</p>}</>}
      {!results.length ? <NoResults reset={reset} /> : <div className="buyer-card-list">{results.map(match => <SaleCard sale={match.sale} match={filters.query ? match : undefined} key={match.sale.id} />)}</div>}
      {!event && <Link href="/event" className="find-event-link"><span><strong>A whole neighbourhood of finds.</strong><small>Explore Hamilton SNAB Day</small></span><span aria-hidden="true">→</span></Link>}
    </>}
  </section>;
}
export function HuntPage() { return <MapPage />; }
export function ItemCard({ item, sale, onList = false }: { item: MockItem; sale: BuyerSale; onList?: boolean }) {
  return <Link href={`/item/${sale.id}/${item.id}`} className={`item-card ${!item.available ? "item-gone" : ""} ${onList ? "item-on-list" : ""}`}><div className="item-art"><CategoryArt category={item.category} size={44} /></div><div><strong>{item.label}</strong>{(item.price || item.estimate) && <span className="item-price">{item.price || item.estimate}</span>}<small>{item.category} · {!item.available ? "Gone" : onList ? <mark className="watch-mark">On your list</mark> : "Worth a look"}</small></div><span aria-hidden="true">›</span></Link>;
}
export function SaleDetail({ id }: { id: string }) {
  const { sales, loading, error } = useCatalogue(); const signedIn = Boolean(useAccount().userId); const { prefs, act, error: prefsError } = usePreferences(); const [notice, setNotice] = useState(""); const [report, setReport] = useState(false); const [reason, setReason] = useState<ReportReason>("wrong-details"); const [reportNote, setReportNote] = useState(""); const [reporting, setReporting] = useState(false); const { origin } = useBuyerLocation(); const sale = sales.find(s => s.id === id);
  if (!sale) return <MissingSale loading={loading} error={error} />;
  const km = origin && sale.point ? roundKm(distanceKm(origin, sale.point)) : null;
  const saved = prefs.savedSales.includes(id); const listed = new Set(watchHits(sale, prefs.treasures).flatMap(hit => hit.items.map(i => i.id)));
  async function share() { const real = !sale!.sample && (!sale!.own || signedIn); try { await navigator.clipboard.writeText(`${sale!.title}\n${sale!.town}\n${window.location.href}${sale!.sample ? "\nSNAB sample sale" : real ? "" : "\nSNAB demo · listing saved on this device only"}`); setNotice(real ? "Sale link copied. Anyone with the link can open this sale." : "Sale link copied. This is a demo listing."); } catch { setNotice("Copy the page address from your browser to share this sale."); } }
  return <section className="sale-detail"><div className="sale-hero"><SaleCover sale={sale} large /><Link href="/map" className="hero-round hero-back" aria-label="Back to all sales"><Icon name="back" /></Link><HeartButton saved={saved} label="sale" onClick={() => act(() => togglePreference("savedSales", id))} className="hero-round hero-heart" />{sale.photos.length > 1 && <span className="hero-count">{sale.photos.length} photos</span>}</div><div className="card-topline"><StateBadge state={sale.state} />{sale.sample ? <span className="demo-pill">Sample sale</span> : sale.own && <span className="demo-pill">{signedIn ? "Your sale" : "Your demo sale"}</span>}</div><h1>{sale.title}</h1><ul className="sale-facts"><li><Icon name="calendar" /><span>{sale.days.map(d => <span key={d.date} className="fact-line">{formatDay(d)} · {d.starts}–{d.finishes}</span>)}</span></li><li><Icon name="pin" /><span><span className="fact-line">{sale.addressLabel}</span><small>{km === null ? "" : `${sale.exactPoint ? "" : "About "}${km} km from you · `}{sale.exactAddressVisible ? "Street address shown" : "Exact address hidden"}</small></span></li></ul><p className="sale-description">{sale.description}</p><SaleWatchBanner sale={sale} /><Link className="button button-primary full-width directions-action" href={`/directions/${id}`}><Icon name="pin" />{sale.exactAddressVisible ? "Get directions" : "View the area"}</Link>{sale.abundance && <p className="availability-note">{sale.abundance === "lots" ? "Still lots left to rummage through." : "Some things have found new homes. Still worth a look."}</p>}<div className="category-chips">{sale.categories.map(c => <Link key={c} href={`/sale/${id}/search?category=${c}`}>{c}</Link>)}</div><div className="section-heading"><h2>Worth a look</h2><Link className="small-link" href={`/sale/${id}/search`}>See all</Link></div><div className="item-list">{sale.items.length ? [...sale.items].sort((a, b) => Number(listed.has(b.id)) - Number(listed.has(a.id))).map(item => <ItemCard key={item.id} item={item} sale={sale} onList={listed.has(item.id)} />) : <p>No highlights added yet. There may still be plenty to find.</p>}</div>{sale.photos.length > 1 && <><h2>Have a rummage</h2><div className="draft-photo-grid">{sale.photos.slice(1).map(p => <figure key={p.id}><DraftPhotoImage photo={p} /></figure>)}</div></>}{sale.eventCode && <Link className="event-banner event-link" href="/event"><strong>Part of Hamilton SNAB Day</strong><span>Explore the community sales →</span></Link>}<div className="action-row"><button className="button button-quiet" onClick={share}>Copy sale link</button>{sale.own && <Link className="button button-primary" href={`/manage/${id}`}>Manage my sale</Link>}</div>{(notice || prefsError) && <p role="status" className="form-message">{notice || prefsError}</p>}{!sale.sample && !sale.own && <button className="text-button" onClick={() => setReport(!report)}>Report this listing</button>}{report && <form className="local-note" onSubmit={async e => { e.preventDefault(); setReporting(true); try { await reportSale(id, reason, reportNote); setNotice("Thanks. We’ll take a look at this sale."); setReport(false); setReportNote(""); } catch (err) { setNotice(err instanceof Error ? err.message : "Couldn’t send your report. Please try again."); } finally { setReporting(false); } }}><label>What needs a look?<select value={reason} onChange={e => setReason(e.target.value as ReportReason)}>{reportReasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></label><label>Anything else we should know? (optional)<textarea rows={3} maxLength={REPORT_NOTE_MAX} value={reportNote} onChange={e => setReportNote(e.target.value)} /></label><div className="action-row"><button className="button button-primary" disabled={reporting}>{reporting ? "Sending…" : "Send report"}</button><button type="button" className="text-button" onClick={() => setReport(false)}>Cancel</button></div></form>}</section>;
}
export function MissingSale({ loading, error }: { loading: boolean; error?: string }) { return <div className="empty-state">{loading ? <p role="status">Opening the sale…</p> : <><h1>Sale unavailable.</h1><p>{error || "That sale may have finished, or the link isn’t quite right. Have a look at the other sales."}</p><Link href="/map" className="button button-primary">Find a sale</Link></>}</div>; }
export function SaleSearch({ id }: { id: string }) {
  const search = useSearchParams(); const { sales, loading, error } = useCatalogue(); const sale = sales.find(s => s.id === id); const [q, setQ] = useState(""); const [category, setCategory] = useState(search.get("category") || "");
  if (!sale) return <MissingSale loading={loading} error={error} />;
  const items = matchedItems(sale, q).filter(i => !category || i.category === category);
  return <section><Link href={`/sale/${id}`} className="back-link">← {sale.title}</Link><p className="eyebrow">Search within this sale</p><h1>Rummage<br /><span className="highlight">a little deeper.</span></h1><SearchBox key={q} initial={q} onSearch={setQ} /><div className="filter-chips"><button aria-pressed={!category} className={!category ? "selected" : ""} onClick={() => setCategory("")}>Everything</button>{sale.categories.map(c => <button key={c} className={category === c ? "selected" : ""} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>)}</div><p className="field-help">{items.length} available highlights · {q || category || "All kinds of good stuff"}</p><div className="item-list">{items.length ? items.map(item => <ItemCard key={item.id} item={item} sale={sale} />) : <NoResults reset={() => { setQ(""); setCategory(""); }} />}</div></section>;
}
export function ItemDetail({ saleId, itemId }: { saleId: string; itemId: string }) {
  const { sales, loading, error } = useCatalogue(); const { prefs, act } = usePreferences(); const sale = sales.find(s => s.id === saleId); const item = sale?.items.find(i => i.id === itemId); const key = `${saleId}:${itemId}`;
  if (!sale) return <MissingSale loading={loading} error={error} />;
  if (!item) return <div className="empty-state"><h1>Find unavailable.</h1><p>This highlight may have been removed.</p><Link href={`/sale/${saleId}`}>Back to the sale →</Link></div>;
  const saved = prefs.savedItems.includes(key);
  return <section className="item-detail"><Link href={`/sale/${saleId}/search`} className="back-link">← Search this sale</Link><div className="item-hero">{sale.photos[0] ? <DraftPhotoImage photo={sale.photos[0]} className="sale-cover" /> : <CategoryArt category={item.category} size={170} />}<span>{sale.photos.length ? "Sale photo · item location is illustrative" : "Illustration · demo highlight"}</span><HeartButton saved={saved} label="item" onClick={() => act(() => togglePreference("savedItems", key))} className="hero-round hero-heart" /></div><div className="card-topline"><span className="demo-pill">{item.category}</span><StateBadge state={sale.state} /></div><h1>{item.label}</h1><p className="workspace-lede">{item.description}</p><div className="price-card">{item.price ? <><strong>Asking price: {item.price}</strong><p>Set by the seller in this demo.</p></> : item.estimate ? <><strong>{item.estimate}</strong><p>Sample estimate · condition and value haven’t been assessed. Ask the seller at the sale.</p></> : <><strong>Ask at the sale</strong><p>The seller hasn’t added a price.</p></>}</div>{!item.available && <p className="form-message">This find has already gone.</p>}<div className="location-card"><h2>At {sale.title}</h2><p>{sale.addressLabel}</p><StateBadge state={sale.state} /><Link className="button button-primary full-width continue-button" href={`/sale/${saleId}`}>See it at the sale →</Link></div></section>;
}
export function SavedPage() {
  const { sales, loading, error } = useCatalogue(); const { prefs, error: prefsError } = usePreferences(); const [tab, setTab] = useState("treasures"); const savedSales = sales.filter(s => prefs.savedSales.includes(s.id)); const savedItems = sales.flatMap(s => s.items.filter(i => prefs.savedItems.includes(`${s.id}:${i.id}`)).map(i => ({ sale: s, item: i })));
  return <section><p className="eyebrow">Keep an eye out</p><h1>Your<br /><span className="highlight">treasure list.</span></h1><p className="workspace-lede">Tell SNAB what you’re hunting for. Any sale that has it gets flagged as you browse.</p><div className="segmented saved-tabs" role="tablist" aria-label="Saved finds">{[{ id: "treasures", label: `Treasures (${prefs.treasures.length})` }, { id: "sales", label: `Sales (${savedSales.length})` }, { id: "items", label: `Finds (${savedItems.length})` }].map(t => <button role="tab" id={`tab-${t.id}`} aria-controls={`panel-${t.id}`} aria-selected={tab === t.id} key={t.id} className={tab === t.id ? "selected" : ""} onClick={() => setTab(t.id)}>{t.label}</button>)}</div><LoadingOrError loading={loading} error={error || prefsError} /><div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>{tab === "treasures" && <TreasureWatchlist sales={sales} />}{tab === "sales" && (savedSales.length ? <div className="buyer-card-list">{savedSales.map(s => <SaleCard key={s.id} sale={s} />)}</div> : <div className="empty-card"><h2>No sales saved yet.</h2><p>Tap a heart on a sale you’d like to visit.</p><Link className="button button-primary" href="/map">Explore sales</Link></div>)}{tab === "items" && (savedItems.length ? <div className="item-list">{savedItems.map(({ sale, item }) => <ItemCard sale={sale} item={item} key={`${sale.id}:${item.id}`} />)}</div> : <div className="empty-card"><h2>A good find is worth saving.</h2><p>Open an item and tap its heart to keep it here.</p><Link href="/hunt" className="button button-primary">Go hunting</Link></div>)}</div></section>;
}
export function DirectionsPage({ id }: { id: string }) {
  const { sales, loading, error } = useCatalogue(); const { origin } = useBuyerLocation(); const sale = sales.find(s => s.id === id);
  if (!sale) return <MissingSale loading={loading} error={error} />;
  // Prefer the exact pin for navigation; the street text covers sales saved before pins existed.
  const destination = sale.exactPoint && sale.point ? `${sale.point.lat},${sale.point.lng}` : `${sale.addressLabel}, ${sale.town}, New Zealand`;
  return <section><Link className="back-link" href={`/sale/${id}`}>← Back to the sale</Link><p className="eyebrow">The way to a good Snab</p><h1>{sale.exactAddressVisible ? "Let’s get there." : "Find the area."}</h1><p className="workspace-lede">{sale.addressLabel}</p>
    {sale.point ? <SaleMap sales={[sale]} selected={id} origin={origin} label={`Map showing ${sale.exactPoint ? "where" : "roughly where"} ${sale.title} is`} zoom={14} /> : <p className="field-help">This sale isn’t on the map yet.</p>}
    <div className="location-card">{sale.exactAddressVisible && !sale.sample ? <><strong>{sale.addressLabel}{sale.town ? `, ${sale.town}` : ""}</strong><p>Your maps app will take you there.</p><a className="button button-primary full-width" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`} target="_blank" rel="noopener noreferrer">Get directions →</a></> : sale.exactAddressVisible ? <><strong>{sale.addressLabel}</strong><p>This is a sample sale with a made-up address, so there’s nowhere to navigate to.</p><Link href="/map" className="button button-primary">Find real sales</Link></> : <><strong>The street address is private.</strong><p>The circle shows roughly where the sale is. The seller has chosen to show only the area, or to reveal the address on sale day. Save the sale and check back.</p><Link href={`/sale/${id}`} className="button button-primary">Back to the sale</Link></>}</div></section>;
}
