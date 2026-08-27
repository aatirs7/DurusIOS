import { sql } from "drizzle-orm";

import content from "../../assets/content/lessons.json";
import type { Db } from "./client";
import { cards, lessons, meta } from "./schema";

const CONTENT_VERSION_KEY = "contentVersion";

/* Several hundred individual synchronous statements on the JS thread, inside
   the boot gate, is measurable on an SE. Batching is what keeps first launch
   from visibly pausing. */
const CHUNK = 100;

function chunked<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export type SeedResult = { ran: boolean; lessons: number; cards: number };

/*
  Seeds the bundled content into SQLite.

  Runs in the boot gate after migrations have succeeded and foreign keys are
  back on, in ONE synchronous transaction. The callback must stay synchronous:
  the expo-sqlite driver is sync mode, and an async callback returns a promise
  the wrapper commits before it resolves.

  Idempotent twice over: the meta guard skips it entirely once the shipped
  content version has been applied, and the inserts go through
  onConflictDoNothing against uniqueIndex(lessonId, arabic), so a re-seed after
  a content update adds only what is new.

  Lesson rows are upserted on their primary key so a corrected title or grammar
  note rides an app update, but unlockedAt is never touched: it is a per user
  fact and the app never unlocks a lesson on its own.

  Creates NO card_states rows, on purpose. A card with no state is what the
  queue treats as new, so seeded words flow in at newPerDay rather than all
  landing due on day one.
*/
export function seedContent(db: Db): SeedResult {
  const current = db
    .select({ value: meta.value })
    .from(meta)
    .where(sql`${meta.key} = ${CONTENT_VERSION_KEY}`)
    .get();

  if (current && Number(current.value) >= content.version) {
    return { ran: false, lessons: 0, cards: 0 };
  }

  db.transaction((tx) => {
    for (const l of content.lessons) {
      tx.insert(lessons)
        .values({
          id: l.id,
          number: l.number,
          titleAr: l.titleAr,
          titleEn: l.titleEn,
          grammarNote: l.grammarNote,
          /*
            Never allowed to fall back to the column default. That default is
            "book", so a stage lesson seeded without it becomes a book lesson
            and appears in the lessons list.

            Cast because a JSON import widens every string literal to `string`.
            The generator writes the column verbatim out of Postgres, where it
            is an enum, so the value is one of the two by construction.
          */
          deck: l.deck as "book" | "numbers",
        })
        .onConflictDoUpdate({
          target: lessons.id,
          set: {
            number: l.number,
            titleAr: l.titleAr,
            titleEn: l.titleEn,
            grammarNote: l.grammarNote,
            deck: l.deck as "book" | "numbers",
          },
        })
        .run();
    }

    /* Insertion order follows the asset's array order, which follows cards.id,
       which is what makes buildQueue's new-card bucket hand out words in book
       order. Do not re-sort this. */
    for (const batch of chunked(content.cards, CHUNK)) {
      tx.insert(cards)
        .values(
          batch.map((c) => ({
            id: c.id,
            lessonId: c.lessonId,
            type: c.type as "vocab" | "phrase",
            arabic: c.arabic,
            english: c.english,
            transliteration: c.transliteration,
            gender: c.gender as "m" | "f" | null,
            plural: c.plural,
            note: c.note,
            createdAt: new Date(),
          })),
        )
        .onConflictDoNothing()
        .run();
    }

    tx.insert(meta)
      .values({ key: CONTENT_VERSION_KEY, value: String(content.version) })
      .onConflictDoUpdate({
        target: meta.key,
        set: { value: String(content.version) },
      })
      .run();
  });

  return {
    ran: true,
    lessons: content.lessons.length,
    cards: content.cards.length,
  };
}
