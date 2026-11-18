import { progress, readingWeek } from "./progress";
import { normalizeArabic, search } from "./search";
import { foldStatus, totals } from "./status";
import { BASMALA_SPLIT, SURAHS } from "./tanzil";
import { ayahForDisplay, globalIndex, quranText, refOf, searchKeys, surahForDisplay } from "./text";
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

  it("shows a first ayah without its basmala everywhere", () => {
    expect(ayahForDisplay(SURAHS[1].start)).toBe(surahForDisplay(2).ayahs[0]);
    expect(ayahForDisplay(0)).toBe(quranText()[0]);
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

  it("does not match the basmala on the first ayah of every surah", () => {
    const r = s("الرحيم");
    expect(r.hits.some((h) => h.kind === "text" && h.surah === 2 && h.ayah === 1)).toBe(false);
    expect(r.hits.some((h) => h.kind === "text" && h.surah === 1 && h.ayah === 1)).toBe(true);
  });

  it("folds harakat and alef forms", () => {
    expect(normalizeArabic("ٱلْحَمْدُ")).toBe("الحمد");
  });

  it("answers feelings in many phrasings", () => {
    const topic = (q: string) => s(q).hits.find((h) => h.kind === "theme");
    const cases: [string, string][] = [
      ["I feel anxious about work", "anxiety"],
      ["im so stressed rn", "anxiety"],
      ["worrying about everything", "anxiety"],
      ["i cant sleep", "sleep"],
      ["what should i read before bed", "sleep"],
      ["my grandmother passed away", "grief"],
      ["feeling really grateful today", "gratitude"],
      ["i feel far from allah", "distant"],
      ["verses about patience", "patience"],
      ["going through a hard time", "patience"],
      ["i messed up and want to repent", "repent"],
      ["jumuah", "friday"],
      ["anxeity", "anxiety"],
    ];
    for (const [q, id] of cases) expect([q, (topic(q) as { theme: { id: string } } | undefined)?.theme.id]).toEqual([q, id]);
  });

  it("does not send unrelated queries to an approved topic", () => {
    const topIds = (q: string) => s(q).hits.filter((h) => h.kind === "theme").map((h) => (h as { theme: { id: string } }).theme.id);
    expect(topIds("night prayer")).not.toContain("sleep");
    expect(topIds("test tomorrow")).not.toContain("patience");
    expect(topIds("far away")).not.toContain("distant");
    expect(topIds("table of contents")).not.toContain("gratitude");
  });

  it("names a topic under review instead of going silent", () => {
    const r = s("verses about parents");
    expect(r.hits.some((h) => h.kind === "theme")).toBe(false);
    expect(r.pendingTopic).toBe("Parents");
  });

  it("answers general questions from the metadata", () => {
    expect(s("longest surah").label).toMatch(/Longest/);
    expect(s("longest surah").hits[0]).toMatchObject({ kind: "surah", surah: 2 });
    expect(s("meccan surahs").hits.length).toBe(86);
    expect(s("medinan surahs").hits.length).toBe(28);
    expect(s("last ten surahs").hits.length).toBe(10);
    expect(s("surahs with 7 ayahs").hits.some((h) => h.kind === "surah" && h.surah === 1)).toBe(true);
    expect(s("surprise me").hits[0].kind).toBe("ayah");
  });

  it("keeps surah names ahead of topics when the name is exact", () => {
    expect(s("yusuf").hits[0]).toMatchObject({ kind: "surah", surah: 12 });
  });

  it("only verified topics are ever returned, and every ref is real", () => {
    for (const t of THEMES) {
      for (const r of t.refs) {
        const [sn, range] = r.split(":");
        const surah = SURAHS[Number(sn) - 1];
        expect([r, !!surah]).toEqual([r, true]);
        if (range) for (const a of range.split("-").map(Number)) expect([r, a >= 1 && a <= surah.ayahs]).toEqual([r, true]);
      }
      expect(`${t.label}${t.keywords.join("")}`).not.toMatch(/\u2014/);
    }
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
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

describe("progress", () => {
  it("counts surahs, juz, pages and words", () => {
    const maps = foldStatus(SURAHS.slice(77).map((x) => ({ type: "surah_status_set" as const, at: 1, surah: x.n, memorized: true })));
    const p = progress(maps, quranText);
    expect(p.surahsMemorized).toBe(37);
    expect(p.juzMemorized).toBe(1);
    expect(p.juz[29].memorized).toBe(1);
    expect(p.pagesMemorized).toBeGreaterThanOrEqual(22);
    expect(p.wordsMemorized).toBeGreaterThan(0);
    expect(p.totalWords).toBeGreaterThan(70000);
  });

  it("builds a reading week", () => {
    const w = readingWeek({ "2026-11-18": [1, 2, 3], "2026-11-12": [9] }, "2026-11-18");
    expect(w).toHaveLength(7);
    expect(w[6]).toEqual({ day: "2026-11-18", count: 3 });
    expect(w[0]).toEqual({ day: "2026-11-12", count: 1 });
  });
});
