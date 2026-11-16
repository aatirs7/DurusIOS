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

export type SearchResult = { hits: Hit[]; total: number; pendingTopic: string | null };

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
    .replace(/[^a-z0-9 ]/g, "")
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

  const num = /^(?:surah|surat|sura)?\s*(\d{1,3})$/i.exec(q);
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
  const hits: Hit[] = scored.map((x) => ({ kind: "surah", surah: x.surah }));

  const words = new Set(n.split(" "));
  let pendingTopic: string | null = null;
  for (const t of THEMES) {
    if (!t.keywords.some((k) => words.has(k))) continue;
    if (t.verified) hits.unshift({ kind: "theme", theme: t });
    else pendingTopic ??= t.label;
  }
  return { hits, total: hits.length, pendingTopic };
}

/* "65:2-3" -> surah 65, ayah 2. A whole surah ("94") opens at ayah 1. */
export function parseThemeRef(ref: string): { surah: number; ayah: number } {
  const [s, range] = ref.split(":");
  return { surah: Number(s), ayah: range ? Number(range.split("-")[0]) : 1 };
}
