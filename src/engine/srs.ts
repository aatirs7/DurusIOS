/*
  SM-2, modified. Pure. No database access and no clock access, so it is
  unit testable and so the four grade buttons can each be labelled with
  the interval they would actually produce.
*/

export type Grade = "again" | "hard" | "good" | "easy";

export type SrsState = {
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
};

export type ScheduleOptions = {
  now: Date;
  /* True while the card belongs to settings.currentLesson and that lesson
     has been current for fewer than 14 days. */
  capToCurrentLesson: boolean;
  /* Injected so tests are not flaky. Returns a value in [0, 1). */
  random?: () => number;
};

export type ScheduleResult = SrsState & {
  dueAt: Date;
  /* True when the card goes back into the relearn bucket for this
     session rather than being scheduled for a future day. */
  relearn: boolean;
};

export const MIN_EASE = 1.3;
export const MAX_INTERVAL_DAYS = 120;
export const RELEARN_MINUTES = 10;
export const CURRENT_LESSON_CAP_DAYS = 3;
export const CURRENT_LESSON_CAP_WINDOW_DAYS = 14;
const FUZZ = 0.08;
const FUZZ_THRESHOLD_DAYS = 3;

export const DEFAULT_STATE: SrsState = {
  ease: 2.5,
  intervalDays: 0,
  repetitions: 0,
  lapses: 0,
};

function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 86_400_000);
}

function addMinutes(from: Date, minutes: number): Date {
  return new Date(from.getTime() + minutes * 60_000);
}

/* Cards should not clump onto the same weekday forever. */
function applyFuzz(days: number, random: () => number): number {
  if (days <= FUZZ_THRESHOLD_DAYS) return days;
  const factor = 1 + (random() * 2 - 1) * FUZZ;
  return days * factor;
}

export function schedule(
  state: SrsState,
  grade: Grade,
  opts: ScheduleOptions,
): ScheduleResult {
  const random = opts.random ?? Math.random;
  let { ease, intervalDays, repetitions, lapses } = state;

  if (grade === "again") {
    repetitions = 0;
    intervalDays = 0;
    ease = Math.max(MIN_EASE, ease - 0.2);
    lapses += 1;
    return {
      ease,
      intervalDays,
      repetitions,
      lapses,
      dueAt: addMinutes(opts.now, RELEARN_MINUTES),
      relearn: true,
    };
  }

  if (grade === "hard") {
    intervalDays = Math.max(1, intervalDays * 1.2);
    ease = Math.max(MIN_EASE, ease - 0.15);
  } else {
    // good and easy share the same ladder
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 4;
    } else {
      intervalDays = intervalDays * ease;
    }
    repetitions += 1;

    if (grade === "easy") {
      intervalDays *= 1.3;
      ease += 0.15;
    }
  }

  intervalDays = applyFuzz(intervalDays, random);

  // Book 1 vocabulary should stay in rotation while the course is running.
  intervalDays = Math.min(intervalDays, MAX_INTERVAL_DAYS);

  // Wednesday awareness. The newest lesson is the one being tested in
  // class, so it stays tight regardless of what SM-2 returns.
  if (opts.capToCurrentLesson) {
    intervalDays = Math.min(intervalDays, CURRENT_LESSON_CAP_DAYS);
  }

  return {
    ease,
    intervalDays,
    repetitions,
    lapses,
    dueAt: addDays(opts.now, intervalDays),
    relearn: false,
  };
}

/*
  Whether the current lesson cap still applies. Separated so the caller
  does not have to reimplement the 14 day window in three places.
*/
export function isCurrentLessonCapped(
  cardLessonNumber: number,
  currentLesson: number,
  currentLessonSince: Date,
  now: Date,
): boolean {
  if (cardLessonNumber !== currentLesson) return false;
  const daysCurrent =
    (now.getTime() - currentLessonSince.getTime()) / 86_400_000;
  return daysCurrent < CURRENT_LESSON_CAP_WINDOW_DAYS;
}

/* Label for a grade button, for example "10m", "1d", "3.4mo". */
export function formatInterval(result: ScheduleResult): string {
  if (result.relearn) return `${RELEARN_MINUTES}m`;
  const days = result.intervalDays;
  if (days < 1) return `${Math.max(1, Math.round(days * 24))}h`;
  if (days < 30) return `${round1(days)}d`;
  return `${round1(days / 30)}mo`;
}

function round1(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
