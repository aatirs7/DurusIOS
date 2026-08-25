import { Platform } from "react-native";

import { activeSlots } from "@/engine/reminders";

/*
  Local notifications only. No push, no VAPID, no server, no cron.

  Loaded lazily and defensively so a JS-only OTA update landing on a binary that
  predates the dependency degrades to "not scheduled" rather than crashing
  Settings. That is not hypothetical here: this whole module ships over the air.
*/
type NotificationsModule = typeof import("expo-notifications");
let cached: NotificationsModule | null | undefined;

function load(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("expo-notifications") as NotificationsModule;
  } catch {
    cached = null;
  }
  return cached;
}

export function remindersAvailable(): boolean {
  return load() !== null;
}

/*
  Permission is requested ONLY from an explicit toggle, never on screen entry.
  iOS gives exactly one chance, and spending it on a screen the user was merely
  passing through means the reminder can never be offered again.
*/
export async function requestPermission(): Promise<boolean> {
  const N = load();
  if (!N) return false;
  try {
    const existing = await N.getPermissionsAsync();
    if (existing.granted) return true;
    if (!existing.canAskAgain) return false;
    return (await N.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

const CHANNEL = "reminders";

async function ensureChannel(N: NotificationsModule) {
  if (Platform.OS !== "android") return;
  try {
    await N.setNotificationChannelAsync(CHANNEL, {
      name: "Reminders",
      importance: N.AndroidImportance.DEFAULT,
      sound: null,
    });
  } catch {
    /* An unavailable channel must not stop the iOS path. */
  }
}

/* How far ahead the rolling window reaches. */
const HORIZON_DAYS = 7;
const WEDNESDAY = 3;

export type SlotPlan = {
  /* Epoch ms of the moment this reminder should fire. */
  at: number;
  body: string;
  classNudge: boolean;
};

/*
  Only the fields the plan actually reads. Deliberately NOT engine
  ReminderConfig: that type still carries lastNotifiedOn and lastNotifiedHour,
  which the rolling window design dropped - the notification identifiers are the
  dedupe now, so there is no "was this slot served" to record.
*/
export type ReminderSettings = {
  remindersOn: boolean;
  reminderHour: number;
  secondReminderOn: boolean;
  reminderHour2: number;
  classDayReminder: boolean;
  currentLesson: number;
};

/*
  Works out which of the next seven days' slots deserve a notification.

  SchedulableTriggerInputTypes.DAILY fires unconditionally - it cannot consult
  the due count - so instead of one repeating trigger this schedules a rolling
  window of one-shot triggers and re-plans after every session and every
  foreground. The silence is the feature, and a daily trigger cannot be silent.

  Pure, so it is testable without the native module: it takes the clock and a
  function that says how many cards are due by a given moment.
*/
export function planReminders(
  config: ReminderSettings,
  now: Date,
  dueBy: (at: Date) => number,
): SlotPlan[] {
  if (!config.remindersOn) return [];

  const slots = activeSlots({ ...config, lastNotifiedOn: null, lastNotifiedHour: null });
  if (slots.length === 0) return [];

  const plans: SlotPlan[] = [];

  for (let day = 0; day < HORIZON_DAYS; day += 1) {
    const base = new Date(now);
    base.setDate(base.getDate() + day);

    const isClassDay = base.getDay() === WEDNESDAY;

    slots.forEach((hour, i) => {
      const at = new Date(base);
      at.setHours(hour, 0, 0, 0);
      if (at.getTime() <= now.getTime()) return;

      /*
        The Wednesday nudge replaces the FIRST slot of the day only, and it
        fires regardless of due count - it is about the class, not the queue.
      */
      const classNudge = isClassDay && config.classDayReminder && i === 0;
      if (classNudge) {
        plans.push({
          at: at.getTime(),
          body: `Add today's words from Lesson ${config.currentLesson}`,
          classNudge: true,
        });
        return;
      }

      /*
        Silence when nothing is due. reviewsInLastFourHours cannot be predicted
        from here, which is why the whole plan is rebuilt at the end of every
        session - finishing one naturally drops the next slot.
      */
      const due = dueBy(at);
      if (due <= 0) return;

      plans.push({
        at: at.getTime(),
        body: due === 1 ? "1 word is due" : `${due} words are due`,
        classNudge: false,
      });
    });
  }

  return plans;
}

const PREFIX = "durus-slot-";

/*
  Cancels everything and lays down the new window. Cancel-all rather than a
  diff: the identifiers are ours, the set is at most fourteen, and reconciling
  two lists is how a reminder ends up scheduled twice.
*/
export async function applyReminders(plans: SlotPlan[]): Promise<boolean> {
  const N = load();
  if (!N) return false;

  try {
    await N.cancelAllScheduledNotificationsAsync();
    if (plans.length === 0) return true;

    await ensureChannel(N);

    for (const plan of plans) {
      await N.scheduleNotificationAsync({
        identifier: `${PREFIX}${plan.at}`,
        content: {
          title: "Durus",
          body: plan.body,
          /* Copy rules: no exclamation, no superlative, second person, no
             praise. And no sound - this is a nudge, not an alarm. */
          sound: false,
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes.DATE,
          date: new Date(plan.at),
          channelId: Platform.OS === "android" ? CHANNEL : undefined,
        },
      });
    }
    return true;
  } catch {
    return false;
  }
}

export async function cancelAllReminders(): Promise<void> {
  const N = load();
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
  } catch {
    /* Nothing useful to do; the next successful reschedule clears these. */
  }
}

/* Settings' "Send a test reminder", five seconds out. More useful than the
   web's "Test push" button, which only proved the server could reach you. */
export async function sendTestReminder(): Promise<boolean> {
  const N = load();
  if (!N) return false;
  if (!(await requestPermission())) return false;
  try {
    await ensureChannel(N);
    await N.scheduleNotificationAsync({
      content: { title: "Durus", body: "This is what a reminder looks like.", sound: false },
      trigger: {
        type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        channelId: Platform.OS === "android" ? CHANNEL : undefined,
      },
    });
    return true;
  } catch {
    return false;
  }
}
