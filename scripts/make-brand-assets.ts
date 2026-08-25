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

  The same mark is generated in the web repo by scripts/make-pwa-assets.ts, and
  the two must agree: a user with both installed sees them side by side on one
  home screen. They share the font file byte for byte and the same resvg
  version, so identical parameters produce identical art. Change the geometry
  here and change it there.
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
  The two dammas are drawn as separate glyphs at measured offsets, instead of
  being typed into the word.

  resvg does not apply Amiri's mark positioning: handed the vowelled string
  "دُرُوس" it lays the harakat out on their own advances, so both float above and
  to the right of the letters they belong to and drag the word off its optical
  centre. The web app has shipped that artifact since its icons were first
  generated. It is a limitation of this PNG pipeline only - the app's own
  Arabic is drawn by CoreText and positions marks correctly - but the icon is a
  PNG, so the icon has to work around it.

  Every offset below is a fraction of the font size, so the whole construction
  scales. They were measured, not guessed: the word was rendered once with each
  letter in its own colour, the letters located by their pixels, and the marks
  placed a hair above the tops of the dal and the ra. scripts/measure-mark.mjs
  is not kept - the numbers are the output, and this comment is the record of
  where they came from.

  Derived at font size 300 with the baseline at y=560 and the word centred at
  x=600:

    dal   ink x 825..915  top 443      damma placed to sit just above it
    ra    ink x 657..782  top 475
    waw   ink x 537..662  top 473      (no mark: it is the long vowel)
    damma ink is 0.24 wide and 0.31 tall, and floats 0.84 above its own
          baseline, which is why the mark's baseline goes BELOW the word's

  The composed ink runs from 0.747 above the baseline to 0.227 below it, which
  is what CENTRE_ABOVE_BASELINE records so the whole thing can be centred as one
  piece rather than centred on the word and left top heavy.
*/
const WORD = "دروس";
const DAMMA = "&#x064F;";

/*
  Mark offsets from the word's centre and baseline, in multiples of font size.

  The dammas belong on the DAL and the RA, not on the waw: the word is
  du-ru-s, and the waw is the long vowel the ra's damma is already spelling.
  Placing the second mark over the waw is wrong Arabic, and it is an easy
  mistake to make from the rendered shape alone, because the ra and the waw sit
  side by side with no gap between their ink.
*/
const DAL_DAMMA = { dx: 0.65, dy: 0.4 };
const RA_DAMMA = { dx: 0.15, dy: 0.5067 };

/* Ink extents of the composed mark, in multiples of font size. */
const INK_ABOVE_BASELINE = 0.7467;
const INK_BELOW_BASELINE = 0.2267;
const INK_WIDTH = 2.107;
/* Where the visual centre sits relative to the baseline. Negative is above. */
const CENTRE_ABOVE_BASELINE = (INK_ABOVE_BASELINE - INK_BELOW_BASELINE) / 2;

/*
  The word and its two marks, centred horizontally on cx and sitting on the
  given baseline. Everything that draws the mark goes through here so the icon
  and the splash cannot drift apart.
*/
function markSvg(cx: number, baseline: number, fontSize: number, fill: string): string {
  const damma = (o: { dx: number; dy: number }) =>
    `<text x="${cx + o.dx * fontSize}" y="${baseline + o.dy * fontSize}" text-anchor="middle"
        font-family="Amiri" font-size="${fontSize}" fill="${fill}">${DAMMA}</text>`;

  return `<text x="${cx}" y="${baseline}" text-anchor="middle"
        direction="rtl" font-family="Amiri" font-size="${fontSize}"
        fill="${fill}">${WORD}</text>
  ${damma(DAL_DAMMA)}
  ${damma(RA_DAMMA)}`;
}

/* The baseline that puts the composed mark's visual centre on a canvas's. */
function centredBaseline(height: number, fontSize: number): number {
  return Math.round(height / 2 + CENTRE_ABOVE_BASELINE * fontSize);
}

function iconSvg(size: number, ground: string, mark: string): string {
  const fontSize = Math.round(size * 0.34);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${ground}"/>
  ${markSvg(size / 2, centredBaseline(size, fontSize), fontSize, mark)}
</svg>`;
}

/*
  The splash mark, sized to land at the same optical size as the PWA's.

  The web generator draws a full-bleed launch image per device and sets the word
  at 0.16 of the screen's short edge. expo-splash-screen works the other way
  round: it paints a flat background itself and centres ONE transparent mark
  scaled to `imageWidth` points. So parity is arithmetic rather than a copied
  file.

  The word is drawn at WORD_FRACTION of a fixed canvas, and app.json's
  imageWidth is then chosen so that

      fontSize_on_screen / screen_width  ==  0.16

  on a 393pt class phone, which is what SPLASH_IMAGE_WIDTH in theme/layout.ts
  records. Change one of the two and the mark stops matching the web app - and
  AnimatedSplash, which redraws this same image, has to use the same width or
  the hand-off flickers.

  A WIDE canvas, not a square: the mark is a little over 2x as wide as its point
  size, so a square canvas sized to look right vertically runs the word off both
  edges - which is how the first build shipped, showing "روس" with the dal
  clipped. The extra height is headroom for the harakat.
*/
const SPLASH_W = 1000;
const SPLASH_H = 700;

/* The mark spans this much of the canvas width. */
const WORD_FRACTION = 0.9;

function splashMarkSvg(mark: string): string {
  const fontSize = Math.round((SPLASH_W * WORD_FRACTION) / INK_WIDTH);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SPLASH_W}" height="${SPLASH_H}" viewBox="0 0 ${SPLASH_W} ${SPLASH_H}">
  ${markSvg(SPLASH_W / 2, centredBaseline(SPLASH_H, fontSize), fontSize, mark)}
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

write("splash.png", render(splashMarkSvg(LAPIS_LIGHT), SPLASH_W));
write("splash-dark.png", render(splashMarkSvg(LAPIS_DARK), SPLASH_W));
