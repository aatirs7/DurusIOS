/*
  card_states, derived.

  A card's scheduler state is a deterministic fold over its review log and
  nothing else. This is the load-bearing idea of the whole sync design: it takes
  the only mutable, high-churn, conflict-prone table out of the protocol, and
  leaves an append-only log that merges by set union.

  It works because schedule() is pure and takes `now` and `random` as arguments
  rather than reading the clock. The spec kept that property for testability;
  it turns out to be exactly what makes two devices converge without either
  being told anything.

  For the fold to be genuinely deterministic, a review row has to carry every
  input schedule() consumed. Three were not being stored and now are:

    capped    depends on settings.currentLesson and currentLessonSince AS THEY
              WERE at the moment of the review. That history exists nowhere
              else, so recomputing it from present day settings would silently
              produce different intervals on a replay.
    fuzz      the sampled value applyFuzz consumed. Null where applyFuzz was the
              identity, which is every "again" and every interval <= 3 days.
    practice  whether the answer came from the nothing-is-due fallback, where a
              correct answer must not move the schedule.

  This file must stay byte-identical to the server's copy. A constant that
  drifts between them produces two devices with silently different schedules and
  no error anywhere, which is why it lives in src/engine (lint-enforced pure)
  and is covered by a golden test run on both sides.
*/

import { DEFAULT_STATE, schedule, type Grade, type SrsState } from "./srs";

export type FoldDirection = "recognition" | "production" | "speed";

export type FoldReview = {
  cardId: number;
  direction: FoldDirection;
  grade: Grade;
  reviewedAt: Date;
  practice: boolean;
  capped: boolean;
  fuzz: number | null;
  retractedAt: Date | null;
  /* Tie-breakers, so two devices agree on an order for reviews that share a
     millisecond. Never used as the primary sort. */
  deviceId: string;
  clientId: string;
};

export type FoldedState = SrsState & { dueAt: Date };

export type FoldKey = `${number}:${"recognition" | "production"}`;

export function foldKey(cardId: number, direction: "recognition" | "production"): FoldKey {
  return `${cardId}:${direction}`;
}

/*
  A total order both sides agree on.

  Ordered by the wall clock the review actually happened at, NEVER by the server
  sequence. Server sequence is arrival order, so a device that was offline for a
  week would have its whole week folded after the other device's, producing a
  schedule that never happened.

  Clock skew between devices can still reorder two answers to the same card in
  the same direction inside the skew window. The consequence is a slightly
  different interval, not corruption, and both devices still converge on the
  same slightly different interval - which is what actually matters.
*/
export function compareReviews(a: FoldReview, b: FoldReview): number {
  const t = a.reviewedAt.getTime() - b.reviewedAt.getTime();
  if (t !== 0) return t;
  if (a.deviceId !== b.deviceId) return a.deviceId < b.deviceId ? -1 : 1;
  if (a.clientId !== b.clientId) return a.clientId < b.clientId ? -1 : 1;
  return 0;
}

/*
  Whether a review moves the schedule at all.

  Speed runs are logged but never scheduled - that is why reviews has three
  directions and card_states has two. Practice answers are logged so speed and
  accuracy stay honest, but a correct one leaves the interval where it was:
  acing a word the scheduler did not ask for should not push it a month further
  out, or a quiet evening of revision would empty the next fortnight. Getting
  one wrong still counts, because a word you have just failed needs to come back
  sooner however you found that out.
*/
export function movesSchedule(r: FoldReview): boolean {
  if (r.retractedAt !== null) return false;
  if (r.direction === "speed") return false;
  if (r.practice && r.grade !== "again") return false;
  return true;
}

/*
  Folds one card and one direction.

  Returns null when no review in the log moves the schedule, which is what
  "this card has no state row" means - and a card with no state row is exactly
  what the queue treats as new.
*/
export function foldStates(reviews: readonly FoldReview[]): FoldedState | null {
  const ordered = [...reviews].sort(compareReviews);

  let state: SrsState = { ...DEFAULT_STATE };
  let dueAt: Date | null = null;

  for (const r of ordered) {
    if (!movesSchedule(r)) continue;

    const next = schedule(state, r.grade, {
      now: r.reviewedAt,
      capToCurrentLesson: r.capped,
      /*
        The stored sample. applyFuzz is only consulted for intervals over three
        days, so a null here is never read - the 0.5 is a value that can never
        change an outcome rather than a default that might.
      */
      random: () => r.fuzz ?? 0.5,
    });

    state = {
      ease: next.ease,
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      lapses: next.lapses,
    };
    dueAt = next.dueAt;
  }

  if (dueAt === null) return null;
  return { ...state, dueAt };
}

export type FoldOutput = {
  key: FoldKey;
  cardId: number;
  direction: "recognition" | "production";
  state: FoldedState;
};

/*
  Folds a whole review log into every card_state it implies.

  Production rows are created lazily, only once recognition for that card
  reaches repetitions >= 2, and they fall out of this pass rather than needing a
  separate rule: the condition is on folded state, not on any stored fact. Their
  dueAt is the reviewedAt of the recognition review that crossed the threshold,
  which is deterministic and therefore the same on every device.

  Without the lazy rule, production drills swamp the first week of every new
  lesson.
*/
export function foldAll(reviews: readonly FoldReview[]): FoldOutput[] {
  const byKey = new Map<FoldKey, FoldReview[]>();
  for (const r of reviews) {
    if (r.direction === "speed") continue;
    const key = foldKey(r.cardId, r.direction);
    const list = byKey.get(key);
    if (list) list.push(r);
    else byKey.set(key, [r]);
  }

  const out: FoldOutput[] = [];
  const producedAt = new Map<number, Date>();

  for (const [key, list] of byKey) {
    const { cardId, direction } = parseKey(key);
    const state = foldStates(list);
    if (!state) continue;
    out.push({ key, cardId, direction, state });

    if (direction === "recognition") {
      const at = recognitionCrossedAt(list);
      if (at) producedAt.set(cardId, at);
    }
  }

  /* A production row exists from the moment recognition matured, even if it has
     never itself been answered. */
  for (const [cardId, at] of producedAt) {
    const key = foldKey(cardId, "production");
    if (out.some((o) => o.key === key)) continue;
    out.push({
      key,
      cardId,
      direction: "production",
      state: { ...DEFAULT_STATE, dueAt: at },
    });
  }

  return out;
}

/* When recognition first reached repetitions >= 2. */
function recognitionCrossedAt(reviews: readonly FoldReview[]): Date | null {
  const ordered = [...reviews].sort(compareReviews);
  let state: SrsState = { ...DEFAULT_STATE };

  for (const r of ordered) {
    if (!movesSchedule(r)) continue;
    const next = schedule(state, r.grade, {
      now: r.reviewedAt,
      capToCurrentLesson: r.capped,
      random: () => r.fuzz ?? 0.5,
    });
    state = {
      ease: next.ease,
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      lapses: next.lapses,
    };
    if (state.repetitions >= 2) return r.reviewedAt;
  }
  return null;
}

function parseKey(key: FoldKey): {
  cardId: number;
  direction: "recognition" | "production";
} {
  const i = key.indexOf(":");
  return {
    cardId: Number(key.slice(0, i)),
    direction: key.slice(i + 1) as "recognition" | "production",
  };
}
