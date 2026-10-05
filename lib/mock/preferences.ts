import { recordSaleSave } from "../sale-stats";
export type Preferences = { savedSales: string[]; savedItems: string[]; treasures: string[]; name: string; demoSignedIn: boolean };
const KEY = "snab-ux-preferences-v1";
const defaults: Preferences = { savedSales: [], savedItems: [], treasures: [], name: "", demoSignedIn: false };
export function readPreferences(): Preferences {
  try { const value = JSON.parse(localStorage.getItem(KEY) || "null"); return value && typeof value === "object" ? { ...defaults, ...value, savedSales: Array.isArray(value.savedSales) ? value.savedSales : [], savedItems: Array.isArray(value.savedItems) ? value.savedItems : [], treasures: Array.isArray(value.treasures) ? value.treasures : [] } : { ...defaults }; } catch { return { ...defaults }; }
}
export function savePreferences(patch: Partial<Preferences>): Preferences { const next = { ...readPreferences(), ...patch }; localStorage.setItem(KEY, JSON.stringify(next)); window.dispatchEvent(new Event("snab-preferences")); return next; }
// Saving a sale also adds an anonymous tally to the seller's stats (see lib/sale-stats.ts).
export function togglePreference(field: "savedSales" | "savedItems", id: string): Preferences {
  const current = readPreferences(); const saved = !current[field].includes(id);
  const next = savePreferences({ [field]: saved ? [...current[field], id] : current[field].filter(i=>i!==id) });
  if (field === "savedSales") recordSaleSave(id, saved);
  return next;
}
