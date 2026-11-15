# Durus onboarding v3: spec

For: DurusIOS Prime session.
Date: 2026-11-15.
Replaces: the current onboarding (tour in boxed cards, then "Set up Learn" questions).

The codebase is the source of truth. Where this spec conflicts with code, adapt and flag it in the relay rather than overriding silently.

Hard rules: no em dashes anywhere. No pure white or pure black. Center aligned. No praise, no streaks. Arabic never selectable.

---

## 1. What is wrong with the current one

From the owner's screenshots of build 11:

1. **It looks like a loading state.** Every tour page is the same white box with grey skeleton bars inside it. Grey bars read as "content has not loaded", not as a demo.
2. **Everything is boxed.** A small card floats in the middle of a mostly empty screen. Nothing goes full-bleed, so nothing feels big.
3. **The question chrome is on the tour.** The six-segment progress bar and the "Get started" button sit on every tour page. A tour is not a form step.
4. **The Arabic questions do not belong.** "How are you learning Arabic?", class vs self, book, lesson and pace are removed from onboarding entirely. Nobody is told to match a class. The course is not named.

## 2. The new flow

```
open -> story (5 pages) -> your hifz -> reminders -> sign in -> your map
```

One real question (what you have memorized), and it is the one that pays off visually. Everything else is a default.

### Defaults that replace the removed questions

Written at save time, exactly as the self path writes them today:

- path: self, `classDayReminder: false`
- `currentBook: 1`, `currentLesson: 1`
- `newPerDay: 10`

Anyone in a class changes book and lesson later in Learn's settings. Confirm those controls exist in `settings.tsx`. If they do not, add them there (book picker and lesson stepper, reused from the current onboarding code, labelled "Book 1/2/3" and "Lesson N", lesson max from the chosen book's lesson count). No copy anywhere says "class" or "teacher" in onboarding.

### 2.1 Open

Full screen. No header, no progress bar, no back button.

- The floating Arabic word field that already exists drifts in, then its words slide together and resolve into the large دُرُوس mark in the center (about 1.2 s, once).
- Under it, fading in: **Read. Memorize. Understand.** in display size (see 4.3).
- Sub, one line: *The Quran, and the Arabic to understand it.*
- Bottom: one glass button, lapis tint, **Begin**. Under it a text button **I have an account**.

### 2.2 Story

Five full-screen pages, Instagram-story mechanics:

- Thin segmented bar at the very top (5 segments) that fills over time. Replaces the dots and the six-step progress bar.
- Tap right half: next. Tap left half: back. Press and hold: pause. Swipe works too.
- Each page auto-advances after about 5 s. Reduce Motion: no auto-advance, no looping, every hero shows its final frame.
- Bottom: a single glass **Continue** button, plus **Skip** as a small text button top right. "Get started" does not appear here.
- **No boxed card.** Each hero is drawn full width on the paper background, edge to edge, taking the upper 60% of the screen. Title and line sit beneath it.
- **No grey skeleton bars anywhere.** If something is text, it is real text. If it cannot be real yet, it is not drawn.

Pages:

**1. Read.** Title: **Read the Quran**. Line: *Translation and footnotes under every ayah. Tap a word to hear it.*
Hero: Al-Fatiha 1:1 to 1:3 in the Uthmani font, large, with the Clear Quran style translation line under each ayah in small Inter. A soft lapis highlight moves word by word as if recited. Once, a word lifts into the word card (word, gloss, root, "appears N times").
Source for the hero text: see section 5. Until that is decided, use the ink-stroke rendering already built, but drawn full size, never as grey bars.

**2. Map.** Title: **See what you carry**. Line: *Every ayah is a dot. Light it as you memorize and understand.*
Hero: the real Ayah Field shape, all 6,236 dots grouped by juz, filling the width. Juz 30 lights saffron from the bottom up as a wave, then a scatter of teal follows. Counters count up beneath: "Ayahs memorized", "Surahs understood". The per-surah ayah counts this needs are structural metadata (114 integers), not Quran text; Prime is already checking how to source them, reuse that answer.

**3. Learn.** Title: **Learn the Arabic**. Line: *The Quran's most common words, brought back just before you forget them.*
Hero: one word large in the center (a high-frequency Quranic lemma, e.g. قَالَ or رَبّ), a sound-wave ring pulses from it as if heard, the four answer chips rise in, one is picked, and a line appears: "appears N times in the Quran" (use the real count once lemma data exists; until then show no number rather than a guessed one). Do not use بَيْت or other Book 1 classroom vocabulary here.

**4. Barakah.** Title: **Build barakah**. Line: *Small daily practices, measured by consistency.*
Hero: the real Barakah ring from the tab, large, its segments filling one by one, with a strip of the month grid below deepening day by day. Reuse the tab's components, not a redrawing.

**5. Ask.** Title: **Ask**. Line: *Say how you feel. Durus points you to ayahs to read.*
Hero: the glass input bar types "I feel anxious about work", sends, and two result cards slide up with a real reference ("13:28", "94:5") and the ink or real text. Drop the "Open in Read" skeleton rows.

### 2.3 Your hifz (the one question)

- Title: **What have you memorized?**
- Sub: *Tap any you know. You can add more on the Map.*
- The surahs of Juz Amma (78 to 114) plus Al-Fatiha as glass chips in a wrapping grid, Arabic name over English name. Tap toggles saffron.
- Above the chips, a small live Ayah Field strip lights the matching dots as chips are tapped. This is the moment that should feel good.
- Buttons: **Continue** (glass, lapis). **Skip** text button. Nothing selected is fine.
- Saved as `surah_status_set` events (memorized) at the same moment everything else is saved, after sign in. Nothing is written before that, as now.
- Surah names and ayah counts are structural metadata; source them the same way as for the Map. If they cannot ship before Quran Foundation access, hide this step and keep the rest of the flow.

### 2.4 Reminders

- Title: **Two gentle reminders**
- Two glass rows with switches:
  - **Morning adhkar**, 6:00 AM until prayer times exist. On by default.
  - **Daily review**, 9:00 AM. On by default.
- Ask notification permission when this step is left, only if one is on (current behavior).

### 2.5 Sign in

Same gate as now. Title **Keep your progress**. Sub *Your map, lessons and practice, saved if you change phones.* The panel sits on a glass card.

### 2.6 Your map

- The full Ayah Field again, now with exactly what they marked lit saffron, drawn in with a slow sweep.
- Counters: surahs and ayahs memorized. If nothing was marked: no counters, just the field and the line *Your map starts here.*
- One glass button, lapis tint: **Open Durus**. Opens the Read tab (or Map if they marked anything).
- No praise copy.

## 3. Keep from the current code

1. Nothing written before sign in succeeds. Quitting restarts from Open.
2. Keychain-restored session: skip sign in and call `finish()`.
3. Permission asked when leaving reminders.
4. Back exists on hifz, reminders and sign in only. Open, story and the final map have none (story has its own tap-left).
5. `index.tsx` gating unchanged.

## 4. Visual system

Durus palette, fonts and Arabic type stay. What changes is scale, bleed and material.

### 4.1 Full bleed
Heroes draw edge to edge on paper. No container card around a hero, ever. The only cards in onboarding are glass controls.

### 4.2 Liquid Glass for controls
- Add `expo-glass-effect` (`npx expo install expo-glass-effect`, match SDK 55). Build one `components/Glass.tsx` wrapper reused app-wide.
- Glass: buttons, chips, reminder rows, the Ask input bar, the sign in card, the story bar.
- Only the primary button per screen gets the lapis tint.
- Fallback when `isLiquidGlassAvailable()` is false or Reduce Transparency is on: solid surface (light `#FAF6EE`, dark `#181D2B`), hairline border, same shape.
- Animate glass with `glassEffectStyle`, never opacity. No glass on glass.

### 4.3 Type scale
- Open title: 44/50, tight tracking.
- Story and step titles: 34/40.
- Lines: 17/24 `inkSoft`, max width 320, two lines max.
- Big numerals (counters): existing numeral style at 56.

### 4.4 Motion
Onboarding is exempt from the four-animation rule, answering Prime's open question: the tour and the open sequence may loop and choreograph. Inside the app the rule stands. All of it respects Reduce Motion. Haptics: keep to the two the app allows, use the light one on chip toggle and story advance.

### 4.5 Background
Keep the faint floating Arabic word field, but only on Open and behind the hifz step. On story pages the hero is the visual and the word field is off, so the two do not fight.

## 5. Decision for the owner

The Read hero, the Ask results and the hifz step look far better with real text and names. Before Quran Foundation access exists, that needs a verbatim source. Recommendation: use the Tanzil Uthmani text for the three Fatiha ayahs in the Read hero only, verbatim, credited in Credits, and replace it with Quran Foundation text once sync is live. Prime should not do this until the owner approves it.

## 6. Done means

- No grey skeleton bars or boxed hero cards remain.
- No "class", "teacher", "course" or book naming in onboarding.
- `npm run preflight` passes. Tests cover: defaults written on save, hifz events written only after sign in, the keychain path, permission timing, story Reduce Motion.
- Screen recording of the full flow in light and dark, plus glass and fallback, posted to the relay. OTA to TestFlight.
