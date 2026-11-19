# Durus Learn: Quranic Words track spec

For: DurusIOS Prime session.
Date: 2026-11-19.
Basis: research report "Designing a Listening-First Quranic Words Curriculum" (owner commissioned, 19 Nov). Key sources are cited inline.

The codebase is the source of truth. Where this spec conflicts with code (SRS engine, fold, card/lesson schema, the Numbers trainer's "stages as synthetic lessons" pattern), adapt and flag it in the relay rather than overriding.

Hard rules: no em dashes in code, copy, comments or data. No pure white or black. Center aligned, no data tables in UI. No praise, no streaks. Arabic never selectable. Nothing religious ships unverified. No AI-generated glosses, notes or translations at build time or runtime.

---

## 1. Goal

Learn the most frequent Quranic words so the learner can **hear them in recitation and roughly follow the meaning**. The hook is the popular claim "about 500 words make up 80% of the Quran". The research confirms it as a word-count figure: roughly 125 lemmas cover about 50%, 250 about 70%, 500 about 80% of running words (Understand Al-Qur'an Academy course counts; Abdulraheem, *80% of Qur'anic Words*, 82.6% = 64,282 of ~77,800; a QAC-derived top-500 list at 62,430 occurrences).

What the claim does not mean: 80% coverage is not comprehension. Listening research puts adequate comprehension at 90 to 95% of words known (van Zeeland and Schmitt 2013). At 80%, one word in five is unknown, and those tend to be the content words. So:

- **Promise:** "recognize most of the words you hear, and follow the gist".
- **Never promise:** "understand 80% of the Quran".

Learn becomes: this track first, the Arabic Course (books) below it as "go deeper".

## 2. First task: compute the real numbers (blocks UI copy)

Before any screen or copy, build the frequency table and report it in the relay.

- **Denominator:** orthographic words (about 77,429), which is how learners hear and see words.
- **Unit:** lemma (all inflected forms of one word together). Clitics (wa-, fa-, bi-, li-, ka-, sa-, al-) and pronoun suffixes are separate **parsing skills** (section 4), not lemmas.
- **A token counts as known** when its stem lemma is known and every clitic on it has been taught.
- **Report:** lemmas needed for 25, 50, 60, 70, 80, 90% coverage; coverage per stage in section 5; the share that is function words.
- **Data:** Quran Foundation word-by-word via Content Sync for words and audio; morphology (lemma, root, POS, segments) from QUL. See section 10 for licensing gates. QAC (corpus.quran.com) may be used **offline only** to cross-check counts, never bundled.
- **Branding follows the numbers.** If 80% lands at 540 lemmas, the copy says 540, or says "500" with whatever honest percentage 500 reaches. No hardcoded "500 = 80%".

## 3. The Learn page

Top, centered:

- Coverage meter: **"Words you know make up 34% of the words in the Quran"**, a calm bar with a marker at 80%. Tap for "How this is counted" (one short paragraph).
- Two secondary lines:
  - **"Ayahs you can mostly follow: 1,240"** (ayahs where at least 90% of words are known).
  - **"Your memorized surahs: 87% of words known"** (only if Map has memorized surahs).
- One **Start** button (reviews then new words, section 7).

Below: the **path**, a vertical list of stages (section 5), each a ring filling with progress. Completed stages show a quiet line, e.g. "Al-Fatiha: every word known". No confetti, no praise.

Below that: **"Learn from a surah"** card, and the **Arabic Course** card ("Go deeper: grammar and full sentences").

## 4. Two kinds of learnable items

1. **Lemma cards** (vocabulary). One card per lemma, showing its 2 to 4 most frequent surface forms.
2. **Parsing skills.** Taught once with a short explanation, then practiced inside lemma drills. They count toward coverage because they unlock thousands of tokens.
   - al- (and how it assimilates in sound: ar-rahman, an-nas)
   - Pronoun suffixes: -hu, -hum, -ka, -kum, -i, -na
   - Prefixes: wa-, fa-, bi-, li-, ka-, sa-, la- of emphasis
   - Verb person prefixes: ya-, ta-, na-, a-; suffixes -u/-una (they), -tum (you all)
   - Sound plurals: -un/-in, -at
   - Connected speech (section 8): hamzat al-wasl, idgham, waqf endings

Data model: follow the Numbers trainer precedent (stages as synthetic lesson rows with a discriminator on `lessons`, items as ordinary `cards` rows). Parsing skills need their own card kind or a flag; Prime picks the shape and flags it. Content is server-owned and pull-only: seed into Neon, ship via `lessons.json`, as for the trainer.

## 5. Stage map

Coverage numbers are estimates; replace with section 2's computed values.

| # | Stage | New items | Cum. lemmas | Est. coverage | Why here |
| --- | --- | --- | --- | --- | --- |
| 0 | Al-Fatiha | ~20 words + al- and pronoun intro | ~20 | 25 to 30% | Recited 17+ times a day; instant payoff |
| 1 | Glue I: where and who | ~15 (prepositions, relatives, demonstratives, core pronouns) + pronoun suffixes | ~35 | ~35% | Highest frequency; needed to parse everything |
| 2 | Words of salah | ~40 (takbir, ruku and sujud tasbih, tashahhud, Ikhlas, Falaq, Nas, Kawthar, Asr, Nasr) | ~75 | ~42% | Daily reinforcement in prayer |
| 3 | Glue II: not, if, then | ~20 (negation, conditionals, time words, connectors) + wa-/fa-/bi-/li-/ka-/sa- | ~95 | ~47% | Changes the meaning of whole ayahs |
| 4 | Core verbs I | ~30 (qala, kana, amana, kafara, alima, ja'ala, ja'a, amila, ra'a, ata) + verb person prefixes | ~125 | ~50% | Narration and belief frames |
| 5 | Allah and His attributes | ~25 (alim, hakim, rahim, ghafur, aziz, sami, basir, qadir, khabir) | ~150 | ~55% | Ayah endings: formulaic, very audible |
| 6 | The unseen and the hereafter | ~35 (yawm al-qiyamah, akhirah, jannah, nar, adhab, ajr, hisab, jahannam) | ~185 | ~60% | A scene; frequent and salient |
| 7 | Belief, guidance and deeds | ~40 (iman, kufr, huda, dalal, salihat, taqwa, zulm, salah, zakah) | ~225 | ~65% | Spread near-synonyms across sessions |
| 8 | Messengers and peoples | ~35 (rasul, nabi, kitab, ayat, qawm, Musa, Ibrahim, Fir'awn, Bani Isra'il) | ~260 | ~70% | Narrative passages; names are easy coverage |
| 9 | Creation and signs | ~40 (sama', ard, layl, nahar, shams, qamar, ma', jibal, bahr) | ~300 | ~73% | Concrete, good for listening drills |
| 10 | People and society | ~50 (nas, insan, ab, umm, ibn, zawj, nisa', mal, ahl) | ~350 | ~76% | Family and legal passages |
| 11 | Core verbs II | ~70 (khalaqa, anzala, arsala, hada, ittaqa, ittaba'a, akhadha, abada) + patterns for recognition | ~420 | ~78% | Introduce awzan |
| 12 | To 80% | ~80 mixed remainder in thematic mini-sets | ~500 | ~80% | Close the gap |
| After | Surah-driven | open | 500+ | 80 to 90% | "Learn from a surah" becomes the main mode |

Within each stage, order by frequency. Group thematically (words that share a scene), never as tight sets of near-synonyms (section 7.3).

### Example contents (frequencies from QAC lemma and verb lists; confirm from section 2 data)

**Stage 0, Al-Fatiha:** ٱللَّه Allah (2,699); رَبّ Lord (975); ٱلَّذِى / ٱلَّذِينَ who, those who (1,464); عَلَىٰ upon (1,445); يَوْم day (405); غَيْر other than (147); رَحِيم Most Merciful (116); دِين recompense (92; teach that sense here); عَالَمِين the worlds (73); حَمْد praise; عَبَدَ worship (122, first na- "we"); هَدَى guide (144, -na "us").

**Stage 1, Glue I:** مِن from, of (3,226); فِى in (1,701); إِلَىٰ to (742); عَن about, from (465); مَن who (824); مَا what, that which, not (2,177); إِنَّ indeed (1,682); ذَٰلِك that (520); هَٰذَا this (318); أُولَٰٓئِك those (204); suffixes -hu, -hum, -kum, -na, -i, -ka.

**Stage 3, Glue II:** لَا no, do not (1,691); لَمْ did not (353); لَن will never (104); إِلَّا except (663); إِن if (697); إِذَا when (409); إِذ when, recall when (239); قَد indeed, already (406); ثُمَّ then (338); أَو or (280); لَو if only (200); بَل rather (127); prefixes wa-, fa-, bi-, li-, ka-, sa-. Spread the negators across different sessions.

## 6. What a lesson contains

1. **Intro card**, 60 words max, with a real computed number: "These 10 words are about 1 in 6 of the words you hear in recitation."
2. **Listen first.** Play the anchor ayah; the new word highlights via word timestamps.
3. **Word card.** Arabic (Uthmani), two audio buttons (isolated word; word clipped from recitation), gloss, root (shown, not drilled, for transparent families), frequency, 1 to 2 common forms, anchor ayah. Prefer anchors from Al-Fatiha, Juz Amma, or a surah the learner marked memorized.
4. **Mini-note**, 3 sentences max, only where it changes what the ear hears: alladhina ("a description is coming"), inna, the negators, idh (a story is starting), the suffixes, verb prefixes.
5. **Drills** (section 7.2).
6. **Listening application.** An ayah from the learner's memorized surahs containing the new words, known words softly highlighted.

## 7. Learning engine

### 7.1 Daily flow (10 to 15 min)
- Reviews first (due queue).
- About **5 new items**, adjustable 3 to 8. At 5 a day, about 500 lemmas in 4 to 5 months including review days.
- If due reviews pass a threshold, new items pause automatically. Calm, not a penalty.
- One listening set: 2 to 3 ayahs at the learner's current tier (section 8).

### 7.2 Drills, in this order
1. **Listen, choose the meaning.** No text shown. This is the main drill (aural recognition predicts listening comprehension: Matthews and Cheng 2015).
2. See the Arabic, recall the meaning.
3. Listen to an ayah, tap the words you recognized.
4. Mixed review of earlier words.

Production (meaning to Arabic) is off by default for this track; the goal is reception. No self-grading, per the existing product rule: every drill is graded deterministically.

### 7.3 Anti-interference rule in the scheduler
Never introduce two near-synonyms, or two members of one closed set, in the same session. Examples: zulm / dhanb / ithm / sayyi'ah; jannat / firdaws; the negators la / lam / lan / ma. Words that share a scene (yawm, qiyamah, hisab, nar, jannah, ajr) may come together. Basis: Tinkham 1993/1997, Waring 1997, Nakata and Suzuki 2019 (spacing reduces the interference). Implement as tags on cards (`interferenceGroup`) that the new-card picker respects.

### 7.4 Distractors
Rule-based, never random, never a model call (same rule as the Numbers trainer). For meaning choices, draw from already-learned words in the same stage, excluding the item's own interference group so the drill tests recognition rather than synonym discrimination.

### 7.5 Roots
Show root families on the card ("same root: كِتَاب، مَكْتُوب") once one member is known. Roots support recognition (Freynik, Gor and O'Rourke 2017) but are not drilled as meaning, since many families are not transparent.

## 8. Listening ladder

Isolated word audio does not sound like the word in flowing recitation: hamzat al-wasl drops, idgham merges words (min rabbihim sounds like mir-rabbihim), the al- lam assimilates, and pausing (waqf) changes endings. So listening escalates:

| Tier | Material | Drill |
| --- | --- | --- |
| L1 | Isolated word audio (QF word audio) | Listen, choose meaning |
| L2 | Same word clipped from murattal recitation via QF word segments | Listen, choose meaning; "hear it in flow" toggle |
| L3 | Full ayah, slow teaching recitation (Husary muallim style, or measured murattal at 0.75x) | Tap the words you heard, highlights after |
| L4 | Full ayah at normal murattal (Husary, Minshawi, then Alafasy) | Tap the words without highlighting, then reveal |
| L5 | Short passages and whole short surahs, highlighting off | Follow along; gist check uses authentic translation only |

- A learner moves up a tier per word when L(n) is answered correctly across spaced reviews; Prime defines the threshold and flags it.
- The first time a learner's word appears changed by a sound rule, show a one-time explainer (2 sentences) for that rule.
- Use only reciters that have word segment data. Two or three voices at L4 and above.

## 9. Progress and integration

- **Learn:** coverage meter, followable-ayah count, memorized-surah coverage (section 3). Milestones are quiet markers: "Al-Fatiha fully known", "The words of salah", "Half the words of the Quran", "80%".
- **Read:** known words get a faint teal underline; each ayah shows "you know 7 of 9 words".
- **Map:** a toggle that lights ayahs at 90% or more known.
- **Learn from a surah:** pick a surah, see its unknown lemmas ordered by global frequency, learn them. Finishing all of a surah's lemmas suggests marking it understood on the Map.
- **Arabic Course bridge:** a lemma learned in the books counts toward coverage via `madinah_lemma_map` (internal name; never shown).

## 10. Content, licensing and authenticity gates

Do not ship until each gate is cleared. Record outcomes in the relay.

- **Quran Foundation:** text, word-by-word, word audio and segments through Content Sync only. Attribution "Quran data provided by Quran Foundation" wherever content appears, plus reciter and translation credit. Confirm with developers@quran.com that per-word audio clipping from segments and on-device caching fit their terms.
- **QUL morphology:** licence is per resource and many pages state no copyright information. Open a GitHub licence issue on TarteelAI/quranic-universal-library for the exact morphology resource, keep the reply on record. Until answered, morphology may be used to compute derived tables but not shipped.
- **Quranic Arabic Corpus:** GPL with a no-modification clause. Offline cross-checking only. Never bundled or shipped.
- **Lemma glosses** (the one meaning per card): written as a content file seeded from QF word-by-word glosses as reference, every entry `verified: false` until the owner reviews it. App shows only verified items.
- **Mini-notes:** written by hand, reviewed by the owner (ideally a qualified teacher too), same `verified` gate. No AI-written notes or glosses.
- **Interference groups** and stage assignment: part of the same reviewed content file.

## 11. Build order

1. Section 2 numbers: frequency table, coverage curve, per-stage coverage. Post to relay. **Stop for owner review of the numbers and branding.**
2. Licensing gates in section 10 opened (emails, GitHub issue).
3. Content file: stages, lemma list, glosses, mini-notes, interference groups, anchor ayahs, all `verified: false`. Owner reviews.
4. Data model and seeding (lemma cards, parsing skills, stages) into Neon, via `lessons.json`, following the Numbers trainer pattern and the populated-database rehearsal rule from the 15 Nov handoff.
5. Learn page (meter, path, stage rings) and lesson flow (section 6), drills 1 and 2.
6. Listening ladder L1 to L3 and drill 3; segment clipping.
7. Read underline, per-ayah known count, Map toggle, learn-from-a-surah.
8. L4 and L5.

Depends on Quran Foundation sync being live.

## 12. Done means (per milestone)

- `npm run preflight` passes; tests for coverage computation (known-token rule with clitics), anti-interference picker, tier promotion, distractor rules.
- Meter copy says "words you know make up X% of the words in the Quran" with the "how this is counted" note; nowhere says "understand X%".
- No unverified gloss or note visible.
- Screen recording of a full Stage 0 lesson in light and dark, posted to the relay, delivered OTA to TestFlight.
