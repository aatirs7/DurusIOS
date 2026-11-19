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
import Svg, { Circle } from "react-native-svg";

import { Text } from "@/components/Text";
import { space } from "@/theme/layout";
import { useTheme } from "@/theme/useTheme";

/*
  The wait while the AI looks for verses: three thin arcs, lapis, verdigris
  and saffron, turning at different speeds and directions round a softly
  breathing centre, with the line beneath it centred. Under Reduce Motion it
  holds still.

  Worklets read shared values and plain numbers only: an ordinary function
  called inside one crashes a release build.
*/

const SIZE = 64;

function Arc({ r, color, sweep, period, dir, width }: { r: number; color: string; sweep: number; period: number; dir: number; width: number }) {
  const still = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    t.value = withRepeat(withTiming(1, { duration: period, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [still, t, period]);
  const turn = dir * 360;
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn * t.value}deg` }] }));
  const c = 2 * Math.PI * r;
  return (
    <Animated.View style={[{ position: "absolute", width: SIZE, height: SIZE }, style]}>
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={r} stroke={color} strokeOpacity={0.14} strokeWidth={width} fill="none" />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={r}
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeDasharray={`${c * sweep} ${c}`}
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}

function Core({ color }: { color: string }) {
  const still = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    t.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(t);
  }, [still, t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.45 + 0.55 * t.value, transform: [{ scale: 0.7 + 0.45 * t.value }] }));
  return <Animated.View style={[{ position: "absolute", width: 10, height: 10, borderRadius: 5, backgroundColor: color }, style]} />;
}

export function Seeking({ label = "Looking through the Quran" }: { label?: string }) {
  const theme = useTheme();
  const c = theme.colors;
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={{ alignItems: "center", gap: space(2), paddingTop: space(6) }}>
      <View style={{ width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" }}>
        <Arc r={29} color={c.lapis} sweep={0.28} period={1400} dir={1} width={2.5} />
        <Arc r={21} color={c.verdigris} sweep={0.36} period={1900} dir={-1} width={2.5} />
        <Arc r={13} color={c.saffron} sweep={0.45} period={1100} dir={1} width={2.5} />
        <Core color={c.lapis} />
      </View>
      <Text variant="label" color="inkSoft" style={{ textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}
