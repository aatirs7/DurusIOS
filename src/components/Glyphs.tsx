import { useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { FONTS } from "@/theme/typography";
import { useTheme } from "@/theme/useTheme";

/*
  Faint Arabic words drifting behind the search page: mercy, patience, light,
  tranquillity, guidance, gratitude, remembrance, reliance. Faint, kept off
  the middle band where the bar sits, each drifting up and down and a little
  sideways on its own five to seven second clock, so the motion is seen. Words, not Quran text. Still under Reduce Motion.

  Worklets read plain numbers and shared values only: an ordinary function
  called inside one crashes a release build.
*/

type Item = {
  text: string;
  x: number;
  y: number;
  size: number;
  period: number;
  delay: number;
  dx: number;
};

const ITEMS: Item[] = [
  { text: "رَحْمَة", x: 0.06, y: 0.17, size: 40, period: 5200, delay: 0, dx: 16 },
  {
    text: "صَبْر",
    x: 0.66,
    y: 0.12,
    size: 32,
    period: 6100,
    delay: 700,
    dx: -14,
  },
  {
    text: "نُور",
    x: 0.74,
    y: 0.27,
    size: 46,
    period: 4800,
    delay: 1400,
    dx: -18,
  },
  { text: "تَوَكُّل", x: 0.2, y: 0.29, size: 26, period: 6600, delay: 400, dx: 12 },
  {
    text: "سَكِينَة",
    x: 0.07,
    y: 0.7,
    size: 34,
    period: 5700,
    delay: 1000,
    dx: 16,
  },
  {
    text: "هُدًى",
    x: 0.64,
    y: 0.73,
    size: 42,
    period: 5000,
    delay: 1900,
    dx: -16,
  },
  { text: "شُكْر", x: 0.36, y: 0.83, size: 28, period: 6300, delay: 250, dx: 14 },
  {
    text: "ذِكْر",
    x: 0.76,
    y: 0.86,
    size: 30,
    period: 5500,
    delay: 1200,
    dx: -12,
  },
];

function Floating({
  item,
  w,
  h,
  color,
  alpha,
}: {
  item: Item;
  w: number;
  h: number;
  color: string;
  alpha: number;
}) {
  const still = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    const id = setTimeout(() => {
      t.value = withRepeat(
        withTiming(1, {
          duration: item.period,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      );
    }, item.delay);
    return () => {
      clearTimeout(id);
      cancelAnimation(t);
    };
  }, [still, t, item.period, item.delay]);
  const dx = item.dx;
  const style = useAnimatedStyle(() => ({
    opacity: alpha * (0.35 + 0.65 * t.value),
    transform: [
      { translateY: -20 + 40 * t.value },
      { translateX: dx * (t.value - 0.5) },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", left: item.x * w, top: item.y * h },
        style,
      ]}
    >
      <Animated.Text
        allowFontScaling={false}
        style={{
          fontFamily: FONTS.arabicRegular,
          fontSize: item.size,
          lineHeight: Math.round(item.size * 1.9),
          color,
          writingDirection: "rtl",
        }}
      >
        {item.text}
      </Animated.Text>
    </Animated.View>
  );
}

export function Glyphs() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const alpha = theme.dark ? 0.16 : 0.13;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {ITEMS.map((item, k) => (
        <Floating
          key={k}
          item={item}
          w={width}
          h={height}
          color={theme.colors.lapis}
          alpha={alpha}
        />
      ))}
    </View>
  );
}
