import { segmentRuns, splitNote, splitSentences } from "./note";

const L3 =
  "The definite article ال. When ال is prefixed, the tanwin drops. " +
  "Of the 28 letters, 14 are Solar and 14 are Lunar. Before a Solar letter the " +
  "ل assimilates. Lunar letters do not assimilate.";

describe("segmentRuns", () => {
  it("separates Arabic from Latin", () => {
    const runs = segmentRuns("The article ال is prefixed.");
    expect(runs.map((r) => r.arabic)).toEqual([false, true, false]);
    expect(runs[1].text).toBe("ال");
  });

  it("keeps an Arabic phrase in one run rather than one run per word", () => {
    const runs = segmentRuns("so الشمس القمر is read");
    expect(runs.filter((r) => r.arabic)).toHaveLength(1);
  });

  it("round trips: the runs rebuild the original exactly", () => {
    const text = "هٰذا \"this\". Arabic has no copula, so هٰذا بيت is complete.";
    expect(segmentRuns(text).map((r) => r.text).join("")).toBe(text);
  });

  it("handles a string with no Arabic at all", () => {
    expect(segmentRuns("Plain English.")).toEqual([{ arabic: false, text: "Plain English." }]);
  });
});

describe("splitSentences", () => {
  it("splits on a full stop followed by a new sentence", () => {
    expect(splitSentences(L3)).toHaveLength(5);
  });

  it("does not split a decimal", () => {
    expect(splitSentences("It grows by 1.3 each time. Then it stops.")).toHaveLength(2);
  });

  it("splits before an Arabic word, not only before a capital", () => {
    const out = splitSentences("That is the rule. البيت is the example.");
    expect(out).toHaveLength(2);
  });
});

describe("splitNote", () => {
  it("groups sentences into short steps", () => {
    const steps = splitNote(L3);
    expect(steps.length).toBeGreaterThan(1);
    expect(steps.every((s) => s.length <= 3)).toBe(true);
  });

  /* A step holding one trailing sentence reads as though something is missing,
     and in these notes the last sentence is usually a footnote to the one
     before it. */
  it("folds a lone trailing sentence back rather than showing it alone", () => {
    const steps = splitNote("One. Two. Three.");
    expect(steps).toHaveLength(1);
    expect(steps[0]).toHaveLength(3);
  });

  it("loses no sentence, whatever the grouping", () => {
    expect(splitNote(L3).flat()).toEqual(splitSentences(L3));
  });

  it("returns nothing for an empty note", () => {
    expect(splitNote("")).toEqual([]);
  });
});
