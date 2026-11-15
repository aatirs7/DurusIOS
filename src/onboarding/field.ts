/*
  Ayah Field layout: every ayah as a dot, in mushaf order, grouped by juz.

  Pure math, so it is tested without a renderer. Each juz starts on a fresh
  row with a small gap above it, which is what makes the thirty groups read as
  thirty groups rather than one long ribbon.

  Fed from the onboarding Tanzil metadata for now (issue #3). When Quran
  Foundation sync lands, the same layout takes counts from the synced tables.
*/

export type FieldLayout = {
  pitch: number; // distance between dot centres
  dot: number; // dot diameter
  cols: number;
  gap: number; // extra space before each juz after the first
  width: number;
  height: number;
  x: Float32Array;
  y: Float32Array;
};

export function juzSizes(juzStarts: number[], total: number): number[] {
  return juzStarts.map((start, i) => (i + 1 < juzStarts.length ? juzStarts[i + 1] : total) - start);
}

function heightFor(sizes: number[], cols: number, pitch: number, gap: number): number {
  let rows = 0;
  for (const n of sizes) rows += Math.ceil(n / cols);
  return rows * pitch + (sizes.length - 1) * gap;
}

/*
  The largest dot pitch at which the whole field fits the box. Searched in
  quarter points from big to small; the field is never scaled after layout, so
  dots land on whole positions and stay crisp.
*/
export function layoutField(width: number, height: number, juzStarts: number[], total: number): FieldLayout {
  const sizes = juzSizes(juzStarts, total);
  let pitch = 12;
  let cols = 1;
  let gap = 0;
  for (; pitch > 1; pitch -= 0.25) {
    cols = Math.max(1, Math.floor(width / pitch));
    gap = Math.max(1, pitch * 0.9);
    if (heightFor(sizes, cols, pitch, gap) <= height) break;
  }
  const dot = Math.max(1, pitch * 0.72);
  const used = cols * pitch;
  const left = (width - used) / 2 + pitch / 2;

  const x = new Float32Array(total);
  const y = new Float32Array(total);
  let top = pitch / 2;
  let i = 0;
  sizes.forEach((n, j) => {
    if (j > 0) top += gap;
    for (let k = 0; k < n; k++, i++) {
      x[i] = left + (k % cols) * pitch;
      y[i] = top + Math.floor(k / cols) * pitch;
    }
    top += Math.ceil(n / cols) * pitch;
  });
  return { pitch, dot, cols, gap, width, height: top - pitch / 2 + pitch / 2, x, y };
}

/* The global ayah indexes of a surah, from its metadata. */
export function surahRange(start: number, ayahs: number): [number, number] {
  return [start, start + ayahs];
}

/*
  One SVG path of square dots for every index where `pick` is true. A single
  path per colour is what lets 6,236 dots draw as three elements rather than
  6,236 views.
*/
export function dotsPath(layout: FieldLayout, pick: (i: number) => boolean): string {
  const d = layout.dot;
  const h = d / 2;
  const parts: string[] = [];
  for (let i = 0; i < layout.x.length; i++) {
    if (!pick(i)) continue;
    parts.push(`M${(layout.x[i] - h).toFixed(1)} ${(layout.y[i] - h).toFixed(1)}h${d.toFixed(1)}v${d.toFixed(1)}h-${d.toFixed(1)}z`);
  }
  return parts.join("");
}
