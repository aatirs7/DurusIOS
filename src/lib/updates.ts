import { useEffect } from "react";
import { AppState } from "react-native";

/*
  Pick up a new over-the-air update straight away instead of on the launch
  after next. On a cold start, and whenever the app returns to the
  foreground, ask for an update; if one is ready, fetch it and restart into
  it. Quiet on failure (offline, dev builds), so it can never block the app.
*/
async function pull() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Updates: typeof import("expo-updates") = require("expo-updates");
    if (__DEV__ || !Updates.isEnabled) return;
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return;
    const got = await Updates.fetchUpdateAsync();
    if (got.isNew) await Updates.reloadAsync();
  } catch {
    /* Next launch will try again. */
  }
}

export function useLiveUpdates() {
  useEffect(() => {
    /* A moment after launch, once the first screen has drawn. */
    const first = setTimeout(() => void pull(), 2500);
    let last = Date.now();
    const sub = AppState.addEventListener("change", (s) => {
      /* At most once a minute, so flicking between apps does not spam it. */
      if (s === "active" && Date.now() - last > 60_000) {
        last = Date.now();
        void pull();
      }
    });
    return () => {
      clearTimeout(first);
      sub.remove();
    };
  }, []);
}
