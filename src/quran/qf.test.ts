import raw from "./__fixtures__/qf-verses-1.json";
import { RESYNC_MS, footnoteIds, isStale, normalizeVerse, parseTranslation, type RawVerse } from "./qf";

/* The fixture is a trimmed real prelive response for Al-Fatiha 1:1 and 1:2. */
describe("quran foundation shapes", () => {
  it("normalizes words, dropping the end marker", () => {
    const a = normalizeVerse((raw as unknown as { verses: RawVerse[] }).verses[1], null);
    expect(a.key).toBe("1:2");
    expect(a.words).toHaveLength(4);
    expect(a.words[0]).toMatchObject({ position: 1, translit: "al-ḥamdu" });
    expect(a.words[0].meaning).toBeTruthy();
    expect(a.words[0].audio).toBe("https://audio.qurancdn.com/wbw/001_002_001.mp3");
    expect(a.audio?.url).toBe("https://verses.quran.foundation/Alafasy/mp3/001002.mp3");
    expect(a.audio?.segments.length).toBeGreaterThan(0);
  });

  it("turns footnote marks into parts and strips other markup", () => {
    const parts = parseTranslation("Alif, Lam, Mim.<sup foot_note=194645>1</sup> This is <i>the</i> Book &amp; more");
    expect(parts).toEqual([{ text: "Alif, Lam, Mim." }, { footnote: 194645, mark: "1" }, { text: " This is the Book & more" }]);
    expect(footnoteIds(parts)).toEqual([194645]);
  });

  it("knows when a copy is due for refresh", () => {
    expect(isStale({ fetchedAt: 0 }, RESYNC_MS + 1)).toBe(true);
    expect(isStale({ fetchedAt: 0 }, RESYNC_MS - 1)).toBe(false);
  });
});
