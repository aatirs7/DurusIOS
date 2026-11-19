import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { AyahField } from "@/components/AyahField";
import { Glass, GlassButton } from "@/components/Glass";
import { TabSafe, useTabTop } from "@/components/TabSafe";
import { Text } from "@/components/Text";
import { TOP_BAR_HEIGHT, TopBar } from "@/components/TopBar";
import { rangePath } from "@/onboarding/field";
import { ago, progress, readingWeek, recentMarks } from "@/quran/progress";
import { countRange, foldStatus } from "@/quran/status";
import { JUZ_STARTS, SURAHS, TOTAL_AYAHS } from "@/quran/tanzil";
import { quranText } from "@/quran/text";
import { localToday } from "@/state/barakah";
import { usePrefs } from "@/state/prefs";
import { useQuranStatus } from "@/state/quranStatus";
import { FONTS } from "@/theme/typography";
import { MARGIN, RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  Progress: one screen, no scrolling down. Swipe sideways between five views.

    Overview  a calm first look: one ring, a few plain lines, what each view is
    Wall    every ayah as a dot, the whole Quran at once
    Juz     thirty small fields, one per juz; tap one to mark its surahs
    Stats   the two rings and the counts that matter
    Week    reading over the last seven days and the latest marks

  Each view is sized to the space it has, so nothing is cut off and nothing
  scrolls. Marking any surah is one tap away in the glass Mark button.
*/

const PAGES = ["Overview", "Wall", "Juz", "Stats", "Week"] as const;
/* Space kept clear above the floating tab bar. */
const TAB_ROOM = space(11);
const NO_LOG: Record<string, number[]> = {};
const NO_BOOKMARKS: number[] = [];

const JUZ_RANGES: [number, number][] = JUZ_STARTS.map((s, i) => [
  s,
  i + 1 < JUZ_STARTS.length ? JUZ_STARTS[i + 1] : TOTAL_AYAHS,
]);

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.colors.paper },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: MARGIN,
    paddingTop: space(1),
  },
  markBtn: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: space(2),
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  seg: {
    flexDirection: "row",
    alignSelf: "center",
    borderRadius: RADIUS.pill,
    padding: 3,
    marginVertical: space(1.5),
    overflow: "hidden",
  },
  segItem: {
    paddingVertical: 7,
    paddingHorizontal: space(1.5),
    borderRadius: RADIUS.pill,
  },
  segOn: { backgroundColor: t.colors.lapisWash },
  page: { paddingHorizontal: MARGIN },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space(2.5),
    paddingTop: space(1.25),
  },
  headline: {
    fontFamily: FONTS.uiMedium,
    fontSize: 19,
    lineHeight: 25,
    color: t.colors.ink,
    textAlign: "center",
    paddingBottom: space(0.5),
  },
  caption: {
    textAlign: "center",
    paddingBottom: space(1.5),
    paddingHorizontal: space(1),
  },
  legendItem: { alignItems: "center" },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  juzGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  juzCell: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  rings: { flexDirection: "row", justifyContent: "center", gap: space(3) },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space(1) },
  card: {
    flexGrow: 1,
    flexBasis: "30%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    paddingVertical: space(1.25),
    paddingHorizontal: space(1.25),
    alignItems: "center",
  },
  panel: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    padding: space(2),
    gap: space(1.25),
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: space(1),
  },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  /* Sheets */
  sheet: {
    flex: 1,
    backgroundColor: t.colors.paper,
    paddingHorizontal: MARGIN,
    paddingTop: space(1.5),
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: t.colors.rule,
    marginBottom: space(2),
  },
  ar: {
    fontFamily: FONTS.quran,
    fontSize: 20,
    lineHeight: 38,
    color: t.colors.ink,
    writingDirection: "rtl",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: space(1.25),
    gap: space(1.5),
  },
  rule: { height: 1, backgroundColor: t.colors.rule },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: t.colors.surfaceSunk,
    overflow: "hidden",
    flexDirection: "row",
  },
  bigToggle: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: t.colors.rule,
    paddingVertical: space(1.75),
    alignItems: "center",
    gap: 2,
  },
  dots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingVertical: space(2),
  },
  dot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: t.colors.rule,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: t.colors.rule,
    paddingVertical: 6,
    paddingHorizontal: space(1.75),
  },
  pillOn: { backgroundColor: t.colors.lapisWash, borderColor: t.colors.lapis },
}));

const pct = (x: number) =>
  x === 0 ? "0" : x < 0.01 ? "<1" : String(Math.round(x * 100));
const fmt = (n: number) => n.toLocaleString("en-US");

function Ring({
  fraction,
  color,
  size,
  stroke,
  children,
}: {
  fraction: number;
  color: string;
  size: number;
  stroke: number;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={size}
        height={size}
        style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={theme.colors.surfaceSunk}
          strokeWidth={stroke}
          fill="none"
        />
        {fraction > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${Math.max(0.01, fraction) * c} ${c}`}
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}

/* One juz as its own small field. */
function JuzField({
  width,
  height,
  range,
  memorized,
  understood,
}: {
  width: number;
  height: number;
  range: [number, number];
  memorized: Uint8Array;
  understood: Uint8Array;
}) {
  const theme = useTheme();
  const [a, b] = range;
  const base = useMemo(
    () => rangePath(width, height, a, b, () => true),
    [width, height, a, b],
  );
  const m = rangePath(
    width,
    height,
    a,
    b,
    (i) => memorized[i] === 1 && understood[i] !== 1,
  );
  const u = rangePath(width, height, a, b, (i) => understood[i] === 1);
  return (
    <Svg width={width} height={height}>
      <Path d={base} fill={theme.colors.rule} />
      {m ? <Path d={m} fill={theme.colors.saffron} /> : null}
      {u ? <Path d={u} fill={theme.colors.verdigris} /> : null}
    </Svg>
  );
}

/* ---------- sheets ---------- */

function Sheet({
  visible,
  onClose,
  onDismiss,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  children: React.ReactNode;
}) {
  const s = useStyles();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <View style={s.sheet}>
        <View style={s.grabber} />
        {children}
      </View>
    </Modal>
  );
}

/* Mark a surah whole, or ayah by ayah. */
function SurahSheet({
  surah,
  onClose,
}: {
  surah: number | null;
  onClose: () => void;
}) {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const events = useQuranStatus((st) => st.events);
  const setSurah = useQuranStatus((st) => st.setSurah);
  const setAyah = useQuranStatus((st) => st.setAyah);
  const [mode, setMode] = useState<"memorized" | "understood">("memorized");
  const maps = useMemo(() => foldStatus(events), [events]);
  if (surah === null) return null;
  const x = SURAHS[surah - 1];
  const map = maps[mode];
  const m = countRange(maps.memorized, x.start, x.start + x.ayahs);
  const u = countRange(maps.understood, x.start, x.start + x.ayahs);
  const color =
    mode === "memorized" ? theme.colors.saffron : theme.colors.verdigris;

  return (
    <Sheet visible onClose={onClose}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: space(6) }}
      >
        <View style={{ alignItems: "center", gap: 2, paddingBottom: space(2) }}>
          <Text
            selectable={false}
            style={[s.ar, { fontSize: 30, lineHeight: 56 }]}
          >
            {x.ar}
          </Text>
          <Text variant="pageTitle">{x.en}</Text>
          <Text
            variant="label"
            color="inkSoft"
          >{`${x.ayahs} ayahs. ${m} memorized, ${u} understood`}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: space(1.25) }}>
          {(["memorized", "understood"] as const).map((f) => {
            const all = (f === "memorized" ? m : u) === x.ayahs;
            const c =
              f === "memorized" ? theme.colors.saffron : theme.colors.verdigris;
            return (
              <Pressable
                key={f}
                accessibilityRole="button"
                onPress={() => setSurah(x.n, f, !all)}
                style={[
                  s.bigToggle,
                  all && { backgroundColor: c, borderColor: c },
                ]}
              >
                <Text color={all ? "paper" : "ink"}>
                  {all
                    ? f === "memorized"
                      ? "Memorized"
                      : "Understood"
                    : f === "memorized"
                      ? "Mark memorized"
                      : "Mark understood"}
                </Text>
                <Text variant="label" color={all ? "paper" : "inkSoft"}>
                  Whole surah
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: space(3),
          }}
        >
          <Text variant="eyebrow" color="inkSoft">
            Ayah by ayah
          </Text>
          <View style={{ flexDirection: "row", gap: space(1) }}>
            {(["memorized", "understood"] as const).map((f) => (
              <Pressable
                key={f}
                accessibilityRole="button"
                onPress={() => setMode(f)}
                style={[s.pill, mode === f && s.pillOn]}
              >
                <Text variant="label" color={mode === f ? "lapis" : "inkSoft"}>
                  {f === "memorized" ? "Memorized" : "Understood"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={s.dots}>
          {Array.from({ length: x.ayahs }, (_, i) => {
            const on = map[x.start + i] === 1;
            return (
              <Pressable
                key={i}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`Ayah ${i + 1}`}
                onPress={() => setAyah(x.start + i, mode, !on)}
                style={[
                  s.dot,
                  on && { backgroundColor: color, borderColor: color },
                ]}
              >
                <Text variant="label" color={on ? "paper" : "inkSoft"}>
                  {String(i + 1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onClose();
            setTimeout(() => router.push(`/surah/${x.n}`), 350);
          }}
          style={[
            s.pill,
            {
              alignSelf: "center",
              paddingHorizontal: space(3),
              paddingVertical: space(1.25),
            },
          ]}
        >
          <Text color="lapis">Open in Read</Text>
        </Pressable>
      </ScrollView>
    </Sheet>
  );
}

/* Pick any surah to mark, optionally limited to one juz. */
function PickSheet({
  juz,
  visible,
  onClose,
  onPick,
  offset,
}: {
  juz: number | null;
  visible: boolean;
  onClose: () => void;
  onPick: (n: number) => void;
  /* Where the list was scrolled to, kept by the screen, so coming back from
     a surah opens the list at the same place. */
  offset: { current: number };
}) {
  const s = useStyles();
  const theme = useTheme();
  const events = useQuranStatus((st) => st.events);
  const maps = useMemo(() => foldStatus(events), [events]);
  const list = useMemo(() => {
    if (juz === null) return SURAHS;
    const [a, b] = JUZ_RANGES[juz - 1];
    return SURAHS.filter((x) => x.start < b && x.start + x.ayahs > a);
  }, [juz]);
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text
        variant="pageTitle"
        style={{ textAlign: "center", paddingBottom: space(1.5) }}
      >
        {juz === null ? "Mark a surah" : `Juz ${juz}`}
      </Text>
      <FlatList
        data={list}
        keyExtractor={(x) => String(x.n)}
        contentOffset={{ x: 0, y: offset.current }}
        onScroll={(e) => {
          offset.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={64}
        ItemSeparatorComponent={() => <View style={s.rule} />}
        contentContainerStyle={{ paddingBottom: space(6) }}
        renderItem={({ item }) => {
          const m = countRange(
            maps.memorized,
            item.start,
            item.start + item.ayahs,
          );
          const u = countRange(
            maps.understood,
            item.start,
            item.start + item.ayahs,
          );
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.en}, ${m} of ${item.ayahs} memorized`}
              onPress={() => onPick(item.n)}
              style={s.row}
            >
              <Text
                variant="label"
                color="inkFaint"
                style={{ width: 28, textAlign: "center" }}
              >
                {String(item.n)}
              </Text>
              <View style={{ flex: 1, gap: 4 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text>{item.en}</Text>
                  <Text
                    variant="label"
                    color="inkFaint"
                  >{`${m}/${item.ayahs}`}</Text>
                </View>
                <View style={s.track}>
                  <View
                    style={{ flex: m, backgroundColor: theme.colors.saffron }}
                  />
                  <View
                    style={{
                      flex: Math.max(0, u - m),
                      backgroundColor: theme.colors.verdigris,
                    }}
                  />
                  <View
                    style={{ flex: Math.max(0, item.ayahs - Math.max(m, u)) }}
                  />
                </View>
              </View>
              <Text selectable={false} style={s.ar}>
                {item.ar}
              </Text>
            </Pressable>
          );
        }}
      />
    </Sheet>
  );
}

/* ---------- the screen ---------- */

export default function ProgressTab() {
  const s = useStyles();
  const theme = useTheme();
  const { width, height: winH } = useWindowDimensions();
  const tabTop = useTabTop();
  const events = useQuranStatus((st) => st.events);
  const readLog = usePrefs((st) => st.readLog) ?? NO_LOG;
  const bookmarks = usePrefs((st) => st.bookmarks) ?? NO_BOOKMARKS;

  const [page, setPage] = useState(0);
  /* An estimate from the window first, so the pages draw on the first frame
     instead of popping in after layout; onLayout then sets the exact size. */
  const [area, setArea] = useState({ w: width, h: Math.max(0, winH - tabTop - TOP_BAR_HEIGHT - 61) });
  const pager = useRef<ScrollView>(null);
  const [pick, setPick] = useState<{ open: boolean; juz: number | null }>({
    open: false,
    juz: null,
  });
  const [sheet, setSheet] = useState<number | null>(null);
  const pending = useRef<number | null>(null);

  const maps = useMemo(() => foldStatus(events), [events]);
  const p = useMemo(() => progress(maps, quranText), [maps]);
  const week = useMemo(() => readingWeek(readLog, localToday()), [readLog]);
  const weekTotal = week.reduce((n, d) => n + d.count, 0);
  const maxDay = Math.max(1, ...week.map((d) => d.count));
  const recent = useMemo(() => recentMarks(events, 4), [events]);

  const go = (i: number) => {
    setPage(i);
    pager.current?.scrollTo({ x: i * area.w, animated: true });
  };
  const onArea = (e: LayoutChangeEvent) =>
    setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  /* Picking a surah closes the list first, then opens its sheet once the list is gone. */
  /* Picking from the list opens the surah; closing the surah brings the list
     back, scrolled where it was, so marking several in a row stays easy. */
  const listOffset = useRef(0);
  const fromList = useRef(false);
  const openPick = (juz: number | null) => {
    if (juz !== pick.juz) listOffset.current = 0;
    setPick({ open: true, juz });
  };
  const closeSurah = () => {
    setSheet(null);
    if (!fromList.current) return;
    fromList.current = false;
    setTimeout(() => setPick((x) => ({ ...x, open: true })), 450);
  };
  const choose = (n: number) => {
    fromList.current = true;
    pending.current = n;
    setPick((x) => ({ ...x, open: false }));
    setTimeout(() => {
      if (pending.current !== null) {
        setSheet(pending.current);
        pending.current = null;
      }
    }, 450);
  };

  const inner = area.w - MARGIN * 2;
  /* One plain sentence of where you are, in words rather than dots. */
  const headline =
    p.ayahsMemorized === 0
      ? "Nothing marked yet. Tap Mark to add what you know."
      : `${p.surahsMemorized} ${p.surahsMemorized === 1 ? "surah" : "surahs"} memorized, ${pct(p.ayahsMemorized / TOTAL_AYAHS)}% of the Quran`;
  /* onLayout measures the pager with its bottom padding (room for the tab
     bar), so a page is that much shorter, or its foot hides under the bar. */
  const h = Math.max(0, area.h - TAB_ROOM);

  /* Juz grid: 5 columns, 6 rows, filling the page. */
  const gap = space(1);
  const cellW = (inner - gap * 4) / 5;
  const cellH = Math.max(40, (h - 96 - gap * 5) / 6);

  const ringSize = Math.min(150, (inner - space(3)) / 2, h * 0.36);

  return (
    <TabSafe style={s.safe}>
      <TopBar
        inset
        title="Progress"
        subtitle="What you have memorized"
        left={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mark a surah"
            onPress={() => openPick(null)}
          >
            <Glass interactive primary style={s.markBtn}>
              <Text variant="label" color="paper">
                Mark
              </Text>
            </Glass>
          </Pressable>
        }
      />

      <Glass style={s.seg}>
        {PAGES.map((label, i) => (
          <Pressable
            key={label}
            accessibilityRole="tab"
            accessibilityState={{ selected: page === i }}
            onPress={() => go(i)}
            style={[s.segItem, page === i && s.segOn]}
          >
            <Text variant="label" color={page === i ? "lapis" : "inkSoft"}>
              {label}
            </Text>
          </Pressable>
        ))}
      </Glass>

      <View
        style={{ flex: 1, paddingBottom: TAB_ROOM }}
        onLayout={onArea}
        testID="progress-pager"
      >
        {h > 0 ? (
          <ScrollView
            ref={pager}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setPage(
                Math.round(e.nativeEvent.contentOffset.x / Math.max(1, area.w)),
              )
            }
          >
            {/* Overview */}
            <View style={[s.page, { width: area.w, height: h, alignItems: "center", justifyContent: "center", gap: space(2.5) }]}>
              <Ring fraction={p.ayahsMemorized / TOTAL_AYAHS} color={theme.colors.saffron} size={Math.min(190, inner * 0.52, h * 0.34)} stroke={10}>
                <Text variant="numeral" style={{ fontSize: 30, lineHeight: 36 }}>{`${pct(p.ayahsMemorized / TOTAL_AYAHS)}%`}</Text>
                <Text variant="label" color="inkSoft">
                  memorized
                </Text>
              </Ring>
              <View style={{ alignItems: "center", gap: space(0.75) }}>
                <Text style={s.headline}>
                  {p.ayahsMemorized === 0
                    ? "Your progress starts with what you already know"
                    : `${p.surahsMemorized} ${p.surahsMemorized === 1 ? "surah" : "surahs"} memorized`}
                </Text>
                {p.ayahsMemorized > 0 || p.ayahsUnderstood > 0 || weekTotal > 0 ? (
                  <Text variant="label" color="inkSoft" style={{ textAlign: "center" }}>
                    {`${fmt(p.ayahsUnderstood)} ayahs understood. ${fmt(weekTotal)} read this week.`}
                  </Text>
                ) : null}
              </View>
              <Text variant="label" color="inkSoft" style={[s.caption, { maxWidth: 320 }]}>
                Mark the surahs you know and they light up here. Swipe across for the whole Quran ayah by ayah, each juz, your numbers and your week.
              </Text>
              {p.ayahsMemorized === 0 ? (
                <View style={{ alignSelf: "stretch" }}>
                  <GlassButton label="Mark what you know" primary onPress={() => openPick(null)} />
                </View>
              ) : null}
            </View>

            {/* Wall */}
            <View style={[s.page, { width: area.w, height: h }]}>
              <Text style={s.headline}>{p.ayahsMemorized === 0 ? "Every ayah of the Quran" : headline}</Text>
              <Text variant="label" color="inkSoft" style={s.caption}>
                Each square is one ayah, all 6,236 in order: Al-Fatiha at the
                top, An-Nas at the bottom. Numbers on the left are juz.
              </Text>
              <View
                style={{
                  alignItems: "center",
                  flex: 1,
                  justifyContent: "center",
                }}
              >
                <AyahField
                  labels
                  width={inner}
                  height={h - 150}
                  memorized={(i) => maps.memorized[i] === 1}
                  understood={(i) => maps.understood[i] === 1}
                />
              </View>
              <View style={s.legend}>
                {[
                  {
                    color: theme.colors.saffron,
                    label: `Memorized ${fmt(p.ayahsMemorized)}`,
                  },
                  {
                    color: theme.colors.verdigris,
                    label: `Understood ${fmt(p.ayahsUnderstood)}`,
                  },
                  { color: theme.colors.rule, label: "Not yet" },
                ].map((l) => (
                  <View
                    key={l.label}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <View style={[s.swatch, { backgroundColor: l.color }]} />
                    <Text variant="label" color="inkSoft">
                      {l.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Juz */}
            <View style={[s.page, { width: area.w, height: h }]}>
              <Text
                style={s.headline}
              >{`${p.juzMemorized} of 30 juz complete`}</Text>
              <Text variant="label" color="inkSoft" style={s.caption}>
                Each box is one juz. Gold fills in as you memorize. Tap a juz to
                mark its surahs.
              </Text>
              <View style={[s.juzGrid, { rowGap: gap }]}>
                {JUZ_RANGES.map((range, i) => (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    accessibilityLabel={`Juz ${i + 1}, ${Math.round(p.juz[i].memorized * 100)} percent memorized`}
                    onPress={() => openPick(i + 1)}
                    style={[s.juzCell, { width: cellW, height: cellH }]}
                  >
                    <View
                      style={{
                        position: "absolute",
                        top: 6,
                        left: 6,
                        right: 6,
                        bottom: 22,
                      }}
                    >
                      <JuzField
                        width={cellW - 12}
                        height={cellH - 28}
                        range={range}
                        memorized={maps.memorized}
                        understood={maps.understood}
                      />
                    </View>
                    <Text
                      variant="label"
                      color={p.juz[i].memorized === 1 ? "saffron" : "inkSoft"}
                      style={{ paddingBottom: 4 }}
                    >
                      {p.juz[i].memorized > 0
                        ? `${i + 1} · ${pct(p.juz[i].memorized)}%`
                        : `Juz ${i + 1}`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Stats */}
            <View
              style={[
                s.page,
                { width: area.w, height: h, justifyContent: "space-evenly" },
              ]}
            >
              <Text style={[s.headline, { paddingBottom: 0 }]}>
                Your numbers
              </Text>
              <View style={s.rings}>
                {[
                  {
                    label: "Memorized",
                    value: p.ayahsMemorized,
                    color: theme.colors.saffron,
                  },
                  {
                    label: "Understood",
                    value: p.ayahsUnderstood,
                    color: theme.colors.verdigris,
                  },
                ].map((r) => (
                  <View
                    key={r.label}
                    style={{ alignItems: "center", gap: space(0.75) }}
                  >
                    <Ring
                      fraction={r.value / TOTAL_AYAHS}
                      color={r.color}
                      size={ringSize}
                      stroke={11}
                    >
                      <Text
                        variant="numeral"
                        style={{ fontSize: 26, lineHeight: 30 }}
                      >{`${pct(r.value / TOTAL_AYAHS)}%`}</Text>
                    </Ring>
                    <Text variant="eyebrow" color="inkSoft">
                      {r.label}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={s.grid}>
                {[
                  [`${p.surahsMemorized}`, "of 114 surahs"],
                  [`${p.juzMemorized}`, "of 30 juz"],
                  [`${p.pagesMemorized}`, "of 604 pages"],
                  [fmt(p.wordsMemorized), "words memorized"],
                  [`${p.surahsUnderstood}`, "surahs understood"],
                  [`${p.inProgress}`, "in progress"],
                ].map(([v, l]) => (
                  <View key={l} style={s.card}>
                    <Text
                      variant="numeral"
                      style={{ fontSize: 24, lineHeight: 30 }}
                    >
                      {v}
                    </Text>
                    <Text
                      variant="label"
                      color="inkSoft"
                      style={{ textAlign: "center" }}
                    >
                      {l}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Week */}
            <View
              style={[s.page, { width: area.w, height: h, gap: space(1.5) }]}
            >
              <Text style={[s.headline, { paddingBottom: 0 }]}>
                {weekTotal > 0
                  ? `${fmt(weekTotal)} ayahs read this week`
                  : "No reading logged this week yet"}
              </Text>
              <View style={[s.panel, { flex: 1 }]}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text variant="eyebrow" color="inkSoft">
                    Reading this week
                  </Text>
                  <Text
                    variant="label"
                    color="inkSoft"
                  >{`${fmt(weekTotal)} ayahs`}</Text>
                </View>
                <View style={[s.bars, { flex: 1 }]}>
                  {week.map((d, i) => (
                    <View
                      key={d.day}
                      style={[
                        s.barCol,
                        { height: "100%", justifyContent: "flex-end" },
                      ]}
                    >
                      <View
                        style={{
                          width: "100%",
                          borderRadius: 6,
                          height: `${Math.max(3, (d.count / maxDay) * 85)}%`,
                          backgroundColor:
                            d.count > 0
                              ? theme.colors.lapis
                              : theme.colors.surfaceSunk,
                        }}
                      />
                      <Text
                        variant="label"
                        color={i === 6 ? "ink" : "inkFaint"}
                      >
                        {"SMTWTFS"[new Date(`${d.day}T12:00:00Z`).getUTCDay()]}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text
                  variant="label"
                  color="inkFaint"
                >{`${bookmarks.length} bookmarked ayahs`}</Text>
              </View>
              <View style={s.panel}>
                <Text variant="eyebrow" color="inkSoft">
                  Recent
                </Text>
                {recent.length === 0 ? (
                  <Text variant="label" color="inkSoft">
                    Nothing marked yet. Tap Mark to start.
                  </Text>
                ) : (
                  recent.map((r, i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: space(1),
                      }}
                    >
                      <Text
                        variant="label"
                        numberOfLines={1}
                        style={{ flex: 1 }}
                      >
                        {r.text}
                      </Text>
                      <Text variant="label" color="inkFaint">
                        {ago(r.at, Date.now())}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          </ScrollView>
        ) : null}
      </View>

      <PickSheet
        juz={pick.juz}
        visible={pick.open}
        onClose={() => setPick((x) => ({ ...x, open: false }))}
        onPick={choose}
        offset={listOffset}
      />
      <SurahSheet surah={sheet} onClose={closeSurah} />
    </TabSafe>
  );
}
