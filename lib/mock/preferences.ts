export type Preferences = { savedSales: string[]; savedItems: string[]; treasures: string[]; name: string; demoSignedIn: boolean; treasureAlerts: boolean; treasuresSyncedFor: string; reports: { saleId: string; reason: string }[] };
const KEY = "snab-ux-preferences-v1";
const defaults: Preferences = { savedSales: [], savedItems: [], treasures: [], name: "", demoSignedIn: false, treasureAlerts: false, treasuresSyncedFor: "", reports: [] };
export const defaultPreferences: Preferences = defaults;
export function readPreferences(): Preferences {
  try { const value = JSON.parse(localStorage.getItem(KEY) || "null"); return value && typeof value === "object" ? { ...defaults, ...value, savedSales: Array.isArray(value.savedSales) ? value.savedSales : [], savedItems: Array.isArray(value.savedItems) ? value.savedItems : [], treasures: Array.isArray(value.treasures) ? value.treasures : [], reports: Array.isArray(value.reports) ? value.reports : [] } : { ...defaults }; } catch { return { ...defaults }; }
}
export function savePreferences(patch: Partial<Preferences>): Preferences { const next = { ...readPreferences(), ...patch }; localStorage.setItem(KEY, JSON.stringify(next)); window.dispatchEvent(new Event("snab-preferences")); return next; }
export function togglePreference(field: "savedSales" | "savedItems", id: string): Preferences { const current = readPreferences(); return savePreferences({ [field]: current[field].includes(id) ? current[field].filter(i=>i!==id) : [...current[field],id] }); }
