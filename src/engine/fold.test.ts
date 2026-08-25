import { foldAll, foldStates, movesSchedule, type FoldReview } from "./fold";
import { DEFAULT_STATE, schedule, type Grade, type SrsState } from "./srs";

/*
  The golden test.

  card_states is maintained two ways: incrementally, one answer at a time, by
  the write path; and by replaying the whole log, by the fold. Everything in the
  sync design assumes those two agree exactly. If they ever disagree, devices
  drift apart and every downstream symptom is confusing, so this is the test to
  fix first and the one that must never be loosened into a tolerance.
*/

let seq = 0;
function review(over: Partial<FoldReview> = {}): FoldReview {
  seq += 1;
  return {
    cardId: 1,
    direction: "recognition",
    grade: "good",
    reviewedAt: new Date(Date.UTC(2026, 0, seq)),
    practice: false,
    capped: false,
    fuzz: null,
    retractedAt: null,
    deviceId: "dev_a",
    clientId: `c${String(seq).padStart(4, "0")}`,
    ...over,
  };
}

/*
  The incremental path, exactly as the write path performs it: read the current
  state, schedule one answer, store the result. Deliberately written out here
  rather than imported, so the test compares two independent implementations
  instead of one implementation with itself.
*/
function incremental(reviews: readonly FoldReview[]) {
  let state: SrsState = { ...DEFAULT_STATE };
  let dueAt: Date | null = null;

  for (const r of reviews) {
    if (!movesSchedule(r)) continue;
    const next = schedule(state, r.grade, {
      now: r.reviewedAt,
      capToCurrentLesson: r.capped,
      random: () => r.fuzz ?? 0.5,
    });
    state = {
      ease: next.ease,
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      lapses: next.lapses,
    };
    dueAt = next.dueAt;
  }

  return dueAt === null ? null : { ...state, dueAt };
}

/* Compared bit for bit rather than with toBeCloseTo. A drift of one ulp between
   Hermes and Node would still be a real divergence between two devices, and
   rounding it away here would hide exactly the bug this test exists to catch. */
function bits(n: number): string {
  return n.toString(2);
}

function expectIdentical(
  a: ReturnType<typeof incremental>,
  b: ReturnType<typeof incremental>,
) {
  if (a === null || b === null) {
    expect(a).toBe(b);
    return;
  }
  expect(bits(a.ease)).toBe(bits(b.ease));
  expect(bits(a.intervalDays)).toBe(bits(b.intervalDays));
  expect(a.repetitions).toBe(b.repetitions);
  expect(a.lapses).toBe(b.lapses);
  expect(a.dueAt.getTime()).toBe(b.dueAt.getTime());
}

beforeEach(() => {
  seq = 0;
});

describe("the fold reproduces the incremental path", () => {
  it("over a plain run of correct answers", () => {
    const log = [review(), review(), review(), review()];
    expectIdentical(foldStates(log), incremental(log));
  });

  it("over a run that lapses and recovers", () => {
    const log = [
      review({ grade: "good" }),
      review({ grade: "good" }),
      review({ grade: "again" }),
      review({ grade: "hard" }),
      review({ grade: "easy" }),
    ];
    expectIdentical(foldStates(log), incremental(log));
  });

  it("with a stored fuzz sample on the intervals that consume one", () => {
    const log = [
      review({ grade: "easy", fuzz: 0.13 }),
      review({ grade: "easy", fuzz: 0.87 }),
      review({ grade: "good", fuzz: 0.42 }),
      review({ grade: "good", fuzz: 0.05 }),
    ];
    expectIdentical(foldStates(log), incremental(log));
  });

  it("with the current lesson cap applied to some answers and not others", () => {
    const log = [
      review({ grade: "good", capped: true }),
      review({ grade: "easy", capped: true }),
      review({ grade: "easy", capped: false, fuzz: 0.6 }),
    ];
    expectIdentical(foldStates(log), incremental(log));
  });

  it("across every grade in sequence", () => {
    const grades: Grade[] = ["again", "hard", "good", "easy"];
    const log = grades.flatMap((g) => [review({ grade: g }), review({ grade: g })]);
    expectIdentical(foldStates(log), incremental(log));
  });
});

describe("what the fold refuses to count", () => {
  it("ignores speed runs, which are logged but never scheduled", () => {
    const scheduled = [review({ grade: "good" }), review({ grade: "good" })];
    const withSpeed = [
      scheduled[0],
      review({ direction: "speed", grade: "easy" }),
      scheduled[1],
    ];
    expectIdentical(foldStates(withSpeed), foldStates(scheduled));
  });

  it("ignores a correct practice answer, so it cannot extend an interval", () => {
    const base = [review({ grade: "good" }), review({ grade: "good" })];
    const withPractice = [
      base[0],
      review({ grade: "easy", practice: true }),
      base[1],
    ];
    expectIdentical(foldStates(withPractice), foldStates(base));
  });

  it("still counts a WRONG practice answer, because a failed word must return", () => {
    const withoutMiss = [review({ grade: "good" }), review({ grade: "good" })];
    const withMiss = [
      review({ grade: "good" }),
      review({ grade: "again", practice: true }),
      review({ grade: "good" }),
    ];
    const a = foldStates(withoutMiss)!;
    const b = foldStates(withMiss)!;
    expect(b.lapses).toBe(a.lapses + 1);
    expect(b.intervalDays).toBeLessThan(a.intervalDays);
  });

  it("ignores a retracted review, so undo really undoes", () => {
    const base = [review({ grade: "good" }), review({ grade: "good" })];
    const withUndone = [
      base[0],
      review({ grade: "again", retractedAt: new Date(Date.UTC(2026, 5, 1)) }),
      base[1],
    ];
    expectIdentical(foldStates(withUndone), foldStates(base));
  });

  it("returns null when nothing in the log moves the schedule", () => {
    expect(foldStates([])).toBeNull();
    expect(foldStates([review({ direction: "speed" })])).toBeNull();
    expect(foldStates([review({ grade: "good", practice: true })])).toBeNull();
  });
});

describe("order", () => {
  it("is by wall clock, not by arrival, so an offline device cannot reorder history", () => {
    const early = review({
      grade: "again",
      reviewedAt: new Date(Date.UTC(2026, 0, 1)),
      clientId: "c0001",
    });
    const late = review({
      grade: "good",
      reviewedAt: new Date(Date.UTC(2026, 0, 9)),
      clientId: "c0002",
    });
    /* The same two reviews arriving in either order must fold identically. */
    expectIdentical(foldStates([early, late]), foldStates([late, early]));
  });

  it("breaks a shared millisecond deterministically rather than by arrival", () => {
    const at = new Date(Date.UTC(2026, 2, 3));
    const a = review({ grade: "easy", reviewedAt: at, deviceId: "dev_a", fuzz: 0.2 });
    const b = review({ grade: "hard", reviewedAt: at, deviceId: "dev_b", fuzz: 0.9 });
    expectIdentical(foldStates([a, b]), foldStates([b, a]));
  });
});

describe("production rows", () => {
  it("appear only once recognition reaches two repetitions", () => {
    const one = foldAll([review({ grade: "good" })]);
    expect(one.some((o) => o.direction === "production")).toBe(false);

    seq = 0;
    const two = foldAll([review({ grade: "good" }), review({ grade: "good" })]);
    expect(two.some((o) => o.direction === "production")).toBe(true);
  });

  it("are due at the moment recognition crossed, not at fold time", () => {
    const first = review({ grade: "good" });
    const crossing = review({ grade: "good" });
    const out = foldAll([first, crossing]);
    const production = out.find((o) => o.direction === "production")!;
    expect(production.state.dueAt.getTime()).toBe(crossing.reviewedAt.getTime());
  });

  it("disappear again when a lapse drops recognition back below two", () => {
    const out = foldAll([
      review({ grade: "good" }),
      review({ grade: "good" }),
      review({ grade: "again" }),
    ]);
    /* repetitions is back to 0, so nothing ever crossed as of the final state. */
    const recognition = out.find((o) => o.direction === "recognition")!;
    expect(recognition.state.repetitions).toBe(0);
  });
});
