// Cow, artist reference geometry (docs/art/cow/SPEC.md). Pure: no Three.js, no DOM.
// Same part format as docs/art/big-props/pieces.js: { positions, indices, w, lo, hi }; a vertex colour =
// mix(slot lo, slot hi, w); the look's `slots` map slot → palette key. Metres, y up, the feet centre at the
// origin, the nose facing +z. Each part has a `group`: 'body' (still), 'head' (turns about the neck pivot:
// grazing pose + head bob) or 'tail' (turns about the tail root: optional swish).
// The black patches are PAINTED ON THE BODY'S OWN FACES (each face has its own 3 vertices, w = 0 coat / 1 patch),
// so they cost no extra triangles and read as crisp low-poly patches.  — Agent: artist
const TAU = Math.PI * 2;
const P = (p, lo, hi = lo, group = 'body') => ({ ...p, lo, hi, group });
export function xf(p, { x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0 } = {}) {
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
// a low-poly ellipsoid, n around × m bands: 2n(m−1) triangles. paint(dx, dy, dz) → 0 / 1 per face (dir = face centre
// on the unit sphere, +z = front). Every face has its own vertices so it takes one flat colour.
function blob(cx, cy, cz, rx, ry, rz, n, m, paint = () => 0) {
  const pt = (i, j) => { const th = j / m * Math.PI, ph = i / n * TAU; return [Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph)]; };
  const v = [], idx = [], w = [];
  const face = (a, b, c) => {
    const d = [0, 1, 2].map(k => (a[k] + b[k] + c[k]) / 3), l = Math.hypot(...d) || 1, f = paint(d[0] / l, d[1] / l, d[2] / l);
    for (const q of [a, b, c]) { idx.push(v.length / 3); v.push(cx + q[0] * rx, cy + q[1] * ry, cz + q[2] * rz); w.push(f); }
  };
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
    const a = pt(i, j), b = pt(i + 1, j), c = pt(i, j + 1), d = pt(i + 1, j + 1);
    if (j > 0) face(a, c, b);
    if (j < m - 1) face(b, c, d);
  }
  return { positions: v, indices: idx, w };
}
// an n-sided post from (x0, y0, z0) up to (x1, y1, z1), radius r0 → r1, closed top: 3n triangles
function limb(n, r0, r1, [x0, y0, z0], [x1, y1, z1]) {
  const v = [], idx = [], w = [];
  for (let s = 0; s < n; s++) { const a = s / n * TAU; v.push(x0 + r0 * Math.cos(a), y0, z0 + r0 * Math.sin(a)); w.push(0); }
  for (let s = 0; s < n; s++) { const a = s / n * TAU; v.push(x1 + r1 * Math.cos(a), y1, z1 + r1 * Math.sin(a)); w.push(1); }
  v.push(x1, y1 + r1 * 0.3, z1); w.push(1);
  for (let s = 0; s < n; s++) { const t = (s + 1) % n; idx.push(s, n + t, n + s, s, t, n + t, n + s, n + t, 2 * n); }
  return { positions: v, indices: idx, w };
}
// a horn: an n-sided cone from a base at the origin, length L, pointing along +y; placed with xf: n triangles
const cone = (n, r, L) => { const v = [], idx = [], w = [];
  for (let s = 0; s < n; s++) { const a = s / n * TAU; v.push(r * Math.cos(a), 0, r * Math.sin(a)); w.push(0); }
  v.push(0, L, 0); w.push(1); for (let s = 0; s < n; s++) idx.push(s, n, (s + 1) % n); return { positions: v, indices: idx, w }; };
// patches: a face is black when its direction is within `r` (radians) of a patch centre [dx, dy, dz, r]
const patchy = list => (x, y, z) => list.some(([a, b, c, r]) => { const l = Math.hypot(a, b, c); return Math.acos(Math.max(-1, Math.min(1, (a * x + b * y + c * z) / l))) < r; }) ? 1 : 0;
// three patch layouts (a herd mixes them for variety; each one is the same triangles, so the same cost)
export const PATCHES = [
  { body: [[1, 0.5, 0.2, 0.62], [-1, 0.2, -0.5, 0.7], [0.2, 0.9, -0.8, 0.45], [-0.6, -0.1, 0.8, 0.4]], head: [[1, 0.6, 0.3, 0.7]] },
  { body: [[-1, 0.6, 0.4, 0.66], [1, -0.1, -0.6, 0.6], [0, 1, 0.1, 0.38], [0.9, 0.2, 0.9, 0.35]], head: [[-1, 0.5, 0.5, 0.75]] },
  { body: [[0.3, 0.7, -1, 0.75], [-1, 0.0, 0.3, 0.5], [1, 0.4, 0.6, 0.45]], head: [[0, 1, -0.2, 0.55]] },
];
// the head, built in head space: the neck pivot at the origin, the face toward +z
function head(o, pat) {
  const out = [], H = o.head;
  out.push(P(blob(0, -0.04, -0.06, H.rx * 0.72, H.ry * 0.8, 0.34, 8, 4), 'coat', 'coat', 'head'));                                 // neck: joins the head to the body in every pose
  out.push(P(blob(0, H.y, H.z, H.rx, H.ry, H.rz, 10, 5, patchy(pat.head)), 'coat', 'patch', 'head'));
  // the wide pink muzzle (the cartoon "smile" face), two dark nostrils painted on its front faces
  const mz = H.z + H.rz * 0.82, my = H.y - H.ry * 0.38;
  out.push(P(blob(0, my, mz, H.rx * 0.86, H.ry * 0.58, H.rz * 0.5, 8, 5), 'nose', 'nose', 'head'));
  for (const sx of [-1, 1]) {
    out.push(P(blob(sx * H.rx * 0.46, H.y + H.ry * 0.3, H.z + H.rz * 0.86, 0.06, 0.08, 0.05, 5, 3), 'patch', 'patch', 'head'));         // eye
    out.push(P(blob(sx * H.rx * 0.3, my + H.ry * 0.12, mz + H.rz * 0.47, 0.04, 0.05, 0.02, 4, 3), 'patch', 'patch', 'head'));           // nostril
    out.push(P(xf(blob(0, 0, 0, 0.17, 0.065, 0.11, 6, 3, (x, y, z) => (z > 0.3 ? 0 : 1)), { x: sx * (H.rx + 0.08), y: H.y + H.ry * 0.25, z: H.z - 0.02, rz: sx * 0.35 }), 'nose', 'patch', 'head')); // ear, pink in front
    out.push(P(xf(cone(5, 0.055, o.horn), { x: sx * H.rx * 0.5, y: H.y + H.ry * 0.82, z: H.z - 0.04, rz: -sx * 0.55 }), 'horn', 'hornTip', 'head'));        // horn
  }
  if (o.bell) {   // a red strap round the neck and a yellow bell under the chin
    out.push(P(xf(limb(8, H.rx * 0.78, H.rx * 0.78, [0, -0.06, 0], [0, 0.06, 0]), { y: H.y - H.ry * 0.55, z: H.z * 0.45, rx: 0.5 }), 'strap', 'strap', 'head'));
    out.push(P(xf(cone(6, 0.11, 0.17), { y: H.y - H.ry * 0.55 - 0.26, z: H.z * 0.45 + 0.17, rx: 0.5 }), 'bell', 'bell', 'head'));
  }
  return out;
}
const LOOK = {
  A: { name: 'A · Round toy cow', sub: 'a ball body, big round head, stubby legs', size: '1.9 m long, 1.5 m tall',
    body: { y: 0.92, rx: 0.66, ry: 0.6, rz: 0.78 }, leg: { h: 0.45, x: 0.34, z: 0.42, r: 0.14 }, neck: [0, 1.08, 0.62],
    head: { y: 0.08, z: 0.3, rx: 0.4, ry: 0.36, rz: 0.36 }, horn: 0.2 },
  B: { name: 'B · Barrel cow', sub: 'a longer barrel body, small head on a short neck', size: '2.2 m long, 1.5 m tall',
    body: { y: 0.98, rx: 0.56, ry: 0.5, rz: 0.98 }, leg: { h: 0.62, x: 0.3, z: 0.6, r: 0.12 }, neck: [0, 1.12, 0.9],
    head: { y: 0.06, z: 0.3, rx: 0.32, ry: 0.3, rz: 0.32 }, horn: 0.18, udder: true },
  C: { name: 'C · Big-head cow with a bell', sub: 'A\'s ball body, a bigger head, red strap + yellow bell', size: '2.0 m long, 1.6 m tall',
    body: { y: 0.9, rx: 0.64, ry: 0.58, rz: 0.74 }, leg: { h: 0.42, x: 0.32, z: 0.4, r: 0.14 }, neck: [0, 1.1, 0.6],
    head: { y: 0.12, z: 0.34, rx: 0.48, ry: 0.42, rz: 0.42 }, horn: 0.22, bell: true },
};
// pose: 'stand' or 'graze' (head down to the grass); bob: extra head pitch in radians (the head-bob animation)
function build(o, { pose = 'stand', pattern = 0, bob = 0, swish = 0 } = {}) {
  const pat = PATCHES[pattern % PATCHES.length], B = o.body, L = o.leg, out = [];
  out.push(P(blob(0, B.y, 0, B.rx, B.ry, B.rz, 12, 6, patchy(pat.body)), 'coat', 'patch'));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * L.x, z = sz * L.z;
    out.push(P(limb(5, L.r * 1.08, L.r * 1.02, [x, 0, z], [x, 0.13, z]), 'patch', 'patch'));                       // hoof
    out.push(P(limb(5, L.r, L.r * 1.1, [x, 0.13, z], [x, L.h + 0.25, z]), 'coat', 'coat'));                         // leg (up into the body)
  }
  if (o.udder) out.push(P(blob(0, B.y - B.ry * 0.85, -B.rz * 0.25, 0.2, 0.12, 0.2, 6, 4), 'nose', 'nose'));
  // tail: from the top of the rump down the back, a dark tuft at the end
  const tr = [0, B.y + B.ry * 0.45, -B.rz * 0.92];
  const tail = [P(limb(4, 0.035, 0.035, [0, -0.62, -0.06], [0, 0, 0]), 'coat', 'coat', 'tail'), P(blob(0, -0.68, -0.07, 0.07, 0.12, 0.07, 5, 3), 'patch', 'patch', 'tail')];
  for (const p of tail) out.push(xf(p, { x: tr[0], y: tr[1], z: tr[2], rx: -0.12, rz: swish }));
  // grazing: the neck drops and reaches forward, the head tips down until the muzzle is just above the grass
  const pitch = (pose === 'graze' ? 1.15 : 0) + bob;
  const [nx, ny, nz] = pose === 'graze' ? [o.neck[0], o.neck[1] - 0.42, o.neck[2] + 0.12] : o.neck;
  for (const p of head(o, pat)) out.push(xf(p, { x: nx, y: ny, z: nz, rx: pitch }));
  return out;
}
export const COWS = Object.fromEntries(Object.entries(LOOK).map(([k, o]) => [k, { ...o,
  slots: { coat: 'cowCoat', patch: 'cowPatch', nose: 'cowNose', horn: 'lip', hornTip: 'propSnow', strap: 'accent', bell: 'subAccent' },
  build: opt => build(o, opt) }]));
// the three new palette keys (SPEC §3). Same in every biome; Meadow is the only set with cows for now.
export const COW_KEYS = { cowCoat: '#f6f1e4', cowPatch: '#2f3134', cowNose: '#f1a39b' };
export const tris = parts => parts.reduce((n, p) => n + p.indices.length / 3, 0);
