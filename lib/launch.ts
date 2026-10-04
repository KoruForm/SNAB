// Pre-launch switch. When on, the home page (/) shows the coming soon page instead of the app's landing page.
// Every other route (/map, /sell, /account...) keeps working so the app can still be tested.
// Flip the default here, or set NEXT_PUBLIC_COMING_SOON=on/off in Hostinger before building.
const COMING_SOON_DEFAULT = false;

const setting = process.env.NEXT_PUBLIC_COMING_SOON?.trim().toLowerCase();
export const comingSoonHome = setting ? setting === "on" || setting === "1" || setting === "true" : COMING_SOON_DEFAULT;
