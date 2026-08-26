import { and, asc, eq, isNull, lte, sql } from "drizzle-orm";

import { buildCaseQuestion, type CaseQuestion } from "@/engine/caseDrill";
import { CASE_RUN_LENGTH, SPEED_RUN_LENGTH, type SpeedWord } from "@/engine/constants";

import type { Db } from "./client";
import { cardHearts, cardStates, cardSuspensions, cards, lessons, reviews } from "./schema";
import { getSettingsFor } from "./settings";

/* Shared shuffle. Takes random so a test can pin the deck. */
function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/*
  20 words for the speed drill, recognition only, drawn from the lessons already
  open. Vocab only: reading a full phrase against a two second clock is a test
  of reading speed rather than recall, which is not what this drill is for.
*/
export function getSpeedWords(
  db: Db,
  profileId: number,
  random: () => number = Math.random,
): SpeedWord[] {
  const config = getSettingsFor(db, profileId);

  const rows = db
    .select({
      cardId: cards.id,
      arabic: cards.arabic,
      english: cards.english,
      transliteration: cards.transliteration,
    })
    .from(cards)
    .innerJoin(lessons, eq(cards.lessonId, lessons.id))
    .where(
      and(
        lte(lessons.number, config.currentLesson),
        eq(cards.type, "vocab"),
        sql`not exists (
          select 1 from ${cardSuspensions}
           where ${cardSuspensions.profileId} = ${profileId}
             and ${cardSuspensions.cardId} = ${cards.id}
             and ${cardSuspensions.deletedAt} is null
        )`,
      ),
    )
    .all();

  return shuffle(rows, random).slice(0, SPEED_RUN_LENGTH);
}

/*
  Logged with direction "speed" and never scheduled. That is the whole reason
  reviews has three directions and card_states has two.
*/
export function recordSpeedAnswer(
  db: Db,
  profileId: number,
  deviceId: string,
  answer: { cardId: number; correct: boolean; msToAnswer: number },
  now = new Date(),
) {
  const t = now.getTime().toString(36).padStart(9, "0");
  const r = () => Math.floor(Math.random() * 0x100000000).toString(36).padStart(7, "0");

  db.insert(reviews)
    .values({
      profileId,
      cardId: answer.cardId,
      direction: "speed",
      grade: answer.correct ? "good" : "again",
      msToAnswer: answer.msToAnswer,
      reviewedAt: now,
      practice: false,
      capped: false,
      fuzz: null,
      clientId: `${t}${r()}${r()}`,
      deviceId,
    })
    .run();
}

/*
  15 case questions. buildCaseQuestion blanks the final harakah of one
  declinable noun in a phrase and offers four endings; it returns null when a
  card has no blankable noun, so the pool is filtered rather than assumed.
*/
export function getCaseQuestions(
  db: Db,
  profileId: number,
  random: () => number = Math.random,
): CaseQuestion[] {
  const config = getSettingsFor(db, profileId);

  const rows = db
    .select({ id: cards.id, arabic: cards.arabic, english: cards.english })
    .from(cards)
    .innerJoin(lessons, eq(cards.lessonId, lessons.id))
    .where(and(lte(lessons.number, config.currentLesson), eq(cards.type, "phrase")))
    .all();

  const built: CaseQuestion[] = [];
  /*
    buildCaseQuestion takes a pick(max) -> index, NOT a random() -> [0,1).
    A zero-argument function is assignable to a one-argument parameter type, so
    passing `random` straight through compiles cleanly and then feeds a fraction
    where an array index belongs - every question would blank the same word.
  */
  const pick = (max: number) => Math.floor(random() * max);
  for (const card of shuffle(rows, random)) {
    const q = buildCaseQuestion(card, pick);
    if (q) built.push(q);
    if (built.length === CASE_RUN_LENGTH) break;
  }
  return built;
}

export type DeckCard = {
  cardId: number;
  arabic: string;
  english: string;
  transliteration: string | null;
  note: string | null;
  plural: string | null;
  hearted: boolean;
  /* Null when the card has never been answered, which maturityOf reads as
     unseen. */
  intervalDays: number | null;
};

/* The flashcard deck. Browsing, not drilling: no grading and no scheduling. */
export function getDeck(db: Db, profileId: number, lessonNumber?: number): DeckCard[] {
  const config = getSettingsFor(db, profileId);

  const rows = db
    .select({
      cardId: cards.id,
      arabic: cards.arabic,
      english: cards.english,
      transliteration: cards.transliteration,
      note: cards.note,
      plural: cards.plural,
      /*
        Typed as number, not boolean. Drizzle does not map raw SQL fragments, so
        SQLite returns 0/1 here; declaring it boolean would be a type that is
        simply a lie and breaks the moment anyone writes `=== true`. The web
        version has exactly that bug.
      */
      hearted: sql<number>`(${cardHearts.cardId} is not null and ${cardHearts.deletedAt} is null)`,
      intervalDays: cardStates.intervalDays,
    })
    .from(cards)
    .innerJoin(lessons, eq(cards.lessonId, lessons.id))
    .leftJoin(
      cardHearts,
      and(eq(cardHearts.cardId, cards.id), eq(cardHearts.profileId, profileId)),
    )
    .leftJoin(
      cardStates,
      and(
        eq(cardStates.cardId, cards.id),
        eq(cardStates.direction, "recognition"),
        eq(cardStates.profileId, profileId),
      ),
    )
    .where(
      lessonNumber
        ? eq(lessons.number, lessonNumber)
        : lte(lessons.number, config.currentLesson),
    )
    .orderBy(asc(cards.id))
    .all();

  return rows.map((r) => ({ ...r, hearted: Boolean(r.hearted) }));
}

/*
  A heart is a row or no row - except that a plain delete cannot propagate, so
  un-hearting writes a tombstone instead. Same shape as suspensions, so both
  sets reconcile through one code path.
*/
export function setHeart(
  db: Db,
  profileId: number,
  deviceId: string,
  cardId: number,
  hearted: boolean,
  now = new Date(),
) {
  db.insert(cardHearts)
    .values({
      profileId,
      cardId,
      updatedAt: now,
      deletedAt: hearted ? null : now,
      deviceId,
      dirty: true,
    })
    .onConflictDoUpdate({
      target: [cardHearts.profileId, cardHearts.cardId],
      set: { updatedAt: now, deletedAt: hearted ? null : now, deviceId, dirty: true },
    })
    .run();
}

export function setSuspended(
  db: Db,
  profileId: number,
  deviceId: string,
  cardId: number,
  suspended: boolean,
  now = new Date(),
) {
  db.insert(cardSuspensions)
    .values({
      profileId,
      cardId,
      updatedAt: now,
      deletedAt: suspended ? null : now,
      deviceId,
      dirty: true,
    })
    .onConflictDoUpdate({
      target: [cardSuspensions.profileId, cardSuspensions.cardId],
      set: { updatedAt: now, deletedAt: suspended ? null : now, deviceId, dirty: true },
    })
    .run();
}

export type LessonRow = {
  number: number;
  titleAr: string;
  titleEn: string;
  total: number;
  seen: number;
  unlocked: boolean;
};

export function listLessons(db: Db, profileId: number): LessonRow[] {
  const config = getSettingsFor(db, profileId);

  const rows = db
    .select({
      number: lessons.number,
      titleAr: lessons.titleAr,
      titleEn: lessons.titleEn,
      total: sql<number>`count(${cards.id})`.mapWith(Number),
      seen: sql<number>`count(${cardStates.cardId})`.mapWith(Number),
    })
    .from(lessons)
    /* Book lessons only. listLessons has no other filter, so the trainer's
       stages would otherwise appear in the lessons list as empty lessons with
       numbers past the end of the book. */
    .leftJoin(cards, eq(cards.lessonId, lessons.id))
    .leftJoin(
      cardStates,
      and(
        eq(cardStates.cardId, cards.id),
        eq(cardStates.direction, "recognition"),
        eq(cardStates.profileId, profileId),
      ),
    )
    .groupBy(lessons.number, lessons.titleAr, lessons.titleEn)
    .orderBy(asc(lessons.number))
    .all();

  return rows.map((r) => ({ ...r, unlocked: r.number <= config.currentLesson }));
}

/* Cards in the open lessons that have never been answered. Used by Today to
   decide whether the "nothing scheduled" line is honest. */
export function countUnseen(db: Db, profileId: number, currentLesson: number): number {
  const row = db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(cards)
    .innerJoin(lessons, eq(cards.lessonId, lessons.id))
    .leftJoin(
      cardStates,
      and(
        eq(cardStates.cardId, cards.id),
        eq(cardStates.direction, "recognition"),
        eq(cardStates.profileId, profileId),
      ),
    )
    .where(and(lte(lessons.number, currentLesson), isNull(cardStates.cardId)))
    .get();
  return row?.count ?? 0;
}
