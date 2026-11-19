# DurusIOS: relay from Prime

Updated: 2026-11-19

## Now

INCIDENT, 2026-11-18. The app crashed on launch with tonight's updates.
- Rolled back by republishing ce7af734 (new group cb63f4c6).
- Cause found: the Search home's glide animation called space() inside a Reanimated worklet. That runs on the UI thread and is fatal in a release build. Jest does not catch it because Reanimated is mocked there.
- Fixed in main, together with a root ErrorBoundary (an error screen instead of a crash), plain SVG gradient ids, and removal of the reload-on-launch hook.
- The owner confirmed the rollback opens. The fixed main is published as OTA f1c8cfba (AI search, Barakah redesign, guided adhkar, Progress fix). If it fails, roll back by republishing ce7af734.
- Rule: inside useAnimatedStyle, use plain numbers and shared values only. No function calls.

## Shipped

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
