import { localDateKey } from "./drafts/types";
import type { BuyerSale } from "./mock/catalogue";

// "SNAB Saturdays": the dates other sellers have already picked. Sales on the same day and in the same
// suburbs pull more buyers out, so the When step suggests joining them.
export type PlannedDate = { date: string; sales: number; towns: string[] };

export function plannedDates(sales: BuyerSale[], now = new Date(), limit = 4): PlannedDate[] {
  const today = localDateKey(now); const byDate = new Map<string, { ids: Set<string>; towns: Set<string> }>();
  for (const sale of sales) {
    if (sale.sample || sale.own) continue;
    for (const day of sale.days) {
      if (day.date <= today) continue;
      const entry = byDate.get(day.date) ?? { ids: new Set(), towns: new Set() };
      entry.ids.add(sale.id); if (sale.town) entry.towns.add(sale.town); byDate.set(day.date, entry);
    }
  }
  return [...byDate].map(([date, e]) => ({ date, sales: e.ids.size, towns: [...e.towns].sort() }))
    .sort((a, b) => b.sales - a.sales || a.date.localeCompare(b.date)).slice(0, limit).sort((a, b) => a.date.localeCompare(b.date));
}
