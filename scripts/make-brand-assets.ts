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
  Unvocalised, deliberately.

  The web app's generator sets the fully vowelled دُرُوس, and its shipped
  public/icon-512.png shows the result: resvg does not apply Amiri's mark
  positioning, so the two dammas detach and float above and right of the word,
  which also drags the optical centre off. It is a rendering artifact rather
  than a design choice, and reproducing it faithfully would mean shipping a
  broken looking icon to App Review.

  A logotype does not need harakat - the word is still دروس - so the icon drops
  them and the mark sits where it should. The vowelled form stays everywhere it
  matters, which is the card faces.
*/
const WORD = "دروس";

function iconSvg(size: number, ground: string, mark: string): string {
  const fontSize = Math.round(size * 0.34);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${ground}"/>
  <text x="50%" y="${Math.round(size * 0.5 + fontSize * 0.1)}" text-anchor="middle"
        direction="rtl" font-family="Amiri" font-size="${fontSize}"
        fill="${mark}">${WORD}</text>
</svg>`;
}

/*
  The splash mark. Transparent art on a flat background supplied by
  expo-splash-screen, so only the word is drawn.

  A WIDE canvas, not a square. دروس is roughly 2.2x as wide as its point size,
  so a square canvas with a font size chosen to look right vertically runs the
  word off both edges - which is exactly how the first build shipped, showing
  "روس" with the dal clipped away. Sizing from the width and letting the height
  follow is what keeps the whole word on the canvas.
*/
const SPLASH_W = 720;
const SPLASH_H = 360;

function splashMarkSvg(mark: string): string {
  /* Widest safe size: the word occupies ~85% of the canvas width. */
  const fontSize = Math.round((SPLASH_W * 0.82) / 2.2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SPLASH_W}" height="${SPLASH_H}" viewBox="0 0 ${SPLASH_W} ${SPLASH_H}">
  <text x="50%" y="${Math.round(SPLASH_H * 0.5 + fontSize * 0.30)}" text-anchor="middle"
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
