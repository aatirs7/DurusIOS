import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { THEMES } from "@/theme/tokens";

/*
  A soft change of theme instead of a snap. The corner toggle calls
  switchTheme: a veil in the NEW paper colour rises over the whole app, the
  theme changes underneath it while it is nearly opaque, and it falls away to
  reveal the new look. The veil sits above everything as a sibling, so no
  glass is ever inside an animated opacity.

  Worklets read shared values only.
*/

const IN_MS = 220;
const OUT_MS = 380;

let start: ((toDark: boolean, apply: () => void) => void) | null = null;
let busy = false;

export function switchTheme(toDark: boolean, apply: () => void, still = false) {
  if (still || busy || !start) {
    apply();
    return;
  }
  start(toDark, apply);
}

export function ThemeFade() {
  const [tint, setTint] = useState<string>(THEMES.light.colors.paper);
  const veil = useSharedValue(0);
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    start = (toDark, apply) => {
      busy = true;
      setTint(THEMES[toDark ? "dark" : "light"].colors.paper);
      veil.value = withTiming(0.92, { duration: IN_MS, easing: Easing.out(Easing.quad) });
      timers.push(
        setTimeout(() => {
          apply();
          timers.push(
            setTimeout(() => {
              veil.value = withTiming(0, { duration: OUT_MS, easing: Easing.inOut(Easing.quad) });
              timers.push(setTimeout(() => (busy = false), OUT_MS));
            }, 60),
          );
        }, IN_MS),
      );
    };
    return () => {
      start = null;
      busy = false;
      timers.forEach(clearTimeout);
    };
  }, [veil]);
  const style = useAnimatedStyle(() => ({ opacity: veil.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint }, style]} />;
}
