import { and, asc, eq, lte, sql } from "drizzle-orm";

import type { Db } from "./client";
import { cardStates, cards, lessons } from "./schema";

/*
  Reading the numbers trainer's stages.

  A stage is a lesson row with deck = "numbers", so everything here is an
  ordinary query against the ordinary tables. There is no second scheduler and
  no parallel content: what makes a stage a stage is the deck column and the
  fact that this file, rather than queue.ts, is what reads it.
*/

export type StageState = "taught" | "unlocked" | "locked";

export type Stage = {
  /* lessons.number, which is 100 + the stage's position. */
  number: number;
  stage: number;
  titleAr: string;
  titleEn: string;
  grammarNote: string | null;
  items: number;
  /* How many of this stage's items have been answered correctly twice in
     recognition, which is what the unlock threshold counts. */
  learned: number;
  due: number;
  state: StageState;
};

/*
  What counts as knowing an item well enough to move on.

  Two recognition repetitions, mirroring the threshold the main deck already
  uses to unlock production (see modeFor). Inventing a second number would mean
  two different ideas of "solid" in one app, and no way to explain either.
*/
const UNLOCK_REPS = 2;

/*
  How many of a stage's items are past the threshold, and how many are due.

  One query per stage rather than one per item: the left join is against
  card_states for THIS profile in the recognition direction only, because
  production is a rung the trainer's foundation stages never reach.
*/
function stageCounts(db: Db, profileId: number, lessonId: number, now: Date) {
  const row = db
    .select({
      items: sql<number>`count(${cards.id})`.mapWith(Number),
      learned: sql<number>`sum(case when ${cardStates.repetitions} >= ${UNLOCK_REPS} then 1 else 0 end)`.mapWith(
        Number,
      ),
      due: sql<number>`sum(case when ${cardStates.dueAt} is not null and ${cardStates.dueAt} <= ${now.getTime()} then 1 else 0 end)`.mapWith(
        Number,
      ),
    })
    .from(cards)
    .leftJoin(
      cardStates,
      and(
        eq(cardStates.cardId, cards.id),
        eq(cardStates.profileId, profileId),
        eq(cardStates.direction, "recognition"),
      ),
    )
    .where(eq(cards.lessonId, lessonId))
    .get();

  return {
    items: row?.items ?? 0,
    learned: row?.learned ?? 0,
    due: row?.due ?? 0,
  };
}

/*
  Every stage, in order, with its state.

  A stage is unlocked when EVERY item in the one before it is past the
  threshold. The first is always unlocked - there is nothing in front of it to
  earn - and a stage with no items yet is treated as complete, because the
  rules stages have no cards until their generators exist and a stage nobody
  can finish would lock everything behind it for ever.
*/
export function listStages(db: Db, profileId: number, now = new Date()): Stage[] {
  const rows = db
    .select({
      id: lessons.id,
      number: lessons.number,
      titleAr: lessons.titleAr,
      titleEn: lessons.titleEn,
      grammarNote: lessons.grammarNote,
    })
    .from(lessons)
    .where(eq(lessons.deck, "numbers"))
    .orderBy(asc(lessons.number))
    .all();

  const stages: Stage[] = [];
  let previousComplete = true;

  for (const row of rows) {
    const counts = stageCounts(db, profileId, row.id, now);
    const complete = counts.items === 0 || counts.learned >= counts.items;

    stages.push({
      number: row.number,
      stage: row.number - 100,
      titleAr: row.titleAr,
      titleEn: row.titleEn,
      grammarNote: row.grammarNote,
      items: counts.items,
      learned: counts.learned,
      due: counts.due,
      state: previousComplete ? (counts.learned > 0 ? "taught" : "unlocked") : "locked",
    });

    previousComplete = previousComplete && complete;
  }

  return stages;
}

/* Every item in a stage, for the teach screen. Ordered by id, which follows
   the order they were authored in - one to ten rather than shuffled. */
export function stageItems(db: Db, lessonNumber: number) {
  return db
    .select({
      id: cards.id,
      arabic: cards.arabic,
      english: cards.english,
      transliteration: cards.transliteration,
      note: cards.note,
    })
    .from(cards)
    .innerJoin(lessons, eq(cards.lessonId, lessons.id))
    .where(and(eq(lessons.number, lessonNumber), eq(lessons.deck, "numbers")))
    .orderBy(asc(cards.id))
    .all();
}

/* How many trainer cards are due across every stage, for the entry point. */
export function countTrainerDue(db: Db, profileId: number, now = new Date()): number {
  const row = db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(cardStates)
    .innerJoin(cards, eq(cards.id, cardStates.cardId))
    .innerJoin(lessons, eq(lessons.id, cards.lessonId))
    .where(
      and(
        eq(cardStates.profileId, profileId),
        eq(lessons.deck, "numbers"),
        lte(cardStates.dueAt, now),
      ),
    )
    .get();

  return row?.count ?? 0;
}
