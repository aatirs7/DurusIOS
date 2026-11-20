import { Directory, File, Paths } from "expo-file-system";
import { useSyncExternalStore } from "react";

import type { QfAyah, QfChapter } from "./qf";
import { chapterFromDisk, onChapterRefreshed } from "./remote";

/*
  Recitation for offline listening: verse files the learner chooses to
  download, kept on the phone with no time limit.

  Quran Foundation's conditions (their email of 2026-11-20, 11:40, and the
  FAQ "Can my app let users download recitations for offline listening"):
  - Only when the learner chooses it: a surah's Download, or Download all in
    Settings. Nothing is downloaded on its own.
  - Kept in the app's own document folder, which no other app can read, and
    never exported or shared.
  - Quran Foundation and the reciter are credited wherever downloads show.
  - Deleted when the learner removes them (per surah, or all), and if Quran
    Foundation asks or access ends (removeAllRecitations).
  - The records stay current: every surah's records re-sync weekly
    (syncAllChapters), and each re-sync is checked here. A verse whose audio
    URL changed is downloaded again and the old file deleted; a verse whose
    recitation was removed is deleted.

  Word clips are cut from these files at play time with the timing segments
  (playClip), never saved separately.

  Layout: Documents/recitations/r<reciter>/<sss><aaa>.mp3, plus index.json
  recording which URL each file came from and which surahs were chosen.
*/

type Index = { surahs: number[]; files: Record<string, string> };
type Progress = { surah: number; done: number; total: number } | null;

const indexes = new Map<number, Index>();
let progress: Progress = null;
let queue: { surahs: number[]; translationId: number | null; reciterId: number } | null = null;
let cancelled = false;
let version = 0;
const listeners = new Set<() => void>();
const emit = () => {
  version += 1;
  for (const f of listeners) f();
};

/* Display names for credit lines; Quran Foundation's recitation ids. */
const RECITERS: Record<number, string> = { 7: "Mishari Rashid al-Afasy" };
export const reciterName = (id: number) => RECITERS[id] ?? "the reciter";
export const recitationCredit = (id: number) => `Recitation by ${reciterName(id)}, provided by Quran Foundation`;

function dir(reciterId: number): Directory {
  const d = new Directory(Paths.document, "recitations", `r${reciterId}`);
  if (!d.exists) d.create({ idempotent: true, intermediates: true });
  return d;
}

const fileName = (key: string) => {
  const [s, a] = key.split(":").map(Number);
  return `${String(s).padStart(3, "0")}${String(a).padStart(3, "0")}.mp3`;
};
const fileFor = (reciterId: number, key: string) => new File(dir(reciterId), fileName(key));
const indexFile = (reciterId: number) => new File(dir(reciterId), "index.json");

function index(reciterId: number): Index {
  const hit = indexes.get(reciterId);
  if (hit) return hit;
  let ix: Index = { surahs: [], files: {} };
  try {
    const f = indexFile(reciterId);
    if (f.exists) {
      const j = JSON.parse(f.textSync()) as Index;
      if (j && Array.isArray(j.surahs) && j.files) ix = j;
    }
  } catch {
    /* A broken index starts empty; files are re-downloaded on request. */
  }
  indexes.set(reciterId, ix);
  return ix;
}

function save(reciterId: number) {
  try {
    indexFile(reciterId).write(JSON.stringify(index(reciterId)));
  } catch {
    /* Kept in memory until the next write. */
  }
}

function remove(reciterId: number, key: string) {
  try {
    const f = fileFor(reciterId, key);
    if (f.exists) f.delete();
  } catch {
    /* Already gone. */
  }
  delete index(reciterId).files[key];
}

/* The downloaded file for this verse, if it came from this exact URL. */
export function localAudio(reciterId: number, key: string, url: string | null | undefined): string | null {
  if (!url) return null;
  const ix = index(reciterId);
  if (ix.files[key] !== url) return null;
  try {
    const f = fileFor(reciterId, key);
    return f.exists ? f.uri : null;
  } catch {
    return null;
  }
}

async function fetchAyah(reciterId: number, a: QfAyah): Promise<void> {
  const url = a.audio?.url;
  if (!url) return;
  const ix = index(reciterId);
  if (ix.files[a.key] === url && fileFor(reciterId, a.key).exists) return;
  const target = fileFor(reciterId, a.key);
  if (target.exists) target.delete();
  await File.downloadFileAsync(url, target, { idempotent: true });
  ix.files[a.key] = url;
}

async function downloadOne(surah: number, translationId: number | null, reciterId: number) {
  const ch = await chapterFromDisk(surah, translationId, reciterId);
  const ix = index(reciterId);
  if (!ix.surahs.includes(surah)) ix.surahs.push(surah);
  const total = ch.ayahs.length;
  progress = { surah, done: 0, total };
  emit();
  for (const [i, a] of ch.ayahs.entries()) {
    if (cancelled) break;
    await fetchAyah(reciterId, a);
    progress = { surah, done: i + 1, total };
    if (i % 5 === 4 || i === total - 1) {
      save(reciterId);
      emit();
    }
  }
  save(reciterId);
}

async function run() {
  while (queue && queue.surahs.length > 0 && !cancelled) {
    const n = queue.surahs[0];
    try {
      await downloadOne(n, queue.translationId, queue.reciterId);
    } catch {
      /* Offline or a failed file: stop; the learner can tap again. */
      break;
    }
    queue?.surahs.shift();
  }
  queue = null;
  progress = null;
  cancelled = false;
  emit();
}

/* Download one surah's recitation, or add it to the running queue. */
export function downloadSurahs(surahs: number[], translationId: number | null, reciterId: number) {
  if (queue) {
    for (const n of surahs) if (!queue.surahs.includes(n)) queue.surahs.push(n);
    emit();
    return;
  }
  cancelled = false;
  queue = { surahs: [...surahs], translationId, reciterId };
  emit();
  void run();
}

export function cancelDownloads() {
  if (!queue) return;
  cancelled = true;
  queue.surahs = queue.surahs.slice(0, 1);
  emit();
}

/* Delete a surah's files (the learner removed them). */
export function removeSurahRecitation(surah: number, reciterId: number) {
  const ix = index(reciterId);
  for (const key of Object.keys(ix.files)) if (key.startsWith(`${surah}:`)) remove(reciterId, key);
  ix.surahs = ix.surahs.filter((n) => n !== surah);
  if (queue) queue.surahs = queue.surahs.filter((n, i) => i === 0 || n !== surah);
  save(reciterId);
  emit();
}

/* Delete every downloaded recitation, for every reciter. */
export function removeAllRecitations() {
  if (queue) cancelDownloads();
  try {
    const d = new Directory(Paths.document, "recitations");
    if (d.exists) d.delete();
  } catch {
    /* Nothing stored. */
  }
  indexes.clear();
  emit();
}

export type SurahDownload = { state: "none" | "queued" | "downloading" | "done"; done: number; total: number };

export function surahDownload(surah: number, reciterId: number, ayahs: number): SurahDownload {
  if (progress && progress.surah === surah && queue?.reciterId === reciterId) return { state: "downloading", done: progress.done, total: progress.total };
  if (queue && queue.reciterId === reciterId && queue.surahs.includes(surah)) return { state: "queued", done: 0, total: ayahs };
  const ix = index(reciterId);
  if (!ix.surahs.includes(surah)) return { state: "none", done: 0, total: ayahs };
  const have = Object.keys(ix.files).filter((k) => k.startsWith(`${surah}:`)).length;
  return { state: have >= ayahs ? "done" : "none", done: have, total: ayahs };
}

/* How many surahs are fully downloaded, and the space they take. */
export function downloadSummary(reciterId: number): { surahs: number; bytes: number; active: Progress; queued: number } {
  const ix = index(reciterId);
  let bytes = 0;
  try {
    for (const x of dir(reciterId).list()) if (x instanceof File) bytes += x.size ?? 0;
  } catch {
    bytes = 0;
  }
  return { surahs: ix.surahs.length, bytes, active: progress, queued: queue?.surahs.length ?? 0 };
}

/* Re-renders when downloads change. */
export function useRecitationDownloads(): number {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    () => version,
  );
}

/*
  Keep downloaded files matching the records: called with every surah whose
  records were just re-synced. Changed URLs are fetched again (old file
  replaced), removed recitations are deleted.
*/
function reconcile(ch: QfChapter) {
  const reciterId = ch.reciterId;
  if (reciterId === null || !index(reciterId).surahs.includes(ch.surah)) return;
  const ix = index(reciterId);
  const changed: QfAyah[] = [];
  for (const a of ch.ayahs) {
    const had = ix.files[a.key];
    if (!had) continue;
    if (!a.audio?.url) remove(reciterId, a.key);
    else if (a.audio.url !== had) {
      remove(reciterId, a.key);
      changed.push(a);
    }
  }
  save(reciterId);
  if (changed.length > 0) downloadSurahs([ch.surah], ch.translationId, reciterId);
  else emit();
}
onChapterRefreshed(reconcile);

/*
  A Quranic Words word from a downloaded verse file, if its ayah has been
  downloaded: "wbw/002_023_017.mp3" is word 17 of 2:23. Cut with the timing
  segments; false when not downloaded, so the caller streams instead.
*/
export async function playWordFromDownload(wbwPath: string | null, reciterId: number, translationId: number | null): Promise<boolean> {
  const m = wbwPath?.match(/(\d{3})_(\d{3})_(\d{3})\.mp3$/);
  if (!m) return false;
  const [s, a, w] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const key = `${s}:${a}`;
  if (!index(reciterId).files[key]) return false;
  try {
    const ch = await chapterFromDisk(s, translationId, reciterId);
    const ayah = ch.ayahs[a - 1];
    const uri = localAudio(reciterId, key, ayah?.audio?.url);
    const seg = ayah?.audio?.segments.find((x) => x[1] === w);
    if (!uri || !seg) return false;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { playClip } = require("@/lib/wordAudio") as typeof import("@/lib/wordAudio");
    return playClip(uri, seg[2], seg[3]);
  } catch {
    return false;
  }
}
