# DurusIOS: relay from Prime

Updated: 2026-11-20

## Now

INCIDENT, 2026-11-18. The app crashed on launch with tonight's updates.
- Rolled back by republishing ce7af734 (new group cb63f4c6).
- Cause found: the Search home's glide animation called space() inside a Reanimated worklet. That runs on the UI thread and is fatal in a release build. Jest does not catch it because Reanimated is mocked there.
- Fixed in main, together with a root ErrorBoundary (an error screen instead of a crash), plain SVG gradient ids, and removal of the reload-on-launch hook.
- The owner confirmed the rollback opens. The fixed main is published as OTA f1c8cfba (AI search, Barakah redesign, guided adhkar, Progress fix). If it fails, roll back by republishing ce7af734.
- Rule: inside useAnimatedStyle, use plain numbers and shared values only. No function calls.

## Shipped

- Settings gear in the shared top bar on every tab, beside the theme toggle (Settings was only a footer link at the bottom of Learn; the owner could not find it).

- Barakah: prayers box 28 pt lower (bottom reserve 144 to 98, measured from the owner's screenshot: about 12 pt above the tab bar) at the owner's request.

- Barakah prayers: one tap marks a prayer late (dot half filled), two taps on time (full with tick), three clears. Late is stored as 0.5 and is not "done", so Fajr late does not tick Fajr on time (its ring segment shows half).
- Settings > Preview onboarding: the new-learner flow from a signed-in account with nothing saved (no name, hifz, reminders or completion written; sign in shown but skipped; Exit preview top right).

- Barakah: the two bottom pills are gone; This month and Choose practices are now two small glass icon buttons in the top bar's left slot (calendar, sliders). The prayers box is the page's last element. The bottom reserve is now a device-calibrated 144 pt (every computed version landed ~40 pt too low). Tile titles no longer shrink to tiny text (adjustsFontSizeToFit removed).

- Barakah: a rounded box above the pills with the five daily prayers as dots; tap a dot to mark that prayer. Fajr's dot is the Fajr practice (stays in step with its tile); the other four are logged outside the tracked practices, so the ring and consistency figure are unchanged.

- Barakah: the bottom pills now end where iOS says the tab bar starts (a safe-area reading inside the tab), instead of a fixed guess that the tab view's extra height kept defeating.

- Word audio fix (owner heard "fima" for yawma): Quran Foundation's word audio_url is offset by a word or two in some ayahs (2:113 lists file 028 for word 26; file 028 says word 28). 224 of 560 track words pointed at a neighbouring word. Word recordings are now named from the word's position everywhere: the content file (wordAudioFor, build_words.py) and the reader zoom's word taps. A content test pins it.

- Offline recitation is now ask-once, then automatic (owner wanted no manual downloads; Quran Foundation requires the learner's choice). A one-time glass card 5 s after launch ("Listen offline?", Download / Not now, with the credit). Download, or the Settings switch "Keep the recitation on this phone", downloads every surah in the background after the weekly records sync, on every open until complete, and keeps it current. Turning the switch off deletes the files. Per-surah download buttons removed; a downloaded surah shows the reciter credit under its title.

- **Offline recitation downloads** (src/quran/offlineAudio.ts), to Quran Foundation's conditions. Only when chosen: "Download recitation" at the top of each surah (progress "Downloading 12 of 206"; tap again to stop; "Downloaded" offers Remove), and Settings > Offline recitation (Download all, with a large-download warning; Stop; Remove downloads; space used). Files live in the app's private Documents/recitations/r<reciter>/ with an index of the URL each came from. Credit "Recitation by Mishari Rashid al-Afasy, provided by Quran Foundation" shows with downloads. Weekly record re-sync checks every downloaded surah: a changed URL is downloaded again and the old file deleted; a removed recitation is deleted. Deleting the account deletes them. Playback: the zoom's ayah speaker uses the file; a tapped word is cut from the downloaded verse with the timing segments; Learn's words do the same when their ayah is downloaded, else stream. Tested with stand-ins (4 tests); not yet on a phone.

- Quran Foundation updated its policy (20 Nov, 11:40): recitation files and word clips may be kept on the device with no one-week limit when the user opts in to downloads, files stay private, QF and the reciter are credited, files are removed on request or when their URL changes, and records sync weekly. Recorded in docs/quranic-words/coverage.md. Offline recitation downloads: built, see below. Owner sent thanks (20 Nov).

- Reader content for every surah now downloads in the background on app open (owner): all 114 surahs' translation, words, transliteration and audio timings, one at a time, starting 4 s after launch, files only. Re-downloaded once older than seven days (Quran Foundation's rule); offline it stops and resumes on the next open. About 2 to 3 MB over the network (Al-Baqarah is 215 KB compressed). Audio is still streamed, never stored.

- Build 12 is in TestFlight (expo-audio); the owner confirmed audio plays.
- Reader: tapping an ayah before its surah's full layers have downloaded (seconds for a long surah) now fetches that ayah's translation on its own (/quran/verses, kept on the phone) and shows it at once. The "Loading the translation" line is gone.

- Reader audio (needs build 12): in the long-press zoom, a speaker in the corner recites the whole ayah (Quran Foundation, the chosen reciter); tapping a word says it, with "Listen again" on the word card. Streamed, never stored; stops when the zoom closes. Older builds show no speaker.

- Barakah pills, third fix: the page now ends a fixed 104 pt above the screen's bottom edge (window height minus the top inset minus that reserve). The measured lift never took effect on the device and is removed.

- **Word audio (native build).** expo-audio added (no microphone permission, no background audio). The new-word card and the "What does this mean?" drill play Quran Foundation's word recording once as they appear, with a Listen pill to replay. Streamed, never stored, so the one-week limit on stored recordings never applies. Phones on the older build get the same update and simply show no Listen pill.
- Search: while an AI question is out the list shows only the loader, then the AI's picks with the local results after them. No more local results appearing and then being replaced (owner). Offline, or after 6 s, the local results show alone.

- **Owner round, 20 Nov.**
  - Search: typing no longer snaps the bar up. It glides to the top over about 0.6 s while the results rise and fade in beneath it.
  - Quranic Words new-word card: centred on the screen; the word and each "also heard as" form show a transliteration, from our own Uthmani-aware rules (src/engine/quranTranslit.ts, tested on 30 words), so nothing licensed. Word audio still needs the native build with expo-audio.
  - Reader: each surah remembers where it was left (prefs surahPos). Opening a surah from the list resumes there; a surah never read opens at the very top.

- **Quran Foundation replied (20 Nov, to the 19 Nov email). Durus now follows it.**
  - Word clips from verse recitation with their timing segments: allowed.
  - Downloaded audio (verse files and word clips): kept on the phone for at most one week, no exceptions. Nothing is stored yet (no audio module until the next native build); src/lib/wordAudio.ts records the rule: delete after seven days, re-download quietly on the next open.
  - Bundling their word-by-word English meanings: NOT allowed. Fixed: assets/content/quranic-words.json (version 2) keeps only each meaning's ref; the app downloads the text after install through a new server route (durus.space/api/v1/quran/words, durus-web 513de55) and refreshes it every seven days in the background on app open (src/data/wordGlosses.ts). Offline it keeps the stored copy. A first open of the Quranic Words track before the download finishes says "Getting the word meanings". Neon's 560 word cards had their English cleared (seed re-run once through a temporary route, then removed with its token). Existing phones lose the bundled English on update (seed version bump).
  - Attribution confirmed correct. They also invite a Quran.com app directory listing if Durus adds Quran ID sign-in.

- **Quranic Words learning loop**, per the owner ("structured repetition, different kinds of learning, like Study Lesson"). Reviews first, each asked as either "what does this mean" or "which is the Arabic for" (new reverse drill with Arabic options). New words: their cards, then three shuffled rounds across all of them: choose the meaning (graded, the day's one review), choose the Arabic (practice), choose the meaning again (practice). Wrong answers return at the end ungraded. Spaced repetition then brings each word back over the following days; a word counts as known after two correct days.
- **Per-word Quranic Words, from QUL** (merged from a worktree; QUL credited where word data shows).
  - assets/content/quranic-words-map.json (233 KB): per word, its track card and clitic skills, built by scripts/coverage/build_words_map.py from the QUL lemma and stem files (data-in/, git-ignored) with the corpus used offline only to map QUL lemmas to the app's cards. Clitics from surface minus QUL stem: 98.9% agree with the corpus (98.0% of words with a clitic).
  - Exact coverage replaces the lower-bound curve: the meter, followable ayahs and memorized-surah share.
  - Read: known words get a faint verdigris underline and each ayah shows "You know N of M words" (ayah layout; not in flow, the word grid or 37:130).
  - Progress Wall: a "Words I know" glass toggle lights ayahs with at least 9 in 10 words known.
  - Learn from a surah: on the Quranic Words page, pick a surah and learn its unknown words, most frequent first.
- Barakah long-press backdrop: a faint lapis tint in light mode (owner).
- Barakah: the pills now measure their real position on screen (measureInWindow) and lift by exactly the overlap with the tab bar; padding alone never moved them because the tab view does not end at the screen edge. The long-press card is Liquid Glass with a glass Done pill.
- Reader: long press zooms into the ayah again (its sheet has memorized, understood and bookmark); the extra Zoom button that pushed the ayah bar off the screen is gone. Barakah long press shows the practice as a centred card over a blurred page.
- Barakah long press now leads with "Why": one paraphrased line per practice with its source (Sahih Muslim, al-Bukhari, Abu Dawud, Tirmidhi, Quran 33:41-42), in src/barakah/benefits.ts, at the owner's request. Needs owner or teacher review like the other religious copy. Pills raised further above the tab bar.
- Barakah: the page body is held to the window height (the tab view measured taller than the screen, so extra bottom padding never lifted the pills clear of the tab bar). Long press on a tile opens a sheet: its icon, its line, when it is due and how the app counts it (facts from the practice settings only, no new religious text).
- Barakah: each tile has a small line icon above its title (sunrise, sun, moon, book and so on; verdigris when done), and the tile area no longer scrolls or bounces unless more than three rows of practices are chosen.
- Quranic Words: a session with nothing due no longer dead-ends. It offers "Learn 5 more words" (past the day's five) and "Practise words you have met" (12 met words, not graded into the schedule, so practising early never pushes reviews out). Stage rows on the path are centred.
- Barakah: tile titles and lines centred; the tiles sit centred between the header and the pills; the header is roomier (ring 148) with two rows of practices and shrinks (120, 100) as more are chosen; the This month and Choose practices pills clear the tab bar again.
- Breathing light: the yellow (saffron) wash is replaced with a soft blue-grey (inkSoft), per the owner.
- Progress Mark: the surah sheet now opens on top of the list (nested modal) instead of closing it, so closing a surah shows the list exactly where it was (the earlier reopen-at-offset did not hold). Ayah by ayah is "fill up to here": tapping ayah 4 marks 1 to 4; tapping a marked ayah clears it and those after it (new setAyahs batch action).
- **Tab first-open shift, second fix.** Each native tab has its own safe-area measurement, which reads the top inset as zero for a moment the first time a tab opens and then corrects, so the page jumped. The five tabs now use the window's top inset from launch, a fixed number in this portrait-only app (src/components/TabSafe.tsx; Screen takes a `tab` prop). Sheets and pushed screens are unchanged.
- Licensing gate: the email to developers@quran.com is SENT (19 Nov, from the owner's elysiumcyber.com Gmail). It asks about clipping word audio from recitation segments, caching audio and text on the device, and bundling about 560 word-by-word glosses verbatim with attribution. Waiting on their reply. QUL licence issue: NOT posted, by the owner's decision (19 Nov): use QUL data with credit. QUL's FAQ says its data may be used commercially; the morphology resource pages say "We don't have copyright information for this resource".
- **Quranic Words now sync.** Neon has the deck value and the 13 stages and 560 cards under the app's ids (durus-web e96c0d9). Prime ran it from production through a temporary token-guarded route, then removed the route (next commit) and the token env var; migration 0007 is idempotent (ADD VALUE IF NOT EXISTS), so a later db:migrate is safe. WORDS_DECK_SYNCS is on in the app; held-back reviews go up on the next sync.
- Web (durus-web 924d2f9): the lessons list and the cron's next-lesson lookup now count book lessons only; the numbers trainer stages were leaking into both, and the words stages would have too.
- **Adhkar walkthrough, cleaner**, per the owner ("too condensed"): one dhikr per screen with no page scroll. A glass switch picks one part at a time (Arabic, Say it, Meaning, Origin), centred above the counter; the counter row now sits below the content instead of floating over it. Only a very long passage scrolls inside its own space.
- **Learn opens on an overview**, per the owner: a ring (share of words known), "Learn the words of the Quran" with a three-sentence explanation, Begin (or Continue) and Arabic Course buttons, Stats and Settings pills. Begin shows the coverage meter, Start and the stage path (now glass rows); Arabic Course shows the course screen as before. A glass Back pill in the top bar returns to the overview.
- Search, per the owner after trying both: typing folds the mark and question and the bar glides to the top again (results were cut off when it stayed centred). A tap alone still keeps it centred.
- **Owner round, 19 Nov evening.**
  - Search: the mark, question and bar no longer move or fold while typing; they lift only if the keyboard would cover the bar.
  - Reader: tap an ayah to show its translation, tap again to add the transliteration, a third tap returns to the Arabic. Long press now opens the ayah bar (memorized, understood, bookmark, a new Zoom button, share). Translation layers load with every surah whatever the view, the next surah prefetches behind it, and a stored surah opens at once from memory or the phone (a stale copy refreshes in the background instead of blocking). Footer credit fixed to "Translation and transliteration from Quran.com, provided by Quran Foundation".
  - Progress: a calm Overview page comes first (one ring, a plain line or two, what each view is, and "Mark what you know" when nothing is marked). The Wall moves to the second page.
  - Tab flash: each native tab's first frame was painted in React Navigation's default pale background. A navigation theme now paints it in the app's paper colour (light and dark). Added @react-navigation/native 7.3.17 as a direct dependency (already installed through expo-router, JS only, OTA safe).
  - **Quranic Words (issue #4) shipped**, built without a review stop at the owner's word, with the current Learn look kept.
    - Learn leads with the track: "Words you know make up X% of the words in the Quran" (marker at 80%, "How this is counted"), followable ayahs, memorized-surah line, one Start button, the stage path with rings, then the Arabic Course below as "Go deeper".
    - Content: assets/content/quranic-words.json, 13 stages, 560 lemmas reaching exactly 80.0%, 31 parsing skills, 19 interference groups, anchor ayahs, word audio paths. Built by scripts/coverage/build_words.py. Only counts and lemma groupings derived offline from the corpus ship; no corpus text, headwords or roots.
    - Glosses are Quran Foundation word-by-word text, verbatim, all verified:false, shown with QF attribution (owner's call). Mini-notes are empty and hidden until written and verified. No AI content.
    - Model follows the Numbers trainer: stages are lessons with deck "words" (ids 1000+, numbers 200+), lemmas are cards (ids 100000 + frequency rank, stable). Seeded on launch from the bundled file in its own transaction; a failed seed leaves the rest of the app working. Not in lessons.json (content:build rewrites it from Neon).
    - Session at /words: stage intro, new word cards, drill 2 (see the Arabic, choose the meaning), reviews first, about 5 new a day, pause at 40 due, anti-interference picker, rule-based distractors.
    - Coverage on the phone uses precomputed curves (exact in path order, a lower bound otherwise), because a shippable per-word table needs a licence (QUL login or the QUL issue).
    - Also fixed: the Lessons list showed Numbers stages; the Jest node project named a missing preset.

## Blocked on the owner (Quranic Words)

- Review src/barakah/benefits.ts (14 short "why" lines with references) with a teacher if possible.


- Review the stage lists, interference groups and glosses.
- **Issue #4, Quranic Words, step 1: coverage numbers. STOPPED for owner review.** Full write-up: docs/quranic-words/coverage.md. Computed offline from the Quranic Arabic Corpus (not in the repo, never shipped). A word counts as known only when its lemma and every clitic on it are taught.
  - Lemmas needed: 25% = 9, 50% = 54, 60% = 109, 70% = 220, 80% = 441, 90% = 1,061. The top 500 reach 81.6%, so "500 words, about 80%" holds.
  - 55% of words carry a clitic. Without the parsing skills, 500 lemmas cover only 37%. Function words are 32% of all words.
  - Per stage the path is slower than the spec guessed: Al-Fatiha 10% (spec 25 to 30%), Glue I 28%, salah 36.5%, Glue II 42%, stage 12 at 500 lemmas 78.4%. The rare salah-surah words cost about 3 points, so 80% on the path takes about 540 lemmas.
  - Flag: wa-, bi- and li- are counted in stage 0 because Al-Fatiha needs them; the spec has them in stage 3.
  - Licensing: the email to developers@quran.com and the QUL licence issue are drafted, not sent (Gmail draft; docs/quranic-words/qul-licence-issue.md). QUL morphology downloads need a QUL login, so the QUL cross-check waits for the owner to download the Word lemma sqlite.
- **New AI loader**, per the owner ("more modern, 3D, blue and white"): a glowing blue-white orb inside three thin rings turning in 3D on different tilts, with the caption breathing beneath. It shows only when nothing else is on screen yet (no results and no suggestions).
- **Search layout and theme fade, second pass**, per the owner. Search stays centred on tap (lifting only for the keyboard); typing folds the mark and question and the bar rises halfway, not to the very top. The theme fade no longer flashes: the veil gathers in the old background colour, shades to the new one while covering, then falls away (about 1 s, all eased).
- **Greeting by name, smoother theme, higher search**, per the owner.
  - Onboarding asks "What should we call you?" after the story (Continue or Skip). Search says "Assalamu alaikum, Name". The name can be changed in Settings > Appearance. People already signed in get their account's first name until they set one.
  - The corner theme toggle now fades: a veil in the new background colour rises, the theme switches under it, then it falls away (about 0.65 s). Under Reduce Motion it still switches instantly. src/components/ThemeFade.tsx.
  - Tapping the empty search bar raises the mark, question and bar together to just under the greeting. The head still folds once you type.
  - Fixed a stray duplicate timer in src/lib/updates.ts (foreground return now pulls straight away).
- **Search results header and loader**, per the owner. The AI caption is centred, with a small sparkle marking it as AI; this replaces the separate "Suggested by AI" line, so the disclosure stays without the extra line. While the AI looks, a centred loader shows three turning arcs (lapis, verdigris, saffron) round a breathing dot, over "Looking through the Quran". src/components/Seeking.tsx.
- **Search tap no longer jumps to the top**, per the owner. With nothing typed, tapping the bar keeps it, the mark and the question in place, lifting only as far as the keyboard needs. The bar glides up and the head folds only once you type and results need room.
- **Liquid Glass on Read and Learn**, at the owner's request, so they match Search.
  - Read: every surah and juz row is a glass card over the breathing light, as are the continue card, the bookmark chips and the Surah/Juz switch.
  - Learn: Start review is a primary glass button and Study Lesson a glass button. The four drills are a two-by-two grid of glass tiles, and Stats and Settings are glass pills.
- **First-open jump fixed.** Search and Progress start from a size estimated from the window instead of waiting for layout. This removes the "flash to adjust" the first time a tab is opened.
- Background words (OTA b1a40f0b): the stars are removed (the owner wants words only). Each word now drifts 40pt up and down with a slight sideways sway on a 5 to 6.6 s cycle, so the movement is visible.
- Search home background (OTA 3bf64a02): eight faint Arabic words (رحمة صبر نور توكل سكينة هدى شكر ذكر) and two eight-pointed stars, each drifting slowly, kept off the middle band and hidden while searching. src/components/Glyphs.tsx.
- The top bar sits 16pt lower on every tab (72pt tall). The breathing light is stronger in light mode (0.62); dark mode is back to 0.34. The owner said it was visible in dark mode and barely visible in light mode, and the previous change had been made the wrong way round.
- One shared top bar on all five tabs (src/components/TopBar.tsx): 56pt high in the same place, the title and a subtitle centred, and the theme toggle always in the same spot at the right. Progress's Mark sits in the left slot. Read's title no longer scrolls away.
- OTA b192508f: the idle search group (mark, question, bar) is measured and centred between the greeting and the tab bar, which fixes the owner's "does not feel centred". The breathing wash in dark mode is about twice as strong.
- **Search home, per the owner (OTA b46d76d4).**
  - "Assalamu alaikum" and the Hijri date are centred at the top, with the toggle at the top right.
  - The bar is centred again.
  - The ayah-for-today card is removed; the owner did not like it.
  - The breathing light is now clearly visible: stronger washes, a wider swell, and a 5 to 8 second rhythm.
- OTA d8496240: the Search home says "Assalamu alaikum" instead of a time-of-day greeting. Updates apply 2.5 s after launch and on return to the app, which restores the hook (it was not the crash cause). About shows the running update ID ("built in" when no update has loaded).
- Search placeholder (OTA c1b4654a): 59 example searches instead of 13, shuffled on each launch. Every one is tested to find results locally.
- **Search home, fuller (OTA 2cece299).**
  - Top row: a greeting ("Good evening"), today's Hijri date, and the theme toggle. The toggle had been sitting inside the status bar, out of reach.
  - Under the bar, a "Continue <surah>" glass pill when there is a last-read place.
  - At the foot, "Ayah for today": a short, well-known ayah that changes daily (40 in rotation), in Arabic and English. Tap it to open the ayah.
  - The pill and the ayah fold away when searching.

- **Barakah redesign (OTA 8a52cb55).**
  - One screen of glass tiles over the breathing light: a ring, the day's count, consistency, and the last seven days as dots.
  - Tap a tile to tick it. The Quran tile shows ayahs read against the goal and opens the reader.
  - The month view and "Choose practices" (with the daily goal) are sheets.
- **Guided morning and evening adhkar.**
  - One dhikr per page, 22 for each time: the Arabic (Quran passages from Tanzil), how to say it, what it means, why it is said, and the source.
  - The selection and order follow Hisn al-Muslim. Where the evening wording differs, it is written out in full.
  - A glass counter counts the repetitions and moves on by itself. Progress is kept for the day.
  - Finishing ticks the practice in Barakah.
- **Updates apply immediately.** The app checks for an update on launch and when it comes back to the foreground, then restarts into it. A fresh TestFlight install still opens on its built-in code once.
- **Text scaling** is capped at 1.3x so the one-screen layouts fit an iPhone SE with large text.
- **Progress fix.** Pages were 88pt too tall and ran under the tab bar (Week's Recent box was cut off).
- **AI search.**
  - Anything typed in words is sent, after a short pause, to GET durus.space/api/v1/quran/ask, which uses Groq's free tier (gpt-oss-120b, then 20b; Gemini is the fallback if GEMINI_API_KEY is set).
  - The AI only names refs. The server drops any ref that is not a real place, and the app shows Tanzil text.
  - The picks lead the list with a one-line reason, labelled "Suggested by AI".
  - GROQ_API_KEY is set in Vercel production.
- **App Store audit** saved to docs/app-store-audit.md.

- Search home, per the owner (OTA 5c337f90): centred and clean with no suggestions, no "continue" and no chips. Example searches type themselves into the bar in grey and erase ("Surah about the battle of Badr", "Surah for hopelessness", "32nd surah"...), each one tested to return results. Behind it a slow breathing light (lapis, saffron, teal washes swelling about every eight seconds; still under Reduce Motion). Tapping the bar glides it to the top instead of jumping. Search now reads ordinals ("32nd surah", "the 18th surah") and no longer treats a real word as a typo of another ("hopeless" was matching "homeless"). Badr topic added (Al-Anfal and 3:123); the owner asked not to wait on approval for new topics, so new ones ship live.
- Search rebuilt as one clean list (OTA ce7af734), after the owner said it had drifted from what they wanted. Type anything and the results are ayahs and surahs only: each ayah shows the Arabic, its English (Saheeh International by default, fetched from durus.space once and then kept on the phone) and its reference. A feeling or topic expands into the ayahs it points to, so "i feel sad" shows ayahs, not a topic box. One quiet caption line replaces the reply bubble, topic cards and headings. New server route on durus.space: GET /api/v1/quran/verses?keys=13:28,94:5&translation=20.
- Light and dark toggle on every tab (Search, Read, Progress, Barakah), not just Learn. The long-press zoom centres its transliteration and translation.
- Owner feedback from phone screenshots (OTA 49bf76f4): search looked heavy, and Progress was unreadable. Search: the title is smaller and set lower in a fixed spot, For you is two quiet lines, and six light chips replace the bordered cards; it still does not move while typing. Progress: every view opens with a plain sentence ("12 surahs memorized, 2% of the Quran"), the wall has a caption explaining that each square is an ayah from Al-Fatiha down to An-Nas, juz numbers run down its left side, a legend gives the counts, and juz boxes show their percentage.
- Translation, word by word and transliteration are live (OTA c6868e0a). Prime logged in to Vercel (owner approved the device login), linked the Durus web project, added QF_CLIENT_ID, QF_CLIENT_SECRET, QF_ENV=production and DURUS_APP_KEY as production secrets, and redeployed durus.space. Live check: Ya-Sin returns 83 ayahs with word meanings, transliterations, Saheeh International and 25 footnotes; without the app key the route answers 403. The app's EAS production environment now has EXPO_PUBLIC_QURAN_API and EXPO_PUBLIC_DURUS_KEY. Reading view offers a translator choice: Saheeh International (default), Abdel Haleem, Pickthall, Yusuf Ali, Hilali and Khan, Taqi Usmani.
- Long-press zoom: long press any ayah in the reader and it lifts into a Liquid Glass card with the ayah large, every word over its transliteration and meaning (tap a word to zoom in on it), the full transliteration and translation, and Memorized, Understood, Bookmark and Share. It scales in rather than fading, so the glass always draws.
- Progress rebuilt as one screen with no vertical scroll (OTA a5ab553c). Swipe or tap between Wall (the whole Quran as dots), Juz (30 small fields; tap one to mark its surahs), Stats (two rings and six counts) and Week (reading bars and recent marks). A glass Mark button opens any surah for whole or ayah-by-ayah marking.
- Search holds still and answers. The mark, the question and the bar never move; results scroll above the keyboard with iOS keyboard insets instead of the screen being pushed. A short reply leads the results, written from what the app knows (your marks, where you stopped, the hour, Friday), never interpreting ayahs and never praising. Type-ahead draws on 3,693 natural phrasings built from the approved topics, each tested to return results. "For you" on the empty screen offers continue reading, Friday or late-night readings, and a daily revision pick from surahs you know. The owner approved all 97 topics (2026-11-18).
- Quran server deployed to durus.space (Durus repo, commit 797b326): /api/v1/quran/resources and /api/v1/quran/chapter/:n. It answers "quran_not_configured" until its environment variables are set. Production credentials work: 146 translations, 12 reciters. The Clear Quran is not in this client's catalogue, so the default is Saheeh International (20); Abdel Haleem, Pickthall, Yusuf Ali, Hilali and Khan, Taqi Usmani and Maududi are also available in English.
- Barakah and reading (OTA ea662a2f): the Daily Quran portion card shows how many ayahs were read that day against a goal (10 by default, adjustable on the card), and ticks itself once when the goal is reached. If the card was touched by hand that day it is left alone.
- Quran Foundation integration, built and tested on real data, switched off in the app until a server runs it. The content scope problem is solved: new clients do not get `content`, they get granular scopes, and the owner's client is approved for content.quran.read, content.translations.read, content.audio.read, content.sync.read and content.tafsirs.read. With those, a live run returned all 286 ayahs of Al-Baqarah with word by word meanings and transliterations, a translation, 102 footnotes, and recitation audio with per-word timings. server/qf.ts and server/handler.ts are a plain Fetch API handler (GET /quran/resources, GET /quran/chapter/:n?translation=&reciter=). The app downloads a surah once, keeps it on the phone, refreshes it after seven days, and uses the stored copy offline. The reader has the layers ready: translation with tappable footnotes, transliteration, and a word grid with each word over its meaning or reading. They stay "Comes with Quran.com" until EXPO_PUBLIC_QURAN_API is set.
- Live fixes (OTA 687f9df4): the surah and juz navigator jumps even if the sheet's close event is missed; the reader's link colour follows the page tone; loose keywords in the eight live topics are tightened (night prayer, test tomorrow, far away and table of contents no longer hit them), with tests; smoke tests now cover the flowing layout, sepia and night, the reading view sheet and the Progress surah sheet. Publishing now only happens after a clean preflight run.
- Reader customisation (OTA 1326585d). Five Quran scripts, all checked against every character of the text: Amiri Quran, Scheherazade, Naskh, Amiri, Lateef. Also size, line spacing (compact, normal, airy), page tone (follow the app, paper, sepia, night), ayah by ayah or a flowing page with ornate ayah numbers tinted by status, right or centre alignment, and switches for ayah numbers and marks, all with a live preview. Tapping an ayah floats a glass bar up from the bottom: memorized, understood, bookmark, share, close.
- Progress tab (was Map). Two rings for memorized and understood, stat cards (surahs, juz, pages of the 604, words, surahs understood, in progress), a seven-day reading chart from a new reading log, 30 juz rings, the Ayah Field as one card ("the wall", expandable), recent marks, and a surah list with filters. Tap a surah to open a sheet with whole-surah toggles and an ayah-by-ayah grid.
- Search: results grouped under Topics, Surahs and Ayahs, recent searches, cleaner rows.
- Search, broadened (OTA b7b2494b). The owner approved the eight seed topics (2026-11-18) and asked for hundreds of variations. They are live and matched through 770 keywords and phrases. Filler is dropped ("i feel so", "verses about", "what should i read"), word endings are folded (worrying, worried, worries), and one typo or swapped letter is forgiven in longer words. General questions answer from the metadata: longest or shortest surahs, Meccan or Medinan, the last ten, surahs with N ayahs, and "surprise me" for a random ayah. Type-ahead chips appear as you type. 89 new topics and named passages (Ayat al-Kursi, the three Quls, parents, marriage, illness, prayer, death, stories of the prophets and more) are written but hidden until approved. Search names them as "being reviewed" when matched.
- Bookmarks (OTA 733433db): a bookmark button in the ayah's glass bar, and a Bookmarks row on the Read tab.
- Search is home (OTA f992871f). The app opens to a centred search bar, Claude style, that rises to the top as you type. Tabs are now Search, Read, Map, Learn, Barakah; the separate Ask circle is gone. Search is deterministic and offline: references (2:255), surah numbers and names (kahf, Al-Mulk, the cave), juz (juz 30, juz amma), and Arabic words matched through Tanzil's Simple Clean text as a hidden search key, so typed Arabic finds Uthmani spelling. Feelings and topics answer "being reviewed" until the owner approves the eight seed topics.
- Read tab: continue reading, then surahs or juz. The reader shows the full Tanzil Uthmani text verbatim in Amiri Quran, with the basmala as a header (split off 112 surahs and proven to rejoin byte for byte). Tap an ayah for a Liquid Glass bar: memorized, understood, share. Floating glass back button, a surah and juz pill that opens a Surah or Juz navigator, and Aa for the reading view and Arabic size. The view switcher lists Arabic, Translation, Word by word, Transliteration and Transliteration by word; only Arabic works, and the other four say "Comes with Quran.com". They are not machine made: the app's transliterator was built for vocabulary and does not know recitation rules.
- Map tab: the Ayah Field with the user's marks (saffron memorized, teal understood), counters, a filter, and marking a whole surah from the list. Per-ayah marking is in the reader.
- Everything above is on the phone and works offline. Only JavaScript and a font were added (@expo-google-fonts/amiri-quran), so no build was needed.
- Fix (OTA group 008bcd4d): the owner could not get past Open because Begin was invisible. Liquid Glass does not draw inside a view whose opacity is animated, and Begin sat in a fade in. The same fault hid the glass behind the hifz chips, reminder rows, sign in card, Learn chips and Ask bar. All fades around glass are removed, the Open buttons appear on a timer in reserved space, and the primary button now has a solid lapis base so it cannot disappear. Rule for later: never put glass under an opacity animation.
- Onboarding v3 (issue #2), OTA update group e676cf1b. Open (the word field drifts into the دُرُوس mark) leads to five full screen story pages with a story bar (tap, hold, swipe, 5 s each, still under Reduce Motion), then "What have you memorized?" (Al-Fatiha and Juz Amma as glass chips over a live Ayah Field), "Two gentle reminders" (morning adhkar 6:00, daily review 9:00), "Keep your progress" (sign in on a glass card), and your map with what was marked. The class, book, lesson and pace questions are gone; save writes Book 1, Lesson 1, 10 a day, no class nudge. Liquid Glass on buttons, chips, rows, the Ask bar and the sign in card, with the solid fallback. Tests cover the defaults, hifz written only on save, the keychain path, permission timing and story Reduce Motion. 245 tests pass. Not yet seen on a phone.
- Real Quran text in onboarding (issue #3, closed). The Read hero shows Al-Fatiha 1:1 to 1:3 and the Ask hero shows 13:28 and 94:5, verbatim from Tanzil (source note above). Tanzil is credited in About with a link. Map and hifz use Tanzil's surah names and ayah counts.
- Settings: a Morning adhkar switch, and the book shown above the lesson stepper.
- Package note for the watcher: expo-glass-effect was added to package.json, but it was already autolinked through expo-router at the same version, so no native code changed. OTA was safe.
- Onboarding now opens with a live tour of all five tabs (OTA), at the owner's request. Read shows follow-along word highlighting and a word card. Map lights ayah dots saffron and teal with counters. Learn runs a real Book 1 card. Barakah fills a practice ring. Ask types a feeling and results appear. It advances on its own every 4 seconds, can be swiped or picked by dot, and holds still under Reduce Motion. Read and Ask draw text as ink strokes, so no Quran text is typed by hand. The Arabic questions after it are labelled "Set up Learn". This replaces the earlier copy-only intro.
- Onboarding "How are you learning Arabic?" restyled at the owner's request (OTA). Each path card has a drawn icon (a class with a board, an open book) in a tinted circle that turns lapis when chosen. The cards are roomier with a softer radius, and there is a small "Arabic Course" eyebrow over the title. The pace cards share the new card style. Not yet seen on a phone.
- Delivery is now OTA first, at the owner's request. Native builds happen only when native code changes, and those changes get batched. Durus is not public on the App Store yet, so updates reach TestFlight testers only.
- Over-the-air update of main: tab shell, Barakah and the new copy, for build 10 and build 11 phones alike.
- Over-the-air update on production (runtime 1.0.0): the new onboarding and About copy, built on build 10's code so the unfinished tabs did not go out with it. Branch ota/onboarding-copy. Phones pick it up on their next launch or two.
- Barakah tab. Four practices are tracked by default (Fajr on time, morning adhkar, evening adhkar, daily Quran portion), and ten more can be added under "Choose practices". It has a ring with one segment per practice, a date switcher, a month grid that deepens with what was done (a missed day is just paper, never red), and consistency over the last 30 days instead of a streak. Al-Kahf only shows on Fridays, the Monday and Thursday fast on those days, and the white days on the 13th to 15th of the Hijri month. Sadaqah is yes or no. Everything stays on the phone (no server sync yet, as the spec says for v1). Typecheck, lint, 227 tests and the iOS bundle pass. Not yet seen on a phone.
- Build 10 uploaded to TestFlight after the owner accepted the Apple agreement. Apple processes it in 5 to 10 minutes. It is the old one-screen app, from before the tab shell.
- About blurb and App Store copy rewritten for the Quran app. About now reads: "Durus is for reading, memorizing and understanding the Quran. Read with translation, mark what you have memorized, learn the Arabic behind it, and keep a calm daily practice." App Store: name "Durus: Quran and Arabic", subtitle "Read, memorize, understand", new promo, description and keywords, all inside Apple's limits. There are also interim versions to use until Read, Map, Barakah and Ask actually work, because Apple rejects copy that promises missing features. Em dashes removed from that file.
- Issue #1, onboarding copy, closed. Changed strings: intro title "Read, memorize, and understand the Quran"; intro sub "Read with translation, track what you have memorized, learn the Arabic behind it, and keep a calm daily practice. Learn Arabic with a class, or on your own."; path title "How are you learning Arabic?"; book labels "Book 1", "Book 2", "Book 3"; sign in sub "An account keeps your reading, memorization and lessons if you lose this phone."; done button "Open Durus" (still opens /today); About blurb "Durus keeps the vocabulary from Book 1 of the Arabic Course in working memory, alongside a class that meets weekly." The publisher credit "Islamic University of Madinah" stays. Every string matched the spec. No layout, step or behavior changes. Preflight passes. No test checked the old strings.
- Tab shell: Read, Map, Learn, Barakah, Ask, using the native iOS tab bar (Liquid Glass on iOS 26). Today's app now lives under Learn, unchanged. Ask sits in its own circle beside the bar. Read, Map, Barakah and Ask show a short line saying what is coming. Typecheck, lint, 214 tests and the iOS bundle all pass. Not yet seen on a phone.
- Chat bridge on. The connector can read this relay and the task queue.

## Blocked on the owner

- App Store decisions (see docs/app-store-audit.md): whether to allow guest mode (Apple requires the Quran features to work without an account), moving Clerk to a production instance, and screenshots and metadata in App Store Connect.
- Rotate the Groq key later; it was shared in chat.

- **Rotate the Quran Foundation secret** once things run, since it was shared in chat. Prime keeps it only in the git-ignored server/.env.local.

## Questions

- Issue #4 copy: say "500 words, about 80% of the Quran's words" (true in frequency order), or keep the thematic path and say "about 540"? And may I send the Quran.com email and post the QUL issue as drafted?

- Free smarter search: the owner's Quran Foundation console lists a "Search" permission as available. Requesting it (Permissions, Production, tick Search, submit) would let Durus send open-ended queries to Quran Foundation's own index, free, as a fallback when the built-in matcher finds nothing. Gemini's free embedding tier is the backup option. No paid API needed.

- Approve the 89 new search topics in docs/review/topics.md. Each one points readers to specific ayahs, so it needs a look before it goes live. Reply "approve all", or name the ones to change.
- Onboarding's last story page is still titled "Ask" and shows a feelings query, which the real search answers with "being reviewed" until the topics are approved. Retitle it "Search" and show a surah search instead?
- Word and ayah audio needs a native audio module (expo-audio), so it waits for the next batched build. Say when a build is fine.
- Still not built, and why: translation, footnotes, word by word and transliteration (need Quran Foundation); word and ayah audio (need Quran Foundation or QUL, licence per resource); Quranic Words in Learn (needs lemma data); adhkar flow (needs verified adhkar.json); widgets (native, so they wait for a batched build); AI Ask (owner chose deterministic for now).

- Returning accounts: "I have an account" and keychain sessions now skip the course defaults (and, for "I have an account", the reminders), because a settings write stamped with the current time would beat the server's values and reset that person's lesson and pace. New sign ins via Begin still get the defaults. Confirm that is the intent.
- Settings shows the book instead of a picker, because Books 2 and 3 have no content yet. It becomes a picker when Book 2 is seeded.
- The sign in line promises "Your map, lessons and practice, saved if you change phones", but hifz marks and Barakah are stored on the device only so far. Change the line, or move both into sync?
- The Read hero's line promises translation and footnotes, but the hero shows no English (licence). Keep the line?
- The story bar is drawn plain, not on glass: a glass capsule behind a 3 pt bar read as clutter. Say if it should be glass anyway.
- Hand-written, not from Tanzil: the Learn hero's answer options ("said", "Lord", "day", "earth") and the word card's gloss "Lord" and root ر ب ب. The Arabic word itself comes from the Tanzil text.
- The glass fallback uses the app's surface token (#fcfbf8 light, #1b2130 dark) rather than the spec's #FAF6EE / #181D2B, because Durus tokens win.
- Older UI still has em dashes: the "no data" placeholder in Stats (src/app/stats.tsx) and two headings in scripts/export-lessons.ts. Fix them?

- The app's motion rule allowed only four animations. The tour adds looping demos because the owner asked for live animation. Say if any should be calmer.


- Spec conflict, resolved toward the codebase: the spec allows optional streaks (off by default), but the app's rule is no streaks, so Barakah has none. The spec's adhkar haptics will hit the same thing later, because the app allows only two haptics. Say if either should change.


- Where is the backend repo behind durus.space, and may Prime deploy to it? The planned /api/qf/sync and /api/ask routes would live there.
