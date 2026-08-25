/* Spacing and geometry. Constants live here with the reasoning attached. */

export const UNIT = 8;
export const space = (n: number) => n * UNIT;

/* The page gutter. Wide enough that an Arabic card face never touches the edge,
   which reads as clipped even when it is not. */
export const MARGIN = 24;

export const RADIUS = {
  card: 16,
  button: 12,
  pill: 999,
  tile: 10,
  /* Inputs and selectable cards. Softer than a button, because they are
     surfaces you fill rather than things you strike. */
  field: 14,
} as const;

export const HAIRLINE = 1;

/*
  The result band in the review session reserves its height rather than floating
  over the card, so an answer can never end up underneath it. The web version
  learned this the hard way; absolute positioning put the band on top of the
  input on small devices.
*/
export const BAND_HEIGHT = 96;

/* 23 lesson ticks across the width of Today. Hairline marks, not bars: the web
   sets h-4 w-[2px] with a 6px gap, and anything fatter reads as a segmented
   progress bar rather than a scale. */
export const TICK = { width: 2, height: 16, gap: 6 } as const;

/*
  The app enter fade, from globals.css durus-enter.

  The native splash disappears the instant JavaScript is ready, which reads as a
  cut rather than a hand-off. An overlay that matches the splash exactly and
  fades out over this duration is what covers that seam - iOS gives no way to
  hold or animate the launch image itself, so the only workaround is to draw it
  again and dismiss it ourselves.
*/
export const ENTER_MS = 420;

/*
  How long the drawn splash sits still before it begins to leave, and how long
  it takes to go.

  Deliberately slower than the app enter fade. The native launch image is
  replaced the instant the first frame draws, so these two numbers are the whole
  of the transition the user actually perceives - at half a second the mark
  registered as a flash and the app appeared to jump. A held beat followed by a
  long fade reads as the app opening rather than as a screen being swapped.
*/
export const SPLASH_HOLD_MS = 1100;
export const SPLASH_FADE_MS = 700;

/*
  How long the drawn splash takes to cross from the appearance iOS launched
  with to the theme the user actually chose.

  Only used when those two disagree. Long enough to read as a transition rather
  than a flicker, short enough to be over before the hold has really begun -
  the point is that the app's own theme is what the eye settles on.
*/
export const SPLASH_MORPH_MS = 320;

/*
  The width, in points, at which the splash mark is drawn - by
  expo-splash-screen before JavaScript runs, and by AnimatedSplash after.

  BOTH have to use it. The drawn splash exists only to be indistinguishable
  from the native one, and a few points of difference in the mark's size is
  exactly the kind of mismatch that reads as a flicker at the hand-off.

  The value itself comes from the web app: scripts/make-pwa-assets.ts sets the
  launch image's word at 0.16 of the screen's short edge, and this is what
  reproduces that on a 393pt class phone given the proportions the mark is
  generated at. See scripts/make-brand-assets.ts.
*/
export const SPLASH_IMAGE_WIDTH = 155;
/* The generated mark's canvas is 1000x700; the drawn Image has to be given the
   same ratio or `contain` letterboxes it and silently shrinks the word. */
export const SPLASH_IMAGE_HEIGHT = Math.round((SPLASH_IMAGE_WIDTH * 700) / 1000);
