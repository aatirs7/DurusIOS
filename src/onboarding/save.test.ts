import { afterReminders, saveOnboarding, shouldAskPermission, type SaveEffects } from "./save";

function fakes() {
  const calls: string[] = [];
  const fx: SaveEffects & { patch?: unknown; adhkar?: boolean; surahs?: number[] } = {
    updateSettings: (p) => {
      calls.push("settings");
      fx.patch = p;
    },
    setAdhkarReminder: (on) => {
      calls.push("adhkar");
      fx.adhkar = on;
    },
    markSurahs: (s) => {
      calls.push("surahs");
      fx.surahs = s;
    },
    syncReminders: async () => {
      calls.push("sync");
    },
  };
  return { fx, calls };
}

describe("onboarding save", () => {
  it("writes the self path defaults for the removed questions", async () => {
    const { fx } = fakes();
    await saveOnboarding({ hifz: [], adhkar: false, review: false, notify: false, returning: false, askedReminders: true }, fx);
    expect(fx.patch).toMatchObject({ currentBook: 1, currentLesson: 1, newPerDay: 10, classDayReminder: false });
  });

  it("writes hifz marks only through the save, and only when there are some", async () => {
    const a = fakes();
    await saveOnboarding({ hifz: [1, 112, 113, 114], adhkar: false, review: false, notify: false, returning: false, askedReminders: true }, a.fx);
    expect(a.fx.surahs).toEqual([1, 112, 113, 114]);
    const b = fakes();
    await saveOnboarding({ hifz: [], adhkar: false, review: false, notify: false, returning: false, askedReminders: true }, b.fx);
    expect(b.calls).not.toContain("surahs");
  });

  it("schedules reminders only when permission was granted", async () => {
    const denied = fakes();
    await saveOnboarding({ hifz: [], adhkar: true, review: true, notify: false, returning: false, askedReminders: true }, denied.fx);
    expect(denied.calls).not.toContain("sync");
    expect(denied.fx.patch).toMatchObject({ remindersOn: false });
    expect(denied.fx.adhkar).toBe(false);

    const granted = fakes();
    await saveOnboarding({ hifz: [], adhkar: true, review: false, notify: true, returning: false, askedReminders: true }, granted.fx);
    expect(granted.calls).toContain("sync");
    expect(granted.fx.adhkar).toBe(true);
    expect(granted.fx.patch).toMatchObject({ remindersOn: false, reminderHour: 9 });
  });

  it("leaves a returning account's lesson and pace alone", async () => {
    const { fx } = fakes();
    await saveOnboarding({ hifz: [], adhkar: true, review: true, notify: true, returning: true, askedReminders: true }, fx);
    expect(fx.patch).not.toHaveProperty("currentLesson");
    expect(fx.patch).not.toHaveProperty("newPerDay");
    expect(fx.patch).toMatchObject({ remindersOn: true });
  });

  it("writes nothing to settings for I have an account", async () => {
    const { fx, calls } = fakes();
    await saveOnboarding({ hifz: [], adhkar: true, review: true, notify: false, returning: true, askedReminders: false }, fx);
    expect(calls).toEqual([]);
  });

  it("skips sign in for a keychain session", () => {
    expect(afterReminders(true)).toBe("finish");
    expect(afterReminders(false)).toBe("signin");
  });

  it("asks permission only when a reminder is on", () => {
    expect(shouldAskPermission({ adhkar: false, review: false })).toBe(false);
    expect(shouldAskPermission({ adhkar: true, review: false })).toBe(true);
  });
});
