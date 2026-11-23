// Fence, artist reference geometry (docs/art/fence/SPEC.md). Pure: no Three.js, no DOM.
// Same part format as docs/art/big-props/pieces.js: { positions, indices, w, lo, hi }; a vertex colour =
// mix(slot lo, slot hi, w); the look's `slots` map slot → palette key. Metres, y up.
// A fence look has two kinds of part, each built ONCE and instanced along the line:
//   post()  → one post, its foot centre at the origin (repeated at every post spot)
//   span()  → what hangs between two posts, along +x from x = 0 to x = 1 (stretched to the span length;
//             each vertex's y is sheared between the two posts' ground heights, so rails follow the slope)
// layFence() is the reference for the engine: points → post spots → posts + spans.  — Agent: artist
const TAU = Math.PI * 2;
const P = (p, lo, hi = lo) => ({ ...p, lo, hi });
function xf(p, { x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0 } = {}) {
  const pos = [], cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx), cz = Math.cos(rz), sz = Math.sin(rz);
  for (let i = 0; i < p.positions.length; i += 3) {
    let a = p.positions[i], b = p.positions[i + 1], c = p.positions[i + 2];
    [b, c] = [b * cx - c * sx, b * sx + c * cx];
    [a, b] = [a * cz - b * sz, a * sz + b * cz];
    [a, c] = [a * cy + c * sy, -a * sy + c * cy];
    pos.push(a + x, b + y, c + z);
  }
  return { ...p, positions: pos };
}
// a box centred at (x, y, z), size w × h × d: 12 triangles
function box(x, y, z, w, h, d) {
  const v = [];
  for (const [a, b, c] of [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]) v.push(x + a * w / 2, y + b * h / 2, z + c * d / 2);
  return { positions: v, indices: [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5], w: [0, 0, 1, 1, 0, 0, 1, 1] };
}
// an n-sided post from y0 to y1, radius r0 → r1, closed top (n·3 − 2 … here: n sides × 2 + n top = 3n triangles)
function prism(n, r0, r1, y0, y1, twist = 0, lean = [0, 0]) {
  const v = [], idx = [], w = [];
  for (let s = 0; s < n; s++) { const a = s / n * TAU + twist; v.push(r0 * Math.cos(a), y0, r0 * Math.sin(a)); w.push(0); }
  for (let s = 0; s < n; s++) { const a = s / n * TAU + twist; v.push(r1 * Math.cos(a) + lean[0], y1, r1 * Math.sin(a) + lean[1]); w.push(1); }
  v.push(lean[0], y1 + r1 * 0.35, lean[1]); w.push(1);          // a low point on top (a rounded / cut top)
  for (let s = 0; s < n; s++) { const t = (s + 1) % n; idx.push(s, n + s, n + t, s, n + t, t, n + s, 2 * n, n + t); }
  return { positions: v, indices: idx, w };
}
// a split rail: a long 3-sided (wedge) beam along +x from x0 to x1, centred at (y, z), size s: 8 triangles
function wedge(x0, x1, y, z, s, roll = 0) {
  const v = [], w = [];
  for (const x of [x0, x1]) for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + roll + Math.PI / 2; v.push(x, y + s * Math.sin(a), z + s * Math.cos(a)); w.push(k === 0 ? 1 : 0.35); }
  return { positions: v, indices: [0, 1, 2, 3, 5, 4, 0, 3, 4, 0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 2, 3, 0], w };
}
// a sagging rope from x = 0 to 1 at height y, sag s (metres at mid-span), as a 3-sided tube of n pieces: 6n triangles
function rope(y, s, r, n = 4) {
  const v = [], idx = [], w = [];
  for (let i = 0; i <= n; i++) { const t = i / n, yy = y - s * 4 * t * (1 - t);
    for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + Math.PI / 2; v.push(t, yy + r * Math.sin(a), r * Math.cos(a)); w.push(k === 0 ? 1 : 0.4); } }
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { const a = i * 3 + k, b = i * 3 + (k + 1) % 3; idx.push(a, a + 3, b + 3, a, b + 3, b); }
  return { positions: v, indices: idx, w };
}

export const FENCES = {
  // ── split-rail wood: the owner's pick of style (2026-11-23); three ways to build it ──
  A: { name: 'A · Post & two rails', sub: 'square posts, two flat rails: tidy, paddock-like', spacing: 3, height: 1.1, home: 'meadow-day',
    slots: { post: 'trunk', postTop: 'wood', rail: 'trunk', railTop: 'wood' },
    post: () => [P(box(0, 0.6, 0, 0.16, 1.2, 0.16), 'post', 'postTop')],
    span: () => [0.45, 0.95].map(y => P(box(0.5, y, 0.1, 1.04, 0.14, 0.06), 'rail', 'railTop')) },
  B: { spin: true, name: 'B · Split rail, three rails', sub: 'rough 5-sided posts, three split (wedge) rails', spacing: 3, height: 1.15, home: 'meadow-day',
    slots: { post: 'trunk', postTop: 'wood', rail: 'trunk', railTop: 'wood' },
    post: () => [P(prism(5, 0.1, 0.085, 0, 1.2, 0.4), 'post', 'postTop')],
    span: () => [[0.32, 0.2], [0.68, -0.3], [1.02, 0.5]].map(([y, roll]) => P(wedge(-0.03, 1.03, y, 0.11, 0.075, roll), 'rail', 'railTop')) },
  C: { name: 'C · Zig-zag rail fence', sub: 'no posts: rails stacked in a zig-zag, crossed stakes at the joints', spacing: 3.2, height: 1.2, home: 'alpine-day', zig: 0.8,
    slots: { post: 'trunk', postTop: 'wood', rail: 'trunk', railTop: 'wood' },
    post: () => [P(xf(prism(4, 0.06, 0.05, 0, 1.45), { rz: 0.32 }), 'post', 'postTop'), P(xf(prism(4, 0.06, 0.05, 0, 1.45), { rz: -0.32 }), 'post', 'postTop')],
    span: () => [0.22, 0.5, 0.78, 1.06].map((y, i) => P(wedge(-0.12, 1.12, y, i % 2 ? 0.07 : -0.07, 0.075, i), 'rail', 'railTop')) },
  // ── Island: rope + driftwood (owner's pick) ──
  I: { spin: true, name: 'I · Driftwood & rope', sub: 'crooked pale posts, one sagging rope', spacing: 2.6, height: 0.9, home: 'island-day',
    slots: { post: 'trunk', postTop: 'bank', rope: 'lip', ropeTop: 'propSnow' },
    post: () => [P(prism(5, 0.09, 0.06, 0, 0.95, 0.7, [0.03, 0.02]), 'post', 'postTop')],
    span: () => [P(rope(0.78, 0.22, 0.03), 'rope', 'ropeTop')] },
  I2: { spin: true, name: 'I2 · Driftwood & two ropes', sub: 'the same posts, two sagging ropes', spacing: 2.6, height: 0.95, home: 'island-day',
    slots: { post: 'trunk', postTop: 'bank', rope: 'lip', ropeTop: 'propSnow' },
    post: () => [P(prism(5, 0.09, 0.06, 0, 1.0, 0.7, [0.03, 0.02]), 'post', 'postTop')],
    span: () => [P(rope(0.85, 0.2, 0.03), 'rope', 'ropeTop'), P(rope(0.45, 0.14, 0.03), 'rope', 'ropeTop')] },
};
export const tris = parts => parts.reduce((n, p) => n + p.indices.length / 3, 0);
export const perSegment = look => tris(look.post()) + tris(look.span());

// The placement reference. points: [[x, z], …] (a line, corners where it turns); ground(x, z) → height.
// Each leg is cut into equal spans no longer than look.spacing, so a post always stands on every corner and
// at both ends. A zig-zag look pushes every other post sideways by ±zig. Returns world-space parts.
export function layFence(look, points, ground = () => 0, scale = 1) {
  const spots = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const [ax, az] = points[i], [bx, bz] = points[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / (look.spacing * scale)));
    for (let k = i ? 1 : 0; k <= n; k++) spots.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
  }
  if (look.zig) for (let i = 0; i < spots.length; i++) {
    const a = spots[Math.max(0, i - 1)], b = spots[Math.min(spots.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    const s = (i % 2 ? 1 : -1) * look.zig * scale; spots[i] = [spots[i][0] - dz / l * s, spots[i][1] + dx / l * s];
  }
  const out = [], post = look.post(), span = look.span();
  spots.forEach(([x, z], i) => {
    const y = ground(x, z), a = spots[Math.max(0, i - 1)], b = spots[Math.min(spots.length - 1, i + 1)], ry = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (const p of post) out.push({ ...p, positions: xf({ positions: p.positions.map(v => v * scale) }, { x, y, z, ry: ry + (look.spin ? i * 1.3 : 0) }).positions });
  });
  for (let i = 0; i + 1 < spots.length; i++) {
    const [ax, az] = spots[i], [bx, bz] = spots[i + 1], L = Math.hypot(bx - ax, bz - az), ry = -Math.atan2(bz - az, bx - ax);
    const ha = ground(ax, az), hb = ground(bx, bz), c = Math.cos(ry), s = Math.sin(ry);
    for (const p of span) {
      const pos = [];
      for (let j = 0; j < p.positions.length; j += 3) {
        const t = p.positions[j], lx = t * L, ly = p.positions[j + 1] * scale + ha + (hb - ha) * Math.min(1, Math.max(0, t)), lz = p.positions[j + 2] * scale;
        pos.push(ax + lx * c + lz * s, ly, az - lx * s + lz * c);
      }
      out.push({ ...p, positions: pos });
    }
  }
  return { parts: out, posts: spots.length, spans: spots.length - 1 };
}
