import { strict as assert } from "node:assert";
import { test } from "node:test";
import { localDateKey } from "../lib/drafts/types";
import { HAMILTON } from "../lib/geo";
import { byDistance, demoSales, withDistances } from "../lib/mock/catalogue";
import { rowToBuyerSale, type BrowseRow } from "../lib/public/browse";

const now = new Date("2026-10-08T22:00:00Z"); // Friday 9 Oct, 11am in Auckland
const row: BrowseRow = { id: "3f1c2a90-0000-4000-8000-000000000001", title: "Shed clearout", description: "Tools and books", status: "published", categories: ["Tools"], highlights: ["Drill"],
  days: [{ date: "2026-10-10", starts: "08:00", finishes: "13:00" }], town: "Hamilton East", address: null, latitude: -37.785, longitude: 175.295, exact_location: false,
  items: [{ id: "drill", label: "Drill", category: "Tools", description: "Cordless drill", available: true, confirmed: true }], event_code: null, day_mode: "auto", abundance: "lots", photos: [] };

test("a listed sale keeps the server's hidden address and is not anyone's own", () => {
  const sale = rowToBuyerSale(row, [], now);
  assert.equal(sale.exactAddressVisible, false);
  assert.match(sale.addressLabel, /^Hamilton East · street address not shown yet$/);
  assert.equal(sale.own, false); assert.equal(sale.sample, false); assert.equal(sale.distance, null);
  assert.equal(sale.state, "upcoming");
  assert.equal(sale.items[0].label, "Drill");
  assert.deepEqual(sale.point, { lat: -37.785, lng: 175.295 }); assert.equal(sale.exactPoint, false);
  assert.equal(localDateKey(now), "2026-10-09");
});

test("a listed sale shows the street only when the server sent it", () => {
  const sale = rowToBuyerSale({ ...row, address: "1 Real Street", exact_location: true, days: [{ date: "2026-10-09", starts: "08:00", finishes: "13:00" }] }, [], now);
  assert.equal(sale.exactAddressVisible, true); assert.equal(sale.addressLabel, "1 Real Street"); assert.equal(sale.state, "open");
  assert.equal(sale.exactPoint, true);
});

test("sales with no known distance sort after the rest", () => {
  const [sample] = demoSales(now);
  const listed = rowToBuyerSale({ ...row, latitude: null, longitude: null }, [], now);
  const [placed, unplaced] = withDistances([sample, listed], HAMILTON);
  assert.equal(unplaced.distance, null); assert.ok(placed.distance !== null && placed.distance < 5);
  assert.deepEqual([unplaced, placed].sort(byDistance).map(s => s.id), [sample.id, listed.id]);
  assert.ok(withDistances([sample], null).every(s => s.distance === null), "no distances until the buyer shares a location");
});
