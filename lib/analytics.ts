// Visitor stats through Umami Cloud (cookieless, so no cookie banner). Set NEXT_PUBLIC_UMAMI_WEBSITE_ID in Hostinger
// before building to switch it on; leave it blank and nothing is loaded or sent.
export const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim() || "";
export const umamiScript = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL?.trim() || "https://cloud.umami.is/script.js";

// Tags added to the address in sign and poster QR codes, so scans show up under Umami's UTM report.
export const signQrTags = "utm_source=sign&utm_medium=qr";
// Query keys kept when the coming soon page redirects a visitor home, so a scan before launch still counts.
export const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

type Umami = { track: (event: string, data?: Record<string, string | number>) => void };

// Records a named event (shows under Events in Umami). Does nothing when Umami isn't loaded or is blocked.
export function trackEvent(event: string, data?: Record<string, string | number>) {
  if (typeof window === "undefined") return;
  try { (window as unknown as { umami?: Umami }).umami?.track(event, data); } catch { /* stats never break the page */ }
}
