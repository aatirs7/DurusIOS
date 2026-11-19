import { ayahCoverage, decodeWordsMap, knownWordFlags, skillMask, type PackedWords } from "@/engine/words";
import { SURAHS } from "@/quran/tanzil";

import { WORDS } from "./wordsContent";

/*
  The per-word table of the Quranic Words track, as bundled
  (assets/content/quranic-words-map.json, built by
  scripts/coverage/build_words_map.py from the Quranic Universal Library's
  lemma and stem data, credited as WORDS_MAP_ATTRIBUTION).

  For every word of the Quran in order: its card (if the word belongs to the
  track) and the parsing skills joined to it. Words follow Tanzil's word
  division, so in every ayah but one (37:130) word i of the table is the i-th
  space-separated word of the reader's text, after the basmala header.

  Loaded lazily, like the Quran text: launch should not pay for it. Decoded
  once into typed arrays; a coverage figure is then one pass over them.
*/

type MapFile = {
  attribution: string;
  words: number;
  skillChars: string;
  cards: number[];
  unaligned: number[];
  ayahs: string[];
};

export const WORDS_MAP_ATTRIBUTION = "Morphology data from the Quranic Universal Library (Tarteel)";

let packed: PackedWords | null | undefined;
let cardIndex: Map<number, number> | null = null;

/*
  The decoded table, or null when it does not belong to this build's cards
  (a content file rebuilt without the table): the app then falls back to the
  precomputed path curves rather than counting against the wrong cards.
*/
export function wordsMap(): PackedWords | null {
  if (packed !== undefined) return packed;
  const file = require("../../assets/content/quranic-words-map.json") as MapFile;
  const ids = WORDS.lemmas.map((l) => l.cardId);
  const matches = file.cards.length === ids.length && file.cards.every((c, i) => c === ids[i]);
  if (!matches) {
    packed = null;
    return packed;
  }
  packed = decodeWordsMap(file);
  cardIndex = new Map(ids.map((c, i) => [c, i]));
  return packed;
}

export function wordsMapTotal(): number {
  return wordsMap()?.first.length ?? WORDS.totals.words;
}

export type WordsCoverage = {
  /* One flag per word of the Quran. */
  words: Uint8Array;
  /* Known words per global ayah, and whether each is mostly followable. */
  ayahKnown: Uint16Array;
  followable: Uint8Array;
  followableCount: number;
  known: number;
  total: number;
};

/* The exact rule over the whole Quran, for these known cards and skills. */
export function coverageFor(knownCardIds: Iterable<number>, taughtSkillIds: Iterable<number>): WordsCoverage | null {
  const p = wordsMap();
  if (!p || !cardIndex) return null;
  const known = new Uint8Array(WORDS.lemmas.length);
  for (const id of knownCardIds) {
    const i = cardIndex.get(id);
    if (i !== undefined) known[i] = 1;
  }
  const words = knownWordFlags(p, known, skillMask(taughtSkillIds));
  const a = ayahCoverage(p, words);
  return {
    words,
    ayahKnown: a.known,
    followable: a.followable,
    followableCount: a.followableCount,
    known: a.knownTotal,
    total: p.first.length,
  };
}

/* Known words and all words in one surah. */
export function surahCounts(c: WordsCoverage, surah: number): { known: number; total: number } {
  const p = wordsMap()!;
  const m = SURAHS[surah - 1];
  let known = 0;
  for (let g = m.start; g < m.start + m.ayahs; g += 1) known += c.ayahKnown[g];
  return { known, total: p.ayahStart[m.start + m.ayahs] - p.ayahStart[m.start] };
}

let surahCardsCache: number[][] | null = null;

/*
  The track's cards that occur in a surah, most frequent in the whole Quran
  first (spec 9: "its unknown lemmas ordered by global frequency").
*/
export function surahCards(surah: number): number[] {
  const p = wordsMap();
  if (!p) return [];
  if (!surahCardsCache) {
    const freq = WORDS.lemmas.map((l) => l.freq);
    surahCardsCache = SURAHS.map((m) => {
      const set = new Set<number>();
      for (let i = p.ayahStart[m.start]; i < p.ayahStart[m.start + m.ayahs]; i += 1) {
        if (p.first[i] >= 0) set.add(p.first[i]);
        if (p.second[i] >= 0) set.add(p.second[i]);
      }
      return [...set].sort((a, b) => freq[b] - freq[a] || a - b).map((i) => WORDS.lemmas[i].cardId);
    });
  }
  return surahCardsCache[surah - 1] ?? [];
}
