import type { SaleType } from "./sale-details";

// Where to post a sale. Facebook no longer lets apps post into groups for people, so SNAB copies the post
// text and opens each place; the seller pastes and posts. Ticks are kept per sale in this browser.
export type Place = { id: string; name: string; url: string; why: string; types?: SaleType[] };

// Hamilton buy/sell and community Facebook groups. Add the ones that allow garage sale posts.
export const HAMILTON_GROUPS: { name: string; url: string }[] = [];

export function placesFor(type: SaleType | undefined): Place[] {
  const groups: Place[] = HAMILTON_GROUPS.length
    ? HAMILTON_GROUPS.map((g, n) => ({ id: `group-${n}`, name: g.name, url: g.url, why: "Paste the text and add your post image." }))
    : [{ id: "facebook-groups", name: "Hamilton Facebook groups", url: "https://www.facebook.com/groups/search/groups/?q=hamilton%20buy%20sell", why: "Post in your local buy and sell or community group." }];
  const all: Place[] = [
    ...groups,
    { id: "facebook", name: "Your Facebook page", url: "https://www.facebook.com/", why: "Friends and neighbours share it on." },
    { id: "neighbourly", name: "Neighbourly", url: "https://www.neighbourly.co.nz/", why: "Reaches the streets around you." },
    { id: "eventfinda", name: "Eventfinda", url: "https://www.eventfinda.co.nz/", why: "Free event listing. Best for bigger sales.", types: ["street", "fair", "market", "car-boot"] },
  ];
  return all.filter(p => !p.types || (type && p.types.includes(type)));
}

const KEY = "snab-advertised-v1";
export function readPosted(saleId: string): string[] {
  try { const all = JSON.parse(localStorage.getItem(KEY) || "{}"); return Array.isArray(all[saleId]) ? all[saleId] : []; } catch { return []; }
}
export function markPosted(saleId: string, placeId: string): string[] {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "{}"); const next = [...new Set([...(Array.isArray(all[saleId]) ? all[saleId] : []), placeId])];
    localStorage.setItem(KEY, JSON.stringify({ ...all, [saleId]: next })); return next;
  } catch { return [placeId]; }
}

// Opens the phone's share sheet with the post image and text when it can (Facebook, Messenger, WhatsApp…).
export async function shareSale(text: string, url: string, image?: Blob): Promise<"shared" | "cancelled" | "unsupported"> {
  if (typeof navigator === "undefined" || !navigator.share) return "unsupported";
  const files = image ? [new File([image], "SNAB-sale.jpg", { type: image.type || "image/jpeg" })] : [];
  const data: ShareData = files.length && navigator.canShare?.({ files }) ? { text, url, files } : { text, url };
  try { await navigator.share(data); return "shared"; } catch (e) { return e instanceof DOMException && e.name === "AbortError" ? "cancelled" : "unsupported"; }
}
