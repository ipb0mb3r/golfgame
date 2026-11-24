// AP7i: the cow (DESIGN §8b "Big props: the cow", the artist's owner-approved spec docs/art/cow/SPEC.md, PR #147).
// Pure (no Three.js, no DOM), tested in tests/cow.test.js. The numbers are the artist's reference geometry
// (docs/art/cow/pieces.js, look C: the big-head cow with a red strap and a yellow bell), tidied: the same vertices,
// the same triangles (624: body 240, head 352, tail 32), the same three patch layouts.
// A cow is three part GROUPS, each drawn about its own pivot so the head can bob and the tail swish:
//   body: the ball body + 4 legs with hooves, in cow space (still);
//   head: neck blob, head, muzzle, eyes, nostrils, ears, horns, strap + bell, in head space (the neck pivot at the
//     origin, the face toward +z); placed at COW.pivot[pose] and pitched about x (+ = nose down);
//   tail: the tail and its tuft, in tail space (the tail root at the origin, hanging down −y); placed at COW.tailRoot,
//     tipped COW.tailTip about x, swished about z.
// The black patches are PAINTED on the body's and the head's own faces (every face has its own 3 vertices, w = 0 coat
// / 1 patch), so the 3 layouts are the same vertices with a different `w`: a group is
//   { positions, indices, lo: [slot per vertex], hi: [slot per vertex], ws: [w of layout 0, 1, 2], tris }
// a vertex's colour = mix(slot lo, slot hi, ws[pattern][i]). Metres, y up, the feet centre at the origin, the nose
// facing +z (like every big prop: turn 0 = the front faces +z).
import { COW } from './config.js';

const TAU = Math.PI * 2;
// a part with its colour slots (lo → hi along w)
const P = (p, lo, hi = lo) => ({ ...p, lo, hi });
// a part turned about x (rx), then z (rz), then y (ry), then moved (the reference's xf)
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
// a low-poly ellipsoid, n around × m bands: 2n(m − 1) triangles, every face with its own 3 vertices (one flat colour).
// paints = [paint(dx, dy, dz) → 0 | 1] per layout (dir = the face centre on the unit sphere, +z = front) → ws per layout
function blob(cx, cy, cz, rx, ry, rz, n, m, paints = [() => 0]) {
  const pt = (i, j) => { const th = j / m * Math.PI, ph = i / n * TAU; return [Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph)]; };
  const v = [], idx = [], ws = paints.map(() => []);
  const face = (a, b, c) => {
    const d = [0, 1, 2].map(k => (a[k] + b[k] + c[k]) / 3), l = Math.hypot(...d) || 1;
    const f = paints.map(paint => paint(d[0] / l, d[1] / l, d[2] / l));
    for (const q of [a, b, c]) { idx.push(v.length / 3); v.push(cx + q[0] * rx, cy + q[1] * ry, cz + q[2] * rz); f.forEach((w, k) => ws[k].push(w)); }
  };
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
    const a = pt(i, j), b = pt(i + 1, j), c = pt(i, j + 1), d = pt(i + 1, j + 1);
    if (j > 0) face(a, c, b);
    if (j < m - 1) face(b, c, d);
  }
  return { positions: v, indices: idx, ws };
}
// an n-sided post from (x0, y0, z0) up to (x1, y1, z1), radius r0 → r1, closed top: 3n triangles
function limb(n, r0, r1, [x0, y0, z0], [x1, y1, z1]) {
  const v = [], idx = [], w = [];
  for (let s = 0; s < n; s++) { const a = s / n * TAU; v.push(x0 + r0 * Math.cos(a), y0, z0 + r0 * Math.sin(a)); w.push(0); }
  for (let s = 0; s < n; s++) { const a = s / n * TAU; v.push(x1 + r1 * Math.cos(a), y1, z1 + r1 * Math.sin(a)); w.push(1); }
  v.push(x1, y1 + r1 * 0.3, z1); w.push(1);
  for (let s = 0; s < n; s++) { const t = (s + 1) % n; idx.push(s, n + t, n + s, s, t, n + t, n + s, n + t, 2 * n); }
  return { positions: v, indices: idx, ws: [w] };
}
// a horn / the bell: an n-sided cone from a base at the origin, length L, pointing along +y: n triangles
function cone(n, r, L) {
  const v = [], idx = [], w = [];
  for (let s = 0; s < n; s++) { const a = s / n * TAU; v.push(r * Math.cos(a), 0, r * Math.sin(a)); w.push(0); }
  v.push(0, L, 0); w.push(1);
  for (let s = 0; s < n; s++) idx.push(s, n, (s + 1) % n);
  return { positions: v, indices: idx, ws: [w] };
}
// patches: a face is black when its direction is within r (rad) of a patch centre [dx, dy, dz, r]
const patchy = list => (x, y, z) => (list.some(([a, b, c, r]) => Math.acos(Math.max(-1, Math.min(1, (a * x + b * y + c * z) / Math.hypot(a, b, c)))) < r) ? 1 : 0);
// the three patch layouts (the reference's PATCHES; a herd mixes them, each the same triangles)
export const COW_PATCHES = Object.freeze([
  { body: [[1, 0.5, 0.2, 0.62], [-1, 0.2, -0.5, 0.7], [0.2, 0.9, -0.8, 0.45], [-0.6, -0.1, 0.8, 0.4]], head: [[1, 0.6, 0.3, 0.7]] },
  { body: [[-1, 0.6, 0.4, 0.66], [1, -0.1, -0.6, 0.6], [0, 1, 0.1, 0.38], [0.9, 0.2, 0.9, 0.35]], head: [[-1, 0.5, 0.5, 0.75]] },
  { body: [[0.3, 0.7, -1, 0.75], [-1, 0.0, 0.3, 0.5], [1, 0.4, 0.6, 0.45]], head: [[0, 1, -0.2, 0.55]] },
]);
// look C's sizes (pieces.js LOOK.C): body ball, legs, head (in head space, from the neck pivot), horn length
const C = { body: { y: 0.9, rx: 0.64, ry: 0.58, rz: 0.74 }, leg: { h: 0.42, x: 0.32, z: 0.4, r: 0.14 },
  head: { y: 0.12, z: 0.34, rx: 0.48, ry: 0.42, rz: 0.42 }, horn: 0.22 };
// the 4 hooves' centres [x, z], cow space (a cow stands on them: core/cows.js cowGroundY)
export const COW_LEGS = Object.freeze([-1, 1].flatMap(sx => [-1, 1].map(sz => Object.freeze([sx * C.leg.x, sz * C.leg.z]))));
const bodyPaints = COW_PATCHES.map(p => patchy(p.body)), headPaints = COW_PATCHES.map(p => patchy(p.head));

// the body group (cow space): the ball with its painted patches, 4 hooves + legs
function bodyParts() {
  const B = C.body, L = C.leg, out = [P(blob(0, B.y, 0, B.rx, B.ry, B.rz, 12, 6, bodyPaints), 'coat', 'patch')];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * L.x, z = sz * L.z;
    out.push(P(limb(5, L.r * 1.08, L.r * 1.02, [x, 0, z], [x, 0.13, z]), 'patch'));          // hoof
    out.push(P(limb(5, L.r, L.r * 1.1, [x, 0.13, z], [x, L.h + 0.25, z]), 'coat'));          // leg (up into the body)
  }
  return out;
}
// the head group (head space: the neck pivot at the origin, the face toward +z)
function headParts() {
  const H = C.head, out = [];
  out.push(P(blob(0, -0.04, -0.06, H.rx * 0.72, H.ry * 0.8, 0.34, 8, 4), 'coat'));                 // neck: joins the head to the body in every pose
  out.push(P(blob(0, H.y, H.z, H.rx, H.ry, H.rz, 10, 5, headPaints), 'coat', 'patch'));
  const mz = H.z + H.rz * 0.82, my = H.y - H.ry * 0.38;                                          // the wide pink muzzle
  out.push(P(blob(0, my, mz, H.rx * 0.86, H.ry * 0.58, H.rz * 0.5, 8, 5), 'nose'));
  for (const sx of [-1, 1]) {
    out.push(P(blob(sx * H.rx * 0.46, H.y + H.ry * 0.3, H.z + H.rz * 0.86, 0.06, 0.08, 0.05, 5, 3), 'patch'));   // eye
    out.push(P(blob(sx * H.rx * 0.3, my + H.ry * 0.12, mz + H.rz * 0.47, 0.04, 0.05, 0.02, 4, 3), 'patch'));     // nostril
    out.push(P(xf(blob(0, 0, 0, 0.17, 0.065, 0.11, 6, 3, [(x, y, z) => (z > 0.3 ? 0 : 1)]),
      { x: sx * (H.rx + 0.08), y: H.y + H.ry * 0.25, z: H.z - 0.02, rz: sx * 0.35 }), 'nose', 'patch'));        // ear, pink in front
    out.push(P(xf(cone(5, 0.055, C.horn), { x: sx * H.rx * 0.5, y: H.y + H.ry * 0.82, z: H.z - 0.04, rz: -sx * 0.55 }), 'horn', 'hornTip'));
  }
  // a red strap round the neck and a yellow bell under the chin
  out.push(P(xf(limb(8, H.rx * 0.78, H.rx * 0.78, [0, -0.06, 0], [0, 0.06, 0]), { y: H.y - H.ry * 0.55, z: H.z * 0.45, rx: 0.5 }), 'strap'));
  out.push(P(xf(cone(6, 0.11, 0.17), { y: H.y - H.ry * 0.55 - 0.26, z: H.z * 0.45 + 0.17, rx: 0.5 }), 'bell'));
  return out;
}
// the tail group (tail space: the root at the origin): a thin 4-sided tail 0.62 m long, a dark tuft
const tailParts = () => [P(limb(4, 0.035, 0.035, [0, -0.62, -0.06], [0, 0, 0]), 'coat'), P(blob(0, -0.68, -0.07, 0.07, 0.12, 0.07, 5, 3), 'patch')];

// parts → one group { positions, indices, lo, hi, ws: [w per layout], tris } (a part painted once uses it in every layout)
function mergeGroup(parts) {
  const out = { positions: [], indices: [], lo: [], hi: [], ws: COW_PATCHES.map(() => []) };
  for (const p of parts) {
    const base = out.positions.length / 3, n = p.positions.length / 3;
    out.positions.push(...p.positions);
    for (const i of p.indices) out.indices.push(i + base);
    for (let i = 0; i < n; i++) { out.lo.push(p.lo); out.hi.push(p.hi); }
    out.ws.forEach((w, k) => w.push(...(p.ws[k] ?? p.ws[0])));
  }
  return { ...out, tris: out.indices.length / 3 };
}
// the tail root in cow space (the top of the rump)
const TAIL_ROOT = Object.freeze([0, C.body.y + C.body.ry * 0.45, -C.body.rz * 0.92]);

let cached = null;
// → { groups: { body, head, tail }, pivots: { stand, graze, tail }, tris } (built once)
export function cowGroups() {
  if (!cached) {
    const groups = { body: mergeGroup(bodyParts()), head: mergeGroup(headParts()), tail: mergeGroup(tailParts()) };
    cached = Object.freeze({ groups, tailRoot: TAIL_ROOT, tris: groups.body.tris + groups.head.tris + groups.tail.tris });
  }
  return cached;
}
// where the head sits for a pose: { pivot: [x, y, z] (the neck, cow space), pitch: rad (+ = nose down) }
export const cowHeadPose = pose => (pose === 'graze' ? { pivot: COW.graze.pivot, pitch: COW.graze.pitch } : { pivot: COW.stand.pivot, pitch: 0 });

// The whole cow assembled in cow space (like pieces.js build({ pose, pattern, bob, swish })), as big-prop draw parts
// { body, head, tail: { positions, indices, w, lo, hi } } (used for the footprint, the tests and the reference look).
export function cowAssembled({ pose = 'stand', pattern = 0, bob = 0, swish = 0 } = {}) {
  const { groups } = cowGroups(), { pivot, pitch } = cowHeadPose(pose);
  const one = (g, place) => ({ ...xf({ positions: g.positions }, place), indices: g.indices, w: g.ws[pattern], lo: g.lo, hi: g.hi, tris: g.tris });
  return {
    body: one(groups.body, {}),
    head: one(groups.head, { x: pivot[0], y: pivot[1], z: pivot[2], rx: pitch + bob }),
    tail: one(groups.tail, { x: TAIL_ROOT[0], y: TAIL_ROOT[1], z: TAIL_ROOT[2], rx: COW.tailTip, rz: swish }),
  };
}
