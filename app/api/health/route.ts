import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    app: "SNAB",
    version: "0.3.0",
    assetPack: "v0.4-smoothed",
    status: "ok",
    integrations: {
      ai: "not-configured",
      database: "not-configured",
      photoStorage: "local-indexeddb-drafts",
    },
  });
}
