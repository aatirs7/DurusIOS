/*
  Harakat helpers live here rather than in the component so the seed
  script and the parser can import them without pulling in JSX.
*/

const HARAKAT_GLOBAL = /[ً-ْٰ]/g;
const HARAKAT = /[ً-ْٰ]/;

export function stripHarakat(text: string): string {
  return text.replace(HARAKAT_GLOBAL, "");
}

export function hasHarakat(text: string): boolean {
  return HARAKAT.test(text);
}
