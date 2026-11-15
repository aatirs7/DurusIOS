/*
  What onboarding writes, in one place, with its effects injected.

  Kept pure so the rules are tested without native SQLite, Clerk or
  notifications:
  - Nothing is written before sign in. The screen only calls this from finish(),
    which runs after sign in succeeds or when a keychain session skips it.
  - The removed questions (class or self, book, lesson, pace) become the self
    path's defaults: Book 1, Lesson 1, 10 new words a day, no class nudge.
  - Reminders are only scheduled if permission was granted when the reminders
    step was left.
*/

export type OnboardingAnswers = {
  /* Surah numbers marked memorized in the hifz step. */
  hifz: number[];
  adhkar: boolean;
  review: boolean;
  /* The permission answer, captured when the reminders step was left. */
  notify: boolean;
};

export type SettingsPatch = {
  currentBook: number;
  currentLesson: number;
  newPerDay: number;
  classDayReminder: boolean;
  remindersOn: boolean;
  reminderHour: number;
  secondReminderOn: boolean;
};

export type SaveEffects = {
  updateSettings: (patch: SettingsPatch) => void;
  setAdhkarReminder: (on: boolean) => void;
  markSurahs: (surahs: number[]) => void;
  syncReminders: () => Promise<unknown>;
};

export const ONBOARDING_DEFAULTS = {
  currentBook: 1,
  currentLesson: 1,
  newPerDay: 10,
  classDayReminder: false,
} as const;

export const REVIEW_HOUR = 9;

export async function saveOnboarding(a: OnboardingAnswers, fx: SaveEffects): Promise<void> {
  fx.updateSettings({
    ...ONBOARDING_DEFAULTS,
    remindersOn: a.notify && a.review,
    reminderHour: REVIEW_HOUR,
    secondReminderOn: false,
  });
  fx.setAdhkarReminder(a.notify && a.adhkar);
  if (a.hifz.length > 0) fx.markSurahs(a.hifz);
  if (a.notify && (a.adhkar || a.review)) await fx.syncReminders();
}

/* Where leaving the reminders step goes. A keychain session has nothing to sign in to. */
export function afterReminders(isSignedIn: boolean): "finish" | "signin" {
  return isSignedIn ? "finish" : "signin";
}

/* Permission is only asked if a reminder is on, and only as the reminders step is left. */
export function shouldAskPermission(a: Pick<OnboardingAnswers, "adhkar" | "review">): boolean {
  return a.adhkar || a.review;
}
