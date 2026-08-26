/*
  Choosing the three wrong answers.

  A multiple choice question is only worth as much as its distractors, and
  picking them at random from the lesson pool produces two ways to be right
  without knowing the word:

    BY SHAPE     one full sentence among three single words is the answer, and
                 you can see that from across the room without reading any of
                 it.

    BY KEYWORD   if the sentence is about a dog and it is the only option that
                 mentions a dog, the question is "find the word dog", which is
                 a reading test of one word rather than of the sentence.

  So candidates are scored rather than shuffled: close in length to the real
  answer, and sharing a salient word with it wherever possible. The best three
  win, and ties are broken randomly so the same card does not always draw the
  same three.

  Pure, and `random` is injected, so the whole thing is testable and a replay
  is deterministic.
*/

export type Choice = { arabic: string; english: string; type: "vocab" | "phrase" };

/*
  Which words are worth matching on.

  NOT a hand written stop list. "this", "in" and "it" are function words in
  English and vocabulary items in Book 1 - هٰذَا, فِي, هُوَ are all cards - so a
  list of words to ignore would throw away exactly the ones some questions are
  about.

  Instead, salience is measured against the pool itself: a word that turns up
  in a large share of the options carries no information about which one is
  correct, and a word that turns up in one or two does. That needs no list and
  stays right when the content changes.
*/
const COMMON_ENOUGH_TO_IGNORE = 0.25;

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z']+/)
    .filter((w) => w.length > 0);
}

export function salientWords(text: string, pool: readonly Choice[]): Set<string> {
  const total = pool.length || 1;
  const df = new Map<string, number>();

  for (const item of pool) {
    for (const w of new Set(words(item.english))) {
      df.set(w, (df.get(w) ?? 0) + 1);
    }
  }

  return new Set(words(text).filter((w) => (df.get(w) ?? 0) / total <= COMMON_ENOUGH_TO_IGNORE));
}

/*
  How close two options are in length, as 0..1.

  Measured in WORDS rather than characters. What gives a sentence away next to
  three single words is that it is a sentence, and "the boy is in the house" and
  "the pen is on the table" are the same shape however many letters apart they
  are.
*/
export function lengthCloseness(a: string, b: string): number {
  const wa = words(a).length;
  const wb = words(b).length;
  const spread = Math.max(wa, wb, 1);
  return 1 - Math.min(1, Math.abs(wa - wb) / spread);
}

/* Shape matters more than subject: a wrong-shaped option can be eliminated
   without reading, while a wrong-subject one still has to be read. */
const SHAPE_WEIGHT = 2;
const KEYWORD_WEIGHT = 1;

export function scoreDistractor(
  answer: string,
  candidate: Choice,
  salient: ReadonlySet<string>,
): number {
  const shares = words(candidate.english).some((w) => salient.has(w)) ? 1 : 0;
  return SHAPE_WEIGHT * lengthCloseness(answer, candidate.english) + KEYWORD_WEIGHT * shares;
}

/*
  The three wrong answers, best first.

  Candidates are assumed already filtered to the right card type and to exclude
  the answer itself - that is the caller's job, because only the caller knows
  what pool it is drawing from.
*/
export function pickDistractors(
  answer: string,
  candidates: readonly Choice[],
  count: number,
  random: () => number,
): Choice[] {
  const salient = salientWords(answer, candidates);

  /*
    One shuffle first, then a STABLE sort by score. Anything that scores the
    same keeps the shuffled order, so ties are random without the comparator
    ever being inconsistent - a comparator that calls random() is a comparator
    that can crash a sort.
  */
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const seen = new Set<string>();
  return shuffled
    .map((c) => ({ c, score: scoreDistractor(answer, c, salient) }))
    .sort((x, y) => y.score - x.score)
    .filter(({ c }) => {
      if (seen.has(c.english)) return false;
      seen.add(c.english);
      return true;
    })
    .slice(0, count)
    .map(({ c }) => c);
}
