// AP7a: the gradient tree pieces (DESIGN §8b, ART_STYLE §1.1): pineTree, spruceTree, palmTree,
// roundCanopy, birchTree. Pure: no Three.js, no DOM (coding rule 1); src/game/scene.js turns these
// arrays into instanced meshes. A tree = two parts in UNIT spaces (config TREE_LOOK), so an in-play
// tree is fitted to its collider by the same matrices as roundTree (the look only: the collisions stay
// the hole's):
//   trunk  in the trunk cylinder's space: radius 1, from y 0 (its foot) to 1 (the trunk top)
//   canopy in the canopy ellipsoid's space: radius 1 across, y −1 → 1 (centred on the trunk top)
// A part = { positions: [x, y, z, ...], indices: [...], w: [weight per vertex] }. Canopy w = the vertical
// gradient (0 leafLow → 0.5 leaf → 1 leafTop, gradientHex); trunk w = 0 the trunk colour, 1 the bark mark.
import { TREE_LOOK, TREE_FAR } from './config.js';
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

// AP7b: the round canopy's lobes stacked for a collider `aspect` tall (its half-height / radius, config
// TREE_LOOK.roundCanopy.stack): built round in the collider's proportions (in canopy radii, y −aspect →
// aspect), then squeezed into the unit canopy space (y ÷ aspect), so the instance's scale makes them
// round again instead of stretching one shape into an egg. A taller collider gets more rings.
function stackedLobes(L, aspect) {
  const S = L.stack, a = aspect, sq = L.squat, out = [];
  const ring = ([n, r, radial, segs, rows], y, turn, q = sq) => { // (each lobe a little up or down: no flat layers)
    for (let i = 0; i < n; i++) { const t = turn + (i / n) * TAU, dy = n > 1 ? S.jitter * (0.5 + 0.5 * Math.sin(2.4 * i + 3 * turn)) : 0; out.push([radial * Math.cos(t), y + dy, radial * Math.sin(t), r, r * q, segs, rows]); }
  };
  // AP7b (artist on #110): at most S.maxRows rows (no tower of blobs in a very tall collider). With
  // only the base ring and the dome, the lobes grow instead (the dome first, up to grow[1], then the base
  // lobes up to grow[0], pulled in to stay within S.reach), until the two rows overlap by S.overlap;
  // if they still can't, the dome grows a little taller (domeTall) and comes down to meet the base.
  const want = L.midRings ?? Math.max(0, Math.round((a - S.top[1] * sq - (-a + S.base[1] * sq * L.flat)) / S.step) - 1);
  const rings = Math.min(want, Math.max(0, (S.maxRows ?? Infinity) - 2)), grows = rings === 0 && !!S.grow;
  let base = S.base, top = S.top;
  if (grows) {
    const need = (2 * a + S.overlap) / (sq * (1 + L.flat)) - (base[1] + top[1]);
    if (need > 0) {
      const rt = Math.min(S.grow[1], top[1] + need), rb = Math.min(S.grow[0], base[1] + need - (rt - top[1]));
      top = [top[0], rt, ...top.slice(2)];
      base = [base[0], rb, Math.min(base[2], S.reach - rb), ...base.slice(3)];
    }
  }
  // (still short: the dome may be up to domeTall × as tall as wide, a hint of height, never an egg)
  const qt = grows ? Math.min(S.domeTall ?? sq, Math.max(sq, (2 * a + S.overlap - base[1] * sq * (1 + L.flat)) / (top[1] * (1 + L.flat)))) : sq;
  const yb = -a + base[1] * sq * L.flat; // the base bottoms on the floor, the dome's top at the top (or down on the base)
  const yt = grows ? Math.min(a - top[1] * qt, yb + base[1] * sq + top[1] * qt * L.flat - S.overlap) : a - top[1] * sq;
  const sp = (yt - yb) / (rings + 1);
  ring(base, yb, 0);
  for (let k = 1; k <= rings; k++) {
    const [n, rMax, ...rest] = S.mid;
    ring([n, Math.min(rMax, Math.max(S.midMin, sp * S.midFill)), ...rest], yb + sp * k, k * S.turn);
  }
  ring(top, yt, 0, qt);
  return out.map(([x, y, z, r, h, segs, rows]) => [x, y / a, z, r, h / a, segs, rows]);
}
const roundLobes = (L, aspect = L.aspect) => blobs({ ...L, blobs: stackedLobes(L, aspect) });
// The collider proportion an in-play tree of this piece is built for: the nearest of its `aspects`
// (canopy ry / rx), or null for a piece drawn the same in every collider (one shape, stretched)
export function canopyAspect(id, rx, ry) {
  const list = TREE_LOOK[id]?.aspects, a = ry / rx;
  return list ? list.reduce((b, x) => (Math.abs(x - a) < Math.abs(b - a) ? x : b)) : null;
}

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

// A frond: a strip from the centre out along angle a, arching up to `peak` then drooping to `end` (power
// `bend`), with a V section (the edges hang `droop` × width under the spine), tapering to a point.
// AP7b `curl` (the palm spec, docs/art/palm/SPEC.md): over the outer part the spine is pulled in and
// down (reach × (1 − curl·t²/4), height − curl·t³·0.35), so the crown reads as a round dome.
// 4 triangles per station band, 2 for the last.
function frond(F, a, steps) {
  const positions = [], indices = [], w = [], dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx, curl = F.curl ?? 0;
  const yAt = t => t < F.tp ? F.y0 + (F.peak - F.y0) * Math.sin((Math.PI / 2) * (t / F.tp)) : F.peak + (F.end - F.peak) * Math.pow((t - F.tp) / (1 - F.tp), F.bend ?? 1.6);
  for (let k = 0; k <= steps; k++) {
    const t = k / steps, d = t * F.reach * (1 - curl * t * t * 0.25), y = yAt(t) - curl * t ** 3 * 0.35, wd = F.width * Math.sin(Math.PI * (0.15 + 0.85 * t)) * (1 - t * 0.2);
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
// AP7b palm crown ("C + a little B", docs/art/palm/SPEC.md): a dome of wide, pointed fronds in two layers
// that arch up and curl down, a small round tuft over the cap where they meet. The crown is scaled across
// so its widest frond reaches `fit` of the canopy radius (the drawn leaves reach the collider's edge);
// its height stays as built (−0.57 … +0.70), made for a flat palm collider (TREE_LOOK.palmTree.collider).
function palmCrown(L) {
  const parts = [];
  for (const F of L.fronds) for (let i = 0; i < F.n; i++) parts.push(frond(F, F.turn + (i / F.n) * TAU, L.frondSteps ?? F.steps));
  const t = L.tuft, c = L.cap;
  if (t) parts.push(lathe([[0, t.h, 1], [t.r, t.h * 0.3, 0.8], [t.r * 0.8, 0, 0.6], [0, -0.1, 0.4]], t.segs));
  parts.push(lathe([[0, c.r, 0.7], [c.r, 0, 0.5], [0, -c.r * 1.5, 0.3]], c.segs));
  // the gradient runs over the crown's own height: the drooping tips leafLow, the tuft leafTop
  const crown = mergeParts(parts), b = partBounds(crown), k = L.fit ? L.fit / b.rMax : 1;
  crown.w = crown.w.map((_, i) => clamp01((crown.positions[i * 3 + 1] - b.y0) / (b.y1 - b.y0)));
  crown.positions = crown.positions.map((v, i) => (i % 3 === 1 ? v : v * k));
  return crown;
}

// AP7b palm collider rule (no "hitting air", owner: no blind shots). The crown is flat, so a palm must
// stand on a wide, flat canopy collider: its half-height / radius (canopyH / (2 × canopyR)) at most
// collider.maxAspect (the spec's 0.65 + slack). Returns the problem (a string) or null. In-play palms
// are drawn in their collider (palmCanopyRy); one in a collider this rule rejects keeps the spec's
// proportion (aspect), so a dev set on today's tall colliders still shows the right crown.
export function palmColliderError(o) {
  const C = TREE_LOOK.palmTree.collider, a = o.canopyH / (2 * o.canopyR);
  return a > C.maxAspect ? `a palm's canopy collider must be wide and flat: canopyH / (2 × canopyR) = ${a.toFixed(2)}, at most ${C.maxAspect} (palm spec ${C.aspect}: e.g. canopyH ${(2 * C.aspect * o.canopyR).toFixed(1)} for canopyR ${o.canopyR}); a taller collider lets the ball hit air above and under the crown` : null;
}
// The drawn half-height of a canopy (in play): the collider's, except a palm in a collider the rule
// rejects, drawn at the spec's proportion (look only: the collisions stay the collider's)
export const canopyDrawRy = (id, rx, ry) => {
  const C = TREE_LOOK[id]?.collider;
  return C && ry / rx > C.maxAspect ? C.aspect * rx : ry;
};

// The builders, by library id: (look, aspect?) → { trunk, canopy, doubleSide (the palm's fronds are seen
// from both sides) }. look = TREE_LOOK[id] (in play) or the same with its `lod` (scenery); aspect = the
// canopy collider's half-height / radius (only the round canopy uses it, AP7b).
const BUILD = {
  pineTree: L => ({ trunk: straightTrunk(L), canopy: tiered(L), doubleSide: false }),
  spruceTree: L => ({ trunk: straightTrunk(L), canopy: tiered(L), doubleSide: false }),
  palmTree: L => ({ trunk: palmTrunk(L), canopy: palmCrown(L), doubleSide: true }),
  roundCanopy: (L, aspect) => ({ trunk: straightTrunk(L), canopy: roundLobes(L, aspect), doubleSide: false }),
  birchTree: L => ({ trunk: birchTrunk(L), canopy: blobs(L), doubleSide: false }),
};
export const TREE_IDS = Object.keys(BUILD);
// One tree in play (fitted to its collider by the game); aspect: canopyAspect (default: the mountain's)
export const treeParts = (id, aspect) => BUILD[id](TREE_LOOK[id], aspect ?? undefined);

// A part moved by scale (sx, sy, sz) then lifted by y (to place the unit parts at a tree's size)
const placed = (p, sx, sy, sz, y) => ({ ...p, positions: p.positions.map((v, i) => (i % 3 === 0 ? v * sx : i % 3 === 1 ? v * sy + y : v * sz)) });
// A scenery tree (offTrees) as ONE part at its TREE_LOOK size, with the lighter `lod` (the trunk from
// y 0, as a collider would fit it), so the whole tree is one draw call. trunk = a per-vertex flag (true:
// a trunk vertex, its w the bark mark).
// far (AP7b): the piece's cheaper far version (TREE_LOOK[id].far over its lod), when it has one.
export function sceneryTree(id, far = false) {
  const L = TREE_LOOK[id], s = L.scenery, parts = BUILD[id]({ ...L, ...L.lod, ...(far ? L.far : {}) }, s.canopyH / (2 * s.canopyR));
  const trunk = placed(parts.trunk, s.trunkR, s.trunkH, s.trunkR, 0), canopy = placed(parts.canopy, s.canopyR, s.canopyH / 2, s.canopyR, s.trunkH);
  const merged = mergeParts([trunk, canopy]);
  return { ...merged, trunk: merged.w.map((_, i) => i < trunk.w.length), doubleSide: parts.doubleSide };
}

// AP7b: does this scenery spot get the far version? Its distance outside the course's box (the OB
// stakes' box: { xs } or { x }, z0, z1) is more than TREE_FAR.from, and the piece has a far version.
export function isFarTree(id, stakes, x, z) {
  if (!TREE_LOOK[id]?.far || !stakes) return false;
  const xs = stakes.xs ?? [-stakes.x, stakes.x], x0 = Math.min(...xs), x1 = Math.max(...xs);
  const z0 = Math.min(stakes.z0, stakes.z1), z1 = Math.max(stakes.z0, stakes.z1);
  return Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1)) > TREE_FAR.from;
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
