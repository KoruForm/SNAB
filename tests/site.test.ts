import { strict as assert } from "node:assert";
import { test } from "node:test";
import { shareOrigin, siteUrl } from "../lib/site";

test("shared links use snab.nz, whatever address the seller opened SNAB on", () => {
  assert.equal(siteUrl, "https://snab.nz");
  const g = globalThis as unknown as { window?: { location: { hostname: string; origin: string } } };
  g.window = { location: { hostname: "olivedrab-rabbit-869283.hostingersite.com", origin: "https://olivedrab-rabbit-869283.hostingersite.com" } };
  assert.equal(shareOrigin(), "https://snab.nz");
  g.window = { location: { hostname: "localhost", origin: "http://localhost:3000" } };
  assert.equal(shareOrigin(), "http://localhost:3000", "a local copy keeps local links");
  delete g.window;
});
