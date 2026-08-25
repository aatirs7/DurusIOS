/*
  When a reminder is allowed to go out.

  Pure, and separated from the cron route, because this is the kind of
  logic that fails silently. A gate that is slightly wrong does not
  throw, it just sends nothing for a week, or sends twice on the day the
  clocks change, and neither shows up in a log you are reading.
*/

export type ReminderConfig = {
  remindersOn: boolean;
  reminderHour: number;
  secondReminderOn: boolean;
  reminderHour2: number;
  classDayReminder: boolean;
  lastNotifiedOn: string | null;
  lastNotifiedHour: number | null;
};

export type LocalNow = {
  /* ISO date in the account's own timezone, never UTC. */
  date: string;
  hour: number;
  /* 0 is Sunday, so Wednesday is 3. */
  weekday: number;
};

export type Decision = {
  send: boolean;
  /* The Wednesday nudge replaces the first reminder of the day. */
  classNudge: boolean;
  /* Empty when it sends. Returned rather than logged, so the cron
     response says why it stayed quiet. */
  reasons: string[];
  slots: number[];
};

/*
  Deduplicated and sorted, so setting both hours to the same value gives
  one reminder rather than two identical ones, and "first slot of the
  day" means the earlier clock hour rather than whichever field it came
  from.
*/
export function activeSlots(config: ReminderConfig): number[] {
  const slots = [
    config.reminderHour,
    ...(config.secondReminderOn ? [config.reminderHour2] : []),
  ];
  return [...new Set(slots)].sort((a, b) => a - b);
}

export function decideReminder(
  config: ReminderConfig,
  now: LocalNow,
  facts: { dueCount: number; reviewsInLastFourHours: number },
): Decision {
  const slots = activeSlots(config);

  /*
    The nudge only replaces the first reminder of the day. Being told to
    add today's words twice would be nagging, and the second slot is
    more useful as an ordinary review reminder.
  */
  const classNudge =
    now.weekday === 3 && config.classDayReminder && now.hour === slots[0];

  const reasons: string[] = [];

  if (!config.remindersOn) reasons.push("reminders are off");
  if (!slots.includes(now.hour)) reasons.push("not a reminder hour");

  // The date alone was enough with one reminder a day. With two, the
  // hour has to be part of it, or the morning send blocks the evening.
  if (
    config.lastNotifiedOn === now.date &&
    config.lastNotifiedHour === now.hour
  ) {
    reasons.push("this slot was already served today");
  }

  // If a session was already done recently, do not tap the shoulder.
  if (facts.reviewsInLastFourHours > 0) {
    reasons.push("a session was completed in the last 4 hours");
  }

  /*
    The class nudge sends regardless of due count. The review reminder
    does not send when there is nothing due, and that silence is the
    reward.
  */
  if (facts.dueCount === 0 && !classNudge) reasons.push("nothing is due");

  return { send: reasons.length === 0, classNudge, reasons, slots };
}
