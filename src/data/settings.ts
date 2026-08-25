import { eq } from "drizzle-orm";

import type { Db } from "./client";
import { settings, type Settings } from "./schema";

/*
  Settings for one profile, created on demand.

  The web version's getSettingsFor had the same insert-if-missing fallback, and
  it is kept for the same reason: a profile without a settings row is a state
  the app can reach (a partial sign-in, a restore) and every caller downstream
  assumes the row exists.
*/
export function getSettingsFor(db: Db, profileId: number): Settings {
  const found = db.select().from(settings).where(eq(settings.profileId, profileId)).get();
  if (found) return found;

  db.insert(settings).values({ profileId }).onConflictDoNothing().run();
  return db.select().from(settings).where(eq(settings.profileId, profileId)).get()!;
}

/*
  Writes a patch and stamps per-field timestamps.

  Per-field rather than whole row, because tightenSpeedWindow writes
  speedWindowMs automatically at the end of every speed run. With whole row last
  write wins, changing currentLesson on one device and then running a speed
  drill on another silently reverts the lesson change - which the user
  experiences as "the app forgot which lesson I'm on", a spec section 1.1 point
  4 failure that is near impossible to diagnose from a bug report.

  currentLesson and currentLessonSince are stamped together on purpose: the
  second is restamped whenever the first moves, and splitting them would let a
  merge disable the interval cap.
*/
export function updateSettings(
  db: Db,
  profileId: number,
  patch: Partial<Omit<Settings, "profileId" | "updatedAt" | "fieldUpdatedAt" | "dirty">>,
  now = new Date(),
): Settings {
  const before = getSettingsFor(db, profileId);
  const stamps = { ...(before.fieldUpdatedAt ?? {}) };
  const at = now.getTime();

  for (const key of Object.keys(patch)) {
    stamps[key === "currentLessonSince" ? "currentLesson" : key] = at;
  }

  const next = { ...patch };
  if (patch.currentLesson !== undefined && patch.currentLesson !== before.currentLesson) {
    next.currentLessonSince = now;
  }

  db.update(settings)
    .set({ ...next, updatedAt: now, fieldUpdatedAt: stamps, dirty: true })
    .where(eq(settings.profileId, profileId))
    .run();

  return db.select().from(settings).where(eq(settings.profileId, profileId)).get()!;
}
