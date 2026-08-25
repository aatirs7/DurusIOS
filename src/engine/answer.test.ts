import { acceptedAnswers, checkAnswer, editDistance, normalise } from "./answer";

describe("normalise", () => {
  it("lowercases, strips punctuation, and collapses spaces", () => {
    expect(normalise("  The   House! ")).toBe("the house");
  });

  it("keeps a question mark out of the comparison", () => {
    expect(normalise("what is this?")).toBe("what is this");
  });
});

describe("acceptedAnswers", () => {
  it("splits a comma list into separate answers", () => {
    const answers = acceptedAnswers("he, it");
    expect(answers).toContain("he");
    expect(answers).toContain("it");
  });

  it("offers the form without a leading article", () => {
    expect(acceptedAnswers("the sun")).toContain("sun");
  });

  it("keeps the whole string as an answer too", () => {
    expect(acceptedAnswers("he, it")).toContain("he it");
  });
});

describe("checkAnswer", () => {
  it("accepts the exact word", () => {
    expect(checkAnswer("house", "house").kind).toBe("exact");
  });

  it("ignores case, spacing, and punctuation", () => {
    expect(checkAnswer("  MOSQUE. ", "mosque").kind).toBe("exact");
  });

  it("accepts a missing article", () => {
    expect(checkAnswer("sun", "the sun").kind).toBe("exact");
  });

  it("accepts an added article", () => {
    expect(checkAnswer("the house", "house").kind).toBe("exact");
  });

  it("accepts either half of a two meaning card", () => {
    expect(checkAnswer("it", "he, it").kind).toBe("exact");
    expect(checkAnswer("he", "he, it").kind).toBe("exact");
  });

  it("forgives one typo on a longer word", () => {
    const res = checkAnswer("merchent", "merchant");
    expect(res.kind).toBe("close");
  });

  it("does not forgive a typo on a short word, since the deck has near misses", () => {
    // cat and cap are one edit apart, and cat is a real card here.
    expect(checkAnswer("cap", "cat").kind).toBe("wrong");
  });

  it("accepts a swapped pair of letters", () => {
    expect(checkAnswer("mosqeu", "mosque").kind).toBe("close");
    expect(checkAnswer("hosue", "house").kind).toBe("close");
  });

  it("still rejects a near miss on a short word after the swap change", () => {
    expect(checkAnswer("cap", "cat").kind).toBe("wrong");
    expect(checkAnswer("pen", "pan").kind).toBe("wrong");
  });

  it("rejects a different word", () => {
    expect(checkAnswer("door", "book").kind).toBe("wrong");
  });

  it("rejects an empty answer", () => {
    expect(checkAnswer("   ", "house").kind).toBe("wrong");
  });

  it("handles a phrase with punctuation", () => {
    expect(checkAnswer("what is this", "what is this?").kind).toBe("exact");
  });
});

describe("editDistance", () => {
  it("is zero for identical strings", () => {
    expect(editDistance("house", "house")).toBe(0);
  });

  it("counts a substitution as one", () => {
    expect(editDistance("cat", "cot")).toBe(1);
  });

  it("counts an insertion as one", () => {
    expect(editDistance("cat", "cart")).toBe(1);
  });

  /*
    Regression. A swap is the commonest typo and plain Levenshtein
    scores it two, which put it outside the tolerance for a six letter
    word and rejected "mosqeu" for "mosque".
  */
  it("counts an adjacent transposition as one, not two", () => {
    expect(editDistance("mosqeu", "mosque")).toBe(1);
    expect(editDistance("hosue", "house")).toBe(1);
  });

  it("falls back to length against an empty string", () => {
    expect(editDistance("", "house")).toBe(5);
    expect(editDistance("house", "")).toBe(5);
  });
});
