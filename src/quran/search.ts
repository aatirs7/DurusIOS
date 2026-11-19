import { THEMES, type Theme } from "./themes";
import { JUZ_STARTS, SURAHS, TOTAL_AYAHS } from "./tanzil";

/*
  Deterministic search. No model, no network.

  Understands, in this order:
    "2:255", "2 255"          an ayah reference
    "juz 30", "juz amma"      a juz
    "18", "surah 18"          a surah number
    Arabic words              matched against Tanzil's Simple Clean text, a
                              search key that is never displayed (typed Arabic
                              does not match Uthmani spelling, e.g. the
                              dagger alef in the Uthmani "al-alamin")
    Latin words               surah names and meanings, then topics

  Topics only come back if verified (see themes.ts). When a query matches a
  topic that is still under review, the result says so instead of going
  silent.
*/

export type Hit =
  | { kind: "ayah"; surah: number; ayah: number; index: number }
  | { kind: "surah"; surah: number }
  | { kind: "juz"; juz: number; index: number }
  | { kind: "text"; surah: number; ayah: number; index: number }
  | { kind: "theme"; theme: Theme };

/* `label` heads a list answer, such as "Meccan surahs". */
export type SearchResult = { hits: Hit[]; total: number; pendingTopic: string | null; label?: string | null };

const TEXT_LIMIT = 40;

/* Harakat, Quranic marks, tatweel removed; alef and ya forms folded together. */
export function normalizeArabic(s: string): string {
  return s
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLatin(s: string): string {
  return s
    .toLowerCase()
    /* Apostrophes join ("can't" is "cant"); every other mark separates
       ("al-kursi" is "al kursi"). */
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(surah|surat|sura)\b/g, "")
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/\s+/g, " ")
    .trim();
}

/* "Al-Kahf" gives "alkahf" and "kahf"; the English meaning is the third key. */
function nameKeys(en: string, meaning: string): string[] {
  const full = normalizeLatin(en);
  const bare = full.replace(/^(al|an|ar|as|ash|at|ad|adh|az)\s?/, "").replace(/\s/g, "");
  return [full.replace(/\s/g, ""), bare, normalizeLatin(meaning)];
}

const NAME_KEYS = SURAHS.map((s) => nameKeys(s.en, s.meaning));

function surahAt(index: number) {
  let found = SURAHS[0];
  for (const s of SURAHS) {
    if (s.start > index) break;
    found = s;
  }
  return found;
}

let normalizedKeys: string[] | null = null;

export function search(raw: string, keys: () => string[]): SearchResult {
  const q = raw.trim();
  const empty: SearchResult = { hits: [], total: 0, pendingTopic: null };
  if (!q) return empty;

  const ref = /^(\d{1,3})\s*[:. ]\s*(\d{1,3})$/.exec(q);
  if (ref) {
    const surah = Number(ref[1]);
    const ayah = Number(ref[2]);
    if (surah >= 1 && surah <= 114 && ayah >= 1 && ayah <= SURAHS[surah - 1].ayahs) {
      return {
        hits: [{ kind: "ayah", surah, ayah, index: SURAHS[surah - 1].start + ayah - 1 }, { kind: "surah", surah }],
        total: 2,
        pendingTopic: null,
      };
    }
    return empty;
  }

  const juz = /^(?:juz|juzz|para|part)\s*(\d{1,2}|amma)$/i.exec(q);
  if (juz) {
    const n = juz[1].toLowerCase() === "amma" ? 30 : Number(juz[1]);
    if (n >= 1 && n <= 30) return { hits: [{ kind: "juz", juz: n, index: JUZ_STARTS[n - 1] }], total: 1, pendingTopic: null };
    return empty;
  }

  const num =
    /^(?:surah|surat|sura)?\s*(?:number\s*)?(\d{1,3})$/i.exec(q) ??
    /^(?:the\s+)?(\d{1,3})(?:st|nd|rd|th)(?:\s+(?:surah|surat|sura|chapter))?$/i.exec(q);
  if (num) {
    const n = Number(num[1]);
    return n >= 1 && n <= 114 ? { hits: [{ kind: "surah", surah: n }], total: 1, pendingTopic: null } : empty;
  }

  if (/[؀-ۿ]/.test(q)) {
    const needle = normalizeArabic(q);
    if (!needle) return empty;
    const hits: Hit[] = [];
    for (const s of SURAHS) if (normalizeArabic(s.ar).includes(needle)) hits.push({ kind: "surah", surah: s.n });
    if (!normalizedKeys) normalizedKeys = keys().map(normalizeArabic);
    let total = hits.length;
    for (let i = 0; i < TOTAL_AYAHS; i++) {
      if (!normalizedKeys[i].includes(needle)) continue;
      total++;
      if (hits.length < TEXT_LIMIT) {
        const s = surahAt(i);
        hits.push({ kind: "text", surah: s.n, ayah: i - s.start + 1, index: i });
      }
    }
    return { hits, total, pendingTopic: null };
  }

  const n = normalizeLatin(q);

  /* General questions answered from the metadata. */
  const general = generalQuery(n);
  if (general) return general;

  const compact = n.replace(/\s/g, "");
  const scored: { surah: number; score: number }[] = [];
  NAME_KEYS.forEach((k, i) => {
    let score = 0;
    if (k[0] === compact || k[1] === compact) score = 3;
    else if (compact.length >= 2 && (k[0].startsWith(compact) || k[1].startsWith(compact))) score = 2;
    else if (compact.length >= 3 && (k[0].includes(compact) || k[1].includes(compact) || k[2].includes(n))) score = 1;
    if (score) scored.push({ surah: i + 1, score });
  });
  scored.sort((a, b) => b.score - a.score || a.surah - b.surah);
  const surahHits: Hit[] = scored.map((x) => ({ kind: "surah", surah: x.surah }));
  const exactSurah = scored.length > 0 && scored[0].score === 3;

  const topics = matchThemes(n);
  const verified = topics.filter((t) => t.theme.verified);
  const pending = topics.find((t) => !t.theme.verified && (verified.length === 0 || t.score > verified[0].score));
  const themeHits: Hit[] = verified.slice(0, 6).map((t) => ({ kind: "theme", theme: t.theme }));

  /* A whole-name surah match leads; otherwise topics lead, because a phrase
     like "i cant sleep" is about a feeling, not a surah called "sleep". */
  const hits = exactSurah ? [...surahHits, ...themeHits] : [...themeHits, ...surahHits];
  return { hits, total: hits.length, pendingTopic: pending ? pending.theme.label : null, label: null };
}

/* ---------- topic matching ---------- */

/* Words that carry no topic: "i feel so anxious about work" keeps "anxious work". */
const FILLER = new Set(
  (
    "i im ive id me my myself am is are was were be been being feel feeling feels felt so very really just kind of a an the " +
    "about on for to of in at with when what which who how why do does did should can could would will want need help " +
    "please verse verses ayah ayahs ayat surah surat sura quran read reading recite something some any that this " +
    "its it give show find tell talk lot little bit today right now lately always never again more most dealing going through"
  ).split(" "),
);

/* Simple ending folds, so "worrying", "worried" and "worries" meet "worry". */
export function stem(w: string): string {
  if (w.length <= 4) return w;
  return w
    .replace(/(ies|ied)$/, "y")
    .replace(/(ing|ness|ful|ment)$/, "")
    .replace(/(ed|ly|es)$/, "")
    .replace(/s$/, "");
}

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  /* Two neighbouring letters swapped ("anxeity") counts as one slip. */
  if (a.length === b.length) {
    const i = [...a].findIndex((c, k) => c !== b[k]);
    if (i >= 0 && i + 1 < a.length && a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2)) return true;
  }
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function wordMatches(queryWord: string, keyWord: string, fuzzy = true): boolean {
  if (queryWord === keyWord) return true;
  const a = stem(queryWord);
  const b = stem(keyWord);
  if (a === b) return true;
  if (!fuzzy) return false;
  /* One typo is forgiven only in longer words, where it cannot turn one real
     word into another. */
  return a.length >= 5 && b.length >= 5 && editDistanceAtMostOne(a, b);
}

type Prepared = { theme: Theme; keys: string[][] };
let prepared: Prepared[] | null = null;
function prepare(): Prepared[] {
  if (!prepared) {
    prepared = THEMES.map((theme) => ({
      theme,
      /* A topic always answers to its own name too. */
      keys: [theme.label, ...theme.keywords].map((k) => normalizeLatin(k).split(" ").filter(Boolean)),
    }));
  }
  return prepared;
}

/*
  Scores every topic against the query. A keyword phrase scores by its length
  when all its words appear in order; single words score 1. Filler is matched
  inside phrases ("cant sleep") but never on its own.
*/
export { FILLER };

export function matchThemes(normalized: string): { theme: Theme; score: number }[] {
  const all = normalized.split(" ").filter(Boolean);
  const content = all.filter((w) => !FILLER.has(w));
  /* A word that already matches some keyword exactly is not also read as a
     typo of a different one ("hopeless" is not "homeless"). */
  const exact = new Set(content.filter((w) => prepare().some((p) => p.keys.some((k) => k.some((kw) => wordMatches(w, kw, false))))));
  const out: { theme: Theme; score: number }[] = [];
  for (const p of prepare()) {
    let best = 0;
    for (const key of p.keys) {
      if (key.length === 0) continue;
      if (key.length === 1) {
        if (FILLER.has(key[0])) continue;
        if (content.some((w) => wordMatches(w, key[0], !exact.has(w)))) best = Math.max(best, 1);
        continue;
      }
      /* Phrase: its words in order, allowing filler between them. */
      let k = 0;
      for (const w of all) if (k < key.length && wordMatches(w, key[k], !exact.has(w))) k++;
      if (k === key.length) best = Math.max(best, key.length + 1);
    }
    if (best > 0) out.push({ theme: p.theme, score: best });
  }
  return out.sort((a, b) => b.score - a.score || Number(b.theme.verified) - Number(a.theme.verified));
}

/* ---------- general questions ---------- */

const bySize = [...SURAHS].sort((a, b) => b.ayahs - a.ayahs || a.n - b.n);

function list(label: string, surahs: number[]): SearchResult {
  return { hits: surahs.map((s) => ({ kind: "surah", surah: s })), total: surahs.length, pendingTopic: null, label };
}

export function generalQuery(n: string): SearchResult | null {
  const has = (...w: string[]) => w.every((x) => n.split(" ").includes(x));
  if (/\b(random|surprise me|any ayah|random ayah|pick (one|an ayah)|shuffle)\b/.test(n)) {
    const index = Math.floor(Math.random() * TOTAL_AYAHS);
    const s = SURAHS.filter((x) => x.start <= index).pop()!;
    return { hits: [{ kind: "ayah", surah: s.n, ayah: index - s.start + 1, index }], total: 1, pendingTopic: null, label: "A random ayah" };
  }
  if (has("longest") && !/(ayah|verse)/.test(n)) return list("Longest surahs by ayahs", bySize.slice(0, 10).map((s) => s.n));
  if (has("shortest") || /\b(short|small|easy) (surah|surahs|ones)\b/.test(n) || n === "short surahs")
    return list("Shortest surahs by ayahs", [...bySize].reverse().slice(0, 15).map((s) => s.n));
  if (/\b(meccan|makki|makkan|mecca|makkah) (surah|surahs)\b|^(meccan|makki)$/.test(n))
    return list("Meccan surahs", SURAHS.filter((s) => s.place === "Meccan").map((s) => s.n));
  if (/\b(medinan|madani|medina|madinah) (surah|surahs)\b|^(medinan|madani)$/.test(n))
    return list("Medinan surahs", SURAHS.filter((s) => s.place === "Medinan").map((s) => s.n));
  if (/\blast (ten|10) (surah|surahs)\b|^last (ten|10)$/.test(n)) return list("The last ten surahs", SURAHS.slice(104).map((s) => s.n));
  if (/\bjuz amma (surah|surahs)\b/.test(n)) return list("Surahs of Juz Amma", SURAHS.slice(77).map((s) => s.n));
  const count = /\b(\d{1,3}) (ayah|ayahs|ayat|verse|verses)\b/.exec(n);
  if (count && /\b(surah|surahs|with)\b/.test(n)) {
    const k = Number(count[1]);
    return list(`Surahs with ${k} ayahs`, SURAHS.filter((s) => s.ayahs === k).map((s) => s.n));
  }
  return null;
}

/* Type-ahead: up to six completions for what has been typed so far. */
export function suggest(raw: string): string[] {
  const n = normalizeLatin(raw);
  if (n.length < 2 || /\d/.test(n) || /[؀-ۿ]/.test(raw)) return [];
  const out = new Set<string>();
  for (const t of THEMES) if (t.verified && normalizeLatin(t.label).startsWith(n)) out.add(t.label);
  for (const s of SURAHS) if (normalizeLatin(s.en).replace(/\s/g, "").includes(n.replace(/\s/g, ""))) out.add(s.en);
  for (const g of ["Longest surahs", "Shortest surahs", "Meccan surahs", "Medinan surahs", "Last ten surahs", "Surprise me"])
    if (normalizeLatin(g).startsWith(n)) out.add(g);
  return [...out].slice(0, 6);
}

/* "65:2-3" -> surah 65, ayah 2. A whole surah ("94") opens at ayah 1. */
export function parseThemeRef(ref: string): { surah: number; ayah: number } {
  const [s, range] = ref.split(":");
  return { surah: Number(s), ayah: range ? Number(range.split("-")[0]) : 1 };
}
