// Map points, distances and address-search results. Shared by the server route and the app.
export type Point = { lat: number; lng: number };
export type AddressSuggestion = { label: string; address: string; town: string; lat: number; lng: number };

export const HAMILTON: Point = { lat: -37.787, lng: 175.279 };
// A hidden sale is shown somewhere in its 0.01° grid cell (002_public_sale_privacy.sql). The cell's corners are
// at most about 710 m from its centre in Waikato, so this circle always contains the real spot.
export const AREA_RADIUS_M = 750;

export function inNz(point: Point): boolean {
  return point.lat >= -47.6 && point.lat <= -34 && point.lng >= 165.8 && point.lng <= 178.8;
}

// Mirrors the generated area_latitude/area_longitude columns in 002_public_sale_privacy.sql.
export function areaPoint(point: Point): Point {
  return { lat: (Math.floor(point.lat * 100) + 0.5) / 100, lng: (Math.floor(point.lng * 100) + 0.5) / 100 };
}

export function distanceKm(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

// One decimal under 10 km, whole kilometres beyond.
export function roundKm(km: number): number { return km < 10 ? Math.round(km * 10) / 10 : Math.round(km); }

function suggestion(address: string, town: string, city: string | undefined, lat: unknown, lng: unknown): AddressSuggestion | null {
  if (typeof lat !== "number" || typeof lng !== "number" || !address || !inNz({ lat, lng })) return null;
  const place = town || city || "";
  return { label: [address, place, city && city !== place ? city : ""].filter(Boolean).join(", "), address, town: place, lat, lng };
}
function dedupe(list: (AddressSuggestion | null)[]): AddressSuggestion[] {
  const seen = new Set<string>();
  return list.filter((s): s is AddressSuggestion => Boolean(s) && !seen.has(s!.label) && Boolean(seen.add(s!.label)));
}

type PhotonFeature = { geometry?: { coordinates?: [number, number] }; properties?: Record<string, string | undefined> };
// Photon (photon.komoot.io): OpenStreetMap search, which carries the LINZ address list for New Zealand.
export function parsePhoton(json: unknown): AddressSuggestion[] {
  const features = (json as { features?: PhotonFeature[] })?.features ?? [];
  return dedupe(features.map(f => {
    const p = f.properties ?? {};
    if (p.countrycode && p.countrycode.toUpperCase() !== "NZ") return null;
    const street = p.street || (p.type === "street" ? p.name : undefined);
    const address = p.housenumber && street ? `${p.housenumber} ${street}` : street || "";
    const [lng, lat] = f.geometry?.coordinates ?? [];
    return suggestion(address, p.district || p.locality || "", p.city, lat, lng);
  }));
}

type GeoapifyResult = { housenumber?: string; street?: string; suburb?: string; district?: string; city?: string; country_code?: string; lat?: number; lon?: number };
// Geoapify autocomplete with format=json.
export function parseGeoapify(json: unknown): AddressSuggestion[] {
  const results = (json as { results?: GeoapifyResult[] })?.results ?? [];
  return dedupe(results.map(r => {
    if (r.country_code && r.country_code !== "nz") return null;
    const address = r.housenumber && r.street ? `${r.housenumber} ${r.street}` : r.street || "";
    return suggestion(address, r.suburb || r.district || "", r.city, r.lat, r.lon);
  }));
}
