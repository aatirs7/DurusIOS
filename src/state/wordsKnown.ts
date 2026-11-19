import { useMemo } from "react";
import { create } from "zustand";

import { coverageFor, type WordsCoverage } from "@/data/wordsMap";

/*
  What the learner knows of the Quranic Words track, for the screens that do
  not read the database themselves (Read and the Map).

  Not persisted: it is a snapshot of the SQLite review state, refreshed by
  refreshWordsKnown (src/data/words.ts) at boot, whenever Learn comes into
  focus and after each graded answer. A stamp changes with every refresh so
  the per-word figures are worked out once per change and shared.
*/

type WordsKnownState = {
  /* Any word of the track met: Read and the Map stay quiet until then. */
  started: boolean;
  known: readonly number[];
  taught: readonly number[];
  stamp: number;
  publish: (k: { started: boolean; known: readonly number[]; taught: readonly number[] }) => void;
};

export const useWordsKnown = create<WordsKnownState>()((set, get) => ({
  started: false,
  known: [],
  taught: [],
  stamp: 0,
  publish: (k) => {
    const cur = get();
    const same =
      cur.started === k.started &&
      cur.known.length === k.known.length &&
      cur.taught.length === k.taught.length &&
      cur.known.every((x, i) => x === k.known[i]) &&
      cur.taught.every((x, i) => x === k.taught[i]);
    if (same) return;
    set({ ...k, stamp: cur.stamp + 1 });
  },
}));

let cache: { stamp: number; value: WordsCoverage | null } | null = null;

/*
  The exact per-word coverage for the current snapshot, or null when the
  learner has not started the track (or the word table is unavailable).
*/
export function useWordsCoverage(): WordsCoverage | null {
  const started = useWordsKnown((st) => st.started);
  const stamp = useWordsKnown((st) => st.stamp);
  return useMemo(() => {
    if (!started) return null;
    if (cache && cache.stamp === stamp) return cache.value;
    const { known, taught } = useWordsKnown.getState();
    const value = coverageFor(known, taught);
    cache = { stamp, value };
    return value;
  }, [started, stamp]);
}
