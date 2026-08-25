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
} as const;

export const HAIRLINE = 1;

/*
  The result band in the review session reserves its height rather than floating
  over the card, so an answer can never end up underneath it. The web version
  learned this the hard way; absolute positioning put the band on top of the
  input on small devices.
*/
export const BAND_HEIGHT = 96;

/* 23 lesson ticks across the width of Today. */
export const TICK = { width: 6, height: 14, gap: 4 } as const;
