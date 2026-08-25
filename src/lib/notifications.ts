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
  Show reminders even when Durus is the app in front.

  iOS delivers a notification to a foregrounded app silently and hands it to the
  delegate instead of drawing a banner. Without a handler saying otherwise,
  "Send a test reminder" appeared to do nothing at all unless the phone was
  locked first - which is why the button had to tell people to lock their phone,
  a thing no other app asks. Every OS-level setting still applies on top of
  this; it only declines the silent-while-foregrounded default.

  Registered lazily on first use rather than at import, so a JS-only update
  landing on a binary that predates expo-notifications still degrades to "not
  scheduled" rather than crashing at module scope.
*/
let handlerSet = false;
function ensureHandler(N: NotificationsModule) {
  if (handlerSet) return;
  handlerSet = true;
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        /* No sound and no badge, the same as the scheduled ones. A reminder is
           a nudge, not an alarm, and a badge is a count the app would then be
           editorialising with. */
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {
    /* An older expo-notifications with a different handler shape must not stop
       anything being scheduled. */
  }
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
  ensureHandler(N);
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

const WEDNESDAY = 3;

export type SlotPlan = {
  /* Hour of the day, 0-23, in the device's own local time. */
  hour: number;
  body: string;
  /* Set only for the weekly class nudge; absent means every day. */
  weekday?: number;
};

/*
  Only the fields the plan actually reads. Deliberately NOT engine
  ReminderConfig: that type still carries lastNotifiedOn and lastNotifiedHour,
  which belonged to a design where the app decided each morning whether a slot
  had earned a notification. It no longer makes that judgement.
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
  Turns the settings into a small set of repeating triggers.

  A reminder is a time the user picked to sit down and study, not a report on
  the queue. An earlier version consulted the due count and stayed silent on a
  clear day, which meant scheduling a rolling window of one-shot triggers and
  re-planning after every session, because a DAILY trigger cannot ask a
  question. Dropping the condition drops all of that: two repeating triggers
  survive being offline, being force quit, and being left alone for a month, and
  none of it depends on the app having run recently.

  Pure, so it is testable without the native module.
*/
export function planReminders(config: ReminderSettings): SlotPlan[] {
  if (!config.remindersOn) return [];

  const slots = activeSlots({ ...config, lastNotifiedOn: null, lastNotifiedHour: null });

  const plans: SlotPlan[] = slots.map((hour) => ({
    hour,
    /* Copy rules: no exclamation, no superlative, second person, no praise and
       no count - a number here would be a claim about the queue, which is the
       thing this no longer knows. */
    body: "Time to revise.",
  }));

  /*
    The class nudge is a different kind of thing: weekly, tied to the lesson
    rather than the schedule, and it says what to do rather than that it is
    time. It rides at the first slot's hour so it never arrives at an hour the
    user did not choose.
  */
  if (config.classDayReminder) {
    plans.push({
      hour: slots[0] ?? config.reminderHour,
      weekday: WEDNESDAY,
      body: `Add today's words from Lesson ${config.currentLesson}`,
    });
  }

  return plans;
}

const PREFIX = "durus-slot-";

/*
  Cancels everything and lays down the new set. Cancel-all rather than a diff:
  the identifiers are ours, the set is at most three, and reconciling two lists
  is how a reminder ends up scheduled twice.

  These are REPEATING triggers, so this does not need to be called again on a
  schedule - only when the settings themselves change.
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
        identifier: `${PREFIX}${plan.weekday ?? "d"}-${plan.hour}`,
        content: {
          title: "Durus",
          body: plan.body,
          /* No sound - this is a nudge, not an alarm. */
          sound: false,
        },
        trigger:
          plan.weekday === undefined
            ? {
                type: N.SchedulableTriggerInputTypes.DAILY,
                hour: plan.hour,
                minute: 0,
                channelId: Platform.OS === "android" ? CHANNEL : undefined,
              }
            : {
                type: N.SchedulableTriggerInputTypes.WEEKLY,
                /* expo-notifications counts weekdays from 1 = Sunday, while
                   Date#getDay counts from 0. WEDNESDAY is the getDay value. */
                weekday: plan.weekday + 1,
                hour: plan.hour,
                minute: 0,
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

/*
  Settings' "Send a test reminder", five seconds out. More useful than the web's
  "Test push" button, which only proved the server could reach you.

  Five seconds rather than immediately: a notification that arrives while the
  thumb is still on the button is easy to miss, and the delay also demonstrates
  that these are scheduled rather than sent.
*/
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
