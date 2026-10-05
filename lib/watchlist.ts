import type { MockItem } from "./drafts/types";
import { matchedItems, queryTokens, type BuyerSale } from "./mock/catalogue";

// The treasure list is a watchlist: things a buyer is hunting for. A sale "has" a treasure when one of its
// available highlights matches it. Finished sales never count.
export const TREASURE_LIMIT = 30;
export type WatchHit = { treasure: string; items: MockItem[] };
export type TreasureMatches = { treasure: string; sales: { sale: BuyerSale; items: MockItem[] }[] };

// Describing words alone are too loose for a watchlist ("old computers" shouldn't flag an old radio),
// so they only count when the treasure has nothing else in it.
const DESCRIBERS = new Set(["old", "vintage", "retro", "antique", "used", "small", "big", "large", "little", "nice", "good", "cheap", "new"]);
function itemsFor(sale: BuyerSale, treasure: string): MockItem[] {
  const tokens = queryTokens(treasure); const strong = tokens.filter(t => !DESCRIBERS.has(t)); const needed = strong.length ? strong : tokens;
  if (!needed.length) return [];
  // Every word must be found in the same highlight.
  const perWord = needed.map(word => new Set(matchedItems(sale, word).map(i => i.id)));
  return sale.items.filter(i => perWord.every(ids => ids.has(i.id)));
}
export function watchHits(sale: BuyerSale, treasures: string[]): WatchHit[] {
  if (sale.state === "closed") return [];
  return treasures.map(treasure => ({ treasure, items: itemsFor(sale, treasure) })).filter(hit => hit.items.length);
}

export function treasureMatches(sales: BuyerSale[], treasures: string[]): TreasureMatches[] {
  return treasures.map(treasure => ({ treasure, sales: sales.flatMap(sale => { const hit = watchHits(sale, [treasure])[0]; return hit ? [{ sale, items: hit.items }] : []; }) }));
}

// Sales with at least one treasure on them, most hits first.
export function salesOnList(sales: BuyerSale[], treasures: string[]): BuyerSale[] {
  return sales.map(sale => ({ sale, hits: watchHits(sale, treasures).length })).filter(s => s.hits).sort((a, b) => b.hits - a.hits).map(s => s.sale);
}

// Returns the new list, or null when the name is empty or already on it.
export function addTreasure(list: string[], name: string): string[] | null {
  const clean = name.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!clean || list.some(t => t.toLowerCase() === clean.toLowerCase())) return null;
  return [...list, clean].slice(-TREASURE_LIMIT);
}

// Labels of the highlights that put a sale on the list, without repeats.
export function hitLabels(hits: WatchHit[]): string[] {
  return [...new Set(hits.flatMap(hit => hit.items.map(i => i.label)))];
}
