import { and, eq, lte, sql } from "drizzle-orm";

import { applyReminders, planReminders } from "@/lib/notifications";

import type { Db } from "./client";
import { cardStates, cardSuspensions } from "./schema";
import { getSettingsFor } from "./settings";

/*
  Rebuilds the rolling notification window from the current schedule.

  Called after every session and on every foreground, not on a timer. A slot is
  only worth a notification if something is actually due by then, and the only
  way to know that is to ask the schedule - which is exactly what
  SchedulableTriggerInputTypes.DAILY cannot do.

  Rebuilding after a session is also what implements "do not nudge someone who
  has just finished": the next slot simply has nothing due by it any more, so it
  drops out of the plan on its own rather than needing a four hour rule.
*/
export async function syncReminders(db: Db, profileId: number, now = new Date()) {
  const config = getSettingsFor(db, profileId);

  const dueBy = (at: Date) => {
    const row = db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(cardStates)
      .where(
        and(
          eq(cardStates.profileId, profileId),
          lte(cardStates.dueAt, at),
          sql`not exists (
            select 1 from ${cardSuspensions}
             where ${cardSuspensions.profileId} = ${profileId}
               and ${cardSuspensions.cardId} = ${cardStates.cardId}
               and ${cardSuspensions.deletedAt} is null
          )`,
        ),
      )
      .get();
    return row?.count ?? 0;
  };

  const plans = planReminders(
    {
      remindersOn: config.remindersOn,
      reminderHour: config.reminderHour,
      secondReminderOn: config.secondReminderOn,
      reminderHour2: config.reminderHour2,
      classDayReminder: config.classDayReminder,
      currentLesson: config.currentLesson,
    },
    now,
    dueBy,
  );

  return applyReminders(plans);
}
