import {
  CURRENT_LESSON_CAP_DAYS,
  DEFAULT_STATE,
  MAX_INTERVAL_DAYS,
  MIN_EASE,
  formatInterval,
  isCurrentLessonCapped,
  schedule,
  type SrsState,
} from "./srs";

const NOW = new Date("2026-08-24T12:00:00.000Z");

// No fuzz, so intervals are exact and assertions stay honest.
const noFuzz = () => 0.5;

function opts(over: Partial<Parameters<typeof schedule>[2]> = {}) {
  return { now: NOW, capToCurrentLesson: false, random: noFuzz, ...over };
}

function state(over: Partial<SrsState> = {}): SrsState {
  return { ...DEFAULT_STATE, ...over };
}

describe("again", () => {
  it("resets repetitions, drops ease by 0.20, and counts a lapse", () => {
    const r = schedule(state({ repetitions: 5, intervalDays: 30 }), "again", opts());
    expect(r.repetitions).toBe(0);
    expect(r.intervalDays).toBe(0);
    expect(r.ease).toBeCloseTo(2.3, 10);
    expect(r.lapses).toBe(1);
  });

  it("goes into the relearn bucket 10 minutes out, not a future day", () => {
    const r = schedule(state(), "again", opts());
    expect(r.relearn).toBe(true);
    expect(r.dueAt.getTime() - NOW.getTime()).toBe(10 * 60_000);
  });

  it("floors ease at 1.3", () => {
    const r = schedule(state({ ease: 1.35 }), "again", opts());
    expect(r.ease).toBe(MIN_EASE);
  });
});

describe("hard", () => {
  it("multiplies the interval by 1.2 with a floor of 1 day", () => {
    const r = schedule(state({ intervalDays: 10, repetitions: 3 }), "hard", opts());
    expect(r.intervalDays).toBeCloseTo(12, 10);
  });

  it("gives at least one day when the interval was zero", () => {
    const r = schedule(state(), "hard", opts());
    expect(r.intervalDays).toBe(1);
  });

  it("drops ease by 0.15 and does not advance repetitions", () => {
    const r = schedule(state({ repetitions: 3 }), "hard", opts());
    expect(r.ease).toBeCloseTo(2.35, 10);
    expect(r.repetitions).toBe(3);
  });
});

describe("good", () => {
  it("first success is one day", () => {
    const r = schedule(state({ repetitions: 0 }), "good", opts());
    expect(r.intervalDays).toBe(1);
    expect(r.repetitions).toBe(1);
  });

  it("second success is four days", () => {
    const r = schedule(state({ repetitions: 1 }), "good", opts());
    expect(r.intervalDays).toBeCloseTo(4, 10);
    expect(r.repetitions).toBe(2);
  });

  it("after that it multiplies by ease", () => {
    const r = schedule(
      state({ repetitions: 2, intervalDays: 4, ease: 2.5 }),
      "good",
      opts(),
    );
    expect(r.intervalDays).toBeCloseTo(10, 10);
    expect(r.repetitions).toBe(3);
  });

  it("leaves ease alone", () => {
    const r = schedule(state({ repetitions: 2, intervalDays: 4 }), "good", opts());
    expect(r.ease).toBe(2.5);
  });
});

describe("easy", () => {
  it("is good times 1.3 with ease up 0.15", () => {
    const r = schedule(
      state({ repetitions: 2, intervalDays: 4, ease: 2.5 }),
      "easy",
      opts(),
    );
    expect(r.intervalDays).toBeCloseTo(13, 10);
    expect(r.ease).toBeCloseTo(2.65, 10);
  });
});

describe("fuzz", () => {
  it("is not applied at or below three days", () => {
    for (const random of [() => 0, () => 0.999999]) {
      const first = schedule(state({ repetitions: 0 }), "good", opts({ random }));
      expect(first.intervalDays).toBe(1);
    }
  });

  it("stays inside plus or minus 8 percent above three days", () => {
    const base = state({ repetitions: 2, intervalDays: 4, ease: 2.5 });
    const low = schedule(base, "good", opts({ random: () => 0 }));
    const high = schedule(base, "good", opts({ random: () => 1 }));
    expect(low.intervalDays).toBeCloseTo(10 * 0.92, 10);
    expect(high.intervalDays).toBeCloseTo(10 * 1.08, 10);
  });
});

describe("caps", () => {
  it("never exceeds 120 days", () => {
    const r = schedule(
      state({ repetitions: 9, intervalDays: 100, ease: 2.5 }),
      "easy",
      opts(),
    );
    expect(r.intervalDays).toBe(MAX_INTERVAL_DAYS);
  });

  it("caps the current lesson at three days", () => {
    const r = schedule(
      state({ repetitions: 4, intervalDays: 30, ease: 2.5 }),
      "good",
      opts({ capToCurrentLesson: true }),
    );
    expect(r.intervalDays).toBe(CURRENT_LESSON_CAP_DAYS);
  });

  it("does not raise a short interval up to the cap", () => {
    const r = schedule(
      state({ repetitions: 0 }),
      "good",
      opts({ capToCurrentLesson: true }),
    );
    expect(r.intervalDays).toBe(1);
  });
});

describe("isCurrentLessonCapped", () => {
  const since = new Date("2026-08-20T12:00:00.000Z");

  it("is false for a lesson that is not current", () => {
    expect(isCurrentLessonCapped(3, 4, since, NOW)).toBe(false);
  });

  it("is true inside the 14 day window", () => {
    expect(isCurrentLessonCapped(4, 4, since, NOW)).toBe(true);
  });

  it("expires after 14 days", () => {
    const later = new Date("2026-09-06T12:00:00.000Z");
    expect(isCurrentLessonCapped(4, 4, since, later)).toBe(false);
  });
});

describe("formatInterval", () => {
  it("labels the relearn bucket in minutes", () => {
    expect(formatInterval(schedule(state(), "again", opts()))).toBe("10m");
  });

  it("labels days without a trailing zero", () => {
    expect(formatInterval(schedule(state({ repetitions: 0 }), "good", opts()))).toBe(
      "1d",
    );
  });

  it("switches to months past thirty days", () => {
    const r = schedule(
      state({ repetitions: 5, intervalDays: 40, ease: 2.5 }),
      "good",
      opts(),
    );
    expect(formatInterval(r)).toMatch(/mo$/);
  });
});
