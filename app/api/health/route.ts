import { NextResponse } from "next/server";
import { comingSoonHome, previewKey } from "../../../lib/launch";

// A quick check that the site is up and which switches this build has on. Names only, never values.
export function GET() {
  const supabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return NextResponse.json({
    app: "SNAB",
    version: "0.4.0",
    status: "ok",
    mode: comingSoonHome ? "coming-soon" : "open",
    catalogue: supabase ? "live-sales" : "device-demo",
    integrations: {
      ai: "not-configured",
      accounts: supabase ? "supabase" : "not-configured",
      photoStorage: supabase ? "supabase-private-bucket" : "local-indexeddb-drafts",
      addressSearch: process.env.GEOAPIFY_API_KEY ? "geoapify" : "photon",
      analytics: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ? "umami" : "off",
      previewLink: previewKey() ? "on" : "off",
    },
  });
}
