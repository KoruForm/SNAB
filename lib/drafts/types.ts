import type { SaleDetails } from "../sale-details";
export const CATEGORIES = ["Furniture", "Tools", "Books", "Electronics", "Clothing", "Kitchen", "Garden", "Toys", "Free", "Other"] as const;
export type Category = typeof CATEGORIES[number];
export type AddressReveal = "sale-day" | "now" | "area-only";
export type SaleDay = { date: string; starts: string; finishes: string };
export type MockItem = { id: string; label: string; category: Category; description: string; price?: string; estimate?: string; available: boolean; confirmed: boolean };
export type Draft = {
  id: string;
  title: string;
  description: string;
  days: SaleDay[];
  // latitude/longitude: the exact spot, private like the street; buyers only get it through the server's reveal rule.
  location: { address: string; town: string; reveal: AddressReveal; latitude?: number; longitude?: number };
  categories: Category[];
  highlights: string[];
  status: "draft" | "published" | "closed";
  items?: MockItem[];
  demoScan?: boolean;
  // The ready-made demo sale. It only ever lives on the device and never moves to an account.
  readyMade?: boolean;
  eventCode?: string;
  dayMode?: "auto" | "open" | "closed";
  abundance?: "lots" | "some-gone";
  // Taken off the buyer side after reports, until it's checked (migration 006). Only the server sets it.
  hidden?: boolean;
  // Sale type, buyer questions, rain-date move and leftovers (lib/sale-details.ts, migration 013).
  details?: SaleDetails;
  // The partner (agent, mover, local business) whose link the seller came from.
  partner?: string;
  createdAt: string;
  updatedAt: string;
};
// Local photos carry their blob; account photos carry a short-lived signed URL instead.
export type DraftPhoto = { id: string; draftId: string; name: string; type: string; blob?: Blob; url?: string; createdAt: string };
export type DraftPatch = Partial<Pick<Draft, "title" | "description" | "days" | "location" | "categories" | "highlights" | "status" | "items" | "demoScan" | "readyMade" | "eventCode" | "dayMode" | "abundance" | "details" | "partner">>;

export function blankDraft(id: string, now = new Date().toISOString()): Draft {
  return { id, title: "", description: "", days: [{ date: "", starts: "08:00", finishes: "13:00" }], location: { address: "", town: "", reveal: "sale-day" }, categories: [], highlights: [], status: "draft", createdAt: now, updatedAt: now };
}

export function localDateKey(date: Date, timezone = "Pacific/Auckland"): string {
  const parts = new Intl.DateTimeFormat("en-NZ", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)?.value).join("-");
}

// A sale runs for up to a week of days, starting within the next six months. The database holds the same
// limits (supabase/migrations/010_listing_limits.sql), so a listing can't sit on the map for years.
export const MAX_SALE_DAYS = 7;
export const MAX_DAYS_AHEAD = 183;

export function validateDays(days: SaleDay[], today = localDateKey(new Date())): string | null {
  if (!days.length) return "Add at least one sale day.";
  if (days.length > MAX_SALE_DAYS) return `Keep your sale to ${MAX_SALE_DAYS} days or fewer.`;
  const latest = new Date(`${today}T12:00:00Z`);
  latest.setUTCDate(latest.getUTCDate() + MAX_DAYS_AHEAD);
  const latestKey = latest.toISOString().slice(0, 10);
  const seen = new Set<string>();
  for (const day of days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date)) return "Choose a date for each sale day.";
    const date = new Date(`${day.date}T12:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== day.date) return "Choose a valid date.";
    if (day.date < today) return "Choose today or a future date.";
    if (day.date > latestKey) return "Choose a date in the next six months.";
    if (seen.has(day.date)) return "Each sale day needs a different date.";
    seen.add(day.date);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(day.starts) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(day.finishes)) return "Set a start and finish time for each day.";
    if (day.finishes <= day.starts) return "The finish time must be after the start time.";
  }
  return null;
}

// Longest sale title a seller can type: three lines on the A4 sign at the design size.
export const TITLE_MAX = 60;

export function formatDay(day: SaleDay): string {
  if (!day.date) return "Date to be confirmed";
  const date = new Date(`${day.date}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-NZ", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(date);
}

// Mirrors private.address_visible in supabase/migrations/002_public_sale_privacy.sql, which enforces this rule on the server.
// Unpublished drafts are previewed as if published; closed sales and finished sales never show the street.
export function addressVisible(draft: Pick<Draft, "status" | "days" | "location">, now = new Date()): boolean {
  if (draft.status === "closed") return false;
  const today = localDateKey(now);
  if (draft.location.reveal === "now") return draft.days.some(day => day.date >= today);
  if (draft.location.reveal === "sale-day") return draft.days.some(day => day.date === today);
  return false;
}

export function publicAddress(draft: Draft, now = new Date()): string {
  if (addressVisible(draft, now)) return draft.location.address || draft.location.town;
  if (draft.location.reveal === "area-only") return draft.location.town || "Area to be confirmed";
  const today = localDateKey(now);
  return draft.status !== "closed" && draft.days.some(day => day.date > today) ? `${draft.location.town || "Local area"} · address revealed on sale day` : draft.location.town || "Area to be confirmed";
}

export function draftProgress(draft: Draft, photoCount: number): number {
  return [!validateDays(draft.days), Boolean(draft.location.town && draft.location.address), photoCount > 0, draft.categories.length > 0 || draft.highlights.length > 0, Boolean(draft.title.trim())].filter(Boolean).length;
}
