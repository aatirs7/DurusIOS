# DurusIOS: relay from Prime

Updated: 2026-11-15, 18:20

## Now

Barakah is paused: the logic and its tests are written but not committed. It resumes after the TestFlight upload.
Resubmitting build 10 to TestFlight at about 18:20, after the Apple agreement was accepted.

Building Barakah, which runs entirely on the phone. The Map comes after it.
Build 10 (from the code as it was at 17:05, before the tab shell) has finished on EAS. Its upload to TestFlight waits on the Apple agreement below.
Both handoffs from 15 November are read. The numbers trainer is further along in the code than the handoff says (stage list and teach flow are committed).

## Shipped

- Issue #1, onboarding copy, closed. Changed strings: intro title "Read, memorize, and understand the Quran"; intro sub "Read with translation, track what you have memorized, learn the Arabic behind it, and keep a calm daily practice. Learn Arabic with a class, or on your own."; path title "How are you learning Arabic?"; book labels "Book 1", "Book 2", "Book 3"; sign in sub "An account keeps your reading, memorization and lessons if you lose this phone."; done button "Open Durus" (still opens /today); About blurb "Durus keeps the vocabulary from Book 1 of the Arabic Course in working memory, alongside a class that meets weekly." The publisher credit "Islamic University of Madinah" stays. Every string matched the spec. No layout, step or behavior changes. Preflight passes. No test checked the old strings.
- Tab shell: Read, Map, Learn, Barakah, Ask, using the native iOS tab bar (Liquid Glass on iOS 26). Today's app now lives under Learn, unchanged. Ask sits in its own circle beside the bar. Read, Map, Barakah and Ask show a short line saying what is coming. Typecheck, lint, 214 tests and the iOS bundle all pass. Not yet seen on a phone.
- Chat bridge on. The connector can read this relay and the task queue.

## Blocked on the owner

- **Apple agreement.** Apple refuses requests with "A required agreement is missing or has expired". This is why TestFlight stopped working. Fix: sign in to App Store Connect as the account holder, open Business (or developer.apple.com/account), accept the pending agreement, and renew the membership if it has lapsed. Build 10 cannot reach TestFlight until then. After it is fixed, run `npx eas-cli submit -p ios --latest` or ask here and Prime will resubmit.
- **Quran Foundation credentials.** Reading the Quran, Quranic Words and Ask all need a client id and secret from the Quran Foundation Developer Console. Nothing Quranic gets typed in by hand.

## Questions

- Outside src/, docs/app-store-metadata.md still says "Madinah Arabic vocabulary" (App Store subtitle and description). The issue was scoped to src/, so it is unchanged. Rewrite it for the Quran app?
- The About blurb still describes only the vocabulary drill. Rewrite it for the full app?

- Where is the backend repo behind durus.space, and may Prime deploy to it? The planned /api/qf/sync and /api/ask routes would live there.
- Is version 1.0.0 already live on the App Store? If it is, the expansion build needs a version bump.
