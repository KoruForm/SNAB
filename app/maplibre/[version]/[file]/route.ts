import { readFile } from "node:fs/promises";
import path from "node:path";

// MapLibre's map worker, served from the installed package. The bundler can't follow the worker's own URL,
// so components/sale-map.tsx points MapLibre here. The version in the path keeps cached copies in step.
const FILES = new Set(["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]);

export async function GET(_request: Request, { params }: { params: Promise<{ version: string; file: string }> }) {
  const { file } = await params;
  if (!FILES.has(file)) return new Response("Not found", { status: 404 });
  const body = await readFile(path.join(process.cwd(), "node_modules", "maplibre-gl", "dist", file));
  return new Response(body, { headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "public, max-age=31536000, immutable" } });
}
