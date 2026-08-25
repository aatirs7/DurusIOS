import { buildCaseQuestion } from "./caseDrill";

// Always pick the first candidate, so the assertions are deterministic.
const first = () => 0;

describe("buildCaseQuestion", () => {
  it("blanks a damma and calls it marfu", () => {
    const q = buildCaseQuestion(
      { id: 1, arabic: "البَيْتُ جَدِيدٌ", english: "the house is new" },
      first,
    );
    expect(q).not.toBeNull();
    expect(q!.answer).toBe("u");
    expect(q!.stem).toBe("البَيْت");
    expect(q!.before).toBe("");
    expect(q!.after).toBe("جَدِيدٌ");
  });

  it("blanks a kasra after a preposition and calls it majrur", () => {
    const q = buildCaseQuestion(
      { id: 2, arabic: "فِي البَيْتِ", english: "in the house" },
      first,
    );
    expect(q!.answer).toBe("i");
    expect(q!.stem).toBe("البَيْت");
    // فِي is indeclinable, so it is never the blanked word.
    expect(q!.before).toBe("فِي");
  });

  it("treats any tanwin as the same answer", () => {
    const q = buildCaseQuestion(
      { id: 3, arabic: "هٰذَا بَيْتٌ", english: "this is a house" },
      first,
    );
    expect(q!.answer).toBe("un");
    expect(q!.stem).toBe("بَيْت");
  });

  it("returns null when nothing in the phrase carries a case ending", () => {
    const q = buildCaseQuestion(
      { id: 4, arabic: "نَعَمْ", english: "yes" },
      first,
    );
    expect(q).toBeNull();
  });

  it("skips a one letter word so the stem is never empty", () => {
    const q = buildCaseQuestion({ id: 5, arabic: "وَ", english: "and" }, first);
    expect(q).toBeNull();
  });

  /*
    Regression. A trailing question mark used to hide the harakah from
    the scan, so a word like الكِتَابُ؟ was never offered.
  */
  it("sees through trailing punctuation and keeps it on the stem", () => {
    const q = buildCaseQuestion(
      { id: 6, arabic: "مَا هٰذَا؟", english: "what is this?" },
      first,
    );
    // Both words are indeclinable, so there is nothing to ask.
    expect(q).toBeNull();

    const q2 = buildCaseQuestion(
      { id: 7, arabic: "أَيْنَ الكِتَابُ؟", english: "where is the book?" },
      first,
    )!;
    expect(q2.answer).toBe("u");
    expect(q2.stem).toBe("الكِتَاب");
    expect(q2.punct).toBe("؟");
    expect(q2.before).toBe("أَيْنَ");
  });

  /*
    Regression. أَيْنَ ends in a fatha but it is a fixed ending, not a
    case, so asking about it would be a question with no rule behind it.
  */
  it("never blanks an indeclinable particle or pronoun", () => {
    const q = buildCaseQuestion(
      {
        id: 8,
        arabic: "أَيْنَ الوَلَدُ؟ هُوَ فِي المَسْجِدِ",
        english: "where is the boy? he is in the mosque",
      },
      first,
    )!;
    expect(q.stem).toBe("الوَلَد");
    expect(q.punct).toBe("؟");
    expect(q.answer).toBe("u");
  });

  it("can choose the later noun when asked for it", () => {
    const q = buildCaseQuestion(
      {
        id: 9,
        arabic: "أَيْنَ الوَلَدُ؟ هُوَ فِي المَسْجِدِ",
        english: "where is the boy? he is in the mosque",
      },
      () => 1,
    )!;
    expect(q.stem).toBe("المَسْجِد");
    expect(q.answer).toBe("i");
  });
});
