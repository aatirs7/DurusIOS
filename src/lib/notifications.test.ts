import { planReminders, type ReminderSettings } from "./notifications";

/*
  planReminders is pure, so none of this needs the native module.

  What is being pinned down is that the plan is a function of the SETTINGS
  alone. It used to also depend on the clock and on how many cards were due,
  and those arguments are gone deliberately - see the comment on planReminders.
*/
const base: ReminderSettings = {
  remindersOn: true,
  reminderHour: 9,
  secondReminderOn: false,
  reminderHour2: 20,
  classDayReminder: false,
  currentLesson: 4,
};

describe("planReminders", () => {
  it("plans nothing when reminders are off", () => {
    expect(planReminders({ ...base, remindersOn: false })).toEqual([]);
  });

  it("plans one daily slot by default", () => {
    const plans = planReminders(base);
    expect(plans).toHaveLength(1);
    expect(plans[0].hour).toBe(9);
    expect(plans[0].weekday).toBeUndefined();
  });

  it("plans a second daily slot when it is enabled", () => {
    const plans = planReminders({ ...base, secondReminderOn: true });
    expect(plans.map((p) => p.hour)).toEqual([9, 20]);
    expect(plans.every((p) => p.weekday === undefined)).toBe(true);
  });

  it("collapses two slots set to the same hour", () => {
    const plans = planReminders({ ...base, secondReminderOn: true, reminderHour2: 9 });
    expect(plans).toHaveLength(1);
  });

  /*
    The body never carries a count. It cannot: the plan no longer knows what is
    due, and a repeating trigger fires long after this ran. A number here would
    be a stale claim about the queue.
  */
  it("never mentions a due count", () => {
    const plans = planReminders({ ...base, secondReminderOn: true });
    for (const plan of plans) expect(plan.body).not.toMatch(/\d/);
  });

  it("adds the class nudge as a weekly slot at the first hour", () => {
    const plans = planReminders({ ...base, classDayReminder: true });
    const nudge = plans.find((p) => p.weekday !== undefined);
    expect(nudge).toBeDefined();
    /* 3 is Date#getDay's Wednesday; applyReminders shifts it for expo. */
    expect(nudge!.weekday).toBe(3);
    expect(nudge!.hour).toBe(9);
    expect(nudge!.body).toContain("Lesson 4");
  });

  it("plans no class nudge when reminders are off entirely", () => {
    expect(planReminders({ ...base, remindersOn: false, classDayReminder: true })).toEqual([]);
  });
});
