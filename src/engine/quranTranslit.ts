/*
  Transliteration of a single Quran word, in Uthmani spelling, for the
  Quranic Words cards. Our own rules, so nothing licensed ships.

  The general transliterator (transliterate.ts) is for everyday vowelled
  Arabic; Uthmani script spells differently: alif wasla (ٱ), the dagger alif
  (ٰ), alif maqsura written for both ā and ī, silent letters marked with a
  small circle (۟ ۠), the small waw and yaa that lengthen a pronoun (ۥ ۦ), and
  sun letters that swallow the l of the article. This handles those for one
  word read on its own, which is how a card shows it:

    ٱللَّهِ allāhi, ٱلرَّحْمَـٰنِ ar-raḥmāni, فِى fī, عَلَىٰ ʿalā,
    ٱعْبُدُوا۟ uʿbudū, إِنَّهُۥ innahū, يَوْمَئِذٍۢ yawmaʾidhin.

  Plain letters with macrons for long vowels; ʿ for ʿayn, ʾ for a hamza
  inside a word; ḥ ṣ ḍ ṭ ẓ for the letters a learner most needs told apart.
*/

const FATHA = "َ";
const KASRA = "ِ";
const DAMMA = "ُ";
const FATHATAN = "ً";
const KASRATAN = "ٍ";
const DAMMATAN = "ٌ";
const SUKUN = "ْ";
const SHADDA = "ّ";
const DAGGER = "ٰ";
const WASLA = "ٱ";
const SILENT = new Set(["۟", "۠"]);
const SMALL_WAW = "ۥ";
const SMALL_YAA = "ۦ";
/* Marks with no sound of their own here: maddah, tatweel, small high signs,
   pause marks, the small meem and low marks that tag tanween. */
const IGNORED = /[ٕٓٔـۖ-ۜ۞ۡ-ۤۧ-ࣰۭ-ࣲ]/g;

const CONSONANT: Record<string, string> = {
  ب: "b",
  ت: "t",
  ث: "th",
  ج: "j",
  ح: "ḥ",
  خ: "kh",
  د: "d",
  ذ: "dh",
  ر: "r",
  ز: "z",
  س: "s",
  ش: "sh",
  ص: "ṣ",
  ض: "ḍ",
  ط: "ṭ",
  ظ: "ẓ",
  ع: "ʿ",
  غ: "gh",
  ف: "f",
  ق: "q",
  ك: "k",
  ل: "l",
  م: "m",
  ن: "n",
  ه: "h",
  و: "w",
  ي: "y",
  ى: "y",
  ة: "t",
};
const HAMZA = new Set(["ء", "أ", "إ", "ؤ", "ئ"]);
const SUN = new Set([
  "ت",
  "ث",
  "د",
  "ذ",
  "ر",
  "ز",
  "س",
  "ش",
  "ص",
  "ض",
  "ط",
  "ظ",
  "ل",
  "ن",
]);
const VOWEL: Record<string, string> = {
  [FATHA]: "a",
  [KASRA]: "i",
  [DAMMA]: "u",
  [FATHATAN]: "an",
  [KASRATAN]: "in",
  [DAMMATAN]: "un",
};
const isMark = (c: string | undefined) =>
  !!c &&
  (c in VOWEL ||
    c === SUKUN ||
    c === SHADDA ||
    c === DAGGER ||
    SILENT.has(c) ||
    c === SMALL_WAW ||
    c === SMALL_YAA);

type Unit = { base: string; marks: string };

function units(word: string): Unit[] {
  const out: Unit[] = [];
  for (const c of word.replace(IGNORED, "")) {
    if (isMark(c) && out.length) out[out.length - 1].marks += c;
    else out.push({ base: c, marks: "" });
  }
  return out;
}

const vowelOf = (u: Unit | undefined) => {
  if (!u) return "";
  for (const c of u.marks) if (c in VOWEL) return VOWEL[c];
  return "";
};

export function transliterateQuranWord(word: string): string {
  const us = units(word.trim());
  let out = "";
  const lengthen = (v: string) => {
    if (out.endsWith("a")) out = out.slice(0, -1) + "ā";
    else if (out.endsWith("i")) out = out.slice(0, -1) + "ī";
    else if (out.endsWith("u")) out = out.slice(0, -1) + "ū";
    else out += v;
  };

  for (let i = 0; i < us.length; i += 1) {
    const u = us[i];
    const prev = us[i - 1];
    const next = us[i + 1];
    const silent = [...u.marks].some((c) => SILENT.has(c));
    if (silent) continue;

    /* Alif wasla: the article, or a helping vowel at the very start. */
    if (u.base === WASLA) {
      /* ٱلَّيْلِ, ٱلَّذِينَ: one doubled lam, said as it is written. */
      if (next?.base === "ل" && next.marks.includes(SHADDA)) {
        if (i === 0) out += "a";
        continue;
      }
      const article = next?.base === "ل" && us[i + 2] !== undefined;
      if (i === 0) {
        if (article) out += "a";
        else out += vowelOf(us[i + 2]) === "u" ? "u" : "i";
      }
      if (article) {
        const after = us[i + 2];
        const lamSilent =
          !next.marks.includes(SUKUN) &&
          after &&
          SUN.has(after.base) &&
          after.marks.includes(SHADDA) &&
          after.base !== "ل";
        /* ٱللَّه: the lam of the name itself, not a sun letter. */
        if (after?.base === "ل") {
          /* The doubled lam of the name carries the l. */
        } else {
          out += lamSilent ? "" : "l";
          if (i === 0) out += lamSilent ? "" : "-";
        }
        if (i === 0 && lamSilent) {
          /* ar-raḥmān: the sun letter doubles; written with a hyphen. */
          out += CONSONANT[after.base] + "-";
          out += CONSONANT[after.base] + (vowelOf(after) || "");
          appendLong(after);
          i += 2;
          continue;
        }
        i += 1;
      }
      continue;
    }

    /* Long-vowel letters after a matching short vowel, and the dagger alif. */
    if (u.base === "ا") {
      if (u.marks.includes(FATHATAN)) out += "an";
      else if (i === 0) out += vowelOf(u) || "a";
      else if (prev && prev.marks.includes(FATHATAN)) continue;
      else lengthen("ā");
      continue;
    }
    /* Alif with maddah: in Uthmani spelling it marks a long ā. */
    if (u.base === "آ") {
      if (i === 0) out += "ā";
      else lengthen("ā");
      continue;
    }
    /* لِلرَّحْمَـٰنِ: an unmarked lam before a doubled sun letter is not said. */
    if (
      u.base === "ل" &&
      u.marks === "" &&
      next &&
      SUN.has(next.base) &&
      next.marks.includes(SHADDA)
    )
      continue;
    if (
      (u.base === "ى" || u.base === "ي") &&
      !vowelOf(u) &&
      !u.marks.includes(SHADDA) &&
      !u.marks.includes(SUKUN)
    ) {
      if (u.marks.includes(DAGGER) || out.endsWith("a")) {
        if (u.marks.includes(DAGGER) || u.base === "ى") {
          lengthen("ā");
          continue;
        }
      }
      if (out.endsWith("i") && !u.marks.includes(SUKUN)) {
        lengthen("ī");
        continue;
      }
    }
    if (
      u.base === "و" &&
      !vowelOf(u) &&
      !u.marks.includes(SHADDA) &&
      !u.marks.includes(SUKUN) &&
      out.endsWith("u")
    ) {
      lengthen("ū");
      continue;
    }

    let c: string;
    if (HAMZA.has(u.base)) {
      c = i === 0 || out.endsWith("-") ? "" : "ʾ";
    } else if (u.base === "ة") {
      c = vowelOf(u) ? "t" : "h";
    } else {
      c = CONSONANT[u.base] ?? "";
    }
    /* A doubled letter at the very start was assimilated into the word before. */
    if (u.marks.includes(SHADDA) && i > 0) c += c;
    out += c;
    let v = vowelOf(u);
    if (!v && i === 0 && HAMZA.has(u.base)) v = u.base === "إ" ? "i" : "a";
    out += v;
    appendLong(u);
  }

  function appendLong(u: Unit) {
    if (u.marks.includes(DAGGER)) lengthen("ā");
    if (u.marks.includes(SMALL_WAW)) lengthen("ū");
    if (u.marks.includes(SMALL_YAA)) lengthen("ī");
  }

  /* The name of Allah is said with a long ā. */
  return out.replace(/llah/, "llāh");
}
