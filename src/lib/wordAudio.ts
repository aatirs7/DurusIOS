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
const PLAYER_WIRED = true;

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

/*
  Play a Quran Foundation recording: a word, a whole ayah, or a downloaded
  verse file. One shared player; a new sound replaces the last. Loaded lazily
  so a phone on the older build (no audio module) never touches it.
*/
type Player = { replace(src: string): void; seekTo(s: number): Promise<void>; play(): void; pause(): void };
let player: Player | null = null;
let clipTimer: ReturnType<typeof setTimeout> | null = null;

function load(url: string): Player | null {
  if (!canPlayWordAudio()) return null;
  try {
    if (clipTimer) clearTimeout(clipTimer);
    clipTimer = null;
    if (!player) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const audio = require("expo-audio") as typeof import("expo-audio");
      void audio.setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
      player = audio.createAudioPlayer(url) as unknown as Player;
    } else {
      player.replace(url);
    }
    return player;
  } catch {
    return null;
  }
}

export function playWordAudio(url: string | null): boolean {
  const p = url ? load(url) : null;
  if (!p) return false;
  void p.seekTo(0).catch(() => undefined);
  p.play();
  return true;
}

/* Any Quran Foundation recording (a word, or a whole ayah from the reader). */
export const playAudio = playWordAudio;

/* Stop whatever is playing, for example when the reader's zoom closes. */
export function stopAudio() {
  if (clipTimer) clearTimeout(clipTimer);
  clipTimer = null;
  try {
    player?.pause();
  } catch {
    /* Nothing playing. */
  }
}

/*
  One word cut from a verse recording (Quran Foundation's timing segments),
  for verse files downloaded for offline listening: seek to the word, then
  play, and pause at its end. Allowed by Quran Foundation as a Derived Material.
*/
export function playClip(uri: string, fromMs: number, toMs: number): boolean {
  const p = load(uri);
  if (!p) return false;
  p.seekTo(fromMs / 1000)
    .catch(() => undefined)
    .then(() => {
      p.play();
      clipTimer = setTimeout(() => {
        try {
          p.pause();
        } catch {
          /* Already stopped. */
        }
      }, Math.max(200, toMs - fromMs + 60));
    });
  return true;
}
