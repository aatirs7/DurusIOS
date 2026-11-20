import { Directory, File, Paths } from "expo-file-system";
import { useSyncExternalStore } from "react";

import { RESYNC_MS } from "@/quran/qf";
import { fetchWordMeanings, quranApiConfigured } from "@/quran/remote";

import { WORDS } from "./wordsContent";

/*
  The English meanings of the Quranic Words track, fetched after install.

  Quran Foundation does not allow its word-by-word meanings inside the app
  package (their reply of 2026-11-20). They come through Content Sync instead
  and are refreshed at least every seven days when the phone is online. So the
  bundled content keeps only WHERE each meaning comes from (a ref such as
  2:23:17), and this module fills the text in:

  - On every app open and every return to the foreground, syncWordGlosses()
    reads the stored copy and applies it, then quietly downloads anything
    missing, or everything once the copy is older than seven days.
  - Offline, the stored copy is used whatever its age, and the next open with
    a connection refreshes it. The learner never has to do anything.

  Applying writes the text into the lemma and skill objects of WORDS, so every
  screen that already reads lemma.gloss.text keeps working; useWordGlosses()
  re-renders them when the text arrives.
*/

type Stored = { fetchedAt: number; ayahs: Record<string, (string | null)[]> };

const ayahOf = (ref: string) => ref.split(":").slice(0, 2).join(":");
const wordOf = (ref: string) => Number(ref.split(":")[2]);

/* Every ayah a meaning is taken from, in a fixed order so the server's edge
   cache sees the same batches from every phone. */
const AYAHS: string[] = [
  ...new Set([
    ...WORDS.lemmas.flatMap((l) => (l.gloss ? [ayahOf(l.gloss.ref)] : [])),
    ...WORDS.skills.flatMap((s) => s.examples.map((e) => ayahOf(e.ref))),
  ]),
].sort((a, b) => {
  const [sa, aa] = a.split(":").map(Number);
  const [sb, ab] = b.split(":").map(Number);
  return sa - sb || aa - ab;
});
const BATCH = 60;

let stored: Stored = { fetchedAt: 0, ayahs: {} };
let loaded = false;
let running: Promise<void> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function file(): File {
  const d = new Directory(Paths.document, "qf-words");
  if (!d.exists) d.create({ idempotent: true, intermediates: true });
  return new File(d, "meanings-en.json");
}

function meaningAt(ref: string): string {
  const m = stored.ayahs[ayahOf(ref)]?.[wordOf(ref) - 1];
  return typeof m === "string" ? m.trim() : "";
}

function apply() {
  for (const l of WORDS.lemmas) if (l.gloss) l.gloss.text = meaningAt(l.gloss.ref);
  for (const s of WORDS.skills) for (const e of s.examples) e.gloss = meaningAt(e.ref);
  version += 1;
  for (const f of listeners) f();
}

async function readStored() {
  if (loaded) return;
  loaded = true;
  try {
    const f = file();
    if (f.exists) {
      const j = JSON.parse(await f.text()) as Stored;
      if (j && typeof j.fetchedAt === "number" && j.ayahs) stored = j;
    }
  } catch {
    /* A broken copy is downloaded again. */
  }
  apply();
}

async function download(keys: string[]): Promise<Record<string, (string | null)[]>> {
  /* Three batches at a time: about ten seconds for the whole set. */
  const batches: string[][] = [];
  for (let i = 0; i < keys.length; i += BATCH) batches.push(keys.slice(i, i + BATCH));
  const got: Record<string, (string | null)[]> = {};
  for (let i = 0; i < batches.length; i += 3) {
    for (const part of await Promise.all(batches.slice(i, i + 3).map((b) => fetchWordMeanings(b)))) Object.assign(got, part);
  }
  return got;
}

/* Safe to call as often as liked: runs once at a time and only downloads when
   something is missing or the copy is older than seven days. */
export function syncWordGlosses(now: number = Date.now()): Promise<void> {
  running ??= (async () => {
    await readStored();
    if (!quranApiConfigured()) return;
    const stale = now - stored.fetchedAt > RESYNC_MS;
    const keys = stale ? AYAHS : AYAHS.filter((k) => !stored.ayahs[k]);
    if (keys.length === 0) return;
    try {
      const fresh = await download(keys);
      stored = { fetchedAt: stale ? now : stored.fetchedAt || now, ayahs: { ...stored.ayahs, ...fresh } };
      file().write(JSON.stringify(stored));
      apply();
    } catch {
      /* Offline or the server is down: keep what is stored, try on the next open. */
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

/* Every lemma of the track has its meaning. */
export function wordGlossesReady(): boolean {
  return WORDS.lemmas.every((l) => !l.gloss || l.gloss.text.length > 0);
}

/* Re-renders when meanings arrive; returns whether they are all here. */
export function useWordGlosses(): boolean {
  useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    () => version,
  );
  return wordGlossesReady();
}

/* Tests: put meanings in place without a network. */
export function setWordGlossesForTest(ayahs: Record<string, (string | null)[]>, fetchedAt = Date.now()) {
  stored = { fetchedAt, ayahs };
  loaded = true;
  apply();
}

/* Tests: every ayah key the track needs. */
export const WORD_GLOSS_AYAHS: readonly string[] = AYAHS;
