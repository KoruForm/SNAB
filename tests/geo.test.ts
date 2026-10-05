import { strict as assert } from "node:assert";
import { test } from "node:test";
import { blankDraft } from "../lib/drafts/types";
import { AREA_RADIUS_M, areaPoint, distanceKm, HAMILTON, parseGeoapify, parsePhoton, roundKm } from "../lib/geo";
import { toBuyerSale } from "../lib/mock/catalogue";

test("the area point matches the server's grid and the area circle always holds the real spot", () => {
  // Same numbers as supabase/tests/address_privacy.sql.
  assert.deepEqual(areaPoint({ lat: -37.78123, lng: 175.29871 }), { lat: -37.785, lng: 175.295 });
  for (const lat of [-37.7801, -37.7899]) for (const lng of [175.2901, 175.2999]) {
    const real = { lat, lng };
    assert.ok(distanceKm(real, areaPoint(real)) * 1000 < AREA_RADIUS_M, `${lat},${lng}`);
  }
});

test("distances are great-circle kilometres, rounded for people", () => {
  assert.ok(Math.abs(distanceKm({ lat: -37, lng: 175 }, { lat: -38, lng: 175 }) - 111.19) < 0.05);
  assert.equal(distanceKm(HAMILTON, HAMILTON), 0);
  assert.equal(roundKm(1.74), 1.7); assert.equal(roundKm(12.6), 13);
});

test("a seller's own preview places the pin by the same reveal rule buyers get", () => {
  const now = new Date("2026-10-08T22:00:00Z"); // Friday 9 Oct in Auckland
  const draft = blankDraft("own"); draft.status = "published";
  draft.days = [{ date: "2026-10-10", starts: "08:00", finishes: "13:00" }];
  draft.location = { address: "1 Secret Street", town: "Hamilton East", reveal: "sale-day", latitude: -37.78123, longitude: 175.29871 };
  const before = toBuyerSale(draft, [], now);
  assert.deepEqual(before.point, { lat: -37.785, lng: 175.295 }); assert.equal(before.exactPoint, false);
  const onTheDay = toBuyerSale(draft, [], new Date("2026-10-09T20:00:00Z"));
  assert.deepEqual(onTheDay.point, { lat: -37.78123, lng: 175.29871 }); assert.equal(onTheDay.exactPoint, true);
  draft.location = { address: "1 Secret Street", town: "Hamilton East", reveal: "now" };
  assert.equal(toBuyerSale(draft, [], now).point, null, "no pin yet means no map spot");
});

test("Photon results become NZ street suggestions with the suburb as the town", () => {
  const json = { features: [
    { geometry: { coordinates: [175.2968, -37.7952] }, properties: { countrycode: "NZ", housenumber: "12", street: "Grey Street", district: "Hamilton East", city: "Hamilton", type: "house" } },
    { geometry: { coordinates: [175.2968, -37.7952] }, properties: { countrycode: "NZ", housenumber: "12", street: "Grey Street", district: "Hamilton East", city: "Hamilton", type: "house" } },
    { geometry: { coordinates: [175.28, -37.79] }, properties: { countrycode: "NZ", name: "Victoria Street", city: "Hamilton", type: "street" } },
    { geometry: { coordinates: [151.2, -33.8] }, properties: { countrycode: "AU", housenumber: "1", street: "George Street", city: "Sydney" } },
    { geometry: { coordinates: [175.3, -37.8] }, properties: { countrycode: "NZ", name: "Hamilton", type: "city" } },
  ] };
  assert.deepEqual(parsePhoton(json), [
    { label: "12 Grey Street, Hamilton East, Hamilton", address: "12 Grey Street", town: "Hamilton East", lat: -37.7952, lng: 175.2968 },
    { label: "Victoria Street, Hamilton", address: "Victoria Street", town: "Hamilton", lat: -37.79, lng: 175.28 },
  ]);
  assert.deepEqual(parsePhoton(null), []);
});

test("Geoapify results map the same way", () => {
  const json = { results: [{ housenumber: "24", street: "Massey Street", suburb: "Frankton", city: "Hamilton", country_code: "nz", lat: -37.7966, lon: 175.2612 }, { street: "Somewhere", country_code: "au", lat: -33, lon: 151 }] };
  assert.deepEqual(parseGeoapify(json), [{ label: "24 Massey Street, Frankton, Hamilton", address: "24 Massey Street", town: "Frankton", lat: -37.7966, lng: 175.2612 }]);
});
