"""
Turns the licensed Satoshi variable font into the static cuts React Native needs.

Spec section 7.2 wants one static file per weight, and registers each as its own
family name, because on iOS combining a custom fontFamily with fontWeight
produces synthesised bolding or silently picks the wrong face.

The source is the same Satoshi-Variable.woff2 the web app already loads, from
the same licence. Two conversions happen here and neither is a modification of
the typeface:

  woff2 -> ttf   woff2 is a web transport wrapper. React Native cannot load it
                 at all, so the glyf data is simply re-wrapped.
  variable -> static
                 instancing pins the wght axis at one value and drops the rest.
                 The named instances (Light 300, Regular 400, Medium 500, Bold
                 700, Black 900) are the designer's own, so 400 and 500 are the
                 faces ITF drew rather than an interpolation we invented.

Fontshare's embedded licence (name ID 13) requires that the ITF fonts be
identified by name and ITF's ownership credited in production credits. That
credit lives in the About screen. Do not remove it: it is a licence term, not a
courtesy.

Run:  npm run fonts:build
"""

import os
import sys

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

SRC = os.environ.get(
    "SATOSHI_SRC", r"C:/Users/aatir/Durus/app/fonts/Satoshi-Variable.woff2"
)
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "fonts")

# The two weights the type scale actually uses. Adding a third means adding a
# role in typography.ts first, not the other way round.
WEIGHTS = {400: "Satoshi-Regular", 500: "Satoshi-Medium"}


def main() -> int:
    if not os.path.exists(SRC):
        print(f"Satoshi source not found at {SRC}", file=sys.stderr)
        print("Set SATOSHI_SRC to the licensed Satoshi-Variable.woff2.", file=sys.stderr)
        return 1

    os.makedirs(OUT, exist_ok=True)

    for weight, name in WEIGHTS.items():
        font = TTFont(SRC)
        static = instancer.instantiateVariableFont(font, {"wght": weight})

        # Each cut is its own family. If both were called "Satoshi", iOS would
        # see one family with two members and pick between them by weight -
        # exactly the synthesis the spec forbids.
        for record in static["name"].names:
            if record.nameID == 1:
                record.string = name
            elif record.nameID == 4:
                record.string = name
            elif record.nameID == 6:
                record.string = name
            elif record.nameID == 2:
                record.string = "Regular"

        # Plain TTF, not woff2: this is going into an app bundle, not over HTTP.
        static.flavor = None
        path = os.path.abspath(os.path.join(OUT, f"{name}.ttf"))
        static.save(path)
        print(f"  {name}.ttf  {os.path.getsize(path) / 1024:.1f}KB  (wght {weight})")

    print("Satoshi statics written. The ITF credit in About is a licence term.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
