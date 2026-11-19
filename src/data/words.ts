import { and, asc, eq, isNull, lte, sql } from "drizzle-orm";

import {
  atPrefix,
  floorPercent,
  pathPrefix,
  pickMeaningDistractors,
  pickNewCards,
  surahsCoverage,
  type MeaningOption,
} from "@/engine/words";

import type { Db } from "./client";
import { cardStates, cardSuspensions, cards, lessons, reviews } from "./schema";
import {
  PATH_CARD_IDS,
  WORDS,
  lemmaForCard,
  stageFor,
  type WordsLemma,
  type WordsStage,
} from "./wordsContent";

/*
  Reading the Quranic Words track.

  A stage is a lesson row with deck "words" and a lemma is a card, so this is
  ordinary SQL over the ordinary tables, the way src/data/numbers.ts reads the
  numbers trainer. Everything the tables cannot hold (groups, forms, anchors,
  the coverage curves) comes from the bundled content, keyed by card id.

  Recognition only. The track's goal is reception (spec 7.2), so it never
  draws production; submitGrade may still create a production state at two
  repetitions, as it does for every card, and it is simply never read here.
*/

/* What "known" means for coverage: two correct recognitions, the same bar the
   numbers trainer and the book's production unlock use. */
export const KNOWN_REPS = 2;

/* About five new words a day (spec 7.1). */
export const NEW_PER_DAY = 5;

/* Past this many due reviews, new words pause on their own. Calm, not a
   penalty: the Start button simply brings reviews. */
export const PAUSE_NEW_AT_DUE = 40;

const MAX_REVIEWS = 100;

function wordsDeck() {
  return eq(lessons.deck, "words");
}

function notSuspended(profileId: number) {
  return sql`not exists (
    select 1 from ${cardSuspensions}
     where ${cardSuspensions.profileId} = ${profileId}
       and ${cardSuspensions.cardId} = ${cards.id}
       and ${cardSuspensions.deletedAt} is null
  )`;
}

type StateRow = { cardId: number; repetitions: number; dueAt: Date };

function recognitionStates(db: Db, profileId: number): StateRow[] {
  return db
    .select({ cardId: cardStates.cardId, repetitions: cardStates.repetitions, dueAt: cardStates.dueAt })
    .from(cardStates)
    .innerJoin(cards, eq(cards.id, cardStates.cardId))
    .innerJoin(lessons, eq(lessons.id, cards.lessonId))
    .where(and(eq(cardStates.profileId, profileId), eq(cardStates.direction, "recognition"), wordsDeck()))
    .all();
}

export type WordsStageView = WordsStage & {
  items: number;
  introduced: number;
  learned: number;
};

export type WordsProgress = {
  prefix: number;
  /* Whole percent of the Quran's words known, rounded down. */
  percent: number;
  followable: number;
  stages: WordsStageView[];
  due: number;
  /* Seeded? False only if the words seed failed, so the page can stay quiet. */
  ready: boolean;
};

export function wordsProgress(db: Db, profileId: number, now = new Date()): WordsProgress {
  const states = recognitionStates(db, profileId);
  const known = new Set(states.filter((s) => s.repetitions >= KNOWN_REPS).map((s) => s.cardId));
  const introduced = new Set(states.map((s) => s.cardId));
  const due = states.filter((s) => s.dueAt.getTime() <= now.getTime()).length;

  const seeded = db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(cards)
    .innerJoin(lessons, eq(lessons.id, cards.lessonId))
    .where(wordsDeck())
    .get();

  const prefix = pathPrefix(PATH_CARD_IDS, known);
  const stages = WORDS.stages.map((st) => {
    const ids = PATH_CARD_IDS.slice(st.firstPosition - 1, st.lastPosition);
    return {
      ...st,
      items: ids.length,
      introduced: ids.filter((id) => introduced.has(id)).length,
      learned: ids.filter((id) => known.has(id)).length,
    };
  });

  return {
    prefix,
    percent: floorPercent(atPrefix(WORDS.path.coverage, prefix), WORDS.totals.words),
    followable: atPrefix(WORDS.path.followable, prefix),
    stages,
    due,
    ready: (seeded?.n ?? 0) > 0,
  };
}

/* Share of the words of the given (memorized) surahs known, or null. */
export function memorizedCoverage(prefix: number, surahNumbers: readonly number[]): number | null {
  const set = new Set(surahNumbers);
  const share = surahsCoverage(
    WORDS.surahs.filter((s) => set.has(s.surah)),
    prefix,
  );
  return share === null ? null : share;
}

/* ------------------------------------------------------------ the session */

export type WordQuestion = {
  cardId: number;
  lemma: WordsLemma;
  english: string;
  isNew: boolean;
  options: { cardId: number; english: string }[];
};

export type WordsSession = {
  /* Stages whose first words this session introduces: their intro (and the
     parsing skills it teaches) comes before anything else. */
  intros: WordsStage[];
  newCards: WordsLemma[];
  questions: WordQuestion[];
  reviews: number;
};

/* When each words card was first answered, for what counts as met today. */
function firstSeen(db: Db, profileId: number): { cardId: number; first: number }[] {
  return db
    .select({ cardId: reviews.cardId, first: sql<number>`min(${reviews.reviewedAt})`.mapWith(Number) })
    .from(reviews)
    .innerJoin(cards, eq(cards.id, reviews.cardId))
    .innerJoin(lessons, eq(lessons.id, cards.lessonId))
    .where(
      and(
        eq(reviews.profileId, profileId),
        eq(reviews.direction, "recognition"),
        isNull(reviews.retractedAt),
        wordsDeck(),
      ),
    )
    .groupBy(reviews.cardId)
    .all();
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function startOfDay(now: Date): Date {
  const d = new Date(now.getTime());
  d.setHours(0, 0, 0, 0);
  return d;
}

/*
  One session (spec 7.1): reviews first, then up to NEW_PER_DAY new words from
  the first stage that still has words to teach, picked so no two of one
  interference group arrive together. New words pause when reviews pile up.
*/
export function buildWordsSession(
  db: Db,
  profileId: number,
  opts: { now?: Date; random?: () => number } = {},
): WordsSession {
  const now = opts.now ?? new Date();
  const random = opts.random ?? Math.random;

  const dueRows = db
    .select({ cardId: cards.id, english: cards.english })
    .from(cardStates)
    .innerJoin(cards, eq(cards.id, cardStates.cardId))
    .innerJoin(lessons, eq(lessons.id, cards.lessonId))
    .where(
      and(
        eq(cardStates.profileId, profileId),
        eq(cardStates.direction, "recognition"),
        lte(cardStates.dueAt, now),
        wordsDeck(),
        notSuspended(profileId),
      ),
    )
    .orderBy(asc(cardStates.dueAt))
    .limit(MAX_REVIEWS)
    .all();

  const today = startOfDay(now).getTime();
  const metToday = firstSeen(db, profileId).filter((r) => r.first >= today);
  /* Groups of words first met today, so the picker does not pair a
     near-synonym with one learnt this morning. */
  const groupsToday = new Set(metToday.map((r) => lemmaForCard(r.cardId)?.group).filter((g): g is string => !!g));
  const room = dueRows.length >= PAUSE_NEW_AT_DUE ? 0 : Math.max(0, NEW_PER_DAY - metToday.length);

  const fresh = db
    .select({ cardId: cards.id, english: cards.english })
    .from(cards)
    .innerJoin(lessons, eq(lessons.id, cards.lessonId))
    .leftJoin(
      cardStates,
      and(
        eq(cardStates.cardId, cards.id),
        eq(cardStates.direction, "recognition"),
        eq(cardStates.profileId, profileId),
      ),
    )
    .where(and(wordsDeck(), isNull(cardStates.cardId), notSuspended(profileId)))
    .orderBy(asc(cards.id))
    .all()
    .filter((r) => lemmaForCard(r.cardId)?.gloss);

  /* Only the first stage that still has words to teach. */
  const firstStage = fresh.length ? lemmaForCard(fresh[0].cardId)!.stage : null;
  const candidates = fresh
    .filter((r) => lemmaForCard(r.cardId)!.stage === firstStage)
    .map((r) => ({ cardId: r.cardId, group: lemmaForCard(r.cardId)!.group }));
  const picked = room > 0 ? pickNewCards(candidates, room, groupsToday) : [];

  /* A stage is introduced by the session that brings its first word. */
  const states = recognitionStates(db, profileId);
  const introducedStages = new Set(states.map((s) => lemmaForCard(s.cardId)?.stage));
  const newCards = picked.map((id) => lemmaForCard(id)!).filter(Boolean);
  const intros = [...new Set(newCards.map((l) => l.stage))]
    .filter((s) => !introducedStages.has(s))
    .map((s) => stageFor(s)!)
    .filter(Boolean);

  /* The distractor pool: every word of the track, with whether it is learned. */
  const learned = new Set(states.filter((s) => s.repetitions >= KNOWN_REPS).map((s) => s.cardId));
  const pool: MeaningOption[] = WORDS.lemmas
    .filter((l) => l.gloss)
    .map((l) => ({ cardId: l.cardId, english: l.gloss!.text, stage: l.stage, group: l.group, learned: learned.has(l.cardId) }));

  const toQuestion = (cardId: number, isNew: boolean): WordQuestion | null => {
    const lemma = lemmaForCard(cardId);
    if (!lemma || !lemma.gloss) return null;
    const item = pool.find((p) => p.cardId === cardId)!;
    const wrong = pickMeaningDistractors(item, pool, 3, random);
    const options = shuffle(
      [{ cardId, english: lemma.gloss.text }, ...wrong.map((w) => ({ cardId: w.cardId, english: w.english }))],
      random,
    );
    return { cardId, lemma, english: lemma.gloss.text, isNew, options };
  };

  const questions = [
    ...shuffle(dueRows.map((r) => toQuestion(r.cardId, false)), random),
    ...shuffle(picked.map((id) => toQuestion(id, true)), random),
  ].filter((q): q is WordQuestion => q !== null);

  return { intros, newCards, questions, reviews: dueRows.length };
}
