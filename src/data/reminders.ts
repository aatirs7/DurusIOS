import { applyReminders, planReminders } from "@/lib/notifications";

import type { Db } from "./client";
import { getSettingsFor } from "./settings";

/*
  Lays down the repeating reminders described by the current settings.

  Called when the settings change, and on foreground as a cheap way of healing
  a device whose scheduled set was cleared by the OS. It no longer consults the
  schedule: a reminder is a time the user picked to study, not a report on the
  queue, so there is nothing to ask the database and the triggers repeat on
  their own. See planReminders for why that condition went away.
*/
export async function syncReminders(db: Db, profileId: number) {
  const config = getSettingsFor(db, profileId);

  return applyReminders(
    planReminders({
      remindersOn: config.remindersOn,
      reminderHour: config.reminderHour,
      secondReminderOn: config.secondReminderOn,
      reminderHour2: config.reminderHour2,
      classDayReminder: config.classDayReminder,
      currentLesson: config.currentLesson,
    }),
  );
}
