// Word matching for search and the treasure list. No imports, so the treasure alert email function
// (supabase/functions/treasure-alerts) runs this exact file; tests/treasure-alerts.test.ts keeps the copy in step.
export type MatchItem = { id: string; label: string; category: string; description: string; available: boolean };

export const aliases: Record<string, string[]> = { computer: ["pc", "computer", "desktop"], computers: ["pc", "computer", "desktop"], woodworking: ["woodworking", "saw", "clamp", "timber", "tools"], workshop: ["workshop", "tools", "drill", "saw"], kids: ["children", "toys", "games"], retro: ["retro", "vintage", "old"], vintage: ["vintage", "old", "retro"], gardening: ["garden", "plants", "pots"], clothes: ["clothes", "clothing", "jackets", "shirts"], free: ["free"] };
const stopwords = new Set(["and", "or", "the", "a", "an", "for", "stuff", "things", "looking", "some", "near", "me", "of", "with", "i", "my", "to", "love", "like", "find", "want", "sale", "please"]);
export function queryTokens(query: string): string[] { return query.toLowerCase().split(/[^a-z0-9]+/).filter(token => token && !stopwords.has(token)); }
export function containsTerm(corpus: string, term: string): boolean { return new RegExp(`\\b${term}(?:s|es|ing)?\\b`, "i").test(corpus); }
export function itemsMatching<T extends MatchItem>(items: T[], query: string): T[] {
  const tokens = queryTokens(query);
  return items.filter(i => i.available && (!tokens.length || tokens.some(t => (aliases[t] || [t]).some(word => containsTerm(`${i.label} ${i.category} ${i.description}`, word)))));
}

// Describing words alone are too loose for a watchlist ("old computers" shouldn't flag an old radio),
// so they only count when the treasure has nothing else in it.
const DESCRIBERS = new Set(["old", "vintage", "retro", "antique", "used", "small", "big", "large", "little", "nice", "good", "cheap", "new"]);
// The highlights that have a treasure: every word must be found in the same highlight.
export function treasureItems<T extends MatchItem>(items: T[], treasure: string): T[] {
  const tokens = queryTokens(treasure); const strong = tokens.filter(t => !DESCRIBERS.has(t)); const needed = strong.length ? strong : tokens;
  if (!needed.length) return [];
  const perWord = needed.map(word => new Set(itemsMatching(items, word).map(i => i.id)));
  return items.filter(i => perWord.every(ids => ids.has(i.id)));
}
