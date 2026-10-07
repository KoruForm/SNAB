"use client";
import { useEffect, useState } from "react";
import { formatDay, type MockItem } from "../lib/drafts/types";
import { demandMet, fetchDemand, type Demand } from "../lib/demand";
import { useCatalogue } from "../lib/mock/use-catalogue";
import { plannedDates } from "../lib/snab-saturdays";
import { NOTE_MAX, PAYMENTS, SALE_TYPES, type SaleDetails } from "../lib/sale-details";

// Helpers for the sell flow: what buyers are hunting for, dates other sellers picked, and the extra details.

function useDemand(): Demand[] {
  const [demand, setDemand] = useState<Demand[]>([]);
  useEffect(() => { let active = true; fetchDemand().then(d => { if (active) setDemand(d); }); return () => { active = false; }; }, []);
  return demand;
}

// Start page: proof there are buyers before anyone lists.
export function DemandChips() {
  const demand = useDemand();
  if (!demand.length) return null;
  return <div className="demand-panel">
    <strong>Buyers near you are hunting for</strong>
    <ul className="demand-chips">{demand.slice(0, 8).map(d => <li key={d.treasure}>{d.treasure} <span>{d.lists}</span></li>)}</ul>
    <small>Number of buyers with it on their treasure list.</small>
  </div>;
}

// Highlights step: which of those the seller has, and which they might have tucked away in the shed.
export function DemandMatches({ items }: { items: MockItem[] }) {
  const demand = useDemand();
  if (!demand.length) return null;
  const met = new Set(demandMet(items, demand).map(d => d.treasure));
  return <div className="demand-panel">
    <strong>Got any of these? Buyers are looking</strong>
    <ul className="demand-chips">{demand.slice(0, 10).map(d => <li key={d.treasure} className={met.has(d.treasure) ? "met" : ""}>{met.has(d.treasure) ? "✓ " : ""}{d.treasure} <span>{d.lists}</span></li>)}</ul>
    <small>Add the ones you have as highlights. Buyers with them on their list get told about your sale.</small>
  </div>;
}

// When step: dates other sellers have already picked. A cluster of sales pulls more buyers out.
export function PlannedDatesPicker({ onPick }: { onPick: (date: string) => void }) {
  const { sales } = useCatalogue();
  const dates = plannedDates(sales);
  if (!dates.length) return null;
  return <div className="demand-panel">
    <strong>Join a busy day</strong>
    <p className="field-help">Other sellers have picked these. More sales on the same day bring more buyers out.</p>
    <ul className="planned-dates">{dates.map(d => <li key={d.date}><button type="button" onClick={() => onPick(d.date)}><strong>{formatDay({ date: d.date, starts: "", finishes: "" })}</strong><span>{d.sales} {d.sales === 1 ? "sale" : "sales"}{d.towns.length ? ` · ${d.towns.slice(0, 3).join(", ")}` : ""}</span></button></li>)}</ul>
  </div>;
}

// Preview step: the answers to the questions buyers always message about. Names match readExtras().
export function SaleExtrasFields({ details }: { details?: SaleDetails }) {
  return <fieldset className="sale-extras">
    <legend>Good to know <span className="optional-label">optional</span></legend>
    <label>Kind of sale<select name="saleType" defaultValue={details?.saleType ?? "garage"}>{SALE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
    <p className="field-label">How can buyers pay?</p>
    <div className="filter-chips">{PAYMENTS.map(p => <label key={p.value} className="inline-checkbox"><input type="checkbox" name="payment" value={p.value} defaultChecked={details?.payment?.includes(p.value) ?? p.value === "cash"} />{p.label}</label>)}</div>
    <p className="field-label">Early birds?</p>
    <div className="filter-chips">{[["", "Don’t say"], ["no", "Not before the start time"], ["welcome", "Welcome"]].map(([value, label]) => <label key={value} className="inline-checkbox"><input type="radio" name="earlyBirds" value={value} defaultChecked={(details?.earlyBirds ?? "") === value} />{label}</label>)}</div>
    <label>Anything else? <span className="optional-label">optional</span><input name="note" maxLength={NOTE_MAX} defaultValue={details?.note ?? ""} placeholder="e.g. Park on the street. Rain or shine." /></label>
  </fieldset>;
}
export function readExtras(data: FormData, current?: SaleDetails): SaleDetails {
  const earlyBirds = String(data.get("earlyBirds") || "");
  const note = String(data.get("note") || "").trim();
  const next: SaleDetails = { ...current, saleType: String(data.get("saleType") || "garage") as SaleDetails["saleType"], payment: data.getAll("payment").map(String) as SaleDetails["payment"] };
  if (earlyBirds === "welcome" || earlyBirds === "no") next.earlyBirds = earlyBirds; else delete next.earlyBirds;
  if (note) next.note = note.slice(0, NOTE_MAX); else delete next.note;
  return next;
}
