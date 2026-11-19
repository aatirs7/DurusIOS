# App Store readiness audit (2026-11-18)

This was a read-only audit by a Prime sub-agent. Work through the blockers first.

## Blockers

1. **Sign-in is required to use anything (Guideline 5.1.1(v)).**
   - `src/app/index.tsx:29` sends signed-out people to onboarding or the welcome screen.
   - The sign-in step in onboarding has no way to skip it.
   - Fix: add a guest mode where Search, Read, Progress and Barakah work locally. Ask for an account only for sync and Learn.
2. **Clerk is probably on its development instance (`pk_test_` in the export).**
   - Move to a production instance.
   - Redo the Apple and Google sign-in credentials there.
   - Create the `review@durus.space` demo account there.
3. **No privacy policy link in the app.** Add links to durus.space/privacy and durus.space/support in About or Settings.
4. **`docs/app-store-metadata.md` is out of date (Guideline 2.3.1).**
   - It describes audio and The Clear Quran, which the app does not have.
   - It still mentions "coming" tabs.
   - It says "everything runs on the device".
   - Rewrite it for the five tabs: Search, Read, Progress, Learn and Barakah.
5. **Submit a fresh production build from main.** On first launch the reviewer sees the JavaScript built into the binary, not the latest update.

## Should fix

6. **The AI search ("Ask") needs disclosure.**
   - Show a notice and get consent before the first query goes to Groq or Gemini.
   - Name Groq and Gemini in the privacy policy.
   - Add Search History to the App Privacy answers.
   - Ship Ask in the reviewed build.
7. **Credits are stale.**
   - About and the reader footer still say Quran.com is "coming".
   - Credit Quran Foundation and the translators.
   - Add the missing font credits.
   - Get the course permission in writing.
8. **Leftover "coming soon" text** in `home.tsx` (pending topics), `reply.ts:56` and `settings.tsx:161`.
9. **The runtime version is pinned to 1.0.0.** Bump it for the store build, or use the fingerprint policy, so updates only land on builds with matching native code.
10. **Small screens and large text are untested.**
    - Test on iPhone SE with large text.
    - Watch the fixed heights in `map.tsx` (around lines 642, 754 and 806).
    - Consider `maxFontSizeMultiplier`.
11. **No privacy manifest.** Add `ios.privacyManifests`, covering UserDefaults, file timestamp, boot time and disk space.
12. **The app key (`EXPO_PUBLIC_DURUS_KEY`) is public.** Rate-limit the Quran proxy and Ask on the server.

## Nice to have

- Reword or turn off the Face ID permission string from expo-secure-store.
- Show the real build number in About (use expo-application).

## Already fine

- Account deletion is in Settings.
- Sign in with Apple is offered.
- The support and privacy pages are live.
- iPad is off, the app is portrait only, and the encryption flag is set.

## What the owner prepares in App Store Connect

- Screenshots at 6.9" (1320×2868) and 6.5" (1284×2778).
- The description and keywords.
- The support URL.
- The age rating, including the AI content question.
- The App Privacy answers.
- The review notes.
- A support mailbox someone reads.
