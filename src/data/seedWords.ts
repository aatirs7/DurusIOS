import { sql } from "drizzle-orm";

import type { Db } from "./client";
import { cards, lessons, meta } from "./schema";
import { WORDS } from "./wordsContent";

const WORDS_VERSION_KEY = "wordsContentVersion";
const CHUNK = 100;

export type SeedWordsResult = { ran: boolean; lessons: number; cards: number };

/*
  Seeds the Quranic Words track: one lesson row per stage (deck "words") and
  one card row per lemma, under the fixed ids in the content file.

  The same shape as seedContent and the numbers trainer: stages are lessons,
  items are cards, one scheduler, one fold. Its own meta key, so a book content
  bump and a words content bump never gate each other.

  Synchronous, one transaction, inside the boot gate. Idempotent: the meta
  guard skips it once applied, lessons upsert on id, and cards upsert on id
  (the lemma's frequency rank), so re-cutting the stages moves a card to its
  new lesson and keeps its history. A content update that swaps two faces
  within one stage could trip uniqueIndex(lessonId, arabic); the boot gate
  catches that and the track stays on its previous content.

  Creates no card_states: a card with no state is new, so words arrive through
  the picker, not all at once.

  Parsing skills are NOT card rows. They are taught by the stage intro and
  recorded by stage, because a skill card would need a written explanation to
  drill and none is verified yet (see the report in the relay).
*/
export function seedWords(db: Db): SeedWordsResult {
  const current = db
    .select({ value: meta.value })
    .from(meta)
    .where(sql`${meta.key} = ${WORDS_VERSION_KEY}`)
    .get();

  if (current && Number(current.value) >= WORDS.version) {
    return { ran: false, lessons: 0, cards: 0 };
  }

  db.transaction((tx) => {
    for (const st of WORDS.stages) {
      const row = {
        id: st.lessonId,
        number: st.number,
        /* No Arabic title is written for these stages; the column needs a value. */
        titleAr: "",
        titleEn: st.titleEn,
        grammarNote: null,
        deck: "words" as const,
      };
      tx.insert(lessons)
        .values(row)
        .onConflictDoUpdate({
          target: lessons.id,
          set: { number: row.number, titleEn: row.titleEn, deck: row.deck },
        })
        .run();
    }

    const lessonIdOf = new Map(WORDS.stages.map((s) => [s.stage, s.lessonId]));
    const rows = [...WORDS.lemmas]
      .sort((a, b) => a.cardId - b.cardId)
      .map((l) => ({
        id: l.cardId,
        lessonId: lessonIdOf.get(l.stage)!,
        type: "vocab" as const,
        arabic: l.face,
        english: l.gloss?.text ?? "",
        transliteration: null,
        gender: null,
        plural: null,
        note: null,
        createdAt: new Date(),
      }));

    for (let i = 0; i < rows.length; i += CHUNK) {
      tx.insert(cards)
        .values(rows.slice(i, i + CHUNK))
        .onConflictDoUpdate({
          target: cards.id,
          set: {
            lessonId: sql`excluded.lesson_id`,
            arabic: sql`excluded.arabic`,
            english: sql`excluded.english`,
          },
        })
        .run();
    }

    tx.insert(meta)
      .values({ key: WORDS_VERSION_KEY, value: String(WORDS.version) })
      .onConflictDoUpdate({ target: meta.key, set: { value: String(WORDS.version) } })
      .run();
  });

  return { ran: true, lessons: WORDS.stages.length, cards: WORDS.lemmas.length };
}
