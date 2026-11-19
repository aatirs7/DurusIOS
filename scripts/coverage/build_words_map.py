"""
Builds assets/content/quranic-words-map.json: for every word of the Quran, in
order, which Quranic Words card it belongs to (if any) and which parsing skills
(clitics) it carries. The app uses it to count coverage exactly, underline
known words in Read and light followable ayahs on the Map.

Inputs, all OFFLINE and none committed:
  1. QUL word lemma sqlite (Quranic Universal Library, Tarteel; resource
     "Word lemma"): lemma_words(lemma_id, word_location).
  2. QUL word stem sqlite (resource "Word stem"): stem_words(stem_id,
     word_location) and stems(text). The stem is the word with its prefixes
     and suffixes stripped, so the clitics are the surface minus the stem.
  3. The Quranic Arabic Corpus segment file (GPL, no-modification clause),
     used ONLY to (a) map QUL lemma and stem ids to our card ids by majority
     vote over word locations and (b) measure how well the clitic rules agree
     with it. Nothing from it is written out: no forms, no tags, no lemmas.
Plus the app's own Tanzil text (assets/quran/uthmani.json) for the surface
form of each word, and assets/content/quranic-words.json for the cards and
skills.

What ships, per word: an index into the track's cards (or none), a second
card for the few fused words (innama, mimma, alla), and a set of skill ids.
The licence for the QUL data is the owner's decision, credited as "Morphology
data from the Quranic Universal Library (Tarteel)".

ENCODING. "ayahs" is 6,236 strings in mushaf order. Each word is two base-36
characters for 1 + its card index (00 = no card), then optionally "+" and two
more for a second card, then one character per skill from SKILL_CHARS (the
character at index i is skill id i + 1). Words follow one another with no
separator: a word starts at every base-36 character that is not part of the
one before it. "cards" lists the card ids the indexes refer to, so a rebuilt
content file can not silently shift them. "unaligned" lists the global ayah
indexes whose Tanzil words do not line up one to one with the word table
(Read shows no underline there; coverage still counts them).

Usage:
  python -I -X utf8 scripts/coverage/build_words_map.py <morphology.txt> <word-lemma.db> <word-stem.db> [out.json]
"""
import collections
import importlib.util
import json
import os
import sqlite3
import sys
import unicodedata

here = os.path.dirname(os.path.abspath(__file__))
repo = os.path.dirname(os.path.dirname(here))
spec = importlib.util.spec_from_file_location("qac", os.path.join(here, "qac_coverage.py"))
qac = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qac)

EM_DASH = chr(0x2014)
B36 = "0123456789abcdefghijklmnopqrstuvwxyz"
SKILL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!$*@^"
ATTRIBUTION = "Morphology data from the Quranic Universal Library (Tarteel)"
FOLLOWABLE = 0.9

# Letters only: harakat, Quranic marks and tatweel are dropped, and the hamza
# and alif shapes fold together, so Tanzil and QUL spellings compare.
FOLD = {"ٱ": "ا", "أ": "ا", "إ": "ا", "آ": "ا", "ى": "ي", "ئ": "ء", "ؤ": "ء", "ٔ": "ء"}
KASRA, FATHA, DAMMA, SUKUN, SHADDA = "ِ", "َ", "ُ", "ْ", "ّ"


def letters(s):
    """[(letter, marks after it)] for a word, folded."""
    out = []
    for ch in s:
        c = FOLD.get(ch, ch)
        if unicodedata.category(ch).startswith("M") and ch != "ٔ":
            if out:
                out[-1][1].append(ch)
            continue
        if not ("ء" <= c <= "ي") or c == "ـ":
            continue
        out.append((c, []))
    return [(c, "".join(m)) for c, m in out]


def skel(s):
    return "".join(c for c, _ in letters(s))


# ------------------------------------------------------------ clitic rules

PRONOUN_SUFFIX = [
    # longest first; letters of the suffix -> skill key
    ("هما", "suffix 3D"), ("كما", "suffix 2D"),
    ("هم", "suffix 3MP"), ("هن", "suffix 3FP"), ("ها", "suffix 3FS"),
    ("كم", "suffix 2MP"), ("كن", "suffix 2FP"),
    ("ني", "suffix 1S"), ("نا", "suffix 1P"),
    ("ه", "suffix 3MS"), ("ك", None), ("ي", "suffix 1S"),
]


def object_pronoun(rest):
    """Parse an object or possessive pronoun that is the whole of rest."""
    if not rest:
        return []
    s = "".join(c for c, _ in rest)
    for letters_, key in PRONOUN_SUFFIX:
        if s == letters_:
            if letters_ == "ك":
                return ["suffix 2FS" if KASRA in rest[0][1] else "suffix 2MS"]
            return [key]
    return None


def classify(surface, stem_text, demonstrative):
    """
    Clitic skill keys and fused second lemmas for one word, from its surface
    form minus its QUL stem. Returns (skills, extra_lemmas) or None when the
    stem is not found in the surface.
    """
    A = letters(surface)
    a = "".join(c for c, _ in A)
    b = skel(stem_text)
    p = a.find(b) if b else -1
    if p < 0:
        return None
    pre, stem, suf = A[:p], A[p:p + len(b)], A[p + len(b):]
    skills, extra = [], []

    # Prefixes, left to right.
    i = 0
    while i < len(pre):
        c, m = pre[i]
        nxt = pre[i + 1][0] if i + 1 < len(pre) else None
        if c == "ا" and nxt == "ل":
            skills.append("al-")
            i += 2
            continue
        if c == "ل":
            if nxt == "ل":
                # li- + al- with the alif dropped (lillahi, lilladhina)
                skills += ["li-", "al-"]
                i += 2
                continue
            # A fatha lam before a bare pronoun is li- (lahu, lakum); before
            # anything else it is the lam of emphasis.
            if FATHA in m and not (i == len(pre) - 1 and object_pronoun(stem)):
                skills.append("la- (emphasis)")
            else:
                skills.append("li-")
        elif c == "و":
            skills.append("wa-")
        elif c == "ف":
            skills.append("fa-")
        elif c == "ب":
            skills.append("bi-")
        elif c == "ك":
            if b != "ان":  # ka'an is one word
                skills.append("ka-")
        elif c == "س":
            skills.append("sa-")
        elif c == "ت":
            skills.append("ta (oath)")
        elif c == "ي":
            skills.append("ya (calling)")
        elif c == "ه":
            skills.append("ha (attention)")
        elif c in ("ا", "ء"):
            skills.append("a- (question)")
        elif c == "ع":
            extra.append("عَن")  # 'amma
        elif c == "م":
            extra.append("مِن")  # mimma, mimman
        i += 1

    # A bare pronoun after a preposition prefix (lahu, bihi, lakum): QUL's stem
    # is the pronoun itself, which is the suffix skill.
    if pre and not suf and pre[-1][0] in ("ل", "ب"):
        bare = object_pronoun(stem)
        if bare:
            skills += bare
    # ayyuha carries the ha of attention inside its stem.
    if b in ("ايها", "ايه"):
        skills.append("ha (attention)")
    # A call with the "my" dropped: ya qawmi, ya bunayya.
    if "ya (calling)" in skills and not suf and stem and (KASRA in stem[-1][1] or (stem[-1][0] == "ي" and SHADDA in stem[-1][1])):
        skills.append("suffix 1S")

    # The demonstrative carries its own particles inside the QUL stem.
    if demonstrative:
        s = b
        if s.startswith("ه"):
            skills.append("ha (attention)")
        if "لك" in s:
            skills.append("-li- in dhalika")
        if s.endswith("ك") or s.endswith("كم") or s.endswith("كما") or s.endswith("كن"):
            skills.append("suffix -kum on that/those")

    # Suffixes.
    s = "".join(c for c, _ in suf)
    if s in ("ما", "من", "لا"):
        extra.append({"ما": "ما", "من": "مَن", "لا": "لا"}[s])
        return skills, extra
    if s == "م" and b == "الله":
        skills.append("-mma in Allahumma")
        return skills, extra
    if not suf:
        return skills, extra
    starts_t = b[:1] == "ت"
    # An imperative, roughly: a wasla verb whose middle letter is not
    # a-voweled (udkhulu, ittabi'u; not ittaba'u), or a short verb opening on
    # u (qulu, kulu, khudhu).
    wasla = b[:1] == "ا" and stem and stem[0][1] == ""
    imperative = bool(stem) and (
        (wasla and len(stem) >= 3 and FATHA not in stem[-2][1])
        or (
            len(stem) <= 3
            and DAMMA in stem[0][1]
            and stem[0][0] not in ("ي", "ت", "ا", "ن")
            and not any(KASRA in m for _c, m in stem[1:-1])
            and not suf[0][0] == "ي"
        )
    )
    plural = "suffix 2MP" if starts_t or imperative else "suffix 3MP"
    j = 0
    c0, m0 = suf[0]
    if c0 == "ن" and SHADDA in m0 and s != "نا":
        skills.append("-nna (emphasis)")
        j = 1
    elif s == "ا" or s == "ان" or s == "تا":
        if b.endswith("ن") or s == "ا" and SHADDA in (stem[-1][1] if stem else ""):
            skills.append("suffix 1P")
        elif s == "تا":
            skills.append("suffix 3FD")
        else:
            skills.append("suffix 2D" if starts_t or imperative else ("suffix 3D" if s == "ان" else "suffix 3MD"))
        return skills, extra
    elif c0 == "و":
        skills.append(plural)
        j = 1
        if j < len(suf) and suf[j][0] == "ا" and j == len(suf) - 1:
            j += 1
        elif j == len(suf) - 1 and suf[j][0] == "ن" and KASRA in suf[j][1]:
            skills.append("suffix 1S")  # ta'buduni: -una with the "me" shortened
            return skills, extra
        elif j < len(suf) and suf[j][0] == "ن" and not object_pronoun(suf[j:]) == ["suffix 1S"]:
            j += 1  # -una
    elif c0 == "ت" and len(suf) >= 2 and suf[1][0] == "م":
        skills.append("suffix 2MP")
        j = 2
        if j < len(suf) and suf[j][0] == "و":
            j += 1  # tumuhu
    elif c0 == "ت" and len(suf) >= 2 and suf[1][0] == "ن" and SHADDA in suf[1][1]:
        skills.append("suffix 2FP")
        j = 2
    elif c0 == "ت" and SUKUN not in m0:
        skills.append("suffix 1S" if DAMMA in m0 else "suffix 2FS" if KASRA in m0 else "suffix 2MS")
        j = 1
    elif c0 == "ن" and len(suf) >= 2 and suf[1][0] == "ا":
        skills.append("suffix 1P")
        j = 2
    elif c0 == "ن" and "ٰ" in m0:
        # -na written with a dagger alif before an object: ataynahum
        skills.append("suffix 1P")
        j = 1
    elif c0 == "ن" and len(suf) == 1 and KASRA in m0:
        skills.append("suffix 1S")  # ittaba'ani: the "me" shortened
        return skills, extra
    elif c0 == "ن" and len(suf) == 1 and FATHA in m0:
        skills.append("suffix 2FP" if starts_t else "suffix 3FP")
        return skills, extra
    elif c0 == "ي" and len(suf) == 1 and imperative:
        skills.append("suffix 2FS")
        return skills, extra
    obj = object_pronoun(suf[j:])
    if obj is None:
        return skills, extra
    return skills + obj, extra


def lemma_heuristic(surface, lemma_text):
    """
    The fallback without the stem file: prefixes and suffixes read off the
    surface where the lemma does not have them. Kept to report its accuracy.
    """
    a = skel(surface)
    b = skel(lemma_text)
    skills = []
    i = 0
    order = [("ال", "al-"), ("و", "wa-"), ("ف", "fa-"), ("ب", "bi-"), ("ك", "ka-"), ("س", "sa-"), ("ل", "li-"), ("ا", "a- (question)")]
    changed = True
    while changed:
        changed = False
        if a[i:].startswith(b[:2]) and len(b) >= 2:
            break
        for pre, key in order:
            if a[i:].startswith(pre) and not b.startswith(pre):
                if pre == "ل" and a[i + 1:i + 2] == "ل" and not b.startswith("ل"):
                    skills += ["li-", "al-"]
                    i += 2
                else:
                    skills.append(key)
                    i += len(pre)
                changed = True
                break
    rest = a[i:]
    for letters_, key in [("هما", "suffix 3D"), ("كما", "suffix 2D"), ("هم", "suffix 3MP"), ("هن", "suffix 3FP"), ("ها", "suffix 3FS"), ("كم", "suffix 2MP"), ("كن", "suffix 2FP"), ("نا", "suffix 1P"), ("ه", "suffix 3MS"), ("ك", "suffix 2MS"), ("وا", "suffix 3MP"), ("ون", "suffix 3MP"), ("ي", "suffix 1S")]:
        if rest.endswith(letters_) and not b.endswith(letters_) and len(rest) > len(letters_):
            skills.append(key)
            break
    return skills


# ------------------------------------------------------------------ build


def b36(n):
    return B36[n // 36] + B36[n % 36]


def main():
    morph, lemma_db, stem_db = sys.argv[1], sys.argv[2], sys.argv[3]
    out_path = sys.argv[4] if len(sys.argv) > 4 else os.path.join(repo, "assets", "content", "quranic-words-map.json")

    words = qac.parse(morph)
    keys = list(words.keys())
    freq = collections.Counter()
    for r in words.values():
        for lem, _pos in set(r["stems"]):
            freq[lem] += 1
    order = [l for l, _ in freq.most_common()]
    rank = {l: i + 1 for i, l in enumerate(order)}
    canon = {unicodedata.normalize("NFC", l): l for l in freq}
    fix = lambda l: canon.get(unicodedata.normalize("NFC", l), l)

    content = json.load(open(os.path.join(repo, "assets", "content", "quranic-words.json"), encoding="utf-8"))
    cards = [l["cardId"] for l in content["lemmas"]]
    card_index = {c: i for i, c in enumerate(cards)}
    by_rank = {l["id"]: l for l in content["lemmas"]}
    track_of = {}  # QAC lemma -> card index
    for lem, rk in rank.items():
        if rk in by_rank:
            if by_rank[rk]["freq"] != freq[lem]:
                raise SystemExit(f"frequency mismatch for rank {rk}: rebuild quranic-words.json first")
            track_of[lem] = card_index[by_rank[rk]["cardId"]]
    if len(track_of) != len(cards):
        raise SystemExit("not every card was matched to a lemma")
    skill_id = {s["key"]: s["id"] for s in content["skills"]}
    if len(skill_id) > len(SKILL_CHARS):
        raise SystemExit("more skills than skill characters")
    demonstrative = track_of.get(fix("ذا"))

    # QUL tables.
    lc = sqlite3.connect(lemma_db)
    qul_lemma = dict((loc, lid) for lid, loc in lc.execute("select lemma_id, word_location from lemma_words"))
    sc = sqlite3.connect(stem_db)
    stem_text = dict(sc.execute("select id, text from stems"))
    qul_stem = dict((loc, sid) for sid, loc in sc.execute("select stem_id, word_location from stem_words"))

    # The words are QUL's: per ayah, positions 1 to the highest QUL location.
    # QUL numbers words as Tanzil writes them (ba'da ma is two words in 2:181,
    # 8:6 and 13:37, where the corpus fuses them), so the table follows Tanzil
    # and the corpus is joined only where an ayah has the same count in both.
    qac_count = collections.Counter(k[:2] for k in keys)
    # Counted from the stem table: the lemma table has three rows past the
    # end of their ayah (13:5:26, 2:275:46, 4:176:51), which are ignored.
    qul_count = collections.Counter()
    for loc in qul_stem:
        s_, a_, w_ = (int(x) for x in loc.split(":"))
        qul_count[(s_, a_)] = max(qul_count[(s_, a_)], w_)
    ayahs = list(qac_count.keys())  # mushaf order

    tanzil = json.load(open(os.path.join(repo, "assets", "quran", "uthmani.json"), encoding="utf-8"))["text"]
    if len(ayahs) != len(tanzil):
        raise SystemExit("ayah count differs")

    def locs_of(sa):
        return ["%d:%d:%d" % (sa[0], sa[1], w) for w in range(1, qul_count[sa] + 1)]

    # Tanzil surface forms, with the basmala Tanzil prepends set aside.
    surfaces_of, unaligned = {}, []
    for gi, sa in enumerate(ayahs):
        toks = tanzil[gi].split(" ")
        if sa[1] == 1 and sa[0] not in (1, 9):
            toks = toks[4:]
        locs = locs_of(sa)
        surfaces = toks if len(toks) == len(locs) else None
        if surfaces is None:
            unaligned.append(gi)
            # Clitics still matter for coverage: find the one merge of two
            # Tanzil words that makes every stem fit.
            if len(toks) == len(locs) + 1:
                for j in range(len(toks) - 1):
                    trial = toks[:j] + [toks[j] + toks[j + 1]] + toks[j + 2:]
                    if all(qul_stem.get(l) is None or skel(stem_text[qul_stem[l]]) in skel(w) for l, w in zip(locs, trial)):
                        surfaces = trial
                        break
        for wi, loc in enumerate(locs):
            surfaces_of[loc] = surfaces[wi] if surfaces else None

    def bare_after_prep(loc):
        """lahu, bihim: QUL's stem is the pronoun, the word has no stem lemma."""
        surface, sid = surfaces_of[loc], qul_stem.get(loc)
        if surface is None or sid is None:
            return False
        A = letters(surface)
        a = "".join(c for c, _ in A)
        b = skel(stem_text[sid])
        p = a.find(b) if b else -1
        return p > 0 and p + len(b) == len(A) and A[p - 1][0] in ("ل", "ب") and object_pronoun(A[p:]) is not None

    ctx = {}
    for sa in ayahs:
        for loc in locs_of(sa):
            ctx[loc] = (qul_lemma.get(loc), qul_stem.get(loc), bare_after_prep(loc))

    # Majority vote: QUL ids -> the lemmas of our track, over the word
    # locations QUL and the corpus share (ayahs with the same word count).
    # The value is the word's whole tuple of stem lemmas, so fused words
    # (mimma, yawma'idhin, alla) keep both. The most specific key that exists
    # wins: (lemma id, stem id, bare pronoun), then the lemma id, then the stem
    # id. QUL gives one lemma to min and man (same letters); the stem id, which
    # keeps the vowels, tells them apart.
    votes = collections.defaultdict(collections.Counter)
    for k in keys:
        if qul_count[k[:2]] != qac_count[k[:2]]:
            continue
        loc = "%d:%d:%d" % k
        lid, sid, bare = ctx[loc]
        if lid is None and sid is None:
            continue
        value = tuple(l for l, _ in words[k]["stems"])
        votes[("full", lid, sid, bare)][value] += 1
        if lid is not None:
            votes[("lemma", lid)][value] += 1
        if sid is not None:
            votes[("stem", sid)][value] += 1
    voted = {q: c.most_common(1)[0][0] for q, c in votes.items()}

    def lemmas_for(loc):
        lid, sid, bare = ctx[loc]
        if lid is None and sid is None:
            return ()  # no QUL data for this word: no card
        for key in (("full", lid, sid, bare), ("lemma", lid), ("stem", sid)):
            if key in voted:
                return voted[key]
        return ()

    out_ayahs = []
    stats = collections.Counter()
    result = {}
    total = 0
    for gi, sa in enumerate(ayahs):
        enc = []
        for loc in locs_of(sa):
            total += 1
            lid, sid, _bare = ctx[loc]
            lems = list(lemmas_for(loc))
            lem = lems[0] if lems else None
            first = track_of.get(lem) if lem is not None else None
            skills, extra = [], []
            surface = surfaces_of[loc]
            if surface is not None and sid is not None:
                got = classify(surface, stem_text[sid], first is not None and first == demonstrative)
                if got is None:
                    stats["stem not found in surface"] += 1
                else:
                    skills, extra = got
            else:
                stats["no surface or stem"] += 1
            for e in extra:
                if fix(e) not in lems:
                    lems.append(fix(e))
            # A word with a second lemma is known only with both; one outside
            # the track is written as card 0, so the word never counts.
            second = track_of.get(lems[1], -2) if len(lems) > 1 and first is not None else None
            if len(lems) > 2 and first is not None and any(l not in track_of for l in lems[2:]):
                second = -2
            ids = sorted(set(skill_id[x] for x in skills if x in skill_id))
            unknown_skills = [x for x in skills if x not in skill_id]
            if unknown_skills:
                stats["skill not in track: " + ",".join(unknown_skills)] += 1
            word = b36(0 if first is None else first + 1)
            if second is not None:
                word += "+" + b36(0 if second < 0 else second + 1)
            word += "".join(SKILL_CHARS[i - 1] for i in ids)
            enc.append(word)
            heur = []
            if surface and (lid is not None or sid is not None):
                heur = sorted(set(lemma_heuristic(surface, lemma_name(lc, lid) if lid is not None else stem_text[sid])))
            result[loc] = {"first": first, "second": second, "skills": sorted(set(skills)), "heur": heur, "lem": lem, "debug": (surface, stem_text.get(sid))}
        out_ayahs.append("".join(enc))

    # Validation rows (offline only): the corpus's view of each word next to
    # the table's, where both number the ayah the same way.
    cmp_rows = []
    for k in keys:
        if qul_count[k[:2]] != qac_count[k[:2]]:
            continue
        r = result["%d:%d:%d" % k]
        cmp_rows.append({
            "q_skills": sorted(set(qac.skill(c) for c in words[k]["clitics"])),
            "o_skills": r["skills"],
            "h_skills": r["heur"],
            "q_lemmas": [l for l, _ in words[k]["stems"]],
            "o_first": r["first"],
            "o_second": r["second"],
            "lem": r["lem"],
            "debug": r["debug"],
        })
    report(cmp_rows, track_of, content, stats, len(keys))

    # The ceiling: every card known and every skill taught.
    ceiling = sum(1 for r in result.values() if r["first"] is not None and (r["second"] is None or r["second"] >= 0))
    print(f"table words {total} (corpus {len(keys)}); known with every card and skill: {ceiling} = {100 * ceiling / total:.2f}%")

    out = {
        "version": 1,
        "attribution": ATTRIBUTION,
        "method": "Per word: the Quranic Words card its QUL lemma and stem belong to (matched offline, by word location), and the parsing skills read off the Tanzil surface form minus the QUL stem.",
        "words": total,
        "skillChars": SKILL_CHARS,
        "cards": cards,
        "unaligned": unaligned,
        "ayahs": out_ayahs,
    }
    blob = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    if EM_DASH in blob:
        raise SystemExit("an em dash would be written")
    open(out_path, "w", encoding="utf-8").write(blob + "\n")
    print(f"wrote {out_path}: {len(blob):,} bytes, {len(out_ayahs)} ayahs, unaligned {unaligned}")


_lemma_cache = {}


def lemma_name(conn, lid):
    if not _lemma_cache:
        _lemma_cache.update(dict(conn.execute("select id, text from lemmas")))
    return _lemma_cache.get(lid, "")


def report(rows, track_of, content, stats, n):
    print("notes:", dict(stats))
    skill_stage = {s["key"]: s["stage"] for s in content["skills"]}
    stage_start = {st["stage"]: st["firstPosition"] - 1 for st in content["stages"]}
    pos = {}
    for l in content["lemmas"]:
        pos[l["cardId"]] = l["pos"]
    cards = [l["cardId"] for l in content["lemmas"]]

    def need_qac(r):
        if not r["q_lemmas"]:
            return None
        nd = 0
        for l in r["q_lemmas"]:
            t = track_of.get(l)
            if t is None:
                return None
            nd = max(nd, pos[cards[t]])
        for s in r["q_skills"]:
            if s not in skill_stage:
                return None
            nd = max(nd, stage_start[skill_stage[s]] + 1)
        return nd

    def need_ours(r, skills_key):
        if r["o_first"] is None or (r["o_second"] is not None and r["o_second"] < 0):
            return None
        nd = pos[cards[r["o_first"]]]
        if r["o_second"] is not None:
            nd = max(nd, pos[cards[r["o_second"]]])
        for s in r[skills_key]:
            if s not in skill_stage:
                return None
            nd = max(nd, stage_start[skill_stage[s]] + 1)
        return nd

    same_skills = sum(1 for r in rows if r["o_skills"] == r["q_skills"])
    same_heur = sum(1 for r in rows if r["h_skills"] == r["q_skills"])
    with_cl = [r for r in rows if r["q_skills"]]
    print(f"clitic skill set, stem rule vs QAC: {same_skills}/{len(rows)} = {100 * same_skills / len(rows):.2f}% exact; words with a clitic: {sum(1 for r in with_cl if r['o_skills'] == r['q_skills'])}/{len(with_cl)}")
    print(f"clitic skill set, lemma heuristic vs QAC: {same_heur}/{len(rows)} = {100 * same_heur / len(rows):.2f}% exact; words with a clitic: {sum(1 for r in with_cl if r['h_skills'] == r['q_skills'])}/{len(with_cl)}")
    # card agreement: our first card in QAC's stem lemmas
    qt = [tuple(sorted(track_of.get(l, -1) for l in r["q_lemmas"])) for r in rows]
    ot = [tuple(sorted(x for x in (r["o_first"] if r["o_first"] is not None else -1, r["o_second"]) if x is not None)) for r in rows]
    agree = sum(1 for a, b in zip(qt, ot) if (set(a) - {-1}) == (set(b) - {-1}))
    print(f"track cards per word agree with QAC: {agree}/{len(rows)} = {100 * agree / len(rows):.2f}%")
    if os.environ.get("MAP_DEBUG"):
        cd = collections.Counter()
        for r, a, b in zip(rows, qt, ot):
            if (set(a) - {-1}) != (set(b) - {-1}):
                cd[(" ".join(r["q_lemmas"]), str(r["lem"]), r["o_second"] is not None)] += 1
        for x, c in cd.most_common(25):
            print("   card diff", c, x)
    nq = [need_qac(r) for r in rows]
    no = [need_ours(r, "o_skills") for r in rows]
    nh = [need_ours(r, "h_skills") for r in rows]
    same_need = sum(1 for a, b in zip(nq, no) if a == b)
    print(f"need (path position at which the word becomes known) agrees: {same_need}/{len(rows)} = {100 * same_need / len(rows):.2f}%")
    for st in content["stages"]:
        k = st["lastPosition"]
        cq = sum(1 for x in nq if x is not None and x <= k)
        co = sum(1 for x in no if x is not None and x <= k)
        ch = sum(1 for x in nh if x is not None and x <= k)
        print(f"  stage {st['stage']:2} at {k:3}: QAC {100 * cq / n:5.1f}%  table {100 * co / n:5.1f}%  (lemma heuristic {100 * ch / n:5.1f}%)  content curve {100 * content['path']['coverage'][k] / n:5.1f}%")
    diff = collections.Counter()
    sample = collections.defaultdict(list)
    for r in rows:
        if r["o_skills"] != r["q_skills"]:
            key = (tuple(r["q_skills"]), tuple(r["o_skills"]))
            diff[key] += 1
            if len(sample[key]) < 4:
                sample[key].append(r.get("debug"))
    print("top skill disagreements (QAC, ours):")
    for x, c in diff.most_common(25):
        print("  ", c, x, sample[x] if os.environ.get("MAP_DEBUG") else "")


if __name__ == "__main__":
    main()
