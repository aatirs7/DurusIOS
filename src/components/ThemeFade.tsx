import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, { Easing, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { THEMES } from "@/theme/tokens";

/*
  A soft change of theme instead of a snap, every step continuous:
    1. a veil in the OLD background colour gathers over the app, so the screen
       settles into its own tone rather than flashing a new one;
    2. the theme switches underneath, almost hidden;
    3. the veil itself shades from the old background to the new;
    4. it falls away, revealing the new look.
  The veil sits above everything as a sibling, so no glass is ever inside an
  animated opacity.

  Worklets read shared values and captured strings only.
*/

const IN_MS = 280;
const SHADE_MS = 320;
const OUT_MS = 420;
const PEAK = 0.9;
const soft = Easing.inOut(Easing.sin);

let start: ((toDark: boolean, apply: () => void) => void) | null = null;
let busy = false;

export function switchTheme(toDark: boolean, apply: () => void, still = false) {
  if (still || !start) {
    apply();
    return;
  }
  if (busy) return;
  start(toDark, apply);
}

export function ThemeFade() {
  const [pair, setPair] = useState<[string, string]>([THEMES.light.colors.paper, THEMES.dark.colors.paper]);
  const veil = useSharedValue(0);
  const mix = useSharedValue(0);
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    start = (toDark, apply) => {
      busy = true;
      const to = THEMES[toDark ? "dark" : "light"].colors.paper;
      const from = THEMES[toDark ? "light" : "dark"].colors.paper;
      setPair([from, to]);
      mix.value = 0;
      veil.value = withTiming(PEAK, { duration: IN_MS, easing: soft });
      later(IN_MS + 20, () => {
        apply();
        mix.value = withTiming(1, { duration: SHADE_MS, easing: soft });
        later(SHADE_MS + 40, () => {
          veil.value = withTiming(0, { duration: OUT_MS, easing: soft });
          later(OUT_MS, () => (busy = false));
        });
      });
    };
    return () => {
      start = null;
      busy = false;
      timers.forEach(clearTimeout);
    };
  }, [veil, mix]);
  const from = pair[0];
  const to = pair[1];
  const style = useAnimatedStyle(() => ({
    opacity: veil.value,
    backgroundColor: interpolateColor(mix.value, [0, 1], [from, to]),
  }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]} />;
}
