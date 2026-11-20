import { Directory, File, Paths } from "expo-file-system";

import { RESYNC_MS, isStale, type QfChapter } from "./qf";

/*
  Quran Foundation content on the phone: fetched from the Durus server one
  surah at a time, kept in the app's document folder, and used offline.

  Rules (from the owner's handoff, the stricter reading while Quran
  Foundation's own terms page is unavailable):
  - Nothing of theirs ships inside the app bundle. Every surah is downloaded
    in the background after install (syncAllChapters, on each app open), and
    a surah opened before that finishes is fetched first.
  - A stored copy is refreshed once it is older than seven days, whenever the
    phone is online. Offline, the stored copy is used whatever its age.

  The server address comes from EXPO_PUBLIC_QURAN_API. Until it is set, every
  view that needs this content stays marked "Comes with Quran.com".
*/

const API = process.env.EXPO_PUBLIC_QURAN_API ?? "";
const KEY = process.env.EXPO_PUBLIC_DURUS_KEY ?? "";

export function quranApiConfigured(): boolean {
  return API.length > 0;
}

function dir(): Directory {
  const d = new Directory(Paths.document, "quran-foundation");
  if (!d.exists) d.create({ idempotent: true, intermediates: true });
  return d;
}

const fileFor = (surah: number, translationId: number | null, reciterId: number | null) =>
  new File(dir(), `chapter-${surah}-t${translationId ?? 0}-r${reciterId ?? 0}.json`);

async function readStored(f: File): Promise<QfChapter | null> {
  try {
    return f.exists ? (JSON.parse(await f.text()) as QfChapter) : null;
  } catch {
    return null;
  }
}

async function download(surah: number, translationId: number | null, reciterId: number | null): Promise<QfChapter> {
  const q = new URLSearchParams();
  if (translationId !== null) q.set("translation", String(translationId));
  if (reciterId !== null) q.set("reciter", String(reciterId));
  const res = await fetch(`${API.replace(/\/$/, "")}/quran/chapter/${surah}?${q}`, { headers: KEY ? { "x-durus-key": KEY } : {} });
  if (!res.ok) throw new Error(`chapter ${surah}: ${res.status}`);
  return (await res.json()) as QfChapter;
}

/*
  The stored copy if fresh, a new download if not, and the stale stored copy
  if the download fails (offline). Throws only when there is nothing at all.
*/
/*
  Kept in memory too, and a stale stored copy is shown at once while the
  fresh one downloads behind it (the next open uses it), so a surah opened
  before never waits on the network. Requests for the same surah share one
  download.
*/
const memory = new Map<string, QfChapter>();
const inflight = new Map<string, Promise<QfChapter>>();

function fetchAndStore(key: string, f: File, surah: number, translationId: number | null, reciterId: number | null): Promise<QfChapter> {
  const running = inflight.get(key);
  if (running) return running;
  const p = download(surah, translationId, reciterId)
    .then((fresh) => {
      f.write(JSON.stringify(fresh));
      memory.set(key, fresh);
      return fresh;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export async function loadChapter(surah: number, translationId: number | null, reciterId: number | null): Promise<QfChapter> {
  if (!quranApiConfigured()) throw new Error("Quran Foundation content is not connected yet");
  const key = `${surah}-${translationId ?? 0}-${reciterId ?? 0}`;
  const hot = memory.get(key);
  if (hot) return hot;
  const f = fileFor(surah, translationId, reciterId);
  const stored = await readStored(f);
  if (stored) {
    memory.set(key, stored);
    if (isStale(stored, Date.now())) fetchAndStore(key, f, surah, translationId, reciterId).catch(() => undefined);
    return stored;
  }
  return fetchAndStore(key, f, surah, translationId, reciterId);
}

/* Fetch surahs ahead of need, one at a time, quietly. */
export async function prefetchChapters(surahs: number[], translationId: number | null, reciterId: number | null) {
  if (!quranApiConfigured()) return;
  for (const n of surahs) {
    if (n < 1 || n > 114) continue;
    try {
      await loadChapter(n, translationId, reciterId);
    } catch {
      return;
    }
  }
}

/*
  Every surah, kept on the phone: called on each app open. Downloads any surah
  not stored yet, and re-downloads any stored more than seven days ago (Quran
  Foundation's sync rule), one at a time, quietly, after the first screen is
  up. Files only: nothing is held in memory, so the reader's own cache stays
  small. Text and timings only; recitation audio is streamed, never stored.
  Stops at the first failure (offline) and picks up on the next open.
*/
let syncing = false;
export async function syncAllChapters(translationId: number | null, reciterId: number | null) {
  if (!quranApiConfigured() || syncing) return;
  syncing = true;
  try {
    for (let n = 1; n <= 114; n += 1) {
      const f = fileFor(n, translationId, reciterId);
      const at = f.exists ? f.modificationTime : null;
      if (at !== null && at !== undefined && Date.now() - at < RESYNC_MS) continue;
      const key = `${n}-${translationId ?? 0}-${reciterId ?? 0}`;
      try {
        if (inflight.has(key)) {
          await inflight.get(key);
          continue;
        }
        const fresh = await download(n, translationId, reciterId);
        f.write(JSON.stringify(fresh));
        /* A surah the reader already holds gets the fresh copy too. */
        if (memory.has(key)) memory.set(key, fresh);
      } catch {
        return;
      }
    }
  } finally {
    syncing = false;
  }
}

/* Every stored surah, for a later "download all for offline" control and for clearing. */
export function storedChapters(): string[] {
  try {
    return dir()
      .list()
      .filter((x) => x instanceof File)
      .map((x) => x.name);
  } catch {
    return [];
  }
}

export function clearStoredChapters() {
  memory.clear();
  try {
    const d = new Directory(Paths.document, "quran-foundation");
    if (d.exists) d.delete();
  } catch {
    /* Nothing stored. */
  }
}

/*
  English for a handful of ayahs, for search results. Each ayah's translation
  is kept on the phone once fetched, so a repeat search, or one made offline,
  shows it without a network.
*/
type VerseCache = Record<string, string>;
const verseCaches = new Map<number, VerseCache>();

function verseFile(translationId: number) {
  return new File(dir(), `verses-t${translationId}.json`);
}

async function verseCache(translationId: number): Promise<VerseCache> {
  const hit = verseCaches.get(translationId);
  if (hit) return hit;
  let c: VerseCache = {};
  try {
    const f = verseFile(translationId);
    if (f.exists) c = JSON.parse(await f.text()) as VerseCache;
  } catch {
    c = {};
  }
  verseCaches.set(translationId, c);
  return c;
}

export async function loadVerseTranslations(keys: string[], translationId: number): Promise<VerseCache> {
  const cache = await verseCache(translationId);
  const missing = keys.filter((k) => cache[k] === undefined).slice(0, 20);
  if (missing.length === 0 || !quranApiConfigured()) return cache;
  try {
    const res = await fetch(`${API.replace(/\/$/, "")}/quran/verses?keys=${missing.join(",")}&translation=${translationId}`, {
      headers: KEY ? { "x-durus-key": KEY } : {},
    });
    if (res.ok) {
      const j = (await res.json()) as { verses: { key: string; translation: { text?: string }[] | null }[] };
      for (const v of j.verses) cache[v.key] = (v.translation ?? []).map((p) => p.text ?? "").join("").trim();
      verseFile(translationId).write(JSON.stringify(cache));
    }
  } catch {
    /* Offline: whatever is cached is what shows. */
  }
  return cache;
}

/*
  English word-by-word meanings for up to 60 ayahs (the server's /quran/words),
  each ayah's meanings in word order. Throws when offline or not connected, so
  the caller keeps whatever it has stored.
*/
export async function fetchWordMeanings(keys: string[]): Promise<Record<string, (string | null)[]>> {
  if (!quranApiConfigured()) throw new Error("Quran Foundation content is not connected yet");
  const res = await fetch(`${API.replace(/\/$/, "")}/quran/words?keys=${keys.slice(0, 60).join(",")}`, {
    headers: KEY ? { "x-durus-key": KEY } : {},
  });
  if (!res.ok) throw new Error(`words: ${res.status}`);
  const j = (await res.json()) as { verses: { key: string; meanings: (string | null)[] }[] };
  const out: Record<string, (string | null)[]> = {};
  for (const v of j.verses ?? []) if (Array.isArray(v.meanings)) out[v.key] = v.meanings;
  return out;
}

/*
  Ask: free AI picks for anything typed (the server's /quran/ask). The AI only
  names places; the server checks every ref before it leaves, and the app
  shows each place with its own Tanzil text. Kept in memory per query, so
  typing back to an earlier question is instant. Offline it returns nothing
  and search stays local.
*/
export type AskAnswer = { line: string; results: { ref: string; reason: string }[] };
const asked = new Map<string, AskAnswer>();

export function askKey(q: string): string {
  return q.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 200);
}

export async function askQuran(q: string): Promise<AskAnswer | null> {
  const k = askKey(q);
  if (k.length < 3 || !quranApiConfigured()) return null;
  const hit = asked.get(k);
  if (hit) return hit;
  try {
    const res = await fetch(`${API.replace(/\/$/, "")}/quran/ask?q=${encodeURIComponent(k)}`, { headers: KEY ? { "x-durus-key": KEY } : {} });
    if (!res.ok) return null;
    const a = (await res.json()) as AskAnswer;
    if (!a || !Array.isArray(a.results)) return null;
    asked.set(k, a);
    return a;
  } catch {
    return null;
  }
}
