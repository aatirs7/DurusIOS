import {
  atPrefix,
  coverageOf,
  floorPercent,
  followableAyahs,
  gradeWordChoice,
  isTokenKnown,
  pathPrefix,
  pickMeaningDistractors,
  pickNewCards,
  surahKnownAt,
  surahsCoverage,
  type MeaningOption,
  type WordToken,
} from "./words";

/* A hand-made fixture. Lemma 1 "rabb", 2 "Allah", 3 "yawm"; skill 10 al-,
   11 wa-, 12 suffix -hum. */
const t = (lemmas: number[], skills: number[] = []): WordToken => ({ lemmas, skills });

describe("the known-word rule", () => {
  it("knows a bare word whose lemma is known", () => {
    expect(isTokenKnown(t([1]), new Set([1]), new Set())).toBe(true);
  });

  it("does not know a word whose clitic has not been taught, however well the lemma is known", () => {
    /* wa-rabbi-hum: lemma known, wa- taught, -hum not taught */
    expect(isTokenKnown(t([1], [11, 12]), new Set([1]), new Set([11]))).toBe(false);
    expect(isTokenKnown(t([1], [11, 12]), new Set([1]), new Set([11, 12]))).toBe(true);
  });

  it("needs every stem lemma of a word with two stems", () => {
    /* mimma = min + ma */
    expect(isTokenKnown(t([1, 3]), new Set([1]), new Set())).toBe(false);
    expect(isTokenKnown(t([1, 3]), new Set([1, 3]), new Set())).toBe(true);
  });

  it("never knows a word with no stem", () => {
    expect(isTokenKnown(t([], [10]), new Set([1, 2, 3]), new Set([10]))).toBe(false);
  });

  it("counts coverage over words, not lemmas", () => {
    const tokens = [t([2]), t([2], [10]), t([1], [11]), t([3])];
    expect(coverageOf(tokens, new Set([2]), new Set())).toEqual({ known: 1, total: 4 });
    expect(coverageOf(tokens, new Set([2]), new Set([10]))).toEqual({ known: 2, total: 4 });
    expect(coverageOf(tokens, new Set([1, 2, 3]), new Set([10, 11]))).toEqual({ known: 4, total: 4 });
  });
});

describe("followable ayahs", () => {
  it("needs at least 90% of an ayah's words", () => {
    const ten = [...Array.from({ length: 9 }, () => t([1])), t([3])];
    expect(followableAyahs([ten], new Set([1]), new Set())).toBe(1);
    const nine = [...Array.from({ length: 8 }, () => t([1])), t([3])];
    expect(followableAyahs([nine], new Set([1]), new Set())).toBe(0);
  });

  it("applies the clitic rule inside the ayah", () => {
    const ayah = [t([1], [12]), t([1])];
    expect(followableAyahs([ayah], new Set([1]), new Set())).toBe(0);
    expect(followableAyahs([ayah], new Set([1]), new Set([12]))).toBe(1);
  });
});

describe("coverage along the path", () => {
  it("is the longest known prefix, so a gap holds it back", () => {
    expect(pathPrefix([101, 102, 103], new Set([101, 103]))).toBe(1);
    expect(pathPrefix([101, 102, 103], new Set([101, 102, 103]))).toBe(3);
    expect(pathPrefix([101, 102, 103], new Set())).toBe(0);
  });

  it("reads a curve, clamped at both ends", () => {
    const curve = [0, 10, 25];
    expect(atPrefix(curve, 1)).toBe(10);
    expect(atPrefix(curve, 9)).toBe(25);
    expect(atPrefix([], 3)).toBe(0);
  });

  it("reads a surah's steps and weights several surahs by length", () => {
    const steps: [number, number][] = [
      [1, 2],
      [4, 5],
    ];
    expect(surahKnownAt(steps, 0)).toBe(0);
    expect(surahKnownAt(steps, 3)).toBe(2);
    expect(surahKnownAt(steps, 4)).toBe(5);
    expect(surahsCoverage([{ words: 5, steps }, { words: 5, steps: [[2, 5]] }], 4)).toBe(1);
    expect(surahsCoverage([], 4)).toBeNull();
  });

  it("never rounds a percentage up", () => {
    expect(floorPercent(796, 1000)).toBe(79);
    expect(floorPercent(800, 1000)).toBe(80);
    expect(floorPercent(1, 0)).toBe(0);
  });
});

describe("the anti-interference picker", () => {
  const c = (cardId: number, group: string | null) => ({ cardId, group });

  it("never introduces two members of one group in a session", () => {
    const picked = pickNewCards([c(1, "negation"), c(2, "negation"), c(3, null), c(4, "negation")], 5);
    expect(picked).toEqual([1, 3]);
  });

  it("keeps path order and stops at the count", () => {
    expect(pickNewCards([c(1, null), c(2, "a"), c(3, "b"), c(4, null)], 3)).toEqual([1, 2, 3]);
  });

  it("respects groups already introduced today", () => {
    expect(pickNewCards([c(1, "fire"), c(2, "garden"), c(3, null)], 5, new Set(["fire"]))).toEqual([2, 3]);
  });

  it("lets words of one scene but different groups come together", () => {
    expect(pickNewCards([c(1, "fire"), c(2, "garden")], 5)).toEqual([1, 2]);
  });
});

describe("meaning distractors", () => {
  const o = (cardId: number, english: string, stage: number, group: string | null, learned: boolean): MeaningOption => ({
    cardId,
    english,
    stage,
    group,
    learned,
  });
  const fixed = () => 0.5;

  it("draws from learned words of the same stage first", () => {
    const item = o(1, "not", 3, "negation", true);
    const pool = [o(2, "if", 3, "cond", true), o(3, "then", 3, null, true), o(4, "or", 3, null, true), o(5, "day", 0, null, true), o(6, "when", 3, null, false)];
    const picked = pickMeaningDistractors(item, pool, 3, fixed).map((x) => x.cardId);
    expect(picked.sort()).toEqual([2, 3, 4]);
  });

  it("never offers a word from the item's own interference group", () => {
    const item = o(1, "not", 3, "negation", true);
    const pool = [o(2, "never", 3, "negation", true), o(3, "did not", 3, "negation", true), o(4, "then", 3, null, true)];
    const picked = pickMeaningDistractors(item, pool, 3, fixed);
    expect(picked.every((x) => x.group !== "negation")).toBe(true);
  });

  it("never offers a meaning that reads the same as the answer", () => {
    const item = o(1, "from", 1, null, true);
    const pool = [o(2, "From ", 1, null, true), o(3, "in", 1, null, true)];
    expect(pickMeaningDistractors(item, pool, 3, fixed).map((x) => x.english)).toEqual(["in"]);
  });

  it("falls back to earlier stages, then unlearned words of the stage, then anything", () => {
    const item = o(1, "Lord", 2, null, false);
    const pool = [o(2, "day", 0, null, true), o(3, "path", 2, null, false), o(4, "earth", 9, null, false)];
    const picked = pickMeaningDistractors(item, pool, 3, fixed).map((x) => x.cardId);
    expect(picked).toEqual([2, 3, 4]);
  });

  it("does not repeat a meaning among the options", () => {
    const item = o(1, "Lord", 2, null, false);
    const pool = [o(2, "day", 2, null, true), o(3, "day", 2, null, true), o(4, "path", 2, null, true)];
    const english = pickMeaningDistractors(item, pool, 3, fixed).map((x) => x.english);
    expect(new Set(english).size).toBe(english.length);
  });
});

describe("grading", () => {
  it("is again when wrong, however fast", () => {
    expect(gradeWordChoice(false, 100)).toBe("again");
  });

  it("is never again when right", () => {
    expect(gradeWordChoice(true, 4000)).not.toBe("again");
  });
});
