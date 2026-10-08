import { strict as assert } from "node:assert";
import { test } from "node:test";
import { mergeScanItems } from "../lib/ai/scan-items";
import type { ScanItem } from "../lib/ai/scan-test-types";
import type { MockItem } from "../lib/drafts/types";

const box = { x_min: 0, y_min: 0, x_max: 10, y_max: 10 };
const item = (label: string, extra: Partial<ScanItem> = {}): ScanItem => ({ label, category: "Tools", description: `${label} in good nick`, search_terms: [], highlight: false, confidence: "medium", box, ...extra });

test("scan suggestions put highlights and sure items first, once each, unconfirmed and traceable", () => {
  const items = mergeScanItems([], [
    { scanId: "aaaaaaaa-1", items: [item("Box of books", { category: "Books", confidence: "low" }), item("Makita drill", { highlight: true })] },
    { scanId: "bbbbbbbb-2", items: [item("makita  DRILL"), item("Chilly bin", { category: "Camping", confidence: "high" })] },
  ]);
  assert.deepEqual(items.map(i => i.label), ["Makita drill", "Chilly bin", "Box of books"]);
  assert.equal(items[1].category, "Other");
  assert.ok(items.every(i => !i.confirmed && i.available));
  assert.deepEqual(items[0].ai, { scan: "aaaaaaaa-1", label: "Makita drill", category: "Tools" });
  assert.equal(items[0].id, "ai-aaaaaaaa-1");
});

test("scan suggestions keep the seller's own highlights and stop at the review limit", () => {
  const own: MockItem = { id: "manual-0", label: "Kayak", category: "Other", description: "Kayak", available: true, confirmed: true };
  const many = Array.from({ length: 30 }, (_, n) => item(`Thing ${n}`));
  const items = mergeScanItems([own], [{ scanId: "cccccccc-3", items: [item("kayak"), ...many] }]);
  assert.equal(items.length, 15);
  assert.equal(items[0], own);
  assert.equal(items.filter(i => i.label.toLowerCase() === "kayak").length, 1);
});
