"""
Coverage per stage of the Quranic Words path (spec section 5), offline.

Same input and rules as qac_coverage.py. Two figures per stage:
  listed: only the words the spec names for stages 0 to 5 (with each stage's
          parsing skills), so a floor for those stages;
  filled: the named words, then the most frequent remaining lemmas until the
          stage reaches the spec's cumulative lemma count, so what the stage
          can reach if its free slots go to the most frequent words.

Usage: python -I scripts/coverage/stages.py <morphology.txt>
"""
import collections
import importlib.util
import os
import sys

spec = importlib.util.spec_from_file_location("qac", os.path.join(os.path.dirname(__file__), "qac_coverage.py"))
qac = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qac)

PRONOUNS = ["PRON 3MS", "PRON 3MP", "PRON 2MP", "PRON 1P", "PRON 2MS", "PRON 1S", "PRON 3FS", "PRON 3FP", "PRON 3D", "إِيّا"]
SUFFIXES = ["suffix " + p for p in ["3MS", "3MP", "2MP", "1P", "2MS", "1S", "3FS", "3FP", "3D", "2D", "2FS", "3MD", "2FP", "3FD"]]

# (name, cumulative lemma target, listed lemmas, surahs whose lemmas are listed, skills taught)
STAGES = [
    ("0 Al-Fatiha", 20, [], [1], ["al-", "bi-", "li-", "wa-", "suffix 1P", "suffix 3MP"]),
    ("1 Glue I", 35, ["مِن", "فِي", "إِلَى", "عَن", "مَن", "ما", "إِنّ", "ذا"] + PRONOUNS, [], SUFFIXES + ["ha (attention)", "-li- in dhalika", "suffix -kum on that/those"]),
    ("2 Words of salah", 75, [], [112, 113, 114, 108, 103, 110], []),
    ("3 Glue II", 95, ["لا", "لَم", "لَن", "إِلّا", "إِن", "إِذا", "إِذ", "قَد", "ثُمّ", "أَو", "لَو", "بَل"], [], ["fa-", "ka-", "sa-", "la- (emphasis)", "a- (question)", "ya (calling)"]),
    ("4 Core verbs I", 125, ["قالَ", "كانَ", "آمَنَ", "كَفَرَ", "عَلِمَ", "جَعَلَ", "جاءَ", "عَمِلَ", "رَأَى", "آتَى", "أَتَى"], [], ["-nna (emphasis)"]),
    ("5 Allah and His attributes", 150, ["عَلِيم", "حَكِيم", "رَحِيم", "غَفُور", "عَزِيز", "سَمِيع", "بَصِير", "قَدِير", "خَبِير"], [], ["ta (oath)", "-mma in Allahumma", "suf P"]),
    ("6 The unseen and the hereafter", 185, [], [], []),
    ("7 Belief, guidance and deeds", 225, [], [], []),
    ("8 Messengers and peoples", 260, [], [], []),
    ("9 Creation and signs", 300, [], [], []),
    ("10 People and society", 350, [], [], []),
    ("11 Core verbs II", 420, [], [], []),
    ("12 To 80%", 500, [], [], []),
]


def main():
    words = qac.parse(sys.argv[1])
    n = len(words)
    freq = collections.Counter()
    for r in words.values():
        for lem, _ in set(r["stems"]):
            freq[lem] += 1
    order = [l for l, _ in freq.most_common()]
    missing = [l for st in STAGES for l in st[2] if l not in freq]
    if missing:
        print("not in corpus:", missing)

    def coverage(known, skills):
        hit = 0
        for r in words.values():
            if r["stems"] and all(l in known for l, _ in r["stems"]) and all(qac.skill(c) in skills for c in r["clitics"]):
                hit += 1
        return 100 * hit / n

    listed, filled, skills = set(), set(), set()
    for name, target, lems, surahs, sk in STAGES:
        skills |= set(sk)
        new = set(lems)
        for (s, _a, _w), r in words.items():
            if s in surahs:
                new |= {l for l, _ in r["stems"]}
        added_listed = len(new - listed)
        listed |= new
        filled |= new
        for l in order:
            if len(filled) >= target:
                break
            filled.add(l)
        print(f"{name}: named {added_listed} new, listed {len(listed)} lemmas = {coverage(listed, skills):.1f}%; filled {len(filled)} lemmas = {coverage(filled, skills):.1f}%")


if __name__ == "__main__":
    main()
