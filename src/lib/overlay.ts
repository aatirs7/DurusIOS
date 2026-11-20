/*
  One full-screen card at a time. iOS presents a single modal at once, so the
  first-visit tips and the offline recitation question take turns: each
  claims the overlay before opening and releases it on close; a claim that
  fails waits and tries again.
*/
let holder: string | null = null;

export function claimOverlay(id: string): boolean {
  if (holder !== null && holder !== id) return false;
  holder = id;
  return true;
}

export function releaseOverlay(id: string) {
  if (holder === id) holder = null;
}
