/*
  The Quranic Words track: coverage, the new-card picker and distractors.

  Pure, like the rest of src/engine. No clock, no database, no content import:
  callers pass the data in, so every rule here is testable on a hand-made
  fixture.

  TWO WAYS TO COUNT COVERAGE

  1. Exact, per word (isTokenKnown, coverageOf, followableAyahs, and their
     packed forms decodeWordsMap and knownWordFlags). A word of the Quran
     counts as known when it has a stem lemma, every stem lemma in it is known,
     and every clitic on it (wa-, bi-, al-, attached pronouns and so on) has
     been taught as a parsing skill. The per-word table this needs ships as
     assets/content/quranic-words-map.json, built offline from the Quranic
     Universal Library's lemma and stem data (scripts/coverage/
     build_words_map.py). This is what the app counts with.

  2. Precomputed along the path (pathPrefix, knownAlongPath and friends). For
     each prefix length k of the path, how many words are known, computed
     offline. Exact in path order and a lower bound otherwise. Kept as the
     fallback for a build whose word table does not match its cards.
*/

import { gradeFor } from "./modes";
import type { Grade } from "./srs";

/* ------------------------------------------------------------ exact rule */

export type WordToken = { lemmas: readonly number[]; skills: readonly number[] };

export function isTokenKnown(
  token: WordToken,
  knownLemmas: ReadonlySet<number>,
  taughtSkills: ReadonlySet<number>,
): boolean {
  if (token.lemmas.length === 0) return false;
  return token.lemmas.every((l) => knownLemmas.has(l)) && token.skills.every((s) => taughtSkills.has(s));
}

export function coverageOf(
  tokens: readonly WordToken[],
  knownLemmas: ReadonlySet<number>,
  taughtSkills: ReadonlySet<number>,
): { known: number; total: number } {
  let known = 0;
  for (const t of tokens) if (isTokenKnown(t, knownLemmas, taughtSkills)) known += 1;
  return { known, total: tokens.length };
}

/* An ayah is followable when at least this share of its words are known. */
export const FOLLOWABLE_SHARE = 0.9;

export function followableAyahs(
  ayahs: readonly (readonly WordToken[])[],
  knownLemmas: ReadonlySet<number>,
  taughtSkills: ReadonlySet<number>,
  share = FOLLOWABLE_SHARE,
): number {
  let n = 0;
  for (const ayah of ayahs) {
    if (ayah.length === 0) continue;
    const { known } = coverageOf(ayah, knownLemmas, taughtSkills);
    if (known >= Math.ceil(share * ayah.length - 1e-9)) n += 1;
  }
  return n;
}

/* ------------------------------------------------- the packed word table */

/*
  The word table, decoded once into flat arrays: for word i (Quran order),
  first[i] is the index of its card among the track's cards or -1, second[i]
  the index of a second card for a fused word (-1 none, -2 a lemma outside
  the track, so the word is never known), and skills[i] a bitmask with bit
  (id - 1) set for each parsing skill id. ayahStart[g] is the first word of
  global ayah g; ayahStart[ayahs] is the word count.

  Encoding (see build_words_map.py): per ayah, each word is two base-36
  characters for 1 + its card index (00 = none), then optionally "+" and two
  more for a second card (00 = outside the track), then one character per
  skill from skillChars.
*/
export type PackedWords = {
  first: Int16Array;
  second: Int16Array;
  skills: Int32Array;
  ayahStart: Int32Array;
  aligned: Uint8Array;
};

const B36 = "0123456789abcdefghijklmnopqrstuvwxyz";

export function decodeWordsMap(map: {
  skillChars: string;
  ayahs: readonly string[];
  unaligned?: readonly number[];
}): PackedWords {
  /* Character code lookups: a base-36 digit (or -1), a skill bit (or 0). */
  const digit = new Int8Array(128).fill(-1);
  for (let i = 0; i < B36.length; i += 1) digit[B36.charCodeAt(i)] = i;
  const skillBit = new Int32Array(128);
  for (let i = 0; i < map.skillChars.length; i += 1) skillBit[map.skillChars.charCodeAt(i)] = 1 << i;
  const PLUS = 43;
  const d = (a: string, j: number) => {
    const v = digit[a.charCodeAt(j)];
    if (v === undefined || v < 0) throw new Error(`bad word table character at ${j}`);
    return v;
  };
  /* Every word has exactly two base-36 characters, a second card two more. */
  let count = 0;
  let seconds = 0;
  for (const a of map.ayahs)
    for (let j = 0; j < a.length; j += 1) {
      const c = a.charCodeAt(j);
      if (c < 128 && digit[c] >= 0) count += 1;
      else if (c === PLUS) seconds += 1;
    }
  const total = (count - 2 * seconds) / 2;
  const first = new Int16Array(total);
  const second = new Int16Array(total).fill(-1);
  const skills = new Int32Array(total);
  const ayahStart = new Int32Array(map.ayahs.length + 1);
  let w = 0;
  for (let g = 0; g < map.ayahs.length; g += 1) {
    const a = map.ayahs[g];
    ayahStart[g] = w;
    let j = 0;
    while (j < a.length) {
      first[w] = d(a, j) * 36 + d(a, j + 1) - 1;
      j += 2;
      if (a.charCodeAt(j) === PLUS) {
        const v = d(a, j + 1) * 36 + d(a, j + 2) - 1;
        second[w] = v < 0 ? -2 : v;
        j += 3;
      }
      let mask = 0;
      while (j < a.length) {
        const c = a.charCodeAt(j);
        const bit = c < 128 ? skillBit[c] : 0;
        if (bit === 0) break;
        mask |= bit;
        j += 1;
      }
      skills[w] = mask;
      w += 1;
    }
  }
  ayahStart[map.ayahs.length] = w;
  const aligned = new Uint8Array(map.ayahs.length).fill(1);
  for (const g of map.unaligned ?? []) if (g >= 0 && g < aligned.length) aligned[g] = 0;
  return { first, second, skills, ayahStart, aligned };
}

/* The bitmask for a set of skill ids (1-based). */
export function skillMask(ids: Iterable<number>): number {
  let m = 0;
  for (const id of ids) if (id >= 1 && id <= 31) m |= 1 << (id - 1);
  return m;
}

/*
  isTokenKnown over the packed table: knownCards[c] is 1 when the card at
  index c is known; taught is a skillMask. One flag per word.
*/
export function knownWordFlags(p: PackedWords, knownCards: Uint8Array, taught: number): Uint8Array {
  const out = new Uint8Array(p.first.length);
  for (let i = 0; i < out.length; i += 1) {
    const f = p.first[i];
    if (f < 0 || knownCards[f] !== 1) continue;
    const s = p.second[i];
    if (s === -2 || (s >= 0 && knownCards[s] !== 1)) continue;
    if ((p.skills[i] & ~taught) !== 0) continue;
    out[i] = 1;
  }
  return out;
}

/* Known words per ayah, and the ayahs at least `share` known. */
export function ayahCoverage(
  p: PackedWords,
  flags: Uint8Array,
  share = FOLLOWABLE_SHARE,
): { known: Uint16Array; followable: Uint8Array; followableCount: number; knownTotal: number } {
  const n = p.ayahStart.length - 1;
  const known = new Uint16Array(n);
  const followable = new Uint8Array(n);
  let followableCount = 0;
  let knownTotal = 0;
  for (let g = 0; g < n; g += 1) {
    const a = p.ayahStart[g];
    const b = p.ayahStart[g + 1];
    let k = 0;
    for (let i = a; i < b; i += 1) k += flags[i];
    known[g] = k;
    knownTotal += k;
    if (b > a && k >= Math.ceil(share * (b - a) - 1e-9)) {
      followable[g] = 1;
      followableCount += 1;
    }
  }
  return { known, followable, followableCount, knownTotal };
}

/* ------------------------------------------------------ along the path */

/*
  How many of the path's lemma cards, from the start and without a gap, the
  learner knows. pathCardIds is in path order.
*/
export function pathPrefix(pathCardIds: readonly number[], knownCardIds: ReadonlySet<number>): number {
  let k = 0;
  while (k < pathCardIds.length && knownCardIds.has(pathCardIds[k])) k += 1;
  return k;
}

/*
  A lower bound that survives gaps.

  The bare prefix would drop the meter to zero the moment the first word of
  the path lapses. Instead, for every known position K, take the curve at K
  and subtract, for each word before K that is not known, the most it could
  cost: weights[i], the number of Quran words (or ayahs) containing that
  lemma. That is still never an overestimate, because a missing lemma can
  only take away the words that contain it. The best K wins, and the bare
  prefix is the floor.
*/
export function knownAlongPath(
  curve: readonly number[],
  pathCardIds: readonly number[],
  knownCardIds: ReadonlySet<number>,
  weights: readonly number[],
): number {
  let best = atPrefix(curve, pathPrefix(pathCardIds, knownCardIds));
  let missing = 0;
  for (let i = 0; i < pathCardIds.length; i += 1) {
    if (!knownCardIds.has(pathCardIds[i])) {
      missing += weights[i] ?? 0;
      continue;
    }
    const value = atPrefix(curve, i + 1) - missing;
    if (value > best) best = value;
  }
  return best;
}

/* curve[k] is the count at prefix k. Clamped, so a stale curve cannot throw. */
export function atPrefix(curve: readonly number[], k: number): number {
  if (curve.length === 0) return 0;
  return curve[Math.max(0, Math.min(k, curve.length - 1))];
}

/*
  Known words in one surah at prefix k. steps is [[k, knownWords], ...] in
  increasing k: the count changes only where a lemma or skill the surah uses
  joins the prefix.
*/
export function surahKnownAt(steps: readonly (readonly [number, number])[], k: number): number {
  let known = 0;
  for (const [at, count] of steps) {
    if (at > k) break;
    known = count;
  }
  return known;
}

/*
  Share of words known across a set of surahs (the learner's memorized ones),
  weighted by each surah's length. Null when the set is empty, so the line can
  be left out rather than reading 0%.
*/
export function surahsCoverage(
  surahs: readonly { words: number; steps: readonly (readonly [number, number])[] }[],
  k: number,
): number | null {
  let known = 0;
  let total = 0;
  for (const s of surahs) {
    known += surahKnownAt(s.steps, k);
    total += s.words;
  }
  return total === 0 ? null : known / total;
}

/*
  A whole percentage that never rounds up past what is true, so the meter can
  not claim 80% at 79.6%.
*/
export function floorPercent(known: number, total: number): number {
  if (total <= 0) return 0;
  return Math.floor((100 * known) / total + 1e-9);
}

/* ------------------------------------------------ the new-card picker */

export type PickCandidate = { cardId: number; group: string | null };

/*
  The anti-interference rule (spec 7.3): never introduce two near-synonyms, or
  two members of one closed set, in the same session. Walks the candidates in
  path order and skips any whose interference group is already in play, either
  from an earlier pick or because a word of that group was introduced today
  (blockedGroups). Words with no group never block.

  It never goes looking past a blocked word for the sake of filling the count
  from a later stage: candidates are what the caller says may be taught now, so
  a session can come out shorter, which is the calm outcome.
*/
export function pickNewCards(
  candidates: readonly PickCandidate[],
  count: number,
  blockedGroups: ReadonlySet<string> = new Set(),
): number[] {
  const used = new Set(blockedGroups);
  const out: number[] = [];
  for (const c of candidates) {
    if (out.length >= count) break;
    if (c.group !== null && used.has(c.group)) continue;
    out.push(c.cardId);
    if (c.group !== null) used.add(c.group);
  }
  return out;
}

/* ------------------------------------------------------- distractors */

export type MeaningOption = {
  cardId: number;
  english: string;
  stage: number;
  group: string | null;
  learned: boolean;
};

const norm = (s: string) => s.trim().toLowerCase();

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/*
  The wrong meanings for a "choose the meaning" drill (spec 7.4). Rule based,
  never a model call.

  Drawn from other words, never from the item's own interference group, so the
  drill tests recognition rather than telling near-synonyms apart, and never a
  meaning that reads the same as the answer (min and an can both be "from").
  Preference, tier by tier:
    1. learned words of the same stage,
    2. learned words of earlier stages,
    3. not yet learned words of the same stage,
    4. any other word.
  Within a tier the order is shuffled with the injected random, so a replay is
  deterministic and the same card does not always draw the same three.
*/
export function pickMeaningDistractors(
  item: MeaningOption,
  pool: readonly MeaningOption[],
  count: number,
  random: () => number,
): MeaningOption[] {
  const eligible = pool.filter(
    (o) =>
      o.cardId !== item.cardId &&
      o.english.trim().length > 0 &&
      norm(o.english) !== norm(item.english) &&
      (item.group === null || o.group !== item.group),
  );
  const tiers = [
    eligible.filter((o) => o.learned && o.stage === item.stage),
    eligible.filter((o) => o.learned && o.stage < item.stage),
    eligible.filter((o) => !o.learned && o.stage === item.stage),
    eligible.filter((o) => !(o.stage === item.stage) && !(o.learned && o.stage < item.stage)),
  ];
  const seen = new Set([norm(item.english)]);
  const out: MeaningOption[] = [];
  for (const tier of tiers) {
    for (const o of shuffled(tier, random)) {
      if (out.length >= count) return out;
      if (seen.has(norm(o.english))) continue;
      seen.add(norm(o.english));
      out.push(o);
    }
  }
  return out;
}

/* ------------------------------------------------------------ grading */

/*
  Deterministic grading, no self-grading: a choice is right or it is not, and
  a right answer is graded by speed exactly as the book's choice rung is
  (gradeFor in modes.ts), so the two decks share one idea of "solid".
*/
export function gradeWordChoice(correct: boolean, msToAnswer: number): Grade {
  return gradeFor({ mode: "choice", correct, msToAnswer });
}
