import { SPEED_FLOOR_MS } from "./constants";
import {
  DIAGNOSTIC_MIN_CORRECT,
  SPEED_CEILING_MS,
  median,
  windowFromDiagnostic,
} from "./speedWindow";

const times = (...ms: number[]) => ms;

describe("median", () => {
  it("is null for nothing", () => {
    expect(median([])).toBeNull();
  });

  it("takes the middle of an odd sample", () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  /* Interpolated, not the lower of the two - the same rule the stats screen
     uses, so a number means the same thing in both places. */
  it("interpolates an even sample", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe("windowFromDiagnostic", () => {
  it("refuses a sample too small to mean anything", () => {
    expect(windowFromDiagnostic(times(1000, 1000, 1000))).toBeNull();
    expect(windowFromDiagnostic([])).toBeNull();
  });

  it("accepts exactly the minimum", () => {
    const enough = Array.from({ length: DIAGNOSTIC_MIN_CORRECT }, () => 2000);
    expect(windowFromDiagnostic(enough)).not.toBeNull();
  });

  /* A quarter again on top of the typical answer: comfortable answers stay
     comfortable, hesitant ones get tight. */
  it("leaves headroom above the typical answer", () => {
    const steady = Array.from({ length: 8 }, () => 2000);
    expect(windowFromDiagnostic(steady)).toBe(2500);
  });

  it("rounds to something a person could read", () => {
    const odd = Array.from({ length: 8 }, () => 1387);
    const w = windowFromDiagnostic(odd)!;
    expect(w % 50).toBe(0);
  });

  it("never goes below the floor", () => {
    const fast = Array.from({ length: 8 }, () => 100);
    expect(windowFromDiagnostic(fast)).toBe(SPEED_FLOOR_MS);
  });

  it("never goes above the ceiling", () => {
    const slow = Array.from({ length: 8 }, () => 30_000);
    expect(windowFromDiagnostic(slow)).toBe(SPEED_CEILING_MS);
  });

  /* One card where the phone was put down must not stretch the window for
     every card after it. */
  it("is not dragged by a single outlier", () => {
    const withPause = [1800, 1900, 2000, 2100, 2200, 2300, 120_000];
    const without = [1800, 1900, 2000, 2100, 2200, 2300];
    expect(windowFromDiagnostic(withPause)).toBeLessThan(4000);
    expect(windowFromDiagnostic(without)).toBeLessThan(4000);
  });
});
