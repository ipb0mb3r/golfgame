// Bench, artist reference geometry (docs/art/bench/SPEC.md). Pure: no Three.js, no DOM.
// Same part format as docs/art/big-props/pieces.js: { positions, indices, w, lo, hi }; a vertex colour =
// mix(slot lo, slot hi, w); the look's `slots` map slot → palette key. Metres, y up, the foot centre at the
// origin, the seat along x, the front (where you sit) facing +z. Real size: 1.8 m wide, seat 0.45 m, back 0.85 m.
// Exported as PIECES.bench so the tee-props mock-up page can show it beside the flags and the tent.  — Agent: artist
const P = (p, lo, hi = lo) => ({ ...p, lo, hi });
// a box centred at (x, y, z), size w × h × d, tipped back about x by `tilt` (rad): 12 triangles
function box(x, y, z, w, h, d, tilt = 0) {
  const v = [], c = Math.cos(tilt), s = Math.sin(tilt);
  for (const [a, b, e] of [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]) {
    const yy = b * h / 2, zz = e * d / 2;
    v.push(x + a * w / 2, y + yy * c + zz * s, z - yy * s + zz * c);
  }
  return { positions: v, indices: [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5], w: [0, 0, 1, 1, 0, 0, 1, 1] };
}
const W = 1.8, BACK = 0.2;                          // width; the backrest leans back 0.2 rad
const seatSlats = (n, depth, t) => Array.from({ length: n }, (_, i) => P(box(0, 0.45, 0.2 - (i + 0.5) * depth / n, W, t, depth / n - 0.025), 'slat', 'slatTop'));
const backSlats = (ys, h, t) => ys.map(y => P(box(0, y, -0.2 - (y - 0.45) * Math.tan(BACK), W, h, t, BACK), 'slat', 'slatTop'));

export const PIECES = {
  bench: {
    B1: { name: 'B1 · Park bench, wooden legs', sub: '3 seat slats, 2 back slats, square legs', size: '1.8 × 0.55 m, 0.85 m tall',
      slots: { slat: 'trunk', slatTop: 'wood', frame: 'trunk', frameTop: 'wood' },
      build() { const out = [...seatSlats(3, 0.42, 0.04), ...backSlats([0.62, 0.78], 0.11, 0.03)];
        for (const x of [-0.75, 0.75]) {
          out.push(P(box(x, 0.215, 0.14, 0.07, 0.43, 0.07), 'frame', 'frameTop'));                  // front leg
          out.push(P(box(x, 0.42, -0.24, 0.07, 0.84, 0.07, BACK * 0.5), 'frame', 'frameTop'));        // back leg, up into the back
          out.push(P(box(x, 0.4, -0.02, 0.06, 0.06, 0.44), 'frame', 'frameTop'));                     // side rail under the seat
        }
        return out; } },
    B2: { name: 'B2 · Park bench, dark ends + armrests', sub: 'the same slats on dark end frames with armrests', size: '1.9 × 0.6 m, 0.85 m tall',
      slots: { slat: 'trunk', slatTop: 'wood', frame: 'leafLow', frameTop: 'leafLow' },
      build() { const out = [...seatSlats(3, 0.42, 0.04), ...backSlats([0.62, 0.78], 0.11, 0.03)];
        for (const x of [-0.93, 0.93]) {
          out.push(P(box(x, 0.3, 0.16, 0.06, 0.6, 0.06), 'frame', 'frameTop'));                     // front leg up to the arm
          out.push(P(box(x, 0.42, -0.24, 0.06, 0.84, 0.06, BACK * 0.5), 'frame', 'frameTop'));
          out.push(P(box(x, 0.62, -0.02, 0.09, 0.05, 0.5), 'frame', 'frameTop'));                   // armrest
        }
        return out; } },
    B3: { name: 'B3 · Chunky plank bench', sub: '2 thick seat planks, 1 back plank, block legs: reads from far', size: '1.8 × 0.55 m, 0.85 m tall',
      slots: { slat: 'trunk', slatTop: 'wood', frame: 'trunk', frameTop: 'wood' },
      build() { const out = [...seatSlats(2, 0.44, 0.07), ...backSlats([0.72], 0.22, 0.06)];
        for (const x of [-0.7, 0.7]) {
          out.push(P(box(x, 0.21, 0.0, 0.12, 0.42, 0.4), 'frame', 'frameTop'));                     // a solid block leg
          out.push(P(box(x, 0.6, -0.26, 0.1, 0.5, 0.08, BACK), 'frame', 'frameTop'));               // back post
        }
        return out; } },
  },
};
export const tris = parts => parts.reduce((n, p) => n + p.indices.length / 3, 0);
