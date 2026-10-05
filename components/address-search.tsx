"use client";
import { useEffect, useId, useState } from "react";
import type { AddressSuggestion } from "../lib/geo";

// Street address field that suggests real NZ addresses (app/api/address) as the seller types.
export function AddressSearch({ value, onType, onPick }: { value: string; onType: (text: string) => void; onPick: (suggestion: AddressSuggestion) => void }) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [query, setQuery] = useState("");
  const [problem, setProblem] = useState("");

  useEffect(() => {
    const text = query.trim();
    if (text.length < 4) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/address?q=${encodeURIComponent(text)}`, { signal: controller.signal })
        .then(async response => {
          const body = await response.json() as { suggestions?: AddressSuggestion[]; error?: string };
          setSuggestions(body.suggestions ?? []); setProblem(body.error ?? ""); setActive(-1); setOpen(true);
        })
        .catch(error => { if ((error as Error).name !== "AbortError") setProblem("Address search isn’t available right now. Tap the map where your sale is instead."); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  function pick(suggestion: AddressSuggestion) { onPick(suggestion); setOpen(false); setSuggestions([]); setQuery(""); }
  const showList = open && query.trim().length >= 4;

  return <div className="address-search">
    <label>Street address
      <input name="address" autoComplete="street-address" value={value} maxLength={200} required placeholder="Start typing, e.g. 12 Grey Street" role="combobox" aria-autocomplete="list" aria-expanded={showList && suggestions.length > 0} aria-controls={listId} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={e => { onType(e.target.value); setQuery(e.target.value); if (e.target.value.trim().length < 4) setSuggestions([]); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => {
          if (!showList || !suggestions.length) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setActive(n => (n + (e.key === "ArrowDown" ? 1 : suggestions.length - 1) + 1) % (suggestions.length + 1) - 1); }
          else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(suggestions[active]); }
          else if (e.key === "Escape") setOpen(false);
        }} />
    </label>
    {showList && suggestions.length > 0 && <ul className="address-suggestions" id={listId} role="listbox" aria-label="Matching addresses">
      {suggestions.map((s, n) => <li key={s.label} id={`${listId}-${n}`} role="option" aria-selected={n === active} className={n === active ? "active" : ""} onMouseDown={e => { e.preventDefault(); pick(s); }}>{s.label}</li>)}
    </ul>}
    {showList && !suggestions.length && !problem && <p className="field-help">No matching address yet. Keep typing, or tap the map where your sale is.</p>}
    {problem && <p className="field-help">{problem}</p>}
  </div>;
}
