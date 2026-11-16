import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { StatusEvent } from "@/quran/status";

import { jsonStorage, onRehydrate, type Hydratable } from "./storage";

/*
  What the user has memorized and understood, as an append-only event log.
  Folded into per-ayah maps by src/quran/status.ts.

  Device only for v1, kept out of SQLite for the same reason as Barakah (no
  migration, no lockstep change); the events are already shaped as rows for
  when they sync.
*/

type Field = "memorized" | "understood";

type QuranStatusState = Hydratable & {
  events: StatusEvent[];
  markSurahs: (surahs: number[], memorized: boolean) => void;
  setSurah: (surah: number, field: Field, on: boolean) => void;
  setAyah: (index: number, field: Field, on: boolean) => void;
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
      setSurah: (surah, field, on) =>
        set({ events: [...get().events, { type: "surah_status_set", at: Date.now(), surah, [field]: on }] }),
      setAyah: (index, field, on) =>
        set({ events: [...get().events, { type: "ayah_status_set", at: Date.now(), index, [field]: on }] }),
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
