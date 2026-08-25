/*
  Turning a lesson's grammar note into something readable.

  A note arrives as one paragraph of English with Arabic examples embedded in
  it, which is how the book writes them and how the web app stores them. Set as
  a single block it is a wall: the reader cannot tell where one rule ends and
  the next begins, and the Arabic is set in the UI face because a React Native
  Text node has one font.

  Two pure functions, so both can be tested without a renderer:

    splitNote     one paragraph -> a few short steps, to be paged through
    segmentRuns   one string    -> alternating Arabic and Latin runs

  Neither knows anything about React. The screen decides how to draw them.
*/

/*
  Arabic script, including the harakat and the presentation forms.

  Deliberately a character class rather than \p{Script=Arabic}: Unicode property
  escapes are supported by Hermes but this file is also the one place a silent
  regex failure would be invisible - the note would simply render as one Latin
  run and look exactly like the bug being fixed.
*/
const ARABIC_CHAR = "\\u0600-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFF";
const ARABIC_RUN = new RegExp(`[${ARABIC_CHAR}]+(?:[\\s\\u200f]+[${ARABIC_CHAR}]+)*`, "g");

export type Run = { arabic: boolean; text: string };

/*
  Splits a mixed string into runs so each can be drawn in its own face.

  Adjacent Arabic words are kept in ONE run, spaces included: a run per word
  would let the layout break a phrase across lines in the wrong direction, and
  every space would be set in the Latin face at the Latin size.
*/
export function segmentRuns(text: string): Run[] {
  const runs: Run[] = [];
  let last = 0;

  for (const match of text.matchAll(ARABIC_RUN)) {
    const at = match.index;
    if (at > last) runs.push({ arabic: false, text: text.slice(last, at) });
    runs.push({ arabic: true, text: match[0] });
    last = at + match[0].length;
  }
  if (last < text.length) runs.push({ arabic: false, text: text.slice(last) });

  return runs.filter((r) => r.text !== "");
}

/* A sentence ends at a full stop followed by space and something that starts a
   new one. Quotes count, because a note often opens on a quoted gloss. */
function startsSentence(ch: string): boolean {
  return /[A-Z"“]/.test(ch) || new RegExp(`[${ARABIC_CHAR}]`).test(ch);
}

/*
  Breaks a note into sentences.

  Hand rolled rather than a lookbehind regex. Hermes does support lookbehind,
  but an abbreviation or a decimal would need the same special casing either
  way, and a loop is the version whose behaviour is obvious from reading it.
*/
export function splitSentences(note: string): string[] {
  const out: string[] = [];
  let start = 0;

  for (let i = 0; i < note.length; i += 1) {
    if (note[i] !== ".") continue;

    /* Look past the run of spaces after the stop. */
    let j = i + 1;
    while (j < note.length && /\s/.test(note[j])) j += 1;
    if (j === i + 1) continue; // no space: a decimal, or mid-token
    if (j < note.length && !startsSentence(note[j])) continue;

    out.push(note.slice(start, i + 1).trim());
    start = j;
  }

  const tail = note.slice(start).trim();
  if (tail !== "") out.push(tail);
  return out;
}

/* At most this many sentences on one step. Two is enough to state a rule and
   give its example, and few enough to read without scrolling. */
const PER_STEP = 2;

/*
  Groups a note into the steps the lesson screen pages through.

  An orphan is folded back rather than shown alone: a step holding one short
  trailing sentence reads as though the reader missed something, and the last
  sentence of these notes is usually a footnote to the one before it.
*/
export function splitNote(note: string, perStep = PER_STEP): string[][] {
  const sentences = splitSentences(note);
  if (sentences.length === 0) return [];

  const steps: string[][] = [];
  for (let i = 0; i < sentences.length; i += perStep) {
    steps.push(sentences.slice(i, i + perStep));
  }

  if (steps.length > 1 && steps[steps.length - 1].length === 1) {
    const orphan = steps.pop()!;
    steps[steps.length - 1].push(...orphan);
  }

  return steps;
}
