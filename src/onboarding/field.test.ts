import { dotsPath, juzSizes, layoutField } from "./field";
import { AYAHS, JUZ_STARTS, SURAHS, TOTAL_AYAHS } from "./tanzil";

describe("tanzil metadata", () => {
  it("has the whole mushaf", () => {
    expect(SURAHS).toHaveLength(114);
    expect(TOTAL_AYAHS).toBe(6236);
    expect(SURAHS.reduce((n, s) => n + s.ayahs, 0)).toBe(6236);
    for (let i = 1; i < SURAHS.length; i++) expect(SURAHS[i].start).toBe(SURAHS[i - 1].start + SURAHS[i - 1].ayahs);
  });

  it("has thirty juz in order, and Juz Amma holds surahs 78 to 114", () => {
    expect(JUZ_STARTS).toHaveLength(30);
    for (let i = 1; i < 30; i++) expect(JUZ_STARTS[i]).toBeGreaterThan(JUZ_STARTS[i - 1]);
    expect(JUZ_STARTS[29]).toBe(SURAHS[77].start);
  });

  it("carries only the five onboarding ayahs", () => {
    expect(new Set(Object.keys(AYAHS))).toEqual(new Set(["1:1", "1:2", "1:3", "13:28", "94:5"]));
  });

  it("never carries an em dash in its names", () => {
    for (const s of SURAHS) expect(`${s.ar}${s.en}`).not.toMatch(/\u2014/);
  });
});

describe("ayah field layout", () => {
  it("fits all 6,236 dots in the box", () => {
    const l = layoutField(390, 420, JUZ_STARTS, TOTAL_AYAHS);
    expect(l.x).toHaveLength(6236);
    for (let i = 0; i < 6236; i++) {
      expect(l.x[i]).toBeGreaterThan(0);
      expect(l.x[i]).toBeLessThan(390);
      expect(l.y[i]).toBeLessThanOrEqual(420);
    }
  });

  it("starts each juz on a new row", () => {
    const l = layoutField(390, 420, JUZ_STARTS, TOTAL_AYAHS);
    for (const start of JUZ_STARTS.slice(1)) expect(l.y[start]).toBeGreaterThan(l.y[start - 1]);
  });

  it("sizes the juz from their starts", () => {
    expect(juzSizes(JUZ_STARTS, TOTAL_AYAHS).reduce((a, b) => a + b, 0)).toBe(6236);
  });

  it("draws one subpath per picked dot", () => {
    const l = layoutField(200, 200, JUZ_STARTS, TOTAL_AYAHS);
    expect(dotsPath(l, (i) => i < 3).match(/M/g)).toHaveLength(3);
  });
});
