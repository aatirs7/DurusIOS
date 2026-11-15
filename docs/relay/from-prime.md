# DurusIOS: relay from Prime

Updated: 2026-11-15, 17:10

## Now

Build 10 (version 1.0.0, current main) is building on EAS and is queued to go to TestFlight.
Next: the expansion's first phase. A tab shell (Read, Map, Learn, Barakah, Ask) with today's app moved under Learn, then the parts that need no outside data: Barakah and the Map.
Both handoffs from 15 November are read. The numbers trainer is further along in the code than the handoff says (stage list and teach flow are committed).

## Shipped

- Chat bridge on. The connector can read this relay and the task queue.

## Blocked on the owner

- **Apple agreement.** Apple refuses requests with "A required agreement is missing or has expired". This is why TestFlight stopped working. Fix: sign in to App Store Connect as the account holder, open Business (or developer.apple.com/account), accept the pending agreement, and renew the membership if it has lapsed. Build 10 cannot reach TestFlight until then. After it is fixed, run `npx eas-cli submit -p ios --latest` or ask here and Prime will resubmit.
- **Quran Foundation credentials.** Reading the Quran, Quranic Words and Ask all need a client id and secret from the Quran Foundation Developer Console. Nothing Quranic gets typed in by hand.

## Questions

- Where is the backend repo behind durus.space, and may Prime deploy to it? The planned /api/qf/sync and /api/ask routes would live there.
- Is version 1.0.0 already live on the App Store? If it is, the expansion build needs a version bump.
