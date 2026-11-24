// AP7g: event props placed by hand (DESIGN §8b "Event props", the artist's owner-approved
// docs/art/tee-props/SPEC.md §4 / §6): feather flags and pop-up tents that dress a "tournament" tee, the side of a
// hole and the back of the green. Pure (no Three.js, no DOM), tested in tests/event-props.test.js. A hole lists them
// in `scenery.eventProps: [{ id, x, z, turn, scale }]` (the big props' format; optional); the hole's biome set says
// which pieces it offers (`eventProps`). The zone is worked out from the spot (no zone field). Looks only: no
// collider, no physics.
//   x / z = the foot centre (m), turn = rad about y (0 = the front faces +z), scale = EVENT_PROPS.scale (default 1).
import { EVENT_PROPS, TUNABLES } from './config.js';
import { eventPropShape, EVENT_PROP_PIECES } from './eventPropShapes.js';
import { placedFormatError, placeBigProps, bigPropsClear } from './bigProps.js';

const pickId = p => (typeof p === 'string' ? p : p?.id);
// The format of a hole's scenery.eventProps (validateHole): → an error message or null
export const eventPropsFormatError = list => placedFormatError(list, 'eventProps');
// A prop's footprint radius (m): its shape's farthest point from the foot's axis × its scale × mult (EVENT_PROP_SCALE)
export const eventFootprint = (p, mult = TUNABLES.EVENT_PROP_SCALE.def) => eventPropShape(p.id).radius * (p.scale ?? 1) * mult;

// The direction the tee box faces (core/play.js teeFacing: toward `teeFacing` when set, else straight down −z)
export function teeAim(hole) {
  if (!hole.teeFacing) return { dx: 0, dz: -1 };
  const dx = hole.teeFacing.x - hole.tee.x, dz = hole.teeFacing.z - hole.tee.z, d = Math.hypot(dx, dz) || 1;
  return { dx: dx / d, dz: dz / d };
}
// The spot seen from the tee: ahead = m along the tee's aim (− = behind), side = m from the aim line, dist = m from the tee
export function fromTee(hole, x, z) {
  const { dx, dz } = teeAim(hole), ox = x - hole.tee.x, oz = z - hole.tee.z;
  return { ahead: ox * dx + oz * dz, side: Math.abs(ox * dz - oz * dx), dist: Math.hypot(ox, oz) };
}
// The first spot within R m of (x, z) whose surface passes test, or null. A grid of EVENT_PROPS.step m (stepFar
// beyond farFrom m of R) over the disc, plus its rim.
export function surfaceNear(surfaceAt, x, z, R, test) {
  const step = R > EVENT_PROPS.farFrom ? EVENT_PROPS.stepFar : EVENT_PROPS.step, n = Math.ceil(R / step);
  const hit = (px, pz) => { const s = surfaceAt(px, pz); return test(s) ? { x: px, z: pz, s } : null; };
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    const px = x + i * step, pz = z + j * step;
    if ((px - x) ** 2 + (pz - z) ** 2 <= R * R) { const h = hit(px, pz); if (h) return h; }
  }
  const rim = Math.max(16, Math.ceil(2 * Math.PI * R / step));
  for (let k = 0; k < rim; k++) { const a = k / rim * 2 * Math.PI, h = hit(x + Math.cos(a) * R, z + Math.sin(a) * R); if (h) return h; }
  return null;
}
const ON_PLAY = new Set(['fairway', 'sand', 'water', 'fringe', 'green']); // a prop's footprint never stands on these

// The placement rules that need no biome set (validateHole, SPEC §6.3): the id is an event prop, the scale in
// range, and the scaled footprint (at `mult`, the default EVENT_PROP_SCALE):
//   - stays EVENT_PROPS.teeBox m off the tee box;
//   - stays out of the tee camera's clear zone (±camHalf m from the tee's aim line, from camBehind m behind the tee
//     to the tee), and no part of it is more than `ahead` m in front of the tee while the prop is within teeZone m;
//   - is not on the fairway, a bunker, water, the fringe or the green, and stays greenClear m from the green's edge;
//   - a popupTent: not within tentGreen m of the green; beyond the tee zone (> teeZone m from the tee), its
//     footprint stays tentPlay m from every in-play surface (anything but OB; beyond OB is fine if that holds).
// list = the props (the hole's scenery.eventProps, or a dev overlay). → an error message or null.
export function eventPropsError(hole, list, mult = TUNABLES.EVENT_PROP_SCALE.def) {
  if (!list?.length) return null;
  const E = EVENT_PROPS, at = hole.surfaceAt;
  for (const [i, p] of list.entries()) {
    const where = `scenery.eventProps[${i}] (${p.id}) at (${p.x}, ${p.z})`;
    if (!EVENT_PROP_PIECES.includes(p.id)) return `scenery.eventProps[${i}] (${p.id}) is not an event prop (the library's eventProps: ${EVENT_PROP_PIECES.join(', ')})`;
    const s = p.scale ?? 1, [lo, hi] = E.scale;
    if (s < lo || s > hi) return `scenery.eventProps[${i}] (${p.id}).scale must be ${lo}–${hi} (got ${s})`;
    const r = eventFootprint(p, mult), fp = `its footprint (${r.toFixed(1)} m)`, t = fromTee(hole, p.x, p.z);
    let h = surfaceNear(at, p.x, p.z, r + E.teeBox, v => v === 'tee');
    if (h) return `${where}: ${fp} is on the tee box or within ${E.teeBox} m of it (tee box at (${h.x.toFixed(1)}, ${h.z.toFixed(1)}))`;
    const cam = Math.hypot(Math.max(-E.camBehind - t.ahead, 0, t.ahead), Math.max(t.side - E.camHalf, 0));
    if (cam < r) return `${where}: ${fp} is inside the tee camera's clear zone (±${E.camHalf} m from the tee's aim line, from ${E.camBehind} m behind the tee to the tee; it is ${cam.toFixed(1)} m from it)`;
    if (t.dist <= E.teeZone && t.ahead + r > E.ahead) return `${where}: ${fp} reaches ${(t.ahead + r).toFixed(1)} m in front of the tee (at most ${E.ahead} m while within ${E.teeZone} m of the tee)`;
    h = surfaceNear(at, p.x, p.z, r, v => ON_PLAY.has(v));
    if (h) return `${where}: ${fp} stands on the ${h.s} (at (${h.x.toFixed(1)}, ${h.z.toFixed(1)}))`;
    h = surfaceNear(at, p.x, p.z, r + E.greenClear, v => v === 'green');
    if (h) return `${where}: ${fp} is within ${E.greenClear} m of the green's edge`;
    if (p.id !== 'popupTent') continue;
    h = surfaceNear(at, p.x, p.z, r + E.tentGreen, v => v === 'green');
    if (h) return `${where}: a popupTent within ${E.tentGreen} m of the green`;
    if (t.dist > E.teeZone) {
      h = surfaceNear(at, p.x, p.z, r + E.tentPlay, v => v !== 'ob');
      if (h) return `${where}: a popupTent beyond the tee zone (${t.dist.toFixed(1)} m from the tee, more than ${E.teeZone}) whose ${fp.slice(4)} comes within ${E.tentPlay} m of the ${h.s} (at (${h.x.toFixed(1)}, ${h.z.toFixed(1)}))`;
    }
  }
  return null;
}

// The rule that needs the set (src/holes/sets.js checkHoleLooks): every piece is in the set's `eventProps` list.
export function eventPropsSetError(list, set) {
  if (!list?.length) return null;
  const offered = (set.eventProps ?? []).map(pickId);
  for (const [i, p] of list.entries()) if (!offered.includes(p.id)) return `scenery.eventProps[${i}] (${p.id}): biome set "${set.id}" does not offer it (its eventProps: ${offered.join(', ') || 'none'})`;
  return null;
}

// The drawn props: each prop's scale × mult (EVENT_PROP_SCALE), dropped at the lowest ground under its footprint
// (as the big props). → [{ id, x, y, z, turn, scale (the drawn one) }]
export const scaleEventProps = (list, mult) => list.map(p => ({ ...p, scale: (p.scale ?? 1) * mult }));
const drawnRadius = p => eventPropShape(p.id).radius * p.scale;
export const placeEventProps = (scaled, heightAt) => placeBigProps(scaled, heightAt, drawnRadius);
// Where no scenery tree may stand (SPEC §6.6, as the big props): within `clear` m of a (drawn) footprint and in its
// sight corridor toward `toward` (the tee). null when there are none.
export const eventPropsClear = (scaled, clear, toward) => bigPropsClear(scaled, clear, toward, drawnRadius);
