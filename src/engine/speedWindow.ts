import { SPEED_FLOOR_MS } from "./constants";

/*
  Working out how long the speed drill's window should be, from a run without
  one.

  The window used to start at a default and creep down 100ms at a time,
  tightening only after a run above 85%. That works, but it takes a fortnight to
  find a beginner's real pace and it starts everybody in the same place - so a
  fast reader spends two weeks on a drill that is not testing them, and a slow
  one spends the same two weeks losing.

  A diagnostic asks the question directly: read some words with no clock at all,
  and set the window from how long that actually took.

  Pure, so the rule is testable without a drill.
*/

/* Long enough to be a real ceiling and short enough that the drill is still a
   speed drill. A window above this is measuring patience. */
export const SPEED_CEILING_MS = 6000;

/*
  How much longer than your typical correct answer the window is.

  Not 1.0: a window set to your median means half your answers are late by
  construction, and the drill becomes unwinnable at the exact moment it starts.
  Not 2.0 either, which is no pressure at all. A quarter again leaves the
  comfortable ones comfortable and the hesitant ones tight, which is the whole
  point of the thing.
*/
export const DIAGNOSTIC_HEADROOM = 1.25;

/* Rounded to something a person could read off a stopwatch, so that Settings
   shows 1.4s rather than 1.387s. */
const ROUND_TO_MS = 50;

/*
  How many answers a diagnostic needs before it is worth believing.

  Three is not a sample, it is an anecdote. Six is enough for a median to mean
  something without making the diagnostic a chore.
*/
export const DIAGNOSTIC_MIN_CORRECT = 6;

/* How many words a diagnostic run asks. */
export const DIAGNOSTIC_LENGTH = 12;

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  return sorted.length % 2
    ? sorted[Math.floor(mid)]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/*
  The window a diagnostic implies, or null when it did not gather enough.

  ONLY correct answers are counted. A wrong answer's time says how long
  somebody took to guess, which is not a measure of how fast they read - and
  including them would reward answering badly and quickly with a longer window.
*/
export function windowFromDiagnostic(correctTimesMs: readonly number[]): number | null {
  if (correctTimesMs.length < DIAGNOSTIC_MIN_CORRECT) return null;

  const typical = median(correctTimesMs);
  if (typical === null) return null;

  const raw = typical * DIAGNOSTIC_HEADROOM;
  const rounded = Math.round(raw / ROUND_TO_MS) * ROUND_TO_MS;

  return Math.min(SPEED_CEILING_MS, Math.max(SPEED_FLOOR_MS, rounded));
}
