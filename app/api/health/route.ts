import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    app: "SNAB",
    version: "0.4.0",
    assetPack: "v0.4-smoothed",
    status: "ok",
    mode: "interactive-ux-demo",
    catalogue: "sample-sales-plus-local-published-drafts",
    integrations: {
      ai: "not-configured",
      database: process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "not-configured",
      photoStorage: process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase-private-bucket" : "local-indexeddb-drafts",
    },
  });
}
