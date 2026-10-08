import { NextResponse, type NextRequest } from "next/server";
import { ScanError, scanReady, scanSalePhoto, sellerClient } from "../../../lib/ai/scan";

// Live photo scan for the Sell flow. Signed-in sellers only, one of their own photos per call (see lib/ai/scan.ts).
export async function GET() {
  return NextResponse.json({ ready: scanReady() });
}

export async function POST(request: NextRequest) {
  if (!scanReady()) return NextResponse.json({ error: "Photo scanning isn’t switched on yet." }, { status: 503 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const body = await request.json().catch(() => null) as { photoId?: unknown } | null;
  const photoId = typeof body?.photoId === "string" && /^[0-9a-f-]{36}$/i.test(body.photoId) ? body.photoId : "";
  if (!token) return NextResponse.json({ error: "Sign in to scan photos." }, { status: 401 });
  if (!photoId) return NextResponse.json({ error: "Choose a photo to scan." }, { status: 400 });
  try {
    const { supabase, userId } = await sellerClient(token);
    return NextResponse.json(await scanSalePhoto(supabase, userId, photoId));
  } catch (error) {
    if (error instanceof ScanError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Photo scan failed", error);
    return NextResponse.json({ error: "The scan didn’t work this time. Try again, or add your highlights yourself." }, { status: 502 });
  }
}
