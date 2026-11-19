import { WORDS, canShowGloss, canShowNote } from "../wordsContent";

/*
  The content file's own rules, checked rather than trusted. Every gloss is
  verbatim Quran Foundation and unverified, no note has text, nothing carries
  an em dash, and the ids sit in the ranges the server seed must reuse.
*/
describe("the Quranic Words content", () => {
  it("has no em dash anywhere", () => {
    expect(JSON.stringify(WORDS).includes(String.fromCharCode(0x2014))).toBe(false);
  });

  it("takes every gloss and example verbatim from Quran Foundation, unverified", () => {
    for (const l of WORDS.lemmas) {
      expect(l.gloss?.source).toBe("qf-wbw");
      expect(l.gloss?.verified).toBe(false);
      expect(canShowGloss(l.gloss)).toBe(true);
    }
    for (const s of WORDS.skills) for (const e of s.examples) expect(e.source).toBe("qf-wbw");
  });

  it("has no hand-written notes, so none can show", () => {
    for (const n of [...WORDS.lemmas.map((l) => l.note), ...WORDS.skills.map((s) => s.note)]) {
      expect(n).toEqual({ text: null, verified: false });
      expect(canShowNote(n)).toBe(false);
    }
  });

  it("would not show a note until it is written and verified", () => {
    expect(canShowNote({ text: "x", verified: false })).toBe(false);
    expect(canShowNote({ text: "x", verified: true })).toBe(true);
  });

  it("uses the reserved id ranges, and one face per stage", () => {
    for (const s of WORDS.stages) {
      expect(s.lessonId).toBe(1000 + s.stage);
      expect(s.number).toBe(200 + s.stage);
    }
    const faces = new Set<string>();
    for (const l of WORDS.lemmas) {
      expect(l.cardId).toBe(100000 + l.id);
      const key = `${l.stage}|${l.face}`;
      expect(faces.has(key)).toBe(false);
      faces.add(key);
    }
  });

  it("reaches 80% of the Quran's words by the end of the path, and its curves only rise", () => {
    const { coverage, followable } = WORDS.path;
    expect(coverage[coverage.length - 1] / WORDS.totals.words).toBeGreaterThanOrEqual(0.8);
    for (let i = 1; i < coverage.length; i += 1) {
      expect(coverage[i]).toBeGreaterThanOrEqual(coverage[i - 1]);
      expect(followable[i]).toBeGreaterThanOrEqual(followable[i - 1]);
    }
    expect(WORDS.surahs).toHaveLength(114);
  });
});
