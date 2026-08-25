import { Platform, type TextStyle } from "react-native";

/*
  Type scale, ported from the web app's globals.css and components/ui.tsx.

  Spec section 7.2 calls for three families: Satoshi for UI, IBM Plex Mono for
  numerals, Amiri for Arabic. Two of the three are now bundled.

  Amiri matters most and is no longer optional. On the placeholder face (iOS's
  Geeza Pro) the harakat detached from their letters and floated above the word
  - a vowelled card was unreadable, which for this app is not a cosmetic
  problem. Amiri carries the mark positioning the text depends on.

  Satoshi is still the system face. It ships in the web repo only as
  Satoshi-Variable.woff2; woff2 does not work in React Native at all, and
  section 7.2 additionally wants one static cut per weight, so the statics have
  to come from the Fontshare licence. Until then the UI is set in SF, which is
  a defensible face rather than a broken one.

  The rule that survives the swap, and the reason this file is shaped this way:
  each weight is registered as its OWN family name and fontWeight is never set
  anywhere in the app. On iOS, combining a custom fontFamily with fontWeight
  produces synthesised bolding or silently picks the wrong face.
*/
export const FONTS = {
  /* TODO(fonts): "Satoshi-Regular" / "-Medium" once the statics are licensed. */
  uiRegular: Platform.select({ ios: "System", default: "System" })!,
  uiMedium: Platform.select({ ios: "System", default: "System" })!,
  mono: "IBMPlexMono_400Regular",
  arabicRegular: "Amiri_400Regular",
  arabicBold: "Amiri_700Bold",
} as const;

/* Only the UI face is still a stand-in. The About screen reads this. */
export const FONTS_ARE_PLACEHOLDERS = true;

export type TextVariant =
  | "eyebrow"
  | "pageTitle"
  | "body"
  | "bodySoft"
  | "numeral"
  | "label";

type Spec = {
  family: string;
  size: number;
  /* Spec states tracking in em; React Native letterSpacing is in points, so
     this is multiplied by the size in build(). */
  em: number;
  lineHeightRatio: number;
  uppercase?: true;
  tabular?: true;
};

const SPECS: Record<TextVariant, Spec> = {
  eyebrow: { family: FONTS.uiMedium, size: 12, em: 0.08, lineHeightRatio: 1.2, uppercase: true },
  pageTitle: { family: FONTS.uiMedium, size: 24, em: -0.01, lineHeightRatio: 1.2 },
  body: { family: FONTS.uiRegular, size: 16, em: 0, lineHeightRatio: 1.5 },
  bodySoft: { family: FONTS.uiRegular, size: 15, em: 0, lineHeightRatio: 1.5 },
  /* Every count and timer, so nothing jitters as it ticks. */
  numeral: { family: FONTS.mono, size: 40, em: 0, lineHeightRatio: 1, tabular: true },
  label: { family: FONTS.uiRegular, size: 13, em: 0, lineHeightRatio: 1.3 },
};

function build(s: Spec): TextStyle {
  return {
    fontFamily: s.family,
    fontSize: s.size,
    lineHeight: Math.round(s.size * s.lineHeightRatio),
    letterSpacing: Number((s.size * s.em).toFixed(2)),
    ...(s.uppercase ? { textTransform: "uppercase" as const } : null),
    ...(s.tabular ? { fontVariant: ["tabular-nums" as const] } : null),
  };
}

export const textStyles = Object.fromEntries(
  (Object.keys(SPECS) as TextVariant[]).map((k) => [k, build(SPECS[k])]),
) as Record<TextVariant, TextStyle>;

/*
  Arabic gets its own style and never shares one with English.

  Three rules from spec section 7.3, all of which are visible immediately when
  broken:

    - NEVER set letterSpacing on Arabic. React Native applies tracking between
      glyphs and it breaks the joins.
    - lineHeight has to be generous or the harakat clip against the line above.
      1.9 is tuned for Amiri; verify with a fully vowelled phrase card rather
      than a single word.
    - Arabic and English never share a text node, because bidi reorders them
      around each other.
*/
export const arabicStyles = {
  card: {
    fontFamily: FONTS.arabicRegular,
    fontSize: 40,
    lineHeight: Math.round(40 * 1.9),
  } satisfies TextStyle,
  title: {
    fontFamily: FONTS.arabicRegular,
    fontSize: 24,
    lineHeight: Math.round(24 * 1.9),
  } satisfies TextStyle,
  inline: {
    fontFamily: FONTS.arabicRegular,
    fontSize: 18,
    lineHeight: Math.round(18 * 1.9),
  } satisfies TextStyle,
  tile: {
    fontFamily: FONTS.arabicRegular,
    fontSize: 28,
    lineHeight: Math.round(28 * 1.6),
  } satisfies TextStyle,
} as const;

export type ArabicVariant = keyof typeof arabicStyles;
