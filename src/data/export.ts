import { eq } from "drizzle-orm";

import type { Db } from "./client";
import {
  cardHearts,
  cardStates,
  cardSuspensions,
  cards,
  lessons,
  profiles,
  reviews,
  settings,
} from "./schema";

/*
  Everything this profile has answered, as one JSON blob. No filtering, no
  pagination.

  Lessons and cards are included because a review referencing a card id is
  meaningless without them - the ids are the server's, but an export should be
  readable on its own rather than only against a matching database.
*/
export function exportAll(db: Db, profileId: number) {
  return {
    exportedAt: new Date().toISOString(),
    schemaRevision: 1,
    profile: db.select().from(profiles).where(eq(profiles.id, profileId)).get() ?? null,
    settings: db.select().from(settings).where(eq(settings.profileId, profileId)).get() ?? null,
    lessons: db.select().from(lessons).all(),
    cards: db.select().from(cards).all(),
    cardStates: db.select().from(cardStates).where(eq(cardStates.profileId, profileId)).all(),
    reviews: db.select().from(reviews).where(eq(reviews.profileId, profileId)).all(),
    cardHearts: db.select().from(cardHearts).where(eq(cardHearts.profileId, profileId)).all(),
    cardSuspensions: db
      .select()
      .from(cardSuspensions)
      .where(eq(cardSuspensions.profileId, profileId))
      .all(),
  };
}
