"""
Quranic Words coverage numbers (issue #4, spec section 2).

Reads a Quranic Arabic Corpus morphology file (the segment-per-line format,
e.g. mustafa0x/quran-morphology) from a path given on the command line. The
corpus is GPL with a no-modification clause, so it is used OFFLINE ONLY: the
file is never committed, bundled or shipped, and this script prints counts.

Unit: lemma of each stem segment. Denominator: orthographic words.
A word counts as known when every stem lemma in it is known and every
clitic on it (prefixes such as wa-, fa-, bi-, al-; attached pronouns) has
been taught as a parsing skill.

Usage: python -I scripts/coverage/qac_coverage.py <morphology.txt> [out.json]
"""
import collections
import json
import re
import sys

# Stem parts of speech counted as content words; everything else (particles,
# pronouns, demonstratives, relatives, time and place adverbs, conditionals)
# is a function word.
CONTENT = {"N", "PN", "ADJ", "V", "IMPN", "VN", "ACT_PCPL", "PASS_PCPL"}
PERSON = re.compile(r"^[123][MF]?[SDP]$")


def parse(path):
    words = collections.OrderedDict()
    for line in open(path, encoding="utf-8"):
        line = line.rstrip("\n")
        if not line or line.startswith("#"):
            continue
        loc, form, tag, feats = line.split("\t")
        s, a, w, _seg = loc.split(":")
        key = (int(s), int(a), int(w))
        f = feats.split("|")
        lem = next((x[4:] for x in f if x.startswith("LEM:")), None)
        rec = words.setdefault(key, {"stems": [], "clitics": [], "form": ""})
        rec["form"] += form
        if "PREF" in f:
            rec["clitics"].append("pre:" + (lem or f[0]) + ":" + f[0])
            if f[0] in ("P", "PRP"):
                rec["prep"] = True
        elif "SUFF" in f or (f[0] == "PRON" and lem is None and (rec["stems"] or rec.get("prep"))):
            # Some attached pronouns lack the SUFF flag. One that follows a
            # stem, or a prepositional prefix (lahu, bihi), is a suffix all
            # the same; after wa- or fa- alone (wa-hum) it is a pronoun word.
            sub = "PRON:" + next((x for x in f if PERSON.match(x)), "?") if f[0] == "PRON" else f[0]
            rec["clitics"].append("suf:" + (lem or "") + ":" + sub)
        else:
            pos = tag if f[0].startswith(("ROOT:", "LEM:")) or f[0] in ("M", "F") else f[0]
            if tag == "V":
                pos = "V"
            if f[0] == "PRON" and lem is None:
                # An independent pronoun without a lemma: one lemma per person.
                lem = "PRON " + next((x for x in f if PERSON.match(x)), "?")
            rec["stems"].append((lem or form, pos))
    return words


def skill(c):
    """Group raw clitic ids into the parsing skills a learner is taught."""
    kind, lem, sub = c.split(":", 2)
    if kind == "pre":
        return {"ال": "al-", "و": "wa-", "ف": "fa-", "ب": "bi-", "ل": "la- (emphasis)" if sub == "EMPH" else "li-", "ك": "ka-", "س": "sa-", "أ": "a- (question)", "ي": "ya (calling)", "ه": "ha (attention)", "ت": "ta (oath)"}.get(lem, "pre " + lem)
    if sub.startswith("PRON:"):
        return "suffix " + sub[5:]
    return {"ADDR": "suffix -kum on that/those", "DIST": "-li- in dhalika", "EMPH": "-nna (emphasis)", "VOC": "-mma in Allahumma", "ATT": "ha (attention)"}.get(sub, "suf " + sub)


def main():
    words = parse(sys.argv[1])
    n = len(words)
    freq = collections.Counter()
    pos_of = {}
    for r in words.values():
        for lem, pos in set(r["stems"]):
            freq[lem] += 1
            pos_of.setdefault(lem, collections.Counter())[pos] += 1
    order = [l for l, _ in freq.most_common()]
    rank = {l: i for i, l in enumerate(order)}
    # Rank a word needs: the rank of its rarest stem lemma.
    need = [max(rank[l] for l, _ in r["stems"]) if r["stems"] else 0 for r in words.values()]
    with_clitic = sum(1 for r in words.values() if r["clitics"])
    bare_need = [nd for nd, r in zip(need, words.values()) if not r["clitics"]]

    def curve(needs):
        c = collections.Counter(needs)
        cum, out = 0, []
        for i in range(len(order)):
            cum += c.get(i, 0)
            out.append(cum)
        return out

    full = curve(need)
    bare = curve(bare_need)

    def lemmas_for(p):
        target = p / 100 * n
        return next(i + 1 for i, v in enumerate(full) if v >= target)

    def cov(k, cur=full):
        return round(100 * cur[min(k, len(cur)) - 1] / n, 1) if k else 0.0

    def is_function(lem):
        return pos_of[lem].most_common(1)[0][0] not in CONTENT

    func_tokens = sum(1 for r in words.values() if r["stems"] and all(is_function(l) for l, _ in r["stems"]))
    skills = collections.Counter(skill(c) for r in words.values() for c in set(r["clitics"]))

    report = {
        "orthographic_words": n,
        "distinct_lemmas": len(order),
        "lemmas_for_coverage": {p: lemmas_for(p) for p in (25, 50, 60, 70, 80, 90)},
        "coverage_at": {k: cov(k) for k in (20, 35, 75, 95, 100, 125, 150, 185, 225, 250, 260, 300, 350, 420, 500, 540, 1000)},
        "coverage_at_without_clitics_taught": {k: cov(k, bare) for k in (100, 250, 500)},
        "words_with_a_clitic": with_clitic,
        "function_word_tokens": func_tokens,
        "function_lemmas_in_top_100": sum(1 for l in order[:100] if is_function(l)),
        "skills": skills.most_common(),
        "top": [(l, freq[l], pos_of[l].most_common(1)[0][0]) for l in order[:600]],
    }
    out = json.dumps(report, ensure_ascii=False, indent=1)
    if len(sys.argv) > 2:
        open(sys.argv[2], "w", encoding="utf-8").write(out)
    else:
        print(out)


if __name__ == "__main__":
    main()
