/*
  The numbers drill, in two stages.

  Book 1 teaches counting in lessons 19 to 21, and it teaches the GRAMMAR of it
  - the number is mudaf, the counted noun is plural genitive, and the number's
  ta behaves backwards to what anyone expects. What it never does is teach the
  numbers themselves as words, because in a classroom the teacher says them
  aloud on the first day.

  So this has a stage before the book's: learn the ten words, then learn what
  happens when you put one in front of a noun. Somebody who cannot yet say
  "seven" has no business being asked whether it keeps its ta.

  All of it is data and pure functions, so the drill screen holds no Arabic.
*/

export type NumberWord = {
  value: number;
  /* The dictionary form, as you would say it counting aloud. */
  arabic: string;
  transliteration: string;
  /*
    The two forms a number takes in front of a counted noun, as the first term
    of an idafah - so they end in a plain dammah rather than tanwin.

    `withMasculine` is the one carrying the ta. That is not a typo: for three to
    ten the number's gender is the OPPOSITE of the noun's, which is the single
    thing about Arabic numbers that everybody gets wrong.
  */
  withMasculine: string;
  withFeminine: string;
};

export const NUMBERS: readonly NumberWord[] = [
  {
    value: 1,
    arabic: "وَاحِدٌ",
    transliteration: "wahidun",
    withMasculine: "وَاحِدٌ",
    withFeminine: "وَاحِدَةٌ",
  },
  {
    value: 2,
    arabic: "اِثْنَانِ",
    transliteration: "ithnani",
    withMasculine: "اِثْنَانِ",
    withFeminine: "اِثْنَتَانِ",
  },
  {
    value: 3,
    arabic: "ثَلَاثَةٌ",
    transliteration: "thalathatun",
    withMasculine: "ثَلَاثَةُ",
    withFeminine: "ثَلَاثُ",
  },
  {
    value: 4,
    arabic: "أَرْبَعَةٌ",
    transliteration: "arbaatun",
    withMasculine: "أَرْبَعَةُ",
    withFeminine: "أَرْبَعُ",
  },
  {
    value: 5,
    arabic: "خَمْسَةٌ",
    transliteration: "khamsatun",
    withMasculine: "خَمْسَةُ",
    withFeminine: "خَمْسُ",
  },
  {
    value: 6,
    arabic: "سِتَّةٌ",
    transliteration: "sittatun",
    withMasculine: "سِتَّةُ",
    withFeminine: "سِتُّ",
  },
  {
    value: 7,
    arabic: "سَبْعَةٌ",
    transliteration: "sabatun",
    withMasculine: "سَبْعَةُ",
    withFeminine: "سَبْعُ",
  },
  {
    value: 8,
    arabic: "ثَمَانِيَةٌ",
    transliteration: "thamaniyatun",
    withMasculine: "ثَمَانِيَةُ",
    /* Book 1 lesson 20 notes the sukun: the feminine form ends on the ya and
       takes no dammah. */
    withFeminine: "ثَمَانِي",
  },
  {
    value: 9,
    arabic: "تِسْعَةٌ",
    transliteration: "tisatun",
    withMasculine: "تِسْعَةُ",
    withFeminine: "تِسْعُ",
  },
  {
    value: 10,
    arabic: "عَشَرَةٌ",
    transliteration: "asharatun",
    withMasculine: "عَشَرَةُ",
    withFeminine: "عَشْرُ",
  },
];

/* The Arabic-Indic digits. Reading ٣ is part of reading Arabic, and nothing
   else in the app ever shows them. */
const EASTERN = "٠١٢٣٤٥٦٧٨٩";
export const easternDigits = (n: number): string =>
  String(n)
    .split("")
    .map((d) => EASTERN[Number(d)])
    .join("");

/*
  Counted nouns, with the plural in the GENITIVE, which is the case the counted
  noun takes.

  Written out here rather than derived from the card table. Only fifteen cards
  carry both a gender and a plural, three of them feminine, and a drill about
  masculine-versus-feminine that is eighty percent masculine is not a drill
  about anything. Every word below is Book 1 vocabulary; the plurals are the
  ones the book uses.

  Deliberately no diptotes. دَقَائِق and فَنَادِيق take a fathah and no tanwin in the
  genitive, which is a different rule from a different lesson, and meeting it
  here would teach that the pattern is unreliable rather than that there is a
  second pattern.
*/
export type CountedNoun = {
  singular: string;
  /* Genitive, because that is how it appears after a number. */
  pluralGenitive: string;
  english: string;
  gender: "m" | "f";
};

export const COUNTED_NOUNS: readonly CountedNoun[] = [
  { singular: "كِتَابٌ", pluralGenitive: "كُتُبٍ", english: "books", gender: "m" },
  { singular: "قَلَمٌ", pluralGenitive: "أَقْلَامٍ", english: "pens", gender: "m" },
  { singular: "بَيْتٌ", pluralGenitive: "بُيُوتٍ", english: "houses", gender: "m" },
  { singular: "وَلَدٌ", pluralGenitive: "أَوْلَادٍ", english: "boys", gender: "m" },
  { singular: "رَجُلٌ", pluralGenitive: "رِجَالٍ", english: "men", gender: "m" },
  { singular: "بَابٌ", pluralGenitive: "أَبْوَابٍ", english: "doors", gender: "m" },
  { singular: "بِنْتٌ", pluralGenitive: "بَنَاتٍ", english: "girls", gender: "f" },
  { singular: "غُرْفَةٌ", pluralGenitive: "غُرَفٍ", english: "rooms", gender: "f" },
  { singular: "سَاعَةٌ", pluralGenitive: "سَاعَاتٍ", english: "hours", gender: "f" },
  { singular: "مَجَلَّةٌ", pluralGenitive: "مَجَلَّاتٍ", english: "magazines", gender: "f" },
  { singular: "كَلِمَةٌ", pluralGenitive: "كَلِمَاتٍ", english: "words", gender: "f" },
  { singular: "طَالِبَةٌ", pluralGenitive: "طَالِبَاتٍ", english: "female students", gender: "f" },
];

export type NumberStage = "words" | "counting";

export type NumberQuestion = {
  stage: NumberStage;
  /* What the question shows, in English or as digits - never Arabic, so the
     answer cannot be read off the prompt. */
  prompt: string;
  digits: string;
  options: string[];
  answer: string;
  /* Shown after answering, on the counting stage, because the rule is the
     whole point and a right answer by luck teaches nothing. */
  note: string | null;
};

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* Stage one: which word is this number? */
export function buildWordQuestion(value: number, random: () => number): NumberQuestion {
  const answer = NUMBERS.find((n) => n.value === value);
  if (!answer) throw new Error(`no number ${value}`);

  const others = shuffled(
    NUMBERS.filter((n) => n.value !== value),
    random,
  ).slice(0, 3);

  return {
    stage: "words",
    prompt: String(value),
    digits: easternDigits(value),
    options: shuffled([answer, ...others], random).map((n) => n.arabic),
    answer: answer.arabic,
    note: null,
  };
}

/*
  Stage two: which form does the number take in front of this noun?

  Three to ten only. One and two are adjectives that follow the noun and agree
  with it normally, so they belong to a different rule and asking them here
  would blur the one thing this stage exists to teach.
*/
export function buildCountingQuestion(
  value: number,
  noun: CountedNoun,
  random: () => number,
): NumberQuestion {
  const word = NUMBERS.find((n) => n.value === value);
  if (!word) throw new Error(`no number ${value}`);

  const answer = noun.gender === "m" ? word.withMasculine : word.withFeminine;
  const wrongGender = noun.gender === "m" ? word.withFeminine : word.withMasculine;

  /*
    One distractor is the same number in the wrong gender - the mistake this
    stage is about - and the rest are neighbouring numbers in the RIGHT gender,
    so the only way to eliminate them is to know which number was asked.
  */
  const neighbours = shuffled(
    NUMBERS.filter((n) => n.value >= 3 && n.value !== value),
    random,
  )
    .slice(0, 2)
    .map((n) => (noun.gender === "m" ? n.withMasculine : n.withFeminine));

  const options = shuffled([answer, wrongGender, ...neighbours], random);

  return {
    stage: "counting",
    prompt: `${value} ${noun.english}`,
    digits: easternDigits(value),
    options: [...new Set(options)],
    answer,
    note:
      noun.gender === "m"
        ? "A masculine noun takes the number WITH the ta."
        : "A feminine noun takes the number WITHOUT the ta.",
  };
}

/* The counted noun as it appears after the number, for showing the whole
   phrase once it has been answered. */
export const countedPhrase = (value: number, noun: CountedNoun): string => {
  const word = NUMBERS.find((n) => n.value === value)!;
  const form = noun.gender === "m" ? word.withMasculine : word.withFeminine;
  return `${form} ${noun.pluralGenitive}`;
};
