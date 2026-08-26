import { NOUN_POOL, inflect, nounById, type PoolNoun } from "./nouns";

const n = (id: string): PoolNoun => nounById(id)!;

describe("the pool", () => {
  /* A drill about masculine versus feminine needs both, equally. */
  it("is eight and eight", () => {
    expect(NOUN_POOL.filter((x) => x.gender === "m")).toHaveLength(8);
    expect(NOUN_POOL.filter((x) => x.gender === "f")).toHaveLength(8);
  });

  it("has unique ids", () => {
    expect(new Set(NOUN_POOL.map((x) => x.id)).size).toBe(NOUN_POOL.length);
  });

  /* Stems carry no final case vowel - the endings are the exercise, so baking
     one in would make every generated phrase wrong in the same way. */
  it("stores stems without a case ending", () => {
    for (const noun of NOUN_POOL) {
      expect(noun.stem).not.toMatch(/[ًٌٍَُِ]$/);
      expect(noun.pluralStem).not.toMatch(/[ًٌٍَُِ]$/);
    }
  });
});

describe("inflect, singular", () => {
  it("builds the three indefinite cases", () => {
    expect(inflect(n("kitab"), { number: "singular", case: "nominative", definite: false })).toBe("كِتَابٌ");
    expect(inflect(n("kitab"), { number: "singular", case: "accusative", definite: false })).toBe("كِتَابًا");
    expect(inflect(n("kitab"), { number: "singular", case: "genitive", definite: false })).toBe("كِتَابٍ");
  });

  /* The supporting alif is not written after a round ta. */
  it("omits the accusative alif after ta marbutah", () => {
    expect(inflect(n("sayyara"), { number: "singular", case: "accusative", definite: false })).toBe("سَيَّارَةً");
  });

  it("keeps the alif on a noun that does not end in ta marbutah", () => {
    expect(inflect(n("bint"), { number: "singular", case: "accusative", definite: false })).toBe("بِنْتًا");
  });

  /* ال and tanwin are the two ways of being definite or indefinite, and a word
     never carries both. */
  it("uses a single vowel when definite", () => {
    expect(inflect(n("kitab"), { number: "singular", case: "nominative", definite: true })).toBe("الكِتَابُ");
    expect(inflect(n("kitab"), { number: "singular", case: "genitive", definite: true })).toBe("الكِتَابِ");
  });
});

describe("inflect, dual", () => {
  it("has two forms, not three", () => {
    expect(inflect(n("kitab"), { number: "dual", case: "nominative", definite: false })).toBe("كِتَابَانِ");
    expect(inflect(n("kitab"), { number: "dual", case: "accusative", definite: false })).toBe("كِتَابَيْنِ");
    expect(inflect(n("kitab"), { number: "dual", case: "genitive", definite: false })).toBe("كِتَابَيْنِ");
  });

  it("opens the round ta into a plain one", () => {
    expect(inflect(n("sayyara"), { number: "dual", case: "nominative", definite: false })).toBe("سَيَّارَتَانِ");
  });
});

describe("inflect, plural", () => {
  it("builds a broken plural like a singular", () => {
    expect(inflect(n("kitab"), { number: "plural", case: "genitive", definite: false })).toBe("كُتُبٍ");
    expect(inflect(n("kitab"), { number: "plural", case: "accusative", definite: false })).toBe("كُتُبًا");
  });

  /*
    The one irregularity in the pool, and the reason pluralKind is stored
    rather than guessed from the shape of the word.
  */
  it("gives a sound feminine plural kasrah in the accusative", () => {
    expect(inflect(n("bint"), { number: "plural", case: "accusative", definite: false })).toBe("بَنَاتٍ");
    expect(inflect(n("bint"), { number: "plural", case: "genitive", definite: false })).toBe("بَنَاتٍ");
    expect(inflect(n("bint"), { number: "plural", case: "nominative", definite: false })).toBe("بَنَاتٌ");
  });

  it("does not confuse a broken feminine plural with a sound one", () => {
    /* غُرَف is broken, so it takes fathah in the accusative like any other. */
    expect(inflect(n("ghurfa"), { number: "plural", case: "accusative", definite: false })).toBe("غُرَفًا");
  });

  it("builds the definite plural the adjective rule needs", () => {
    expect(inflect(n("kitab"), { number: "plural", case: "nominative", definite: true })).toBe("الكُتُبُ");
  });
});

describe("the shapes the counting rules ask for", () => {
  /* After 3 to 10: genitive plural. */
  it("genitive plural, for three to ten", () => {
    expect(inflect(n("kitab"), { number: "plural", case: "genitive", definite: false })).toBe("كُتُبٍ");
    expect(inflect(n("bint"), { number: "plural", case: "genitive", definite: false })).toBe("بَنَاتٍ");
  });

  /* After 11 to 99: accusative singular. */
  it("accusative singular, for eleven to ninety nine", () => {
    expect(inflect(n("talib"), { number: "singular", case: "accusative", definite: false })).toBe("طَالِبًا");
    expect(inflect(n("baqara"), { number: "singular", case: "accusative", definite: false })).toBe("بَقَرَةً");
  });

  /* After 100 and 1000: genitive singular. */
  it("genitive singular, for a hundred and a thousand", () => {
    expect(inflect(n("kitab"), { number: "singular", case: "genitive", definite: false })).toBe("كِتَابٍ");
  });
});
