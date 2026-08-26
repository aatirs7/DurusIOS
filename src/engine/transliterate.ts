/*
  Vowelled Arabic to a Latin reading.

  The seed for lessons 1 to 4 carries a hand written transliteration on every
  card. Lessons 5 to 23 arrived without them, and typing 376 by hand is both
  slow and a fresh chance to be inconsistent - so they are derived instead.

  This is only possible because the source is FULLY VOWELLED. Every short
  vowel, every sukun and every shaddah is written, so the reading is determined
  by the text rather than guessed from it. Hand this unvowelled Arabic and it
  will produce nonsense, which is correct: unvowelled Arabic does not have one
  reading.

  The scheme is the one lessons 1 to 4 already use, which is a plain ASCII
  reading rather than a scholarly romanisation - "baytun", not "bayt-un" or
  "bay-tun". No diacritics, because the point is to tell somebody how the word
  sounds, and a reader who needs the transliteration is not helped by having to
  learn a second notation to read it.

  Correctness is measured, not asserted. The full corpus check lives in the web
  repo, where the hand written transliterations are - it runs this exact file
  over every card in lessons 1 to 4 and compares, and 87 of 92 come out
  identical. This copy carries the rules as tests instead, so a change here
  that breaks one of them fails here rather than in another repository.

  A COPY, deliberately, like engine/fold.ts: this has to stay byte-identical to
  lib/transliterate.ts in the web repo, because the two produce the strings a
  reader compares side by side.
*/

/* Consonants. Two-letter digraphs where English has no single letter. */
const CONSONANTS: Record<string, string> = {
  "ا": "", // alif: a carrier, its sound comes from the harakah or the madd
  "ب": "b",
  "ت": "t",
  "ث": "th",
  "ج": "j",
  "ح": "h",
  "خ": "kh",
  "د": "d",
  "ذ": "dh",
  "ر": "r",
  "ز": "z",
  "س": "s",
  "ش": "sh",
  "ص": "s",
  "ض": "d",
  "ط": "t",
  "ظ": "z",
  /*
    Ayn and hamzah are NOT written.

    The corpus says so: نَعَمْ is "naam", بَعِيدٌ is "baidun", المَاءُ is "al-mau",
    إِمَامٌ is "imamun". A reader who needs a transliteration is being told how
    to say the word, and an apostrophe standing for a sound English does not
    have tells them nothing they can act on. The vowels either side survive,
    which is what carries the shape.
  */
  "ع": "",
  "غ": "gh",
  "ف": "f",
  "ق": "q",
  "ك": "k",
  "ل": "l",
  "م": "m",
  "ن": "n",
  "ه": "h",
  "و": "w",
  "ي": "y",
  "ة": "h", // ta marbutah, read as h in isolation
  "ء": "", // hamzah, in every seat
  "أ": "",
  "إ": "",
  "ؤ": "",
  "ئ": "",
  "آ": "a", // alif maddah
  "ى": "a", // alif maqsurah
};

const FATHAH = "َ";
const DAMMAH = "ُ";
const KASRAH = "ِ";
const SUKUN = "ْ";
const SHADDAH = "ّ";
const FATHATAN = "ً";
const DAMMATAN = "ٌ";
const KASRATAN = "ٍ";
const DAGGER_ALIF = "ٰ";

const SHORT: Record<string, string> = { [FATHAH]: "a", [DAMMAH]: "u", [KASRAH]: "i" };
const TANWIN: Record<string, string> = {
  [FATHATAN]: "an",
  [DAMMATAN]: "un",
  [KASRATAN]: "in",
};

const ALIF = "ا";
const WAW = "و";
const YA = "ي";
const LAM = "ل";
const ALIF_MAQSURAH = "ى";

const isHarakah = (ch: string) =>
  ch === FATHAH ||
  ch === DAMMAH ||
  ch === KASRAH ||
  ch === SUKUN ||
  ch === SHADDAH ||
  ch === DAGGER_ALIF ||
  ch in TANWIN;

/*
  The definite article, which is not read the way it is written.

  Before a sun letter the lam assimilates into the following consonant and is
  not pronounced: الشَّمْسُ is ash-shamsu, not al-shamsu. The shaddah on the sun
  letter is what marks it, so the doubling falls out of the ordinary rules once
  the lam is dropped - only the lam itself is a special case.
*/
const SUN_LETTERS = new Set("تثدذرزسشصضطظلن".split(""));

/* Read aloud, a question mark is a question mark. Dropping them left phrases
   running together with no sign of where one clause ended. */
const PUNCTUATION: Record<string, string> = { "؟": "?", "،": ",", "؛": ";" };

function transliterateWord(word: string, initial: boolean): string {
  const chars = [...word];
  let out = "";
  let i = 0;
  /* The sun letter's shaddah is spent by the assimilation, so it must not also
     double the consonant. */
  let spentShaddahAt = -1;

  /*
    The definite article, which is not read the way it is written.

    Before a sun letter the lam assimilates into the following consonant:
    الشَّمْسُ is ash-shamsu, not al-shamsu. The hyphen is the corpus's convention
    and it is doing real work - "alwaraqu" hides where the article stops.
  */
  if (chars[0] === ALIF && chars[1] === LAM) {
    let k = 2;
    while (k < chars.length && isHarakah(chars[k]) && chars[k] !== SHADDAH) k += 1;
    const after = chars[k];
    const sun = after !== undefined && SUN_LETTERS.has(after);

    /*
      Hamzatu l-wasl: the article's own vowel exists only to get the word
      started, and disappears the moment anything precedes it. فِي البَيْتِ is
      "fi l-bayti", not "fi al-bayti", and عَلَى السَّاعَةِ is "ala s-saati". It is
      the single most common thing in the corpus that a letter-by-letter
      reading gets wrong.
    */
    if (sun) {
      out += (initial ? "a" : "") + (CONSONANTS[after] ?? "") + "-";
      i = k;
      /*
        Scan the whole run of marks, not just the next character. The shaddah is
        written after the vowel as often as before it - التُّفَّاحُ is ta, dammah,
        shaddah - so looking only at k+1 missed it and the consonant came out
        doubled on top of the assimilation: "at-ttuffahu".
      */
      for (let m = k + 1; m < chars.length && isHarakah(chars[m]); m += 1) {
        if (chars[m] === SHADDAH) spentShaddahAt = k;
      }
    } else {
      out += initial ? "al-" : "l-";
      i = k;
    }
  }

  for (; i < chars.length; i += 1) {
    const ch = chars[i];
    if (isHarakah(ch)) continue;

    if (ch in PUNCTUATION) {
      out += PUNCTUATION[ch];
      continue;
    }

    /*
      Ta marbutah is read as t when anything follows it and as h when nothing
      does: غُرْفَةٌ is ghurfatun, but the same letter at rest is a soft h. The
      marks have not been gathered yet at this point, so it is decided below.
    */
    const consonant = CONSONANTS[ch];
    if (consonant === undefined) {
      /* Latin punctuation and anything else passes through untouched. */
      if (!/[\u0600-\u06FF]/.test(ch)) out += ch;
      continue;
    }

    const marks: string[] = [];
    let j = i + 1;
    while (j < chars.length && isHarakah(chars[j])) {
      marks.push(chars[j]);
      j += 1;
    }

    const sound =
      ch === "ة" ? (marks.some((m) => m in SHORT || m in TANWIN) ? "t" : "h") : consonant;

    const doubled = marks.includes(SHADDAH) && i !== spentShaddahAt;
    out += doubled ? sound + sound : sound;

    /*
      A dagger alif IS a long a, on its own, with no fathah written under it.
      هٰذَا carries it on the ha and reads "hadha" - checked before everything
      else, because there is no short vowel there to fall back on.
    */
    if (marks.includes(DAGGER_ALIF)) {
      out += "a";
      continue;
    }

    /*
      A long vowel is a harakah followed by its matching letter of prolongation,
      and that letter carries no vowel of its own. Checked BEFORE the short
      vowel, because the same fathah is either "a" or the first half of a long
      one depending on what follows.
    */
    const next = chars[j];
    const nextMark = chars[j + 1];
    const bare = next !== undefined && (nextMark === undefined || !isHarakah(nextMark) || nextMark === SUKUN);

    /* ALIF_MAQSURAH prolongs exactly as alif does: عَلَى is "ala", and without
       this its own "a" landed on top of the fathah's - "alaa". */
    if (marks.includes(FATHAH) && (next === ALIF || next === ALIF_MAQSURAH) && bare) {
      out += "a";
      i = j;
      continue;
    }
    if (marks.includes(DAMMAH) && next === WAW && bare) {
      out += "u";
      i = j;
      continue;
    }
    if (marks.includes(KASRAH) && next === YA && bare) {
      out += "i";
      i = j;
      continue;
    }

    for (const m of marks) {
      if (m in TANWIN) out += TANWIN[m];
      else if (m in SHORT) out += SHORT[m];
    }

    i = j - 1;
  }

  return out;
}

export function transliterate(arabic: string): string {
  /* Only the first WORD is initial; the count ignores the whitespace the split
     keeps for rejoining. */
  let seen = 0;
  return (
    arabic
      .split(/(\s+)/)
      .map((part) => {
        if (/\s/.test(part) || part === "") return part;
        seen += 1;
        return transliterateWord(part, seen === 1);
      })
      .join("")
      .trim()
      /*
        A mark at the very end is dropped, and one in the middle is kept.

        The corpus is consistent about this and it is not arbitrary: an interior
        one shows where a clause ended and a reply began, which a reader
        sounding the phrase out needs. A trailing one only repeats what the
        Arabic above it already shows.
      */
      .replace(/[?,;]+$/, "")
      .trim()
  );
}
