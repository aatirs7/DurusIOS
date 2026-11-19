"""
Builds assets/content/quranic-words.json, the Quranic Words track's content.

Inputs, both OFFLINE and neither committed:
  1. the Quranic Arabic Corpus segment file (GPL, no-modification clause), read
     with the same parser as qac_coverage.py;
  2. the Quran Foundation word-by-word cache written by fetch_qf_wbw.py.

What is taken from each, and why that keeps the licences apart:
  - From the corpus only FACTS leave this script: which words share a lemma,
    how often, which clitics a word carries, and numbers computed from those
    (coverage per path position, followable ayah counts, per-surah counts).
    No corpus text is written out: no segment forms, no lemma headwords, no
    roots. A lemma is an integer id in the output.
  - Every Arabic string and every English gloss in the output is copied
    VERBATIM from the Quran Foundation word-by-word data (text_uthmani and the
    word translation), recorded with source "qf-wbw" and the word it came from.
    Nothing is written by hand or by a model. Hand notes are empty placeholders
    with verified false.

The corpus and the QF data are joined by word position within each ayah. An
ayah whose word counts disagree is left out of form and gloss selection (it
still counts toward coverage, which uses the corpus alone) and is reported.

Usage:
  python -I -X utf8 scripts/coverage/build_words.py <morphology.txt> <qf_cache_dir> <out.json>
"""
import collections
import datetime
import importlib.util
import json
import os
import sys
import unicodedata

here = os.path.dirname(__file__)
spec = importlib.util.spec_from_file_location("qac", os.path.join(here, "qac_coverage.py"))
qac = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qac)

EM_DASH = chr(0x2014)
LESSON_ID_BASE = 1000  # lessons.id = 1000 + stage
LESSON_NUMBER_BASE = 200  # lessons.number = 200 + stage (numbers trainer uses 101+)
CARD_ID_BASE = 100000  # cards.id = 100000 + position on the path (1-based)
FOLLOWABLE = 0.9
JUZ_AMMA = set(range(78, 115))
ALLAH = "اللَّه"

PRONOUNS = ["PRON 3MS", "PRON 3MP", "PRON 2MP", "PRON 1P", "PRON 2MS", "PRON 1S", "PRON 3FS", "PRON 3FP", "PRON 3D", "إِيّا"]
SUFFIXES = ["suffix " + p for p in ["3MS", "3MP", "2MP", "1P", "2MS", "1S", "3FS", "3FP", "3D", "2D", "2FS", "3MD", "2FP", "3FD"]]

# (title, cumulative lemma target or None to fill to 80%, named lemmas, surahs whose lemmas are named, skills taught)
# Stages 0 to 5 match scripts/coverage/stages.py; 6 to 11 add the spec's example words.
STAGES = [
    ("Al-Fatiha", 20, [], [1], ["al-", "bi-", "li-", "wa-", "suffix 1P", "suffix 3MP"]),
    ("Glue I: where and who", 35, ["مِن", "فِي", "إِلَى", "عَن", "مَن", "ما", "إِنّ", "ذا"] + PRONOUNS, [], SUFFIXES + ["ha (attention)", "-li- in dhalika", "suffix -kum on that/those"]),
    ("Words of salah", 75, [], [112, 113, 114, 108, 103, 110], []),
    ("Glue II: not, if, then", 95, ["لا", "لَم", "لَن", "إِلّا", "إِن", "إِذا", "إِذ", "قَد", "ثُمّ", "أَو", "لَو", "بَل"], [], ["fa-", "ka-", "sa-", "la- (emphasis)", "a- (question)", "ya (calling)"]),
    ("Core verbs I", 125, ["قالَ", "كانَ", "آمَنَ", "كَفَرَ", "عَلِمَ", "جَعَلَ", "جاءَ", "عَمِلَ", "رَأَى", "آتَى", "أَتَى"], [], ["-nna (emphasis)"]),
    ("Allah and His attributes", 150, ["عَلِيم", "حَكِيم", "رَحِيم", "غَفُور", "عَزِيز", "سَمِيع", "بَصِير", "قَدِير", "خَبِير"], [], ["ta (oath)", "-mma in Allahumma", "suf P"]),
    ("The unseen and the hereafter", 185, ["قِيامَة", "آخِر", "جَنَّة", "نار", "عَذاب", "أَجْر", "حِساب", "جَهَنَّم"], [], []),
    ("Belief, guidance and deeds", 225, ["إِيمان", "كُفْر", "هُدًى", "ضَلال", "صالِحَة", "تَقْوَى", "ظُلْم", "صَلاة", "زَكاة"], [], []),
    ("Messengers and peoples", 260, ["رَسُول", "نَبِيّ", "كِتاب", "آيَة", "قَوْم", "مُوسَى", "إِبْراهِيم", "فِرْعَوْن", "إِسْرائِيل"], [], []),
    ("Creation and signs", 300, ["سَماء", "أَرْض", "لَيْل", "نَهار", "شَمْس", "قَمَر", "ماء", "جَبَل", "بَحْر"], [], []),
    ("People and society", 350, ["ناس", "إِنسان", "أَب", "أُمّ", "ابْن", "زَوْج", "نِساء", "مال", "أَهْل"], [], []),
    ("Core verbs II", 420, ["خَلَقَ", "أَنزَلَ", "أَرْسَلَ", "اتَّقَى", "اتَّبَعَ", "أَخَذَ"], [], []),
    ("To 80%", None, [], [], []),
]

# Anti-interference groups (spec 7.3): near-synonyms and closed sets that the
# new-card picker never introduces together. A proposal, verified false.
GROUPS = {
    "negation": ["لا", "لَم", "لَن", "لَيْسَ", "ما"],
    "condition-time": ["إِن", "إِذا", "إِذ", "لَو", "لَمّا", "لَوْلا"],
    "preposition": ["مِن", "فِي", "إِلَى", "عَن", "عَلَى", "عِند", "مَع", "لَدَى", "لَدُن"],
    "pronoun": PRONOUNS,
    "relative": ["مَن", "الَّذِي"],
    "inna-and-sisters": ["إِنّ", "أَنّ", "لٰكِنّ", "كَأَنّ", "لَعَلّ"],
    "connector": ["ثُمّ", "أَو", "أَم", "بَل"],
    "before-after": ["قَبْل", "بَعْد"],
    "garden": ["جَنَّة", "فِرْدَوْس"],
    "fire": ["نار", "جَهَنَّم", "جَحِيم", "سَعِير"],
    "wrongdoing": ["ذَنب", "إِثْم", "سَيِّئَة", "ظُلْم", "فاحِشَة"],
    "mercy": ["رَحْمٰن", "رَحِيم", "رَحْمَة"],
    "forgiveness": ["غَفُور", "غَفَرَ", "مَغْفِرَة", "غَفّار"],
    "knowing": ["عَلِيم", "خَبِير", "عالِم", "عَلِمَ"],
    "came-gave": ["جاءَ", "أَتَى", "آتَى"],
    "fear": ["خافَ", "خَشِيَ", "اتَّقَى"],
    "seeing": ["رَأَى", "نَظَرَ", "أَبْصَرَ"],
    "sending-down": ["أَنزَلَ", "نَزَّلَ"],
    "people": ["ناس", "قَوْم", "بَشَر", "إِنسان", "أُمَّة"],
}

# How each parsing skill is shown: the Arabic letters (not a gloss) and a
# grammatical name (a category, not a translation).
SKILL_FACE = {
    "al-": ("ٱل", "Prefix al-, the definite article"),
    "wa-": ("وَ", "Prefix wa-"),
    "fa-": ("فَ", "Prefix fa-"),
    "bi-": ("بِ", "Prefix bi-"),
    "li-": ("لِ", "Prefix li-"),
    "ka-": ("كَ", "Prefix ka-"),
    "sa-": ("سَ", "Prefix sa-, future"),
    "la- (emphasis)": ("لَ", "Prefix la- of emphasis"),
    "a- (question)": ("أَ", "Prefix a-, question"),
    "ya (calling)": ("يَا", "Particle ya, calling"),
    "ha (attention)": ("هَا", "Prefix ha-, attention (as in hadha)"),
    "ta (oath)": ("تَ", "Prefix ta-, oath"),
    "-li- in dhalika": ("لِ", "The -li- in dhalika"),
    "suffix -kum on that/those": ("ـكُم", "The -ka or -kum on dhalika and ula'ika"),
    "-nna (emphasis)": ("ـنَّ", "Suffix -nna of emphasis"),
    "-mma in Allahumma": ("ـمَّ", "The -mma in Allahumma"),
    "suf P": ("", "Other attached particle"),
}
PERSON_NAME = {"1": "1st person", "2": "2nd person", "3": "3rd person"}
GENDER_NAME = {"M": "masculine", "F": "feminine"}
NUMBER_NAME = {"S": "singular", "D": "dual", "P": "plural"}


def skill_face(name):
    if name in SKILL_FACE:
        return SKILL_FACE[name]
    if name.startswith("suffix "):
        code = name[7:]
        parts = [PERSON_NAME.get(code[0], code[0])]
        if len(code) == 3:
            parts.append(GENDER_NAME[code[1]])
        parts.append(NUMBER_NAME[code[-1]])
        return ("", "Attached pronoun, " + ", ".join(parts))
    return ("", name)


def load_qf(cache):
    qf = {}
    for s in range(1, 115):
        for v in json.load(open(os.path.join(cache, f"{s:03d}.json"), encoding="utf-8")):
            sa = tuple(int(x) for x in v["key"].split(":"))
            qf[sa] = [w for w in v["words"] if w["t"] == "word"]
    return qf


def main():
    morph, cache, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
    words = qac.parse(morph)
    keys = list(words.keys())
    n = len(keys)
    qf = load_qf(cache)

    # Join check, per ayah.
    per_ayah = collections.Counter((s, a) for s, a, _w in keys)
    mismatched = sorted(sa for sa, c in per_ayah.items() if len(qf.get(sa, [])) != c)
    if len(qf) != len(per_ayah):
        raise SystemExit(f"ayah count differs: corpus {len(per_ayah)}, qf {len(qf)}")

    def qf_word(key):
        s, a, w = key
        if (s, a) in mismatched_set:
            return None
        return qf[(s, a)][w - 1]

    mismatched_set = set(mismatched)

    freq = collections.Counter()
    pos_of = {}
    for r in words.values():
        for lem, pos in set(r["stems"]):
            freq[lem] += 1
            pos_of.setdefault(lem, collections.Counter())[pos] += 1
    order = [l for l, _ in freq.most_common()]
    # Named lemmas are typed by hand, so match them in canonical mark order
    # (shadda before or after a vowel is the same lemma).
    canon = {unicodedata.normalize("NFC", l): l for l in freq}
    fix = lambda l: canon.get(unicodedata.normalize("NFC", l), l)
    for i, st in enumerate(STAGES):
        STAGES[i] = (st[0], st[1], [fix(l) for l in st[2]], st[3], st[4])
    for g in GROUPS:
        GROUPS[g] = [fix(l) for l in GROUPS[g]]
    lemmas_in_surah = collections.defaultdict(set)
    for (s, _a, _w), r in words.items():
        for l, _ in r["stems"]:
            lemmas_in_surah[s].add(l)

    named_all = [l for st in STAGES for l in st[2]] + [l for g in GROUPS.values() for l in g]
    missing = sorted(set(l for l in named_all if l not in freq))
    if missing:
        print("not in corpus (ignored):", missing)

    # Stage composition: named words first, then the most frequent remaining
    # lemmas up to the stage's cumulative target. Within a stage, by frequency.
    taken = set()
    stage_lemmas, stage_skills = [], []
    for title, target, lems, surahs, sk in STAGES:
        new = [l for l in lems if l in freq and l not in taken]
        for s in surahs:
            new += [l for l in lemmas_in_surah[s] if l not in taken and l not in new]
        stage_lemmas.append(new)
        taken |= set(new)
        stage_skills.append(list(sk))
        if target is not None:
            for l in order:
                if len(taken) >= target:
                    break
                if l not in taken:
                    new.append(l)
                    taken.add(l)
        new.sort(key=lambda l: (-freq[l], order.index(l)))

    # Every skill must belong to a stage, or no word that carries it can ever
    # count as known. Anything left over joins the last stage.
    all_skills = collections.Counter(qac.skill(c) for r in words.values() for c in set(r["clitics"]))
    assigned = set(x for sk in stage_skills for x in sk)
    leftover = [k for k in all_skills if k not in assigned]
    if leftover:
        print("skills not placed by the stage table, added to the last stage:", leftover)
        stage_skills[-1] += leftover

    def word_need(r, pos_of_lemma, skill_start):
        """Smallest path prefix length at which this word is known."""
        if not r["stems"]:
            return None
        need = 0
        for l, _ in r["stems"]:
            p = pos_of_lemma.get(l)
            if p is None:
                return None
            need = max(need, p + 1)
        for c in r["clitics"]:
            p = skill_start.get(qac.skill(c))
            if p is None:
                return None
            need = max(need, p + 1)
        return need

    def build_path():
        path = [l for sl in stage_lemmas for l in sl]
        pos_of_lemma = {l: i for i, l in enumerate(path)}
        skill_start, start = {}, 0
        for sl, sk in zip(stage_lemmas, stage_skills):
            for k in sk:
                # Taught by the stage's intro, which comes before its first word.
                skill_start.setdefault(k, start)
            start += len(sl)
        needs = [word_need(r, pos_of_lemma, skill_start) for r in words.values()]
        return path, pos_of_lemma, skill_start, needs

    # The last stage fills until the path reaches 80% of all words.
    path, pos_of_lemma, skill_start, needs = build_path()
    target_words = 0.8 * n
    while True:
        c = collections.Counter(x for x in needs if x is not None)
        known = sum(v for k, v in c.items() if k <= len(path))
        if known >= target_words:
            break
        nxt = next(l for l in order if l not in taken)
        stage_lemmas[-1].append(nxt)
        taken.add(nxt)
        path, pos_of_lemma, skill_start, needs = build_path()
    N = len(path)

    # Coverage curve and followable ayahs per prefix length k = 0..N.
    need_count = collections.Counter(x for x in needs if x is not None)
    coverage = []
    cum = 0
    for k in range(N + 1):
        cum += need_count.get(k, 0)
        coverage.append(cum)

    ayah_needs = collections.defaultdict(list)
    for key, nd in zip(keys, needs):
        ayah_needs[key[:2]].append(nd if nd is not None else N + 1)
    followable_at = collections.Counter()
    for sa, lst in ayah_needs.items():
        lst = sorted(lst)
        # Known at k when at least ceil(0.9 * len) words have need <= k.
        m = -(-int(FOLLOWABLE * 1000) * len(lst) // 1000)
        kneed = lst[m - 1]
        if kneed <= N:
            followable_at[kneed] += 1
    followable, cum = [], 0
    for k in range(N + 1):
        cum += followable_at.get(k, 0)
        followable.append(cum)

    surahs = []
    for s in range(1, 115):
        lst = sorted(nd for key, nd in zip(keys, needs) if key[0] == s and nd is not None)
        total = sum(1 for key in keys if key[0] == s)
        steps = collections.Counter(lst)
        cum, out = 0, []
        for k in sorted(steps):
            cum += steps[k]
            out.append([k, cum])
        surahs.append({"surah": s, "words": total, "steps": out})

    # Forms, faces, glosses and anchors, all from QF, chosen by fixed rules.
    occ = collections.defaultdict(list)  # lemma -> [(key, record)]
    for key, r in words.items():
        for l in set(l for l, _ in r["stems"]):
            if l in pos_of_lemma:
                occ[l].append((key, r))

    def anchor_rank(key):
        s = key[0]
        return (0 if s == 1 else 1 if s in JUZ_AMMA else 2, key)

    lemma_out = []
    group_of = {}
    for g, members in GROUPS.items():
        for l in members:
            group_of.setdefault(l, g)
    for stage_index, sl in enumerate(stage_lemmas):
        faces_in_stage = set()
        for l in sl:
            idx = pos_of_lemma[l]
            form_count = collections.Counter()
            # candidate faces ranked by (number of clitics + extra stems, -count)
            cand = collections.defaultdict(list)
            for key, r in occ[l]:
                w = qf_word(key)
                # A form with a space carries a pause mark; never a face.
                if w is None or not w["u"] or " " in w["u"]:
                    continue
                form_count[w["u"]] += 1
                extra = len(r["clitics"]) + len(r["stems"]) - 1
                cand[(extra, w["u"])].append((key, w))
            forms = [f for f, _ in form_count.most_common(4)]  # pause-marked forms already excluded
            # Face: the most frequent form with the fewest clitics, unless that
            # bare form is rare next to the lemma's commonest form (the
            # demonstrative is heard as dhalika, not as bare dha), in which case
            # the commonest form. Face and gloss always come from the same form.
            ranked = sorted(cand.items(), key=lambda kv: (kv[0][0], -len(kv[1]), kv[1][0][0]))
            if ranked:
                commonest = max(cand.items(), key=lambda kv: (len(kv[1]), -kv[1][0][0][0], -kv[1][0][0][1], -kv[1][0][0][2]))
                if 4 * len(ranked[0][1]) < len(commonest[1]):
                    ranked.remove(commonest)
                    ranked.insert(0, commonest)
            face, gloss, audio = None, None, None
            for (extra, u), toks in ranked:
                if u in faces_in_stage:
                    continue
                # Glosses that open a quotation mid-phrase read as broken out of
                # context, so they are passed over when another exists.
                # A contextual gloss that names Allah for some other word ("Allah
                # bestowed favor" for anAama) would put a subject on the card the
                # word does not carry, so that form is skipped for another.
                usable = [w["g"] for _k, w in toks if w["g"] and (l == ALLAH or "Allah" not in w["g"])]
                glosses = collections.Counter(g for g in usable if '"' not in g) or collections.Counter(usable)
                if not glosses:
                    continue
                top = glosses.most_common()
                best = max(c for _g, c in top)
                gtext = next(g for g, c in top if c == best)
                src_key, src_w = next((k, w) for k, w in toks if w["g"] == gtext)
                face = u
                gloss = None if EM_DASH in gtext else {
                    "text": gtext,
                    "source": "qf-wbw",
                    "ref": "%d:%d:%d" % src_key,
                    "verified": False,
                }
                audio = src_w["a"]
                break
            if face is None:
                print("no face for lemma at path position", idx + 1)
                continue
            faces_in_stage.add(face)
            anchor_key = min((k for k, _ in occ[l]), key=anchor_rank)
            pos = pos_of[l].most_common(1)[0][0]
            lemma_out.append({
                "id": idx + 1,
                "cardId": CARD_ID_BASE + idx + 1,
                "stage": stage_index,
                "freq": freq[l],
                "kind": "content" if pos in qac.CONTENT else "function",
                "face": face,
                "forms": forms,
                "gloss": gloss,
                "audio": audio,
                "anchor": {"ayah": "%d:%d" % anchor_key[:2], "word": anchor_key[2]},
                "group": group_of.get(l),
                "note": {"text": None, "verified": False},
            })

    # Parsing skills, with up to three example words verbatim from QF.
    skill_ids = {}
    skill_out = []
    for stage_index, sk in enumerate(stage_skills):
        for name in sk:
            if name not in all_skills or name in skill_ids:
                continue
            skill_ids[name] = len(skill_out) + 1
            examples, seen = [], set()
            for key, r in sorted(words.items(), key=lambda kv: anchor_rank(kv[0])):
                if len(examples) >= 3:
                    break
                if [qac.skill(c) for c in r["clitics"]] != [name]:
                    continue
                if not all(l in pos_of_lemma and pos_of_lemma[l] < skill_start[name] + len(stage_lemmas[stage_index]) for l, _ in r["stems"]):
                    continue
                w = qf_word(key)
                if not w or not w["g"] or w["u"] in seen or EM_DASH in w["g"] or '"' in w["g"] or " " in w["u"] or ("Allah" in w["g"] and any(l != ALLAH for l, _ in r["stems"])):
                    continue
                seen.add(w["u"])
                examples.append({"arabic": w["u"], "gloss": w["g"], "source": "qf-wbw", "ref": "%d:%d:%d" % key})
            ar, label = skill_face(name)
            skill_out.append({
                "id": skill_ids[name],
                "key": name,
                "stage": stage_index,
                "arabic": ar,
                "label": label,
                "words": all_skills[name],
                "examples": examples,
                "note": {"text": None, "verified": False},
            })

    stages_out = []
    start = 0
    for i, (sl, sk) in enumerate(zip(stage_lemmas, stage_skills)):
        end = start + len(sl)
        lemma_set = set(sl)
        tokens = sum(1 for r in words.values() if any(l in lemma_set for l, _ in r["stems"]))
        stages_out.append({
            "stage": i,
            "lessonId": LESSON_ID_BASE + i,
            "number": LESSON_NUMBER_BASE + i,
            "titleEn": STAGES[i][0],
            "firstPosition": start + 1,
            "lastPosition": end,
            "lemmas": len(sl),
            "skills": [skill_ids[x] for x in sk if x in skill_ids],
            "tokens": tokens,
            "coverageAfter": coverage[end],
            "followableAfter": followable[end],
        })
        start = end

    out = {
        "version": 1,
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "attribution": "Quran data provided by Quran Foundation",
        "method": "Lemma, frequency and clitic facts computed offline; every Arabic form and English gloss is verbatim Quran Foundation word-by-word (source qf-wbw). Notes are empty until written and verified.",
        "totals": {"words": n, "ayahs": len(per_ayah), "followableShare": FOLLOWABLE},
        "audioBase": "https://audio.qurancdn.com/",
        "stages": stages_out,
        "lemmas": lemma_out,
        "skills": skill_out,
        "path": {"coverage": coverage, "followable": followable},
        "surahs": surahs,
    }
    blob = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    if EM_DASH in blob:
        raise SystemExit("an em dash would be written")
    open(out_path, "w", encoding="utf-8").write(blob + "\n")

    print(f"words {n}, ayahs {len(per_ayah)}, ayahs not joined to QF: {len(mismatched)} {mismatched[:10]}")
    print(f"path lemmas {N}, cards {len(lemma_out)}, skills {len(skill_out)}")
    for st in stages_out:
        print(f"stage {st['stage']:2} {st['titleEn']:32} lemmas {st['lemmas']:3}  cum {st['lastPosition']:3}  coverage {100 * st['coverageAfter'] / n:5.1f}%  followable {st['followableAfter']}")
    print("lemmas without a gloss:", sum(1 for x in lemma_out if x["gloss"] is None))


if __name__ == "__main__":
    main()
