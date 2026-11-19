import { and, eq, isNull, sql } from "drizzle-orm";

import { cards, lessons, reviews } from "@/data/schema";

/*
  Which reviews are waiting to be sent.

  WORDS_DECK_SYNCS holds the Quranic Words track's reviews back. Its cards
  exist only on the device until the web repo seeds them into Neon under the
  same ids; until then the server answers each one "unknown_card", the device
  marks it syncError, and a row marked that way is never sent again - so
  sending early would lose those reviews from the server for good. Held back
  instead, they stay unsynced and go up on the first sync after this flips to
  true, in the content update that ships with the server seed.
*/
export const WORDS_DECK_SYNCS = true;

export function outboxWhere(profileId: number, wordsSync = WORDS_DECK_SYNCS) {
  return and(
    eq(reviews.profileId, profileId),
    isNull(reviews.syncedAt),
    isNull(reviews.syncError),
    wordsSync
      ? undefined
      : sql`${reviews.cardId} not in (select ${cards.id} from ${cards} inner join ${lessons} on ${lessons.id} = ${cards.lessonId} where ${lessons.deck} = 'words')`,
  );
}
