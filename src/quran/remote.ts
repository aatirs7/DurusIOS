import { Directory, File, Paths } from "expo-file-system";

import { isStale, type QfChapter } from "./qf";

/*
  Quran Foundation content on the phone: fetched from the Durus server one
  surah at a time, kept in the app's document folder, and used offline.

  Rules (from the owner's handoff, the stricter reading while Quran
  Foundation's own terms page is unavailable):
  - Nothing of theirs ships inside the app bundle. A surah is downloaded the
    first time it is opened with a translation or word view.
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
export async function loadChapter(surah: number, translationId: number | null, reciterId: number | null): Promise<QfChapter> {
  if (!quranApiConfigured()) throw new Error("Quran Foundation content is not connected yet");
  const f = fileFor(surah, translationId, reciterId);
  const stored = await readStored(f);
  if (stored && !isStale(stored, Date.now())) return stored;
  try {
    const fresh = await download(surah, translationId, reciterId);
    f.write(JSON.stringify(fresh));
    return fresh;
  } catch (e) {
    if (stored) return stored;
    throw e;
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
  try {
    const d = new Directory(Paths.document, "quran-foundation");
    if (d.exists) d.delete();
  } catch {
    /* Nothing stored. */
  }
}
