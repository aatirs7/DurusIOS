# App Store Connect metadata

Everything here is written to be pasted into App Store Connect as-is. Character
limits are Apple's and each field is already inside its own.

Anything marked **YOU** needs a decision or an action that cannot be done from
the repo.

---

**READ FIRST.** This copy describes the full Quran app. Apple rejects
metadata that promises features the build does not have (guideline 2.3.1), so
paste each section only once the feature it names is in the submitted build.
As of the current code: Learn (the Arabic Course) works; Read, Map, Barakah and Ask are
tabs with a "coming" line. Until they ship, use the "Interim" versions below.

## Name (30 char limit)

```
Durus: Quran and Arabic
```

(23 characters.)

## Subtitle (30 char limit)

```
Read, memorize, understand
```

(26 characters.)

Interim, while only Learn works:

```
Arabic for the Quran
```

(20 characters.)

## Promotional text (170 char limit)

Editable without a new build.

```
Read the Quran with translation, light up every ayah you memorize, learn the Arabic behind it, and keep a calm daily practice. No streaks, no noise.
```

(148 characters.)

Interim:

```
Learn the Arabic of the Quran, one lesson at a time, with each word brought back just before you would forget it. Reading, memorization and more are on the way.
```

(160 characters.)

## Description (4000 char limit)

```
Durus is a calm place to read, memorize and understand the Quran.

READ

The Quran in the Uthmani script, with The Clear Quran translation underneath
and its footnotes one tap away. Tap any word to hear it on its own and see
what it means. Follow along as a reciter reads, word by word, and repeat an
ayah or a range as many times as you need for memorization.

YOUR MAP

Every ayah of the Quran as a single dot. Mark what you have memorized and what
you understand, and watch the map fill in, juz by juz. A quiet record of
everything you carry with you.

LEARN

The Arabic Course: the vocabulary of a classic three book Arabic course, lesson
by lesson, with every word brought back just before you would forget it. There
is nothing to rate after a card. Whether you were right comes from your answer,
and how well you knew it comes from how long you took.

The question gets harder as the word gets easier: four meanings to choose from
at first, then typing the meaning, then producing the Arabic itself. A speed
drill, a case drill for the final harakah, and flashcards for reading through
a lesson.

BARAKAH

Small daily practices, done consistently. Fajr on time, the morning and evening
adhkar, your daily portion of Quran, and others you choose. Durus shows how
consistent you have been over the last thirty days, never a streak to protect.

ASK

Ask about a surah, or say how you are feeling, and Durus points you to ayahs to
read. The Quran text and translation always come from the verified source,
never from the AI.

QUIET BY DESIGN

No streaks. No badges. No congratulation. Durus shows you what is there and gets
out of the way. Reminders are times you pick, and nothing else.

WORKS WITHOUT A SIGNAL

Everything runs on the device. Your progress syncs to your account when you are
back online, so losing your phone does not lose your work.

YOUR DATA IS YOURS

Export everything you have ever answered, any time, from Settings. Delete your
account and every answer with it, from inside the app. No analytics, no
advertising, no tracking of any kind.

CREDITS

Quran text and translations from Quran.com, provided by the Quran Foundation.
The Arabic Course vocabulary is from Lessons in Arabic Language for Non-Native
Speakers (دروس اللغة العربية لغير الناطقين بها) by Dr. V. Abdur Rahim, published
by the Islamic University of Madinah, used with permission. Full credits are in
the app under Settings, About Durus.
```

**YOU**: the Quran.com credit line and the Ask section describe work that is
not built yet, and both depend on Quran Foundation access being approved. The
Ask section also changes the privacy answers below (messages go to a server).

## Keywords (100 char limit, comma separated, no spaces after commas)

```
quran,arabic,hifz,memorize,translation,adhkar,dhikr,barakah,surah,vocabulary,islam,muslim,recite
```

(96 characters.)

## URLs

| Field | Value |
|---|---|
| Support URL | `https://durus.space/support` : live, publicly reachable, verified 200 signed out. |
| Marketing URL | `https://durus.space` |
| Privacy Policy URL | `https://durus.space/privacy` : live, publicly reachable, verified 200 signed out. |

**YOU** : both pages print `hello@durus.space`. That mailbox has to exist and
be read, because it is the address App Review will use if they have a question
and the one a user reaches for to delete an account they cannot sign in to.

## Category

- Primary: **Education** (switch to **Reference** or **Lifestyle** only if Read becomes the lead feature)
- Secondary: **Reference**

## Age rating

Answer the questionnaire with **no** to every content category. There is no
violence, no sexual content, no gambling, no drugs, no horror, no profanity,
no user-generated content, no unrestricted web access. It should come out
**4+**.

## Export compliance

Already answered in the binary: `app.json` sets
`ITSAppUsesNonExemptEncryption: false`. Durus uses only HTTPS, which is exempt.
App Store Connect will not ask again.

---

## App Privacy questionnaire

This has to agree with `/privacy` on the site. As the app stands:

| Data type | Collected | Linked to identity | Used for | Tracking |
|---|---|---|---|---|
| Email address | Yes | Yes | App functionality | No |
| Name | Yes | Yes | App functionality | No |
| User content (revision history) | Yes | Yes | App functionality | No |
| Identifiers (device id) | Yes | Yes | App functionality | No |
| Diagnostics / analytics | **No** | : | : | : |
| Usage data | **No** | : | : | : |
| Location, contacts, photos, health | **No** | : | : | : |

Answer **No** to "Do you or your third-party partners use data for tracking?"
Nothing in the app tracks across other companies' apps or sites.

Email and name come from Clerk. The revision history and settings are the rows
in Neon. The device id is minted locally and exists only to tell two of your
own phones apart during sync.

---

## App Review notes

**YOU** : a demo account has to be created in the Clerk dashboard before this
is pasted in, because the app is gated behind sign-in.

```
Durus requires an account, because the whole purpose of the app is that a
student's revision history survives losing their phone.

DEMO ACCOUNT
  Email:    review@durus.space
  Password: <fill in>

On the sign-in screen, choose "Sign in with email", enter the address above,
and the app will ask for the password. (Accounts without a password receive a
one-time code by email instead; this account has a password set so no inbox
access is needed.)

Sign in with Apple also works and is the fastest route if preferred.

ACCOUNT DELETION
  Settings -> Account -> Delete account. Two confirmations, then the account
  and all its data are removed from the server and the device.

NOTIFICATIONS
  Local notifications only. There is no push server. The app asks for
  permission during onboarding, after the user has chosen reminder times.
  Declining has no effect on any other feature.

CONTENT
  The Arabic Course vocabulary is from Lessons in Arabic Language for
  Non-Native Speakers by Dr. V. Abdur Rahim, published by the Islamic
  University of Madinah, used with permission. The credit is in the app under
  Settings -> About Durus.
```

### Creating the demo account

In the Clerk dashboard for the production instance:

1. **Users → Create user**, email `review@durus.space`, set a password.
2. Make sure **Password** is enabled as a sign-in factor for the instance,
   otherwise `signIn.create` will not report it and the app will fall back to
   emailing a code.
3. Sign in as that account once on a device and complete onboarding, so the
   reviewer lands on a Today screen with real content rather than an empty one.

That last step matters more than it sounds. A reviewer who signs in and sees
"0 due" with nothing to do may conclude the app does not work.

---

## Screenshots

**YOU** : these need a device or simulator; they cannot be produced from here.

Required: **6.9" iPhone**, 1320 × 2868 px. That single set now covers every
size; a 6.5" set is optional.

Suggested six, in order:

1. **Today** : the due count, with a real number rather than zero
2. **Review, a choice card** : Arabic word above four options
3. **Review, answered** : the verdict pill, transliteration and the gender chip
4. **Speed drill** : mid-run, ring partly drained
5. **Stats** : the maturity bar and the 7-day median
6. **Lesson** : the paged grammar note

Take them in **light mode**. The dark screenshots read as a different app
beside the icon, which is paper.

---

## What's New : first release

```
First release.
```

Apple accepts this for 1.0 and anything longer reads as filler.
