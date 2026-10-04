import { CATEGORIES, localDateKey } from "./drafts/types";
import { byDistance, rankSales, type BuyerSale } from "./mock/catalogue";

export function readFindFilters(params: Pick<URLSearchParams, "get">) {
  return {
    query: (params.get("q") || "").slice(0, 150),
    day: ["today", "weekend"].includes(params.get("day") || "") ? params.get("day")! : "all",
    category: CATEGORIES.find(category => category === params.get("category")) || "",
    town: params.get("town") || "",
    radius: ["3", "5", "10"].includes(params.get("radius") || "") ? params.get("radius")! : "",
    openOnly: params.get("open") === "1",
    sort: params.get("sort") === "distance" ? "distance" : "match",
    view: params.get("view") === "map" ? "map" : "list",
  };
}

export function weekendDates(now = new Date()) {
  const today = localDateKey(now);
  const date = new Date(`${today}T12:00:00Z`);
  const weekday = date.getUTCDay();
  // Sunday still belongs to this weekend, including its preceding Saturday.
  date.setUTCDate(date.getUTCDate() + (weekday === 0 ? -1 : 6 - weekday));
  const saturday = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() + 1);
  return [saturday, date.toISOString().slice(0, 10)];
}

export function findSales(sales: BuyerSale[], filters: ReturnType<typeof readFindFilters>, event = false, now = new Date()) {
  const dates = filters.day === "today" ? [localDateKey(now)] : weekendDates(now);
  const filtered = sales.filter(sale =>
    (!event || sale.eventCode === "HAMILTON") &&
    (!filters.category || sale.categories.some(category => category === filters.category)) &&
    (!filters.town || sale.town === filters.town) &&
    (!filters.radius || sale.distance === null || sale.distance <= Number(filters.radius)) &&
    (!filters.openOnly || sale.state === "open") &&
    (filters.day === "all" || sale.days.some(day => dates.includes(day.date)))
  );
  const results = rankSales(filtered, filters.query);
  return filters.sort === "distance" ? results.toSorted((a, b) => byDistance(a.sale, b.sale)) : results;
}
