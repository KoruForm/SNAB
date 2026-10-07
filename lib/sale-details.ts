import { formatDay, localDateKey, type Category, type SaleDay } from "./drafts/types";

// The extras a seller can add to a sale: what kind of sale it is, the answers to the questions buyers always
// message about, a rain-date move and free leftovers. Saved as one small object (sales.details, migration 013).
export const SALE_TYPES = [
  { value: "garage", label: "Garage sale" },
  { value: "moving", label: "Moving sale" },
  { value: "street", label: "Street sale" },
  { value: "car-boot", label: "Car boot sale" },
  { value: "fair", label: "School or church fair" },
  { value: "market", label: "Market" },
] as const;
export type SaleType = typeof SALE_TYPES[number]["value"];
export const PAYMENTS = [
  { value: "cash", label: "Cash" },
  { value: "bank-transfer", label: "Bank transfer" },
  { value: "eftpos", label: "EFTPOS or card" },
] as const;
export type Payment = typeof PAYMENTS[number]["value"];
export type EarlyBirds = "welcome" | "no";
export const NOTE_MAX = 200;

export type SaleDetails = {
  saleType?: SaleType;
  payment?: Payment[];
  earlyBirds?: EarlyBirds;
  note?: string;
  // Dates the sale was moved away from, most recent last, so buyers who saved it see the change.
  movedFrom?: string[];
  // After the sale: what's left is free to collect until this time on the last sale day.
  leftoversUntil?: string;
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
// Anything that came from storage or the server is checked before use; unknown values are dropped.
export function cleanDetails(value: unknown): SaleDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const v = value as Record<string, unknown>;
  const out: SaleDetails = {};
  if (SALE_TYPES.some(t => t.value === v.saleType)) out.saleType = v.saleType as SaleType;
  if (Array.isArray(v.payment)) { const payment = PAYMENTS.map(p => p.value).filter(p => (v.payment as unknown[]).includes(p)); if (payment.length) out.payment = payment; }
  if (v.earlyBirds === "welcome" || v.earlyBirds === "no") out.earlyBirds = v.earlyBirds;
  if (typeof v.note === "string" && v.note.trim()) out.note = v.note.trim().slice(0, NOTE_MAX);
  if (Array.isArray(v.movedFrom)) { const moved = v.movedFrom.filter((d): d is string => typeof d === "string" && DATE.test(d)).slice(-7); if (moved.length) out.movedFrom = moved; }
  if (typeof v.leftoversUntil === "string" && TIME.test(v.leftoversUntil)) out.leftoversUntil = v.leftoversUntil;
  return out;
}

export function saleTypeLabel(type?: SaleType): string { return SALE_TYPES.find(t => t.value === type)?.label ?? "Garage sale"; }
export function paymentText(payment?: Payment[]): string {
  const labels = (payment ?? []).map(p => PAYMENTS.find(x => x.value === p)!.label);
  return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} or ${labels.at(-1)}` : labels[0] ?? "";
}

// "08:00" → "8am", "13:30" → "1:30pm".
export function clock(time: string): string { const [h, m] = time.split(":").map(Number); const hour = h % 12 || 12; return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`; }

function nowTime(now: Date): string { return new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now); }

// Free leftovers only run on the sale's last day, from now until the seller's chosen time.
export function leftoversOn(details: SaleDetails | undefined, days: SaleDay[], now = new Date()): boolean {
  if (!details?.leftoversUntil) return false;
  const last = days.map(d => d.date).sort().at(-1);
  return last === localDateKey(now) && nowTime(now) < details.leftoversUntil;
}

// The answers buyers usually have to message about, as short lines for the sale page.
export function goodToKnow(details: SaleDetails | undefined): { label: string; text: string }[] {
  if (!details) return [];
  const lines: { label: string; text: string }[] = [];
  if (details.payment?.length) lines.push({ label: "Paying", text: paymentText(details.payment) });
  if (details.earlyBirds) lines.push({ label: "Early birds", text: details.earlyBirds === "welcome" ? "Welcome. Come before the start time if you like." : "Please don’t arrive before the start time." });
  if (details.note) lines.push({ label: "From the seller", text: details.note });
  return lines;
}

// "Moved from Sat 11 Oct", for sales that changed date (usually the weather).
export function movedText(details: SaleDetails | undefined, days: SaleDay[]): string {
  const from = details?.movedFrom?.at(-1);
  if (!from) return "";
  const next = [...days].sort((a, b) => a.date.localeCompare(b.date))[0];
  return `New date: moved from ${formatDay({ date: from, starts: "", finishes: "" })}${next ? ` to ${formatDay(next)}` : ""}.`;
}

// Moves one sale day to a new date, keeping its times, and remembers where it came from.
export function moveSaleDay(days: SaleDay[], details: SaleDetails | undefined, from: string, to: string): { days: SaleDay[]; details: SaleDetails } {
  if (!DATE.test(to)) throw new Error("Choose the new date.");
  if (from === to) throw new Error("Choose a different date.");
  if (days.some(d => d.date === to)) throw new Error("Your sale already runs on that day.");
  if (!days.some(d => d.date === from)) throw new Error("That sale day couldn’t be found.");
  const moved = days.map(d => d.date === from ? { ...d, date: to } : d).sort((a, b) => a.date.localeCompare(b.date));
  return { days: moved, details: { ...details, movedFrom: [...(details?.movedFrom ?? []), from].slice(-7) } };
}

// Rough garage-sale prices from what second-hand goods usually go for. A starting point, not a valuation.
export const PRICE_GUIDE: Record<Category, string> = {
  Furniture: "$10–80. Big solid pieces at the top end.",
  Tools: "$5–40. Power tools that work: $20–60.",
  Books: "$1–3 each, or fill a bag for $5.",
  Electronics: "$5–50. Say whether it’s been tested.",
  Clothing: "$1–5 each. Good coats and boots: $10–20.",
  Kitchen: "$1–10. Sets and small appliances: $10–25.",
  Garden: "$2–15. Pots and plants: $2–10.",
  Toys: "$1–10. Board games and Lego: $5–20.",
  Free: "Free. Put it near the footpath.",
  Other: "Price to sell. Most things go for under $10.",
};

// Coloured dot stickers: each colour is one price, so you only label the table once.
export const STICKER_PRICES = [
  { price: "$1", colour: "#F4C430", name: "Yellow" },
  { price: "$2", colour: "#4E9A6B", name: "Green" },
  { price: "$5", colour: "#3E7CB1", name: "Blue" },
  { price: "$10", colour: "#D9822B", name: "Orange" },
  { price: "$20", colour: "#A8432E", name: "Red" },
  { price: "Free", colour: "#FFFFFF", name: "White" },
] as const;
