import { and, asc, eq, inArray, isNull, lte, sql } from "drizzle-orm";

import { pickDistractors } from "@/engine/distractors";
import { tilesFor, type Tile } from "@/engine/letters";
import { modeFor, type Mode } from "@/engine/modes";

import type { Db } from "./client";
import { getSettingsFor } from "./settings";
import { cardStates, cardSuspensions, cards, lessons } from "./schema";

export type QueueItem = {
  cardId: number;
  direction: "recognition" | "production";
  lessonNumber: number;
  arabic: string;
  english: string;
  transliteration: string | null;
  type: "vocab" | "phrase";
  gender: "m" | "f" | null;
  plural: string | null;
  note: string | null;
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  isNew: boolean;
  /*
    Drawn because nothing was due, rather than because it was. A correct answer
    on one of these does not move the schedule.
  */
  practice: boolean;
};

/*
  Everything the session needs to ask one question. Distractors come from the
  same lessons, so a wrong option is always a word that could plausibly have
  been the answer.
*/
export type Question = QueueItem & {
  mode: Mode;
  /* Four options for choice mode, already shuffled, one of them right. Empty
     for the other modes. */
  options: { arabic: string; english: string }[];
  /* Shuffled letters for assemble mode. Empty otherwise. */
  tiles: Tile[];
};

/* Shuffle within a bucket. Never across buckets. */
function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/*
  Suspension moved off card_states into its own table, so card_states could stay
  a pure fold over reviews. Every read that used to say
  eq(cardStates.suspended, false) says this instead.
*/
function notSuspended(profileId: number) {
  return sql`not exists (
    select 1 from ${cardSuspensions}
     where ${cardSuspensions.profileId} = ${profileId}
       and ${cardSuspensions.cardId} = ${cardStates.cardId}
       and ${cardSuspensions.deletedAt} is null
  )`;
}

export function countDue(db: Db, profileId: number, now = new Date()): number {
  const row = db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(cardStates)
    .where(
      and(
        eq(cardStates.profileId, profileId),
        lte(cardStates.dueAt, now),
        notSuspended(profileId),
      ),
    )
    .get();
  return row?.count ?? 0;
}

export function countNewAvailable(db: Db, profileId: number, currentLesson: number): number {
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

/*
  Bucket order, per the spec:
    1. lapsed cards from earlier this session, handled in the client
    2. cards where dueAt <= now, oldest first, capped at maxReviews
    3. new cards from lessons 1..currentLesson with no state row,
       capped at newPerDay

  The relearn bucket lives in the session component rather than here, because
  "earlier this session" is not a database fact.
*/
export function buildQueue(
  db: Db,
  profileId: number,
  options: { lessonNumbers?: number[]; now?: Date; random?: () => number } = {},
): QueueItem[] {
  const now = options.now ?? new Date();
  const random = options.random ?? Math.random;
  const config = getSettingsFor(db, profileId);

  /*
    A chosen set of lessons, or everything the class has covered.

    A set rather than a single number, because "revise lessons 3 and 7 before
    the test" is the actual request - one lesson at a time was only ever the
    simplest case of it. An empty array means the same as no array: the
    scheduler picks across everything open.
  */
  const chosen = options.lessonNumbers?.filter((n) => Number.isInteger(n)) ?? [];
  const lessonFilter = chosen.length
    ? inArray(lessons.number, chosen)
    : lte(lessons.number, config.currentLesson);

  const dueRows = db
    .select({
      cardId: cards.id,
      direction: cardStates.direction,
      lessonNumber: lessons.number,
      arabic: cards.arabic,
      english: cards.english,
      transliteration: cards.transliteration,
      type: cards.type,
      gender: cards.gender,
      plural: cards.plural,
      note: cards.note,
      ease: cardStates.ease,
      intervalDays: cardStates.intervalDays,
      repetitions: cardStates.repetitions,
      lapses: cardStates.lapses,
    })
    .from(cardStates)
    .innerJoin(cards, eq(cardStates.cardId, cards.id))
    .innerJoin(lessons, eq(cards.lessonId, lessons.id))
    .where(
      and(
        eq(cardStates.profileId, profileId),
        lte(cardStates.dueAt, now),
        notSuspended(profileId),
        lessonFilter,
      ),
    )
    .orderBy(asc(cardStates.dueAt))
    .limit(config.maxReviews)
    .all();

  const newRows = db
    .select({
      cardId: cards.id,
      lessonNumber: lessons.number,
      arabic: cards.arabic,
      english: cards.english,
      transliteration: cards.transliteration,
      type: cards.type,
      gender: cards.gender,
      plural: cards.plural,
      note: cards.note,
    })
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
    .where(and(lessonFilter, isNull(cardStates.cardId)))
    /* Insertion order, which follows the content asset's order, which follows
       the book. This is what makes new words arrive in book order. */
    .orderBy(asc(cards.id))
    .limit(config.newPerDay)
    .all();

  const due: QueueItem[] = dueRows.map((r) => ({
    ...r,
    isNew: false,
    practice: false,
  }));

  const fresh: QueueItem[] = newRows.map((r) => ({
    ...r,
    direction: "recognition" as const,
    ease: 2.5,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    isNew: true,
    practice: false,
  }));

  if (due.length > 0 || fresh.length > 0) {
    return [...shuffle(due, random), ...shuffle(fresh, random)];
  }

  /*
    Nothing is due and there is nothing new left, so fall back to going over the
    lessons already open.

    This is practice, not the schedule running early. A correct answer here
    leaves the card's interval alone, because acing a word you were not asked
    for should not push it a month further out. A wrong one still counts, since
    a word you have just failed does need to come back sooner whenever you found
    that out.
  */
  const practiceRows = db
    .select({
      cardId: cards.id,
      direction: cardStates.direction,
      lessonNumber: lessons.number,
      arabic: cards.arabic,
      english: cards.english,
      transliteration: cards.transliteration,
      type: cards.type,
      gender: cards.gender,
      plural: cards.plural,
      note: cards.note,
      ease: cardStates.ease,
      intervalDays: cardStates.intervalDays,
      repetitions: cardStates.repetitions,
      lapses: cardStates.lapses,
    })
    .from(cardStates)
    .innerJoin(cards, eq(cardStates.cardId, cards.id))
    .innerJoin(lessons, eq(cards.lessonId, lessons.id))
    .where(and(eq(cardStates.profileId, profileId), notSuspended(profileId), lessonFilter))
    .orderBy(asc(cardStates.dueAt))
    .limit(config.maxReviews)
    .all();

  return shuffle(
    practiceRows.map((r) => ({ ...r, isNew: false, practice: true })),
    random,
  );
}

/*
  Turns a queue into questions. One extra read for the distractor pool, rather
  than one per card.
*/
export function buildQuestions(
  db: Db,
  queue: QueueItem[],
  lessonNumbers: number[],
  random: () => number = Math.random,
): Question[] {
  if (queue.length === 0) return [];

  const pool = db
    .select({ arabic: cards.arabic, english: cards.english, type: cards.type })
    .from(cards)
    .innerJoin(lessons, eq(cards.lessonId, lessons.id))
    .where(inArray(lessons.number, lessonNumbers))
    .all();

  return queue.map((item) => {
    const mode = modeFor({ type: item.type, repetitions: item.repetitions }, item.direction);

    if (mode === "assemble") {
      return { ...item, mode, options: [], tiles: tilesFor(item.arabic, random) };
    }

    if (mode !== "choice") return { ...item, mode, options: [], tiles: [] };

    /*
      Distractors match the card's own type, and are then CHOSEN rather than
      shuffled - see engine/distractors.ts. Taking the first three at random
      left two ways to be right without knowing the word: a sentence among
      three single words is obvious by shape, and a sentence about a dog next
      to three that are not turns the question into "find the word dog".
    */
    const candidates = pool.filter(
      (c) => c.type === item.type && c.english !== item.english,
    );

    const picked = pickDistractors(item.english, candidates, 3, random);

    const options = shuffle(
      [
        { arabic: item.arabic, english: item.english },
        ...picked.map((c) => ({ arabic: c.arabic, english: c.english })),
      ],
      random,
    );

    return { ...item, mode, options, tiles: [] };
  });
}
