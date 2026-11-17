// How each surface treats the ball (DESIGN.md §4).
// rest = bounce height kept, keep = speed kept on a bounce, decel = rolling friction (m/s²).
// The lie (S11, DESIGN §3 "Lie"): maxPower = power cap for a shot from here (the top of the meter),
// sweetScale = multiplies SWEET (the accuracy window). Clubs may override both (clubs.js lieOverrides).
// Water and OB are penalties.
// These base values are hole 1's. A hole changes them through `surfaceOverrides`.
// Frozen: nothing changes the base table at run time (Gate A A5). A hole changes values through
// `surfaceOverrides`, a ?tune= link through the lie-tune layer below.
export const BASE_SURFACES = deepFreeze({
  tee:     { name: 'Tee box', rest: .30, keep: .40, decel: 2.4, maxPower: 1,    sweetScale: 1.2 },
  fairway: { name: 'Fairway', rest: .30, keep: .42, decel: 2.4, maxPower: 1,    sweetScale: 1 },
  fringe:  { name: 'Fringe',  rest: .25, keep: .36, decel: 3.2, maxPower: .95,  sweetScale: 1 },
  green:   { name: 'Green',   rest: .22, keep: .32, decel: 0.7, maxPower: 1,    sweetScale: 1.5 }, // S17: faster green, decel 1.1 → 0.7
  rough:   { name: 'Rough',   rest: .15, keep: .22, decel: 5.5, maxPower: .85,  sweetScale: .7 },
  sand:    { name: 'Bunker',  rest: .02, keep: .06, decel: 18,  maxPower: .5,   sweetScale: .4 },  // S17: harder, .6/.5 → .5/.4
  // K1: hard ground (a rock outcrop, scree or a cart path): big bounce and a long roll, and a "thin" lie
  rock:    { name: 'Rock',    rest: .55, keep: .75, decel: 1.8, maxPower: .9,  sweetScale: .8 },
  water:   { name: 'Water', penalty: true },
  ob:      { name: 'Out of bounds', penalty: true },
});

// The one place that decides a surface's values for a hole and weather.
// Phase 5 (rain) adds the wetness rules here; with no weather it is base + hole overrides.
// Order: base table → the hole's surfaceOverrides → ?tune= lie values (a tuned value always wins,
// so the TUNED badge never lies).
export function getEffectiveSurface(id, hole = {}, weather = hole.weather) {
  const base = BASE_SURFACES[id];
  if (!base) throw new Error(`unknown surface "${id}"`);
  const over = (hole.surfaceOverrides && hole.surfaceOverrides[id]) || {};
  void weather; // wetness is applied in Phase 5 (W2)
  const out = { id, ...base, ...over };
  for (const key of Object.keys(SURFACE_RANGES)) {
    const t = lieTune(`${id}.${key}`);
    if (t !== undefined) out[key] = t;
  }
  return out;
}

// All surfaces for a hole, resolved once (the physics reads this table every step).
export function makeSurfaceTable(hole = {}, weather = hole.weather) {
  const out = {};
  for (const id of Object.keys(BASE_SURFACES)) out[id] = getEffectiveSurface(id, hole, weather);
  return out;
}

// The lie values a ?tune= link may change (X8), with their ranges: <surface>.maxPower, <surface>.sweetScale
// and <club>.<surface>.<value> for a club override (e.g. sw.sand.maxPower).
export const LIE_RANGES = Object.freeze({ maxPower: Object.freeze({ min: 0.1, max: 1 }), sweetScale: Object.freeze({ min: 0.2, max: 3 }) });
// S17: a surface's physics values may be tuned too (<surface>.decel, .keep, .rest; e.g. green.decel:0.6),
// with these ranges. Like a lie value, a tuned value wins over a hole's surfaceOverrides.
export const PHYSICS_RANGES = Object.freeze({
  decel: Object.freeze({ min: 0.2, max: 30 }),  // rolling friction, m/s²
  keep: Object.freeze({ min: 0, max: 1 }),      // speed kept on a bounce
  rest: Object.freeze({ min: 0, max: 1 }),      // bounce height kept
});
export const SURFACE_RANGES = Object.freeze({ ...LIE_RANGES, ...PHYSICS_RANGES });

// The lie-tune layer (Gate A A5): tuned surface values (lie and, since S17, physics) by name, e.g. 'rough.maxPower' → 0.8 or
// 'sw.sand.maxPower' → 0.9. Read by getEffectiveSurface (surface values, when a hole's surface
// table is made, i.e. when the hole starts) and by clubs.lieFor (club values). Only tune.js writes it.
const LIE_TUNES = new Map();
export const lieTune = name => LIE_TUNES.get(name);
export function setLieTune(name, value) { LIE_TUNES.set(name, value); }
export function clearLieTunes() { LIE_TUNES.clear(); }

export function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v);
  return Object.freeze(o);
}
