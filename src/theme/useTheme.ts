import { useMemo } from "react";
import {
  StyleSheet,
  useColorScheme,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { THEMES, type SchemeKey, type Theme } from "./tokens";

/*
  Durus has a real light mode - it is the icon's own colours - so the scheme
  follows the system rather than being a stored choice, matching app.json's
  userInterfaceStyle: "automatic". This is the one place useColorScheme is read.
*/
export function useTheme(): Theme {
  const scheme = useColorScheme();
  return THEMES[(scheme ?? "light") as SchemeKey] ?? THEMES.light;
}

/*
  Typed as RN's own style shapes rather than `object`, so the callback's literals
  get a contextual type. Without it, `alignItems: "center"` widens to string and
  every consumer fails to assign the result to a style prop.
*/
type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

/**
 * StyleSheet.create cannot take dynamic values, so theme dependent styles are
 * built once per palette and cached. The cache is bounded at two entries, one
 * per scheme, so it never grows.
 *
 * Use at module scope:  const useStyles = makeStyles((t) => ({ ... }))
 * then call it as a hook inside the component.
 */
export function makeStyles<T extends NamedStyles>(fn: (t: Theme) => T) {
  const cache = new Map<SchemeKey, T>();
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => {
      const hit = cache.get(theme.key);
      if (hit) return hit;
      const made = StyleSheet.create<T>(fn(theme));
      cache.set(theme.key, made);
      return made;
    }, [theme]);
  };
}
