import { transliterate } from "./transliterate";

/*
  The rules, one at a time.

  The full corpus check - this file against every hand written transliteration
  in lessons 1 to 4 - lives in the web repo, where those strings are. What is
  here is the set of rules that check was used to find, so that breaking one
  fails in the repository that broke it.
*/
describe("transliterate", () => {
  it("reads an ordinary vowelled word", () => {
    expect(transliterate("بَيْتٌ")).toBe("baytun");
    expect(transliterate("مِفْتَاحٌ")).toBe("miftahun");
  });

  it("assimilates the article into a sun letter", () => {
    expect(transliterate("الشَّمْسُ")).toBe("ash-shamsu");
    expect(transliterate("التُّفَّاحُ")).toBe("at-tuffahu");
  });

  it("keeps the lam before a moon letter", () => {
    expect(transliterate("القَمَرُ")).toBe("al-qamaru");
  });

  /* Hamzatu l-wasl: the article's vowel exists only to get the word started,
     and goes the moment anything precedes it. */
  it("elides the article's vowel after another word", () => {
    expect(transliterate("فِي البَيْتِ")).toBe("fi l-bayti");
    expect(transliterate("عَلَى المَكْتَبِ")).toBe("ala l-maktabi");
  });

  it("reads a dagger alif as a long a", () => {
    expect(transliterate("هٰذَا")).toBe("hadha");
    expect(transliterate("ذٰلِكَ")).toBe("dhalika");
  });

  it("reads ta marbutah as t when it carries a vowel", () => {
    expect(transliterate("غُرْفَةٌ")).toBe("ghurfatun");
  });

  /* The scheme is a reading, not a romanisation. An apostrophe for a sound
     English has not tells a reader nothing they can act on. */
  it("does not write ayn or hamzah", () => {
    expect(transliterate("نَعَمْ")).toBe("naam");
    expect(transliterate("إِمَامٌ")).toBe("imamun");
  });

  it("doubles a shaddah", () => {
    expect(transliterate("قِطٌّ")).toBe("qittun");
  });

  it("drops a trailing question mark but keeps an interior one", () => {
    expect(transliterate("مَا هٰذَا؟")).toBe("ma hadha");
    expect(transliterate("أَذٰلِكَ كَلْبٌ؟ لَا، ذٰلِكَ قِطٌّ")).toContain("kalbun? la,");
  });

  it("prolongs a fathah with alif maqsurah", () => {
    expect(transliterate("عَلَى")).toBe("ala");
  });

  /*
    Unvowelled Arabic has no single reading, so this produces a consonant
    skeleton rather than a guess. Pinned so nobody later "fixes" it by
    inventing vowels.
  */
  it("does not invent vowels for unvowelled text", () => {
    expect(transliterate("بيت")).toBe("byt");
  });
});
