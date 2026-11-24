// AP7i: the cow's placement rules and its little animation (DESIGN §8b "Big props: the cow", docs/art/cow/SPEC.md
// §4 / §5). Pure (no Three.js, no DOM, no Math.random), tested in tests/cow.test.js. A cow is a big prop
// (`{ id: 'cow', x, z, turn, scale, pose, pattern }` in scenery.bigProps): every big-prop rule holds (core/bigProps.js),
// plus the ones here. Looks only: no collider, no physics.
import { COW } from './config.js';
import { cowGroups, cowHeadPose, COW_LEGS } from './cowShape.js';

export const COW_ID = 'cow';
export const COW_KEYS = Object.freeze(['pose', 'pattern']);
const isCow = p => p?.id === COW_ID;

// The rules that need no biome set (validateHole, after the big-prop format): pose / pattern only on a cow, a known
// pose ('stand' | 'graze'), a known pattern (0, 1, 2), at most COW.maxPerHole cows. list = scenery.bigProps.
// → an error message or null
export function cowsFormatError(list) {
  if (!Array.isArray(list)) return null;
  let cows = 0;
  for (const [i, p] of list.entries()) {
    const where = `scenery.bigProps[${i}] (${p.id})`;
    if (!isCow(p)) {
      for (const k of COW_KEYS) if (p[k] !== undefined) return `${where}: "${k}" is only for a cow`;
      continue;
    }
    cows++;
    if (p.pose !== undefined && !COW.poses.includes(p.pose)) return `${where}.pose must be ${COW.poses.map(s => `'${s}'`).join(' or ')} (got ${JSON.stringify(p.pose)})`;
    if (p.pattern !== undefined && !(Number.isInteger(p.pattern) && p.pattern >= 0 && p.pattern < COW.patterns)) return `${where}.pattern must be 0–${COW.patterns - 1} (got ${JSON.stringify(p.pattern)})`;
  }
  if (cows > COW.maxPerHole) return `scenery.bigProps: ${cows} cows on the hole (at most ${COW.maxPerHole})`;
  return null;
}

// m from (x, z) to the segment a → b
export function toSegment(x, z, [ax, az], [bx, bz]) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
  return Math.hypot(ax + dx * t - x, az + dz * t - z);
}
// No cow pokes through a rail: every cow's footprint (radiusOf(p), m, the piece's radius × its drawn size) stays
// COW.fenceClear m from every fence leg. list = the big props, fences = scenery.fences (or a dev overlay's).
// → an error message or null
export function cowFenceError(list, fences, radiusOf) {
  if (!list?.length || !fences?.length) return null;
  for (const [i, p] of list.entries()) {
    if (!isCow(p)) continue;
    const r = radiusOf(p);
    for (const [j, f] of fences.entries()) for (let k = 1; k < f.points.length; k++) {
      const d = toSegment(p.x, p.z, f.points[k - 1], f.points[k]);
      if (d < r + COW.fenceClear) return `scenery.bigProps[${i}] (cow) at (${p.x}, ${p.z}): its footprint (${r.toFixed(1)} m) comes within ${COW.fenceClear} m of scenery.fences[${j}] (${f.id}) leg ${k} (it is ${d.toFixed(1)} m from it; needs ${(r + COW.fenceClear).toFixed(1)})`;
    }
  }
  return null;
}

// A small integer hash → [0, 1) (no Math.random: the same cow moves the same way on every visit)
export function hash01(a, b = 0) {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x7f4a7c15, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
// A cow's own seed, from its place in the list and its position, so no two cows move in step
export const cowSeed = (i, p) => (Math.round(p.x * 16) * 73856093) ^ (Math.round(p.z * 16) * 19349663) ^ ((i + 1) * 83492791);

const ease = x => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x))); // a sine ease 0 → 1
const SWISH_PEAK = 4 / (3 * Math.sqrt(3)); // the peak of sin(2πv)·sin(πv), so the swish reaches ±COW_SWISH

// The head's lift envelope (0 = grazing, 1 = lifted) at time s (s) in a cycle of `every` s: a sine rise over
// COW.liftEase s, held `hold` s, a sine fall
function liftAt(s, every, hold) {
  const r = COW.liftEase, h = Math.max(0, Math.min(hold, every - 2 * r)), u = ((s % every) + every) % every;
  if (u < r) return ease(u / r);
  if (u < r + h) return 1;
  if (u < 2 * r + h) return 1 - ease((u - r - h) / r);
  return 0;
}
// The tail's swing (rad about z) at time s: a quick swish of `time` s (an eased sin(2πv), ±amp), then a pause of
// pauseMin–pauseMax s (a new one every cycle, from the seed). Cycles of time + mid s, each swish starts o_k ≤ half
// into its cycle, so the gap between two swishes is mid − o_k + o_k+1 ∈ [pauseMin, pauseMax].
function swishAt(s, seed, amp, time, pauseMin, pauseMax) {
  const lo = Math.min(pauseMin, pauseMax), hi = Math.max(pauseMin, pauseMax), mid = (lo + hi) / 2, half = (hi - lo) / 2, C = time + mid;
  const u0 = s + hash01(seed, 1) * C, k = Math.floor(u0 / C), u = u0 - k * C - hash01(seed, k) * half;
  if (u < 0 || u > time) return 0;
  const v = u / time;
  return amp * Math.sin(2 * Math.PI * v) * Math.sin(Math.PI * v) / SWISH_PEAK;
}

// A cow's pose at time t (s): { pitch: the head's pitch (rad about x, + = nose down, the pose's own included),
// swish: the tail's swing (rad about z) }. cow = { pose, seed, rest (the rest pitch: cowRestPitch; default the pose's) }, T = TUNE (COW_*).
// Standing: a slow sine nod ±COW_NOD every COW_NOD_TIME s. Grazing: from the grazing pitch (the muzzle just above the
// grass) the head rises up to 2 × COW_MUNCH and dips back (a sine munch every COW_MUNCH_TIME s; never lower than the
// grazing pitch, so never into the grass); every ~COW_LIFT_EVERY s (× 0.8–1.2 per cow) it lifts COW_LIFT rad for
// COW_LIFT_HOLD s. Every cow has its own phase. COW_SPEED = × the time (0 = still).
export function cowMotion(t, cow, T) {
  const s = t * T.COW_SPEED, seed = cow.seed, phase = hash01(seed, 7);
  let pitch;
  if (cow.pose === 'graze') {
    const munch = T.COW_MUNCH * (1 + Math.cos(2 * Math.PI * (s / T.COW_MUNCH_TIME + phase)));
    const every = T.COW_LIFT_EVERY * (0.8 + 0.4 * hash01(seed, 3)), e = liftAt(s + hash01(seed, 5) * every, every, T.COW_LIFT_HOLD);
    pitch = (cow.rest ?? COW.graze.pitch) - munch * (1 - e) - T.COW_LIFT * e;
  } else pitch = (cow.rest ?? 0) + T.COW_NOD * Math.sin(2 * Math.PI * (s / T.COW_NOD_TIME + phase));
  return { pitch, swish: swishAt(s, seed, T.COW_SWISH, T.COW_SWISH_TIME, T.COW_PAUSE_MIN, T.COW_PAUSE_MAX) };
}

// A point of cow space (m, before the scale) → the world, for a cow placed at { x, y, z, turn, scale }
const toWorld = (p, cx, cy, cz) => {
  const c = Math.cos(p.turn), sn = Math.sin(p.turn), a = cx * p.scale, b = cy * p.scale, d = cz * p.scale;
  return [p.x + a * c + d * sn, p.y + b, p.z - a * sn + d * c];
};
// A cow stands on its hooves: y = the lowest ground under its 4 hooves (none floats; on a slope the uphill hooves sink
// a little into the grass, never the body). p = { x, z, turn, scale (the drawn size) } → y
export function cowGroundY(p, heightAt) {
  let y = Infinity;
  for (const [hx, hz] of COW_LEGS) { const [x, , z] = toWorld({ ...p, y: 0 }, hx, 0, hz); y = Math.min(y, heightAt(x, z)); }
  return y;
}
// The head's rest pitch for a placed cow (rad, + = nose down). Grazing: the pose's own, raised COW.graze.liftStep at
// a time (at most COW.graze.maxLift) until every low point of the head is COW.graze.clear m above the ground under
// it, so on a slope the muzzle still sits just above the grass, never in it. Standing: 0.
// p = { x, y, z, turn, scale (the drawn size), pose }
export function cowRestPitch(p, heightAt) {
  const { pivot, pitch } = cowHeadPose(p.pose);
  if (p.pose !== 'graze') return pitch;
  const g = cowGroups().groups.head, low = [];
  const at = (i, a) => { const hy = g.positions[i + 1], hz = g.positions[i + 2], c = Math.cos(a), sn = Math.sin(a); return [g.positions[i] + pivot[0], hy * c - hz * sn + pivot[1], hy * sn + hz * c + pivot[2]]; };
  for (let i = 0; i < g.positions.length; i += 3) if (at(i, pitch)[1] < COW.graze.lowBand) low.push(i);
  for (let k = 0; k * COW.graze.liftStep <= COW.graze.maxLift + 1e-9; k++) {
    const a = pitch - k * COW.graze.liftStep;
    if (low.every(i => { const [x, y, z] = toWorld(p, ...at(i, a)); return y >= heightAt(x, z) + COW.graze.clear; })) return a;
  }
  return pitch - COW.graze.maxLift;
}
