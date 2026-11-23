// AP7f: fences laid along a line (DESIGN §8b "Fences", the artist's owner-approved docs/art/fence/SPEC.md §4 / §7).
// Pure (no Three.js, no DOM), tested in tests/fences.test.js. A hole lists them in
// `scenery.fences: [{ id, points: [[x, z], …] }]` (optional: a hole with none is normal); the hole's biome set says
// which looks it offers (`fences`). One entry = one unbroken fence from the first point to the last, turning at every
// point in between (a gap or a gate = a new entry). Looks only: no collider, no physics, never in play.
import { FENCES, TUNABLES } from './config.js';
import { fenceShape, FENCE_PIECES } from './fenceShapes.js';
import { obBoxOf } from './bigProps.js';

export const FENCE_KEYS = Object.freeze(['id', 'points']);
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const pickId = p => (typeof p === 'string' ? p : p?.id);
const legs = points => points.slice(1).map((b, i) => [points[i], b]);
const legLength = ([[ax, az], [bx, bz]]) => Math.hypot(bx - ax, bz - az);
export const fenceLength = points => legs(points).reduce((n, l) => n + legLength(l), 0);

// The format of a hole's scenery.fences (validateHole): → an error message or null
export function fencesFormatError(list) {
  if (list === undefined) return null;
  if (!Array.isArray(list)) return 'scenery.fences must be a list of { id, points: [[x, z], …] }';
  for (const [i, f] of list.entries()) {
    const where = `scenery.fences[${i}]`;
    if (!f || typeof f !== 'object' || typeof f.id !== 'string' || !f.id) return `${where} must be { id, points: [[x, z], …] } with a fence id`;
    for (const k of Object.keys(f)) if (!FENCE_KEYS.includes(k)) return `${where} (${f.id}) has an unknown key "${k}" (known: ${FENCE_KEYS.join(', ')})`;
    if (!Array.isArray(f.points) || f.points.length < 2) return `${where} (${f.id}).points must list at least 2 points [x, z] (got ${Array.isArray(f.points) ? f.points.length : JSON.stringify(f.points)})`;
    for (const [j, p] of f.points.entries()) if (!Array.isArray(p) || p.length !== 2 || !p.every(isNum)) return `${where} (${f.id}).points[${j}] must be [x, z] (two numbers; got ${JSON.stringify(p)})`;
  }
  return null;
}

// m from the segment a → b to the box { x0, x1, z0, z1 } (0 when it crosses or touches it)
export function segmentToBox([ax, az], [bx, bz], box) {
  // does the segment cross the box? (Liang–Barsky clip)
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dz = bz - az;
  const clip = (p, q) => { if (p === 0) return q >= 0; const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } return true; };
  if (clip(-dx, ax - box.x0) && clip(dx, box.x1 - ax) && clip(-dz, az - box.z0) && clip(dz, box.z1 - az)) return 0;
  const toBox = (x, z) => Math.hypot(Math.max(box.x0 - x, 0, x - box.x1), Math.max(box.z0 - z, 0, z - box.z1));
  const toSeg = (x, z) => { const l2 = dx * dx + dz * dz, t = l2 ? Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / l2)) : 0; return Math.hypot(ax + dx * t - x, az + dz * t - z); };
  return Math.min(toBox(ax, az), toBox(bx, bz), ...[[box.x0, box.z0], [box.x1, box.z0], [box.x1, box.z1], [box.x0, box.z1]].map(([x, z]) => toSeg(x, z)));
}

// The placement rules that need no biome set (validateHole): every id is a fence look, every leg is at least
// FENCES.minLeg long and stays FENCES.obClear m (+ the look's half thickness at `scale`) outside the OB stakes' box,
// and the hole has at most FENCES.maxLength m of fence. scale = FENCE_SCALE (the static check uses the default).
// list = the fences (the hole's scenery.fences, or a dev overlay). → an error message or null.
export function fencesError(hole, list, scale = TUNABLES.FENCE_SCALE.def) {
  if (!list?.length) return null;
  const box = obBoxOf(hole.scenery.stakes);
  let total = 0;
  for (const [i, f] of list.entries()) {
    const where = `scenery.fences[${i}] (${f.id})`;
    if (!FENCE_PIECES.includes(f.id)) return `${where} is not a fence look (the library's fences: ${FENCE_PIECES.join(', ')})`;
    const need = FENCES.obClear + fenceShape(f.id).halfWidth * scale;
    for (const [j, leg] of legs(f.points).entries()) {
      const L = legLength(leg), at = `${where} leg ${j + 1} (${leg[0].join(', ')}) → (${leg[1].join(', ')})`;
      if (L < FENCES.minLeg) return `${at} is ${L.toFixed(2)} m long (at least ${FENCES.minLeg} m)`;
      const d = segmentToBox(leg[0], leg[1], box);
      if (d < need) return `${at} comes ${d.toFixed(2)} m from the OB box (it must stay ${need.toFixed(2)} m outside: OB + ${FENCES.obClear} m and the fence's half thickness)`;
      total += L;
    }
  }
  if (total > FENCES.maxLength) return `scenery.fences: ${total.toFixed(0)} m of fence on the hole (at most ${FENCES.maxLength} m)`;
  return null;
}

// The rule that needs the set (src/holes/sets.js checkHoleLooks): every look is in the set's `fences` list.
export function fencesSetError(list, set) {
  if (!list?.length) return null;
  const offered = (set.fences ?? []).map(pickId);
  for (const [i, f] of list.entries()) if (!offered.includes(f.id)) return `scenery.fences[${i}] (${f.id}): biome set "${set.id}" does not offer it (its fences: ${offered.join(', ') || 'none'})`;
  return null;
}

// The post spots of a line (SPEC §4 "Posts", the artist's layFence): a post on every point, and each leg cut into
// equal spans no longer than spacing m. → [[x, z], …]
export function postSpots(points, spacing) {
  const spots = [];
  legs(points).forEach(([[ax, az], [bx, bz]], i) => {
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / spacing));
    for (let k = i ? 1 : 0; k <= n; k++) spots.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
  });
  return spots;
}

// One fence laid on the ground (the artist's layFence): every post at its spot, scaled, turned along the line (the
// mean of its two legs; a spin look turns each post 1.3 rad more), standing FENCES.sink m into the ground at its spot;
// every span stretched from post to post, its heights sheared between the two posts' ground (so the rails follow the
// slope and meet both posts) and sunk like the posts. Spans and post spacing grow with `scale` (FENCE_SCALE).
// heightAt(x, z) = the drawn ground. → { positions, indices, w, lo, hi (one merged part, world space), posts, spans, tris }
export function layFence(id, points, heightAt, scale) {
  const shape = fenceShape(id), spots = postSpots(points, shape.spacing * scale), ground = spots.map(([x, z]) => heightAt(x, z) - FENCES.sink);
  const out = { positions: [], indices: [], w: [], lo: [], hi: [] };
  const add = (part, place) => {
    const base = out.positions.length / 3;
    for (let j = 0; j < part.positions.length; j += 3) out.positions.push(...place(part.positions[j], part.positions[j + 1], part.positions[j + 2]));
    for (const k of part.indices) out.indices.push(k + base);
    out.w.push(...part.w); out.lo.push(...part.lo); out.hi.push(...part.hi);
  };
  spots.forEach(([x, z], i) => {
    const a = spots[Math.max(0, i - 1)], b = spots[Math.min(spots.length - 1, i + 1)];
    const ry = -Math.atan2(b[1] - a[1], b[0] - a[0]) + (shape.spin ? i * 1.3 : 0), c = Math.cos(ry), s = Math.sin(ry), y = ground[i];
    add(shape.post, (px, py, pz) => [x + (px * c + pz * s) * scale, y + py * scale, z + (-px * s + pz * c) * scale]);
  });
  for (let i = 0; i + 1 < spots.length; i++) {
    const [ax, az] = spots[i], [bx, bz] = spots[i + 1], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, ha = ground[i], hb = ground[i + 1];
    add(shape.span, (t, py, pz) => { const lx = t * L, lz = pz * scale; return [ax + lx * ux - lz * uz, py * scale + ha + (hb - ha) * Math.min(1, Math.max(0, t)), az + lx * uz + lz * ux]; });
  }
  return { ...out, posts: spots.length, spans: spots.length - 1, tris: out.indices.length / 3 };
}

// Where no scenery tree may stand: within `clear` m of any leg (SPEC §7.5). (x, z) → true when a tree may stand
// there; null when there are no fences.
export function fencesClear(list, clear) {
  if (!list.length) return null;
  const all = list.flatMap(f => legs(f.points));
  return (x, z) => all.every(([[ax, az], [bx, bz]]) => {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
    return Math.hypot(ax + dx * t - x, az + dz * t - z) > clear;
  });
}
