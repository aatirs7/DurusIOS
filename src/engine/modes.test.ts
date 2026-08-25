import { THRESHOLDS, feedbackFor, gradeFor, modeFor } from "./modes";

describe("modeFor", () => {
  it("starts a new word on multiple choice", () => {
    expect(modeFor({ type: "vocab", repetitions: 0 }, "recognition")).toBe(
      "choice",
    );
    expect(modeFor({ type: "vocab", repetitions: 1 }, "recognition")).toBe(
      "choice",
    );
  });

  it("escalates a known word to typing", () => {
    expect(modeFor({ type: "vocab", repetitions: 2 }, "recognition")).toBe(
      "written",
    );
    expect(modeFor({ type: "vocab", repetitions: 9 }, "recognition")).toBe(
      "written",
    );
  });

  it("never asks a phrase to be typed out", () => {
    expect(modeFor({ type: "phrase", repetitions: 9 }, "recognition")).toBe(
      "choice",
    );
  });

  it("starts production on choice as well", () => {
    expect(modeFor({ type: "vocab", repetitions: 0 }, "production")).toBe(
      "choice",
    );
    expect(modeFor({ type: "vocab", repetitions: 1 }, "production")).toBe(
      "choice",
    );
  });

  /*
    The fourth rung. Producing the script is asked by building the word
    from its letters rather than by typing, because an Arabic keyboard
    with correct harakat is a bigger ask than the recall is.
  */
  it("escalates production to assembling the letters", () => {
    expect(modeFor({ type: "vocab", repetitions: 2 }, "production")).toBe(
      "assemble",
    );
  });

  it("keeps phrases on choice in both directions", () => {
    expect(modeFor({ type: "phrase", repetitions: 9 }, "production")).toBe(
      "choice",
    );
    expect(modeFor({ type: "phrase", repetitions: 9 }, "recognition")).toBe(
      "choice",
    );
  });
});

describe("gradeFor", () => {
  const choice = THRESHOLDS.choice;

  it("grades a wrong answer again however fast it was", () => {
    expect(
      gradeFor({ correct: false, msToAnswer: 200, mode: "choice" }),
    ).toBe("again");
  });

  it("grades a fast correct answer easy", () => {
    expect(
      gradeFor({ correct: true, msToAnswer: choice.fast - 1, mode: "choice" }),
    ).toBe("easy");
  });

  it("grades a slow correct answer hard", () => {
    expect(
      gradeFor({ correct: true, msToAnswer: choice.slow + 1, mode: "choice" }),
    ).toBe("hard");
  });

  it("grades an ordinary correct answer good", () => {
    const mid = (choice.fast + choice.slow) / 2;
    expect(gradeFor({ correct: true, msToAnswer: mid, mode: "choice" })).toBe(
      "good",
    );
  });

  it("never gives easy for a misspelling, however fast", () => {
    expect(
      gradeFor({
        correct: true,
        close: true,
        msToAnswer: 100,
        mode: "written",
      }),
    ).toBe("good");
  });

  it("still gives hard for a slow misspelling", () => {
    expect(
      gradeFor({
        correct: true,
        close: true,
        msToAnswer: THRESHOLDS.written.slow + 1,
        mode: "written",
      }),
    ).toBe("hard");
  });

  it("uses a longer window for typing than for tapping", () => {
    // 5s is fluent when typing and slow when tapping.
    expect(gradeFor({ correct: true, msToAnswer: 5000, mode: "written" })).toBe(
      "easy",
    );
    expect(gradeFor({ correct: true, msToAnswer: 5000, mode: "choice" })).toBe(
      "good",
    );
  });
});

describe("feedbackFor", () => {
  it("says what happened without praising", () => {
    expect(feedbackFor({ correct: false, msToAnswer: 0, mode: "choice" }, "again")).toBe(
      "Not that one.",
    );
    expect(
      feedbackFor({ correct: true, close: true, msToAnswer: 0, mode: "written" }, "good"),
    ).toBe("Right, with a spelling slip.");
    expect(feedbackFor({ correct: true, msToAnswer: 0, mode: "choice" }, "easy")).toBe(
      "Straight away.",
    );
  });
});
