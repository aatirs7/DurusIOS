import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { Screen } from "@/components/Screen";
import { Section } from "@/components/Section";
import { Text } from "@/components/Text";
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
import { RADIUS, space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

/*
  Barakah: small daily practices, done consistently.

  Content on paper. The ring, the cards and the month grid are all solid, by
  the Liquid Glass rule that glass is only for controls floating above
  content. No haptics here: the app's haptic list is two entries long and
  neither is "ticked a practice". No streaks and no praise, so the screen
  reports what was done and stops there.
*/

const RING = 184;
const STROKE = 12;

const useStyles = makeStyles((t) => ({
  scroll: { paddingBottom: space(6), gap: space(3) },
  head: { alignItems: "center", gap: space(0.5), paddingTop: space(1) },
  center: { textAlign: "center" },

  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space(2) },
  arrow: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  arrowOff: { opacity: 0.25 },
  dateText: { alignItems: "center", minWidth: 180 },

  ringWrap: { alignItems: "center", justifyContent: "center" },
  ringCenter: { position: "absolute", alignItems: "center" },

  list: { gap: space(1.5) },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: t.colors.rule,
    paddingVertical: space(2),
    paddingHorizontal: space(2.5),
    alignItems: "center",
    gap: space(0.75),
  },
  cardDone: { borderColor: t.colors.verdigris },
  mark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: t.colors.inkFaint,
    alignItems: "center",
    justifyContent: "center",
  },
  markOn: { borderColor: t.colors.verdigris, backgroundColor: t.colors.verdigris },
  counter: { flexDirection: "row", alignItems: "center", gap: space(2), paddingTop: space(0.5) },
  step: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: t.colors.rule,
    backgroundColor: t.colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  stepOff: { opacity: 0.3 },
  count: { minWidth: 56, textAlign: "center" },

  block: { alignItems: "center", gap: space(1.5) },
  grid: { flexDirection: "row", flexWrap: "wrap", width: 7 * 40 },
  cell: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  cellFill: { position: "absolute", width: 32, height: 32, borderRadius: 10 },
  cellToday: { borderWidth: 1, borderColor: t.colors.lapis },

  chooseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space(1),
    gap: space(2),
  },
}));

function localDate(day: string): Date {
  const { y, m, d } = parseDay(day);
  return new Date(y, m - 1, d, 12);
}

/* One arc of the ring, from fraction a to b of the circle, clockwise from the top. */
function arc(a: number, b: number, r: number, c: number): string {
  const p = (f: number) => {
    const angle = f * 2 * Math.PI - Math.PI / 2;
    return `${c + r * Math.cos(angle)} ${c + r * Math.sin(angle)}`;
  };
  const large = b - a > 0.5 ? 1 : 0;
  return `M ${p(a)} A ${r} ${r} 0 ${large} 1 ${p(b)}`;
}

function Ring({ fills }: { fills: number[] }) {
  const theme = useTheme();
  const c = RING / 2;
  const r = c - STROKE / 2;
  const n = fills.length;

  if (n === 0) {
    return (
      <Svg width={RING} height={RING}>
        <Circle cx={c} cy={c} r={r} stroke={theme.colors.rule} strokeWidth={STROKE} fill="none" />
      </Svg>
    );
  }

  /* A small gap between segments, so each practice reads as its own piece. */
  const gap = n === 1 ? 0 : Math.min(0.02, 0.25 / n);
  const span = 1 / n;

  return (
    <Svg width={RING} height={RING}>
      {fills.map((f, i) => {
        const start = i * span + gap / 2;
        const end = (i + 1) * span - gap / 2;
        const full = n === 1;
        return (
          <Path
            key={`t${i}`}
            d={full ? arc(0, 0.9999, r, c) : arc(start, end, r, c)}
            stroke={theme.colors.surfaceSunk}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
          />
        );
      })}
      {fills.map((f, i) => {
        if (f <= 0) return null;
        const start = i * span + gap / 2;
        const end = start + (span - gap) * f;
        const full = n === 1 && f >= 1;
        return (
          <Path
            key={`f${i}`}
            d={full ? arc(0, 0.9999, r, c) : arc(start, Math.max(start + 0.001, end), r, c)}
            stroke={theme.colors.verdigris}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
          />
        );
      })}
    </Svg>
  );
}

function PracticeCard({
  practice,
  value,
  onChange,
}: {
  practice: Practice;
  value: number;
  onChange: (next: number) => void;
}) {
  const s = useStyles();
  const theme = useTheme();
  const done = value > 0;

  const body = (
    <>
      {practice.input === "check" ? (
        <View style={[s.mark, done && s.markOn]}>
          {done ? (
            <Svg width={12} height={12} viewBox="0 0 24 24">
              <Path
                d="M5 12.5l4.5 4.5L19 7.5"
                stroke={theme.colors.paper}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          ) : null}
        </View>
      ) : null}
      <Text style={s.center}>{practice.title}</Text>
      <Text variant="label" color="inkSoft" style={s.center}>
        {practice.line}
      </Text>
      {practice.quranRef ? (
        <Text variant="label" color="lapis" style={s.center}>
          {practice.quranRef}
        </Text>
      ) : null}
      {practice.input === "count" ? (
        <View style={s.counter}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`One less ${practice.title}`}
            disabled={value <= 0}
            onPress={() => onChange(value - 1)}
            style={[s.step, value <= 0 && s.stepOff]}
          >
            <Text>−</Text>
          </Pressable>
          <Text variant="pageTitle" style={s.count}>
            {practice.max ? `${value} / ${practice.max}` : String(value)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`One more ${practice.title}`}
            disabled={practice.max !== undefined && value >= practice.max}
            onPress={() => onChange(value + 1)}
            style={[s.step, practice.max !== undefined && value >= practice.max && s.stepOff]}
          >
            <Text>+</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );

  if (practice.input === "check") {
    return (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={practice.title}
        onPress={() => onChange(done ? 0 : 1)}
        style={[s.card, done && s.cardDone]}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={[s.card, done && s.cardDone]}>{body}</View>;
}

function Chevron({ left }: { left?: boolean }) {
  const theme = useTheme();
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d={left ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke={theme.colors.inkSoft}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export default function Barakah() {
  const s = useStyles();
  const theme = useTheme();

  const hydrated = useBarakah((st) => st._hydrated);
  const events = useBarakah((st) => st.events);
  const tracked = useBarakah((st) => st.tracked);
  const since = useBarakah((st) => st.since);
  const log = useBarakah((st) => st.log);
  const setTracked = useBarakah((st) => st.setTracked);
  const ensureSince = useBarakah((st) => st.ensureSince);

  useEffect(() => {
    if (hydrated) ensureSince();
  }, [hydrated, ensureSince]);

  const today = localToday();
  const [day, setDay] = useState(today);
  const isToday = day === today;

  const values = useMemo(() => fold(events), [events]);

  const due = useMemo(
    () =>
      tracked
        .map((id) => PRACTICE_BY_ID.get(id))
        .filter((p): p is Practice => !!p && appliesOn(p, day)),
    [tracked, day],
  );

  const summary = summarise(values, tracked, day);
  const fills = due.map((p) => fill(p, valueOn(values, day, p.id)));
  const percent = consistency(values, tracked, today, since ?? today);
  const month = useMemo(() => monthDays(day), [day]);

  if (!hydrated) return null;

  const hijri = hijriDate(localDate(day));

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.head}>
          <Text variant="pageTitle" style={s.center}>
            Barakah
          </Text>
          <Text color="inkSoft" style={s.center}>
            Small daily practices, done consistently.
          </Text>
        </View>

        <View style={s.dateRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous day"
            onPress={() => setDay(addDays(day, -1))}
            style={s.arrow}
          >
            <Chevron left />
          </Pressable>
          <View style={s.dateText}>
            <Text variant="eyebrow" color="inkSoft">
              {isToday ? "Today" : gregorianDate(localDate(day))}
            </Text>
            {hijri ? (
              <Text variant="label" color="inkFaint">
                {hijri}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next day"
            disabled={isToday}
            onPress={() => setDay(addDays(day, 1))}
            style={[s.arrow, isToday && s.arrowOff]}
          >
            <Chevron />
          </Pressable>
        </View>

        <View style={s.ringWrap}>
          <Ring fills={fills} />
          <View style={s.ringCenter}>
            <Text variant="numeral">{`${summary.done}`}</Text>
            <Text variant="label" color="inkSoft">
              {`of ${summary.applicable} ${isToday ? "today" : "that day"}`}
            </Text>
          </View>
        </View>

        <View style={s.list}>
          {due.length === 0 ? (
            <Text color="inkSoft" style={s.center}>
              Nothing tracked for this day. Choose practices below.
            </Text>
          ) : (
            due.map((p) => (
              <PracticeCard
                key={p.id}
                practice={p}
                value={valueOn(values, day, p.id)}
                onChange={(next) => log(day, p.id, next)}
              />
            ))
          )}
        </View>

        <View style={s.block}>
          <Text variant="eyebrow" color="inkSoft">
            Last 30 days
          </Text>
          <Text color="ink" style={s.center}>
            {percent === null ? "Consistency starts counting today." : `${percent}% consistent`}
          </Text>
          <View style={s.grid}>
            {Array.from({ length: month.firstWeekday }, (_, i) => (
              <View key={`b${i}`} style={s.cell} />
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
                  onPress={() => setDay(d)}
                  style={s.cell}
                >
                  {/* A calm wash that deepens with what was done. A day with
                      nothing is just paper, never a red mark. */}
                  <View
                    style={[
                      s.cellFill,
                      { backgroundColor: ratio > 0 ? theme.colors.verdigris : theme.colors.surfaceSunk },
                      { opacity: ratio > 0 ? 0.2 + 0.8 * ratio : future ? 0.25 : 0.6 },
                      d === day && s.cellToday,
                    ]}
                  />
                  <Text variant="label" color={ratio >= 0.6 ? "paper" : "inkSoft"}>
                    {String(parseDay(d).d)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Section title="Choose practices">
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
                <View style={{ flex: 1, gap: space(0.25) }}>
                  <Text>{p.title}</Text>
                  <Text variant="label" color="inkFaint">
                    {p.line}
                  </Text>
                </View>
                <View style={[s.mark, on && s.markOn]}>
                  {on ? (
                    <Svg width={12} height={12} viewBox="0 0 24 24">
                      <Path
                        d="M5 12.5l4.5 4.5L19 7.5"
                        stroke={theme.colors.paper}
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </Svg>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </Section>
      </ScrollView>
    </Screen>
  );
}
