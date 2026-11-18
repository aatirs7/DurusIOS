import { countRange, type StatusEvent, type StatusMaps } from "./status";
import { JUZ_STARTS, PAGE_STARTS, SURAHS, TOTAL_AYAHS } from "./tanzil";

/*
  Everything the Progress tab reports, computed from the status maps, the
  reading log and the text. Pure, so the numbers are tested.
*/

export type Progress = {
  ayahsMemorized: number;
  ayahsUnderstood: number;
  surahsMemorized: number;
  surahsUnderstood: number;
  juzMemorized: number;
  pagesMemorized: number;
  wordsMemorized: number;
  totalWords: number;
  /* Memorized fraction of each juz, 1 to 30. */
  juz: { memorized: number; understood: number }[];
  /* Surahs with some but not all ayahs memorized. */
  inProgress: number;
};

function ranges(starts: number[]): [number, number][] {
  return starts.map((s, i) => [s, i + 1 < starts.length ? starts[i + 1] : TOTAL_AYAHS]);
}

const JUZ_RANGES = ranges(JUZ_STARTS);
const PAGE_RANGES = ranges(PAGE_STARTS);

let wordCounts: Uint16Array | null = null;
function words(text: () => string[]): Uint16Array {
  if (!wordCounts) {
    const t = text();
    wordCounts = new Uint16Array(t.length);
    for (let i = 0; i < t.length; i++) wordCounts[i] = t[i].split(" ").length;
  }
  return wordCounts;
}

export function progress(maps: StatusMaps, text: () => string[]): Progress {
  const w = words(text);
  let wordsMemorized = 0;
  let totalWords = 0;
  for (let i = 0; i < TOTAL_AYAHS; i++) {
    totalWords += w[i];
    if (maps.memorized[i]) wordsMemorized += w[i];
  }
  let surahsMemorized = 0;
  let surahsUnderstood = 0;
  let inProgress = 0;
  for (const s of SURAHS) {
    const m = countRange(maps.memorized, s.start, s.start + s.ayahs);
    if (m === s.ayahs) surahsMemorized++;
    else if (m > 0) inProgress++;
    if (countRange(maps.understood, s.start, s.start + s.ayahs) === s.ayahs) surahsUnderstood++;
  }
  const juz = JUZ_RANGES.map(([a, b]) => ({
    memorized: countRange(maps.memorized, a, b) / (b - a),
    understood: countRange(maps.understood, a, b) / (b - a),
  }));
  return {
    ayahsMemorized: countRange(maps.memorized, 0, TOTAL_AYAHS),
    ayahsUnderstood: countRange(maps.understood, 0, TOTAL_AYAHS),
    surahsMemorized,
    surahsUnderstood,
    juzMemorized: juz.filter((j) => j.memorized === 1).length,
    pagesMemorized: PAGE_RANGES.filter(([a, b]) => countRange(maps.memorized, a, b) === b - a).length,
    wordsMemorized,
    totalWords,
    juz,
    inProgress,
  };
}

/* Distinct ayahs read on each of the last `days` days, oldest first. */
export function readingWeek(log: Record<string, number[]>, today: string, days = 7): { day: string; count: number }[] {
  const out: { day: string; count: number }[] = [];
  const d = new Date(`${today}T12:00:00Z`);
  for (let i = days - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setUTCDate(d.getUTCDate() - i);
    const key = x.toISOString().slice(0, 10);
    out.push({ day: key, count: log[key]?.length ?? 0 });
  }
  return out;
}

/* The latest marks, newest first, collapsed to one line each. */
export function recentMarks(events: StatusEvent[], limit = 5): { at: number; text: string }[] {
  return [...events]
    .sort((a, b) => b.at - a.at)
    .slice(0, limit)
    .map((e) => {
      const what = e.memorized !== undefined ? (e.memorized ? "memorized" : "not memorized") : e.understood ? "understood" : "not understood";
      if (e.type === "surah_status_set") return { at: e.at, text: `${SURAHS[e.surah - 1].en} marked ${what}` };
      let s = SURAHS[0];
      for (const x of SURAHS) if (x.start <= e.index) s = x;
      return { at: e.at, text: `${s.en} ${s.n}:${e.index - s.start + 1} marked ${what}` };
    });
}

export function ago(at: number, now: number): string {
  const m = Math.round((now - at) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}
