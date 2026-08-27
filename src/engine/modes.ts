/*
  Which question to ask, and what the answer earns.

  The manual Again / Hard / Good / Easy row is gone. Grading is derived
  from whether the answer was right and how long it took, which is the
  thing this app claims to train in the first place.

  Pure, so both halves are unit testable.
*/

import type { Grade } from "./srs";

export type Mode =
  /* Tap the right answer out of four. */
  | "choice"
  /* Type the English meaning. */
  | "written"
  /* Build the Arabic by tapping its letters in order. */
  | "assemble";

export type Direction = "recognition" | "production";

/*
  The ladder, in the Quizlet Learn sense: a card gets harder to answer
  as it gets easier to remember, and it works both ways round.

    recognition, reps 0 to 1   Arabic  -> pick the meaning
    recognition, reps 2+       Arabic  -> type the meaning
    production,  reps 0 to 1   English -> pick the Arabic
    production,  reps 2+       English -> build the Arabic

  Recognition and production are separate rows with separate schedules,
  and production is only created once recognition has been answered
  twice, so the reverse direction cannot arrive before the forward one
  is solid.

  Getting a card wrong sets its repetitions back to zero, which drops it
  a rung on its own. There is no separate demotion rule to keep in step.
*/
export function modeFor(
  card: { type: "vocab" | "phrase"; repetitions: number },
  direction: Direction,
  /*
    Typing only, from settings.

    The ladder exists because tapping one of four is the right first meeting
    with a word - it teaches the shape before asking you to produce it. Some
    people do not want that: they already know the words and the choice rung is
    a formality they tap through. So this skips it, and a card is typed or
    assembled from its very first sighting.

    It does NOT touch scheduling. A harder first question means more wrong
    answers at first, and the scheduler already knows what to do with those.
  */
  options: { typingOnly?: boolean } = {},
): Mode {
  /*
    Phrases stay on choice in both directions, EVEN in typing only mode. Typing
    out "where is the boy? he is in the mosque" is a test of patience, and
    assembling it letter by letter is worse. Typing only is a preference about
    the first rung, not a licence to make a drill unusable.
  */
  if (card.type === "phrase") return "choice";

  if (card.repetitions < 2 && !options.typingOnly) return "choice";

  return direction === "recognition" ? "written" : "assemble";
}

/*
  How long an answer may take before it stops counting as fluent.

  These are per mode because the floor is the interface, not the recall.
  Tapping one of four is quick even when you are unsure. Typing a word
  takes seconds no matter how well you know it, and tapping out letters
  takes longer still.
*/
export const THRESHOLDS: Record<Mode, { fast: number; slow: number }> = {
  choice: { fast: 2500, slow: 6000 },
  written: { fast: 6000, slow: 14000 },
  assemble: { fast: 8000, slow: 20000 },
};

export type Outcome = {
  correct: boolean;
  /* Right answer, wrong spelling. Correct, but never fluent. */
  close?: boolean;
  msToAnswer: number;
  mode: Mode;
};

/*
  Wrong is always again, however fast it was. Being quickly wrong is
  still wrong, and the card needs to come back this session.
*/
export function gradeFor(outcome: Outcome): Grade {
  if (!outcome.correct) return "again";

  const { fast, slow } = THRESHOLDS[outcome.mode];

  // A misspelling means it was known but not solid, so it can never
  // earn the longest interval.
  if (outcome.close) return outcome.msToAnswer > slow ? "hard" : "good";

  if (outcome.msToAnswer <= fast) return "easy";
  if (outcome.msToAnswer >= slow) return "hard";
  return "good";
}

/* What the session says after an answer. Never praise, never a streak. */
export function feedbackFor(outcome: Outcome, grade: Grade): string {
  if (!outcome.correct) return "Not that one.";
  if (outcome.close) return "Right, with a spelling slip.";
  if (grade === "easy") return "Straight away.";
  if (grade === "hard") return "Right, but slow.";
  return "Right.";
}

/* Shown above the card, so the rung you are on is never a surprise. */
export function modeLabel(mode: Mode, direction: Direction): string {
  if (mode === "written") return "Type the meaning";
  if (mode === "assemble") return "Build the word";
  return direction === "production" ? "Pick the Arabic" : "Pick the meaning";
}
