import { NextResponse, type NextRequest } from "next/server";
import { HAMILTON, parseGeoapify, parsePhoton, type AddressSuggestion } from "../../../lib/geo";

// Address suggestions for the seller's "Where" step. Runs on the server so the provider (and its key, when set)
// can change without touching the app. Geoapify when GEOAPIFY_API_KEY is set, otherwise the keyless Photon service.
const LIMIT = 6;
const PER_MINUTE = 40;
const hits = new Map<string, { count: number; reset: number }>();

function limited(ip: string, now = Date.now()): boolean {
  if (hits.size > 5000) for (const [key, value] of hits) if (value.reset < now) hits.delete(key);
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) { hits.set(ip, { count: 1, reset: now + 60_000 }); return false; }
  return ++entry.count > PER_MINUTE;
}

async function lookup(query: string): Promise<AddressSuggestion[]> {
  const key = process.env.GEOAPIFY_API_KEY;
  const url = key
    ? `https://api.geoapify.com/v1/geocode/autocomplete?${new URLSearchParams({ text: query, filter: "countrycode:nz", bias: `proximity:${HAMILTON.lng},${HAMILTON.lat}`, limit: String(LIMIT), format: "json", apiKey: key })}`
    : `https://photon.komoot.io/api/?${new URLSearchParams({ q: query, lat: String(HAMILTON.lat), lon: String(HAMILTON.lng), limit: String(LIMIT * 2), lang: "en", bbox: "165.8,-47.6,178.8,-34" })}`;
  const response = await fetch(url, { headers: { "User-Agent": "SNAB garage sale app (Hamilton, NZ)" }, signal: AbortSignal.timeout(6000), cache: "no-store" });
  if (!response.ok) throw new Error(`Address search returned ${response.status}`);
  const json = await response.json();
  return (key ? parseGeoapify(json) : parsePhoton(json)).slice(0, LIMIT);
}

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 120);
  if (query.length < 3) return NextResponse.json({ suggestions: [] });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) return NextResponse.json({ error: "Too many searches. Wait a moment and try again." }, { status: 429 });
  try {
    return NextResponse.json({ suggestions: await lookup(query) }, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch {
    return NextResponse.json({ error: "Address search isn’t available right now. Tap the map where your sale is instead." }, { status: 502 });
  }
}
