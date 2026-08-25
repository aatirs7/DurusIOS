import { and, desc, eq } from "drizzle-orm";

import { foldStates, type FoldReview } from "@/engine/fold";
import { isCurrentLessonCapped, schedule, type Grade } from "@/engine/srs";

import type { Db } from "./client";
import { cardStates, cards, lessons, reviews } from "./schema";
import { getSettingsFor } from "./settings";

export type GradePayload = {
  cardId: number;
  direction: "recognition" | "production";
  grade: Grade;
  msToAnswer: number;
  /*
    Answered in a practice session, drawn because nothing was due. The review is
    still logged, so speed and accuracy stay honest, but a correct answer leaves
    the schedule where it was.
  */
  practice?: boolean;
};

/* ULID-ish: time-ordered prefix plus randomness. Sortable, which makes it a
   usable tie-break in the fold's total order, and unique enough for one
   person's phones. Not crypto.randomUUID(), which Hermes does not reliably
   expose. */
function mintClientId(now: Date, random: () => number): string {
  const t = now.getTime().toString(36).padStart(9, "0");
  const r = () => Math.floor(random() * 0x100000000).toString(36).padStart(7, "0");
  return `${t}${r()}${r()}`;
}

/*
  One card, one call, written synchronously to SQLite.

  Spec section 6.2 step 7: the write goes to SQLite immediately. No outbox, no
  catch, no retry - and that first clause is still literally true. The session is
  finished with the row the moment it lands. Getting it to the server is another
  module's job on another schedule, and the drill never waits on it, never
  mentions it, and never shows a spinner about it.
*/
export function submitGrade(
  db: Db,
  profileId: number,
  deviceId: string,
  payload: GradePayload,
  opts: { now?: Date; random?: () => number } = {},
) {
  const now = opts.now ?? new Date();
  const random = opts.random ?? Math.random;

  const row = db
    .select({
      lessonNumber: lessons.number,
      ease: cardStates.ease,
      intervalDays: cardStates.intervalDays,
      repetitions: cardStates.repetitions,
      lapses: cardStates.lapses,
    })
    .from(cards)
    .innerJoin(lessons, eq(cards.lessonId, lessons.id))
    .leftJoin(
      cardStates,
      and(
        eq(cardStates.cardId, cards.id),
        eq(cardStates.direction, payload.direction),
        eq(cardStates.profileId, profileId),
      ),
    )
    .where(eq(cards.id, payload.cardId))
    .get();

  if (!row) throw new Error(`card ${payload.cardId} not found`);

  const config = getSettingsFor(db, profileId);

  const state = {
    ease: row.ease ?? 2.5,
    intervalDays: row.intervalDays ?? 0,
    repetitions: row.repetitions ?? 0,
    lapses: row.lapses ?? 0,
  };

  const capped = isCurrentLessonCapped(
    row.lessonNumber,
    config.currentLesson,
    config.currentLessonSince,
    now,
  );

  /*
    Sample the fuzz here and hand it to schedule(), rather than letting
    schedule() reach for Math.random itself, so the exact value consumed can be
    persisted. Without it the fold cannot reproduce this interval and the two
    devices diverge.

    applyFuzz only consults random() for intervals over three days, so record
    whether it was actually read: storing a value that was never consumed would
    be misleading, and storing null for one that was would be wrong.
  */
  const sampled = random();
  let consumed = false;
  const next = schedule(state, payload.grade, {
    now,
    capToCurrentLesson: capped,
    random: () => {
      consumed = true;
      return sampled;
    },
  });

  const skipSchedule = payload.practice === true && payload.grade !== "again";

  db.transaction((tx) => {
    if (!skipSchedule) {
      tx.insert(cardStates)
        .values({
          profileId,
          cardId: payload.cardId,
          direction: payload.direction,
          ease: next.ease,
          intervalDays: next.intervalDays,
          repetitions: next.repetitions,
          lapses: next.lapses,
          dueAt: next.dueAt,
        })
        .onConflictDoUpdate({
          target: [cardStates.profileId, cardStates.cardId, cardStates.direction],
          set: {
            ease: next.ease,
            intervalDays: next.intervalDays,
            repetitions: next.repetitions,
            lapses: next.lapses,
            dueAt: next.dueAt,
          },
        })
        .run();
    }

    tx.insert(reviews)
      .values({
        profileId,
        cardId: payload.cardId,
        direction: payload.direction,
        grade: payload.grade,
        msToAnswer: payload.msToAnswer,
        reviewedAt: now,
        practice: payload.practice === true,
        capped,
        fuzz: consumed ? sampled : null,
        clientId: mintClientId(now, random),
        deviceId,
      })
      .run();

    /*
      Production is created lazily, only once recognition for this card reaches
      repetitions >= 2. Otherwise production drills swamp the first week of
      every new lesson.
    */
    if (!skipSchedule && payload.direction === "recognition" && next.repetitions >= 2) {
      tx.insert(cardStates)
        .values({
          profileId,
          cardId: payload.cardId,
          direction: "production",
          dueAt: now,
        })
        .onConflictDoNothing()
        .run();
    }
  });

  return { grade: payload.grade, dueAt: next.dueAt, relearn: next.relearn };
}

/*
  Undo.

  The reviews table is append only in normal operation and this is the one
  documented exception - except that it is no longer a delete. Retracting keeps
  the row and sets retractedAt, because a log with a tombstone can be replayed
  and one with a hole in it cannot. Every read filters retracted rows out, and
  the fold skips them, so the effect is identical and the history survives.
*/
export function undoGrade(
  db: Db,
  profileId: number,
  payload: { cardId: number; direction: "recognition" | "production" },
  now = new Date(),
) {
  const last = db
    .select({ id: reviews.id })
    .from(reviews)
    .where(
      and(
        eq(reviews.profileId, profileId),
        eq(reviews.cardId, payload.cardId),
        eq(reviews.direction, payload.direction),
      ),
    )
    .orderBy(desc(reviews.id))
    .limit(1)
    .get();

  if (!last) return { ok: false as const };

  db.transaction((tx) => {
    tx.update(reviews).set({ retractedAt: now }).where(eq(reviews.id, last.id)).run();
  });

  /*
    Retracting a row changes what the log implies, so the derived state has to
    be rebuilt rather than patched. A full refold of this one key, not an
    incremental fixup: the retracted review may sit anywhere in the history and
    everything after it is invalidated. That is cheap - a card accumulates tens
    of reviews over a course - and it is the whole practical payoff of keeping
    card_states derived.
  */
  refoldCard(db, profileId, payload.cardId, payload.direction);

  return { ok: true as const };
}

/*
  Rebuilds card_states for one card and direction from its review log.

  Deleting and re-inserting rather than updating in place, because foldStates
  returning null genuinely means "no state row", and a card with no state row is
  what the queue treats as new.
*/
export function refoldCard(
  db: Db,
  profileId: number,
  cardId: number,
  direction: "recognition" | "production",
) {
  const log = db
    .select({
      cardId: reviews.cardId,
      direction: reviews.direction,
      grade: reviews.grade,
      reviewedAt: reviews.reviewedAt,
      practice: reviews.practice,
      capped: reviews.capped,
      fuzz: reviews.fuzz,
      retractedAt: reviews.retractedAt,
      deviceId: reviews.deviceId,
      clientId: reviews.clientId,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.profileId, profileId),
        eq(reviews.cardId, cardId),
        eq(reviews.direction, direction),
      ),
    )
    .all();

  const folded = foldStates(log as FoldReview[]);

  db.transaction((tx) => {
    tx.delete(cardStates)
      .where(
        and(
          eq(cardStates.profileId, profileId),
          eq(cardStates.cardId, cardId),
          eq(cardStates.direction, direction),
        ),
      )
      .run();

    if (folded) {
      tx.insert(cardStates)
        .values({
          profileId,
          cardId,
          direction,
          ease: folded.ease,
          intervalDays: folded.intervalDays,
          repetitions: folded.repetitions,
          lapses: folded.lapses,
          dueAt: folded.dueAt,
        })
        .run();
    }
  });
}
