import { WORD_GLOSS_AYAHS, setWordGlossesForTest } from "../wordGlosses";
import { WORDS } from "../wordsContent";

/*
  Stand-in word meanings for tests. The real ones come from Quran Foundation
  after install and may not be committed or bundled, so every ref gets its own
  made-up text ("meaning 2:23:17"), unique, which is all the drills need.
*/
export function fakeWordGlosses() {
  const refs = [
    ...WORDS.lemmas.flatMap((l) => (l.gloss ? [l.gloss.ref] : [])),
    ...WORDS.skills.flatMap((s) => s.examples.map((e) => e.ref)),
  ];
  const ayahs: Record<string, (string | null)[]> = {};
  for (const k of WORD_GLOSS_AYAHS) ayahs[k] = [];
  for (const ref of refs) {
    const [s, a, w] = ref.split(":");
    ayahs[`${s}:${a}`][Number(w) - 1] = `meaning ${ref}`;
  }
  setWordGlossesForTest(ayahs);
}
