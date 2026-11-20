import { create } from "zustand";
import { persist } from "zustand/middleware";

import { jsonStorage, onRehydrate, type Hydratable } from "./storage";

/*
  Device preferences that have no column in settings yet.

  The morning adhkar reminder lives here rather than in the settings table so it
  ships without a migration. It moves to settings, next to the other reminder
  columns, the next time that table changes for another reason.
*/
type PrefsState = Hydratable & {
  /* What to call them, asked in onboarding: "Assalamu alaikum, Name". */
  name: string;
  setName: (name: string) => void;
  adhkarReminder: boolean;
  setAdhkarReminder: (on: boolean) => void;
  /* Where reading stopped, for Resume. */
  lastRead: { surah: number; ayah: number } | null;
  setLastRead: (at: { surah: number; ayah: number }) => void;
  /* Where each surah was left, so reopening one resumes it. */
  surahPos: Record<number, number>;
  /* The reader's view and Arabic size. */
  readerView: ReaderView;
  setReaderView: (v: ReaderView) => void;
  arabicSize: number;
  setArabicSize: (n: number) => void;
  /* Quran Foundation translation and reciter. Saheeh International is 20 (The Clear
     Quran, 131, is not licensed to this client), Alafasy is 7. */
  translationId: number;
  reciterId: number;
  setTranslationId: (id: number) => void;
  /* Reader look. */
  reader: ReaderLook;
  setReader: (patch: Partial<ReaderLook>) => void;
  /* Ayahs read, per local day, as global indexes. Kept for 60 days. */
  readLog: Record<string, number[]>;
  logRead: (day: string, index: number) => void;
  /* Ayahs a day that count as the daily Quran portion in Barakah. */
  readingGoal: number;
  setReadingGoal: (n: number) => void;
  /* Searches that led somewhere, newest first, at most eight. */
  recentSearches: string[];
  rememberSearch: (q: string) => void;
  clearSearches: () => void;
  /* Bookmarked ayahs, by global index, newest first. */
  bookmarks: number[];
  toggleBookmark: (index: number) => void;
};

export type ReaderFont = "amiriQuran" | "scheherazade" | "naskh" | "amiri" | "lateef";
export type ReaderLook = {
  font: ReaderFont;
  /* Line height as a multiple of the font size. */
  spacing: "compact" | "normal" | "airy";
  tone: "app" | "paper" | "sepia" | "night";
  /* One ayah per row, or the text flowing on like a page. */
  layout: "ayah" | "flow";
  align: "right" | "center";
  marks: boolean;
  numbers: boolean;
};
export const DEFAULT_LOOK: ReaderLook = { font: "amiriQuran", spacing: "normal", tone: "app", layout: "ayah", align: "right", marks: true, numbers: true };

export type ReaderView = "arabic" | "translation" | "wordTranslation" | "transliteration" | "wordTransliteration";

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      _hydrated: false,
      markHydrated: () => set({ _hydrated: true }),
      name: "",
      setName: (name) => set({ name: name.trim().slice(0, 40) }),
      adhkarReminder: false,
      setAdhkarReminder: (adhkarReminder) => set({ adhkarReminder }),
      lastRead: null,
      setLastRead: (lastRead) => set((st) => ({ lastRead, surahPos: { ...st.surahPos, [lastRead.surah]: lastRead.ayah } })),
      surahPos: {},
      readerView: "arabic",
      setReaderView: (readerView) => set({ readerView }),
      arabicSize: 28,
      setArabicSize: (arabicSize) => set({ arabicSize: Math.min(40, Math.max(22, arabicSize)) }),
      translationId: 20,
      reciterId: 7,
      setTranslationId: (translationId) => set({ translationId }),
      reader: DEFAULT_LOOK,
      setReader: (patch) => set((st) => ({ reader: { ...DEFAULT_LOOK, ...st.reader, ...patch } })),
      readingGoal: 10,
      setReadingGoal: (n) => set({ readingGoal: Math.min(300, Math.max(1, Math.round(n))) }),
      recentSearches: [],
      rememberSearch: (q) =>
        set((st) => {
          const t = q.trim();
          if (!t) return {};
          return { recentSearches: [t, ...(st.recentSearches ?? []).filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8) };
        }),
      clearSearches: () => set({ recentSearches: [] }),
      readLog: {},
      logRead: (day, index) =>
        set((st) => {
          const today = st.readLog[day] ?? [];
          if (today.includes(index)) return {};
          const next: Record<string, number[]> = { ...st.readLog, [day]: [...today, index] };
          const keep = Object.keys(next).sort().slice(-60);
          return { readLog: Object.fromEntries(keep.map((k) => [k, next[k]])) };
        }),
      bookmarks: [],
      toggleBookmark: (index) =>
        set((st) => ({
          bookmarks: st.bookmarks.includes(index) ? st.bookmarks.filter((b) => b !== index) : [index, ...st.bookmarks],
        })),
    }),
    {
      name: "durus:prefs",
      version: 1,
      storage: jsonStorage,
      partialize: ({ _hydrated, markHydrated, ...rest }) => rest as PrefsState,
      onRehydrateStorage: onRehydrate<PrefsState>(),
    },
  ),
);
