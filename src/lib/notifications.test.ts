import { planReminders, type ReminderSettings } from "./notifications";

/*
  A reminder gate that is slightly wrong does not throw. It just goes quiet, and
  nobody notices for a week. That is why planReminders is pure and why this file
  exists.
*/

const base: ReminderSettings = {
  remindersOn: true,
  reminderHour: 9,
  secondReminderOn: true,
  reminderHour2: 20,
  classDayReminder: true,
  currentLesson: 4,
};

/* A Monday, so the Wednesday nudge is two days out rather than today. */
const MONDAY = new Date(2026, 7, 24, 7, 0, 0);
const always = () => 5;
const never = () => 0;

describe("planReminders", () => {
  it("schedules nothing at all when reminders are off", () => {
    expect(planReminders({ ...base, remindersOn: false }, MONDAY, always)).toEqual([]);
  });

  it("stays silent when nothing is due, which is the whole point", () => {
    const plans = planReminders({ ...base, classDayReminder: false }, MONDAY, never);
    expect(plans).toEqual([]);
  });

  it("covers both slots a day across the window", () => {
    const plans = planReminders({ ...base, classDayReminder: false }, MONDAY, always);
    const hours = plans.map((p) => new Date(p.at).getHours());
    expect(new Set(hours)).toEqual(new Set([9, 20]));
  });

  it("collapses two slots set to the same hour into one", () => {
    const plans = planReminders(
      { ...base, reminderHour2: 9, classDayReminder: false },
      MONDAY,
      always,
    );
    const firstDay = plans.filter(
      (p) => new Date(p.at).getDate() === MONDAY.getDate(),
    );
    expect(firstDay).toHaveLength(1);
  });

  it("drops the second slot when it is switched off", () => {
    const plans = planReminders(
      { ...base, secondReminderOn: false, classDayReminder: false },
      MONDAY,
      always,
    );
    expect(new Set(plans.map((p) => new Date(p.at).getHours()))).toEqual(new Set([9]));
  });

  it("never schedules a slot that has already passed today", () => {
    /* 10am: the 9am slot is gone, the 8pm one is not. */
    const tenAm = new Date(2026, 7, 24, 10, 0, 0);
    const plans = planReminders({ ...base, classDayReminder: false }, tenAm, always);
    const today = plans.filter((p) => new Date(p.at).getDate() === tenAm.getDate());
    expect(today.map((p) => new Date(p.at).getHours())).toEqual([20]);
  });

  it("fires the class nudge on Wednesday even when nothing is due", () => {
    const plans = planReminders(base, MONDAY, never);
    expect(plans).toHaveLength(1);
    const nudge = plans[0];
    expect(nudge.classNudge).toBe(true);
    expect(new Date(nudge.at).getDay()).toBe(3);
    expect(nudge.body).toBe("Add today's words from Lesson 4");
  });

  it("replaces only the FIRST slot on class day, not the evening one", () => {
    const plans = planReminders(base, MONDAY, always);
    const wednesday = plans.filter((p) => new Date(p.at).getDay() === 3);
    expect(wednesday).toHaveLength(2);
    expect(wednesday[0].classNudge).toBe(true);
    expect(wednesday[1].classNudge).toBe(false);
    expect(new Date(wednesday[1].at).getHours()).toBe(20);
  });

  it("counts due cards as of the slot, not as of now", () => {
    /* Nothing due today, something due from tomorrow onward. */
    const tomorrow = new Date(MONDAY);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const plans = planReminders(
      { ...base, classDayReminder: false },
      MONDAY,
      (at) => (at.getTime() >= tomorrow.getTime() ? 3 : 0),
    );

    expect(plans.every((p) => p.at >= tomorrow.getTime())).toBe(true);
    expect(plans.length).toBeGreaterThan(0);
  });

  it("says how many are due, and says it in the singular for one", () => {
    const one = planReminders({ ...base, classDayReminder: false }, MONDAY, () => 1);
    expect(one[0].body).toBe("1 word is due");

    const many = planReminders({ ...base, classDayReminder: false }, MONDAY, () => 7);
    expect(many[0].body).toBe("7 words are due");
  });

  it("never reuses a firing time, so identifiers cannot collide", () => {
    const plans = planReminders(base, MONDAY, always);
    expect(new Set(plans.map((p) => p.at)).size).toBe(plans.length);
  });
});
