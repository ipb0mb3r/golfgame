// How each surface treats the ball (DESIGN.md §4).
// rest = bounce height kept, keep = speed kept on a bounce, decel = rolling friction (m/s²),
// lie = power multiplier when hitting from it. Water and OB are penalties.
// These base values are hole 1's. A hole changes them through `surfaceOverrides`.
export const BASE_SURFACES = {
  tee:     { name: 'Tee box', rest: .30, keep: .40, decel: 2.4, lie: 1 },
  fairway: { name: 'Fairway', rest: .30, keep: .42, decel: 2.4, lie: 1 },
  fringe:  { name: 'Fringe',  rest: .25, keep: .36, decel: 3.2, lie: .97 },
  green:   { name: 'Green',   rest: .22, keep: .32, decel: 1.1, lie: 1 },
  rough:   { name: 'Rough',   rest: .15, keep: .22, decel: 5.5, lie: .85 },
  sand:    { name: 'Bunker',  rest: .02, keep: .06, decel: 18,  lie: .6 },
  water:   { name: 'Water', penalty: true },
  ob:      { name: 'Out of bounds', penalty: true },
};

// The one place that decides a surface's values for a hole and weather.
// Phase 5 (rain) adds the wetness rules here; with no weather it is base + hole overrides.
export function getEffectiveSurface(id, hole = {}, weather = hole.weather) {
  const base = BASE_SURFACES[id];
  if (!base) throw new Error(`unknown surface "${id}"`);
  const over = (hole.surfaceOverrides && hole.surfaceOverrides[id]) || {};
  void weather; // wetness is applied in Phase 5 (W2)
  return { id, ...base, ...over };
}

// All surfaces for a hole, resolved once (the physics reads this table every step).
export function makeSurfaceTable(hole = {}, weather = hole.weather) {
  const out = {};
  for (const id of Object.keys(BASE_SURFACES)) out[id] = getEffectiveSurface(id, hole, weather);
  return out;
}
