import type { SupabaseClient } from "@supabase/supabase-js";
import { PHOTO_BUCKET } from "../drafts/remote";
import type { Category, DraftPhoto, MockItem, SaleDay } from "../drafts/types";
import { cleanDetails } from "../sale-details";
import { toBuyerSale, type BuyerSale } from "../mock/catalogue";

// Published sales from every seller, read through public.browse_sales() (supabase/migrations/004).
// The server decides whether the street is shown; this side never sees a hidden address.
export type BrowseRow = {
  id: string; title: string; description: string; status: "published" | "closed"; categories: string[]; highlights: string[];
  days: SaleDay[]; town: string; address: string | null; latitude: number | null; longitude: number | null; exact_location: boolean;
  items: MockItem[] | null; event_code: string | null; day_mode: "auto" | "open" | "closed" | null; abundance: "lots" | "some-gone" | null;
  photos: { id: string; path: string; name: string; type: string }[];
  details?: unknown; partner?: { code: string; name: string; website: string } | null;
};
const SIGNED_URL_SECONDS = 60 * 60;

export function rowToBuyerSale(row: BrowseRow, photos: DraftPhoto[], now = new Date()): BuyerSale {
  const visible = row.exact_location && Boolean(row.address);
  const base = toBuyerSale({
    id: row.id, title: row.title, description: row.description, status: row.status, categories: row.categories as Category[], highlights: row.highlights,
    days: row.days, location: { address: row.address ?? "", town: row.town, reveal: visible ? "now" : "area-only" },
    items: row.items ?? undefined, eventCode: row.event_code ?? undefined, dayMode: row.day_mode ?? undefined, abundance: row.abundance ?? undefined, details: cleanDetails(row.details),
    createdAt: "", updatedAt: "",
  }, photos, now);
  // The server sends the exact spot only with the street; otherwise the centre of the sale's area.
  const point = typeof row.latitude === "number" && typeof row.longitude === "number" ? { lat: row.latitude, lng: row.longitude } : null;
  return { ...base, ...(row.partner?.name ? { partner: row.partner } : {}), point, exactPoint: Boolean(point) && visible, own: false, distance: null, exactAddressVisible: visible,
    addressLabel: visible ? row.address! : `${row.town || "Local area"} · street address not shown yet` };
}

export async function fetchListedSales(supabase: SupabaseClient): Promise<BuyerSale[]> {
  const { data, error } = await supabase.rpc("browse_sales");
  if (error) throw new Error("Couldn’t load sales near you. Check your connection and try again.");
  const rows = (data ?? []) as BrowseRow[];
  const paths = rows.flatMap(r => r.photos.map(p => p.path));
  const urls = new Map<string, string>();
  if (paths.length) {
    // Photos are a nice-to-have here: a failed link leaves the illustrated cover in place.
    const signed = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
    for (const s of signed.data ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  return rows.map(row => rowToBuyerSale(row, row.photos.filter(p => urls.has(p.path)).map(p => ({ id: p.id, draftId: row.id, name: p.name, type: p.type, url: urls.get(p.path), createdAt: "" }))));
}
