# App Store Connect metadata

Everything here is written to be pasted into App Store Connect as-is. Character
limits are Apple's and each field is already inside its own.

Anything marked **YOU** needs a decision or an action that cannot be done from
the repo.

---

## Name — 30 char limit

```
Durus: Arabic Revision
```

(22 characters.)

## Subtitle — 30 char limit

```
Madinah Arabic vocabulary
```

(25 characters.)

## Promotional text — 170 char limit

Editable without a new build, so this is the field to change when Book 2 lands.

```
The vocabulary you have been taught, brought back just before you forget it. Built for students working through the Madinah Arabic books, one lesson at a time.
```

(154 characters.)

## Description — 4000 char limit

```
Durus is a revision app for the vocabulary of the Madinah Arabic course.
Book 1 is in there in full today; Book 2 and Book 3 follow.

It is built around one idea: you should see a word again just before you would
have forgotten it. Not every day, which is unsustainable once the book gets
long, and not at random, which teaches nothing.

JUST ANSWER

There is nothing to set after a card. Whether you were right comes from your
answer, and how well you knew it comes from how long you took. No buttons to
press afterwards, no deck to build, no configuration before you start.

THE QUESTION GETS HARDER AS THE WORD GETS EASIER

A new word gives you four meanings to choose from. Once you have it twice, it
stops offering options and asks you to type the meaning. Then it turns around
and asks for the Arabic, first by choice and then built letter by letter.

Recognising a word and producing it are different skills, so they are scheduled
apart. Production only begins once recognition is solid.

NOTHING BEFORE YOU HAVE BEEN TAUGHT IT

You tell Durus which book and which lesson your class is on, and it never
shows you a word from beyond it. The newest lesson stays in tight rotation for the fortnight
after you reach it, because that is the one being tested.

THREE MORE DRILLS

Speed drill: twenty words against a shrinking clock, to turn recognition into
recall. It gets faster only when you are ready, and it never moves a word's
next review.

Case drill: a sentence with one final harakah missing. The endings are the
grammar, so they get a drill of their own.

Flashcards: browsing rather than drilling, for when you want to read through a
lesson without being tested on it.

FULLY VOWELLED, UNTIL YOU DO NOT NEED IT

Every word is stored with its harakat. One setting strips them, which is the
whole point of learning to read the script.

QUIET BY DESIGN

No streaks. No badges. No congratulation. Durus does not editorialise on what
you did or did not do today; it shows you what is due and gets out of the way.
Reminders are one or two times a day that you pick, and nothing else.

WORKS WITHOUT A SIGNAL

Everything runs on the device. Open it on a train with no reception and the
full session is there. Your progress syncs to your account when you are back
online, so losing your phone does not lose your work.

YOUR DATA IS YOURS

Export everything you have ever answered as a JSON file, any time, from
Settings. Delete your account and every answer with it, from inside the app.
No analytics, no advertising, no tracking of any kind.

CREDITS

The vocabulary is from Lessons in Arabic Language for Non-Native Speakers
(دروس اللغة العربية لغير الناطقين بها) by Dr. V. Abdur Rahim, published by the
Islamic University of Madinah, used with permission. The full credit is in the
app under Settings, About Durus.
```

## Keywords — 100 char limit, comma separated, no spaces after commas

```
arabic,madinah,madeenah,vocabulary,spaced,repetition,flashcards,quran,nahw,srs,revision,islam
```

(92 characters.)

## URLs

| Field | Value |
|---|---|
| Support URL | `https://durus.space/support` — live, publicly reachable, verified 200 signed out. |
| Marketing URL | `https://durus.space` |
| Privacy Policy URL | `https://durus.space/privacy` — live, publicly reachable, verified 200 signed out. |

**YOU** — both pages print `hello@durus.space`. That mailbox has to exist and
be read, because it is the address App Review will use if they have a question
and the one a user reaches for to delete an account they cannot sign in to.

## Category

- Primary: **Education**
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
| Diagnostics / analytics | **No** | — | — | — |
| Usage data | **No** | — | — | — |
| Location, contacts, photos, health | **No** | — | — | — |

Answer **No** to "Do you or your third-party partners use data for tracking?"
Nothing in the app tracks across other companies' apps or sites.

Email and name come from Clerk. The revision history and settings are the rows
in Neon. The device id is minted locally and exists only to tell two of your
own phones apart during sync.

---

## App Review notes

**YOU** — a demo account has to be created in the Clerk dashboard before this
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
  The vocabulary is from the Madinah Arabic course, used with permission from
  the publisher. The credit is in the app under Settings -> About Durus.
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

**YOU** — these need a device or simulator; they cannot be produced from here.

Required: **6.9" iPhone**, 1320 × 2868 px. That single set now covers every
size; a 6.5" set is optional.

Suggested six, in order:

1. **Today** — the due count, with a real number rather than zero
2. **Review, a choice card** — Arabic word above four options
3. **Review, answered** — the verdict pill, transliteration and the gender chip
4. **Speed drill** — mid-run, ring partly drained
5. **Stats** — the maturity bar and the 7-day median
6. **Lesson** — the paged grammar note

Take them in **light mode**. The dark screenshots read as a different app
beside the icon, which is paper.

---

## What's New — first release

```
First release.
```

Apple accepts this for 1.0 and anything longer reads as filler.
