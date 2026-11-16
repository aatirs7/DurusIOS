import { BASMALA_SPLIT, SURAHS, type SurahMeta } from "./tanzil";

/*
  Access to the full Quran text (Tanzil Uthmani, verbatim) and its search key.

  Loaded lazily: the text is about 1.3 MB, and launch and the Learn tab should
  not pay for it. The first Read, Map or search use pulls it in once.

  Rendering rule: this text is always shown with its harakat, in the Quran
  face, never through the Arabic component or the user's harakat setting, and
  never selectable.
*/

type TextFile = { text: string[] };

let uthmani: string[] | null = null;
let search: string[] | null = null;

export function quranText(): string[] {
  if (!uthmani) {
    uthmani = (require("../../assets/quran/uthmani.json") as TextFile).text;
  }
  return uthmani;
}

/* The Simple Clean text. A search key only: never displayed. */
export function searchKeys(): string[] {
  if (!search) {
    search = (require("../../assets/quran/search.json") as TextFile).text;
  }
  return search;
}

export function surahMeta(n: number): SurahMeta {
  return SURAHS[n - 1];
}

/* Global index from 0 for surah:ayah. */
export function globalIndex(surah: number, ayah: number): number {
  return SURAHS[surah - 1].start + ayah - 1;
}

export function refOf(index: number): { surah: number; ayah: number } {
  let lo = 0;
  let hi = SURAHS.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (SURAHS[mid].start <= index) lo = mid;
    else hi = mid - 1;
  }
  return { surah: SURAHS[lo].n, ayah: index - SURAHS[lo].start + 1 };
}

const SPLIT = new Set(BASMALA_SPLIT);

/*
  A surah's ayahs for display, plus its basmala header where it has one.

  The header is words 1 to 4 of the first ayah's line and the first ayah shown
  is the rest of that line. The generator proves the two rejoin to the
  original exactly, so nothing is added or removed.
*/
export function surahForDisplay(n: number): { basmala: string | null; ayahs: string[] } {
  const meta = SURAHS[n - 1];
  const all = quranText().slice(meta.start, meta.start + meta.ayahs);
  if (!SPLIT.has(n)) return { basmala: null, ayahs: all };
  const words = all[0].split(" ");
  return { basmala: words.slice(0, 4).join(" "), ayahs: [words.slice(4).join(" "), ...all.slice(1)] };
}
