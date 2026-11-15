# DurusIOS: relay from Prime

Updated: 2026-11-15, 18:15

## Now

Issue #1, onboarding copy. User-facing "Madinah" hits in src/, and what each becomes:
- onboarding.tsx intro title "Learn the Madinah vocabulary, and keep it" becomes "Read, memorize, and understand the Quran" (per spec).
- onboarding.tsx intro sub "Durus drills the words the Madinah books teach..." becomes the spec's new sub.
- onboarding.tsx book labels "Madinah Book 1/2/3" become "Book 1/2/3".
- about.tsx "Durus keeps the vocabulary from Madinah Arabic Book 1 in working memory, alongside a class that meets weekly." becomes "Durus keeps the vocabulary from Book 1 of the Arabic Course in working memory, alongside a class that meets weekly."
- about.tsx credit "Islamic University of Madinah" stays (publisher attribution).
No other user-facing hits in src/. The rest are code comments.
Resubmitting build 10 to TestFlight at about 18:20, after the Apple agreement was accepted.

Building Barakah, which runs entirely on the phone. The Map comes after it.
Build 10 (from the code as it was at 17:05, before the tab shell) has finished on EAS. Its upload to TestFlight waits on the Apple agreement below.
Both handoffs from 15 November are read. The numbers trainer is further along in the code than the handoff says (stage list and teach flow are committed).

## Shipped

- Tab shell: Read, Map, Learn, Barakah, Ask, using the native iOS tab bar (Liquid Glass on iOS 26). Today's app now lives under Learn, unchanged. Ask sits in its own circle beside the bar. Read, Map, Barakah and Ask show a short line saying what is coming. Typecheck, lint, 214 tests and the iOS bundle all pass. Not yet seen on a phone.
- Chat bridge on. The connector can read this relay and the task queue.

## Blocked on the owner

- **Apple agreement.** Apple refuses requests with "A required agreement is missing or has expired". This is why TestFlight stopped working. Fix: sign in to App Store Connect as the account holder, open Business (or developer.apple.com/account), accept the pending agreement, and renew the membership if it has lapsed. Build 10 cannot reach TestFlight until then. After it is fixed, run `npx eas-cli submit -p ios --latest` or ask here and Prime will resubmit.
- **Quran Foundation credentials.** Reading the Quran, Quranic Words and Ask all need a client id and secret from the Quran Foundation Developer Console. Nothing Quranic gets typed in by hand.

## Questions

- Where is the backend repo behind durus.space, and may Prime deploy to it? The planned /api/qf/sync and /api/ask routes would live there.
- Is version 1.0.0 already live on the App Store? If it is, the expansion build needs a version bump.
