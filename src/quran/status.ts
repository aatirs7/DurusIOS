import { SURAHS, TOTAL_AYAHS } from "./tanzil";

/*
  Memorized and understood, per ayah, folded from the event log.

  Surah events set a whole range, ayah events set one ayah, and the later
  event wins where they overlap, so "mark the surah, then unmark one ayah"
  leaves exactly that one ayah unmarked.
*/

export type StatusEvent =
  | { type: "surah_status_set"; at: number; surah: number; memorized?: boolean; understood?: boolean }
  | { type: "ayah_status_set"; at: number; index: number; memorized?: boolean; understood?: boolean };

export type StatusMaps = { memorized: Uint8Array; understood: Uint8Array };

export function foldStatus(events: StatusEvent[]): StatusMaps {
  const memorized = new Uint8Array(TOTAL_AYAHS);
  const understood = new Uint8Array(TOTAL_AYAHS);
  /* Stable by time; equal times keep their logged order. */
  const sorted = events.map((e, i) => [e, i] as const).sort((a, b) => a[0].at - b[0].at || a[1] - b[1]);
  for (const [e] of sorted) {
    const [from, to] =
      e.type === "surah_status_set"
        ? [SURAHS[e.surah - 1].start, SURAHS[e.surah - 1].start + SURAHS[e.surah - 1].ayahs]
        : [e.index, e.index + 1];
    if (e.memorized !== undefined) memorized.fill(e.memorized ? 1 : 0, from, to);
    if (e.understood !== undefined) understood.fill(e.understood ? 1 : 0, from, to);
  }
  return { memorized, understood };
}

export function countRange(map: Uint8Array, from: number, to: number): number {
  let n = 0;
  for (let i = from; i < to; i++) n += map[i];
  return n;
}

export type Totals = {
  ayahsMemorized: number;
  surahsMemorized: number;
  ayahsUnderstood: number;
  surahsUnderstood: number;
};

export function totals(maps: StatusMaps): Totals {
  let surahsMemorized = 0;
  let surahsUnderstood = 0;
  for (const s of SURAHS) {
    if (countRange(maps.memorized, s.start, s.start + s.ayahs) === s.ayahs) surahsMemorized++;
    if (countRange(maps.understood, s.start, s.start + s.ayahs) === s.ayahs) surahsUnderstood++;
  }
  return {
    ayahsMemorized: countRange(maps.memorized, 0, TOTAL_AYAHS),
    ayahsUnderstood: countRange(maps.understood, 0, TOTAL_AYAHS),
    surahsMemorized,
    surahsUnderstood,
  };
}
