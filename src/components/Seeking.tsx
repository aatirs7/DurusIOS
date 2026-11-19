import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { Text } from "@/components/Text";
import { space } from "@/theme/layout";
import { useTheme } from "@/theme/useTheme";

/*
  The wait while the AI looks for verses: a small glowing orb inside three
  thin rings that turn in 3D on different tilts, like a gyroscope, in blue
  and soft white only. The line beneath breathes gently. Still under Reduce
  Motion.

  Worklets read shared values and plain numbers only: an ordinary function
  called inside one crashes a release build.
*/

const SIZE = 76;

function useLoop(period: number, reverse = false) {
  const still = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    t.value = withRepeat(withTiming(1, { duration: period, easing: reverse ? Easing.inOut(Easing.sin) : Easing.linear }), -1, reverse);
    return () => cancelAnimation(t);
  }, [still, t, period, reverse]);
  return t;
}

function Ring({ tilt, period, color, width, dir }: { tilt: number; period: number; color: string; width: number; dir: number }) {
  const t = useLoop(period);
  const turn = 360 * dir;
  const style = useAnimatedStyle(() => ({
    transform: [{ perspective: 300 }, { rotateZ: `${tilt}deg` }, { rotateX: "68deg" }, { rotateZ: `${turn * t.value}deg` }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          borderWidth: width,
          borderColor: color,
          borderTopColor: "transparent",
        },
        style,
      ]}
    />
  );
}

function Orb({ glow, edge }: { glow: string; edge: string }) {
  const t = useLoop(1600, true);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 0.86 + 0.18 * t.value }], opacity: 0.8 + 0.2 * t.value }));
  const d = 30;
  return (
    <Animated.View style={[{ position: "absolute", width: d, height: d }, style]}>
      <Svg width={d} height={d}>
        <Defs>
          <RadialGradient id="seekOrb" cx="38%" cy="34%" r="66%">
            <Stop offset="0" stopColor={glow} stopOpacity={1} />
            <Stop offset="0.45" stopColor={edge} stopOpacity={0.85} />
            <Stop offset="1" stopColor={edge} stopOpacity={1} />
          </RadialGradient>
        </Defs>
        <Circle cx={d / 2} cy={d / 2} r={d / 2} fill="url(#seekOrb)" />
      </Svg>
    </Animated.View>
  );
}

function Breathing({ label }: { label: string }) {
  const t = useLoop(1400, true);
  const style = useAnimatedStyle(() => ({ opacity: 0.55 + 0.45 * t.value }));
  return (
    <Animated.View style={style}>
      <Text variant="label" color="inkSoft" style={{ textAlign: "center" }}>
        {label}
      </Text>
    </Animated.View>
  );
}

export function Seeking({ label = "Looking through the Quran" }: { label?: string }) {
  const theme = useTheme();
  const c = theme.colors;
  const soft = theme.dark ? c.ink : c.surface;
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={{ alignItems: "center", gap: space(2.5), paddingTop: space(5) }}>
      <View style={{ width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" }}>
        <Ring tilt={0} period={2400} color={c.lapis} width={1.6} dir={1} />
        <Ring tilt={60} period={3000} color={c.lapis} width={1.2} dir={-1} />
        <Ring tilt={-60} period={2700} color={c.inkFaint} width={1} dir={1} />
        <Orb glow={soft} edge={c.lapis} />
      </View>
      <Breathing label={label} />
    </View>
  );
}
