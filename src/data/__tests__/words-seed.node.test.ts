import Database from "better-sqlite3";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";

import { outboxWhere } from "@/sync/outbox";

import type { Db } from "../client";
import { submitGrade } from "../review";
import * as schema from "../schema";
import { cardStates, cards, lessons, profiles, reviews } from "../schema";
import { seedContent } from "../seed";
import { seedWords } from "../seedWords";
import { buildWordsSession, NEW_PER_DAY, wordsProgress } from "../words";
import { PATH_CARD_IDS, WORDS, lemmaForCard } from "../wordsContent";

/*
  The populated-database rehearsal for the Quranic Words seed.

  The real generated migrations, the real book seed, then a learner with
  history (reviews, card states), and only THEN the words seed, twice. What
  existed before must come through byte for byte, because on a phone this
  runs inside the boot gate on a database full of somebody's progress.
*/

/* Varies on every call, so minted client ids never collide. */
let seed = 0.137;
const rng = () => (seed = (seed * 9301 + 0.49297) % 1);

function freshDb(): Db {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(__dirname, "..", "..", "..", "drizzle") });
  sqlite.pragma("foreign_keys = ON");
  return db as unknown as Db;
}

function populated() {
  const db = freshDb();
  seedContent(db);
  const profileId = db.insert(profiles).values({ name: "Learner" }).returning({ id: profiles.id }).get().id;
  const bookCards = db.select({ id: cards.id }).from(cards).orderBy(asc(cards.id)).limit(6).all();
  const when = new Date("2026-11-01T09:00:00Z");
  for (const [i, c] of bookCards.entries()) {
    submitGrade(db, profileId, "device-a", { cardId: c.id, direction: "recognition", grade: i % 2 ? "good" : "again", msToAnswer: 3000 }, { now: when, random: rng });
  }
  return { db, profileId };
}

function dump(db: Db) {
  return {
    lessons: db.select().from(lessons).orderBy(asc(lessons.id)).all(),
    cards: db.select().from(cards).orderBy(asc(cards.id)).all(),
    states: db.select().from(cardStates).all(),
    reviews: db.select().from(reviews).orderBy(asc(reviews.id)).all(),
  };
}

describe("seeding the Quranic Words track onto a populated database", () => {
  it("adds the track and leaves everything already there untouched", () => {
    const { db } = populated();
    const before = dump(db);

    expect(seedWords(db).ran).toBe(true);
    const after = dump(db);

    expect(after.lessons.filter((l) => l.deck !== "words")).toEqual(before.lessons);
    expect(after.cards.filter((c) => c.id < 100000).map(({ createdAt: _c, ...c }) => c)).toEqual(
      before.cards.map(({ createdAt: _c, ...c }) => c),
    );
    expect(after.states).toEqual(before.states);
    expect(after.reviews).toEqual(before.reviews);

    expect(after.lessons.filter((l) => l.deck === "words")).toHaveLength(WORDS.stages.length);
    expect(after.cards.filter((c) => c.id >= 100000)).toHaveLength(WORDS.lemmas.length);
  });

  it("is a no-op the second time", () => {
    const { db } = populated();
    seedWords(db);
    const once = dump(db);
    expect(seedWords(db).ran).toBe(false);
    expect(dump(db)).toEqual(once);
  });

  it("keeps words stages out of the book and numbers ranges", () => {
    const { db } = populated();
    seedWords(db);
    const rows = db.select().from(lessons).where(eq(lessons.deck, "words")).all();
    expect(rows.every((l) => l.number >= 200 && l.id >= 1000)).toBe(true);
  });
});

describe("a words session", () => {
  const now = new Date(2026, 10, 19, 10, 0, 0);

  it("starts with the Al-Fatiha intro and five new words, no two from one group", () => {
    const { db, profileId } = populated();
    seedWords(db);
    const session = buildWordsSession(db, profileId, { now, random: () => 0.3 });

    expect(session.intros.map((s) => s.stage)).toEqual([0]);
    expect(session.newCards).toHaveLength(NEW_PER_DAY);
    expect(session.newCards.every((l) => l.stage === 0)).toBe(true);
    const groups = session.newCards.map((l) => l.group).filter(Boolean);
    expect(new Set(groups).size).toBe(groups.length);

    for (const q of session.questions) {
      expect(q.options.filter((o) => o.cardId === q.cardId)).toHaveLength(1);
      expect(new Set(q.options.map((o) => o.english.trim().toLowerCase())).size).toBe(q.options.length);
      const group = q.lemma.group;
      if (group) {
        expect(q.options.filter((o) => o.cardId !== q.cardId).every((o) => lemmaForCard(o.cardId)?.group !== group)).toBe(true);
      }
    }
  });

  it("brings no more new words the same day once five have been met", () => {
    const { db, profileId } = populated();
    seedWords(db);
    const first = buildWordsSession(db, profileId, { now, random: () => 0.3 });
    for (const q of first.questions) {
      submitGrade(db, profileId, "device-a", { cardId: q.cardId, direction: "recognition", grade: "good", msToAnswer: 3000 }, { now, random: rng });
    }
    const second = buildWordsSession(db, profileId, { now: new Date(now.getTime() + 60_000), random: () => 0.3 });
    expect(second.newCards).toHaveLength(0);
    expect(second.intros).toHaveLength(0);
  });

  it("counts coverage only along a known prefix of the path", () => {
    const { db, profileId } = populated();
    seedWords(db);
    expect(wordsProgress(db, profileId, now).percent).toBe(0);

    const answer = (cardId: number, at: Date) =>
      submitGrade(db, profileId, "device-a", { cardId, direction: "recognition", grade: "good", msToAnswer: 3000 }, { now: at, random: rng });

    /* The first path word, known (two correct recognitions). */
    answer(PATH_CARD_IDS[0], now);
    answer(PATH_CARD_IDS[0], new Date(now.getTime() + 86_400_000));
    const p = wordsProgress(db, profileId, now);
    expect(p.prefix).toBe(1);
    expect(p.percent).toBe(Math.floor((100 * WORDS.path.coverage[1]) / WORDS.totals.words));

    /* A later word known out of order does not move the lower bound. */
    answer(PATH_CARD_IDS[5], now);
    answer(PATH_CARD_IDS[5], new Date(now.getTime() + 86_400_000));
    expect(wordsProgress(db, profileId, now).prefix).toBe(1);
  });
});

describe("the outbox holds the words track back", () => {
  it("sends book reviews and keeps words reviews unsent", () => {
    const { db, profileId } = populated();
    seedWords(db);
    submitGrade(db, profileId, "device-a", { cardId: PATH_CARD_IDS[0], direction: "recognition", grade: "good", msToAnswer: 2000 }, { random: rng });

    const pending = db.select({ cardId: reviews.cardId }).from(reviews).where(outboxWhere(profileId)).all();
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.some((r) => r.cardId === PATH_CARD_IDS[0])).toBe(false);

    const all = db.select({ cardId: reviews.cardId }).from(reviews).where(outboxWhere(profileId, true)).all();
    expect(all.some((r) => r.cardId === PATH_CARD_IDS[0])).toBe(true);
  });
});
