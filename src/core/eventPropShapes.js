// AP7g: the shapes of the event props (DESIGN §8b "Event props", the artist's owner-approved spec
// docs/art/tee-props/SPEC.md). Pure (no Three.js, no DOM), tested in tests/event-props.test.js. The numbers are the
// artist's reference geometry (docs/art/tee-props/pieces.js: PIECES.flag.F1 → featherFlag, PIECES.tent.T1 →
// popupTent), tidied: same parts, same sizes, same triangle counts (45 / 104).
// A piece has named parts (core/bigPropShapes.js merge format: { positions, indices, w, lo, hi }): the flag's
// `banner` and the tent's `roof` are parts of their own (thin single sheets, drawn double-sided; a wind sway of the
// banner could be added later). Metres at 1× (× EVENT_PROP_SCALE in game), y up, the foot centre at the origin,
// the front (the printed side) facing +z.
import { merge } from './bigPropShapes.js';

const TAU = Math.PI * 2;
const P = (p, lo, hi = lo) => ({ ...p, lo, hi });
function box(x, y, z, w, h, d) {
  const v = [];
  for (const [a, b, c] of [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]) v.push(x + a * w / 2, y + b * h / 2, z + c * d / 2);
  return { positions: v, indices: [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5], w: [0, 0, 1, 1, 0, 0, 1, 1] };
}
// a thin n-sided pole from y0 to y1, radius r, a flat top: 3n triangles
function pole(n, r, y0, y1) {
  const v = [], idx = [], w = [];
  for (const [y, wt] of [[y0, 0], [y1, 1]]) for (let s = 0; s < n; s++) { const a = s / n * TAU; v.push(r * Math.cos(a), y, r * Math.sin(a)); w.push(wt); }
  v.push(0, y1, 0); w.push(1);
  for (let s = 0; s < n; s++) { const t = (s + 1) % n; idx.push(s, n + s, n + t, s, n + t, t, n + s, 2 * n, n + t); }
  return { positions: v, indices: idx, w };
}
// a banner sheet from rows [y, xLeft, xRight] (bottom → top), bowed in z by `bow` (a soft curve, so it shades),
// cut into bands [fromRow, toRow, slot]: one part per band. 2 triangles per row gap.
function banner(rows, bands, bow = 0.1) {
  const W = Math.max(...rows.map(r => r[2])), y0 = rows[0][0], y1 = rows.at(-1)[0];
  const vtx = ([y, xl, xr]) => [[xl, y, bow * Math.sin(Math.PI * xl / W)], [xr, y, bow * Math.sin(Math.PI * xr / W)]];
  return bands.map(([from, to, slot]) => {
    const v = [], idx = [], w = [];
    for (let i = from; i <= to; i++) for (const p of vtx(rows[i])) { v.push(...p); w.push((rows[i][0] - y0) / (y1 - y0)); }
    for (let k = 0; k < to - from; k++) { const a = k * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    return P({ positions: v, indices: idx, w }, slot);
  });
}
// a 4-sided pyramid roof: base w × d at y0, apex h higher, each side cut in 2 at its middle (8 triangles; one slot
// per wedge in turn, so a striped roof stays possible)
function tentRoof(w, d, y0, h, slots) {
  const c = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]], out = [];
  for (let k = 0; k < 4; k++) {
    const [ax, az] = c[k], [bx, bz] = c[(k + 1) % 4], mx = (ax + bx) / 2, mz = (az + bz) / 2;
    [[ax, az, mx, mz], [mx, mz, bx, bz]].forEach(([px, pz, qx, qz], j) =>
      out.push(P({ positions: [px, y0, pz, qx, y0, qz, 0, y0 + h, 0], indices: [0, 2, 1], w: [0, 0, 1] }, slots[(2 * k + j) % slots.length])));
  }
  return out;
}

const PIECES = {
  // F1 · a 5-sided pole (r 2.5 cm, 3.42 m) in a 0.36 m base; a banner 0.5 → 0.75 m wide, rounding over to the pole
  // tip, bowed 10 cm; three bands bottom → top: body, a thin stripe, the top cap
  featherFlag: () => {
    const rows = [[0.45, 0, 0.5], [1.0, 0, 0.62], [1.6, 0, 0.7], [2.2, 0, 0.75], [2.7, 0, 0.75], [2.85, 0, 0.74], [2.95, 0, 0.73], [3.15, 0, 0.62], [3.32, 0.04, 0.42], [3.42, 0.12, 0.18]];
    return { pole: [P(pole(5, 0.025, 0, 3.42), 'pole'), P(box(0, 0.06, 0, 0.36, 0.12, 0.36), 'base')],
      banner: banner(rows, [[0, 4, 'body'], [4, 6, 'stripe'], [6, 9, 'top']]) };
  },
  // T1 · an open 3 × 3 m canopy: 4 legs (6 cm, 2.2 m), a pyramid roof (base 3.1 m, rise 0.95 m), a 0.3 m valance
  popupTent: () => {
    const frame = [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]].map(([x, z]) => P(box(x, 1.1, z, 0.06, 2.2, 0.06), 'leg'));
    for (const [x, z, w, d] of [[0, 1.55, 3.1, 0.03], [0, -1.55, 3.1, 0.03], [1.55, 0, 0.03, 3.1], [-1.55, 0, 0.03, 3.1]]) frame.push(P(box(x, 2.1, z, w, 0.3, d), 'valance'));
    return { frame, roof: tentRoof(3.1, 3.1, 2.25, 0.95, ['roof']) };
  },
};
export const EVENT_PROP_PIECES = Object.freeze(Object.keys(PIECES));

// → { parts: { <name>: merged part }, tris, radius (m at 1×: the farthest point from the foot's vertical axis, the
// footprint), height (m at 1×) }. Built once.
const cache = new Map();
export function eventPropShape(id) {
  if (!PIECES[id]) throw new Error(`no event-prop shape "${id}" (core/eventPropShapes.js)`);
  if (!cache.has(id)) {
    const parts = Object.fromEntries(Object.entries(PIECES[id]()).map(([k, v]) => [k, merge(v)]));
    let radius = 0, height = 0, tris = 0;
    for (const p of Object.values(parts)) {
      tris += p.tris;
      for (let i = 0; i < p.positions.length; i += 3) { radius = Math.max(radius, Math.hypot(p.positions[i], p.positions[i + 2])); height = Math.max(height, p.positions[i + 1]); }
    }
    cache.set(id, Object.freeze({ parts, tris, radius, height }));
  }
  return cache.get(id);
}
