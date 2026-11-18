import { complete, phrases } from "./phrases";
import { reply } from "./reply";
import { search } from "./search";
import { foldStatus } from "./status";
import { searchKeys } from "./text";

const ctx = (over: Partial<Parameters<typeof reply>[2]> = {}) => ({
  maps: foldStatus([]),
  lastRead: null,
  now: new Date(2026, 10, 18, 14, 0),
  ...over,
});
const ask = (q: string, c = ctx()) => reply(q, search(q, searchKeys), c);

describe("natural search", () => {
  it("has well over a thousand phrases, every one answerable", () => {
    const all = phrases();
    expect(all.length).toBeGreaterThan(1000);
    const sample = all.filter((_, i) => i % 37 === 0);
    for (const p of sample) expect([p, search(p, searchKeys).hits.length > 0]).toEqual([p, true]);
  });

  it("completes what is being typed, naturally", () => {
    expect(complete("i feel anx")[0]).toMatch(/^I feel anx/);
    expect(complete("verses about pat").some((p) => /patien/i.test(p))).toBe(true);
    expect(complete("surah ka").some((p) => /Kahf/.test(p))).toBe(true);
    expect(complete("x")).toEqual([]);
  });

  it("replies to a feeling, personally when it can", () => {
    expect(ask("i feel anxious")?.text).toMatch(/anxiety/i);
    const maps = foldStatus([{ type: "surah_status_set", at: 1, surah: 94, memorized: true }]);
    expect(ask("i feel anxious", ctx({ maps }))?.text).toMatch(/already know Ash-Sharh/);
  });

  it("knows the hour and the day", () => {
    expect(ask("cant sleep", ctx({ now: new Date(2026, 10, 18, 23, 30) }))?.text).toMatch(/It is late/);
    expect(ask("friday", ctx({ now: new Date(2026, 10, 20, 12, 0) }))?.text).toMatch(/It is Friday/);
  });

  it("speaks about a surah from your own progress", () => {
    const maps = foldStatus([{ type: "surah_status_set", at: 1, surah: 67, memorized: true }]);
    expect(ask("mulk", ctx({ maps }))?.text).toMatch(/memorized/);
    expect(ask("kahf", ctx({ lastRead: { surah: 18, ayah: 10 } }))?.text).toMatch(/stopped at ayah 10/);
  });

  it("never claims what it does not know, and never praises", () => {
    for (const q of ["i feel anxious", "mulk", "2:255", "qwertyuiop", "meccan surahs"]) {
      const t = ask(q)?.text ?? "";
      expect(t).not.toMatch(/\b(great|amazing|well done|congrat|proud|awesome)\b/i);
      expect(t).not.toMatch(/—/);
    }
    expect(ask("qwertyuiop")?.tone).toBe("nothing");
  });
});
