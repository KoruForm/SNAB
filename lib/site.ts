// SNAB's public address. Links that leave the app (share text, QR codes, printed signs, link previews) use it,
// so a seller who opened SNAB on an old or preview address still hands out snab.nz links.
// NEXT_PUBLIC_SITE_URL overrides it at build time.
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://snab.nz").replace(/\/+$/, "");

// The address for links people will share. On a local copy of the app (localhost) the links stay local, so testing works.
export function shareOrigin(): string {
  if (typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) return window.location.origin;
  return siteUrl;
}
