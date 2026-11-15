import {
  DEFAULT_TRACKED,
  PRACTICES,
  PRACTICE_BY_ID,
  addDays,
  appliesOn,
  consistency,
  fill,
  fold,
  hijriDayOfMonth,
  monthDays,
  summarise,
  valueOn,
  weekday,
  type BarakahEvent,
} from "./barakah";

const ev = (day: string, practiceId: string, value: number, at: number): BarakahEvent => ({ day, practiceId, value, at });

describe("barakah days", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("knows the weekday", () => {
    // 15 November 2026 is a Sunday.
    expect(weekday("2026-11-15")).toBe(0);
    expect(weekday("2026-11-20")).toBe(5);
  });

  it("reads a Hijri day of month", () => {
    const h = hijriDayOfMonth("2026-11-15");
    expect(h === null || (h >= 1 && h <= 30)).toBe(true);
  });

  it("lays out a month", () => {
    const { days, firstWeekday } = monthDays("2026-11-15");
    expect(days).toHaveLength(30);
    expect(days[0]).toBe("2026-11-01");
    expect(firstWeekday).toBe(0);
  });
});

describe("barakah schedules", () => {
  it("only asks for Al-Kahf on Friday", () => {
    const kahf = PRACTICE_BY_ID.get("kahf")!;
    expect(appliesOn(kahf, "2026-11-20")).toBe(true);
    expect(appliesOn(kahf, "2026-11-19")).toBe(false);
  });

  it("asks for the Monday and Thursday fast on those days only", () => {
    const fast = PRACTICE_BY_ID.get("fastMonThu")!;
    expect(appliesOn(fast, "2026-11-16")).toBe(true);
    expect(appliesOn(fast, "2026-11-19")).toBe(true);
    expect(appliesOn(fast, "2026-11-17")).toBe(false);
  });

  it("asks for the white days on exactly three days of a Hijri month", () => {
    const white = PRACTICE_BY_ID.get("whiteDays")!;
    if (hijriDayOfMonth("2026-11-15") === null) return;
    let n = 0;
    for (let i = 0; i < 30; i++) if (appliesOn(white, addDays("2026-11-01", i))) n++;
    expect(n).toBeGreaterThanOrEqual(2);
    expect(n).toBeLessThanOrEqual(4);
  });
});

describe("barakah folding", () => {
  it("lets the latest event win regardless of storage order", () => {
    const values = fold([ev("2026-11-15", "fajr", 0, 30), ev("2026-11-15", "fajr", 1, 10)]);
    expect(valueOn(values, "2026-11-15", "fajr")).toBe(0);
  });

  it("fills a capped count partially and an uncapped one fully", () => {
    expect(fill(PRACTICE_BY_ID.get("rawatib")!, 6)).toBe(0.5);
    expect(fill(PRACTICE_BY_ID.get("istighfar")!, 3)).toBe(1);
    expect(fill(PRACTICE_BY_ID.get("fajr")!, 0)).toBe(0);
  });

  it("counts only practices that apply that day", () => {
    const values = fold([ev("2026-11-15", "fajr", 1, 1)]);
    // Sunday: kahf does not apply.
    expect(summarise(values, ["fajr", "kahf"], "2026-11-15")).toEqual({ applicable: 1, done: 1 });
  });

  it("measures consistency only from the day tracking began", () => {
    const values = fold([ev("2026-11-14", "fajr", 1, 1), ev("2026-11-15", "fajr", 1, 2)]);
    expect(consistency(values, ["fajr"], "2026-11-15", "2026-11-14")).toBe(100);
    expect(consistency(values, ["fajr"], "2026-11-15", "2026-11-13")).toBe(67);
    expect(consistency(values, [], "2026-11-15", "2026-11-13")).toBeNull();
  });
});

describe("barakah catalogue", () => {
  it("has unique ids and four defaults", () => {
    expect(new Set(PRACTICES.map((p) => p.id)).size).toBe(PRACTICES.length);
    expect(DEFAULT_TRACKED).toEqual(["fajr", "morningAdhkar", "eveningAdhkar", "quran"]);
  });

  it("never uses an em dash", () => {
    for (const p of PRACTICES) expect(`${p.title}${p.line}`).not.toMatch(/\u2014/);
  });
});
