import { NextResponse, type NextRequest } from "next/server";
import { previewCookie, previewKey } from "../../../lib/launch";
import { SCAN_SUPPLIERS, scanPhoto, scanSupplierReady, type ScanSupplier } from "../../../lib/ai/scan-test";

// Field test of AI photo scanning (see /scan-test). Each call spends real API credit, so it only answers browsers
// that have opened the private preview link; to everyone else it doesn't exist.
const MAX_BYTES = 6 * 1024 * 1024;
// The preview link goes to seeded sellers too, so the test page gets a daily ceiling of its own.
const DAILY_CALLS = Number(process.env.SCAN_TEST_DAILY_CALLS) || 200;
const calls = { day: "", count: 0 };
function overDailyCalls(now = new Date()): boolean {
  const day = now.toISOString().slice(0, 10);
  if (calls.day !== day) { calls.day = day; calls.count = 0; }
  return ++calls.count > DAILY_CALLS;
}

function allowed(request: NextRequest): boolean {
  const key = previewKey();
  return Boolean(key && request.cookies.get(previewCookie)?.value === key);
}

export async function GET(request: NextRequest) {
  if (!allowed(request)) return new NextResponse(null, { status: 404 });
  return NextResponse.json({ ready: Object.fromEntries(SCAN_SUPPLIERS.map(s => [s, scanSupplierReady(s)])) });
}

export async function POST(request: NextRequest) {
  if (!allowed(request)) return new NextResponse(null, { status: 404 });
  const form = await request.formData().catch(() => null);
  const supplier = form?.get("supplier");
  const photo = form?.get("photo");
  if (!SCAN_SUPPLIERS.includes(supplier as ScanSupplier)) return NextResponse.json({ error: "Unknown AI" }, { status: 400 });
  if (!(photo instanceof Blob) || photo.size === 0 || photo.size > MAX_BYTES) return NextResponse.json({ error: "Send one JPEG photo under 6 MB" }, { status: 400 });
  if (overDailyCalls()) return NextResponse.json({ error: "That's enough scans for today. Try again tomorrow." }, { status: 429 });
  try {
    const base64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
    return NextResponse.json(await scanPhoto(supplier as ScanSupplier, base64));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scan failed" }, { status: 502 });
  }
}
