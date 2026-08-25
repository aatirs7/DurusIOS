import { activeSlots, decideReminder, type ReminderConfig } from "./reminders";

const DAY = "2026-08-24";

const base: ReminderConfig = {
  remindersOn: true,
  reminderHour: 9,
  secondReminderOn: true,
  reminderHour2: 20,
  classDayReminder: true,
  lastNotifiedOn: null,
  lastNotifiedHour: null,
};

/* Monday unless a test says otherwise. Wednesday is 3. */
function at(hour: number, weekday = 1, date = DAY) {
  return { date, hour, weekday };
}

const somethingDue = { dueCount: 5, reviewsInLastFourHours: 0 };
const nothingDue = { dueCount: 0, reviewsInLastFourHours: 0 };

describe("activeSlots", () => {
  it("is both hours, in clock order", () => {
    expect(activeSlots({ ...base, reminderHour: 20, reminderHour2: 9 })).toEqual(
      [9, 20],
    );
  });

  it("drops the second when it is switched off", () => {
    expect(activeSlots({ ...base, secondReminderOn: false })).toEqual([9]);
  });

  it("collapses two identical hours into one slot", () => {
    expect(activeSlots({ ...base, reminderHour2: 9 })).toEqual([9]);
  });
});

describe("decideReminder", () => {
  it("sends at the morning hour", () => {
    expect(decideReminder(base, at(9), somethingDue).send).toBe(true);
  });

  it("sends at the evening hour", () => {
    expect(decideReminder(base, at(20), somethingDue).send).toBe(true);
  });

  it("stays quiet at any other hour", () => {
    expect(decideReminder(base, at(14), somethingDue).send).toBe(false);
  });

  /*
    Regression. With one reminder a day the date alone gated it, so the
    morning send would have blocked the evening one.
  */
  it("lets the evening through after the morning has gone out", () => {
    const config = { ...base, lastNotifiedOn: DAY, lastNotifiedHour: 9 };
    expect(decideReminder(config, at(20), somethingDue).send).toBe(true);
  });

  it("serves each slot once, so a duplicate tick is a no-op", () => {
    const config = { ...base, lastNotifiedOn: DAY, lastNotifiedHour: 9 };
    expect(decideReminder(config, at(9), somethingDue).send).toBe(false);
  });

  it("does not let yesterday's stamp block today", () => {
    const config = {
      ...base,
      lastNotifiedOn: "2026-08-23",
      lastNotifiedHour: 9,
    };
    expect(decideReminder(config, at(9), somethingDue).send).toBe(true);
  });

  it("says nothing when reminders are off", () => {
    const config = { ...base, remindersOn: false };
    expect(decideReminder(config, at(9), somethingDue).send).toBe(false);
  });

  it("says nothing when the evening reminder is switched off", () => {
    const config = { ...base, secondReminderOn: false };
    expect(decideReminder(config, at(20), somethingDue).send).toBe(false);
  });

  it("stays quiet when nothing is due, and that silence is the reward", () => {
    expect(decideReminder(base, at(9), nothingDue).send).toBe(false);
  });

  it("stays quiet within four hours of a session", () => {
    const facts = { dueCount: 5, reviewsInLastFourHours: 2 };
    expect(decideReminder(base, at(20), facts).send).toBe(false);
  });

  it("explains itself rather than just refusing", () => {
    const decision = decideReminder(base, at(14), nothingDue);
    expect(decision.reasons).toContain("not a reminder hour");
    expect(decision.reasons).toContain("nothing is due");
  });
});

describe("the Wednesday class nudge", () => {
  it("replaces the first reminder of the day", () => {
    expect(decideReminder(base, at(9, 3), nothingDue).classNudge).toBe(true);
  });

  it("does not repeat itself in the evening", () => {
    expect(decideReminder(base, at(20, 3), nothingDue).classNudge).toBe(false);
  });

  it("sends even when nothing is due, since class has moved on", () => {
    expect(decideReminder(base, at(9, 3), nothingDue).send).toBe(true);
  });

  it("leaves the evening slot silent when nothing is due", () => {
    expect(decideReminder(base, at(20, 3), nothingDue).send).toBe(false);
  });

  it("follows the earlier clock hour, not the field order", () => {
    // Evening field holds the earlier hour, so 8 is the first slot.
    const config = { ...base, reminderHour: 21, reminderHour2: 8 };
    expect(decideReminder(config, at(8, 3), nothingDue).classNudge).toBe(true);
    expect(decideReminder(config, at(21, 3), nothingDue).classNudge).toBe(false);
  });

  it("is not sent on other days", () => {
    expect(decideReminder(base, at(9, 1), nothingDue).classNudge).toBe(false);
  });
});
