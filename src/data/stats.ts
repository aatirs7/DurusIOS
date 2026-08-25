import { and, eq, gte, sql } from "drizzle-orm";

import { MATURE_DAYS, maturityOf, type Maturity } from "@/engine/constants";
import { dayKey } from "@/lib/time";

import type { Db } from "./client";
import { cardStates, cards, lessons, reviews } from "./schema";
import { getSettingsFor } from "./settings";

export type Leech = {
  cardId: number;
  arabic: string;
  english: string;
  lapses: number;
  lessonNumber: number;
  suspended: boolean;
};

export type Stats = {
  medianMs: number | null;
  bestMs: number | null;
  perDay: { day: string; count: number }[];
  maturity: Record<Maturity, number>;
  leeches: Leech[];
};

/*
  percentile_cont does not exist in SQLite, so the median is computed here.

  It INTERPOLATES between the two middle values, which is what percentile_cont
  does. The obvious alternative - ORDER BY ... LIMIT 1 OFFSET (n-1)/2 - takes
  the lower of the two instead, so every even sized sample would differ from the
  web app by a few milliseconds and read as a port bug.
*/
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length / 2;
  return s.length % 2 ? s[Math.floor(mid)] : (s[mid - 1] + s[mid]) / 2;
}

const DAY_MS = 86_400_000;

export function getStats(db: Db, profileId: number, now = new Date()): Stats {
  const config = getSettingsFor(db, profileId);
  const tz = config.timezone;
  const since30 = new Date(now.getTime() - 30 * DAY_MS);
  const since7 = new Date(now.getTime() - 7 * DAY_MS);

  /*
    One read for both medians and the sparkline. The web version runs three
    queries and buckets days in SQL; doing it once here also fixes a real bug it
    has, where date_trunc ran in the database session's timezone (UTC) while
    fillDays bucketed with toISOString(), so an 8pm New York review landed on
    different days in the two halves.

    Every query in this file filters on profileId. The web version does not -
    not on reviews, not on cardStates, not on leeches - which is invisible while
    only one profile exists and is a data leak the moment a second one does.
  */
  const rows = db
    .select({
      reviewedAt: reviews.reviewedAt,
      msToAnswer: reviews.msToAnswer,
      direction: reviews.direction,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.profileId, profileId),
        gte(reviews.reviewedAt, since30),
        sql`${reviews.retractedAt} is null`,
      ),
    )
    .all();

  const recognition = rows.filter((r) => r.direction === "recognition");

  const medianMs = median(
    recognition.filter((r) => r.reviewedAt >= since7).map((r) => r.msToAnswer),
  );

  /* The best is the best single DAY median, not the best single answer. One
     lucky fast card is not a personal best. */
  const byDay = new Map<string, number[]>();
  for (const r of recognition) {
    const k = dayKey(r.reviewedAt, tz);
    const list = byDay.get(k);
    if (list) list.push(r.msToAnswer);
    else byDay.set(k, [r.msToAnswer]);
  }
  let bestMs: number | null = null;
  for (const list of byDay.values()) {
    const m = median(list);
    if (m !== null && (bestMs === null || m < bestMs)) bestMs = m;
  }

  /* Every answer counts toward the daily total, including speed runs. */
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = dayKey(r.reviewedAt, tz);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const perDay: { day: string; count: number }[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const k = dayKey(new Date(now.getTime() - i * DAY_MS), tz);
    perDay.push({ day: k, count: counts.get(k) ?? 0 });
  }

  /*
    Maturity over every card in the open lessons, so cards never seen are
    counted rather than missing. A left join leaves intervalDays null for those,
    and maturityOf reads null as unseen.
  */
  const stateRows = db
    .select({ intervalDays: cardStates.intervalDays })
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
    .where(sql`${lessons.number} <= ${config.currentLesson}`)
    .all();

  const maturity: Record<Maturity, number> = { unseen: 0, learning: 0, mature: 0 };
  for (const r of stateRows) maturity[maturityOf(r.intervalDays)] += 1;

  /* Words that keep coming back. Ordered worst first. */
  const leechRows = db
    .select({
      cardId: cards.id,
      arabic: cards.arabic,
      english: cards.english,
      lapses: cardStates.lapses,
      lessonNumber: lessons.number,
      suspended: sql<number>`exists (
        select 1 from card_suspensions cs
         where cs.profile_id = ${profileId}
           and cs.card_id = ${cards.id}
           and cs.deleted_at is null
      )`,
    })
    .from(cardStates)
    .innerJoin(cards, eq(cardStates.cardId, cards.id))
    .innerJoin(lessons, eq(cards.lessonId, lessons.id))
    .where(and(eq(cardStates.profileId, profileId), sql`${cardStates.lapses} >= 3`))
    .orderBy(sql`${cardStates.lapses} desc`)
    .limit(10)
    .all();

  return {
    medianMs,
    bestMs,
    perDay,
    maturity,
    leeches: leechRows.map((r) => ({ ...r, suspended: Boolean(r.suspended) })),
  };
}

export { MATURE_DAYS };
