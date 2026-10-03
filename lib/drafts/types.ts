export const CATEGORIES = ["Furniture", "Tools", "Books", "Electronics", "Clothing", "Kitchen", "Garden", "Toys", "Free", "Other"] as const;
export type Category = typeof CATEGORIES[number];
export type AddressReveal = "sale-day" | "now" | "area-only";
export type SaleDay = { date: string; starts: string; finishes: string };
export type Draft = {
  id: string;
  title: string;
  description: string;
  days: SaleDay[];
  location: { address: string; town: string; reveal: AddressReveal };
  categories: Category[];
  highlights: string[];
  status: "draft";
  createdAt: string;
  updatedAt: string;
};
export type DraftPhoto = { id: string; draftId: string; name: string; type: string; blob: Blob; createdAt: string };

export function blankDraft(id: string, now = new Date().toISOString()): Draft {
  return { id, title: "", description: "", days: [{ date: "", starts: "08:00", finishes: "13:00" }], location: { address: "", town: "", reveal: "sale-day" }, categories: [], highlights: [], status: "draft", createdAt: now, updatedAt: now };
}

export function localDateKey(date: Date, timezone = "Pacific/Auckland"): string {
  const parts = new Intl.DateTimeFormat("en-NZ", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)?.value).join("-");
}

export function validateDays(days: SaleDay[], today = localDateKey(new Date())): string | null {
  if (!days.length) return "Add at least one sale day.";
  const seen = new Set<string>();
  for (const day of days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date)) return "Choose a date for each sale day.";
    const date = new Date(`${day.date}T12:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== day.date) return "Choose a valid date.";
    if (day.date < today) return "Choose today or a future date.";
    if (seen.has(day.date)) return "Each sale day needs a different date.";
    seen.add(day.date);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(day.starts) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(day.finishes)) return "Set a start and finish time for each day.";
    if (day.finishes <= day.starts) return "The finish time must be after the start time.";
  }
  return null;
}

export function formatDay(day: SaleDay): string {
  if (!day.date) return "Date to be confirmed";
  const date = new Date(`${day.date}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-NZ", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(date);
}

export function publicAddress(draft: Draft, now = new Date()): string {
  if (draft.location.reveal === "area-only") return draft.location.town || "Area to be confirmed";
  if (draft.location.reveal === "now") return draft.location.address || draft.location.town;
  const today = localDateKey(now);
  return draft.days.some(day => day.date === today) ? draft.location.address || draft.location.town : `${draft.location.town || "Local area"} · address revealed on sale day`;
}

export function draftProgress(draft: Draft, photoCount: number): number {
  return [!validateDays(draft.days), Boolean(draft.location.town && draft.location.address), photoCount > 0, draft.categories.length > 0 || draft.highlights.length > 0, Boolean(draft.title.trim())].filter(Boolean).length;
}
