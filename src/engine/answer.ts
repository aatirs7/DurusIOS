/*
  Deciding whether a typed English answer is right.

  The whole point of an auto graded mode is that it grades the way a
  patient teacher would, not the way a string comparison would. "the
  house" for "house", "mosque." for "mosque", and "recieve" for
  "receive" are all the answer. "book" for "door" is not.

  Pure, so it can be unit tested without a browser or a database.
*/

export type MatchResult =
  /* Typed it exactly, once normalised. */
  | { kind: "exact" }
  /* Right, but with a small spelling slip. Counts as correct, and the
     caller uses it to grade a shade harder. */
  | { kind: "close"; expected: string }
  | { kind: "wrong" };

/* Articles are noise when the card is a single word. */
const LEADING_ARTICLE = /^(a|an|the)\s+/;

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    // Drop anything that is not a letter, a digit, or a space.
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/*
  A card's English may offer several answers, either comma separated
  ("he, it") or parenthesised. Any one of them is correct on its own.
*/
export function acceptedAnswers(english: string): string[] {
  const withoutParens = english.replace(/\(([^)]*)\)/g, ",$1,");
  const parts = withoutParens
    .split(/[,/]|\bor\b/)
    .map((p) => normalise(p))
    .filter((p) => p.length > 0);

  const whole = normalise(english);
  const all = [whole, ...parts];

  // Also accept each answer without its leading article.
  for (const a of [...all]) {
    const stripped = a.replace(LEADING_ARTICLE, "");
    if (stripped !== a && stripped.length > 0) all.push(stripped);
  }

  return [...new Set(all)];
}

/*
  How much misspelling to forgive. One character on a short word, two on
  a long one. Any more and "cat" would accept "cap", which is a
  different card in this very deck.
*/
function tolerance(expected: string): number {
  if (expected.length <= 4) return 0;
  if (expected.length <= 8) return 1;
  return 2;
}

export function checkAnswer(typed: string, english: string): MatchResult {
  const given = normalise(typed);
  if (given.length === 0) return { kind: "wrong" };

  const accepted = acceptedAnswers(english);

  for (const answer of accepted) {
    if (given === answer) return { kind: "exact" };
  }

  // Also forgive a missing leading article on the typed side.
  const givenBare = given.replace(LEADING_ARTICLE, "");
  for (const answer of accepted) {
    if (givenBare === answer.replace(LEADING_ARTICLE, "")) {
      return { kind: "exact" };
    }
  }

  for (const answer of accepted) {
    const allowed = tolerance(answer);
    if (allowed === 0) continue;
    if (editDistance(givenBare, answer.replace(LEADING_ARTICLE, "")) <= allowed) {
      return { kind: "close", expected: english };
    }
  }

  return { kind: "wrong" };
}

/*
  Damerau-Levenshtein, restricted edition, so an adjacent transposition
  costs one rather than two.

  This matters more than it looks. Swapping two letters is the most
  common typing slip there is, and plain Levenshtein scores "mosqeu"
  against "mosque" as two edits, which put the single most likely typo
  outside the tolerance for a six letter word. It does not loosen the
  short word rule: cat against cap is still a substitution, still one
  edit, and still rejected because words of four letters or fewer
  forgive nothing.
*/
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Three rows, because a transposition looks two back.
  let twoBack = new Array<number>(b.length + 1);
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);

      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        best = Math.min(best, twoBack[j - 2] + 1);
      }

      curr[j] = best;
    }
    [twoBack, prev, curr] = [prev, curr, twoBack];
  }

  return prev[b.length];
}
