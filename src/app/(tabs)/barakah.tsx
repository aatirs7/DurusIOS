import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { adhkarFor } from "@/barakah/adhkar";
import { BarakahRing, DayCell } from "@/components/BarakahRing";
import { Breath } from "@/components/Breath";
import { Glass } from "@/components/Glass";
import { TabSafe } from "@/components/TabSafe";
import { Text } from "@/components/Text";
import { TopBar } from "@/components/TopBar";
import {
  PRACTICES,
  PRACTICE_BY_ID,
  addDays,
  appliesOn,
  consistency,
  fill,
  fold,
  monthDays,
  parseDay,
  summarise,
  valueOn,
  type Practice,
} from "@/engine/barakah";
import { gregorianDate, hijriDate } from "@/lib/time";
import { localToday, useBarakah } from "@/state/barakah";
import { usePrefs } from "@/state/prefs";
import { MARGIN, RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  Barakah: small daily practices, done consistently. One screen, no scrolling
  for the usual handful of practices.

  The day's ring and the last seven days sit at the top; the practices are a
  grid of glass tiles beneath, each one a control. Tap a tile to tick it.
  The adhkar tiles open a guided walkthrough (what to say, how to say it, what
  it means, where it comes from) and tick themselves at the end. The Quran
  tile counts what you read and opens the reader. The month and the choice of
  practices live in sheets, out of the way.

  No streaks and no praise: the screen reports what was done and stops there.
*/

const ADHKAR_TIME: Record<string, "morning" | "evening"> = { morningAdhkar: "morning", eveningAdhkar: "evening" };
const SHORT: Record<string, string> = {
  fajr: "Within its time",
  quran: "Your daily portion",
  duha: "The forenoon prayer",
  rawatib: "Sunnah prayers",
  witr: "To close the night",
  istighfar: "Tap to count",
  salawat: "Tap to count",
  sadaqah: "Gave something",
  family: "Ties of kinship",
  kahf: "Friday, surah 18",
  fastMonThu: "Monday, Thursday",
  whiteDays: "13th to 15th",
};

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.colors.paper },
  body: { flex: 1, paddingHorizontal: MARGIN },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: space(1) },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: space(1) },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  hero: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2) },
  ringCenter: { position: "absolute", alignItems: "center", justifyContent: "center" },
  week: { flexDirection: "row", gap: 6, paddingTop: space(1) },
  dot: { width: 22, alignItems: "center", gap: 3 },
  dotFill: { width: 14, height: 14, borderRadius: 7 },
  /* The tiles sit centred in the space between the header and the pills. */
  grid: { flexGrow: 1, justifyContent: "center", gap: space(1.25), paddingBottom: space(1.25) },
  row: { flex: 1, flexDirection: "row", gap: space(1.25), minHeight: 104, maxHeight: 160 },
  tile: { flex: 1, borderRadius: 24, padding: space(1.75), justifyContent: "space-between", overflow: "hidden" },
  tileTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mark: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: t.colors.inkFaint, alignItems: "center", justifyContent: "center" },
  markOn: { borderColor: t.colors.verdigris, backgroundColor: t.colors.verdigris },
  chip: { flexDirection: "row", alignItems: "center", gap: 2, borderRadius: RADIUS.pill, backgroundColor: t.colors.lapisWash, paddingVertical: 3, paddingHorizontal: space(1) },
  bar: { alignSelf: "stretch", height: 4, borderRadius: 2, backgroundColor: t.colors.surfaceSunk, overflow: "hidden", marginTop: space(0.75) },
  pills: { flexDirection: "row", gap: space(1.25), paddingTop: space(0.5), paddingBottom: space(14) },
  pill: { flex: 1, minHeight: 46, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  sheet: { flex: 1, backgroundColor: t.colors.paper, paddingHorizontal: MARGIN, paddingTop: space(3) },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: space(2) },
  chooseRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space(1.25), gap: space(2), borderBottomWidth: 1, borderBottomColor: t.colors.rule },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", width: 7 * 40, alignSelf: "center" },
  stepper: { flexDirection: "row", alignItems: "center", gap: space(2) },
  step: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", overflow: "hidden" },
}));

function localDate(day: string): Date {
  const { y, m, d } = parseDay(day);
  return new Date(y, m - 1, d, 12);
}

function Tick({ size = 13 }: { size?: number }) {
  const theme = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={theme.colors.paper} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function Chevron({ left, color, size = 18 }: { left?: boolean; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={left ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/* A stable fallback: a fresh {} inside a selector re-renders forever. */
const NO_LOG: Record<string, number[]> = {};

function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const s = useStyles();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.sheet}>
        <View style={s.sheetHead}>
          <Text variant="pageTitle">{title}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={10}>
            <Text color="lapis">Done</Text>
          </Pressable>
        </View>
        {children}
      </View>
    </Modal>
  );
}

export default function Barakah() {
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();

  const hydrated = useBarakah((st) => st._hydrated);
  const events = useBarakah((st) => st.events);
  const tracked = useBarakah((st) => st.tracked);
  const since = useBarakah((st) => st.since);
  const log = useBarakah((st) => st.log);
  const setTracked = useBarakah((st) => st.setTracked);
  const ensureSince = useBarakah((st) => st.ensureSince);
  const run = useBarakah((st) => st.adhkarRun);

  useEffect(() => {
    if (hydrated) ensureSince();
  }, [hydrated, ensureSince]);

  const today = localToday();
  const readLog = usePrefs((st) => st.readLog) ?? NO_LOG;
  const readingGoal = usePrefs((st) => st.readingGoal) ?? 10;
  const setReadingGoal = usePrefs((st) => st.setReadingGoal);
  const lastRead = usePrefs((st) => st.lastRead);
  const readOn = (d: string) => readLog[d]?.length ?? 0;
  const [day, setDay] = useState(today);
  const [sheet, setSheet] = useState<"month" | "edit" | null>(null);
  const isToday = day === today;

  const values = useMemo(() => fold(events), [events]);

  /*
    Reading counts toward the daily Quran portion. Once today's ayahs reach
    the goal the card ticks itself, once. If the card was touched by hand
    today, it is left alone, so unticking it sticks.
  */
  const readToday = readOn(today);
  useEffect(() => {
    if (!hydrated || !tracked.includes("quran") || readToday < readingGoal) return;
    if (events.some((e) => e.day === today && e.practiceId === "quran")) return;
    log(today, "quran", 1);
  }, [hydrated, tracked, readToday, readingGoal, events, today, log]);

  const due = useMemo(
    () => tracked.map((id) => PRACTICE_BY_ID.get(id)).filter((p): p is Practice => !!p && appliesOn(p, day)),
    [tracked, day],
  );

  const summary = summarise(values, tracked, day);
  const fills = due.map((p) => fill(p, valueOn(values, day, p.id)));
  const percent = consistency(values, tracked, today, since ?? today);
  const month = useMemo(() => monthDays(day), [day]);
  const last7 = useMemo(() => Array.from({ length: 7 }, (_, k) => addDays(today, k - 6)), [today]);

  if (!hydrated) return null;

  const hijri = hijriDate(localDate(day));

  const tile = (p: Practice) => {
    const value = valueOn(values, day, p.id);
    const done = value > 0;
    const time = ADHKAR_TIME[p.id];
    const toggle = () => log(day, p.id, done ? 0 : 1);

    let line = SHORT[p.id] ?? p.line;
    let progress: number | null = null;
    let onPress = toggle;
    let label = p.title;
    if (time) {
      const n = adhkarFor(time).length;
      const r = run?.key === `${today}:${time}` ? run : null;
      line = done ? `${n} adhkar, done` : r && r.i > 0 ? `Resume, ${Math.min(r.i + 1, n)} of ${n}` : `${n} adhkar, guided`;
      onPress = () => router.push(`/adhkar/${time}`);
      label = `${p.title}, open the guide`;
    } else if (p.id === "quran") {
      const read = readOn(day);
      line = `${read} of ${readingGoal} ayahs`;
      progress = Math.min(1, read / Math.max(1, readingGoal));
      onPress = () => router.push(lastRead ? `/surah/${lastRead.surah}?ayah=${lastRead.ayah}` : "/surah/1");
      label = `${p.title}, open the reader`;
    } else if (p.input === "count") {
      line = p.max ? `${value} of ${p.max}` : value > 0 ? `${value} today` : SHORT[p.id] ?? "Tap to count";
      onPress = () => log(day, p.id, p.max ? Math.min(p.max, value + 1) : value + 1);
      label = `${p.title}, add one`;
    }
    const opens = !!time || p.id === "quran";

    return (
      <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ flex: 1 }}>
        <Glass interactive style={[s.tile, { flex: 1 }]}>
          <View style={s.tileTop}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
              accessibilityLabel={`${p.title} done`}
              onPress={p.input === "count" ? () => log(day, p.id, done ? 0 : 1) : toggle}
              hitSlop={12}
              style={[s.mark, done && s.markOn]}
            >
              {done ? <Tick /> : null}
            </Pressable>
            {opens ? (
              <View style={s.chip}>
                <Text variant="label" color="lapis">
                  {time ? "Guide" : "Read"}
                </Text>
                <Chevron color={theme.colors.lapis} size={13} />
              </View>
            ) : p.input === "count" && value > 0 ? (
              <Text variant="numeral" style={{ fontSize: 20, lineHeight: 24 }}>
                {String(value)}
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: "center" }}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} color={done ? "verdigris" : "ink"} style={{ textAlign: "center" }}>
              {p.title}
            </Text>
            <Text variant="label" color="inkSoft" numberOfLines={1} style={{ textAlign: "center" }}>
              {line}
            </Text>
            {progress !== null ? (
              <View style={s.bar}>
                <View style={{ width: `${progress * 100}%`, height: "100%", backgroundColor: theme.colors.verdigris }} />
              </View>
            ) : null}
          </View>
        </Glass>
      </Pressable>
    );
  };

  const rows: Practice[][] = [];
  for (let k = 0; k < due.length; k += 2) rows.push(due.slice(k, k + 2));
  const roomy = rows.length <= 2;
  const ringSize = rows.length <= 2 ? 148 : rows.length === 3 ? 120 : 100;

  return (
    <TabSafe style={s.safe}>
      <Breath />
      <View style={s.body}>
        <TopBar title="Barakah" subtitle="Small daily practices" />

        <View style={s.dateRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous day" onPress={() => setDay(addDays(day, -1))}>
            <Glass interactive style={s.arrow}>
              <Chevron left color={theme.colors.inkSoft} />
            </Glass>
          </Pressable>
          <View style={{ alignItems: "center" }}>
            <Text variant="eyebrow" color="inkSoft">
              {isToday ? "Today" : gregorianDate(localDate(day))}
            </Text>
            {hijri ? (
              <Text variant="label" color="inkFaint">
                {hijri}
              </Text>
            ) : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Next day" disabled={isToday} onPress={() => setDay(addDays(day, 1))} style={{ opacity: isToday ? 0.3 : 1 }}>
            <Glass interactive style={s.arrow}>
              <Chevron color={theme.colors.inkSoft} />
            </Glass>
          </Pressable>
        </View>

        {/* A roomy header while there are few practices; it gives the space
            back as more are chosen, so the tiles never need to scroll. */}
        <View style={[s.hero, { paddingVertical: roomy ? space(4) : space(2) }]}>
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <BarakahRing fills={fills} size={ringSize} stroke={roomy ? 12 : 10} />
            <View style={s.ringCenter}>
              <Text variant="numeral" style={{ fontSize: roomy ? 40 : 30, lineHeight: roomy ? 44 : 34 }}>{`${summary.done}`}</Text>
              <Text variant="label" color="inkSoft">{`of ${summary.applicable}`}</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open the month" onPress={() => setSheet("month")} style={{ flex: 1, gap: 2 }}>
            <Text style={roomy ? { fontSize: 20, lineHeight: 26 } : undefined}>
              {summary.applicable === 0
                ? "Nothing tracked this day"
                : summary.done === summary.applicable
                  ? `All ${summary.applicable} done ${isToday ? "today" : "that day"}`
                  : `${summary.done} of ${summary.applicable} done ${isToday ? "today" : "that day"}`}
            </Text>
            <Text variant="label" color="inkSoft">
              {percent === null ? "Consistency starts counting today" : `${percent}% consistent over 30 days`}
            </Text>
            <View style={s.week}>
              {last7.map((d) => {
                const sum = summarise(values, tracked, d);
                const ratio = sum.applicable === 0 ? 0 : sum.done / sum.applicable;
                return (
                  <View key={d} style={s.dot}>
                    <View
                      style={[
                        s.dotFill,
                        { backgroundColor: ratio > 0 ? theme.colors.verdigris : theme.colors.surfaceSunk, opacity: ratio > 0 ? 0.35 + 0.65 * ratio : 1 },
                        d === day && { borderWidth: 1.5, borderColor: theme.colors.lapis },
                      ]}
                    />
                    <Text variant="label" color={d === today ? "ink" : "inkFaint"} style={{ fontSize: 10, lineHeight: 12 }}>
                      {"SMTWTFS"[new Date(`${d}T12:00:00Z`).getUTCDay()]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.grid} showsVerticalScrollIndicator={false}>
          {due.length === 0 ? (
            <Text color="inkSoft" style={{ textAlign: "center", paddingTop: space(4) }}>
              Nothing tracked for this day. Choose practices below.
            </Text>
          ) : (
            rows.map((r, k) => (
              <View key={k} style={s.row}>
                {r.map(tile)}
                {r.length === 1 ? <View style={{ flex: 1 }} /> : null}
              </View>
            ))
          )}
        </ScrollView>

        <View style={s.pills}>
          <Pressable accessibilityRole="button" onPress={() => setSheet("month")} style={{ flex: 1 }}>
            <Glass interactive style={s.pill}>
              <Text variant="label">This month</Text>
            </Glass>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setSheet("edit")} style={{ flex: 1 }}>
            <Glass interactive style={s.pill}>
              <Text variant="label">Choose practices</Text>
            </Glass>
          </Pressable>
        </View>
      </View>

      <Sheet visible={sheet === "month"} onClose={() => setSheet(null)} title="This month">
        <Text color="inkSoft" style={{ paddingBottom: space(2) }}>
          {percent === null ? "Consistency starts counting today." : `${percent}% of your practices done over the last 30 days. Tap a day to see it.`}
        </Text>
        <View style={s.monthGrid}>
          {Array.from({ length: month.firstWeekday }, (_, k) => (
            <View key={`b${k}`} style={{ width: 40, height: 40 }} />
          ))}
          {month.days.map((d) => {
            const sum = summarise(values, tracked, d);
            const ratio = sum.applicable === 0 ? 0 : sum.done / sum.applicable;
            const future = d > today;
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={`${d}, ${sum.done} of ${sum.applicable}`}
                disabled={future}
                onPress={() => {
                  setDay(d);
                  setSheet(null);
                }}
              >
                <DayCell ratio={ratio} label={String(parseDay(d).d)} selected={d === day} future={future} />
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      <Sheet visible={sheet === "edit"} onClose={() => setSheet(null)} title="Choose practices">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(6) }}>
          <View style={[s.chooseRow, { borderBottomWidth: 0, paddingBottom: space(2) }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text>Daily Quran goal</Text>
              <Text variant="label" color="inkFaint">
                Ayahs read in the reader count toward it.
              </Text>
            </View>
            <View style={s.stepper}>
              <Pressable accessibilityRole="button" accessibilityLabel="Smaller goal" onPress={() => setReadingGoal(readingGoal - 5)}>
                <Glass interactive style={s.step}>
                  <Text>−</Text>
                </Glass>
              </Pressable>
              <Text variant="numeral" style={{ fontSize: 20, lineHeight: 24, minWidth: 32, textAlign: "center" }}>
                {String(readingGoal)}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Larger goal" onPress={() => setReadingGoal(readingGoal + 5)}>
                <Glass interactive style={s.step}>
                  <Text>+</Text>
                </Glass>
              </Pressable>
            </View>
          </View>
          {PRACTICES.map((p) => {
            const on = tracked.includes(p.id);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="switch"
                accessibilityState={{ checked: on }}
                accessibilityLabel={p.title}
                onPress={() =>
                  setTracked(on ? tracked.filter((id) => id !== p.id) : PRACTICES.filter((q) => q.id === p.id || tracked.includes(q.id)).map((q) => q.id))
                }
                style={s.chooseRow}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text>{p.title}</Text>
                  <Text variant="label" color="inkFaint">
                    {p.line}
                  </Text>
                </View>
                <View style={[s.mark, on && s.markOn]}>{on ? <Tick /> : null}</View>
              </Pressable>
            );
          })}
        </ScrollView>
      </Sheet>
    </TabSafe>
  );
}
