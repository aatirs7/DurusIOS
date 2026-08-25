import { eq, sql } from "drizzle-orm";

import type { ParsedCard } from "@/engine/parseCards";

import type { Db } from "./client";
import { cards, lessons } from "./schema";

export type PasteResult = { inserted: number; skipped: number };

/*
  Adds hand pasted cards to a lesson.

  Content ids are normally the server's (see schema.ts), and these are not: they
  are minted locally from max(id)+1. That is a deliberate, bounded exception for
  an authoring tool used by one person on one device, and it is why the paste
  screen is buried in Settings rather than offered as a feature.

  When sync lands this needs revisiting: a locally minted id can collide with a
  server assigned one. The fix at that point is to POST the card and take the id
  back, which is also why this returns a count rather than the rows - nothing
  downstream should start depending on the ids it produced.
*/
export function addPastedCards(
  db: Db,
  lessonNumber: number,
  parsed: readonly ParsedCard[],
): PasteResult {
  const lesson = db
    .select({ id: lessons.id })
    .from(lessons)
    .where(eq(lessons.number, lessonNumber))
    .get();

  if (!lesson) return { inserted: 0, skipped: 0 };

  return db.transaction((tx) => {
    const row = tx
      .select({ maxId: sql<number>`coalesce(max(${cards.id}), 0)`.mapWith(Number) })
      .from(cards)
      .get();
    let nextId = (row?.maxId ?? 0) + 1;

    const before = tx
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(cards)
      .get();

    for (const c of parsed) {
      tx.insert(cards)
        .values({
          id: nextId,
          lessonId: lesson.id,
          type: c.type,
          arabic: c.arabic,
          english: c.english,
          transliteration: c.transliteration ?? null,
          gender: c.gender ?? null,
          plural: c.plural ?? null,
          note: c.note ?? null,
          createdAt: new Date(),
        })
        /* uniqueIndex(lessonId, arabic): pasting the same block twice must not
           double the deck. A skipped row still consumes its id, which is
           harmless and keeps the loop simple. */
        .onConflictDoNothing()
        .run();
      nextId += 1;
    }

    const after = tx
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(cards)
      .get();

    const inserted = (after?.n ?? 0) - (before?.n ?? 0);
    return { inserted, skipped: parsed.length - inserted };
  });
}
