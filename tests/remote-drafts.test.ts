import { strict as assert } from "node:assert";
import { test } from "node:test";
import { daysToRows, patchToSaleRow, photoPath, rowToDraft, type SaleRow } from "../lib/drafts/remote";

const row: SaleRow = { id: "sale-1", title: "Shed clearout", description: "Tools", status: "published", categories: ["Tools"], highlights: ["Drill"], items: [], demo_scan: false, event_code: "HAMILTON", day_mode: null, abundance: "lots", created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-02T00:00:00Z",
  sale_days: [{ sale_date: "2026-10-11", starts: "09:00:00", finishes: "12:30:00" }, { sale_date: "2026-10-10", starts: "08:00:00", finishes: "13:00:00" }],
  sale_private_locations: { address: "1 Private Road", town: "Hamilton", reveal: "area-only" } };

test("account sale rows map to the draft shape the app uses", () => {
  const draft = rowToDraft(row);
  assert.deepEqual(draft.days, [{ date: "2026-10-10", starts: "08:00", finishes: "13:00" }, { date: "2026-10-11", starts: "09:00", finishes: "12:30" }]);
  assert.deepEqual(draft.location, { address: "1 Private Road", town: "Hamilton", reveal: "area-only" });
  assert.equal(draft.eventCode, "HAMILTON"); assert.equal(draft.abundance, "lots");
  assert.equal(draft.dayMode, undefined); assert.equal(draft.items, undefined); assert.equal(draft.demoScan, undefined);
  assert.equal(draft.updatedAt, "2026-10-02T00:00:00Z");
});

test("a new account draft keeps the wizard's blank starter day and location", () => {
  const draft = rowToDraft({ ...row, sale_days: [], sale_private_locations: null });
  assert.deepEqual(draft.days, [{ date: "", starts: "08:00", finishes: "13:00" }]);
  assert.deepEqual(draft.location, { address: "", town: "", reveal: "sale-day" });
});

test("patches only write the sale columns they name, and undated days are not stored", () => {
  assert.deepEqual(patchToSaleRow({ title: "New", eventCode: undefined, demoScan: true }), { title: "New", event_code: null, demo_scan: true });
  assert.deepEqual(patchToSaleRow({ days: [], location: { address: "x", town: "y", reveal: "now" } }), {});
  assert.deepEqual(daysToRows([{ date: "", starts: "08:00", finishes: "13:00" }, { date: "2026-10-10", starts: "08:00", finishes: "13:00" }]), [{ sale_date: "2026-10-10", starts: "08:00", finishes: "13:00" }]);
});

test("photo files live under the owner's and sale's folders", () => {
  assert.equal(photoPath("user", "sale", "photo", { name: "IMG_1.JPG", type: "image/jpeg" }), "user/sale/photo.jpg");
  assert.equal(photoPath("user", "sale", "photo", { name: "camera", type: "image/heic" }), "user/sale/photo.heic");
  assert.equal(photoPath("user", "sale", "photo", { name: "../../x", type: "image/png" }), "user/sale/photo.png");
});
