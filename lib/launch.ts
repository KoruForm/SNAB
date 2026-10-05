// Pre-launch switch. When on, the home page (/) shows the coming soon teaser and the rest of the app is hidden:
// every other page sends visitors back to the teaser (see proxy.ts) unless they've opened the private preview link.
// The app's own landing page lives at /welcome while this is on.
// Flip the default here, or set NEXT_PUBLIC_COMING_SOON=on/off in Hostinger before building.
const COMING_SOON_DEFAULT = true;

const setting = process.env.NEXT_PUBLIC_COMING_SOON?.trim().toLowerCase();
export const comingSoonHome = setting ? setting === "on" || setting === "1" || setting === "true" : COMING_SOON_DEFAULT;

// Where the SNAB logo links to inside the app: the app landing page, wherever it currently lives.
export const appHome = comingSoonHome ? "/welcome" : "/";

// Private preview for seeded sellers and testers while the app is hidden: opening /?preview=<key> unlocks the app
// in that browser, and /?preview=off locks it again. The key comes from SNAB_PREVIEW_KEY (set in Hostinger, never in
// the code, since this repository is public). Without it the preview link is switched off.
export const previewCookie = "snab_preview";
export function previewKey(): string | null {
  const key = process.env.SNAB_PREVIEW_KEY?.trim();
  return key && key.length >= 8 ? key : null;
}
