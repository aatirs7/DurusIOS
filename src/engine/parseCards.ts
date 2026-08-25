/*
  The only thing in the project that understands the paste format.
  Used by /add and by the seed script, so if the seed loads cleanly the
  parser is already proven against real Arabic.

  Format, pipe delimited:
    arabic | english | transliteration | gender or the word phrase | plural | note

  Trailing fields can be omitted. Empty middle fields are left blank
  between pipes, for example:
    غَنِيٌّ | rich | | | opposite of poor
*/

import { hasHarakat } from "./harakat";

export type ParsedCard = {
  line: number;
  arabic: string;
  english: string;
  transliteration: string | null;
  type: "vocab" | "phrase";
  gender: "m" | "f" | null;
  plural: string | null;
  note: string | null;
  warning: string | null;
};

export type ParseError = {
  line: number;
  raw: string;
  message: string;
};

export type ParseResult = {
  cards: ParsedCard[];
  errors: ParseError[];
};

const LATIN = /[A-Za-z]/;

/*
  Skip blank lines and code fences so a whole block can be pasted
  straight out of the notes file without editing it first.
*/
function isSkippable(line: string): boolean {
  const t = line.trim();
  return t.length === 0 || t.startsWith("```") || t.startsWith("#");
}

export function parseCards(input: string): ParseResult {
  const cards: ParsedCard[] = [];
  const errors: ParseError[] = [];

  input.split(/\r?\n/).forEach((raw, index) => {
    const lineNumber = index + 1;
    if (isSkippable(raw)) return;

    const fields = raw.split("|").map((f) => f.trim());
    const [
      arabic = "",
      english = "",
      transliteration = "",
      fourth = "",
      plural = "",
      note = "",
    ] = fields;

    if (fields.length < 2) {
      errors.push({
        line: lineNumber,
        raw,
        message: `line ${lineNumber}: needs at least an Arabic field and an English meaning, separated by a pipe`,
      });
      return;
    }

    if (!arabic) {
      errors.push({
        line: lineNumber,
        raw,
        message: `line ${lineNumber}: missing Arabic`,
      });
      return;
    }

    if (!english) {
      errors.push({
        line: lineNumber,
        raw,
        message: `line ${lineNumber}: missing English meaning`,
      });
      return;
    }

    if (LATIN.test(arabic)) {
      errors.push({
        line: lineNumber,
        raw,
        message: `line ${lineNumber}: the Arabic field contains Latin letters, the fields are probably in the wrong order`,
      });
      return;
    }

    if (plural && LATIN.test(plural)) {
      errors.push({
        line: lineNumber,
        raw,
        message: `line ${lineNumber}: the plural field contains Latin letters`,
      });
      return;
    }

    const isPhrase = fourth.toLowerCase() === "phrase";
    let gender: "m" | "f" | null = null;

    if (!isPhrase && fourth) {
      const g = fourth.toLowerCase();
      if (g !== "m" && g !== "f") {
        errors.push({
          line: lineNumber,
          raw,
          message: `line ${lineNumber}: the fourth field should be m, f, or the word phrase, not "${fourth}"`,
        });
        return;
      }
      gender = g;
    }

    // Warn, do not block. A vocab line with no harakat at all is almost
    // always a paste error, but occasionally it is deliberate.
    const warning =
      !isPhrase && !hasHarakat(arabic)
        ? `line ${lineNumber}: no harakat on this word, check the paste`
        : null;

    cards.push({
      line: lineNumber,
      arabic,
      english,
      transliteration: transliteration || null,
      type: isPhrase ? "phrase" : "vocab",
      gender,
      plural: plural || null,
      note: note || null,
      warning,
    });
  });

  return { cards, errors };
}
