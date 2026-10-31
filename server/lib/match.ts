/**
 * Resolve what the shop owner typed ("rice", "mama ngozi") to one record.
 * Ambiguity is reported, never guessed: posting a sale against the wrong
 * product or customer is worse than asking.
 */

export interface Named {
  id: string;
  name: string;
}

export type MatchResult<T extends Named> =
  | { kind: "match"; item: T }
  | { kind: "ambiguous"; candidates: T[] }
  | { kind: "none"; suggestions: T[] };

export function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

function tokens(value: string): string[] {
  return normalizeName(value).split(" ").filter(Boolean);
}

function overlapScore(query: string[], candidate: string[]): number {
  let score = 0;
  for (const word of query) {
    if (candidate.includes(word)) score += 2;
    else if (candidate.some((c) => c.startsWith(word) || word.startsWith(c))) score += 1;
  }
  return score;
}

export function matchByName<T extends Named>(items: readonly T[], ref: string): MatchResult<T> {
  const byId = items.find((item) => item.id === ref);
  if (byId) return { kind: "match", item: byId };

  const wanted = normalizeName(ref);
  if (!wanted) return { kind: "none", suggestions: [] };

  const exact = items.filter((item) => normalizeName(item.name) === wanted);
  const [onlyExact] = exact;
  if (exact.length === 1 && onlyExact) return { kind: "match", item: onlyExact };
  if (exact.length > 1) return { kind: "ambiguous", candidates: exact };

  const contains = items.filter((item) => {
    const name = normalizeName(item.name);
    return name.includes(wanted) || wanted.includes(name);
  });
  const [onlyContains] = contains;
  if (contains.length === 1 && onlyContains) return { kind: "match", item: onlyContains };
  if (contains.length > 1) return { kind: "ambiguous", candidates: contains.slice(0, 5) };

  const queryTokens = tokens(ref);
  const scored = items
    .map((item) => ({ item, score: overlapScore(queryTokens, tokens(item.name)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return { kind: "none", suggestions: scored.slice(0, 3).map((entry) => entry.item) };
}
