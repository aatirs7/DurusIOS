/*
  The Quranic Words track: coverage, the new-card picker and distractors.

  Pure, like the rest of src/engine. No clock, no database, no content import:
  callers pass the data in, so every rule here is testable on a hand-made
  fixture.

  TWO WAYS TO COUNT COVERAGE

  1. Exact, per word (isTokenKnown, coverageOf, followableAyahs). A word of the
     Quran counts as known when it has a stem lemma, every stem lemma in it is
     known, and every clitic on it (wa-, bi-, al-, attached pronouns and so on)
     has been taught as a parsing skill. This needs a per-word table (word to
     lemma ids and skill ids). The only morphology we can read today is the
     Quranic Arabic Corpus, which is GPL with a no-modification clause, so such
     a table is NOT shipped. These functions are what the app will run once a
     shippable table exists (QUL, once its licence is confirmed).

  2. Precomputed along the path (pathPrefix, coverageAtPrefix and friends).
     What ships today: for each prefix length k of the path (the first k lemma
     cards, with each stage's skills taught at the stage's start), how many
     words of the Quran are known and how many ayahs are followable, computed
     offline by scripts/coverage/build_words.py. On the device the learner's
     position is the LONGEST prefix of the path that is fully known, so the
     figure shown is exact when the learner has gone in path order and a lower
     bound otherwise. It is never an overestimate.
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
