/*
  Generates the app's Quran data from the official Tanzil downloads.

  TEMPORARY SOURCE. Approved by the owner for onboarding (issue #3) and then
  for the Read tab and the Map (2026-11-16, in the terminal), until Quran
  Foundation Content Sync is live. When it is, this script and its outputs are
  replaced by synced data.

  The Quran text is copied mechanically, byte for byte. Nothing here edits,
  normalises or retypes it: that is both the authenticity rule and Tanzil's
  licence ("CHANGING IT IS NOT ALLOWED").

  Outputs:
    src/quran/tanzil.ts          metadata, the credit, and the few ayahs onboarding shows
    assets/quran/uthmani.json    the full Uthmani text, verbatim, with Tanzil's notice
    assets/quran/search.json     the Simple Clean text, used ONLY as a search key, never shown

  Usage:
    1. Download, agreeing to the terms on tanzil.net:
       https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true
       https://tanzil.net/pub/download/index.php?quranType=simple-clean&outType=txt-2&agree=true
       https://tanzil.net/res/text/metadata/quran-data.xml
    2. npx tsx scripts/make-tanzil.ts <quran-uthmani.txt> <quran-simple-clean.txt> <quran-data.xml> <YYYY-MM-DD>
*/
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [textPath, cleanPath, dataPath, downloaded] = process.argv.slice(2);
if (!textPath || !cleanPath || !dataPath || !/^\d{4}-\d{2}-\d{2}$/.test(downloaded ?? "")) {
  console.error("usage: make-tanzil.ts <quran-uthmani.txt> <quran-simple-clean.txt> <quran-data.xml> <YYYY-MM-DD>");
  process.exit(1);
}

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

function readText(path: string) {
  const raw = readFileSync(path);
  const text = raw.toString("utf8");
  const version = /Tanzil Quran Text \(([^)]+)\)/.exec(text)?.[1];
  if (!version) throw new Error(`No Tanzil version line in ${path}`);
  const notice = text
    .split("\n")
    .filter((l) => l.startsWith("#"))
    .map((l) => l.replace(/\r$/, ""))
    .join("\n");
  const lines = new Map<string, string>();
  for (const line of text.split("\n")) {
    const m = /^(\d+)\|(\d+)\|(.*)$/.exec(line.replace(/\r$/, ""));
    if (m) lines.set(`${m[1]}:${m[2]}`, m[3]);
  }
  return { raw, version, notice, lines };
}

const uthmani = readText(textPath);
const clean = readText(cleanPath);

/* ---------- metadata ---------- */

const dataRaw = readFileSync(dataPath);
const xml = dataRaw.toString("utf8");
const attr = (tag: string, name: string) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1] ?? "";

const surahs = [...xml.matchAll(/<sura [^>]*\/>/g)].map((m) => ({
  n: Number(attr(m[0], "index")),
  ayahs: Number(attr(m[0], "ayas")),
  start: Number(attr(m[0], "start")),
  ar: attr(m[0], "name"),
  en: attr(m[0], "tname"),
  meaning: attr(m[0], "ename"),
  place: attr(m[0], "type"),
}));
if (surahs.length !== 114) throw new Error(`Expected 114 surahs, got ${surahs.length}`);

const juz = [...xml.matchAll(/<juz [^>]*\/>/g)].map((m) => surahs[Number(attr(m[0], "sura")) - 1].start + Number(attr(m[0], "aya")) - 1);
if (juz.length !== 30) throw new Error(`Expected 30 juz, got ${juz.length}`);

const total = surahs.reduce((n, s) => n + s.ayahs, 0);
if (total !== 6236) throw new Error(`Expected 6236 ayahs, got ${total}`);

/* ---------- full text in mushaf order ---------- */

const text: string[] = [];
const search: string[] = [];
for (const s of surahs) {
  for (let a = 1; a <= s.ayahs; a++) {
    const t = uthmani.lines.get(`${s.n}:${a}`);
    const c = clean.lines.get(`${s.n}:${a}`);
    if (t === undefined || c === undefined) throw new Error(`Missing ${s.n}:${a}`);
    text.push(t);
    search.push(c);
  }
}

/*
  The basmala at the head of each surah.

  Tanzil writes it into the first ayah's line for every surah except Al-Fatiha
  (where it IS ayah 1) and At-Tawbah (which has none). The reader shows it as a
  header, so the split point is recorded here: the first four words. The text
  itself is not changed; the reader renders words 1 to 4 above and the rest as
  the ayah, and the check below proves the two rejoin to the original exactly.
  Matching on words 2 to 4 rather than the whole basmala is deliberate: a few
  surahs carry a different mark on the first letter (95:1 has a shadda), which
  an exact prefix test would miss.
*/
const basmalaWords = text[0].split(" ");
const split: number[] = [];
for (const s of surahs) {
  if (s.n === 1 || s.n === 9) continue;
  const line = text[s.start];
  const words = line.split(" ");
  const same = words.slice(1, 4).join(" ") === basmalaWords.slice(1, 4).join(" ");
  if (!same) throw new Error(`Surah ${s.n} does not open with the basmala`);
  const head = words.slice(0, 4).join(" ");
  const rest = words.slice(4).join(" ");
  if (`${head} ${rest}` !== line) throw new Error(`Split of ${s.n}:1 does not rejoin`);
  split.push(s.n);

  /* The search key carries the same leading basmala. It is never shown, so it
     is trimmed here, or every query for its words would match 112 first
     ayahs. Checked the same way as the text. */
  const keyWords = search[s.start].split(" ");
  const cleanBasmala = search[0].split(" ");
  if (keyWords.slice(0, 4).join(" ") !== cleanBasmala.join(" ")) throw new Error(`Search key for ${s.n}:1 does not open with the basmala`);
  search[s.start] = keyWords.slice(4).join(" ");
}
if (split.length !== 112) throw new Error(`Expected 112 basmala splits, got ${split.length}`);

/* ---------- write ---------- */

const WANT = ["1:1", "1:2", "1:3", "13:28", "94:5"];
const ayahs: Record<string, string> = {};
for (const k of WANT) ayahs[k] = uthmani.lines.get(k)!;

const header = `/*
  GENERATED by scripts/make-tanzil.ts. Do not edit by hand.

  Temporary source: onboarding (issue #3), then the Read tab and the Map
  (owner, 2026-11-16), until Quran Foundation Content Sync replaces it.

  Source: Tanzil Project, tanzil.net, downloaded ${downloaded}
    Uthmani text:  ${uthmani.version}, sha256 ${sha(uthmani.raw)}
    Search key:    ${clean.version}, sha256 ${sha(clean.raw)} (never displayed)
    Metadata:      quran-data.xml, sha256 ${sha(dataRaw)}

  Quran text is copied verbatim. Tanzil's terms forbid changing it and require
  its notice in every copy, so it follows.

${uthmani.notice
  .split("\n")
  .map((l) => `  ${l}`)
  .join("\n")}
*/
`;

const ts = `${header}
export const TANZIL_CREDIT = {
  name: "Tanzil Project",
  url: "https://tanzil.net",
  version: ${JSON.stringify(uthmani.version)},
} as const;

/* The few ayahs onboarding shows, verbatim, keyed "surah:ayah". */
export const AYAHS = ${JSON.stringify(ayahs, null, 2)} as const;

export type SurahMeta = {
  n: number;
  ayahs: number;
  /* Global index of the surah's first ayah, from 0. */
  start: number;
  ar: string;
  en: string;
  meaning: string;
  place: string;
};

export const SURAHS: SurahMeta[] = ${JSON.stringify(surahs)};

/* Global index, from 0, of the first ayah of each juz. */
export const JUZ_STARTS: number[] = ${JSON.stringify(juz)};

export const TOTAL_AYAHS = ${total};

/* Surahs whose first ayah line opens with the basmala, split after word 4 for display. */
export const BASMALA_SPLIT: number[] = ${JSON.stringify(split)};
`;

const root = resolve(__dirname, "..");
writeFileSync(resolve(root, "src/quran/tanzil.ts"), ts);
writeFileSync(
  resolve(root, "assets/quran/uthmani.json"),
  JSON.stringify({ source: "Tanzil Project, tanzil.net", version: uthmani.version, downloaded, notice: uthmani.notice, text }),
);
writeFileSync(
  resolve(root, "assets/quran/search.json"),
  JSON.stringify({ source: "Tanzil Project, tanzil.net", version: clean.version, downloaded, notice: clean.notice, use: "search key only, never displayed", text: search }),
);
console.log(`ok: ${text.length} ayahs, ${split.length} basmala splits`);
