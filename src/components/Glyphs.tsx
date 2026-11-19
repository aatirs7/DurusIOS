import { useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { FONTS } from "@/theme/typography";
import { useTheme } from "@/theme/useTheme";

/*
  Faint Arabic words drifting behind the search page: mercy, patience, light,
  tranquillity, guidance, gratitude, remembrance, reliance. Two small
  eight-pointed stars between them. Barely there, kept off the middle band
  where the bar sits, each floating a few points up and down on its own slow
  clock. Words, not Quran text. Still under Reduce Motion.

  Worklets read plain numbers and shared values only: an ordinary function
  called inside one crashes a release build.
*/

type Item = { text?: string; x: number; y: number; size: number; period: number; delay: number; star?: boolean };

const ITEMS: Item[] = [
  { text: "رَحْمَة", x: 0.06, y: 0.17, size: 40, period: 9000, delay: 0 },
  { text: "صَبْر", x: 0.66, y: 0.12, size: 32, period: 10500, delay: 900 },
  { text: "نُور", x: 0.74, y: 0.27, size: 46, period: 8200, delay: 1800 },
  { text: "تَوَكُّل", x: 0.16, y: 0.3, size: 26, period: 11200, delay: 600 },
  { text: "سَكِينَة", x: 0.07, y: 0.7, size: 34, period: 9800, delay: 1200 },
  { text: "هُدًى", x: 0.64, y: 0.73, size: 42, period: 8700, delay: 2400 },
  { text: "شُكْر", x: 0.36, y: 0.83, size: 28, period: 10100, delay: 300 },
  { text: "ذِكْر", x: 0.76, y: 0.86, size: 30, period: 9300, delay: 1500 },
  { star: true, x: 0.44, y: 0.2, size: 18, period: 12000, delay: 0 },
  { star: true, x: 0.24, y: 0.79, size: 14, period: 12500, delay: 2000 },
];

/* An eight-pointed star: two squares, one turned 45 degrees. */
const STAR = "M12 2l2.9 4.1L20 7l-.9 5L20 17l-5.1.9L12 22l-2.9-4.1L4 17l.9-5L4 7l5.1-.9z";

function Floating({ item, w, h, color, alpha }: { item: Item; w: number; h: number; color: string; alpha: number }) {
  const still = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    const id = setTimeout(() => {
      t.value = withRepeat(withTiming(1, { duration: item.period, easing: Easing.inOut(Easing.sin) }), -1, true);
    }, item.delay);
    return () => {
      clearTimeout(id);
      cancelAnimation(t);
    };
  }, [still, t, item.period, item.delay]);
  const style = useAnimatedStyle(() => ({
    opacity: alpha * (0.55 + 0.45 * t.value),
    transform: [{ translateY: -6 + 12 * t.value }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: item.x * w, top: item.y * h }, style]}>
      {item.star ? (
        <Svg width={item.size} height={item.size} viewBox="0 0 24 24">
          <Path d={STAR} stroke={color} strokeWidth={1.4} strokeLinejoin="round" fill="none" />
        </Svg>
      ) : (
        <Animated.Text
          allowFontScaling={false}
          style={{ fontFamily: FONTS.arabicRegular, fontSize: item.size, lineHeight: Math.round(item.size * 1.9), color, writingDirection: "rtl" }}
        >
          {item.text}
        </Animated.Text>
      )}
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
        <Floating key={k} item={item} w={width} h={height} color={theme.colors.lapis} alpha={alpha} />
      ))}
    </View>
  );
}
