import { requireOptionalNativeModule } from "expo";

/*
  Word audio for the Quranic Words track: the capability check, and nothing
  more yet.

  The track is listening first (spec 7.2, drill 1: listen, choose the meaning),
  but no audio module is in the current native build: package.json has no
  expo-audio or expo-av, and an over-the-air update cannot add native code.
  Requiring an uninstalled package would fail at bundle time, so this only
  ASKS whether the native side is there, and the drills run text first until
  it is.

  To switch audio on, in the next batched native build:
    1. npx expo install expo-audio (and add it to app.json plugins if needed),
    2. play wordAudioUrl(lemma.audio) from src/data/wordsContent.ts
       (Quran Foundation word-by-word audio, audio.qurancdn.com/wbw/...),
    3. set PLAYER_WIRED to true.
  Quran Foundation's rule (2026-11-20): a downloaded recording, or a word
  clipped from one, may stay on the phone for at most ONE WEEK, no exceptions,
  even offline. So store each file with its download time, delete it after
  seven days on app open, and download it again quietly in the background on
  the next open (or stream it). Clipping a word's span from verse audio with
  their timing segments is allowed.
  canPlayWordAudio() then turns drill 1 on by itself on phones with the build,
  and older binaries that take the same update stay text first.
*/
const PLAYER_WIRED = false;

let cached: boolean | null = null;

export function canPlayWordAudio(): boolean {
  if (cached !== null) return cached;
  try {
    cached = PLAYER_WIRED && requireOptionalNativeModule("ExpoAudio") !== null;
  } catch {
    cached = false;
  }
  return cached;
}
