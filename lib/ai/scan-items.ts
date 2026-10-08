// Turns photo scan answers into highlights for the seller to check. Shared by the Sell flow and its tests.
import { CATEGORIES, type Category, type MockItem } from "../drafts/types";
import type { ScanItem } from "./scan-test-types";

// The review step allows 15 highlights in all, so the scan suggests no more than that.
export const MAX_SUGGESTIONS = 15;
export type PhotoScan = { scanId: string; items: ScanItem[] };

const rank = { high: 0, medium: 1, low: 2 } as const;
const key = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Keeps what the seller already has, then adds the best new suggestions: highlights first, then the surest.
// Items with the same name across photos are suggested once.
export function mergeScanItems(existing: MockItem[], scans: PhotoScan[], max = MAX_SUGGESTIONS): MockItem[] {
  const seen = new Set(existing.map(i => key(i.label)));
  const candidates = scans.flatMap(scan => scan.items.map((item, index) => ({ scan, item, index })))
    .filter(c => c.item.label?.trim())
    .sort((a, b) => Number(b.item.highlight) - Number(a.item.highlight) || (rank[a.item.confidence] ?? 2) - (rank[b.item.confidence] ?? 2));
  const added: MockItem[] = [];
  for (const { scan, item, index } of candidates) {
    if (existing.length + added.length >= max) break;
    const label = item.label.trim().slice(0, 80);
    if (seen.has(key(label))) continue;
    seen.add(key(label));
    const category: Category = (CATEGORIES as readonly string[]).includes(item.category) ? item.category as Category : "Other";
    added.push({ id: `ai-${scan.scanId.slice(0, 8)}-${index}`, label, category, description: (item.description || label).slice(0, 300), available: true, confirmed: false, ai: { scan: scan.scanId, label, category } });
  }
  return [...existing, ...added];
}
