/*
  Splitting an Arabic word into tappable letters.

  A letter is a base character plus every combining mark that belongs to
  it: the fatha, the shadda, the tanwin. Splitting on code points would
  put a bare shadda on its own tile, which is not a letter and cannot be
  placed, so the unit here is the grapheme, not the character.
*/

/* A non-mark followed by any marks that hang off it. */
const LETTER = /\P{M}\p{M}*/gu;

export function splitLetters(word: string): string[] {
  return (word.match(LETTER) ?? []).filter((c) => c.trim().length > 0);
}

/*
  The tiles, shuffled, each one carrying the position it came from so
  duplicate letters stay distinguishable. Comparing by text alone would
  make the two lams in الحَمَّامُ interchangeable, which is fine for the
  answer but breaks the tapped and untapped bookkeeping.
*/
export type Tile = { id: number; letter: string };

export function tilesFor(
  word: string,
  random: () => number = Math.random,
): Tile[] {
  const letters = splitLetters(word);
  const tiles = letters.map((letter, id) => ({ id, letter }));

  for (let i = tiles.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }

  return tiles;
}

/*
  Whether what was built matches the word.

  Compared as text rather than by tile order, because a word with a
  repeated letter has more than one correct arrangement of tiles and all
  of them spell it correctly.
*/
export function assembledCorrectly(built: Tile[], word: string): boolean {
  return built.map((t) => t.letter).join("") === splitLetters(word).join("");
}
