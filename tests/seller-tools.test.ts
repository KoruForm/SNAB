import { strict as assert } from "node:assert";
import { test } from "node:test";
import { demandMet } from "../lib/demand";
import { patchToSaleRow, rowToDraft, type SaleRow } from "../lib/drafts/remote";
import type { BuyerSale } from "../lib/mock/catalogue";
import { demoSales } from "../lib/mock/catalogue";
import { planRoute, routeUrl } from "../lib/plan-route";
import { rowToBuyerSale, type BrowseRow } from "../lib/public/browse";
import { cleanDetails, goodToKnow, leftoversOn, moveSaleDay, movedText, paymentText } from "../lib/sale-details";
import { plannedDates } from "../lib/snab-saturdays";

const now = new Date("2026-10-08T22:00:00Z"); // Friday 9 Oct, 11am in Auckland

test("sale details keep known values only", () => {
  assert.deepEqual(cleanDetails({ saleType: "car-boot", payment: ["eftpos", "cash", "bitcoin"], earlyBirds: "maybe", note: "  Park on the street  ", movedFrom: ["2026-10-10", "soon"], leftoversUntil: "25:00", extra: 1 }),
    { saleType: "car-boot", payment: ["cash", "eftpos"], note: "Park on the street", movedFrom: ["2026-10-10"] });
  assert.deepEqual(cleanDetails(null), {}); assert.deepEqual(cleanDetails(["x"]), {});
  assert.equal(cleanDetails({ note: "x".repeat(500) }).note!.length, 200);
  assert.equal(paymentText(["cash", "bank-transfer", "eftpos"]), "Cash, Bank transfer or EFTPOS or card");
  assert.deepEqual(goodToKnow({ payment: ["cash"], earlyBirds: "no" }).map(l => l.label), ["Paying", "Early birds"]);
});

test("moving a sale day keeps its times and remembers the old date", () => {
  const days = [{ date: "2026-10-10", starts: "07:30", finishes: "12:00" }, { date: "2026-10-11", starts: "08:00", finishes: "13:00" }];
  const moved = moveSaleDay(days, { saleType: "garage" }, "2026-10-10", "2026-10-17");
  assert.deepEqual(moved.days, [{ date: "2026-10-11", starts: "08:00", finishes: "13:00" }, { date: "2026-10-17", starts: "07:30", finishes: "12:00" }]);
  assert.deepEqual(moved.details, { saleType: "garage", movedFrom: ["2026-10-10"] });
  assert.throws(() => moveSaleDay(days, {}, "2026-10-10", "2026-10-11"), /already runs/);
  assert.throws(() => moveSaleDay(days, {}, "2026-10-10", ""), /new date/);
  assert.match(movedText(moved.details, moved.days), /^New date: moved from Sat,? 10 Oct to Sun,? 11 Oct\.$/);
});

test("free leftovers show only on the last sale day, until the chosen time", () => {
  const days = [{ date: "2026-10-09", starts: "08:00", finishes: "10:00" }];
  assert.equal(leftoversOn({ leftoversUntil: "18:00" }, days, now), true);
  assert.equal(leftoversOn({ leftoversUntil: "10:30" }, days, now), false);
  assert.equal(leftoversOn({ leftoversUntil: "18:00" }, [{ ...days[0], date: "2026-10-10" }], now), false);
  assert.equal(leftoversOn({}, days, now), false);
});

const base = demoSales(now)[0];
function sale(id: string, date: string, starts: string, point: { lat: number; lng: number } | null, town = "Hillcrest"): BuyerSale {
  return { ...base, id, sample: false, own: false, town, point, days: [{ date, starts, finishes: "13:00" }] };
}

test("planned dates count other sellers' sales, not samples, your own or past days", () => {
  const sales = [sale("a", "2026-10-10", "08:00", null), sale("b", "2026-10-10", "08:00", null, "Claudelands"), sale("c", "2026-10-17", "08:00", null),
    sale("d", "2026-10-08", "08:00", null), { ...sale("e", "2026-10-24", "08:00", null), sample: true }, { ...sale("f", "2026-10-24", "08:00", null), own: true }];
  assert.deepEqual(plannedDates(sales, now), [{ date: "2026-10-10", sales: 2, towns: ["Claudelands", "Hillcrest"] }, { date: "2026-10-17", sales: 1, towns: ["Hillcrest"] }]);
});

test("the morning route goes earliest first, then nearest", () => {
  const home = { lat: -37.78, lng: 175.28 };
  const sales = [sale("far7", "2026-10-10", "07:00", { lat: -37.80, lng: 175.32 }), sale("near7", "2026-10-10", "07:00", { lat: -37.781, lng: 175.281 }),
    sale("eight", "2026-10-10", "08:00", { lat: -37.79, lng: 175.29 }), sale("other-day", "2026-10-11", "06:00", null)];
  const stops = planRoute(sales, "2026-10-10", home);
  assert.deepEqual(stops.map(s => s.sale.id), ["near7", "far7", "eight"]);
  assert.equal(typeof stops[0].legKm, "number");
  const url = new URL(routeUrl(stops, home)!);
  assert.equal(url.searchParams.get("destination"), "-37.79,175.29");
  assert.equal(url.searchParams.get("waypoints"), "-37.781,175.281|-37.8,175.32");
  assert.equal(routeUrl([], null), null);
});

test("demand a seller meets uses the treasure list matching", () => {
  const items = [{ id: "d", label: "Cordless drill", category: "Tools", description: "", available: false }];
  assert.deepEqual(demandMet(items, [{ treasure: "kayak", lists: 5 }, { treasure: "drill", lists: 2 }, { treasure: "old drill", lists: 3 }]).map(d => d.treasure), ["old drill", "drill"]);
});

test("details and partner travel to the account and back, and on to buyers", () => {
  assert.deepEqual(patchToSaleRow({ details: { saleType: "moving", leftoversUntil: "nope" } as never, partner: "acme" }), { details: { saleType: "moving" }, partner_code: "acme" });
  const row = { id: "x", title: "", description: "", status: "published", categories: [], highlights: [], items: [], demo_scan: false, event_code: null, day_mode: null, abundance: null,
    details: { earlyBirds: "welcome" }, partner_code: "acme", created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z", sale_days: [], sale_private_locations: null } as SaleRow;
  const draft = rowToDraft(row);
  assert.deepEqual(draft.details, { earlyBirds: "welcome" }); assert.equal(draft.partner, "acme");
  const browse: BrowseRow = { id: "3f1c2a90-0000-4000-8000-000000000001", title: "Shed", description: "", status: "published", categories: [], highlights: [], days: [{ date: "2026-10-10", starts: "08:00", finishes: "13:00" }],
    town: "Hillcrest", address: null, latitude: null, longitude: null, exact_location: false, items: [], event_code: null, day_mode: null, abundance: null, photos: [],
    details: { saleType: "fair" }, partner: { code: "acme", name: "Acme Realty", website: "" } };
  const buyer = rowToBuyerSale(browse, [], now);
  assert.equal(buyer.details?.saleType, "fair"); assert.equal(buyer.partner?.name, "Acme Realty");
  assert.equal(rowToBuyerSale({ ...browse, partner: null }, [], now).partner, undefined);
});
