import { FILLER } from "./search";
import { SURAHS } from "./tanzil";
import { THEMES } from "./themes";

/*
  The type-ahead library: well over a thousand natural things a person might
  type, built from the approved topics and the surah list. Typing "i feel"
  offers "I feel anxious", "I feel lonely"; typing "verses about pat" offers
  "Verses about patience". Every phrase leads somewhere real, because each is
  made from a keyword the search already answers.
*/

const FEELING = ["I feel {k}", "Feeling {k}", "What to read when {k}", "Ayahs for when I'm {k}", "Help with {k}"];
const TOPIC = ["Verses about {k}", "Ayahs on {k}", "{K} in the Quran", "What the Quran says about {k}"];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

let built: string[] | null = null;

export function phrases(): string[] {
  if (built) return built;
  const out = new Set<string>();
  for (const t of THEMES) {
    if (!t.verified) continue;
    out.add(t.label);
    /* Only keywords that carry meaning on their own; a filler word like
       "just" would make a phrase the search cannot answer. */
    const words = t.keywords.filter((k) => k.length > 2 && !/\d/.test(k) && k.split(" ").some((w) => !FILLER.has(w)));
    const forms = t.kind === "feeling" ? [...FEELING, ...TOPIC.slice(0, 2)] : t.kind === "topic" ? TOPIC : ["{K}"];
    for (const k of words.slice(0, 14)) {
      for (const f of forms) out.add(f.replace("{k}", k).replace("{K}", cap(k)));
    }
  }
  for (const s of SURAHS) {
    out.add(`Surah ${s.en}`);
    out.add(`${s.en} surah`);
  }
  for (const g of ["Longest surahs", "Shortest surahs", "Meccan surahs", "Medinan surahs", "Last ten surahs", "Surprise me", "Juz Amma"]) out.add(g);
  built = [...out];
  return built;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/*
  Completions for what has been typed: every typed word must appear, the last
  one as a prefix. Phrases that start with the query come first, then shorter
  ones, so the list reads like a natural continuation rather than a search
  index.
*/
export function complete(query: string, limit = 5): string[] {
  const q = norm(query);
  if (q.length < 2 || /[؀-ۿ]/.test(query)) return [];
  const words = q.split(" ");
  const last = words.pop()!;
  const scored: { p: string; score: number }[] = [];
  for (const p of phrases()) {
    const n = norm(p);
    const toks = n.split(" ");
    if (!words.every((w) => toks.includes(w))) continue;
    if (!toks.some((t) => t.startsWith(last))) continue;
    if (n === q) continue;
    const score = (n.startsWith(q) ? 0 : 100) + n.length;
    scored.push({ p, score });
  }
  scored.sort((a, b) => a.score - b.score);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { p } of scored) {
    const key = norm(p);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}
