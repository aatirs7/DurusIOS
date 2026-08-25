/*
  Generates the app icon and the splash mark.

  The mark is the word دُرُوس set in Amiri, lapis on paper - the same mark the
  web app uses, regenerated at the sizes iOS wants rather than upscaled from the
  512px PWA icon.

  No gradient and no rounded rectangle drawn into the art: iOS masks the icon
  itself, and drawing our own corners shows up as a double rounding.

  iOS 18 takes three icon variants. The tinted one is composited by the system
  against a user-chosen colour and is read as a luminance mask, so it is drawn
  as light-on-black rather than in the brand colours - feeding it lapis on paper
  produces a near-white square.

  Run with: npm run brand:build
*/

import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FONT = join(__dirname, "..", "assets", "fonts", "Amiri-Regular.ttf");
const OUT = join(__dirname, "..", "assets", "brand");

/* Repeated here because an SVG cannot read a token file. These must match
   src/theme/tokens.ts. */
const PAPER_LIGHT = "#F6F4EF";
const PAPER_DARK = "#131722";
const LAPIS_LIGHT = "#2A4A8B";
const LAPIS_DARK = "#7FA0DC";

/*
  The word, fully vowelled, exactly as scripts/make-pwa-assets.ts sets it in the
  web repo.

  Kept identical on purpose: this is the same mark on the same home screen, and
  a user with both installed sees them side by side. The two generators share
  the font file byte for byte and the same resvg version, so the same parameters
  produce the same art.

  KNOWN ISSUE, shared with the web app: resvg does not apply Amiri's mark
  positioning here, so the two dammas float above and right of the word rather
  than sitting on their letters. It is a rendering artifact in the PNG pipeline
  only - the app's own Arabic, drawn by CoreText, positions them correctly. It
  is reproduced rather than worked around because the icons must match; fixing
  it means shaping the text to paths in both generators at once.
*/
const WORD = "دُرُوس";

function iconSvg(size: number, ground: string, mark: string): string {
  const fontSize = Math.round(size * 0.34);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${ground}"/>
  <text x="50%" y="${Math.round(size * 0.5 + fontSize * 0.3)}" text-anchor="middle"
        direction="rtl" font-family="Amiri" font-size="${fontSize}"
        fill="${mark}">${WORD}</text>
</svg>`;
}

/*
  The splash mark, sized to land at the same optical size as the PWA's.

  The web generator draws a full-bleed launch image per device and sets the word
  at 0.16 of the screen's short edge. expo-splash-screen works the other way
  round: it paints a flat background itself and centres ONE transparent mark
  scaled to `imageWidth` points. So parity is a matter of arithmetic rather than
  of copying a file.

  The word is drawn at WORD_FRACTION of a fixed canvas, and app.json's
  imageWidth is then chosen so that
      fontSize_on_screen / screen_width  ==  0.16
  on a 393pt class phone, which is what SPLASH_IMAGE_WIDTH below records. Change
  one of the two and the mark stops matching the web app.

  A WIDE canvas, not a square: دُرُوس is roughly 2.2x as wide as its point size,
  so a square canvas sized to look right vertically runs the word off both edges
  - which is how the first build shipped, showing "روس" with the dal clipped.
  The extra height is headroom for the harakat, which sit well above the
  letters here.
*/
const SPLASH_W = 1000;
const SPLASH_H = 700;

/* The word spans this much of the canvas width. */
const WORD_FRACTION = 0.9;
/* Roughly the width of دروس in multiples of its point size. */
const WORD_ASPECT = 2.2;

function splashMarkSvg(mark: string): string {
  const fontSize = Math.round((SPLASH_W * WORD_FRACTION) / WORD_ASPECT);
  /* Baseline low enough that the harakat clear the top edge. */
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SPLASH_W}" height="${SPLASH_H}" viewBox="0 0 ${SPLASH_W} ${SPLASH_H}">
  <text x="50%" y="${Math.round(SPLASH_H * 0.72)}" text-anchor="middle"
        direction="rtl" font-family="Amiri" font-size="${fontSize}"
        fill="${mark}">${WORD}</text>
</svg>`;
}

function render(svg: string, width: number): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { fontFiles: [FONT], loadSystemFonts: false, defaultFontFamily: "Amiri" },
  });
  return Buffer.from(resvg.render().asPng());
}

function write(name: string, buf: Buffer) {
  writeFileSync(join(OUT, name), buf);
  console.log(`  ${name}  ${(buf.length / 1024).toFixed(1)}KB`);
}

mkdirSync(OUT, { recursive: true });
console.log("brand assets:");

/* 1024 is what App Store Connect requires and what EAS slices the rest from. */
write("icon.png", render(iconSvg(1024, PAPER_LIGHT, LAPIS_LIGHT), 1024));
write("icon-dark.png", render(iconSvg(1024, PAPER_DARK, LAPIS_DARK), 1024));
write("icon-tinted.png", render(iconSvg(1024, "#000000", "#FFFFFF"), 1024));

/* app.json sets imageWidth 200; render at 3.6x so it stays crisp. */
write("splash.png", render(splashMarkSvg(LAPIS_LIGHT), SPLASH_W));
write("splash-dark.png", render(splashMarkSvg(LAPIS_DARK), SPLASH_W));
