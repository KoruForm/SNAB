// Visitor stats through Umami Cloud (cookieless, so no cookie banner). Set NEXT_PUBLIC_UMAMI_WEBSITE_ID in Hostinger
// before building to switch it on; leave it blank and nothing is loaded or sent.
export const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim() || "";
export const umamiScript = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL?.trim() || "https://cloud.umami.is/script.js";

// Tags added to the address in sign and poster QR codes, so scans show up under Umami's UTM report.
export const signQrTags = "utm_source=sign&utm_medium=qr";
// Query keys kept when the coming soon page redirects a visitor home, so a scan before launch still counts.
export const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

// The campaign a visitor arrived on (e.g. "drop-hillcrest" from a letterbox flyer QR), cleaned for saving
// alongside their email so each drop's sign-ups can be counted. Empty when there's none.
export function arrivalCampaign(search: string): string {
  const raw = new URLSearchParams(search).get("utm_campaign") || "";
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
}

type Umami = { track: (event: string, data?: Record<string, string | number>) => void };

// Records a named event (shows under Events in Umami). Does nothing when Umami isn't loaded or is blocked.
export function trackEvent(event: string, data?: Record<string, string | number>) {
  if (typeof window === "undefined") return;
  try { (window as unknown as { umami?: Umami }).umami?.track(event, data); } catch { /* stats never break the page */ }
}
