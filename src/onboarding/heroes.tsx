import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { AyahField } from "@/components/AyahField";
import { adhkarFor } from "@/barakah/adhkar";
import { BarakahRing } from "@/components/BarakahRing";
import { Glass } from "@/components/Glass";
import { PracticeIcon } from "@/components/PracticeIcon";
import { Seeking } from "@/components/Seeking";
import { Text } from "@/components/Text";
import { arabicStyles } from "@/theme/typography";
import { RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

import { WORDS } from "@/data/wordsContent";
import { PRACTICES } from "@/engine/barakah";
import { transliterateQuranWord } from "@/engine/quranTranslit";
import { AYAHS, SURAHS } from "@/quran/tanzil";
import { ayahForDisplay, globalIndex } from "@/quran/text";

/*
  The five story heroes, one per tab, each drawn like its tab. Full bleed, drawn on paper, no container card.

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
export type HeroProps = {
  width: number;
  height: number;
  active: boolean;
  still: boolean;
  paused?: boolean;
};

/* A beat counter that runs only while active. Under Reduce Motion it jumps to the end. */
function useBeat(
  active: boolean,
  ms: number,
  still: boolean,
  end = 1000,
  paused = false,
): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) setN(0);
    else if (still) setN(end);
  }, [active, still, end]);
  const finished = n >= end;
  useEffect(() => {
    if (!active || still || paused || finished) return;
    const id = setInterval(() => setN((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [active, ms, still, paused, finished]);
  return n;
}

/*
  A page's moments, as a step count: 0 before the first mark (ms), 1 after it,
  and so on. Re-renders only when a mark passes, so the motion between marks
  is left to Reanimated on the UI thread rather than redrawn from JS in steps.
  `marks` must be a module constant.
*/
function useTimeline(active: boolean, still: boolean, paused: boolean | undefined, marks: readonly number[]): number {
  const [step, setStep] = useState(0);
  const elapsed = useRef(0);
  useEffect(() => {
    if (!active) {
      elapsed.current = 0;
      setStep(0);
    } else if (still) setStep(marks.length);
  }, [active, still, marks]);
  const done = step >= marks.length;
  useEffect(() => {
    if (!active || still || paused || done) return;
    const id = setInterval(() => {
      elapsed.current += 50;
      let n = 0;
      while (n < marks.length && elapsed.current >= marks[n]) n += 1;
      setStep((x) => (x === n ? x : n));
    }, 50);
    return () => clearInterval(id);
  }, [active, still, paused, done, marks]);
  return step;
}

/* A number that eases from 0 to `to` on the UI thread once mounted. */
function useGrow(to: number, ms: number, delay: number, still: boolean) {
  const v = useSharedValue(still ? to : 0);
  useEffect(() => {
    v.value = still ? to : withDelay(delay, withTiming(to, { duration: ms, easing: Easing.out(Easing.cubic) }));
  }, [to, ms, delay, still, v]);
  return v;
}

function GrowBar({ to, delay, color, width, still }: { to: number; delay: number; color: string; width: number; still: boolean }) {
  const v = useGrow(to, 850, delay, still);
  const style = useAnimatedStyle(() => ({ height: v.value }));
  return <Animated.View style={[{ width, borderRadius: 6, backgroundColor: color }, style]} />;
}

function GrowFill({ to, delay, color, still }: { to: number; delay: number; color: string; still: boolean }) {
  const v = useGrow(to, 900, delay, still);
  const style = useAnimatedStyle(() => ({ height: v.value }));
  return <Animated.View style={[{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: color }, style]} />;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function SmoothRing({ fraction, size, color, track, still }: { fraction: number; size: number; color: string; track: string; still: boolean }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = useGrow(fraction, 1300, 150, still);
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - v.value) }));
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${c} ${c}`}
        animatedProps={props}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

/* Reveals its child from the bottom edge upward, smoothly. */
function RiseReveal({ height, still, children }: { height: number; still: boolean; children: React.ReactNode }) {
  const v = useGrow(height, 1700, 200, still);
  const style = useAnimatedStyle(() => ({ height: v.value }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, bottom: 0, overflow: "hidden" }, style]}>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height }}>{children}</View>
    </Animated.View>
  );
}

/* The finger on the glass: a ring that settles in while the press is held. */
function PressRing({ style }: { style: object }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [p]);
  const anim = useAnimatedStyle(() => ({
    opacity: 0.85 * Math.min(1, p.value * 3),
    transform: [{ scale: 1.35 - 0.45 * p.value }],
  }));
  return <Animated.View style={[style, anim]} />;
}

/* Grows in by scale from slightly small, eased: the reader's zoom. */
const ZOOM_IN = ZoomIn.duration(420).easing(Easing.out(Easing.cubic));

const toArabicDigits = (n: number) =>
  String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

const useStyles = makeStyles((t) => ({
  center: { alignItems: "center", justifyContent: "center" },
  ayahLine: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: space(1.25),
  },
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
  counters: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space(5),
    marginTop: space(2),
  },
  counter: { alignItems: "center" },
  numeral: { fontSize: 40, lineHeight: 46 },
  wave: { position: "absolute", borderWidth: 1.5, borderColor: t.colors.lapis },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: space(1),
    maxWidth: 320,
  },
  chip: {
    minWidth: 130,
    alignItems: "center",
    borderRadius: RADIUS.pill,
    paddingVertical: space(1.25),
    paddingHorizontal: space(2),
    overflow: "hidden",
  },
  week: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: space(2.5),
  },
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
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.colors.lapis,
    alignItems: "center",
    justifyContent: "center",
  },
  result: {
    backgroundColor: t.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: t.colors.rule,
    paddingVertical: space(1.5),
    paddingHorizontal: space(2),
    gap: space(0.5),
  },
  searchCaption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space(0.75),
    paddingTop: space(2),
    paddingBottom: space(0.5),
  },
  searchItem: { paddingVertical: space(1.5), gap: space(0.5) },
  searchRule: { borderTopWidth: 1, borderTopColor: t.colors.rule },
  searchAyah: {
    ...arabicStyles.title,
    fontSize: 21,
    lineHeight: 42,
    color: t.colors.ink,
    textAlign: "right",
    writingDirection: "rtl",
  },
  learnButton: {
    minHeight: 50,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  learnOption: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  listen: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: t.colors.rule,
    paddingVertical: 6,
    paddingHorizontal: space(1.5),
  },
  press: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: t.colors.lapis,
    backgroundColor: t.colors.lapisWash,
    opacity: 0.85,
  },
  zoomFrame: { borderRadius: 30, padding: space(1.25), overflow: "hidden" },
  zoomPanel: { borderRadius: 22, backgroundColor: t.colors.paper, padding: space(2), gap: space(1.25), alignItems: "center" },
  zoomWords: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "center", gap: space(1) },
  zoomWord: { alignItems: "center", borderRadius: 14, paddingHorizontal: space(0.75), paddingVertical: space(0.5) },
  zoomFocus: {
    alignItems: "center",
    gap: 2,
    alignSelf: "stretch",
    borderRadius: 18,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.rule,
    paddingVertical: space(1.5),
  },
  seg: { flexDirection: "row", borderRadius: RADIUS.pill, padding: 4, overflow: "hidden" },
  segItem: { paddingVertical: 6, paddingHorizontal: space(1.25), borderRadius: RADIUS.pill },
  juzGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  juzCell: {
    height: 52,
    borderRadius: 12,
    backgroundColor: t.colors.surfaceSunk,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  juzFill: { position: "absolute", left: 0, right: 0, bottom: 0 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: space(2), height: 150 },
  barCol: { width: 18, borderRadius: 6 },
  tile: { height: 112, borderRadius: 22, padding: space(1.25), justifyContent: "space-between", overflow: "hidden" },
  mark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: t.colors.inkFaint,
    alignItems: "center",
    justifyContent: "center",
  },
  prayers: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 22,
    paddingVertical: space(1.25),
    paddingHorizontal: space(2),
    overflow: "hidden",
  },
  prayerDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: t.colors.inkFaint,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  prayerHalf: { position: "absolute", left: 0, right: 0, bottom: 0, height: "50%" },
  refRow: { flexDirection: "row", alignItems: "center", gap: space(1) },
  ref: {
    borderRadius: RADIUS.pill,
    backgroundColor: t.colors.lapisWash,
    paddingHorizontal: space(1.25),
    paddingVertical: 2,
  },
}));

/* ---------- 2. Read ---------- */

const READ = ["1:1", "1:2", "1:3"] as const;
/*
  Long press 1:2 and it lifts into the zoom, as in the reader: every word over
  its reading and meaning, then one word brought forward. The readings come
  from Durus's own transliterator; the four meanings are written here (Quran
  Foundation's word meanings are fetched after install, never bundled).
*/
const HELD = 1;
const MEANINGS = ["All praise", "for Allah", "Lord", "of the worlds"];
const FOCUS_WORD = 2;
/* Finger down, ayah held, zoom, one word brought forward. */
const READ_MARKS = [700, 1500, 2200, 5200] as const;

export function ReadHero({ width, height, active, still, paused }: HeroProps) {
  const s = useStyles();
  const theme = useTheme();
  const lines = READ.map((k) => AYAHS[k].split(" "));
  const step = useTimeline(active, still, paused, READ_MARKS);
  const pressing = step >= 1 && step < 3;
  const held = step === 2;
  const zoomed = step >= 3;
  const focus = step >= 4;
  const words = lines[HELD];

  return (
    <View style={[s.center, { width, flex: 1, gap: space(1) }]}>
      {lines.map((ws, a) => (
        <View
          key={READ[a]}
          style={[
            s.ayahLine,
            {
              borderRadius: 16,
              paddingHorizontal: space(1),
              backgroundColor: a === HELD && held ? theme.colors.lapisWash : "transparent",
            },
          ]}
        >
          <Text selectable={false} style={s.ayah}>
            {ws.join(" ")}
          </Text>
          <View style={s.marker}>
            <Text variant="label" color="saffron">
              {toArabicDigits(a + 1)}
            </Text>
          </View>
          {a === HELD && pressing ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.center]}>
              <PressRing style={s.press} />
            </View>
          ) : null}
        </View>
      ))}
      <Text variant="label" color="inkFaint" style={{ marginTop: space(1) }}>
        {zoomed ? " " : "Press and hold an ayah"}
      </Text>

      {zoomed ? (
        <>
          {/* The dim fades on its own layer; the glass card beside it only scales. */}
          <Animated.View
            entering={FadeIn.duration(300)}
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: theme.dark ? "rgba(8,10,16,0.55)" : "rgba(20,30,60,0.22)" }]}
          />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.center]}>
            <Animated.View entering={ZOOM_IN} style={{ width: width - space(3), maxHeight: height }}>
              <Glass style={s.zoomFrame}>
                <View style={s.zoomPanel}>
                  <Text variant="eyebrow" color="inkSoft">
                    Al-Fatiha 1:2
                  </Text>
                  <View style={s.zoomWords}>
                    {words.map((w, i) => (
                      <View key={i} style={[s.zoomWord, focus && i === FOCUS_WORD && { backgroundColor: theme.colors.lapisWash }]}>
                        <Text selectable={false} style={[s.ayah, { fontSize: 26, lineHeight: 48 }]}>
                          {w}
                        </Text>
                        <Text variant="label" color="inkSoft" style={{ fontStyle: "italic" }}>
                          {transliterateQuranWord(w)}
                        </Text>
                        <Text variant="label">{MEANINGS[i]}</Text>
                      </View>
                    ))}
                  </View>
                  {focus ? (
                    <Animated.View entering={FadeInUp.duration(320).easing(Easing.out(Easing.cubic))} style={s.zoomFocus}>
                      <Text selectable={false} style={[s.ayah, { fontSize: 50, lineHeight: 90, color: theme.colors.lapis }]}>
                        {words[FOCUS_WORD]}
                      </Text>
                      <Text color="inkSoft" style={{ fontStyle: "italic" }}>
                        {transliterateQuranWord(words[FOCUS_WORD])}
                      </Text>
                      <Text>{MEANINGS[FOCUS_WORD]}</Text>
                      <View style={[s.ref, { flexDirection: "row", alignItems: "center", gap: 4, marginTop: space(0.5) }]}>
                        <Speaker color={theme.colors.lapis} />
                        <Text variant="label" color="lapis">
                          Listen again
                        </Text>
                      </View>
                    </Animated.View>
                  ) : (
                    <Text variant="label" color="inkFaint" style={{ textAlign: "center" }}>
                      Tap a word to hear it
                    </Text>
                  )}
                </View>
              </Glass>
            </Animated.View>
          </View>
        </>
      ) : null}
    </View>
  );
}

function Speaker({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path
        d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/* ---------- 3. Progress ---------- */

const JUZ_AMMA_FIRST = 78;
/* The Progress tab's own views, in its order. */
const PROGRESS_VIEWS = ["Overview", "Wall", "Juz", "Stats", "Week"] as const;
const SHOWN_VIEWS = ["Overview", "Wall", "Juz", "Week"] as const;
const PROGRESS_MARKS = [2300, 4600, 6900] as const;
const WEEK = [12, 30, 8, 22, 40, 18, 26];

/*
  The Progress tab's views, each shown in turn under its own tab strip:
  Overview (the ring), Wall (every ayah a square, Juz Amma rising), Juz
  (thirty cells), Week (ayahs read each day). Everything that grows is eased
  on the UI thread.
*/
export function ProgressHero({ width, height, active, still, paused }: HeroProps) {
  const s = useStyles();
  const theme = useTheme();
  const amma = SURAHS.slice(JUZ_AMMA_FIRST - 1);
  const ammaSize = amma.reduce((n, x) => n + x.ayahs, 0);
  const end = 6236;
  const step = useTimeline(active, still, paused, PROGRESS_MARKS);
  /* Under Reduce Motion, the Wall. */
  const view = still ? "Wall" : SHOWN_VIEWS[step];
  const pct = Math.round((ammaSize / end) * 100);
  const inner = width - space(3);
  const cellW = (inner - 4 * 8) / 5;
  const fieldH = Math.max(120, height - 90);

  return (
    <View style={{ width, flex: 1, alignItems: "center", gap: space(1.5) }}>
      <Glass style={s.seg}>
        {PROGRESS_VIEWS.map((label) => (
          <View key={label} style={[s.segItem, label === view && { backgroundColor: theme.colors.lapisWash }]}>
            <Text variant="label" color={label === view ? "lapis" : "inkSoft"}>
              {label}
            </Text>
          </View>
        ))}
      </Glass>

      <View key={view} style={[s.center, { flex: 1, width: inner }]}>
        {view === "Overview" ? (
          <Animated.View entering={FadeIn.duration(260)} style={[s.center, { gap: space(2) }]}>
            <View style={s.center}>
              <SmoothRing fraction={ammaSize / end} size={170} color={theme.colors.saffron} track={theme.colors.surfaceSunk} still={still} />
              <View style={[s.center, { position: "absolute" }]}>
                <Text variant="numeral" style={{ fontSize: 32, lineHeight: 38 }}>{`${pct}%`}</Text>
                <Text variant="label" color="inkSoft">
                  memorized
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 18, lineHeight: 24 }}>{`${amma.length} surahs memorized`}</Text>
          </Animated.View>
        ) : null}

        {view === "Wall" ? (
          <View style={{ width: inner, height: fieldH }}>
            <AyahField width={inner} height={fieldH} memorized={() => false} understood={() => false} />
            <RiseReveal height={fieldH} still={still}>
              <AyahField width={inner} height={fieldH} memorized={(i) => i >= end - ammaSize} understood={() => false} />
            </RiseReveal>
          </View>
        ) : null}

        {view === "Juz" ? (
          <Animated.View entering={FadeIn.duration(260)} style={s.juzGrid}>
            {Array.from({ length: 30 }, (_, j) => {
              const f = j === 29 ? 1 : j === 0 ? 0.15 : 0;
              return (
                <View key={j} style={[s.juzCell, { width: cellW }]}>
                  {f > 0 ? <GrowFill to={52 * f} delay={j === 29 ? 200 : 500} color={theme.colors.saffron} still={still} /> : null}
                  <Text variant="label" color={f >= 1 ? "paper" : "inkSoft"}>{`${j + 1}`}</Text>
                </View>
              );
            })}
          </Animated.View>
        ) : null}

        {view === "Week" ? (
          <Animated.View entering={FadeIn.duration(260)} style={[s.center, { gap: space(2) }]}>
            <View style={s.bars}>
              {WEEK.map((n, i) => (
                <View key={i} style={{ alignItems: "center", gap: 4 }}>
                  <GrowBar to={4 + n * 3} delay={120 + i * 70} color={theme.colors.verdigris} width={18} still={still} />
                  <Text variant="label" color="inkFaint" style={{ fontSize: 11 }}>
                    {"SMTWTFS"[i]}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 18, lineHeight: 24 }}>{`${WEEK.reduce((a, b) => a + b, 0)} ayahs read this week`}</Text>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

/* ---------- 4. Learn ---------- */

/*
  The Learn tab as it is, in three beats: the Learn page (the ring of words
  known and Begin), the New word card (the word, its reading, Listen, the
  meaning, the other forms, how often it comes), then the question (What does
  this mean?, Show the meanings, the right one turns green).

  The word is رَبِّ from the bundled Quranic Words content (its forms and
  count); the face is the Tanzil text of 1:2. Its meaning, "Lord", and the
  three wrong options are written here: Quran Foundation's meanings arrive
  after install and may not ship.
*/
const LEARN_LEMMA = WORDS.lemmas.find((l) => l.anchor.ayah === "1:2" && l.anchor.word === 3);
const OPTIONS = ["said", "Lord", "day", "earth"];
/* New word, the question, the meanings shown, the right one picked. */
const LEARN_MARKS = [3000, 6200, 7400, 8600] as const;
const RIGHT = "Lord";

export function LearnHero({ width, active, still, paused }: HeroProps) {
  const s = useStyles();
  const theme = useTheme();
  const word = AYAHS["1:2"].split(" ")[2];
  const others = (LEARN_LEMMA?.forms ?? []).filter((f) => f !== LEARN_LEMMA?.face).slice(0, 3);
  const step = useTimeline(active, still, paused, LEARN_MARKS);
  const phase = step === 0 ? "home" : step === 1 ? "teach" : "drill";
  const shownMeanings = step >= 3;
  const picked = step >= 4;
  const known = 12;

  return (
    <View key={phase} style={[s.center, { width, flex: 1, paddingHorizontal: space(3), gap: space(2) }]}>
      {phase === "home" ? (
        <View style={[s.center, { gap: space(2) }]}>
          <View style={s.center}>
            <BarakahRing fills={[known / 100]} size={140} stroke={9} />
            <View style={[s.center, { position: "absolute" }]}>
              <Text variant="numeral" style={{ fontSize: 30, lineHeight: 36 }}>{`${known}%`}</Text>
              <Text variant="label" color="inkSoft">
                of words known
              </Text>
            </View>
          </View>
          <Text variant="pageTitle" style={{ textAlign: "center" }}>
            Learn the words of the Quran
          </Text>
          <Text color="inkSoft" style={{ textAlign: "center", maxWidth: 300 }}>
            A few hundred words make up most of what you hear in recitation.
          </Text>
          <View style={{ alignSelf: "stretch", gap: space(1) }}>
            <Glass style={s.learnButton} tint={theme.colors.lapis}>
              <Text color="paper">Begin</Text>
            </Glass>
            <Glass style={s.learnButton}>
              <Text>Arabic Course</Text>
            </Glass>
          </View>
        </View>
      ) : null}

      {phase === "teach" ? (
        <Animated.View entering={FadeIn.duration(220)} style={[s.center, { gap: space(1.25) }]}>
          <Text variant="eyebrow" color="inkSoft">
            New word
          </Text>
          <Text selectable={false} style={[s.ayah, { fontSize: 60, lineHeight: 110 }]}>
            {word}
          </Text>
          <Text variant="label" color="inkSoft">
            {transliterateQuranWord(word)}
          </Text>
          <View style={[s.listen]}>
            <Speaker color={theme.colors.lapis} />
            <Text variant="label">Listen</Text>
          </View>
          <Text variant="pageTitle">{RIGHT}</Text>
          {others.length > 0 ? (
            <>
              <Text variant="label" color="inkFaint">
                Also heard as
              </Text>
              <View style={{ flexDirection: "row-reverse", gap: space(2) }}>
                {others.map((f) => (
                  <View key={f} style={{ alignItems: "center" }}>
                    <Text selectable={false} style={[s.ayah, { fontSize: 24, lineHeight: 44, color: theme.colors.inkSoft }]}>
                      {f}
                    </Text>
                    <Text variant="label" color="inkFaint">
                      {transliterateQuranWord(f)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
          {LEARN_LEMMA ? (
            <Text variant="label" color="inkSoft" style={{ textAlign: "center" }}>
              {`In ${LEARN_LEMMA.freq.toLocaleString("en-US")} words of the Quran. Heard in Al-Fatiha 1:2.`}
            </Text>
          ) : null}
        </Animated.View>
      ) : null}

      {phase === "drill" ? (
        <View style={[s.center, { gap: space(1.25), alignSelf: "stretch" }]}>
          <Text variant="eyebrow" color="inkSoft">
            What does this mean?
          </Text>
          <Text selectable={false} style={[s.ayah, { fontSize: 56, lineHeight: 104 }]}>
            {word}
          </Text>
          {shownMeanings ? (
            <View style={{ alignSelf: "stretch", gap: space(1) }}>
              {OPTIONS.map((o) => (
                /* Glass options: no opacity fade (glass will not draw under one). */
                <Glass key={o} style={s.learnOption} tint={picked && o === RIGHT ? theme.colors.verdigris : undefined}>
                  <Text color={picked && o === RIGHT ? "paper" : "ink"}>{o}</Text>
                </Glass>
              ))}
            </View>
          ) : (
            <>
              <Text color="inkFaint">Think of the meaning first.</Text>
              <Glass style={[s.learnButton, { alignSelf: "stretch" }]} tint={theme.colors.lapis}>
                <Text color="paper">Show the meanings</Text>
              </Glass>
            </>
          )}
          {picked ? (
            <Text variant="label" color="inkSoft">
              Heard in Al-Fatiha 1:2
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/* ---------- 5. Barakah ---------- */

/*
  The Barakah tab as it is: the four practices every learner starts with,
  under the ring, and the five prayers below. They fill in one by one.
*/
const START_PRACTICES = PRACTICES.filter((p) => p.byDefault);
const TILE_LINE: Record<string, string> = {
  fajr: "Within its time",
  morningAdhkar: `${adhkarFor("morning").length} adhkar, guided`,
  eveningAdhkar: `${adhkarFor("evening").length} adhkar, guided`,
};
const PRAYER_NAMES = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
/* Beat at which each prayer is marked: late (half), then on time (full). */
const PRAYER_AT: { late?: number; full?: number }[] = [{ full: 2 }, { late: 5 }, { full: 8 }, { late: 11, full: 13 }, {}];
/* Beat at which each tile ticks; Fajr ticks with its prayer. */
const TILE_AT: Record<string, number> = { fajr: 2, morningAdhkar: 4, quran: 10 };

export function BarakahHero({ width, active, still, paused }: HeroProps) {
  const s = useStyles();
  const theme = useTheme();
  const beat = useBeat(active, 400, still, 18, paused);
  const b = still ? 18 : beat;
  const done = START_PRACTICES.map((p) => TILE_AT[p.id] !== undefined && b >= TILE_AT[p.id]);
  const count = done.filter(Boolean).length;
  const read = Math.min(10, Math.max(0, b - 4) + 2);
  const tileW = (width - space(3) - space(1.25)) / 2;

  return (
    <View style={{ width, flex: 1, justifyContent: "center", paddingHorizontal: space(1.5), gap: space(1.25) }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space(2), paddingHorizontal: space(1) }}>
        <View style={s.center}>
          <BarakahRing fills={done.map((d) => (d ? 1 : 0))} size={92} stroke={9} />
          <View style={[s.center, { position: "absolute" }]}>
            <Text variant="numeral" style={{ fontSize: 26, lineHeight: 30 }}>{`${count}`}</Text>
          </View>
        </View>
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 18, lineHeight: 24 }}>{`${count} of ${START_PRACTICES.length} done today`}</Text>
          <Text variant="label" color="inkSoft">
            Small daily practices
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space(1.25) }}>
        {START_PRACTICES.map((p, i) => (
          <Glass key={p.id} style={[s.tile, { width: tileW }]}>
            <View style={[s.mark, done[i] && { backgroundColor: theme.colors.verdigris, borderColor: theme.colors.verdigris }]}>
              {done[i] ? <Check color={theme.colors.paper} /> : null}
            </View>
            <View style={{ alignItems: "center", gap: 1 }}>
              <PracticeIcon id={p.id} color={done[i] ? theme.colors.verdigris : theme.colors.lapis} />
              <Text numberOfLines={1} color={done[i] ? "verdigris" : "ink"} style={{ fontSize: 15 }}>
                {p.title}
              </Text>
              <Text variant="label" color="inkSoft" numberOfLines={1} style={{ fontSize: 12 }}>
                {p.id === "quran" ? `${read} of 10 ayahs` : TILE_LINE[p.id]}
              </Text>
            </View>
          </Glass>
        ))}
      </View>

      <Glass style={s.prayers}>
        {PRAYER_NAMES.map((name, i) => {
          const at = PRAYER_AT[i];
          const full = at.full !== undefined && b >= at.full;
          const late = !full && at.late !== undefined && b >= at.late;
          return (
            <View key={name} style={{ alignItems: "center", gap: 4 }}>
              <View
                style={[
                  s.prayerDot,
                  (full || late) && { borderColor: theme.colors.verdigris },
                  full && { backgroundColor: theme.colors.verdigris },
                ]}
              >
                {late ? <View style={[s.prayerHalf, { backgroundColor: theme.colors.verdigris }]} /> : null}
                {full ? <Check color={theme.colors.paper} /> : null}
              </View>
              <Text variant="label" color={full || late ? "verdigris" : "inkSoft"} style={{ fontSize: 11 }}>
                {name}
              </Text>
            </View>
          );
        })}
      </Glass>
      <Text variant="label" color="inkFaint" style={{ textAlign: "center" }}>
        One tap: prayed late. Two: on time.
      </Text>
    </View>
  );
}

function Check({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24">
      <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/* ---------- 1. Search ---------- */

/*
  The Search tab as it is while searching: the bar at the top, a moment of
  seeking, then the AI's caption with its sparkle and a plain list, each
  result its reason, the Arabic and where it is from, with a rule between.
  The reasons are written here; the English under each ayah in the app comes
  from Quran Foundation after install, so none is shown.
*/
const QUESTION = "I feel anxious";
const RESULTS = [
  { ref: "13:28", reason: "Hearts find rest in remembering Allah" },
  { ref: "94:5", reason: "With hardship comes ease" },
  { ref: "2:153", reason: "Patience and prayer as a help" },
] as const;
/* Seeking, then the results. Typing runs first (70 ms a letter). */
const SEARCH_MARKS = [1250, 2300] as const;

export function SearchHero({ width, active, still, paused }: HeroProps) {
  const s = useStyles();
  const theme = useTheme();
  const typedBeat = useBeat(active, 70, still, QUESTION.length, paused);
  const typed = still ? QUESTION.length : typedBeat;
  const step = useTimeline(active, still, paused, SEARCH_MARKS);
  const seeking = step === 1;
  const results = step >= 2;

  return (
    <View style={{ width, flex: 1, paddingHorizontal: space(2), gap: space(0.5) }}>
      <Glass style={s.inputBar}>
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Circle cx={11} cy={11} r={6.5} stroke={theme.colors.inkSoft} strokeWidth={1.8} fill="none" />
          <Path d="M16 16l4.5 4.5" stroke={theme.colors.inkSoft} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
        <Text color={typed > 0 ? "ink" : "inkFaint"} style={{ flex: 1, fontSize: 17 }} numberOfLines={1}>
          {typed > 0 ? QUESTION.slice(0, typed) : "Search the Quran"}
        </Text>
      </Glass>

      {seeking ? (
        <Animated.View entering={FadeIn.duration(240)} style={{ flex: 1 }}>
          <Seeking />
        </Animated.View>
      ) : null}

      {results ? (
        <View style={{ flex: 1 }}>
          <Animated.View entering={FadeIn.duration(300)} style={s.searchCaption}>
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path d="M12 2.5l2.1 6.4 6.4 2.1-6.4 2.1L12 19.5l-2.1-6.4L3.5 11l6.4-2.1zM19 16l.9 2.1 2.1.9-2.1.9L19 22l-.9-2.1-2.1-.9 2.1-.9z" fill={theme.colors.lapis} />
            </Svg>
            <Text variant="label" color="inkSoft">
              Ayahs for when you feel anxious
            </Text>
          </Animated.View>
          {RESULTS.map((r, i) => {
            const [sn, an] = r.ref.split(":").map(Number);
            return (
              <Animated.View
                key={r.ref}
                entering={FadeInDown.duration(380).delay(120 + i * 140).easing(Easing.out(Easing.cubic))}
                style={[s.searchItem, i > 0 && s.searchRule]}
              >
                <Text variant="label" color="lapis">
                  {r.reason}
                </Text>
                <Text selectable={false} numberOfLines={3} style={s.searchAyah}>
                  {ayahForDisplay(globalIndex(sn, an))}
                </Text>
                <Text variant="label" color="inkFaint">{`${SURAHS[sn - 1].en} ${r.ref}`}</Text>
              </Animated.View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/* In the order of the tabs: Search, Read, Progress, Learn, Barakah. `ms` is
   how long the page shows before moving on. */
export const STORY = [
  {
    key: "search",
    title: "Search",
    line: "A surah, an ayah, a topic or how you feel. Durus finds the ayahs.",
    Hero: SearchHero,
    ms: 6500,
  },
  {
    key: "read",
    title: "Read the Quran",
    line: "Press and hold any ayah to see every word, its reading and meaning, and hear it.",
    Hero: ReadHero,
    ms: 9000,
  },
  {
    key: "progress",
    title: "See what you carry",
    line: "Your memorization as a ring, a wall of every ayah, each juz and your week.",
    Hero: ProgressHero,
    ms: 9500,
  },
  {
    key: "learn",
    title: "Learn the Arabic",
    line: "The Quran's most common words, brought back just before you forget them.",
    Hero: LearnHero,
    ms: 11000,
  },
  {
    key: "barakah",
    title: "Build barakah",
    line: "Fajr, the morning and evening adhkar, your daily portion and the five prayers.",
    Hero: BarakahHero,
    ms: 7500,
  },
] as const;
