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
/* Long enough that the mark is actually seen rather than glimpsed. */
export const SPLASH_HOLD_MS = 550;
