// How to reach SNAB, for the privacy policy and terms (app/privacy, app/terms).
// Set NEXT_PUBLIC_CONTACT_EMAIL in Hostinger before building; the pages fall back to the account page until then.
export const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "";
export const legalUpdated = "5 October 2026";
