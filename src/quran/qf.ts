/*
  The shape of Quran Foundation content in Durus, and the pure functions that
  turn Content API v4 responses into it. Shared by the server (which fetches)
  and the app (which caches and renders). No network here.

  Verified against real prelive responses (2026-11-18):
    verses[].verse_key, verses[].words[] with text_uthmani, translation.text,
    transliteration.text, audio_url ("wbw/001_002_001.mp3", null on the end
    marker), char_type_name ("word" or "end"); verses[].audio with url
    ("Alafasy/mp3/001002.mp3") and segments [[wordIndex, wordPosition,
    fromMs, toMs]]; verses[].translations[] with resource_id and text, where
    footnotes are inline as <sup foot_note=ID>N</sup>.
*/

export const WORD_AUDIO_BASE = "https://audio.qurancdn.com/";
export const VERSE_AUDIO_BASE = "https://verses.quran.foundation/";

export type QfWord = {
  position: number;
  text: string;
  meaning: string | null;
  translit: string | null;
  audio: string | null;
};

export type TranslationPart = { text: string } | { footnote: number; mark: string };

export type QfAyah = {
  key: string;
  words: QfWord[];
  translation: TranslationPart[] | null;
  audio: { url: string; segments: [number, number, number, number][] } | null;
};

export type QfChapter = {
  surah: number;
  translationId: number | null;
  translationName: string | null;
  reciterId: number | null;
  ayahs: QfAyah[];
  footnotes: Record<number, string>;
  /* When the server fetched it. The app refreshes copies older than seven days. */
  fetchedAt: number;
  env: "prelive" | "production";
};

/* Raw v4 shapes, only the fields Durus reads. */
type RawWord = {
  position: number;
  char_type_name: string;
  text_uthmani?: string;
  text?: string;
  audio_url: string | null;
  translation?: { text: string | null };
  transliteration?: { text: string | null };
};
export type RawVerse = {
  verse_key: string;
  words?: RawWord[];
  translations?: { resource_id: number; text: string }[];
  audio?: { url: string; segments?: [number, number, number, number][] };
};

const absolute = (base: string, path: string) => (/^https?:\/\//.test(path) ? path : base + path.replace(/^\//, ""));

/*
  Translation text to parts. Footnote marks become their own parts so the app
  can render them as small tappable superscripts; every other tag is dropped
  and its text kept, so no markup ever reaches the screen.
*/
export function parseTranslation(html: string): TranslationPart[] {
  const parts: TranslationPart[] = [];
  const re = /<sup\s+foot_note=["']?(\d+)["']?\s*>(.*?)<\/sup>/gi;
  let last = 0;
  const pushText = (t: string) => {
    const clean = t
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    if (clean) parts.push({ text: clean });
  };
  for (let m = re.exec(html); m; m = re.exec(html)) {
    pushText(html.slice(last, m.index));
    parts.push({ footnote: Number(m[1]), mark: m[2].replace(/<[^>]+>/g, "") });
    last = m.index + m[0].length;
  }
  pushText(html.slice(last));
  return parts;
}

export function footnoteIds(parts: TranslationPart[] | null): number[] {
  return (parts ?? []).flatMap((p) => ("footnote" in p ? [p.footnote] : []));
}

export function normalizeVerse(v: RawVerse, translationId: number | null): QfAyah {
  const words = (v.words ?? [])
    .filter((w) => w.char_type_name === "word")
    .map((w) => ({
      position: w.position,
      text: w.text_uthmani ?? w.text ?? "",
      meaning: w.translation?.text ?? null,
      translit: w.transliteration?.text ?? null,
      audio: w.audio_url ? absolute(WORD_AUDIO_BASE, w.audio_url) : null,
    }));
  const t = translationId === null ? undefined : v.translations?.find((x) => x.resource_id === translationId) ?? v.translations?.[0];
  return {
    key: v.verse_key,
    words,
    translation: t ? parseTranslation(t.text) : null,
    audio: v.audio?.url ? { url: absolute(VERSE_AUDIO_BASE, v.audio.url), segments: v.audio.segments ?? [] } : null,
  };
}

/* A cached copy is due for refresh after seven days, per the handoff's sync rule. */
export const RESYNC_MS = 7 * 24 * 60 * 60 * 1000;
export function isStale(c: Pick<QfChapter, "fetchedAt">, now: number): boolean {
  return now - c.fetchedAt > RESYNC_MS;
}

/* English translations available to the Durus production client (2026-11-18).
   The Clear Quran (131) is not licensed to it. */
export const TRANSLATIONS: { id: number; name: string }[] = [
  { id: 20, name: "Saheeh International" },
  { id: 85, name: "Abdel Haleem" },
  { id: 19, name: "Pickthall" },
  { id: 22, name: "Yusuf Ali" },
  { id: 203, name: "Hilali and Khan" },
  { id: 84, name: "Taqi Usmani" },
];
export const translationName = (id: number) => TRANSLATIONS.find((t) => t.id === id)?.name ?? "Translation";
