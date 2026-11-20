import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { AyahField } from "@/components/AyahField";
import { adhkarFor } from "@/barakah/adhkar";
import { BarakahRing } from "@/components/BarakahRing";
import { Glass } from "@/components/Glass";
import { PracticeIcon } from "@/components/PracticeIcon";
import { Text } from "@/components/Text";
import { arabicStyles } from "@/theme/typography";
import { RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

import { PRACTICES } from "@/engine/barakah";
import { transliterateQuranWord } from "@/engine/quranTranslit";
import { AYAHS, SURAHS } from "@/quran/tanzil";

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

export function ReadHero({ width, height, active, still, paused }: HeroProps) {
  const s = useStyles();
  const theme = useTheme();
  const lines = READ.map((k) => AYAHS[k].split(" "));
  /* 200 ms beats: press from 4, held (ayah tinted) from 8, zoom from 11, word focus from 24. */
  const beat = useBeat(active, 200, still, 60, paused);
  const b = still ? 60 : beat;
  const pressing = b >= 4 && b < 11;
  const zoomed = b >= 11;
  const focus = b >= 24;
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
              backgroundColor: a === HELD && b >= 8 && !zoomed ? theme.colors.lapisWash : "transparent",
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
            /* The finger: a ring that tightens while the press is held. */
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.center]}>
              <View style={[s.press, { transform: [{ scale: 1.25 - Math.min(1, (b - 4) / 6) * 0.35 }] }]} />
            </View>
          ) : null}
        </View>
      ))}
      <Text variant="label" color="inkFaint" style={{ marginTop: space(1) }}>
        {zoomed ? " " : "Press and hold an ayah"}
      </Text>

      {zoomed ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            s.center,
            { backgroundColor: theme.dark ? "rgba(8,10,16,0.55)" : "rgba(20,30,60,0.22)" },
          ]}
        >
          {/* Grows in by scale, never by fading: glass does not draw under an animated opacity. */}
          <Animated.View entering={ZoomIn.duration(320)} style={{ width: width - space(3), maxHeight: height }}>
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
                  <Animated.View entering={FadeInUp.duration(260)} style={s.zoomFocus}>
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
const VIEW_BEATS = 22;

function PercentRing({ fraction, size, color, track }: { fraction: number; size: number; color: string; track: string }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${c * fraction} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

/*
  The Progress tab's views, each shown in turn under its own tab strip:
  Overview (the ring), Wall (every ayah a square, Juz Amma lighting up), Juz
  (thirty cells), Week (ayahs read each day).
*/
export function ProgressHero({ width, height, active, still, paused }: HeroProps) {
  const s = useStyles();
  const theme = useTheme();
  const amma = SURAHS.slice(JUZ_AMMA_FIRST - 1);
  const ammaSize = amma.reduce((n, x) => n + x.ayahs, 0);
  const end = 6236;

  /* 100 ms beats; each view holds VIEW_BEATS. Under Reduce Motion, the Wall. */
  const beat = useBeat(active, 100, still, VIEW_BEATS * SHOWN_VIEWS.length, paused);
  const b = still ? VIEW_BEATS + VIEW_BEATS - 1 : beat;
  const shown = Math.min(SHOWN_VIEWS.length - 1, Math.floor(b / VIEW_BEATS));
  const view = SHOWN_VIEWS[shown];
  const local = b - shown * VIEW_BEATS;
  const grow = still ? 1 : Math.min(1, local / 14);
  const lit = Math.round(ammaSize * (view === "Wall" ? grow : 1));
  const pct = Math.round((ammaSize / end) * 100);
  const inner = width - space(3);
  const cellW = (inner - 4 * 8) / 5;

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
          <Animated.View entering={FadeIn.duration(240)} style={[s.center, { gap: space(2) }]}>
            <View style={s.center}>
              <PercentRing fraction={(ammaSize / end) * grow} size={170} color={theme.colors.saffron} track={theme.colors.surfaceSunk} />
              <View style={[s.center, { position: "absolute" }]}>
                <Text variant="numeral" style={{ fontSize: 32, lineHeight: 38 }}>{`${Math.round(pct * grow)}%`}</Text>
                <Text variant="label" color="inkSoft">
                  memorized
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 18, lineHeight: 24 }}>{`${amma.length} surahs memorized`}</Text>
          </Animated.View>
        ) : null}

        {view === "Wall" ? (
          <AyahField width={inner} height={Math.max(120, height - 90)} memorized={(i) => i >= end - lit} understood={() => false} />
        ) : null}

        {view === "Juz" ? (
          <Animated.View entering={FadeIn.duration(240)} style={s.juzGrid}>
            {Array.from({ length: 30 }, (_, j) => {
              const f = j === 29 ? grow : j === 0 ? grow * 0.15 : 0;
              return (
                <View key={j} style={[s.juzCell, { width: cellW }]}>
                  <View style={[s.juzFill, { height: `${f * 100}%`, backgroundColor: theme.colors.saffron }]} />
                  <Text variant="label" color={f >= 1 ? "paper" : "inkSoft"}>{`${j + 1}`}</Text>
                </View>
              );
            })}
          </Animated.View>
        ) : null}

        {view === "Week" ? (
          <Animated.View entering={FadeIn.duration(240)} style={[s.center, { gap: space(2) }]}>
            <View style={s.bars}>
              {[12, 30, 8, 22, 40, 18, 26].map((n, i) => (
                <View key={i} style={{ alignItems: "center", gap: 4 }}>
                  <View style={[s.barCol, { height: 4 + n * 3 * grow, backgroundColor: theme.colors.verdigris }]} />
                  <Text variant="label" color="inkFaint" style={{ fontSize: 11 }}>
                    {"SMTWTFS"[i]}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 18, lineHeight: 24 }}>156 ayahs read this week</Text>
          </Animated.View>
        ) : null}
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
      p.value = withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      );
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
        <Text
          selectable={false}
          style={[
            s.ayah,
            { fontSize: 72, lineHeight: 130, color: theme.colors.ink },
          ]}
        >
          {word}
        </Text>
      </View>
      <View style={[s.chips, { minHeight: 110 }]}>
        {showChips
          ? OPTIONS.map((o) => (
              /* Glass chips: no opacity fade (glass will not draw under one). */
              <View key={o}>
                <Glass
                  style={s.chip}
                  tint={
                    picked && o === RIGHT ? theme.colors.verdigris : undefined
                  }
                >
                  <Text color={picked && o === RIGHT ? "paper" : "ink"}>
                    {o}
                  </Text>
                </Glass>
              </View>
            ))
          : null}
      </View>
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

const QUESTION = "I feel anxious";
const RESULTS = [
  { ref: "13:28", surah: 13 },
  { ref: "94:5", surah: 94 },
] as const;

export function SearchHero({ width, active, still, paused }: HeroProps) {
  const s = useStyles();
  const theme = useTheme();
  const beat = useBeat(active, 70, still, 1000, paused);
  const typed = still ? QUESTION.length : Math.min(beat, QUESTION.length);
  const after = beat - QUESTION.length;
  const shown = still ? 2 : after > 6 ? (after > 14 ? 2 : 1) : 0;

  return (
    <View
      style={{
        width,
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: space(3),
        gap: space(2),
      }}
    >
      <View
        style={{ gap: space(1.25), minHeight: 260, justifyContent: "flex-end" }}
      >
        {RESULTS.slice(0, shown).map((r) => (
          <Animated.View
            key={r.ref}
            entering={FadeInDown.duration(300)}
            style={s.result}
          >
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
            <Text
              selectable={false}
              style={[s.ayah, { fontSize: 22, lineHeight: 44 }]}
            >
              {AYAHS[r.ref]}
            </Text>
          </Animated.View>
        ))}
      </View>
      <Glass style={s.inputBar}>
        <Text
          color={typed > 0 ? "ink" : "inkFaint"}
          style={{ flex: 1 }}
          numberOfLines={1}
        >
          {typed > 0
            ? QUESTION.slice(0, typed)
            : "Search the Quran"}
        </Text>
        <View style={s.send}>
          <Svg width={16} height={16} viewBox="0 0 24 24">
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
      </Glass>
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
    ms: 5000,
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
    ms: 9000,
  },
  {
    key: "learn",
    title: "Learn the Arabic",
    line: "The Quran's most common words, brought back just before you forget them.",
    Hero: LearnHero,
    ms: 5000,
  },
  {
    key: "barakah",
    title: "Build barakah",
    line: "Fajr, the morning and evening adhkar, your daily portion and the five prayers.",
    Hero: BarakahHero,
    ms: 7500,
  },
] as const;
