import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { AyahField } from "@/components/AyahField";
import { BarakahRing, DayCell } from "@/components/BarakahRing";
import { Glass } from "@/components/Glass";
import { Text } from "@/components/Text";
import { arabicStyles } from "@/theme/typography";
import { RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

import { AYAHS, SURAHS } from "./tanzil";

/*
  The five story heroes. Full bleed, drawn on paper, no container card.

  Quran text comes only from ./tanzil, verbatim (issue #3). It is split on
  spaces purely to highlight one word at a time; the words are rendered back
  with the same single spaces, inside one Text, so what is on screen is the
  downloaded string. Harakat are always shown: this path never goes through
  the user's strip setting.

  No English translation under the ayahs: Tanzil licenses its translations for
  non-commercial use only, and The Clear Quran only comes through Quran
  Foundation. The English arrives with Quran Foundation sync.

  Every hero takes `active` (its page is showing) and `still` (Reduce Motion:
  show the final frame, loop nothing).
*/

/* `paused` freezes a hero where it is (press and hold); `active` false resets it. */
export type HeroProps = { width: number; height: number; active: boolean; still: boolean; paused?: boolean };

/* A beat counter that runs only while active. Under Reduce Motion it jumps to the end. */
function useBeat(active: boolean, ms: number, still: boolean, end = 1000, paused = false): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) setN(0);
    else if (still) setN(end);
  }, [active, still, end]);
  useEffect(() => {
    if (!active || still || paused) return;
    const id = setInterval(() => setN((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [active, ms, still, paused]);
  return n;
}

const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

const useStyles = makeStyles((t) => ({
  center: { alignItems: "center", justifyContent: "center" },
  ayahLine: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: space(1.25) },
  ayah: {
    ...arabicStyles.title,
    fontSize: 30,
    lineHeight: 58,
    color: t.colors.ink,
    writingDirection: "rtl",
    textAlign: "center",
  },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.25,
    borderColor: t.colors.saffron,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: t.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: t.colors.rule,
    paddingVertical: space(1.5),
    paddingHorizontal: space(2.5),
    alignItems: "center",
    gap: 2,
    shadowColor: t.colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  counters: { flexDirection: "row", justifyContent: "center", gap: space(5), marginTop: space(2) },
  counter: { alignItems: "center" },
  numeral: { fontSize: 40, lineHeight: 46 },
  wave: { position: "absolute", borderWidth: 1.5, borderColor: t.colors.lapis },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space(1), maxWidth: 320 },
  chip: {
    minWidth: 130,
    alignItems: "center",
    borderRadius: RADIUS.pill,
    paddingVertical: space(1.25),
    paddingHorizontal: space(2),
    overflow: "hidden",
  },
  week: { flexDirection: "row", justifyContent: "center", marginTop: space(2.5) },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.pill,
    paddingLeft: space(2.5),
    paddingRight: 6,
    height: 52,
    gap: space(1),
    overflow: "hidden",
  },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.lapis, alignItems: "center", justifyContent: "center" },
  result: {
    backgroundColor: t.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: t.colors.rule,
    paddingVertical: space(1.5),
    paddingHorizontal: space(2),
    gap: space(0.5),
  },
  refRow: { flexDirection: "row", alignItems: "center", gap: space(1) },
  ref: {
    borderRadius: RADIUS.pill,
    backgroundColor: t.colors.lapisWash,
    paddingHorizontal: space(1.25),
    paddingVertical: 2,
  },
}));

/* ---------- 1. Read ---------- */

const READ = ["1:1", "1:2", "1:3"] as const;
/* The word that lifts into the card: the third word of 1:2, taken from the text, not typed. */
const CARD_AYAH = 1;
const CARD_WORD = 2;

export function ReadHero({ width, active, still, paused }: HeroProps) {
  const s = useStyles();
  const theme = useTheme();
  const lines = READ.map((k) => AYAHS[k].split(" "));
  const count = lines.reduce((n, l) => n + l.length, 0);
  /* One word per beat across all three ayahs, then the card holds for a few beats. */
  const beat = useBeat(active, 480, still, 1000, paused);
  const cycle = still ? count + 1 : beat % (count + 6);
  const showCard = cycle >= count && cycle < count + 5;

  let k = 0;
  const cardWord = lines[CARD_AYAH][CARD_WORD];

  return (
    <View style={[s.center, { width, flex: 1, gap: space(1) }]}>
      {lines.map((words, a) => (
        <View key={READ[a]} style={s.ayahLine}>
          <Text selectable={false} style={s.ayah}>
            {words.map((w, i) => {
              const index = k++;
              const lit = !still && index === cycle;
              const lifted = showCard && a === CARD_AYAH && i === CARD_WORD;
              return (
                <Text
                  key={i}
                  selectable={false}
                  style={
                    lit
                      ? { color: theme.colors.lapis, backgroundColor: theme.colors.lapisWash }
                      : lifted
                        ? { color: theme.colors.lapis }
                        : undefined
                  }
                >
                  {i > 0 ? ` ${w}` : w}
                </Text>
              );
            })}
          </Text>
          <View style={s.marker}>
            <Text variant="label" color="saffron">
              {toArabicDigits(a + 1)}
            </Text>
          </View>
        </View>
      ))}

      {showCard ? (
        <Animated.View entering={FadeInUp.duration(260)} exiting={FadeOut.duration(160)} style={[s.card, { top: space(1) }]}>
          <Text selectable={false} style={[s.ayah, { fontSize: 34, lineHeight: 56, color: theme.colors.lapis }]}>
            {cardWord}
          </Text>
          <Text>Lord</Text>
          {/* English and Arabic on separate nodes, never one, or bidi reorders them. */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: space(0.75) }}>
            <Text variant="label" color="inkSoft">
              Root
            </Text>
            <Text selectable={false} style={[s.ayah, { fontSize: 18, lineHeight: 30, color: theme.colors.inkSoft }]}>
              ر ب ب
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

/* ---------- 2. Map ---------- */

const JUZ_AMMA_FIRST = 78;

export function MapHero({ width, height, active, still, paused }: HeroProps) {
  const s = useStyles();
  const amma = SURAHS.slice(JUZ_AMMA_FIRST - 1);
  const ammaStart = amma[0].start;
  const ammaSize = amma.reduce((n, x) => n + x.ayahs, 0);
  const end = 6236;

  /* Saffron rises through Juz Amma from the last ayah backwards, then teal
     follows surah by surah from An-Nas. */
  const beat = useBeat(active, 50, still, 400, paused);
  const rise = Math.min(1, beat / 40);
  const lit = Math.round(ammaSize * rise);
  const understoodCount = still ? 12 : Math.max(0, Math.min(12, Math.floor((beat - 40) / 4)));
  const understood = new Set(SURAHS.slice(114 - understoodCount).map((x) => x.n));
  const isUnderstood = (i: number) => {
    if (understoodCount === 0 || i < ammaStart) return false;
    for (const x of SURAHS.slice(114 - understoodCount)) if (i >= x.start && i < x.start + x.ayahs) return true;
    return false;
  };

  return (
    <View style={[s.center, { width, flex: 1 }]}>
      <AyahField
        width={width - space(3)}
        height={height - 120}
        memorized={(i) => i >= end - lit}
        understood={isUnderstood}
      />
      <View style={s.counters}>
        <View style={s.counter}>
          <Text variant="numeral" style={s.numeral}>{`${lit}`}</Text>
          <Text variant="label" color="inkSoft">
            Ayahs memorized
          </Text>
        </View>
        <View style={s.counter}>
          <Text variant="numeral" style={s.numeral}>{`${understood.size}`}</Text>
          <Text variant="label" color="inkSoft">
            Surahs understood
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ---------- 3. Learn ---------- */

/*
  The word is taken from the Tanzil text (the same رَبِّ as the Read hero), not
  typed. No "appears N times": that needs lemma data, and a guessed number is
  worse than none.
*/
const OPTIONS = ["said", "Lord", "day", "earth"];
const RIGHT = "Lord";

function Wave({ delay, still }: { delay: number; still: boolean }) {
  const s = useStyles();
  const p = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    const id = setTimeout(() => {
      p.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false);
    }, delay);
    return () => {
      clearTimeout(id);
      cancelAnimation(p);
    };
  }, [delay, still, p]);
  const style = useAnimatedStyle(() => ({
    width: 120 + p.value * 160,
    height: 120 + p.value * 160,
    borderRadius: (120 + p.value * 160) / 2,
    opacity: 0.45 * (1 - p.value),
  }));
  return <Animated.View style={[s.wave, style]} />;
}

export function LearnHero({ width, active, still, paused }: HeroProps) {
  const s = useStyles();
  const theme = useTheme();
  const word = AYAHS["1:2"].split(" ")[2];
  const beat = useBeat(active, 600, still, 1000, paused);
  const cycle = still ? 4 : beat % 9;
  const showChips = cycle >= 2;
  const picked = cycle >= 4;

  return (
    <View style={[s.center, { width, flex: 1, gap: space(4) }]}>
      <View style={[s.center, { height: 200, width: 280 }]}>
        {active ? (
          <>
            <Wave delay={0} still={still} />
            <Wave delay={900} still={still} />
          </>
        ) : null}
        <Text selectable={false} style={[s.ayah, { fontSize: 72, lineHeight: 130, color: theme.colors.ink }]}>
          {word}
        </Text>
      </View>
      <View style={[s.chips, { minHeight: 110 }]}>
        {showChips
          ? OPTIONS.map((o, i) => (
              <Animated.View key={o} entering={FadeInDown.delay(i * 70).duration(240)}>
                <Glass style={s.chip} tint={picked && o === RIGHT ? theme.colors.verdigris : undefined}>
                  <Text color={picked && o === RIGHT ? "paper" : "ink"}>{o}</Text>
                </Glass>
              </Animated.View>
            ))
          : null}
      </View>
    </View>
  );
}

/* ---------- 4. Barakah ---------- */

export function BarakahHero({ width, active, still, paused }: HeroProps) {
  const s = useStyles();
  const beat = useBeat(active, 550, still, 1000, paused);
  const done = still ? 4 : Math.min(beat % 9, 4);
  const days = still ? 7 : Math.min(beat % 9, 7);
  const RATIOS = [0.25, 0.5, 0.75, 0.5, 1, 0.75, 1];

  return (
    <View style={[s.center, { width, flex: 1 }]}>
      <View style={s.center}>
        <BarakahRing fills={[0, 1, 2, 3].map((i) => (i < done ? 1 : 0))} size={220} stroke={14} />
        <View style={[s.center, { position: "absolute" }]}>
          <Text variant="numeral" style={{ fontSize: 56, lineHeight: 62 }}>{`${done}`}</Text>
          <Text variant="label" color="inkSoft">
            of 4 today
          </Text>
        </View>
      </View>
      <View style={s.week}>
        {RATIOS.map((r, i) => (
          <DayCell key={i} ratio={i < days ? r : 0} label={String(i + 1)} />
        ))}
      </View>
    </View>
  );
}

/* ---------- 5. Ask ---------- */

const QUESTION = "I feel anxious about work";
const RESULTS = [
  { ref: "13:28", surah: 13 },
  { ref: "94:5", surah: 94 },
] as const;

export function AskHero({ width, active, still, paused }: HeroProps) {
  const s = useStyles();
  const theme = useTheme();
  const beat = useBeat(active, 70, still, 1000, paused);
  const typed = still ? QUESTION.length : Math.min(beat, QUESTION.length);
  const after = beat - QUESTION.length;
  const shown = still ? 2 : after > 6 ? (after > 14 ? 2 : 1) : 0;

  return (
    <View style={{ width, flex: 1, justifyContent: "center", paddingHorizontal: space(3), gap: space(2) }}>
      <View style={{ gap: space(1.25), minHeight: 260, justifyContent: "flex-end" }}>
        {RESULTS.slice(0, shown).map((r) => (
          <Animated.View key={r.ref} entering={FadeInDown.duration(300)} style={s.result}>
            <View style={s.refRow}>
              <View style={s.ref}>
                <Text variant="label" color="lapis">
                  {r.ref}
                </Text>
              </View>
              <Text variant="label" color="inkSoft">
                {SURAHS[r.surah - 1].en}
              </Text>
            </View>
            <Text selectable={false} style={[s.ayah, { fontSize: 22, lineHeight: 44 }]}>
              {AYAHS[r.ref]}
            </Text>
          </Animated.View>
        ))}
      </View>
      <Glass style={s.inputBar}>
        <Text color={typed > 0 ? "ink" : "inkFaint"} style={{ flex: 1 }} numberOfLines={1}>
          {typed > 0 ? QUESTION.slice(0, typed) : "Ask about a surah, or how you are feeling"}
        </Text>
        <View style={s.send}>
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" stroke={theme.colors.paper} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </View>
      </Glass>
    </View>
  );
}

export const STORY = [
  { key: "read", title: "Read the Quran", line: "Translation and footnotes under every ayah. Tap a word to hear it.", Hero: ReadHero },
  { key: "map", title: "See what you carry", line: "Every ayah is a dot. Light it as you memorize and understand.", Hero: MapHero },
  { key: "learn", title: "Learn the Arabic", line: "The Quran's most common words, brought back just before you forget them.", Hero: LearnHero },
  { key: "barakah", title: "Build barakah", line: "Small daily practices, measured by consistency.", Hero: BarakahHero },
  { key: "ask", title: "Ask", line: "Say how you feel. Durus points you to ayahs to read.", Hero: AskHero },
] as const;
