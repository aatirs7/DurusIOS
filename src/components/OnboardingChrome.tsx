import { useEffect, useMemo } from "react";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Arabic } from "@/components/Arabic";
import { ThemeToggle } from "@/components/ThemeToggle";
import { space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  Words from the book, set very faint and scattered behind the flow.

  Fixed positions rather than random ones: a field that reshuffles on every
  render is movement the eye keeps chasing, and these have to sit behind text
  that must stay readable. Unvowelled, because at this opacity harakat turn into
  noise rather than reading.
*/
const FIELD: { word: string; top: string; left: string; size: number }[] = [
  { word: "بيت", top: "8%", left: "6%", size: 34 },
  { word: "مسجد", top: "14%", left: "62%", size: 40 },
  { word: "طالب", top: "30%", left: "72%", size: 32 },
  { word: "مفتاح", top: "4%", left: "34%", size: 28 },
  { word: "قلم", top: "62%", left: "8%", size: 30 },
  { word: "نجم", top: "74%", left: "68%", size: 34 },
  { word: "كتاب", top: "46%", left: "2%", size: 26 },
  { word: "باب", top: "88%", left: "40%", size: 30 },
];

const useStyles = makeStyles((t) => ({
  field: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  word: { position: "absolute" },

  header: { gap: space(1.5), paddingBottom: space(1) },
  /*
    The wordmark is centred in the row while back and theme sit in the corners.
    Both corners reserve the same width whether or not they hold anything, so
    the wordmark does not shift sideways when the back button appears on step
    two.
  */
  bar: { flexDirection: "row", alignItems: "center" },
  corner: { width: 44, alignItems: "center", justifyContent: "center" },
  cornerEnd: { width: 44, alignItems: "flex-end", justifyContent: "center" },
  mark: { flex: 1, alignItems: "center" },
  track: { flexDirection: "row", gap: space(0.75), width: "100%" },
  segment: { flex: 1, height: 4, borderRadius: 999, backgroundColor: t.colors.rule, overflow: "hidden" },
  fill: { height: 4, borderRadius: 999, backgroundColor: t.colors.lapis },
}));

function Segment({ filled }: { filled: boolean }) {
  const s = useStyles();
  const progress = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(filled ? 1 : 0, {
      duration: 260,
      easing: Easing.bezier(0.2, 0, 0.1, 1),
    });
  }, [filled, progress]);

  /*
    The fill grows rather than appearing, so stepping forward reads as progress
    rather than as a light switching on.

    Width is built inside the worklet as a percentage string. A withTiming call
    cannot be concatenated into one - it returns an animation object, not a
    number - so the timing drives a shared value and the style reads it.
  */
  const style = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={s.segment}>
      <Animated.View style={[s.fill, style]} />
    </View>
  );
}

export function WordField() {
  const s = useStyles();
  const theme = useTheme();
  const words = useMemo(() => FIELD, []);

  return (
    <View style={s.field} pointerEvents="none">
      {words.map((w, i) => (
        <Arabic
          key={`${w.word}-${i}`}
          variant="inline"
          color="lapis"
          showHarakat={false}
          style={[
            s.word,
            {
              top: w.top as unknown as number,
              left: w.left as unknown as number,
              fontSize: w.size,
              lineHeight: Math.round(w.size * 1.6),
              /*
                Lapis, not ink.

                On paper, ink at this opacity is a grey so close to the
                background that the field simply is not there - the words only
                ever showed up in dark mode, where ink is near white. The mark
                colour reads as a tint of the brand at low alpha in both themes
                instead of as washed out text.

                Light needs more of it than dark: a dark wash on a light ground
                carries further than a light wash on a dark one, but paper's
                contrast range here is the narrower of the two.
              */
              opacity: theme.dark ? 0.10 : 0.14,
            },
          ]}
        >
          {w.word}
        </Arabic>
      ))}
    </View>
  );
}

/* The wordmark, the step indicator, and the two controls that must be reachable
   from every step: a way back, and the theme toggle. */
export function OnboardingChrome({
  step,
  total,
  onBack,
}: {
  step: number;
  total: number;
  onBack?: () => void;
}) {
  const s = useStyles();
  const theme = useTheme();

  return (
    <View style={s.header}>
      <View style={s.bar}>
        <View style={s.corner}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={onBack}
              hitSlop={12}
            >
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path
                  d="M15 5l-7 7 7 7"
                  stroke={theme.colors.ink}
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            </Pressable>
          ) : null}
        </View>

        <View style={s.mark}>
          {/* Vowelled, like the icon and the launch screen. The harakat are
              part of the mark, not a card-face-only affectation. */}
          <Arabic variant="title" color="lapis">
            دُرُوس
          </Arabic>
        </View>

        <View style={s.cornerEnd}>
          <ThemeToggle />
        </View>
      </View>

      <View style={s.track}>
        {Array.from({ length: total }, (_, i) => (
          <Segment key={i} filled={i <= step} />
        ))}
      </View>
    </View>
  );
}
