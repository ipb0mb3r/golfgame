// Tee props (feather flag, pop-up tent), artist reference geometry (docs/art/tee-props/SPEC.md). Pure: no Three.js, no DOM.
// Same part format as docs/art/big-props/pieces.js: { positions, indices, w, lo, hi }; a vertex colour =
// mix(slot lo, slot hi, w); the look's `slots` map slot → palette key. Metres, y up, foot centre at the origin,
// the front (the printed side) facing +z. Colours follow the biome's accents (owner): accent, subAccent, propSnow.
// Flat banners and the tent roof are thin single sheets: draw double-sided.  — Agent: artist
const TAU = Math.PI * 2;
const P = (p, lo, hi = lo) => ({ ...p, lo, hi });
function xf(p, { x = 0, y = 0, z = 0, ry = 0 } = {}) {
  const pos = [], c = Math.cos(ry), s = Math.sin(ry);
  for (let i = 0; i < p.positions.length; i += 3) { const a = p.positions[i], b = p.positions[i + 1], d = p.positions[i + 2]; pos.push(a * c + d * s + x, b + y, -a * s + d * c + z); }
  return { ...p, positions: pos };
}
function box(x, y, z, w, h, d) {
  const v = [];
  for (const [a, b, c] of [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]) v.push(x + a * w / 2, y + b * h / 2, z + c * d / 2);
  return { positions: v, indices: [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5], w: [0, 0, 1, 1, 0, 0, 1, 1] };
}
// a thin pole: n-sided prism from y0 to y1, radius r (3n triangles incl. a flat top)
function pole(n, r, y0, y1, x = 0, z = 0) {
  const v = [], idx = [], w = [];
  for (const [y, wt] of [[y0, 0], [y1, 1]]) for (let s = 0; s < n; s++) { const a = s / n * TAU; v.push(x + r * Math.cos(a), y, z + r * Math.sin(a)); w.push(wt); }
  v.push(x, y1, z); w.push(1);
  for (let s = 0; s < n; s++) { const t = (s + 1) % n; idx.push(s, n + s, n + t, s, n + t, t, n + s, 2 * n, n + t); }
  return { positions: v, indices: idx, w };
}
// a banner sheet from rows [y, xLeft, xRight] (bottom → top), bowed in z by `bow` (a soft curve, so it shades);
// cut into bands at the given row indices → one part per band with its own slot. 2 triangles per row gap.
function banner(rows, bands, bow = 0.1) {
  const W = Math.max(...rows.map(r => r[2]));
  const vtx = ([y, xl, xr]) => [[xl, y, bow * Math.sin(Math.PI * xl / W)], [xr, y, bow * Math.sin(Math.PI * xr / W)]];
  return bands.map(([from, to, slot]) => {
    const v = [], idx = [], w = [];
    for (let i = from; i <= to; i++) for (const p of vtx(rows[i])) { v.push(...p); w.push((rows[i][0] - rows[0][0]) / (rows.at(-1)[0] - rows[0][0])); }
    for (let k = 0; k < to - from; k++) { const a = k * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    return P({ positions: v, indices: idx, w }, slot, slot);
  });
}
// a thin flat panel (one quad = 2 triangles) in the x–y plane, centred (x, y), at depth z
const panel = (x, y, z, w, h) => ({ positions: [x - w / 2, y - h / 2, z, x + w / 2, y - h / 2, z, x + w / 2, y + h / 2, z, x - w / 2, y + h / 2, z], indices: [0, 1, 2, 0, 2, 3], w: [0, 0, 1, 1] });
// a 4-sided pyramid roof (tent): base w × d at y0, apex h higher; each side is cut in 2 at its middle, and the
// 8 wedges take slots[i % slots.length] in turn (2 slots = the striped look). 8 triangles.
function tentRoof(w, d, y0, h, slots) {
  const c = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]], out = [];
  for (let k = 0; k < 4; k++) { const [ax, az] = c[k], [bx, bz] = c[(k + 1) % 4], mx = (ax + bx) / 2, mz = (az + bz) / 2;
    [[ax, az, mx, mz], [mx, mz, bx, bz]].forEach(([px, pz, qx, qz], j) =>
      out.push(P({ positions: [px, y0, pz, qx, y0, qz, 0, y0 + h, 0], indices: [0, 2, 1], w: [0, 0, 1] }, slots[(2 * k + j) % slots.length]))); }
  return out;
}

export const PIECES = {
  flag: {
    F1: { name: 'F1 · Feather flag', sub: 'tall blade, rounded top hooked over the pole', size: '0.75 × 3.4 m',
      slots: { pole: 'propSnow', body: 'accent', top: 'subAccent', stripe: 'propSnow', base: 'rock' },
      build() {
        const rows = [[0.45, 0, 0.5], [1.0, 0, 0.62], [1.6, 0, 0.7], [2.2, 0, 0.75], [2.7, 0, 0.75], [2.85, 0, 0.74], [2.95, 0, 0.73], [3.15, 0, 0.62], [3.32, 0.04, 0.42], [3.42, 0.12, 0.18]];
        return [P(pole(5, 0.025, 0, 3.42), 'pole'), P(box(0, 0.06, 0, 0.36, 0.12, 0.36), 'base'),
          ...banner(rows, [[0, 4, 'body'], [4, 6, 'stripe'], [6, 9, 'top']])];
      } },
    F2: { name: 'F2 · Teardrop flag', sub: 'rounded drop shape, wide at the top', size: '0.85 × 3.3 m',
      slots: { pole: 'propSnow', body: 'accent', top: 'subAccent', stripe: 'propSnow', base: 'rock' },
      build() {
        const rows = [[0.7, 0, 0.06], [1.1, 0, 0.36], [1.6, 0, 0.62], [2.1, 0, 0.8], [2.45, 0, 0.85], [2.6, 0, 0.84], [2.75, 0, 0.8], [3.0, 0.02, 0.66], [3.18, 0.08, 0.44], [3.3, 0.18, 0.2]];
        return [P(pole(5, 0.025, 0, 3.3), 'pole'), P(box(0, 0.06, 0, 0.36, 0.12, 0.36), 'base'),
          ...banner(rows, [[0, 4, 'body'], [4, 6, 'stripe'], [6, 9, 'top']])];
      } },
    F3: { name: 'F3 · Tall flag, three bands', sub: 'the beach-flag look: body + two stripes near the top', size: '0.7 × 3.6 m',
      slots: { pole: 'propSnow', body: 'accent', top: 'subAccent', stripe: 'propSnow', base: 'rock' },
      build() {
        const rows = [[0.45, 0, 0.45], [1.2, 0, 0.58], [2.0, 0, 0.66], [2.55, 0, 0.7], [2.7, 0, 0.7], [2.85, 0, 0.7], [3.0, 0, 0.69], [3.15, 0, 0.66], [3.38, 0.03, 0.5], [3.55, 0.12, 0.2]];
        return [P(pole(5, 0.025, 0, 3.55), 'pole'), P(box(0, 0.06, 0, 0.36, 0.12, 0.36), 'base'),
          ...banner(rows, [[0, 3, 'body'], [3, 4, 'top'], [4, 5, 'stripe'], [5, 6, 'top'], [6, 9, 'body']])];
      } },
  },
  tent: {
    T1: { name: 'T1 · Open pop-up tent', sub: 'canopy + valance, no walls', size: '3 × 3 m, 3.2 m tall',
      slots: { leg: 'propSnow', roof: 'accent', roof2: 'accent', valance: 'subAccent', wall: 'propSnow', cloth: 'accent' },
      build() { const out = [];
        for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]]) out.push(P(box(x, 1.1, z, 0.06, 2.2, 0.06), 'leg'));
        out.push(...tentRoof(3.1, 3.1, 2.25, 0.95, ['roof']));
        for (const [x, z, w, d] of [[0, 1.55, 3.1, 0.03], [0, -1.55, 3.1, 0.03], [1.55, 0, 0.03, 3.1], [-1.55, 0, 0.03, 3.1]]) out.push(P(box(x, 2.1, z, w, 0.3, d), 'valance'));
        return out; } },
    T2: { name: 'T2 · Tent with back wall + table', sub: 'like the event tent: back wall, a draped table', size: '3 × 3 m, 3.2 m tall',
      slots: { leg: 'propSnow', roof: 'accent', roof2: 'accent', valance: 'subAccent', wall: 'propSnow', cloth: 'accent' },
      build() { const out = PIECES.tent.T1.build();
        out.push(P(box(0, 1.1, -1.5, 3.0, 2.2, 0.03), 'wall'), P(box(0, 1.15, -1.48, 2.2, 0.35, 0.04), 'valance'));
        out.push(P(box(0, 0.38, 0.7, 1.8, 0.76, 0.75), 'cloth'), P(box(0, 0.4, 1.08, 1.0, 0.18, 0.02), 'wall'));
        return out; } },
    T3: { name: 'T3 · Striped tent + back wall + table', sub: 'roof panels alternate accent / white', size: '3 × 3 m, 3.2 m tall',
      slots: { leg: 'propSnow', roof: 'accent', roof2: 'propSnow', valance: 'subAccent', wall: 'propSnow', cloth: 'accent' },
      build() { const out = PIECES.tent.T2.build().filter(p => p.lo !== 'roof');
        out.push(...tentRoof(3.1, 3.1, 2.25, 0.95, ['roof', 'roof2']));
        return out; } },
  },
};
export const tris = parts => parts.reduce((n, p) => n + p.indices.length / 3, 0);
