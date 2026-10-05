import { strict as assert } from "node:assert";
import { test } from "node:test";
import { demoSales } from "../lib/mock/catalogue";
import { addTreasure, hitLabels, salesOnList, treasureMatches, watchHits } from "../lib/watchlist";

const now = new Date("2026-10-08T23:00:00Z");

test("a sale is on the list when one of its available highlights matches a treasure", () => {
  const sales = demoSales(now);
  const garage = sales.find(sale => sale.id === "demo-garage")!;
  const hits = watchHits(garage, ["Old computers", "Hand tools", "Garden tools", "   "]);
  assert.deepEqual(hits.map(hit => hit.treasure), ["Old computers", "Hand tools"]);
  assert.ok(hitLabels(hits).includes("Old PC tower"));
  garage.items.forEach(item => { item.available = false; });
  assert.deepEqual(watchHits(garage, ["Old computers"]), []);
});

test("finished sales never count, and the busiest sales come first", () => {
  const sales = demoSales(now);
  const books = sales.find(sale => sale.id === "demo-books")!;
  assert.equal(books.state, "closed");
  assert.deepEqual(watchHits(books, ["Vintage books"]), []);
  const onList = salesOnList(sales, ["Old computers", "Woodworking"]);
  assert.equal(onList[0].id, "demo-garage");
  assert.ok(!onList.some(sale => sale.id === "demo-books"));
  const matches = treasureMatches(sales, ["Old computers", "Unicorn saddle"]);
  assert.deepEqual(matches.map(m => m.sales.length), [1, 0]);
});

test("adding treasures trims, skips repeats and keeps the newest thirty", () => {
  assert.deepEqual(addTreasure([], "  record   player "), ["record player"]);
  assert.equal(addTreasure(["Record player"], "record PLAYER"), null);
  assert.equal(addTreasure([], "   "), null);
  const full = Array.from({ length: 30 }, (_, n) => `thing ${n}`);
  const next = addTreasure(full, "one more")!;
  assert.equal(next.length, 30);
  assert.equal(next.at(-1), "one more");
});

test("describing words don't flag unrelated things, but every other word must match the same highlight", () => {
  const sales = demoSales(now);
  const moving = sales.find(sale => sale.id === "demo-moving")!;
  assert.deepEqual(watchHits(moving, ["Old computers"]), []);
  assert.deepEqual(watchHits(moving, ["Old radio"]).map(hit => hit.items.map(i => i.id)), [["radio"]]);
  assert.deepEqual(watchHits(moving, ["Garden table"]), []);
  assert.equal(watchHits(moving, ["vintage"]).length, 1);
});
