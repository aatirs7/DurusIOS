import { useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { useTheme } from "@/theme/useTheme";

/*
  A slow breathing light behind the search page: two soft washes, lapis above
  and saffron below, swelling and settling about once every eight seconds, out
  of step with each other. Calm, never busy. It sits behind everything and
  never wraps glass, so its fading is safe. Under Reduce Motion it holds still.
*/

function Wash({ id, color, size, top, left, period, delay, peak }: { id: string; color: string; size: number; top: number; left: number; period: number; delay: number; peak: number }) {
  const still = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    const id = setTimeout(() => {
      t.value = withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true);
    }, delay);
    return () => {
      clearTimeout(id);
      cancelAnimation(t);
    };
  }, [still, t, period, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.55 + 0.45 * t.value,
    transform: [{ scale: 0.92 + 0.12 * t.value }],
  }));
  const r = size / 2;
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top, left, width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={peak} />
            <Stop offset="0.6" stopColor={color} stopOpacity={peak * 0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

export function Breath() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const big = Math.round(Math.max(width, height) * 0.9);
  const peak = theme.dark ? 0.22 : 0.16;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Wash id="breathLapis" color={theme.colors.lapis} size={big} top={-big * 0.38} left={-big * 0.25} period={7600} delay={0} peak={peak} />
      <Wash id="breathSaffron" color={theme.colors.saffron} size={big * 0.85} top={height - big * 0.5} left={width - big * 0.6} period={9200} delay={1800} peak={peak * 0.8} />
      <Wash id="breathTeal" color={theme.colors.verdigris} size={big * 0.55} top={height * 0.38} left={-big * 0.3} period={11000} delay={3600} peak={peak * 0.6} />
    </View>
  );
}
