"""
Fetches the Quran Foundation word-by-word data (Uthmani text, English word
translation, word audio path) for every ayah, one JSON file per surah, into a
cache directory given on the command line.

The cache is an input to build_words.py and is not committed: only the few
fields the Quranic Words track uses are copied into the content file, verbatim,
with source "qf-wbw".

Usage: python -I scripts/coverage/fetch_qf_wbw.py <cache_dir>
"""
import json
import os
import sys
import time
import urllib.request

API = "https://api.quran.com/api/v4/verses/by_chapter/{s}?words=true&word_fields=text_uthmani&language=en&per_page=50&page={p}"


def get(url):
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "content-build"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception:
            time.sleep(2 + attempt * 2)
    raise RuntimeError("failed: " + url)


def main():
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for s in range(1, 115):
        path = os.path.join(out, f"{s:03d}.json")
        if os.path.exists(path):
            continue
        verses, page = [], 1
        while True:
            data = get(API.format(s=s, p=page))
            for v in data["verses"]:
                verses.append({
                    "key": v["verse_key"],
                    "words": [
                        {
                            "p": w["position"],
                            "t": w["char_type_name"],
                            "u": w.get("text_uthmani"),
                            "g": (w.get("translation") or {}).get("text"),
                            "a": w.get("audio_url"),
                        }
                        for w in v["words"]
                    ],
                })
            nxt = data["pagination"].get("next_page")
            if not nxt:
                break
            page = nxt
        json.dump(verses, open(path, "w", encoding="utf-8"), ensure_ascii=False)
        print(s, len(verses), flush=True)


if __name__ == "__main__":
    main()
