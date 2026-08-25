/*
  One place for the numbers the drills share.

  In the web app this file existed to keep the Neon client out of the browser
  bundle: db/index.ts throws at module scope when DATABASE_URL is missing, so a
  client component importing a db backed module took the whole page down at
  hydration with an error naming the wrong culprit. That reason is gone here.
  The file is still worth having as the single home for these values, and
  lib/speed.ts is folded in because its own separation reason ("use server"
  modules may only export async functions) is gone too.
*/

export const TOTAL_LESSONS = 23;

/* Interval over 21 days counts as mature, per the stats spec. */
export const MATURE_DAYS = 21;

export type Maturity = "unseen" | "learning" | "mature";

/*
  Token names, not colours. The web version held CSS custom properties
  ("var(--saffron)"), which cannot cross into React Native, and spec section
  7.1 puts every literal colour in src/theme/tokens.ts and nowhere else. The
  engine names the role and the theme layer resolves it, which also keeps this
  module free of any import (spec section 4).
*/
export const MATURITY_TOKEN: Record<Maturity, "rule" | "saffron" | "verdigris"> = {
  unseen: "rule",
  learning: "saffron",
  mature: "verdigris",
};

export function maturityOf(intervalDays: number | null): Maturity {
  if (intervalDays === null) return "unseen";
  return intervalDays > MATURE_DAYS ? "mature" : "learning";
}

/* The speed drill. 20 words against a shrinking clock, recognition only. */
export type SpeedWord = {
  cardId: number;
  arabic: string;
  english: string;
  transliteration: string | null;
};

export const SPEED_RUN_LENGTH = 20;
export const SPEED_FLOOR_MS = 700;
export const SPEED_STEP_MS = 100;
export const SPEED_RAMP_THRESHOLD = 0.85;

/* Same, for the case drill. */
export const CASE_RUN_LENGTH = 15;
