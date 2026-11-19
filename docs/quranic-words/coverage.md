# Quranic Words: coverage numbers (issue #4, step 1)

Computed 2026-11-19 by scripts/coverage/qac_coverage.py and scripts/coverage/stages.py.

## Source and method

- Morphology: the Quranic Arabic Corpus segment file (mustafa0x/quran-morphology, a corrected QAC copy), used OFFLINE ONLY. It is not in the repo and never ships. The scripts take its path as an argument.
- QUL could not be used yet: its morphology downloads need a signed-in QUL account. The owner can download the "Word lemma" sqlite (resource 75) and the scripts will be pointed at it for the cross-check.
- Word count cross-check: the app's Tanzil Uthmani text has 77,881 words, which is 77,433 once the 448 basmala words Tanzil prepends to 112 surahs are removed, against 77,429 in the corpus.
- Denominator: 77,429 orthographic words. Unit: the lemma of each stem. 4,787 distinct lemmas.
- A word is known only when every stem lemma in it is known and every clitic on it has been taught as a parsing skill.
- Merged by hand: independent pronouns, which the corpus splits by vowel ending, count as one lemma per person. All demonstratives (dha, dhalika, hadha, ula'ika) are one corpus lemma (ذا).

## Lemmas needed for coverage (all parsing skills taught)

| Coverage | Lemmas |
| --- | --- |
| 25% | 9 |
| 50% | 54 |
| 60% | 109 |
| 70% | 220 |
| 80% | 441 |
| 90% | 1,061 |

The top 500 lemmas reach 81.6%. So "500 words, about 80%" is honest; "about 440 words for 80%" is the exact figure.

## The parsing skills matter as much as the words

- 42,444 of 77,429 words (55%) carry at least one clitic.
- Without any clitic taught, the top 500 lemmas cover only 37.0% (top 100: 28.1%, top 250: 33.2%).
- Most frequent: wa- 9,594 words; al- 8,377; pronoun suffixes (all persons) about 21,000; fa- 3,001; li- 2,846; bi- 2,544; la- of emphasis 1,001.

## Function words

- 24,781 words (32.0%) are function words: the stem is a particle, pronoun, demonstrative, relative, conditional, or time or place adverb.
- 33 of the top 100 lemmas are function words.

## Coverage per stage (spec section 5)

"Named" counts only the words the spec lists (stages 0 to 5; stages 0 and 2 take every lemma of their surahs). "Filled" adds the most frequent remaining lemmas until the stage reaches the spec's cumulative lemma count. Skills are counted from the stage that teaches them.

| Stage | Named: lemmas, coverage | Filled: lemmas, coverage | Spec estimate |
| --- | --- | --- | --- |
| 0 Al-Fatiha | 23, 10.4% | 23, 10.4% | 25 to 30% |
| 1 Glue I | 41, 28.0% | 41, 28.0% | 35% |
| 2 Words of salah | 92, 36.5% | 92, 36.5% | 42% |
| 3 Glue II | 100, 42.0% | 100, 42.0% | 47% |
| 4 Core verbs I | 105, 44.0% | 125, 51.9% | 50% |
| 5 Allah and His attributes | 113, 44.9% | 150, 56.2% | 55% |
| 6 The unseen and the hereafter | | 185, 61.1% | 60% |
| 7 Belief, guidance and deeds | | 225, 65.0% | 65% |
| 8 Messengers and peoples | | 260, 67.8% | 70% |
| 9 Creation and signs | | 300, 70.4% | 73% |
| 10 People and society | | 350, 73.0% | 76% |
| 11 Core verbs II | | 420, 75.9% | 78% |
| 12 To 80% | | 500, 78.4% | 80% |

Notes:
- Al-Fatiha alone is 10%, not 25 to 30%. Its 23 lemmas include rare ones (maghdub, dallin, sirat, mustaqim), and the most frequent glue (min, ma, la, fi, inna, qala, kana) is not in it.
- The salah surahs bring 51 lemmas, many rare (ghasiq, waqab, naffathat, kawthar). That costs about 3 points by stage 12: the path reaches 78.4% at 500 lemmas against 81.6% in pure frequency order. Reaching 80% on the path takes about 540 lemmas.
- Skill placement is my assumption: the spec puts wa-, bi- and li- in stage 3, but Al-Fatiha needs them (bismi, lillahi, wa iyyaka), so they are counted in stage 0. Hadha needs ha- (attention) and dhalika needs -li- and -ka; these are in stage 1 with the demonstratives.

## Exact coverage on the device (per-word table)

Built 2026-11-19 by scripts/coverage/build_words_map.py into assets/content/quranic-words-map.json (233 KB, about 108 KB gzipped). Morphology data from the Quranic Universal Library (Tarteel): the "Word lemma" and "Word stem" sqlite files, owner's licence decision. The corpus is used offline only, to match QUL ids to our cards and to check the result; nothing from it ships.

- Words: 77,432, following Tanzil and QUL word division (ba'da ma is two words in 2:181, 8:6 and 13:37, where the corpus fuses it). Every ayah but 37:130 lines up word for word with the reader's text.
- Cards: each word's QUL lemma and stem id are matched to our cards by majority vote over word locations. QUL gives min and man one lemma; the stem id (which keeps the vowels) tells them apart. Agreement with the corpus on which track cards a word holds: 99.96%.
- Clitics: the Tanzil surface form minus the QUL stem, read by hand-written rules (prefixes wa-, fa-, bi-, li-, la-, ka-, sa-, a-, al-, ya, ha, ta; pronoun and verb person suffixes). Exact agreement with the corpus's clitic set: 98.9% of words (41,565 of 42,423 words that have a clitic). The main residue is 2nd versus 3rd person plural on verbs (-u, -una), which the letters alone cannot tell, and the dropped "my" in rabbi. Both persons are taught in stages 0 and 1, so it barely moves the figures.
- Without the stem file, the earlier fallback (surface compared with the lemma) scored 84.4%.
- The word at which each word becomes known along the path agrees with the corpus for 99.84% of words; coverage per stage matches the content curve to 0.1 point, and the whole path reaches 80.01%.
- QUL data issues found: the lemma table has three rows past the end of their ayah (13:5:26, 2:275:46, 4:176:51); they are ignored.
