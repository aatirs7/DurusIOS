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
  type SharedValue,
} from "react-native-reanimated";

import { Arabic } from "@/components/Arabic";
import { Text } from "@/components/Text";
import { space } from "@/theme/layout";

/*
  The wait while the AI looks for verses: Quranic words surface one at a
  time, each fading in while the last fades out, on one smooth clock, as if the
  search were passing through them. Beneath, the line's words brighten in a
  slow wave. Lapis and ink only. Still under Reduce Motion.

  Worklets read shared values, plain numbers and Math only: an ordinary
  function called inside one crashes a release build.
*/

const WORDS = ["صبر", "رحمة", "نور", "هدى", "سكينة", "ذكر", "شكر", "توكل"];
/* Each word's turn, and how long its fade spans (in turns): 1.7 means each
   word is still fading out while the next fades in, so nothing ever pops. */
const WORD_MS = 1700;
const SPAN = 1.7;
const WAVE_MS = 1800;

/*
  One clock drives every word, so there is no swap on the JS side: each word
  sits in its own layer and its opacity is a smooth sine-squared bump of the
  clock, overlapping the next word's. The words stay still; only their
  opacity moves (owner: no floating).
*/
function DriftWord({ word, index, t, still }: { word: string; index: number; t: SharedValue<number>; still: boolean }) {
  const n = WORDS.length;
  const style = useAnimatedStyle(() => {
    if (still) return { opacity: index === 0 ? 1 : 0 };
    const x = (((t.value * n - index) % n) + n) % n;
    const on = x < SPAN ? x / SPAN : 1;
    const s = Math.sin(Math.PI * on);
    const k = x < SPAN ? s * s : 0;
    return {
      opacity: 0.9 * k,
    };
  });
  return (
    <Animated.View style={[{ position: "absolute" }, style]}>
      <Arabic variant="title" color="lapis" showHarakat={false} style={{ fontSize: 34, lineHeight: 66 }}>
        {word}
      </Arabic>
    </Animated.View>
  );
}

function CyclingWord({ still }: { still: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    t.value = withRepeat(withTiming(1, { duration: WORD_MS * WORDS.length, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [still, t]);
  return (
    <View style={{ height: 72, alignSelf: "stretch", alignItems: "center", justifyContent: "center" }}>
      {WORDS.map((w, i) => (
        <DriftWord key={w} word={w} index={i} t={t} still={still} />
      ))}
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
