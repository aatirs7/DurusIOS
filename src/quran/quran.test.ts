import { normalizeArabic, search } from "./search";
import { foldStatus, totals } from "./status";
import { BASMALA_SPLIT, SURAHS } from "./tanzil";
import { globalIndex, quranText, refOf, searchKeys, surahForDisplay } from "./text";
import { THEMES } from "./themes";

describe("quran text", () => {
  it("has every ayah", () => {
    expect(quranText()).toHaveLength(6236);
    expect(searchKeys()).toHaveLength(6236);
  });

  it("splits the basmala off 112 surahs and the parts rejoin exactly", () => {
    expect(BASMALA_SPLIT).toHaveLength(112);
    for (const n of BASMALA_SPLIT) {
      const { basmala, ayahs } = surahForDisplay(n);
      expect(`${basmala} ${ayahs[0]}`).toBe(quranText()[SURAHS[n - 1].start]);
      expect(ayahs).toHaveLength(SURAHS[n - 1].ayahs);
    }
    expect(surahForDisplay(1).basmala).toBeNull();
    expect(surahForDisplay(9).basmala).toBeNull();
  });

  it("maps references both ways", () => {
    expect(globalIndex(2, 255)).toBe(7 + 254);
    expect(refOf(globalIndex(18, 10))).toEqual({ surah: 18, ayah: 10 });
    expect(refOf(6235)).toEqual({ surah: 114, ayah: 6 });
    expect(refOf(0)).toEqual({ surah: 1, ayah: 1 });
  });
});

describe("search", () => {
  const s = (q: string) => search(q, searchKeys);

  it("finds an ayah by reference", () => {
    expect(s("2:255").hits[0]).toMatchObject({ kind: "ayah", surah: 2, ayah: 255 });
    expect(s("2 255").hits[0]).toMatchObject({ kind: "ayah", surah: 2, ayah: 255 });
    expect(s("2:300").hits).toHaveLength(0);
  });

  it("finds surahs by number and name", () => {
    expect(s("18").hits[0]).toMatchObject({ kind: "surah", surah: 18 });
    expect(s("kahf").hits[0]).toMatchObject({ kind: "surah", surah: 18 });
    expect(s("Al-Mulk").hits[0]).toMatchObject({ kind: "surah", surah: 67 });
    expect(s("the cave").hits[0]).toMatchObject({ kind: "surah", surah: 18 });
  });

  it("finds a juz", () => {
    expect(s("juz 30").hits[0]).toMatchObject({ kind: "juz", juz: 30 });
    expect(s("juz amma").hits[0]).toMatchObject({ kind: "juz", juz: 30 });
  });

  it("matches typed Arabic against the Uthmani text through the search key", () => {
    for (const word of ["العالمين", "الصراط", "الرحمن"]) {
      const r = s(word);
      expect(r.total).toBeGreaterThan(0);
      expect(r.hits.length).toBeLessThanOrEqual(40);
    }
    expect(s("الرحمن").hits.some((h) => h.kind === "text" && h.surah === 1)).toBe(true);
  });

  it("folds harakat and alef forms", () => {
    expect(normalizeArabic("ٱلْحَمْدُ")).toBe("الحمد");
  });

  it("says a topic is under review instead of going silent", () => {
    const r = s("I feel anxious about work");
    expect(THEMES.every((t) => !t.verified)).toBe(true);
    expect(r.pendingTopic).toBe("Anxiety, worry");
    expect(r.hits.some((h) => h.kind === "theme")).toBe(false);
  });
});

describe("status fold", () => {
  it("marks a surah, then unmarks one ayah", () => {
    const start = SURAHS[111].start; // Al-Ikhlas, 4 ayahs
    const maps = foldStatus([
      { type: "surah_status_set", at: 1, surah: 112, memorized: true },
      { type: "ayah_status_set", at: 2, index: start + 2, memorized: false },
    ]);
    expect(Array.from(maps.memorized.slice(start, start + 4))).toEqual([1, 1, 0, 1]);
    expect(totals(maps).surahsMemorized).toBe(0);
    expect(totals(maps).ayahsMemorized).toBe(3);
  });

  it("lets the later event win regardless of log order", () => {
    const maps = foldStatus([
      { type: "surah_status_set", at: 5, surah: 1, understood: false },
      { type: "surah_status_set", at: 1, surah: 1, understood: true },
    ]);
    expect(totals(maps).surahsUnderstood).toBe(0);
  });
});
