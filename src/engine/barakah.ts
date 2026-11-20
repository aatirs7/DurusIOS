/*
  Barakah: small daily practices, tracked as consistency rather than streaks.

  Pure functions only. The store holds an append-only event log and every view
  (today's values, the ring, the month grid, the 30 day figure) is folded from
  it here, so the arithmetic is tested without React or storage.

  Product rules that shape this file:
  - No streaks. The spec allowed optional streaks, off by default; the app's
    standing rule is no streaks at all, and the app wins.
  - A missed day is simply a day with less done. Nothing here computes a
    "miss" as its own thing.
  - Descriptions are one plain line. A Quran reference appears only where the
    practice is itself a surah. The fuller words, meanings and narrations of
    the morning and evening adhkar live in their guided walkthrough
    (src/barakah/adhkar.ts), which the owner asked for, each with its source.
  - Sadaqah is yes or no. No amounts, ever.
*/

export type Schedule =
  | { kind: "daily" }
  /* Days of the week, 0 Sunday to 6 Saturday. */
  | { kind: "weekdays"; days: number[] }
  /* Days of the Hijri month (Umm al-Qura). */
  | { kind: "hijriDays"; days: number[] };

export type Practice = {
  id: string;
  title: string;
  line: string;
  /* check: done or not. count: a number, with an optional ceiling. */
  input: "check" | "count";
  max?: number;
  schedule: Schedule;
  /* Tracked for someone who has not chosen yet. */
  byDefault: boolean;
  /* Only where the practice is a surah. Shown as a reference, never as text. */
  quranRef?: string;
};

export const PRACTICES: Practice[] = [
  { id: "fajr", title: "Fajr on time", line: "Prayed Fajr within its time.", input: "check", schedule: { kind: "daily" }, byDefault: true },
  { id: "morningAdhkar", title: "Morning adhkar", line: "The morning remembrance, after Fajr.", input: "check", schedule: { kind: "daily" }, byDefault: true },
  { id: "eveningAdhkar", title: "Evening adhkar", line: "The evening remembrance, after Asr.", input: "check", schedule: { kind: "daily" }, byDefault: true },
  { id: "quran", title: "Daily Quran portion", line: "Read the portion you set for the day.", input: "check", schedule: { kind: "daily" }, byDefault: true },
  { id: "duha", title: "Duha", line: "The forenoon prayer.", input: "check", schedule: { kind: "daily" }, byDefault: false },
  { id: "rawatib", title: "Sunnah rawatib", line: "The sunnah prayers around the obligatory ones.", input: "count", max: 12, schedule: { kind: "daily" }, byDefault: false },
  { id: "witr", title: "Witr", line: "The odd prayer to close the night.", input: "check", schedule: { kind: "daily" }, byDefault: false },
  { id: "istighfar", title: "Istighfar", line: "Asking forgiveness. Tap to count.", input: "count", schedule: { kind: "daily" }, byDefault: false },
  { id: "salawat", title: "Salawat", line: "Sending blessings on the Prophet. Tap to count.", input: "count", schedule: { kind: "daily" }, byDefault: false },
  { id: "sadaqah", title: "Sadaqah", line: "Gave something today. No amounts are kept.", input: "check", schedule: { kind: "daily" }, byDefault: false },
  { id: "family", title: "Family and kin", line: "Time with family, or keeping ties of kinship.", input: "check", schedule: { kind: "daily" }, byDefault: false },
  { id: "kahf", title: "Surah Al-Kahf", line: "Read on Friday.", input: "check", schedule: { kind: "weekdays", days: [5] }, byDefault: false, quranRef: "Surah 18" },
  { id: "fastMonThu", title: "Monday and Thursday fast", line: "Fasting on Mondays and Thursdays.", input: "check", schedule: { kind: "weekdays", days: [1, 4] }, byDefault: false },
  { id: "whiteDays", title: "The white days", line: "Fasting the 13th, 14th and 15th of the Hijri month.", input: "check", schedule: { kind: "hijriDays", days: [13, 14, 15] }, byDefault: false },
];

export const PRACTICE_BY_ID = new Map(PRACTICES.map((p) => [p.id, p]));

export const DEFAULT_TRACKED = PRACTICES.filter((p) => p.byDefault).map((p) => p.id);

/* One user action. Append only; the latest event for a day and practice wins. */
export type BarakahEvent = {
  at: number;
  day: string; // YYYY-MM-DD, local
  practiceId: string;
  value: number;
};

/* ---------- days ---------- */

export function parseDay(day: string): { y: number; m: number; d: number } {
  const [y, m, d] = day.split("-").map(Number);
  return { y, m, d };
}

/* Noon UTC, so no zone offset can push the instant onto a neighbouring day. */
function dayInstant(day: string): Date {
  const { y, m, d } = parseDay(day);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function formatDay(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(day: string, n: number): string {
  const t = dayInstant(day);
  t.setUTCDate(t.getUTCDate() + n);
  return formatDay(t);
}

export function weekday(day: string): number {
  return dayInstant(day).getUTCDay();
}

let hijriDayFormatter: Intl.DateTimeFormat | null | undefined;

/* Day of the Umm al-Qura month, or null where ICU lacks the calendar. */
export function hijriDayOfMonth(day: string): number | null {
  if (hijriDayFormatter === undefined) {
    try {
      hijriDayFormatter = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "numeric", timeZone: "UTC" });
    } catch {
      hijriDayFormatter = null;
    }
  }
  if (!hijriDayFormatter) return null;
  try {
    const part = hijriDayFormatter.formatToParts(dayInstant(day)).find((p) => p.type === "day");
    const n = part ? Number(part.value) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/* ---------- applicability ---------- */

export function appliesOn(practice: Practice, day: string): boolean {
  const s = practice.schedule;
  switch (s.kind) {
    case "daily":
      return true;
    case "weekdays":
      return s.days.includes(weekday(day));
    case "hijriDays": {
      const h = hijriDayOfMonth(day);
      return h !== null && s.days.includes(h);
    }
  }
}

/* ---------- folding ---------- */

/* day -> practiceId -> value. Later events overwrite earlier ones. */
export type DayValues = Map<string, Map<string, number>>;

export function fold(events: BarakahEvent[]): DayValues {
  const out: DayValues = new Map();
  /* Sorted by time so the fold does not depend on storage order. */
  const sorted = [...events].sort((a, b) => a.at - b.at);
  for (const e of sorted) {
    let day = out.get(e.day);
    if (!day) {
      day = new Map();
      out.set(e.day, day);
    }
    day.set(e.practiceId, e.value);
  }
  return out;
}

export function valueOn(values: DayValues, day: string, practiceId: string): number {
  return values.get(day)?.get(practiceId) ?? 0;
}

/* How full a practice's segment is, 0 to 1. A count with no ceiling is full at 1. */
export function fill(practice: Practice, value: number): number {
  if (value <= 0) return 0;
  if (practice.input === "count" && practice.max) return Math.min(1, value / practice.max);
  /* A check below 1 is a prayer marked late (LATE): half a segment. */
  return Math.min(1, value);
}

/*
  A prayer prayed, but after its time. Stored as a half so it shows half
  full, and it is not "done": Fajr late does not tick "Fajr on time". Every
  other value is a whole number, so this never touches them.
*/
export const LATE = 0.5;

export function isDone(value: number): boolean {
  return value >= 1;
}

export type DaySummary = { applicable: number; done: number };

export function summarise(values: DayValues, tracked: string[], day: string): DaySummary {
  let applicable = 0;
  let done = 0;
  for (const id of tracked) {
    const p = PRACTICE_BY_ID.get(id);
    if (!p || !appliesOn(p, day)) continue;
    applicable += 1;
    if (isDone(valueOn(values, day, id))) done += 1;
  }
  return { applicable, done };
}

/*
  Consistency over a window, as a whole percentage, or null when there is
  nothing to measure yet.

  The window starts no earlier than `since`, the day tracking began, so a
  first week is measured over a week rather than diluted across thirty days the
  user was never here for.
*/
export function consistency(
  values: DayValues,
  tracked: string[],
  today: string,
  since: string,
  windowDays = 30,
): number | null {
  let applicable = 0;
  let done = 0;
  for (let i = 0; i < windowDays; i++) {
    const day = addDays(today, -i);
    if (day < since) break;
    const s = summarise(values, tracked, day);
    applicable += s.applicable;
    done += s.done;
  }
  if (applicable === 0) return null;
  return Math.round((done / applicable) * 100);
}

/* The days of the month containing `day`, as day keys, plus the weekday of the first. */
export function monthDays(day: string): { days: string[]; firstWeekday: number } {
  const { y, m } = parseDay(day);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const days: string[] = [];
  for (let d = first; parseDay(d).m === m; d = addDays(d, 1)) days.push(d);
  return { days, firstWeekday: weekday(first) };
}
