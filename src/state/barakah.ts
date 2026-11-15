import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_TRACKED, type BarakahEvent } from "@/engine/barakah";
import { dayKey } from "@/lib/time";

import { jsonStorage, onRehydrate, type Hydratable } from "./storage";

/*
  Barakah's local state: an append-only event log, the practices being
  tracked, and the day tracking began.

  Device only, by design for v1 (the spec's "no server sync in v1"). Kept in
  its own persisted key rather than in SQLite so it adds no migration to the
  boot gate and no table the schema lockstep test would have to explain. If
  Barakah ever syncs, the event log moves to SQLite as it stands: it is
  already shaped as rows.
*/

export function localToday(): string {
  let zone = "UTC";
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    /* dayKey falls back to the device zone on a bad name anyway. */
  }
  return dayKey(new Date(), zone);
}

type BarakahState = Hydratable & {
  events: BarakahEvent[];
  tracked: string[];
  since: string | null;
  log: (day: string, practiceId: string, value: number) => void;
  setTracked: (ids: string[]) => void;
  ensureSince: () => void;
};

/* A generous cap. Roughly three years of a dozen practices with a few edits a
   day; the oldest go first, and the fold only ever reads the latest per day. */
const MAX_EVENTS = 20000;

export const useBarakah = create<BarakahState>()(
  persist(
    (set, get) => ({
      _hydrated: false,
      markHydrated: () => set({ _hydrated: true }),
      events: [],
      tracked: DEFAULT_TRACKED,
      since: null,
      log: (day, practiceId, value) => {
        const next = [...get().events, { at: Date.now(), day, practiceId, value: Math.max(0, value) }];
        set({ events: next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next });
      },
      setTracked: (tracked) => set({ tracked }),
      ensureSince: () => {
        if (get().since === null) set({ since: localToday() });
      },
    }),
    {
      name: "durus:barakah",
      version: 1,
      storage: jsonStorage,
      partialize: ({ _hydrated, markHydrated, ...rest }) => rest as BarakahState,
      onRehydrateStorage: onRehydrate<BarakahState>(),
    },
  ),
);
