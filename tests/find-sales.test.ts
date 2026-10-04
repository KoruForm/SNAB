import { strict as assert } from "node:assert";
import { test } from "node:test";
import { findSales, readFindFilters, weekendDates } from "../lib/find-sales";
import { demoSales } from "../lib/mock/catalogue";

test("weekend uses the Auckland calendar, including Sunday and year boundaries", () => {
  assert.deepEqual(weekendDates(new Date("2026-10-03T11:30:00Z")), ["2026-10-03", "2026-10-04"]);
  assert.deepEqual(weekendDates(new Date("2026-10-04T11:30:00Z")), ["2026-10-10", "2026-10-11"]);
  assert.deepEqual(weekendDates(new Date("2026-12-31T23:00:00Z")), ["2027-01-02", "2027-01-03"]);
});

test("Find combines synonym search, category, date and event scope without excluding unknown distances", () => {
  const now = new Date("2026-10-08T23:00:00Z");
  const sales = demoSales(now);
  const garage = sales.find(sale => sale.id === "demo-garage")!;
  garage.distance = null;
  garage.days = [{ date: "2026-10-10", starts: "08:00", finishes: "13:00" }];
  const future = { ...garage, id: "future", days: [{ date: "2026-10-17", starts: "08:00", finishes: "13:00" }] };
  const unrelated = { ...garage, id: "unrelated-event", eventCode: "OTHER" };
  const filters = readFindFilters(new URLSearchParams("q=computers&category=Electronics&day=weekend&radius=3&open=1"));
  const results = findSales([...sales, future, unrelated], filters, true, now);
  assert.deepEqual(results.map(result => result.sale.id), ["demo-garage"]);
  assert.ok(results[0].reasons.includes("Old PC tower"));
  garage.items.find(item => item.id === "pc")!.available = false;
  assert.equal(findSales([garage], filters, true, now).length, 0);
});

test("invalid filters fall back to usable defaults and URL changes produce fresh state", () => {
  const params = new URLSearchParams("category=INVALID&radius=-1&day=forever&view=unknown");
  assert.deepEqual(readFindFilters(params), { query: "", day: "all", category: "", town: "", radius: "", openOnly: false, sort: "match", view: "list" });
  params.set("q", "books"); params.set("view", "map");
  assert.equal(readFindFilters(params).query, "books");
  assert.equal(readFindFilters(params).view, "map");
});
