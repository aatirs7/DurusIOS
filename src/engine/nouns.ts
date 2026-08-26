/*
  The counted-noun pool for the numbers trainer, and the rules for putting a
  noun into the case a number demands.

  Every generator in the trainer needs the same thing: a noun in a particular
  number and case. "Three books" needs the genitive plural, "eleven books" the
  accusative singular, "a hundred books" the genitive singular, and "the four
  books" the definite nominative plural. That is four different shapes of one
  word, and getting one wrong teaches a wrong ending.

  So the pool stores STEMS and derives the endings, rather than storing every
  inflected form. Sixteen nouns times three numbers times three cases times
  definite-or-not is a hundred and forty four strings to author and mistype;
  the rules that produce them fit on a screen and can be tested.

  WHY THIS IS ENGINE DATA AND NOT CARDS

  A card carries an Arabic string and a meaning. What a generator needs is a
  paradigm - singular, dual, plural, and which kind of plural - which the card
  table does not have and should not grow, because nothing else in the app
  needs it. Every word below is nonetheless already seeded as a card, so the
  trainer introduces no vocabulary the learner has not met.

  NO DIPTOTES. دَقِيقَة, مَدْرَسَة and نَافِذَة are all seeded and all have plurals
  that take a fathah and no tanwin in the genitive - a different rule, from
  Book 1 Lesson 22, which the trainer teaches later as its own thing. Meeting
  one here would teach that the pattern is unreliable rather than that there is
  a second pattern.
*/

export type Gender = "m" | "f";
export type GrammaticalNumber = "singular" | "dual" | "plural";
export type Case = "nominative" | "accusative" | "genitive";

/*
  How a plural is built, because the endings differ.

  A sound feminine plural takes KASRAH in the accusative, not fathah - طَالِبَاتٍ
  where a broken plural would be طُلَّابًا. It is the one irregularity in the
  set and the reason this is a field rather than something guessed from the
  shape of the word.
*/
export type PluralKind = "broken" | "soundFeminine";

export type PoolNoun = {
  id: string;
  gender: Gender;
  /* Vowelled, and WITHOUT a final case vowel: كِتَاب, not كِتَابٌ. The endings
     are the whole point of the exercise, so they are never baked in. */
  stem: string;
  pluralStem: string;
  pluralKind: PluralKind;
  english: { one: string; many: string };
};

export const NOUN_POOL: readonly PoolNoun[] = [
  /* Masculine. Every plural here is broken and triptote. */
  { id: "kitab", gender: "m", stem: "كِتَاب", pluralStem: "كُتُب", pluralKind: "broken", english: { one: "book", many: "books" } },
  { id: "qalam", gender: "m", stem: "قَلَم", pluralStem: "أَقْلَام", pluralKind: "broken", english: { one: "pen", many: "pens" } },
  { id: "rajul", gender: "m", stem: "رَجُل", pluralStem: "رِجَال", pluralKind: "broken", english: { one: "man", many: "men" } },
  { id: "talib", gender: "m", stem: "طَالِب", pluralStem: "طُلَّاب", pluralKind: "broken", english: { one: "student", many: "students" } },
  { id: "bayt", gender: "m", stem: "بَيْت", pluralStem: "بُيُوت", pluralKind: "broken", english: { one: "house", many: "houses" } },
  { id: "yawm", gender: "m", stem: "يَوْم", pluralStem: "أَيَّام", pluralKind: "broken", english: { one: "day", many: "days" } },
  { id: "bab", gender: "m", stem: "بَاب", pluralStem: "أَبْوَاب", pluralKind: "broken", english: { one: "door", many: "doors" } },
  { id: "walad", gender: "m", stem: "وَلَد", pluralStem: "أَوْلَاد", pluralKind: "broken", english: { one: "boy", many: "boys" } },

  /* Feminine. غُرْفَة and بِنْت take broken plurals; the rest are sound. */
  { id: "sayyara", gender: "f", stem: "سَيَّارَة", pluralStem: "سَيَّارَات", pluralKind: "soundFeminine", english: { one: "car", many: "cars" } },
  { id: "ghurfa", gender: "f", stem: "غُرْفَة", pluralStem: "غُرَف", pluralKind: "broken", english: { one: "room", many: "rooms" } },
  { id: "kalima", gender: "f", stem: "كَلِمَة", pluralStem: "كَلِمَات", pluralKind: "soundFeminine", english: { one: "word", many: "words" } },
  { id: "majalla", gender: "f", stem: "مَجَلَّة", pluralStem: "مَجَلَّات", pluralKind: "soundFeminine", english: { one: "magazine", many: "magazines" } },
  { id: "bint", gender: "f", stem: "بِنْت", pluralStem: "بَنَات", pluralKind: "soundFeminine", english: { one: "girl", many: "girls" } },
  { id: "rakaa", gender: "f", stem: "رَكْعَة", pluralStem: "رَكَعَات", pluralKind: "soundFeminine", english: { one: "rakah", many: "rakahs" } },
  { id: "ukht", gender: "f", stem: "أُخْت", pluralStem: "أَخَوَات", pluralKind: "soundFeminine", english: { one: "sister", many: "sisters" } },
  { id: "baqara", gender: "f", stem: "بَقَرَة", pluralStem: "بَقَرَات", pluralKind: "soundFeminine", english: { one: "cow", many: "cows" } },
];

const DAMMATAN = "ٌ";
const FATHATAN = "ً";
const KASRATAN = "ٍ";
const DAMMAH = "ُ";
const FATHAH = "َ";
const KASRAH = "ِ";
const TA_MARBUTAH = "ة";
const ALIF = "ا";

/*
  The accusative indefinite is written with a supporting alif - كِتَابًا - EXCEPT
  after a round ta, where it is not: سَيَّارَةً. Book 1 lesson 18 notes the same
  exception for كَمْ.
*/
const takesAccusativeAlif = (stem: string): boolean => !stem.endsWith(TA_MARBUTAH);

/*
  The dual is built on the singular with its round ta opened into a plain one:
  سَيَّارَة becomes سَيَّارَتَانِ. Nothing else about the stem changes.
*/
const dualStem = (stem: string): string =>
  stem.endsWith(TA_MARBUTAH) ? `${stem.slice(0, -1)}ت` : stem;

const DEFINITE = "ال";

export type Inflection = {
  number: GrammaticalNumber;
  case: Case;
  definite: boolean;
};

/*
  A noun in the shape a number demands.

  Definite forms take a single short vowel rather than tanwin, because ال and
  tanwin are the two ways of being definite or indefinite and a word never
  carries both.
*/
export function inflect(noun: PoolNoun, form: Inflection): string {
  const { number, case: grammaticalCase, definite } = form;

  if (number === "dual") {
    /*
      The dual has two forms, not three: -aani when it is the subject and
      -ayni everywhere else. It also drops its nun as the first half of a pair,
      which the generators handle where they build the phrase - it is a fact
      about the construction rather than about the word.
    */
    const stem = dualStem(noun.stem);
    const ending = grammaticalCase === "nominative" ? "َانِ" : "َيْنِ";
    return `${definite ? DEFINITE : ""}${stem}${ending}`;
  }

  const stem = number === "plural" ? noun.pluralStem : noun.stem;

  if (definite) {
    const vowel =
      grammaticalCase === "nominative" ? DAMMAH : grammaticalCase === "accusative" ? FATHAH : KASRAH;
    return `${DEFINITE}${stem}${vowel}`;
  }

  if (grammaticalCase === "nominative") return `${stem}${DAMMATAN}`;
  if (grammaticalCase === "genitive") return `${stem}${KASRATAN}`;

  /*
    Accusative. A sound feminine plural takes KASRAH here, not fathah - the one
    irregularity in the pool, and the reason pluralKind is stored rather than
    guessed.
  */
  if (number === "plural" && noun.pluralKind === "soundFeminine") {
    return `${stem}${KASRATAN}`;
  }

  return takesAccusativeAlif(stem) ? `${stem}${FATHATAN}${ALIF}` : `${stem}${FATHATAN}`;
}

/* The English for a noun in a given number, for the prompt and the gloss. */
export const englishFor = (noun: PoolNoun, number: GrammaticalNumber): string =>
  number === "singular" ? noun.english.one : noun.english.many;

export const nounById = (id: string): PoolNoun | undefined =>
  NOUN_POOL.find((n) => n.id === id);
