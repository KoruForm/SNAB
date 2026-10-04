import "fake-indexeddb/auto";
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { blankDraft, localDateKey } from "../lib/drafts/types";
import { getDraft, updateDraft } from "../lib/drafts/storage";
import { createDemoDraft, publicationError, publishDemo } from "../lib/mock/actions";
import { createSaleSign } from "../lib/mock/sign";
import { demoSales, matchedItems, rankSales, toBuyerSale } from "../lib/mock/catalogue";

test("demo publication requires a title, sale dates and a location", () => {
  const draft = blankDraft("invalid");
  assert.match(publicationError(draft)!, /title/);
  draft.title = "My sale"; assert.match(publicationError(draft)!, /date/);
  draft.days[0].date = localDateKey(new Date()); assert.match(publicationError(draft)!, /address/);
  draft.location = { address: "Example street", town: "Hamilton", reveal: "area-only" };
  assert.equal(publicationError(draft), null);
});

test("a seller can publish, close, reopen and mark a highlight gone with persistent buyer state", async () => {
  const draft = await createDemoDraft("HAMILTON");
  assert.equal(draft.status, "draft");
  await publishDemo(draft.id, "  My clearout  ", "  Come have a rummage  ");
  let stored = (await getDraft(draft.id))!;
  assert.equal(stored.title, "My clearout"); assert.equal(stored.status, "published");
  assert.equal(toBuyerSale(stored, []).eventCode, "HAMILTON");
  stored = await updateDraft(draft.id, { status: "closed", dayMode: "closed" });
  assert.equal(toBuyerSale(stored, []).state, "closed");
  stored = await updateDraft(draft.id, { status: "published", dayMode: "open", items: stored.items!.map(i => ({ ...i, available: i.id !== "mock-drill" })) });
  const buyer = toBuyerSale((await getDraft(draft.id))!, []);
  assert.equal(buyer.state, "open"); assert.equal(matchedItems(buyer, "drill").length, 0);
  assert.equal(buyer.items.find(i => i.id === "mock-drill")!.available, false);
});

test("buyer projection excludes the street before the sale and for area-only listings", () => {
  const draft = blankDraft("private"); draft.location = { address: "123 Hidden Street", town: "Hamilton", reveal: "sale-day" };
  draft.days = [{ date: "2026-10-10", starts: "08:00", finishes: "13:00" }];
  let sale = toBuyerSale(draft, [], new Date("2026-10-08T23:00:00Z"));
  assert.equal(sale.exactAddressVisible, false); assert.ok(!JSON.stringify(sale).includes("123 Hidden"));
  sale = toBuyerSale(draft, [], new Date("2026-10-09T23:00:00Z"));
  assert.equal(sale.exactAddressVisible, true); assert.equal(sale.addressLabel, "123 Hidden Street");
  draft.location.reveal = "area-only";
  sale = toBuyerSale(draft, [], new Date("2026-10-09T23:00:00Z"));
  assert.equal(sale.exactAddressVisible, false); assert.ok(!JSON.stringify(sale).includes("123 Hidden"));
});

test("hunts rank synonym coverage and explain results with available items", () => {
  const sales = demoSales(new Date("2026-10-03T23:00:00Z"));
  const results = rankSales(sales, "old computers and retro stuff");
  assert.equal(results[0].sale.id, "demo-garage"); assert.equal(results[0].band, "Great match");
  assert.ok(results[0].reasons.includes("Old PC tower"));
  assert.ok(!results.some(m => m.sale.id === "demo-neighbours"), "old must not match household");
  assert.equal(rankSales(sales, "unfindablexyz").length, 0);
  const workshop = sales.find(s=>s.id === "demo-workshop")!;
  assert.ok(matchedItems(workshop, "woodworking").length > 0);
  const garage = sales.find(s=>s.id === "demo-garage")!;
  garage.items.find(i=>i.id === "pc")!.available = false;
  assert.ok(!rankSales(sales, "computer").some(m=>m.reasons.includes("Old PC tower")));
});

test("expired local sales are closed while future sale days remain upcoming", () => {
  const draft = blankDraft("time"); draft.status = "published";
  draft.days = [{date:"2026-10-04",starts:"08:00",finishes:"13:00"}];
  assert.equal(toBuyerSale(draft,[],new Date("2026-10-04T03:00:00Z")).state,"closed");
  draft.days.push({date:"2026-10-05",starts:"08:00",finishes:"13:00"});
  assert.equal(toBuyerSale(draft,[],new Date("2026-10-04T03:00:00Z")).state,"upcoming");
});

test("sale sign exports an A4 PDF using only the buyer-visible address", async () => {
  const draft = blankDraft("sign"); draft.title = "My clearout";
  draft.location = {address:"PRIVATE STREET",town:"Hamilton",reveal:"area-only"};
  draft.days = [{date:"2026-10-10",starts:"08:00",finishes:"13:00"}];
  const bytes = await createSaleSign(toBuyerSale(draft,[]), "https://example.com/sale/sign");
  const pdf = Buffer.from(bytes).toString("latin1");
  assert.ok(pdf.startsWith("%PDF-")); const box = pdf.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/)!; assert.ok(box); assert.ok(Math.abs(Number(box[1])-595.28)<.01); assert.ok(Math.abs(Number(box[2])-841.89)<.01);
  assert.ok(pdf.includes("My clearout")); assert.ok(pdf.includes("Hamilton")); assert.ok(!pdf.includes("PRIVATE STREET"));
});

test("the ready-made demo sale is marked so it never moves to an account", async () => {
  const draft = await createDemoDraft();
  assert.equal(draft.readyMade, true);
  assert.equal((await getDraft(draft.id))?.readyMade, true);
});
