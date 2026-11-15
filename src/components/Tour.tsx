import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View, type LayoutChangeEvent } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, useReducedMotion } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { Arabic } from "@/components/Arabic";
import { Text } from "@/components/Text";
import { RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  The onboarding tour: five panels, one per tab, each with a small live demo.

  Authenticity rule: no Quran text is typed here. The Read and Ask demos draw
  text as soft ink strokes, the way a mockup does, so nothing religious renders
  that did not come from the verified source. The Learn demo uses real words
  from the bundled Book 1 content, which is verified.

  Each demo only runs while its panel is showing, and everything holds still
  under Reduce Motion: the panels stop advancing on their own and each demo
  shows its finished state.
*/

const STAGE_HEIGHT = 250;
const ADVANCE_MS = 4200;

const useStyles = makeStyles((t) => ({
  wrap: { gap: space(2.5) },
  stage: {
    height: STAGE_HEIGHT,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    padding: space(2.5),
  },
  copy: { alignItems: "center", gap: space(0.75), minHeight: 92 },
  title: { fontSize: 28, lineHeight: 34, textAlign: "center" },
  line: { textAlign: "center", maxWidth: 320 },
  dots: { flexDirection: "row", justifyContent: "center", gap: space(1) },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: t.colors.rule },
  dotOn: { width: 22, backgroundColor: t.colors.lapis },

  /* Read */
  page: { width: "100%", gap: space(1.25) },
  ayahRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, flexWrap: "wrap" },
  word: { height: 12, borderRadius: 6, backgroundColor: t.colors.ink, opacity: 0.78 },
  marker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.25,
    borderColor: t.colors.saffron,
  },
  transRow: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  trans: { height: 6, borderRadius: 3, backgroundColor: t.colors.inkFaint, opacity: 0.6 },
  sup: { width: 7, height: 7, borderRadius: 4, backgroundColor: t.colors.lapis, marginTop: -4 },
  pop: {
    position: "absolute",
    top: space(1.5),
    right: space(2),
    backgroundColor: t.colors.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.colors.rule,
    paddingVertical: space(1),
    paddingHorizontal: space(1.5),
    gap: 6,
    alignItems: "center",
    flexDirection: "row",
  },

  /* Map */
  field: { flexDirection: "row", flexWrap: "wrap", gap: 5, justifyContent: "center", width: 16 * 13 },
  ayah: { width: 8, height: 8, borderRadius: 4 },
  chips: { flexDirection: "row", gap: space(1), marginTop: space(2) },
  chip: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: space(1.5),
    paddingVertical: 4,
    backgroundColor: t.colors.paper,
    borderWidth: 1,
    borderColor: t.colors.rule,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  swatch: { width: 8, height: 8, borderRadius: 4 },

  /* Learn */
  card: {
    width: "100%",
    alignItems: "center",
    gap: space(1.5),
  },
  options: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space(1), maxWidth: 280 },
  option: {
    minWidth: 120,
    alignItems: "center",
    borderRadius: RADIUS.button,
    borderWidth: 1.25,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.paper,
    paddingVertical: space(1),
  },
  optionRight: { borderColor: t.colors.verdigris, backgroundColor: t.colors.surfaceSunk },

  /* Barakah */
  practices: { gap: 6, alignItems: "center", marginTop: space(1.5) },
  practice: { flexDirection: "row", alignItems: "center", gap: space(1) },
  tickBox: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.25, borderColor: t.colors.inkFaint },
  tickOn: { backgroundColor: t.colors.verdigris, borderColor: t.colors.verdigris },

  /* Ask */
  askWrap: { width: "100%", flex: 1, justifyContent: "space-between" },
  results: { gap: space(1) },
  result: {
    backgroundColor: t.colors.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.colors.rule,
    padding: space(1.25),
    gap: 6,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.paper,
    paddingLeft: space(2),
    paddingRight: 6,
    height: 44,
    gap: space(1),
  },
  send: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: t.colors.lapis,
    alignItems: "center",
    justifyContent: "center",
  },
}));

/* ---------- a tiny clock each demo can share ---------- */

/* Counts up once per `ms` while active, from 0. Reset when the panel returns. */
function useBeat(active: boolean, ms: number, still: boolean): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) {
      setN(0);
      return;
    }
    if (still) {
      setN(1000);
      return;
    }
    const id = setInterval(() => setN((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [active, ms, still]);
  return n;
}

/* ---------- Read ---------- */

const AYAHS = [
  [46, 30, 54, 38, 26],
  [34, 58, 28, 44],
  [52, 36, 40, 30, 48],
];
const TRANS = [
  [40, 62, 28, 50, 36, 44],
  [56, 30, 48, 38],
  [34, 52, 44, 60, 30],
];

function ReadDemo({ active, still }: { active: boolean; still: boolean }) {
  const s = useStyles();
  const theme = useTheme();
  const beat = useBeat(active, 520, still);
  /* Follow-along: one word of the first ayah lit at a time, then a pause with
     the word card open, then round again. */
  const cycle = still ? 3 : beat % 9;
  const lit = cycle < 5 ? cycle : -1;
  const showCard = cycle >= 5 && cycle <= 7;

  return (
    <View style={s.page}>
      {AYAHS.map((words, a) => (
        <View key={a} style={{ gap: 6 }}>
          <View style={s.ayahRow}>
            {words.map((w, i) => (
              <View
                key={i}
                style={[
                  s.word,
                  { width: w },
                  a === 0 && i === lit && { backgroundColor: theme.colors.verdigris, opacity: 1 },
                  a === 0 && i === 2 && showCard && { backgroundColor: theme.colors.lapis, opacity: 1 },
                ]}
              />
            ))}
            <View style={s.marker} />
          </View>
          <View style={s.transRow}>
            {TRANS[a].map((w, i) => (
              <View key={i} style={[s.trans, { width: w }]} />
            ))}
            {a === 1 ? <View style={s.sup} /> : null}
          </View>
        </View>
      ))}
      {showCard ? (
        <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(140)} style={s.pop}>
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill={theme.colors.lapis} />
            <Path
              d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"
              stroke={theme.colors.lapis}
              strokeWidth={1.6}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
          <View style={{ gap: 4 }}>
            <View style={[s.trans, { width: 54, backgroundColor: theme.colors.ink }]} />
            <View style={[s.trans, { width: 36 }]} />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

/* ---------- Map ---------- */

const DOTS = 13 * 9;

function MapDemo({ active, still }: { active: boolean; still: boolean }) {
  const s = useStyles();
  const theme = useTheme();
  const beat = useBeat(active, 45, still);
  const memorized = Math.min(beat, 70);
  const understood = Math.min(Math.max(beat - 20, 0), 46);

  return (
    <View style={{ alignItems: "center" }}>
      <View style={s.field}>
        {Array.from({ length: DOTS }, (_, i) => {
          /* Lit from the end of the mushaf backwards, the way most people
             start: Juz Amma first. */
          const k = DOTS - 1 - i;
          const m = k < memorized;
          const u = k < understood;
          const color = m && u ? theme.colors.verdigris : m ? theme.colors.saffron : u ? theme.colors.verdigris : theme.colors.rule;
          return <View key={i} style={[s.ayah, { backgroundColor: color, opacity: m || u ? 1 : 0.7 }]} />;
        })}
      </View>
      <View style={s.chips}>
        <View style={s.chip}>
          <View style={[s.swatch, { backgroundColor: theme.colors.saffron }]} />
          <Text variant="label" color="inkSoft">{`Memorized ${memorized}`}</Text>
        </View>
        <View style={s.chip}>
          <View style={[s.swatch, { backgroundColor: theme.colors.verdigris }]} />
          <Text variant="label" color="inkSoft">{`Understood ${understood}`}</Text>
        </View>
      </View>
    </View>
  );
}

/* ---------- Learn ---------- */

/* Real Book 1 words, with the glosses from assets/content/lessons.json. */
const WORDS = [
  { ar: "بَيْتٌ", right: "house", options: ["house", "door", "mosque", "book"] },
  { ar: "مَسْجِدٌ", right: "mosque", options: ["book", "mosque", "house", "door"] },
  { ar: "كِتَابٌ", right: "book", options: ["door", "house", "book", "mosque"] },
];

function LearnDemo({ active, still }: { active: boolean; still: boolean }) {
  const s = useStyles();
  const beat = useBeat(active, 700, still);
  const index = still ? 0 : Math.floor(beat / 3) % WORDS.length;
  const answered = still || beat % 3 >= 1;
  const w = WORDS[index];

  return (
    <Animated.View key={index} entering={FadeIn.duration(260)} style={s.card}>
      <Arabic variant="card" color="ink">
        {w.ar}
      </Arabic>
      <View style={s.options}>
        {w.options.map((o) => (
          <View key={o} style={[s.option, answered && o === w.right && s.optionRight]}>
            <Text variant="label" color={answered && o === w.right ? "verdigris" : "inkSoft"}>
              {o}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

/* ---------- Barakah ---------- */

const PRACTICES = ["Fajr on time", "Morning adhkar", "Daily Quran portion", "Evening adhkar"];
const RING = 112;
const STROKE = 10;

function arc(a: number, b: number, r: number, c: number): string {
  const p = (f: number) => {
    const angle = f * 2 * Math.PI - Math.PI / 2;
    return `${c + r * Math.cos(angle)} ${c + r * Math.sin(angle)}`;
  };
  return `M ${p(a)} A ${r} ${r} 0 ${b - a > 0.5 ? 1 : 0} 1 ${p(b)}`;
}

function BarakahDemo({ active, still }: { active: boolean; still: boolean }) {
  const s = useStyles();
  const theme = useTheme();
  const beat = useBeat(active, 650, still);
  const done = still ? 4 : Math.min(beat % 7, 4);
  const c = RING / 2;
  const r = c - STROKE / 2;
  const gap = 0.03;

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <Svg width={RING} height={RING}>
          {PRACTICES.map((_, i) => (
            <Path
              key={i}
              d={arc(i / 4 + gap / 2, (i + 1) / 4 - gap / 2, r, c)}
              stroke={i < done ? theme.colors.verdigris : theme.colors.surfaceSunk}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
            />
          ))}
        </Svg>
        <View style={{ position: "absolute", alignItems: "center" }}>
          <Text variant="numeral" style={{ fontSize: 30, lineHeight: 34 }}>{`${done}`}</Text>
          <Text variant="label" color="inkSoft">
            of 4
          </Text>
        </View>
      </View>
      <View style={s.practices}>
        {PRACTICES.map((p, i) => (
          <View key={p} style={s.practice}>
            <View style={[s.tickBox, i < done && s.tickOn]} />
            <Text variant="label" color={i < done ? "ink" : "inkFaint"}>
              {p}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ---------- Ask ---------- */

const QUESTION = "I feel anxious about work";

function AskDemo({ active, still }: { active: boolean; still: boolean }) {
  const s = useStyles();
  const theme = useTheme();
  const beat = useBeat(active, 70, still);
  const typed = still ? QUESTION.length : Math.min(beat, QUESTION.length);
  const after = beat - QUESTION.length;
  const results = still ? 2 : after > 8 ? (after > 16 ? 2 : 1) : 0;

  return (
    <View style={s.askWrap}>
      <View style={s.results}>
        {Array.from({ length: results }, (_, i) => (
          <Animated.View key={i} entering={FadeInDown.duration(260)} style={s.result}>
            <View style={{ flexDirection: "row-reverse", gap: 5 }}>
              {[44, 30, 52, 26].map((w, j) => (
                <View key={j} style={[s.word, { width: w, height: 9 }]} />
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 5 }}>
              {[38, 56, 30, 44].map((w, j) => (
                <View key={j} style={[s.trans, { width: w }]} />
              ))}
            </View>
            <Text variant="label" color="lapis">
              Open in Read
            </Text>
          </Animated.View>
        ))}
      </View>
      <View style={s.inputBar}>
        <Text color={typed > 0 ? "ink" : "inkFaint"} style={{ flex: 1 }} numberOfLines={1}>
          {typed > 0 ? QUESTION.slice(0, typed) : "Ask about a surah, or how you are feeling"}
        </Text>
        <View style={s.send}>
          <Svg width={14} height={14} viewBox="0 0 24 24">
            <Path
              d="M12 19V5M5.5 11.5L12 5l6.5 6.5"
              stroke={theme.colors.paper}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </View>
      </View>
    </View>
  );
}

/* ---------- the tour ---------- */

const PANELS = [
  { key: "read", title: "Read the Quran", line: "Uthmani script with translation and footnotes. Tap any word to hear it.", Demo: ReadDemo },
  { key: "map", title: "See what you carry", line: "Every ayah is a dot. Light it as you memorize and understand.", Demo: MapDemo },
  { key: "learn", title: "Learn the Arabic", line: "The words of the Quran and a full Arabic course, each brought back before you forget it.", Demo: LearnDemo },
  { key: "barakah", title: "Build barakah", line: "Small daily practices, measured by consistency, never streaks.", Demo: BarakahDemo },
  { key: "ask", title: "Ask", line: "Say how you feel, and Durus points you to ayahs to read.", Demo: AskDemo },
] as const;

export function Tour() {
  const s = useStyles();
  const still = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const scroller = useRef<ScrollView>(null);

  /* Advances on its own until the user takes over by swiping or tapping a dot. */
  useEffect(() => {
    if (still || held || width === 0) return;
    const id = setTimeout(() => {
      const next = (index + 1) % PANELS.length;
      scroller.current?.scrollTo({ x: next * width, animated: true });
      setIndex(next);
    }, ADVANCE_MS);
    return () => clearTimeout(id);
  }, [index, held, still, width]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const panel = PANELS[index];

  return (
    <View testID="tour" style={s.wrap} onLayout={onLayout}>
      {width > 0 ? (
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => setHeld(true)}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {PANELS.map((p, i) => (
            <View key={p.key} style={{ width }}>
              <View style={s.stage}>
                <p.Demo active={i === index} still={still} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={s.stage} />
      )}

      <Animated.View key={panel.key} entering={FadeIn.duration(220)} style={s.copy}>
        <Text variant="pageTitle" style={s.title}>
          {panel.title}
        </Text>
        <Text color="inkSoft" style={s.line}>
          {panel.line}
        </Text>
      </Animated.View>

      <View style={s.dots}>
        {PANELS.map((p, i) => (
          <Pressable
            key={p.key}
            accessibilityRole="button"
            accessibilityLabel={`Show ${p.title}`}
            hitSlop={8}
            onPress={() => {
              setHeld(true);
              setIndex(i);
              scroller.current?.scrollTo({ x: i * width, animated: true });
            }}
          >
            <View style={[s.dot, i === index && s.dotOn]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
