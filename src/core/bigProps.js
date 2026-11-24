// AP7e: big props placed by hand (DESIGN §8b "Big props", docs/art/big-props/SPEC.md §4 / §6). Pure (no Three.js,
// no DOM), tested in tests/big-props.test.js. A hole lists them in `scenery.bigProps: [{ id, x, z, turn, scale }]`
// (optional: a hole with none is normal); the hole's biome set says which pieces it offers (`bigProps`). Looks only:
// no collider, no physics, never hidden by the small-props ball rule (they stand well beyond OB).
//   id = a library bigProps piece, x / z = the foot centre (m), turn = rad about y (0 = the front faces +z, toward
//   the tee end; like Three.js rotation.y), scale = the size (the piece's `scale` range in the library, default 1).
import { BIG_PROPS, TUNABLES } from './config.js';
import { bigPropShape } from './bigPropShapes.js';

export const BIG_PROP_KEYS = Object.freeze(['id', 'x', 'z', 'turn', 'scale']);
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const pickId = p => (typeof p === 'string' ? p : p?.id);

// The format of a hole's scenery.bigProps (validateHole): → an error message or null
export const bigPropsFormatError = list => placedFormatError(list, 'bigProps');
// The format of a list of hand-placed props { id, x, z, turn, scale } (scenery.bigProps, AP7g scenery.eventProps)
export function placedFormatError(list, field) {
  if (list === undefined) return null;
  if (!Array.isArray(list)) return `scenery.${field} must be a list of { id, x, z, turn, scale }`;
  for (const [i, p] of list.entries()) {
    const where = `scenery.${field}[${i}]`;
    if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !p.id) return `${where} must be { id, x, z, turn, scale } with a piece id`;
    for (const k of Object.keys(p)) if (!BIG_PROP_KEYS.includes(k)) return `${where} (${p.id}) has an unknown key "${k}" (known: ${BIG_PROP_KEYS.join(', ')})`;
    for (const k of ['x', 'z']) if (!isNum(p[k])) return `${where} (${p.id}).${k} must be a number (got ${p[k]})`;
    for (const k of ['turn', 'scale']) if (p[k] !== undefined && !isNum(p[k])) return `${where} (${p.id}).${k} must be a number (got ${p[k]})`;
  }
  return null;
}

// The OB stakes' box { x0, x1, z0, z1 } (the stakes stand on the OB line; the far end is the last stake row)
export function obBoxOf(stakes) {
  const xs = stakes.xs ?? [-stakes.x, stakes.x];
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(stakes.z0, stakes.z1), z1: Math.max(stakes.z0, stakes.z1) };
}
// m from (x, z) to the box (0 inside it)
export const toBox = (b, x, z) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.z0 - z, 0, z - b.z1));
// A prop's footprint radius (m): its shape's farthest point from the foot's axis × its scale
export const footprintOf = p => bigPropShape(p.id).radius * (p.scale ?? 1);

// The placement rules that need the set and the library (src/holes/sets.js checkHoleLooks, readyHole): every id is
// a library piece that the set offers (its `bigProps`), the scale is in the piece's range, and the footprint stays
// outside the OB box grown by BIG_PROPS.obClear. list = the props (the hole's scenery.bigProps, or a dev overlay),
// set = the biome set (as written or resolved). → an error message or null.
export function bigPropsError(hole, list, set, library) {
  if (!list?.length) return null;
  const offered = (set.bigProps ?? []).map(pickId), box = obBoxOf(hole.scenery.stakes);
  for (const [i, p] of list.entries()) {
    const where = `scenery.bigProps[${i}] (${p.id})`, piece = library.bigProps[p.id];
    if (!piece) return `${where} is not a big-prop piece (the library's bigProps: ${Object.keys(library.bigProps).join(', ')})`;
    if (!offered.includes(p.id)) return `${where}: biome set "${set.id}" does not offer it (its bigProps: ${offered.join(', ') || 'none'})`;
    const s = p.scale ?? 1, [lo, hi] = piece.scale;
    if (s < lo || s > hi) return `${where}.scale must be ${lo}–${hi} (got ${s})`;
    const r = footprintOf({ ...p, scale: s * piece.size * TUNABLES.BIG_PROP_SCALE.def }), d = toBox(box, p.x, p.z); // at the piece's size × the default BIG_PROP_SCALE, so a placement that would be clipped at runtime fails here
    if (d < r + BIG_PROPS.obClear) return `${where} at (${p.x}, ${p.z}): its footprint (${r.toFixed(1)} m) comes within ${BIG_PROPS.obClear} m of the OB box (it is ${d.toFixed(1)} m from it; needs ${(r + BIG_PROPS.obClear).toFixed(1)})`;
  }
  return null;
}

// The drawn size (looks only): every prop's scale × its piece's `size` (library.bigProps.<id>.size, the owner's
// per-piece pick) × mult (the BIG_PROP_SCALE tunable, a multiplier on the piece sizes, default 1). A prop whose
// scaled footprint would come within BIG_PROPS.obClear m of the OB box is left out (the static check,
// bigPropsError, uses the default mult). library = src/biomes/library.js LIBRARY (passed in, core stays free of data).
// → { keep: [props with the effective scale], clipped: [the props left out, as asked] }
export function scaleBigProps(hole, list, mult, library) {
  if (!list.length) return { keep: list, clipped: [] };
  const box = obBoxOf(hole.scenery.stakes), keep = [], clipped = [];
  for (const p of list) {
    const q = { ...p, scale: (p.scale ?? 1) * library.bigProps[p.id].size * mult };
    if (toBox(box, q.x, q.z) < footprintOf(q) + BIG_PROPS.obClear) clipped.push(p); else keep.push(q);
  }
  return { keep, clipped };
}

// The props to draw with this set: the ones it offers. A dev ?biome= override to a set that doesn't offer a hole's
// prop skips that prop (never fails the visit). → { keep: [props], skipped: [props] }
export function bigPropsFor(list, offered) {
  const ids = (offered ?? []).map(pickId), keep = [], skipped = [];
  for (const p of list ?? []) (ids.includes(p.id) ? keep : skipped).push(p);
  return { keep, skipped };
}

// Each prop dropped onto the terrain: y = the lowest heightAt under its footprint (the centre and BIG_PROPS.drop's
// rings), so it never floats (a sunk foot is fine). radiusOf = the footprint (AP7g: the event props' own).
// → [{ id, x, y, z, turn, scale }]
export function placeBigProps(list, heightAt, radiusOf = footprintOf) {
  const { rings, perRing } = BIG_PROPS.drop;
  return list.map(p => {
    const r = radiusOf(p);
    let y = heightAt(p.x, p.z);
    for (const f of rings) for (let k = 0; k < perRing; k++) {
      const a = (k / perRing) * Math.PI * 2;
      y = Math.min(y, heightAt(p.x + Math.cos(a) * r * f, p.z + Math.sin(a) * r * f));
    }
    return { id: p.id, x: p.x, y, z: p.z, turn: p.turn ?? 0, scale: p.scale ?? 1 };
  });
}

// Where no scenery tree may stand (the Mountain holes' forest fills everything beyond OB, so a prop would stand
// inside it, hidden): within `clear` m of a prop's footprint, and in a sight corridor as wide as the footprint from
// the prop toward `toward` (the tee), so the prop shows from the course. (x, z) → true when a tree may stand there;
// null when there are no props (nothing to test). radiusOf = the footprint (AP7g: the event props' own).
export function bigPropsClear(list, clear, toward = null, radiusOf = footprintOf) {
  if (!list.length) return null;
  const rings = list.map(p => {
    const r = radiusOf(p), dx = toward ? toward.x - p.x : 0, dz = toward ? toward.z - p.z : 0, len = Math.hypot(dx, dz);
    return { x: p.x, z: p.z, r: r + clear, half: r, ux: len ? dx / len : 0, uz: len ? dz / len : 0, len };
  });
  return (x, z) => rings.every(c => {
    const ax = x - c.x, az = z - c.z;
    if (Math.hypot(ax, az) <= c.r) return false;
    const t = ax * c.ux + az * c.uz; // along the corridor
    return !(t > 0 && t < c.len && Math.abs(ax * c.uz - az * c.ux) <= c.half);
  });
}
