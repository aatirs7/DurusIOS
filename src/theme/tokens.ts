/* eslint-disable no-restricted-syntax -- this IS the palette file; spec
   section 7.1 puts every hex value here and nowhere else. */
/*
  The only hex values in this project live in this file.

  Ported verbatim from the web app's app/globals.css :root and .dark blocks.
  Nothing downstream writes a raw colour; there is an eslint rule that fails the
  build if a hex literal appears anywhere else under src/, and a numeric test in
  __tests__/harshness.test.ts that asserts the palette's own rules.

  No pure white, no pure black. Ever.
*/

export type ColorToken =
  | "paper"
  | "surface"
  | "surfaceSunk"
  | "ink"
  | "inkSoft"
  | "inkFaint"
  | "rule"
  | "lapis"
  | "lapisWash"
  | "verdigris"
  | "clay"
  | "saffron";

export type Hex = `#${string}`;
export type Palette = Readonly<Record<ColorToken, Hex>>;

export type SchemeKey = "light" | "dark";

/*
  Light is the icon: lapis on paper. The text is a deep blue rather than a near
  black, so the whole screen reads as the same ink the mark is drawn in. Still
  no pure white; the ground stays a warm off white.
*/
const light: Palette = {
  paper: "#f6f4ef",
  surface: "#fcfbf8",
  surfaceSunk: "#eae7df",
  ink: "#1e356f",
  inkSoft: "#56679a",
  inkFaint: "#98a3c0",
  rule: "#d7d9e2",
  lapis: "#2a4a8b",
  lapisWash: "#e3e9f5",
  verdigris: "#34705f",
  clay: "#9c454d",
  saffron: "#9c6f1e",
};

const dark: Palette = {
  paper: "#131722",
  surface: "#1b2130",
  surfaceSunk: "#232a3b",
  ink: "#e9e7e1",
  inkSoft: "#a2a9b8",
  inkFaint: "#6b7385",
  rule: "#2e3648",
  lapis: "#7fa0dc",
  lapisWash: "#1f2a42",
  verdigris: "#6fb6a4",
  clay: "#d4868c",
  saffron: "#d6ac5e",
};

export type Theme = Readonly<{
  key: SchemeKey;
  dark: boolean;
  colors: Palette;
}>;

export const THEMES: Readonly<Record<SchemeKey, Theme>> = {
  light: { key: "light", dark: false, colors: light },
  dark: { key: "dark", dark: true, colors: dark },
};

export const SCHEME_KEYS = ["light", "dark"] as const;
