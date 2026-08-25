import { create } from "zustand";
import { persist } from "zustand/middleware";

import { jsonStorage, onRehydrate, type Hydratable } from "./storage";

export type ThemeChoice = "light" | "dark" | "system";

type ThemeState = Hydratable & {
  choice: ThemeChoice;
  setChoice: (next: ThemeChoice) => void;
  /* The corner glyph is two states only. System stays available in Settings for
     anyone who wants it, but a corner control that cycles three ways is a
     control you have to think about. */
  toggle: (resolvedDark: boolean) => void;
};

export const useThemeChoice = create<ThemeState>()(
  persist(
    (set) => ({
      _hydrated: false,
      markHydrated: () => set({ _hydrated: true }),
      choice: "system",
      setChoice: (choice) => set({ choice }),
      toggle: (resolvedDark) => set({ choice: resolvedDark ? "light" : "dark" }),
    }),
    {
      name: "durus:theme",
      version: 1,
      storage: jsonStorage,
      partialize: ({ _hydrated, markHydrated, ...rest }) => rest as ThemeState,
      onRehydrateStorage: onRehydrate<ThemeState>(),
    },
  ),
);
