# DurusIOS: relay from Prime

Updated: 2026-11-15, 19:15

## Now

Next: the Map. The Ayah Field needs ayah counts per surah, which come from the Quran data, so Prime is checking whether a structural layout can be built without Quran Foundation access.
Build 11 (tab shell and the new copy) is building on EAS and will go to TestFlight on its own when it finishes.

Both handoffs from 15 November are read. The numbers trainer is further along in the code than the handoff says (stage list and teach flow are committed).

## Shipped

- Over-the-air update on production (runtime 1.0.0): the new onboarding and About copy, built on build 10's code so the unfinished tabs did not go out with it. Branch ota/onboarding-copy. Phones pick it up on their next launch or two.
- Barakah tab. Four practices are tracked by default (Fajr on time, morning adhkar, evening adhkar, daily Quran portion), and ten more can be added under "Choose practices". It has a ring with one segment per practice, a date switcher, a month grid that deepens with what was done (a missed day is just paper, never red), and consistency over the last 30 days instead of a streak. Al-Kahf only shows on Fridays, the Monday and Thursday fast on those days, and the white days on the 13th to 15th of the Hijri month. Sadaqah is yes or no. Everything stays on the phone (no server sync yet, as the spec says for v1). Typecheck, lint, 227 tests and the iOS bundle pass. Not yet seen on a phone.
- Build 10 uploaded to TestFlight after the owner accepted the Apple agreement. Apple processes it in 5 to 10 minutes. It is the old one-screen app, from before the tab shell.
- About blurb and App Store copy rewritten for the Quran app. About now reads: "Durus is for reading, memorizing and understanding the Quran. Read with translation, mark what you have memorized, learn the Arabic behind it, and keep a calm daily practice." App Store: name "Durus: Quran and Arabic", subtitle "Read, memorize, understand", new promo, description and keywords, all inside Apple's limits. There are also interim versions to use until Read, Map, Barakah and Ask actually work, because Apple rejects copy that promises missing features. Em dashes removed from that file.
- Issue #1, onboarding copy, closed. Changed strings: intro title "Read, memorize, and understand the Quran"; intro sub "Read with translation, track what you have memorized, learn the Arabic behind it, and keep a calm daily practice. Learn Arabic with a class, or on your own."; path title "How are you learning Arabic?"; book labels "Book 1", "Book 2", "Book 3"; sign in sub "An account keeps your reading, memorization and lessons if you lose this phone."; done button "Open Durus" (still opens /today); About blurb "Durus keeps the vocabulary from Book 1 of the Arabic Course in working memory, alongside a class that meets weekly." The publisher credit "Islamic University of Madinah" stays. Every string matched the spec. No layout, step or behavior changes. Preflight passes. No test checked the old strings.
- Tab shell: Read, Map, Learn, Barakah, Ask, using the native iOS tab bar (Liquid Glass on iOS 26). Today's app now lives under Learn, unchanged. Ask sits in its own circle beside the bar. Read, Map, Barakah and Ask show a short line saying what is coming. Typecheck, lint, 214 tests and the iOS bundle all pass. Not yet seen on a phone.
- Chat bridge on. The connector can read this relay and the task queue.

## Blocked on the owner

- **Quran Foundation credentials.** Reading the Quran, Quranic Words and Ask all need a client id and secret from the Quran Foundation Developer Console. Nothing Quranic gets typed in by hand.

## Questions

- Build 11 (the tab shell) uses the same runtime, 1.0.0, so when it launches it will download the copy update and show the old one-screen app instead of the tabs. Prime recommends version 1.1.0 for the expansion: build 12 then gets its own update lane and 1.0.0 phones are left alone. Go ahead?

- Spec conflict, resolved toward the codebase: the spec allows optional streaks (off by default), but the app's rule is no streaks, so Barakah has none. The spec's adhkar haptics will hit the same thing later, because the app allows only two haptics. Say if either should change.


- Where is the backend repo behind durus.space, and may Prime deploy to it? The planned /api/qf/sync and /api/ask routes would live there.
- Is version 1.0.0 already live on the App Store? If it is, the expansion build needs a version bump.
