import { useEffect } from "react";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "@/theme/useTheme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 96;
const STROKE = 6;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

/*
  The draining ring.

  The web version learned this the hard way: a transition driven from a React
  state value does not work here. The first card drained instantly and every
  card after it barely moved, because the value the transition interpolated from
  had already been replaced by the time the browser looked at it.

  The fix, and the reason this component is shaped the way it is:

    - the drain is a shared value driven by withTiming, never React state;
    - it is cancelled and set back to zero BEFORE each card starts, because
      withTiming from a partially drained value produces a short first ring;
    - the component is keyed to the card id by its caller, so a remount cannot
      leave a half finished animation attached.

  Linear easing on purpose. A clock that eases is lying about how much time is
  left.
*/
export function SpeedRing({ windowMs, running }: { windowMs: number; running: boolean }) {
  const theme = useTheme();
  const drained = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(drained);
    drained.value = 0;
    if (!running) return;
    drained.value = withTiming(1, { duration: windowMs, easing: Easing.linear });
    return () => cancelAnimation(drained);
  }, [windowMs, running, drained]);

  const props = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * drained.value,
  }));

  return (
    <Svg width={SIZE} height={SIZE}>
      <Circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={R}
        stroke={theme.colors.rule}
        strokeWidth={STROKE}
        fill="none"
      />
      <AnimatedCircle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={R}
        stroke={theme.colors.lapis}
        strokeWidth={STROKE}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        animatedProps={props}
        /* Rotated so the arc starts at twelve o'clock rather than three. */
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
      />
    </Svg>
  );
}
