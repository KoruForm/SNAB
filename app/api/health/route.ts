import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    app: "SNAB",
    status: "ok",
    integrations: {
      ai: "not-configured",
      database: "not-configured",
      photoStorage: "local-preview-only",
    },
  });
}
