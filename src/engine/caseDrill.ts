/*
  The case drill.

  Lesson 4 introduces the thing that actually slows you down later: the
  same noun changes its final vowel depending on its position.
  البَيْتُ, البَيْتِ, بَيْتٌ, بَيْتٍ.

  Making a card per case form would triple the deck and teach nothing.
  Instead this takes an existing phrase card, blanks the final harakah
  on one noun, and asks which ending belongs there. It tests the rule,
  not the vocabulary.
*/

export type CaseEnding = "u" | "i" | "a" | "un";

/*
  Each mark is shown on a dotted circle, U+25CC, which is the convention
  for displaying a combining mark on its own.

  Without a base to attach to, a lone harakah is positioned against
  nothing, so the four of them sit at whatever heights the font happens
  to give them and the row looks scattered. The dotted circle gives each
  one the same base and the same baseline.
*/
const BASE = "◌";

export const CASE_LABELS: Record<CaseEnding, { ar: string; en: string }> = {
  u: { ar: `${BASE}ُ`, en: "marfu" },
  i: { ar: `${BASE}ِ`, en: "majrur" },
  a: { ar: `${BASE}َ`, en: "mansub" },
  un: { ar: `${BASE}ٌ`, en: "tanwin" },
};

/* The bare mark, for putting back into the sentence. */
export const CASE_MARKS: Record<CaseEnding, string> = {
  u: "ُ",
  i: "ِ",
  a: "َ",
  un: "ٌ",
};

/* Stands in for the missing harakah. */
export const BLANK = "ـٜ";

export const CASE_ORDER: CaseEnding[] = ["u", "i", "a", "un"];

const DAMMA = "ُ";
const KASRA = "ِ";
const FATHA = "َ";
const DAMMATAN = "ٌ";
const KASRATAN = "ٍ";
const FATHATAN = "ً";

const ENDING_OF: Record<string, CaseEnding> = {
  [DAMMA]: "u",
  [KASRA]: "i",
  [FATHA]: "a",
  [DAMMATAN]: "un",
  [KASRATAN]: "un",
  [FATHATAN]: "un",
};

/*
  Words whose final vowel is fixed rather than a case ending. Blanking
  one of these would ask a question with no rule behind it. Compared
  without harakat so a spelling variant still matches.
*/
const INDECLINABLE = new Set(
  [
    "أين",
    "هو",
    "هي",
    "هذا",
    "هٰذا",
    "ذلك",
    "ذٰلك",
    "نعم",
    "لا",
    "و",
    "على",
    "في",
    "ما",
    "من",
    "أهذا",
    "أذلك",
  ].map(bare),
);

const TRAILING_PUNCT = /[؟،.!?,:]+$/;

export type CaseQuestion = {
  cardId: number;
  /* The words before and after the blanked one, already joined. */
  before: string;
  after: string;
  /* The blanked word without its final harakah. */
  stem: string;
  /* Trailing punctuation, which goes after the ending, not before. */
  punct: string;
  answer: CaseEnding;
  english: string;
};

export function buildCaseQuestion(
  card: { id: number; arabic: string; english: string },
  pick: (max: number) => number = (max) => Math.floor(Math.random() * max),
): CaseQuestion | null {
  const words = card.arabic.split(/\s+/).filter(Boolean);

  const candidates: number[] = [];
  words.forEach((word, i) => {
    const { core } = splitPunctuation(word);
    const last = core.at(-1);
    if (!last || !(last in ENDING_OF)) return;
    // A stem of one letter leaves nothing to read.
    if (bare(core).length < 2) return;
    if (INDECLINABLE.has(bare(core))) return;
    candidates.push(i);
  });

  if (candidates.length === 0) return null;

  const chosen = candidates[pick(candidates.length)];
  const { core, punct } = splitPunctuation(words[chosen]);
  const answer = ENDING_OF[core.at(-1)!];

  return {
    cardId: card.id,
    before: words.slice(0, chosen).join(" "),
    after: words.slice(chosen + 1).join(" "),
    stem: core.slice(0, -1),
    punct,
    answer,
    english: card.english,
  };
}

/* Splits a trailing question mark or comma off the word. */
function splitPunctuation(word: string): { core: string; punct: string } {
  const match = word.match(TRAILING_PUNCT);
  if (!match) return { core: word, punct: "" };
  return { core: word.slice(0, -match[0].length), punct: match[0] };
}

/* Compare words without harakat, so spelling variants still match. */
function bare(word: string): string {
  return word.replace(/[ً-ْٰ]/g, "");
}
