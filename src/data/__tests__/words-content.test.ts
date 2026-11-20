import { ayahForDisplay } from "@/quran/text";

import { WORDS, canShowGloss, canShowNote } from "../wordsContent";
import { WORDS_MAP_ATTRIBUTION, coverageFor, surahCounts, wordsMap } from "../wordsMap";

/*
  The content file's own rules, checked rather than trusted. No English ships
  (Quran Foundation's rule), every gloss points at its Quran Foundation word, no note has text, nothing carries
  an em dash, and the ids sit in the ranges the server seed must reuse.
*/
describe("the Quranic Words content", () => {
  it("has no em dash anywhere", () => {
    expect(JSON.stringify(WORDS).includes(String.fromCharCode(0x2014))).toBe(false);
  });

  it("ships no Quran Foundation English, only where each meaning comes from", () => {
    /* Quran Foundation does not allow its word meanings in the app package
       (2026-11-20); the app fetches them after install (wordGlosses.ts). */
    for (const l of WORDS.lemmas) {
      expect(l.gloss?.source).toBe("qf-wbw");
      expect(l.gloss?.verified).toBe(false);
      expect(l.gloss?.text).toBe("");
      expect(l.gloss?.ref).toMatch(/^\d{1,3}:\d{1,3}:\d{1,3}$/);
      expect(canShowGloss(l.gloss)).toBe(false);
    }
    for (const s of WORDS.skills)
      for (const e of s.examples) {
        expect(e.source).toBe("qf-wbw");
        expect(e.gloss).toBe("");
      }
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
    const positions = WORDS.lemmas.map((l) => l.pos).sort((a, b) => a - b);
    expect(positions).toEqual(WORDS.lemmas.map((_, i) => i + 1));
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

describe("the per-word table", () => {
  const file = require("../../../assets/content/quranic-words-map.json") as { words: number; cards: number[]; attribution: string; unaligned: number[] };

  it("indexes exactly this build's cards, in order, and credits QUL", () => {
    expect(file.cards).toEqual(WORDS.lemmas.map((l) => l.cardId));
    expect(file.attribution).toBe(WORDS_MAP_ATTRIBUTION);
    expect(wordsMap()).not.toBeNull();
  });

  it("decodes to one entry per word of the Quran and one range per ayah", () => {
    const p = wordsMap()!;
    expect(p.first.length).toBe(file.words);
    expect(file.words).toBeGreaterThan(77_400);
    expect(file.words).toBeLessThan(77_450);
    expect(p.ayahStart.length).toBe(6237);
    expect(surahCounts(coverageFor([], [])!, 1).total).toBe(29);
  });

  it("lines up word for word with the reader's text wherever it says so", () => {
    const p = wordsMap()!;
    for (let g = 0; g < 6236; g += 1) {
      if (!p.aligned[g]) continue;
      expect(ayahForDisplay(g).split(" ").length).toBe(p.ayahStart[g + 1] - p.ayahStart[g]);
    }
    expect(file.unaligned.length).toBeLessThan(5);
  });

  it("reaches 80% with every card known and every skill taught, and nothing with none", () => {
    const all = coverageFor(
      WORDS.lemmas.map((l) => l.cardId),
      WORDS.skills.map((s) => s.id),
    )!;
    expect(all.known / all.total).toBeGreaterThanOrEqual(0.8);
    const none = coverageFor([], [])!;
    expect(none.known).toBe(0);
    expect(none.followableCount).toBe(0);
    /* Known cards without their skills cover much less. */
    const bare = coverageFor(WORDS.lemmas.map((l) => l.cardId), [])!;
    expect(bare.known).toBeLessThan(all.known * 0.6);
  });
});
