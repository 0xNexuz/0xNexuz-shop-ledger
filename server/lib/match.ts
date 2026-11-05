/**
 * Resolve what the shop owner typed ("rice", "mama ngozi") to one record.
 * Ambiguity is reported, never guessed: posting a sale against the wrong
 * product or customer is worse than asking.
 */

export interface Named {
  id: string;
  name: string;
  /** Other names the owner uses for this record ("Mama N", "one bag"). */
  aliases?: readonly string[];
}

export type MatchResult<T extends Named> =
  | { kind: "match"; item: T }
  | { kind: "ambiguous"; candidates: T[] }
  | { kind: "none"; suggestions: T[] };

export interface MatchOptions {
  /**
   * Whether a longer name may resolve to a shorter record ("rice 50kg bag" →
   * "Rice"). Right for products; wrong for people, where "Ada Obi" is not
   * the same customer as "Ada". Defaults to true.
   */
  longerQuery?: boolean;
}

export function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

function tokens(value: string): string[] {
  return normalizeName(value).split(" ").filter(Boolean);
}

/** `part` appears inside `whole` as whole words ("ngozi" in "mama ngozi", but not "ada" in "adaeze"). */
function containsWords(whole: string, part: string): boolean {
  return ` ${whole} `.includes(` ${part} `);
}

/** Edit distance, capped: returns `max + 1` as soon as the names are further apart than `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, (previous[j - 1] ?? 0) + cost);
      current.push(value);
      best = Math.min(best, value);
    }
    if (best > max) return max + 1;
    previous = current;
  }
  return previous[b.length] ?? max + 1;
}

/** A typo apart: one letter for short names, two for longer ones. */
function typoClose(a: string, b: string): boolean {
  if (a === b) return false;
  const max = Math.min(a.length, b.length) <= 5 ? 1 : 2;
  return editDistance(a, b, max) <= max;
}

function namesOf(item: Named): string[] {
  return [item.name, ...(item.aliases ?? [])].map(normalizeName).filter(Boolean);
}

/**
 * Records that look like `ref` without matching it: a typo away ("Mama Ngozzi"
 * vs "Mama Ngozi"), or a shorter name inside a longer one ("Ada Obi" vs "Ada").
 * Used to ask before creating a customer who may already exist.
 */
export function lookalikes<T extends Named>(items: readonly T[], ref: string): T[] {
  const wanted = normalizeName(ref);
  if (!wanted) return [];
  return items
    .filter((item) =>
      namesOf(item).some((name) => containsWords(wanted, name) || containsWords(name, wanted) || typoClose(wanted, name)),
    )
    .slice(0, 5);
}

function overlapScore(query: string[], candidate: string[]): number {
  let score = 0;
  for (const word of query) {
    if (candidate.includes(word)) score += 2;
    else if (candidate.some((c) => c.startsWith(word) || word.startsWith(c))) score += 1;
  }
  return score;
}

export function matchByName<T extends Named>(items: readonly T[], ref: string, options: MatchOptions = {}): MatchResult<T> {
  const longerQuery = options.longerQuery ?? true;
  const byId = items.find((item) => item.id === ref);
  if (byId) return { kind: "match", item: byId };

  const wanted = normalizeName(ref);
  if (!wanted) return { kind: "none", suggestions: [] };

  const exact = items.filter((item) => normalizeName(item.name) === wanted);
  const [onlyExact] = exact;
  if (exact.length === 1 && onlyExact) return { kind: "match", item: onlyExact };
  if (exact.length > 1) return { kind: "ambiguous", candidates: exact };

  // A nickname the owner taught the shop is as good as the real name.
  const nicknamed = items.filter((item) => item.aliases?.some((alias) => normalizeName(alias) === wanted));
  const [onlyNicknamed] = nicknamed;
  if (nicknamed.length === 1 && onlyNicknamed) return { kind: "match", item: onlyNicknamed };
  if (nicknamed.length > 1) return { kind: "ambiguous", candidates: nicknamed.slice(0, 5) };

  // Part of a name, in whole words only: "ngozi" finds "Mama Ngozi", but "Ada" never finds "Adaeze".
  const contains = items.filter((item) => {
    const name = normalizeName(item.name);
    return containsWords(name, wanted) || (longerQuery && containsWords(wanted, name));
  });
  const [onlyContains] = contains;
  if (contains.length === 1 && onlyContains) return { kind: "match", item: onlyContains };
  if (contains.length > 1) return { kind: "ambiguous", candidates: contains.slice(0, 5) };

  const queryTokens = tokens(ref);
  const close = lookalikes(items, ref);
  const scored = items
    .filter((item) => !close.includes(item))
    .map((item) => ({ item, score: overlapScore(queryTokens, tokens(item.name)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
  return { kind: "none", suggestions: [...close, ...scored].slice(0, 3) };
}
