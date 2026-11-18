import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { AyahField } from "@/components/AyahField";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { ago, progress, readingWeek, recentMarks } from "@/quran/progress";
import { countRange, foldStatus } from "@/quran/status";
import { JUZ_STARTS, SURAHS, TOTAL_AYAHS } from "@/quran/tanzil";
import { quranText, refOf } from "@/quran/text";
import { localToday } from "@/state/barakah";
import { usePrefs } from "@/state/prefs";
import { useQuranStatus } from "@/state/quranStatus";
import { FONTS } from "@/theme/typography";
import { MARGIN, RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  Progress: what you carry, at a glance.

  Two rings up top (memorized, understood), clean stat cards, the week's
  reading, thirty juz rings, the Ayah Field as one card among them, recent
  marks, and every surah with its own bar. Tap a surah to mark it, or mark
  single ayahs on its grid. No streaks and no praise: it reports, it does not
  cheer.
*/

const useStyles = makeStyles((t) => ({
  head: { alignItems: "center", gap: space(0.5), paddingTop: space(2), paddingBottom: space(2) },
  rings: { flexDirection: "row", justifyContent: "center", gap: space(3), paddingBottom: space(2) },
  ringBox: { alignItems: "center", gap: space(0.75) },
  ringCenter: { position: "absolute", alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space(1.25), paddingBottom: space(3) },
  card: {
    flexGrow: 1,
    flexBasis: "45%",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.surface,
    paddingVertical: space(1.75),
    paddingHorizontal: space(2),
    gap: 2,
  },
  section: { borderRadius: 24, borderWidth: 1, borderColor: t.colors.rule, backgroundColor: t.colors.surface, padding: space(2.25), marginBottom: space(2.5), gap: space(1.5) },
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  bars: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 96, gap: space(1) },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  bar: { width: "100%", borderRadius: 6, minHeight: 4 },
  juzGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space(1.25) },
  juzCell: { width: "16%", alignItems: "center" },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: space(1), paddingBottom: space(1) },
  filter: { borderRadius: RADIUS.pill, borderWidth: 1, borderColor: t.colors.rule, paddingVertical: 6, paddingHorizontal: space(1.75) },
  filterOn: { backgroundColor: t.colors.lapisWash, borderColor: t.colors.lapis },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: space(1.25), gap: space(1.5) },
  names: { flex: 1, gap: 4 },
  ar: { fontFamily: FONTS.quran, fontSize: 20, lineHeight: 38, color: t.colors.ink, writingDirection: "rtl" },
  track: { height: 5, borderRadius: 3, backgroundColor: t.colors.surfaceSunk, overflow: "hidden", flexDirection: "row" },
  rule: { height: 1, backgroundColor: t.colors.rule },
  /* Surah sheet */
  sheet: { flex: 1, backgroundColor: t.colors.paper, paddingHorizontal: MARGIN, paddingTop: space(1.5) },
  grabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: t.colors.rule, marginBottom: space(2) },
  bigToggle: { flex: 1, borderRadius: 18, borderWidth: 1.5, borderColor: t.colors.rule, paddingVertical: space(1.75), alignItems: "center", gap: 2 },
  dots: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingVertical: space(2) },
  dot: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: t.colors.rule, alignItems: "center", justifyContent: "center" },
}));

function Ring({ fraction, color, size, stroke, children }: { fraction: number; color: string; size: number; stroke: number; children?: React.ReactNode }) {
  const theme = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.colors.surfaceSunk} strokeWidth={stroke} fill="none" />
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

function Stat({ value, of, label }: { value: string; of?: string; label: string }) {
  const s = useStyles();
  return (
    <View style={s.card}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
        <Text variant="numeral" style={{ fontSize: 28, lineHeight: 34 }}>
          {value}
        </Text>
        {of ? (
          <Text variant="label" color="inkFaint">
            {of}
          </Text>
        ) : null}
      </View>
      <Text variant="label" color="inkSoft">
        {label}
      </Text>
    </View>
  );
}

const pct = (x: number) => (x === 0 ? "0" : x < 0.01 ? "<1" : String(Math.round(x * 100)));
const fmt = (n: number) => n.toLocaleString("en-US");

/* Mark a surah whole, or ayah by ayah. */
function SurahSheet({ surah, onClose }: { surah: number | null; onClose: () => void }) {
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
  const color = mode === "memorized" ? theme.colors.saffron : theme.colors.verdigris;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.sheet}>
        <View style={s.grabber} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(6) }}>
          <View style={{ alignItems: "center", gap: 2, paddingBottom: space(2) }}>
            <Text selectable={false} style={[s.ar, { fontSize: 30, lineHeight: 56 }]}>
              {x.ar}
            </Text>
            <Text variant="pageTitle">{x.en}</Text>
            <Text variant="label" color="inkSoft">{`${x.ayahs} ayahs. ${m} memorized, ${u} understood`}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: space(1.25) }}>
            {(["memorized", "understood"] as const).map((f) => {
              const all = (f === "memorized" ? m : u) === x.ayahs;
              const c = f === "memorized" ? theme.colors.saffron : theme.colors.verdigris;
              return (
                <Pressable
                  key={f}
                  accessibilityRole="button"
                  onPress={() => setSurah(x.n, f, !all)}
                  style={[s.bigToggle, all && { backgroundColor: c, borderColor: c }]}
                >
                  <Text color={all ? "paper" : "ink"}>{all ? (f === "memorized" ? "Memorized" : "Understood") : f === "memorized" ? "Mark memorized" : "Mark understood"}</Text>
                  <Text variant="label" color={all ? "paper" : "inkSoft"}>
                    Whole surah
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: space(3) }}>
            <Text variant="eyebrow" color="inkSoft">
              Ayah by ayah
            </Text>
            <View style={{ flexDirection: "row", gap: space(1) }}>
              {(["memorized", "understood"] as const).map((f) => (
                <Pressable key={f} accessibilityRole="button" onPress={() => setMode(f)} style={[s.filter, mode === f && s.filterOn]}>
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
                  style={[s.dot, on && { backgroundColor: color, borderColor: color }]}
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
            style={[s.filter, { alignSelf: "center", paddingHorizontal: space(3), paddingVertical: space(1.25) }]}
          >
            <Text color="lapis">Open in Read</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

/* Stable fallbacks: a fresh {} or [] inside a selector re-renders forever. */
const NO_LOG: Record<string, number[]> = {};
const NO_BOOKMARKS: number[] = [];

type Filter = "progress" | "memorized" | "understood" | "all";

export default function ProgressTab() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const events = useQuranStatus((st) => st.events);
  const readLog = usePrefs((st) => st.readLog) ?? NO_LOG;
  const bookmarks = usePrefs((st) => st.bookmarks) ?? NO_BOOKMARKS;
  const [filter, setFilter] = useState<Filter>("all");
  const [wallOpen, setWallOpen] = useState(false);
  const [sheet, setSheet] = useState<number | null>(null);

  const maps = useMemo(() => foldStatus(events), [events]);
  const p = useMemo(() => progress(maps, quranText), [maps]);
  const week = useMemo(() => readingWeek(readLog, localToday()), [readLog]);
  const weekTotal = week.reduce((n, d) => n + d.count, 0);
  const maxDay = Math.max(1, ...week.map((d) => d.count));
  const recent = useMemo(() => recentMarks(events), [events]);
  const now = Date.now();

  const rows = useMemo(
    () =>
      SURAHS.map((x) => ({
        ...x,
        m: countRange(maps.memorized, x.start, x.start + x.ayahs),
        u: countRange(maps.understood, x.start, x.start + x.ayahs),
      })).filter((x) =>
        filter === "progress" ? x.m > 0 && x.m < x.ayahs : filter === "memorized" ? x.m === x.ayahs : filter === "understood" ? x.u === x.ayahs : true,
      ),
    [maps, filter],
  );

  const inner = width - MARGIN * 2 - space(4.5);

  const header = (
    <>
      <View style={s.head}>
        <Text variant="pageTitle">Progress</Text>
        <Text color="inkSoft">What you carry, and what you understand.</Text>
      </View>

      <View style={s.rings}>
        {[
          { label: "Memorized", value: p.ayahsMemorized, color: theme.colors.saffron },
          { label: "Understood", value: p.ayahsUnderstood, color: theme.colors.verdigris },
        ].map((r) => (
          <View key={r.label} style={s.ringBox}>
            <Ring fraction={r.value / TOTAL_AYAHS} color={r.color} size={142} stroke={12}>
              <View style={s.ringCenter}>
                <Text variant="numeral" style={{ fontSize: 30, lineHeight: 36 }}>{`${pct(r.value / TOTAL_AYAHS)}%`}</Text>
                <Text variant="label" color="inkSoft">{`${fmt(r.value)} ayahs`}</Text>
              </View>
            </Ring>
            <Text variant="eyebrow" color="inkSoft">
              {r.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={s.grid}>
        <Stat value={`${p.surahsMemorized}`} of="/ 114" label="Surahs memorized" />
        <Stat value={`${p.juzMemorized}`} of="/ 30" label="Juz memorized" />
        <Stat value={`${p.pagesMemorized}`} of="/ 604" label="Pages memorized" />
        <Stat value={fmt(p.wordsMemorized)} label="Words memorized" />
        <Stat value={`${p.surahsUnderstood}`} of="/ 114" label="Surahs understood" />
        <Stat value={`${p.inProgress}`} label="Surahs in progress" />
      </View>

      <View style={s.section}>
        <View style={s.sectionHead}>
          <Text variant="eyebrow" color="inkSoft">
            Reading this week
          </Text>
          <Text variant="label" color="inkSoft">{`${fmt(weekTotal)} ayahs`}</Text>
        </View>
        <View style={s.bars}>
          {week.map((d, i) => (
            <View key={d.day} style={s.barCol}>
              <View
                style={[
                  s.bar,
                  { height: Math.max(4, (d.count / maxDay) * 72), backgroundColor: d.count > 0 ? theme.colors.lapis : theme.colors.surfaceSunk },
                ]}
              />
              <Text variant="label" color={i === 6 ? "ink" : "inkFaint"}>
                {"SMTWTFS"[new Date(`${d.day}T12:00:00Z`).getUTCDay()]}
              </Text>
            </View>
          ))}
        </View>
        <Text variant="label" color="inkFaint">{`${bookmarks.length} bookmarked ayahs`}</Text>
      </View>

      <View style={s.section}>
        <View style={s.sectionHead}>
          <Text variant="eyebrow" color="inkSoft">
            Juz
          </Text>
          <Text variant="label" color="inkSoft">{`${p.juzMemorized} of 30 complete`}</Text>
        </View>
        <View style={s.juzGrid}>
          {p.juz.map((j, i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Juz ${i + 1}, ${Math.round(j.memorized * 100)} percent memorized`}
              onPress={() => {
                const at = refOf(JUZ_STARTS[i]);
                router.push(`/surah/${at.surah}?ayah=${at.ayah}`);
              }}
              style={s.juzCell}
            >
              <Ring fraction={j.memorized} color={theme.colors.saffron} size={44} stroke={4}>
                <Text variant="label" color={j.memorized === 1 ? "saffron" : "inkSoft"}>
                  {String(i + 1)}
                </Text>
              </Ring>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={s.section}>
        <View style={s.sectionHead}>
          <Text variant="eyebrow" color="inkSoft">
            The wall
          </Text>
          <Pressable accessibilityRole="button" onPress={() => setWallOpen((o) => !o)} hitSlop={8}>
            <Text variant="label" color="lapis">
              {wallOpen ? "Smaller" : "Larger"}
            </Text>
          </Pressable>
        </View>
        <Text variant="label" color="inkSoft">
          Every ayah is a dot. Saffron is memorized, teal is understood.
        </Text>
        <View style={{ alignItems: "center" }}>
          <AyahField
            width={inner}
            height={wallOpen ? Math.round(inner * 1.25) : Math.round(inner * 0.6)}
            memorized={(i) => maps.memorized[i] === 1}
            understood={(i) => maps.understood[i] === 1}
          />
        </View>
      </View>

      {recent.length > 0 ? (
        <View style={s.section}>
          <Text variant="eyebrow" color="inkSoft">
            Recent
          </Text>
          {recent.map((r, i) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", gap: space(1) }}>
              <Text variant="label" style={{ flex: 1 }}>
                {r.text}
              </Text>
              <Text variant="label" color="inkFaint">
                {ago(r.at, now)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text variant="eyebrow" color="inkSoft" style={{ paddingBottom: space(1) }}>
        Surahs
      </Text>
      <View style={s.filters}>
        {(
          [
            ["all", "All"],
            ["progress", "In progress"],
            ["memorized", "Memorized"],
            ["understood", "Understood"],
          ] as const
        ).map(([f, label]) => (
          <Pressable
            key={f}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f }}
            onPress={() => setFilter(f)}
            style={[s.filter, filter === f && s.filterOn]}
          >
            <Text variant="label" color={filter === f ? "lapis" : "inkSoft"}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </>
  );

  return (
    <Screen edges={["top"]}>
      <FlatList
        data={rows}
        keyExtractor={(x) => String(x.n)}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={s.rule} />}
        contentContainerStyle={{ paddingBottom: space(12) }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text color="inkSoft" style={{ textAlign: "center", paddingTop: space(2) }}>
            Nothing here yet. Choose All and tap a surah to mark it.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.en}, ${item.m} of ${item.ayahs} memorized`}
            onPress={() => setSheet(item.n)}
            style={s.row}
          >
            <Text variant="label" color="inkFaint" style={{ width: 28, textAlign: "center" }}>
              {String(item.n)}
            </Text>
            <View style={s.names}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text>{item.en}</Text>
                <Text variant="label" color="inkFaint">{`${item.m}/${item.ayahs}`}</Text>
              </View>
              <View style={s.track}>
                <View style={{ flex: item.m, backgroundColor: theme.colors.saffron }} />
                <View style={{ flex: Math.max(0, item.u - item.m), backgroundColor: theme.colors.verdigris }} />
                <View style={{ flex: Math.max(0, item.ayahs - Math.max(item.m, item.u)) }} />
              </View>
            </View>
            <Text selectable={false} style={s.ar}>
              {item.ar}
            </Text>
          </Pressable>
        )}
      />
      <SurahSheet surah={sheet} onClose={() => setSheet(null)} />
    </Screen>
  );
}
