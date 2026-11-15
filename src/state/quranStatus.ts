import { create } from "zustand";
import { persist } from "zustand/middleware";

import { jsonStorage, onRehydrate, type Hydratable } from "./storage";

/*
  What the user has memorized and understood, as an append-only event log.

  The spec's `events` table, in miniature: `surah_status_set` events only for
  now, written by onboarding's hifz step after sign in. Device only for v1, kept
  out of SQLite for the same reason as Barakah (no migration, no lockstep
  change); the events are already shaped as rows for when they sync.
*/

export type SurahStatusEvent = {
  type: "surah_status_set";
  at: number;
  surah: number;
  memorized?: boolean;
  understood?: boolean;
};

type QuranStatusState = Hydratable & {
  events: SurahStatusEvent[];
  markSurahs: (surahs: number[], memorized: boolean) => void;
};

export const useQuranStatus = create<QuranStatusState>()(
  persist(
    (set, get) => ({
      _hydrated: false,
      markHydrated: () => set({ _hydrated: true }),
      events: [],
      markSurahs: (surahs, memorized) => {
        const at = Date.now();
        set({
          events: [...get().events, ...surahs.map((surah) => ({ type: "surah_status_set" as const, at, surah, memorized }))],
        });
      },
    }),
    {
      name: "durus:quran-status",
      version: 1,
      storage: jsonStorage,
      partialize: ({ _hydrated, markHydrated, ...rest }) => rest as QuranStatusState,
      onRehydrateStorage: onRehydrate<QuranStatusState>(),
    },
  ),
);

/* Surahs whose latest event says memorized. */
export function memorizedSurahs(events: SurahStatusEvent[]): Set<number> {
  const latest = new Map<number, boolean>();
  for (const e of [...events].sort((a, b) => a.at - b.at)) if (e.memorized !== undefined) latest.set(e.surah, e.memorized);
  return new Set([...latest].filter(([, v]) => v).map(([k]) => k));
}
