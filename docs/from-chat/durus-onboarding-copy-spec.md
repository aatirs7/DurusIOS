# Durus onboarding: copy update

For: DurusIOS Prime session.
Date: 2026-11-15.
Files: `src/app/onboarding.tsx`, plus a grep across `src/` (section 3).

**This is a wording change only.** Keep the current onboarding exactly as it is: same steps, same order, same class/self branching, same components, same styles, same layout, same motion, same ticks and `WordField`. Do not add screens, glass, or new questions. Only the strings listed below change.

The codebase is the source of truth. If a string below no longer matches what is in the file, flag it in the relay instead of guessing.

Hard rules: no em dashes in copy or comments.

---

## 1. Why

Onboarding still describes the app as a Madinah vocabulary drill. Durus is now a Quran app (Read, Map, Learn, Barakah, Ask). The copy should describe that app, and "Madinah" should not appear in any user-facing string.

## 2. String changes in `onboarding.tsx`

### Intro step

| | Current | New |
| --- | --- | --- |
| Title | Learn the Madinah vocabulary, and keep it | Read, memorize, and understand the Quran |
| Sub | Durus drills the words the Madinah books teach and brings each one back just before you would forget it. Follow a class lesson by lesson, or start at the beginning on your own. | Read with translation, track what you have memorized, learn the Arabic behind it, and keep a calm daily practice. Learn Arabic with a class, or on your own. |

The sub's last sentence still sets up the next question, as the existing comment requires.

### Path step

| | Current | New |
| --- | --- | --- |
| Title | How are you learning? | How are you learning Arabic? |

Sub and both choice cards stay as they are.

### Book step

`BOOKS` labels:

| Current | New |
| --- | --- |
| Madinah Book 1 | Book 1 |
| Madinah Book 2 | Book 2 |
| Madinah Book 3 | Book 3 |

Availability flags unchanged. Update the comment above `BOOKS` that says the books are "named in full" so it no longer describes the old reasoning.

### Sign in step

| | Current | New |
| --- | --- | --- |
| Sub | An account is what keeps your progress if you lose this phone. | An account keeps your reading, memorization and lessons if you lose this phone. |

### Done step

| | Current | New |
| --- | --- | --- |
| Button | Start reviewing | Open Durus |

Bullets stay as they are. The button still routes to `/today`.

Everything else in the file (pace, lesson, reminders copy, the "You're set" title) stays as it is.

## 3. "Madinah" elsewhere

Grep `src/` for `Madinah`, `Medina` and `madinah`. For every **user-facing** string:

- The books become "Book 1", "Book 2", "Book 3".
- The course or track name becomes "Arabic Course".
- **Exception:** the author and publisher attribution in About/Credits stays, because the permission terms require it.
- Code comments, identifiers, table names and file names do not need to change.

Before editing, list every user-facing hit in the relay with what it will become.

## 4. Done means

- Only strings changed. No style, layout, step or behavior diffs.
- `npm run preflight` passes. Update any test that asserts on the old strings.
- The list of every changed string posted to the relay.
