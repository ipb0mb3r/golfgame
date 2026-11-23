// AP7f: the shapes of the fence looks (DESIGN §8b "Fences", the artist's owner-approved spec docs/art/fence/SPEC.md).
// Pure (no Three.js, no DOM), tested in tests/fences.test.js. The numbers are the artist's reference geometry
// (docs/art/fence/pieces.js: FENCES.A → railFence, FENCES.I2 → ropeFence), tidied: same parts, same sizes, same
// triangle counts (36 / 63 per segment).
// A look has two draw parts, each built ONCE and repeated along the line (core/fences.js layFence):
//   post = one post, its foot centre at the origin (y up), repeated at every post spot
//   span = what hangs between two posts, along +x from x = 0 to x = 1 (stretched to the span's length; each
//          vertex's y is sheared between the two posts' ground heights so the rails follow the slope)
// A part is { positions, indices, w, lo: [slot per vertex], hi: [slot per vertex] } (core/bigPropShapes.js merge):
// a vertex's colour = mix(slot lo, slot hi, w) (sRGB). Metres at 1× (× FENCE_SCALE in game).
import { merge } from './bigPropShapes.js';

const TAU = Math.PI * 2;
const P = (p, lo, hi = lo) => ({ ...p, lo, hi });
// a box centred at (x, y, z), w × h × d: 12 triangles (dark at the foot, light on top)
const BOX_INDICES = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5];
function box(x, y, z, w, h, d) {
  const v = [];
  for (const [a, b, c] of [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]) v.push(x + a * w / 2, y + b * h / 2, z + c * d / 2);
  return { positions: v, indices: BOX_INDICES, w: [0, 0, 1, 1, 0, 0, 1, 1] };
}
// an n-sided post from y0 (radius r0) to y1 (r1), twisted, its top leaning by [dx, dz], a low point on top: 3n triangles
function prism(n, r0, r1, y0, y1, twist = 0, lean = [0, 0]) {
  const v = [], idx = [], w = [];
  for (let s = 0; s < n; s++) { const a = s / n * TAU + twist; v.push(r0 * Math.cos(a), y0, r0 * Math.sin(a)); w.push(0); }
  for (let s = 0; s < n; s++) { const a = s / n * TAU + twist; v.push(r1 * Math.cos(a) + lean[0], y1, r1 * Math.sin(a) + lean[1]); w.push(1); }
  v.push(lean[0], y1 + r1 * 0.35, lean[1]); w.push(1);
  for (let s = 0; s < n; s++) { const t = (s + 1) % n; idx.push(s, n + s, n + t, s, n + t, t, n + s, 2 * n, n + t); }
  return { positions: v, indices: idx, w };
}
// a rope from x = 0 to 1 at height y, sagging s m at mid-span, a 3-sided tube of radius r in n pieces: 6n triangles
function rope(y, s, r, n = 4) {
  const v = [], idx = [], w = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, yy = y - s * 4 * t * (1 - t);
    for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + Math.PI / 2; v.push(t, yy + r * Math.sin(a), r * Math.cos(a)); w.push(k === 0 ? 1 : 0.4); }
  }
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { const a = i * 3 + k, b = i * 3 + (k + 1) % 3; idx.push(a, a + 3, b + 3, a, b + 3, b); }
  return { positions: v, indices: idx, w };
}

// spacing = m between posts at 1× (no further apart); spin = each post turned by 1.3 rad more than the last
// (the driftwood look; deterministic, no random draw)
const LOOKS = {
  // A · square posts 0.16 × 1.2 m, two flat rails (0.14 × 0.06 m) at 0.45 and 0.95 m on the posts' front face
  railFence: {
    spacing: 3, spin: false,
    post: () => [P(box(0, 0.6, 0, 0.16, 1.2, 0.16), 'post', 'postTop')],
    span: () => [0.45, 0.95].map(y => P(box(0.5, y, 0.1, 1.04, 0.14, 0.06), 'rail', 'railTop')),
  },
  // I2 · 5-sided driftwood posts (r 0.09 → 0.06, 1.0 m, leaning), two ropes (r 3 cm) at 0.85 / 0.45 m sagging 0.20 / 0.14 m
  ropeFence: {
    spacing: 2.6, spin: true,
    post: () => [P(prism(5, 0.09, 0.06, 0, 1.0, 0.7, [0.03, 0.02]), 'post', 'postTop')],
    span: () => [P(rope(0.85, 0.2, 0.03), 'rope', 'ropeTop'), P(rope(0.45, 0.14, 0.03), 'rope', 'ropeTop')],
  },
};
export const FENCE_PIECES = Object.freeze(Object.keys(LOOKS));

// → { post, span (merged parts), spacing, spin, tris (one segment: a post + a span), halfWidth (m at 1×: how far
// the look reaches sideways from its line, the posts' farthest point from their axis or a rail's / rope's
// farthest from the line; the OB rule adds it), height (m at 1×) }. Built once.
const cache = new Map();
export function fenceShape(id) {
  if (!LOOKS[id]) throw new Error(`no fence shape "${id}" (core/fenceShapes.js)`);
  if (!cache.has(id)) {
    const look = LOOKS[id], post = merge(look.post()), span = merge(look.span());
    let halfWidth = 0, height = 0;
    for (let i = 0; i < post.positions.length; i += 3) { halfWidth = Math.max(halfWidth, Math.hypot(post.positions[i], post.positions[i + 2])); height = Math.max(height, post.positions[i + 1]); }
    for (let i = 0; i < span.positions.length; i += 3) { halfWidth = Math.max(halfWidth, Math.abs(span.positions[i + 2])); height = Math.max(height, span.positions[i + 1]); }
    cache.set(id, Object.freeze({ post, span, spacing: look.spacing, spin: look.spin, tris: post.tris + span.tris, halfWidth, height }));
  }
  return cache.get(id);
}
