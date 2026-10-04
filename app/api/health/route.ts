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
      database: "not-configured",
      photoStorage: "local-indexeddb-drafts",
    },
  });
}
