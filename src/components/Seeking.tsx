import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { Arabic } from "@/components/Arabic";
import { Text } from "@/components/Text";
import { space } from "@/theme/layout";

/*
  The wait while the AI looks for verses: Quranic words surface one at a
  time, each swelling in softly and fading out as the next arrives, as if the
  search were passing through them. Beneath, the line's words brighten in a
  slow wave. Lapis and ink only. Still under Reduce Motion.

  Worklets read shared values, plain numbers and Math only: an ordinary
  function called inside one crashes a release build.
*/

const WORDS = ["صبر", "رحمة", "نور", "هدى", "سكينة", "ذكر", "شكر", "توكل"];
const WORD_MS = 1100;
const WAVE_MS = 1800;

function CyclingWord({ still }: { still: boolean }) {
  const [i, setI] = useState(0);
  const p = useSharedValue(still ? 0.5 : 0);

  useEffect(() => {
    if (still) return;
    const id = setInterval(() => setI((n) => (n + 1) % WORDS.length), WORD_MS);
    return () => clearInterval(id);
  }, [still]);

  /* Each new word runs one swell: in, hold, out. */
  useEffect(() => {
    if (still) return;
    p.value = 0;
    p.value = withTiming(1, { duration: WORD_MS, easing: Easing.linear });
    return () => cancelAnimation(p);
  }, [i, still, p]);

  const style = useAnimatedStyle(() => {
    const k = Math.sin(Math.PI * p.value);
    return {
      opacity: Math.min(1, k * 1.4),
      transform: [{ scale: 0.88 + 0.14 * k }, { translateY: 6 * (1 - p.value) - 3 }],
    };
  });

  return (
    <View style={{ height: 72, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={style}>
        <Arabic variant="title" color="lapis" showHarakat={false} style={{ fontSize: 34, lineHeight: 66 }}>
          {WORDS[i]}
        </Arabic>
      </Animated.View>
    </View>
  );
}

function WaveWord({ word, index, t }: { word: string; index: number; t: SharedValue<number> }) {
  const offset = index * 0.14;
  const style = useAnimatedStyle(() => {
    const k = Math.max(0, Math.sin(2 * Math.PI * (t.value - offset)));
    return { opacity: 0.45 + 0.55 * k };
  });
  return (
    <Animated.View style={style}>
      <Text variant="label" color="inkSoft">
        {word}
      </Text>
    </Animated.View>
  );
}

export function Seeking({ label = "Looking through the Quran" }: { label?: string }) {
  const still = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    t.value = withRepeat(withTiming(1, { duration: WAVE_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [still, t]);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={{ alignItems: "center", gap: space(1), paddingTop: space(4) }}
    >
      <CyclingWord still={still} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 4 }}>
        {label.split(" ").map((w, i) => (
          <WaveWord key={`${w}-${i}`} word={w} index={i} t={t} />
        ))}
      </View>
    </View>
  );
}
