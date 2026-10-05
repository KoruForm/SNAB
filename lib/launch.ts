// Pre-launch switch. When on, the home page (/) shows the coming soon page instead of the app's landing page.
// The app's own landing page moves to /welcome, and every other route (/map, /sell, /account...) keeps working.
// Flip the default here, or set NEXT_PUBLIC_COMING_SOON=on/off in Hostinger before building.
const COMING_SOON_DEFAULT = true;

const setting = process.env.NEXT_PUBLIC_COMING_SOON?.trim().toLowerCase();
export const comingSoonHome = setting ? setting === "on" || setting === "1" || setting === "true" : COMING_SOON_DEFAULT;

// Where the SNAB logo links to inside the app: the app landing page, wherever it currently lives.
export const appHome = comingSoonHome ? "/welcome" : "/";
