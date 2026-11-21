import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
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
  The wait while the AI looks for verses. Minimal: one thin arc on a faint
  track, turning steadily while its length eases longer and shorter, and the
  line beneath breathing. Lapis on a hairline, nothing else. Still under
  Reduce Motion.

  Worklets read shared values and plain numbers only: an ordinary function
  called inside one crashes a release build.
*/

const SIZE = 30;
const STROKE = 2;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function useLoop(period: number, ease: boolean) {
  const still = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    t.value = withRepeat(
      withTiming(1, { duration: period, easing: ease ? Easing.inOut(Easing.cubic) : Easing.linear }),
      -1,
      ease,
    );
    return () => cancelAnimation(t);
  }, [still, t, period, ease]);
  return t;
}

export function Seeking({ label = "Looking through the Quran" }: { label?: string }) {
  const theme = useTheme();
  const c = theme.colors;
  const spin = useLoop(1100, false);
  const grow = useLoop(1300, true);
  const breath = useLoop(1500, true);

  const turn = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  /* The arc runs between a fifth and two thirds of the circle. */
  const arc = useAnimatedProps(() => ({ strokeDashoffset: C * (0.8 - 0.47 * grow.value) }));
  const line = useAnimatedStyle(() => ({ opacity: 0.5 + 0.5 * breath.value }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={{ alignItems: "center", gap: space(2), paddingTop: space(5) }}
    >
      <Animated.View style={[{ width: SIZE, height: SIZE }, turn]}>
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={c.rule} strokeWidth={STROKE} fill="none" />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={c.lapis}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${C} ${C}`}
            animatedProps={arc}
            fill="none"
          />
        </Svg>
      </Animated.View>
      <Animated.View style={line}>
        <Text variant="label" color="inkSoft" style={{ textAlign: "center", letterSpacing: 0.2 }}>
          {label}
        </Text>
      </Animated.View>
    </View>
  );
}
