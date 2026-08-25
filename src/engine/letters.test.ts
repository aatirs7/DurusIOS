import { assembledCorrectly, splitLetters, tilesFor } from "./letters";

describe("splitLetters", () => {
  it("keeps a letter and its harakah on one tile", () => {
    // ba + fatha, ya + sukun, ta + dammatan
    expect(splitLetters("بَيْتٌ")).toEqual(["بَ", "يْ", "تٌ"]);
  });

  it("keeps a shadda with the letter it doubles", () => {
    // Two base letters, qaf and ta, however many marks hang off them.
    const tiles = splitLetters("قِطٌّ");
    expect(tiles).toHaveLength(2);
    // The last tile carries the shadda and the tanwin together.
    expect(tiles[1].length).toBe(3);
  });

  it("never leaves a bare mark on its own tile", () => {
    for (const word of ["مَسْجِدٌ", "الحَمَّامُ", "كُرْسِيٌّ", "حَارٌّ"]) {
      for (const tile of splitLetters(word)) {
        // A tile that is only combining marks would be unplaceable.
        expect(/^\p{M}/u.test(tile)).toBe(false);
      }
    }
  });

  it("drops spaces rather than making them tiles", () => {
    expect(splitLetters("فِي البَيْتِ")).not.toContain(" ");
  });

  it("rebuilds the original word when joined", () => {
    for (const word of ["بَيْتٌ", "مَسْجِدٌ", "الشَّمْسُ", "مِفْتَاحٌ"]) {
      expect(splitLetters(word).join("")).toBe(word);
    }
  });

  it("returns nothing for an empty string", () => {
    expect(splitLetters("")).toEqual([]);
  });
});

describe("tilesFor", () => {
  it("makes one tile per letter", () => {
    expect(tilesFor("بَيْتٌ")).toHaveLength(3);
  });

  it("gives every tile a distinct id, so repeated letters stay apart", () => {
    const tiles = tilesFor("الحَمَّامُ");
    const ids = new Set(tiles.map((t) => t.id));
    expect(ids.size).toBe(tiles.length);
  });

  it("still contains every letter after shuffling", () => {
    const word = "مِفْتَاحٌ";
    const shuffled = tilesFor(word, () => 0.99)
      .map((t) => t.letter)
      .sort();
    expect(shuffled).toEqual(splitLetters(word).sort());
  });
});

describe("assembledCorrectly", () => {
  const word = "بَيْتٌ";

  it("accepts the letters placed in order", () => {
    const built = splitLetters(word).map((letter, id) => ({ id, letter }));
    expect(assembledCorrectly(built, word)).toBe(true);
  });

  it("rejects the letters placed out of order", () => {
    const built = splitLetters(word)
      .map((letter, id) => ({ id, letter }))
      .reverse();
    expect(assembledCorrectly(built, word)).toBe(false);
  });

  it("rejects a word that is not finished", () => {
    const built = splitLetters(word)
      .map((letter, id) => ({ id, letter }))
      .slice(0, 2);
    expect(assembledCorrectly(built, word)).toBe(false);
  });

  /*
    A word with a repeated letter has more than one arrangement of tiles
    that spells it correctly, so the check compares text, not tile ids.
  */
  it("accepts either of two identical letters in the same place", () => {
    const repeated = "الحَمَّامُ";
    const letters = splitLetters(repeated);
    const built = letters.map((letter, id) => ({ id: id + 100, letter }));
    expect(assembledCorrectly(built, repeated)).toBe(true);
  });
});
