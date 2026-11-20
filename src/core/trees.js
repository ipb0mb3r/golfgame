// AP7a: the gradient tree pieces (DESIGN §8b, ART_STYLE §1.1): pineTree, spruceTree, palmTree,
// roundCanopy, birchTree. Pure: no Three.js, no DOM (coding rule 1); src/game/scene.js turns these
// arrays into instanced meshes. A tree = two parts in UNIT spaces (config TREE_LOOK), so an in-play
// tree is fitted to its collider by the same matrices as roundTree (the look only: the collisions stay
// the hole's):
//   trunk  in the trunk cylinder's space: radius 1, from y 0 (its foot) to 1 (the trunk top)
//   canopy in the canopy ellipsoid's space: radius 1 across, y −1 → 1 (centred on the trunk top)
// A part = { positions: [x, y, z, ...], indices: [...], w: [weight per vertex] }. Canopy w = the vertical
// gradient (0 leafLow → 0.5 leaf → 1 leafTop, gradientHex); trunk w = 0 the trunk colour, 1 the bark mark.
import { TREE_LOOK } from './config.js';
import { mixHex } from './backdrop.js';

const TAU = Math.PI * 2;
const clamp01 = v => Math.min(1, Math.max(0, v));

// A surface of revolution about y. profile = [[r, y, w, wobble?], ...] from top to bottom; r 0 = a pole
// (one vertex); wobble = the ring's radius waves by ± that fraction (3 lobes). Faces point outward.
// Triangles: segs per pole–ring band, 2 × segs per ring–ring band.
export function lathe(profile, segs, twist = 0) {
  const positions = [], indices = [], w = [], rows = [];
  for (const [r, y, wt, wob = 0] of profile) {
    const start = positions.length / 3;
    if (r === 0) { positions.push(0, y, 0); w.push(wt); rows.push({ start, pole: true }); continue; }
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * TAU + twist, rr = r * (1 + wob * Math.sin(3 * a + 1.3 * twist));
      positions.push(rr * Math.cos(a), y, rr * Math.sin(a)); w.push(wt);
    }
    rows.push({ start, pole: false });
  }
  for (let k = 0; k + 1 < rows.length; k++) {
    const A = rows[k], B = rows[k + 1];
    for (let s = 0; s < segs; s++) {
      const s1 = (s + 1) % segs;
      if (A.pole) indices.push(A.start, B.start + s1, B.start + s);
      else if (B.pole) indices.push(A.start + s, A.start + s1, B.start);
      else indices.push(A.start + s, B.start + s1, B.start + s, A.start + s, A.start + s1, B.start + s1);
    }
  }
  return { positions, indices, w };
}

// Several parts as one (indices shifted)
export function mergeParts(parts) {
  const out = { positions: [], indices: [], w: [] };
  for (const p of parts) {
    const base = out.positions.length / 3;
    for (const v of p.positions) out.positions.push(v);
    for (const v of p.w) out.w.push(v);
    for (const i of p.indices) out.indices.push(i + base);
  }
  return out;
}

export const triangles = part => part.indices.length / 3;

// The gradient colour of weight w: leafLow (0) → leaf (0.5) → leafTop (1), mixed in sRGB like the mock-ups
export const gradientHex = (low, mid, top, w) => (w <= 0.5 ? mixHex(low, mid, clamp01(w * 2)) : mixHex(mid, top, clamp01(w * 2 - 1)));
// Canopy-space height → gradient weight (bottom 0, top 1)
const wAt = y => clamp01((y + 1) / 2);

// A plain tapered trunk (open: its top is inside the canopy, its foot under the ground)
const straightTrunk = L => lathe([[L.trunkTop, 1, 0], [1, 0, 0]], L.trunkSegs);

// A stacked tier: a pole on top, the rounded shoulder, the skirt edge, the drooping tip, a concave underside
function tier([yb, yt, R], L, twist) {
  const h = yt - yb, T = TREE_LOOK, prof = L.tierProfile ?? T.tierProfile, last = prof.length - 1;
  const outline = prof.map(([fr, fd], i) => {
    const y = yt - fd * h;
    return [fr * R, y, clamp01(wAt(y) - (i === last ? L.dark : 0)), i >= last - 1 ? L.wobble : L.wobble / 3];
  });
  const yu = yt - T.underside * h;
  return lathe([[0, yt, wAt(yt)], ...outline, [0, yu, clamp01(wAt(yu) - L.dark * 1.5)]], L.segs, twist);
}
const tiered = L => mergeParts(L.tiers.map((t, k) => tier(t, L, k * 2.1)));

// A low sphere at (x, y, z): radius r across, height h above its centre and h × flat below (a soft,
// flat-ish bottom); its weights follow the canopy height, its underside `dark` lower
function blob([x, y, z, r, h, segs, rows], L, twist) {
  const prof = [];
  for (let k = 0; k <= rows; k++) {
    const phi = (k / rows) * Math.PI, c = Math.cos(phi), yy = y + c * h * (c < 0 ? L.flat : 1);
    const wt = clamp01(wAt(yy) + (L.lift ?? 0) - (c < -0.2 ? L.dark : 0));
    prof.push([k === 0 || k === rows ? 0 : r * Math.sin(phi), yy, wt, 0.04]);
  }
  const p = lathe(prof, segs, twist);
  for (let i = 0; i < p.positions.length; i += 3) { p.positions[i] += x; p.positions[i + 2] += z; }
  return p;
}
// (scenery lod: segScale × the sides, rowsLess fewer rows, only the first blobCount lobes)
const blobs = L => mergeParts(L.blobs.slice(0, L.blobCount ?? L.blobs.length).map((b, k) => blob(L.segScale ? [...b.slice(0, 5), Math.max(5, Math.round(b[5] * L.segScale)), Math.max(4, b[6] - (L.rowsLess ?? 0))] : b, L, k * 1.7)));

// Birch trunk: a slim taper with dark bark bands (each band its own pair of rings, so the marks are crisp)
function birchTrunk(L) {
  const prof = [[L.trunkTop, 1, 0]];
  const rAt = y => 1 + (L.trunkTop - 1) * y;
  for (const [a, b] of [...L.marks].reverse()) prof.push([rAt(b), b, 0], [rAt(b), b, 1], [rAt(a), a, 1], [rAt(a), a, 0]);
  prof.push([1, 0, 0]);
  return lathe(prof, L.trunkSegs);
}

// Palm trunk: a bowed tube (x = bend × sin(π y), top and foot on the collider's axis); every other ring
// is a slimmer, darker groove (w 1 = the mark colour), the palm's ringed bark
function palmTrunk(L) {
  const positions = [], indices = [], w = [], n = L.trunkSegs;
  for (let k = 0; k <= L.rings; k++) {
    const t = k / L.rings, groove = k % 2 === 1, r = (1 + (L.trunkTop - 1) * t) * (groove ? 1 - L.ringBulge : 1), x = L.bend * Math.sin(Math.PI * t);
    for (let s = 0; s < n; s++) { const a = (s / n) * TAU; positions.push(x + r * Math.cos(a), t, r * Math.sin(a)); w.push(groove ? 0.6 : 0); }
  }
  for (let k = 0; k < L.rings; k++) for (let s = 0; s < n; s++) {
    const A = k * n, B = (k + 1) * n, s1 = (s + 1) % n; // A below, B above: the same outward winding as lathe's
    indices.push(B + s, A + s1, A + s, B + s, B + s1, A + s1);
  }
  return { positions, indices, w };
}

// A frond: a strip from the centre out along angle a, arching up to `peak` then drooping to `end`, with a
// V section (the edges hang `droop` × width under the spine), tapering to a point. 4 triangles per
// station band, 2 for the last.
function frond(F, a, steps) {
  const positions = [], indices = [], w = [], dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx;
  const yAt = t => t < F.tp ? F.y0 + (F.peak - F.y0) * Math.sin((Math.PI / 2) * (t / F.tp)) : F.peak + (F.end - F.peak) * Math.pow((t - F.tp) / (1 - F.tp), 1.6);
  for (let k = 0; k <= steps; k++) {
    const t = k / steps, d = t * F.reach, y = yAt(t), wd = F.width * Math.sin(Math.PI * (0.15 + 0.85 * t)) * (1 - t * 0.2);
    if (k === steps) { positions.push(d * dx, y, d * dz); w.push(wAt(y)); break; }
    for (const side of [-1, 0, 1]) {
      const off = side * wd, yy = y - (side ? F.droop * wd : 0);
      positions.push(d * dx + off * px, yy, d * dz + off * pz); w.push(clamp01(wAt(yy) + (side ? 0 : 0.08)));
    }
  }
  for (let k = 0; k < steps; k++) {
    const A = k * 3, B = (k + 1) * 3;
    if (k === steps - 1) { indices.push(A, A + 1, B, A + 1, A + 2, B); continue; }
    indices.push(A, A + 1, B + 1, A, B + 1, B, A + 1, A + 2, B + 2, A + 1, B + 2, B + 1);
  }
  return { positions, indices, w };
}
function palmCrown(L) {
  const parts = [];
  for (const F of L.fronds) for (let i = 0; i < F.n; i++) parts.push(frond(F, F.turn + (i / F.n) * TAU, L.frondSteps ?? F.steps));
  const c = L.cap;
  parts.push(lathe([[0, c.r, 0.7], [c.r, 0, 0.5], [0, -c.r * 1.5, 0.3]], c.segs));
  // the crown is flat (it keeps to the middle of its collider): its gradient runs over its own height,
  // the drooping tips leafLow, the top leafTop
  const crown = mergeParts(parts), b = partBounds(crown);
  crown.w = crown.w.map((_, i) => clamp01((crown.positions[i * 3 + 1] - b.y0) / (b.y1 - b.y0)));
  return crown;
}

// The builders, by library id: (look) → { trunk, canopy, doubleSide (the palm's fronds are seen from
// both sides) }. look = TREE_LOOK[id] (in play) or the same with its `lod` (scenery).
const BUILD = {
  pineTree: L => ({ trunk: straightTrunk(L), canopy: tiered(L), doubleSide: false }),
  spruceTree: L => ({ trunk: straightTrunk(L), canopy: tiered(L), doubleSide: false }),
  palmTree: L => ({ trunk: palmTrunk(L), canopy: palmCrown(L), doubleSide: true }),
  roundCanopy: L => ({ trunk: straightTrunk(L), canopy: blobs(L), doubleSide: false }),
  birchTree: L => ({ trunk: birchTrunk(L), canopy: blobs(L), doubleSide: false }),
};
export const TREE_IDS = Object.keys(BUILD);
// One tree in play (fitted to its collider by the game)
export const treeParts = id => BUILD[id](TREE_LOOK[id]);

// A part moved by scale (sx, sy, sz) then lifted by y (to place the unit parts at a tree's size)
const placed = (p, sx, sy, sz, y) => ({ ...p, positions: p.positions.map((v, i) => (i % 3 === 0 ? v * sx : i % 3 === 1 ? v * sy + y : v * sz)) });
// A scenery tree (offTrees) as ONE part at its TREE_LOOK size, with the lighter `lod` (the trunk from
// y 0, as a collider would fit it), so the whole tree is one draw call. trunk = a per-vertex flag (true:
// a trunk vertex, its w the bark mark).
export function sceneryTree(id) {
  const L = TREE_LOOK[id], parts = BUILD[id]({ ...L, ...L.lod }), s = L.scenery;
  const trunk = placed(parts.trunk, s.trunkR, s.trunkH, s.trunkR, 0), canopy = placed(parts.canopy, s.canopyR, s.canopyH / 2, s.canopyR, s.trunkH);
  const merged = mergeParts([trunk, canopy]);
  return { ...merged, trunk: merged.w.map((_, i) => i < trunk.w.length), doubleSide: parts.doubleSide };
}

// Per-vertex colours '#rrggbb' from a piece's slot colours ({ low, canopy, top, trunk, mark? }).
// isTrunk(i) → a trunk vertex: trunk → mark by its w.
export function treeColours(part, c, isTrunk = () => false) {
  const cache = new Map();
  return part.w.map((wt, i) => {
    const trunk = isTrunk(i), k = (trunk ? 'b' : 'l') + Math.round(wt * 64);
    if (!cache.has(k)) cache.set(k, trunk ? mixHex(c.trunk, c.mark ?? c.trunk, wt) : gradientHex(c.low, c.canopy, c.top, wt));
    return cache.get(k);
  });
}

// The extent of a part: { x0, x1, y0, y1, z0, z1, rMax (largest distance from the y axis) }
export function partBounds(p) {
  const b = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, z0: Infinity, z1: -Infinity, rMax: 0 };
  for (let i = 0; i < p.positions.length; i += 3) {
    const x = p.positions[i], y = p.positions[i + 1], z = p.positions[i + 2];
    b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y);
    b.z0 = Math.min(b.z0, z); b.z1 = Math.max(b.z1, z); b.rMax = Math.max(b.rMax, Math.hypot(x, z));
  }
  return b;
}
