import { distanceKm, roundKm, type Point } from "./geo";
import type { BuyerSale } from "./mock/catalogue";

// "Plan my morning": the sales on one day put in a sensible driving order. Earliest opening time first;
// among sales that open at the same time, the nearest to the last stop goes next.
export type Stop = { sale: BuyerSale; starts: string; finishes: string; legKm: number | null };

export function salesOn(sales: BuyerSale[], date: string): BuyerSale[] {
  return sales.filter(s => s.days.some(d => d.date === date));
}

export function planRoute(sales: BuyerSale[], date: string, origin: Point | null): Stop[] {
  const left = salesOn(sales, date).map(sale => ({ sale, day: sale.days.find(d => d.date === date)! }));
  const stops: Stop[] = []; let here = origin;
  while (left.length) {
    const earliest = left.reduce((min, s) => s.day.starts < min ? s.day.starts : min, "99:99");
    const ready = left.filter(s => s.day.starts === earliest);
    const near = (s: typeof ready[number]) => here && s.sale.point ? distanceKm(here, s.sale.point) : Infinity;
    const next = ready.reduce((best, s) => near(s) < near(best) ? s : best, ready[0]);
    stops.push({ sale: next.sale, starts: next.day.starts, finishes: next.day.finishes, legKm: here && next.sale.point ? roundKm(distanceKm(here, next.sale.point)) : null });
    if (next.sale.point) here = next.sale.point;
    left.splice(left.indexOf(next), 1);
  }
  return stops;
}

// Google Maps directions through the stops, in order. A sale still keeping its street private is routed to
// the middle of its area. Google takes up to 9 stops between the start and the end.
export function routeUrl(stops: Stop[], origin: Point | null): string | null {
  const points = stops.filter(s => s.sale.point).map(s => `${s.sale.point!.lat},${s.sale.point!.lng}`).slice(0, 10);
  if (!points.length) return null;
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  if (origin) url.searchParams.set("origin", `${origin.lat},${origin.lng}`);
  url.searchParams.set("destination", points.at(-1)!);
  if (points.length > 1) url.searchParams.set("waypoints", points.slice(0, -1).join("|"));
  url.searchParams.set("travelmode", "driving");
  return url.toString();
}
