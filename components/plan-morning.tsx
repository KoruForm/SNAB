"use client";
import { trackEvent } from "../lib/analytics";
import Link from "next/link";
import { useState } from "react";
import { formatDay, localDateKey } from "../lib/drafts/types";
import { withDistances } from "../lib/mock/catalogue";
import { useCatalogue, usePreferences } from "../lib/mock/use-catalogue";
import { planRoute, routeUrl, salesOn } from "../lib/plan-route";
import { clock } from "../lib/sale-details";
import { useBuyerLocation } from "../lib/use-buyer-location";
import { SaleCover, StateBadge } from "./buyer-ui";

// Plan my morning: pick a day and the sales you want, and SNAB puts them in order with one maps link.
export function PlanMorning() {
  const { sales: catalogue, loading, error } = useCatalogue(); const { prefs } = usePreferences();
  const { origin, locate, locating, problem } = useBuyerLocation();
  const sales = withDistances(catalogue, origin).filter(s => s.state !== "closed" && !s.sample);
  const today = localDateKey(new Date());
  const dates = [...new Set(sales.flatMap(s => s.days.map(d => d.date)).filter(d => d >= today))].sort();
  const savedDate = dates.find(d => salesOn(sales, d).some(s => prefs.savedSales.includes(s.id)));
  const [picked, setPicked] = useState(""); const [chosen, setChosen] = useState<Record<string, boolean>>({});
  const date = dates.includes(picked) ? picked : savedDate ?? dates[0] ?? "";
  const onDay = salesOn(sales, date);
  // Saved sales start ticked; anything the buyer ticks or unticks wins.
  const isIn = (id: string) => chosen[`${date}:${id}`] ?? prefs.savedSales.includes(id);
  const stops = planRoute(onDay.filter(s => isIn(s.id)), date, origin);
  const url = routeUrl(stops, origin);
  const toggle = (id: string) => setChosen(c => ({ ...c, [`${date}:${id}`]: !isIn(id) }));
  return <section className="plan-page">
    <Link className="back-link" href="/saved">← Saved</Link>
    <p className="eyebrow">Plan my morning</p>
    <h1>Your <span className="highlight">route.</span></h1>
    <p className="workspace-lede">Tick the sales you want. We’ll put them in order: earliest start first, then the nearest next.</p>
    {loading && <p role="status">Finding sales…</p>}{error && <p role="alert" className="form-message error-message">{error}</p>}
    {!loading && !dates.length && <div className="empty-card"><h2>No sales coming up yet.</h2><p>Save a few sales and come back to plan your route.</p><Link className="button button-primary" href="/map">Find sales</Link></div>}
    {dates.length > 0 && <>
      <div className="filter-chips" role="group" aria-label="Day">{dates.slice(0, 8).map(d => <button key={d} className={d === date ? "selected" : ""} aria-pressed={d === date} onClick={() => setPicked(d)}>{d === today ? "Today" : formatDay({ date: d, starts: "", finishes: "" })}</button>)}</div>
      {!origin && <button className="text-button" disabled={locating} onClick={locate}>{locating ? "Finding you…" : "Start from where I am"}</button>}
      {problem && <p className="field-help" role="status">{problem}</p>}
      <ol className="plan-stops">{stops.map((stop, n) => <li key={stop.sale.id}><span className="plan-number">{n + 1}</span><div className="plan-cover"><SaleCover sale={stop.sale} /></div><div><Link href={`/sale/${stop.sale.id}`}><strong>{stop.sale.title}</strong></Link><small>{clock(stop.starts)} to {clock(stop.finishes)} · {stop.sale.town}{stop.legKm !== null ? ` · ${stop.legKm} km ${n ? "from the last stop" : "from you"}` : ""}</small>{!stop.sale.exactAddressVisible && <small>Street not shown yet, so this stop is the middle of the area. Streets show from 6pm the night before.</small>}</div><button className="text-button" onClick={() => toggle(stop.sale.id)} aria-label={`Take ${stop.sale.title} off the route`}>Remove</button></li>)}</ol>
      {!stops.length && <p className="field-help">Nothing ticked for this day yet. Add sales from the list below.</p>}
      {url && <a className="button button-primary full-width" href={url} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("Route opened", { stops: stops.length })}>Open the route in Google Maps →</a>}
      {stops.length > 10 && <p className="field-help">Maps takes up to 10 stops. The rest are in your list above.</p>}
      {onDay.some(s => !isIn(s.id)) && <><div className="section-heading"><h2>More sales that day</h2></div>
        <ul className="plan-more">{onDay.filter(s => !isIn(s.id)).map(s => <li key={s.id}><div><strong>{s.title}</strong><small>{s.town} · {clock(s.days.find(d => d.date === date)!.starts)}{s.distance !== null ? ` · ${s.distance} km` : ""}</small></div><StateBadge state={s.state} /><button className="text-button" onClick={() => toggle(s.id)}>Add</button></li>)}</ul></>}
    </>}
  </section>;
}
