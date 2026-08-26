import { lengthCloseness, pickDistractors, salientWords, type Choice } from "./distractors";

const v = (english: string): Choice => ({ arabic: "x", english, type: "vocab" });
const p = (english: string): Choice => ({ arabic: "x", english, type: "phrase" });

/* Deterministic, so a failure is a failure rather than a bad day. */
const fixed = (n = 0.5) => () => n;

describe("lengthCloseness", () => {
  it("is 1 for the same shape", () => {
    expect(lengthCloseness("the boy is here", "the pen is there")).toBe(1);
  });

  it("falls away as the word counts diverge", () => {
    const near = lengthCloseness("the boy is in the house", "the pen is on the table");
    const far = lengthCloseness("the boy is in the house", "key");
    expect(near).toBeGreaterThan(far);
  });
});

describe("salientWords", () => {
  const pool = [p("the boy is here"), p("the pen is here"), p("the dog is here"), p("the man is here")];

  it("drops words that are in most of the pool", () => {
    const s = salientWords("the dog is here", pool);
    expect(s.has("the")).toBe(false);
    expect(s.has("is")).toBe(false);
    expect(s.has("here")).toBe(false);
  });

  it("keeps the word that distinguishes it", () => {
    expect(salientWords("the dog is here", pool).has("dog")).toBe(true);
  });

  /*
    "this" and "in" are function words in English and vocabulary cards in Book
    1. A hand written stop list would have thrown them away.
  */
  it("keeps a function word when it is the rare one", () => {
    const rare = [v("this"), v("house"), v("pen"), v("book"), v("door")];
    expect(salientWords("this", rare).has("this")).toBe(true);
  });
});

describe("pickDistractors", () => {
  it("prefers options of the same shape over single words", () => {
    const answer = "the boy is in the house";
    const candidates = [
      v("key"),
      v("pen"),
      v("door"),
      p("the man is in the mosque"),
      p("the book is on the table"),
      p("the star is in the sky"),
    ];
    const picked = pickDistractors(answer, candidates, 3, fixed());
    expect(picked.every((c) => c.type === "phrase")).toBe(true);
  });

  /*
    The whole point. If only the answer mentions the dog, the question is
    "find the word dog" rather than a test of the sentence.
  */
  it("prefers options that share the answer's subject", () => {
    const answer = "the dog is in the house";
    const candidates = [
      p("the dog is in the garden"),
      p("the dog is on the road"),
      p("the pen is on the table"),
      p("the star is in the sky"),
      p("the man is in the mosque"),
    ];
    const picked = pickDistractors(answer, candidates, 3, fixed());
    expect(picked.filter((c) => c.english.includes("dog")).length).toBeGreaterThanOrEqual(2);
  });

  it("never repeats a meaning", () => {
    const candidates = [v("key"), v("key"), v("pen"), v("door")];
    const picked = pickDistractors("book", candidates, 3, fixed());
    expect(new Set(picked.map((c) => c.english)).size).toBe(picked.length);
  });

  it("returns what it can when the pool is short", () => {
    expect(pickDistractors("book", [v("key")], 3, fixed())).toHaveLength(1);
    expect(pickDistractors("book", [], 3, fixed())).toEqual([]);
  });

  it("is deterministic for a given random", () => {
    const candidates = [v("key"), v("pen"), v("door"), v("book"), v("star")];
    const a = pickDistractors("house", candidates, 3, fixed(0.3));
    const b = pickDistractors("house", candidates, 3, fixed(0.3));
    expect(a.map((c) => c.english)).toEqual(b.map((c) => c.english));
  });
});
