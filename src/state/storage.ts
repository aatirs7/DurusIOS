import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage } from "zustand/middleware";

/*
  Local persistence for preferences and session position only. Card data lives
  in SQLite; this is for the handful of values that are cheaper to read
  synchronously at boot than to query.

  Separate keys rather than one blob, so a corrupt value loses a single concern
  instead of everything.
*/
export const SCHEMA_VERSION = 1;

export const KEYS = {
  session: "durus:session",
} as const;

export const jsonStorage = createJSONStorage(() => AsyncStorage);

/**
 * Marker every persisted store carries so the boot gate can wait for hydration
 * before deciding which route to show. Without it the app flashes onboarding at
 * users who finished it months ago.
 */
export type Hydratable = {
  _hydrated: boolean;
  /**
   * Must go through an action so zustand calls set() and notifies subscribers.
   * Assigning to the rehydrated state object directly does mutate it, but no
   * listener ever fires, so every component reading _hydrated stays false
   * forever and the app hangs on the splash screen.
   */
  markHydrated: () => void;
};

export const onRehydrate =
  <T extends Hydratable>() =>
  () =>
  (state?: T, error?: unknown) => {
    if (error) {
      // A corrupt or unreadable value must not strand the user on the splash.
      // Carrying on with defaults is always better than never booting.
      console.warn("[durus] rehydrate failed, continuing with defaults", error);
    }
    state?.markHydrated();
  };
