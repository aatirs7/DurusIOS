import { create } from "zustand";
import { persist } from "zustand/middleware";

import { jsonStorage, onRehydrate, type Hydratable } from "./storage";

/*
  Device preferences that have no column in settings yet.

  The morning adhkar reminder lives here rather than in the settings table so it
  ships without a migration. It moves to settings, next to the other reminder
  columns, the next time that table changes for another reason.
*/
type PrefsState = Hydratable & {
  adhkarReminder: boolean;
  setAdhkarReminder: (on: boolean) => void;
};

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      _hydrated: false,
      markHydrated: () => set({ _hydrated: true }),
      adhkarReminder: false,
      setAdhkarReminder: (adhkarReminder) => set({ adhkarReminder }),
    }),
    {
      name: "durus:prefs",
      version: 1,
      storage: jsonStorage,
      partialize: ({ _hydrated, markHydrated, ...rest }) => rest as PrefsState,
      onRehydrateStorage: onRehydrate<PrefsState>(),
    },
  ),
);
