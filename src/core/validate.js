// Checks hole and scenario data when it loads (Gate A T7), so a typo in a data file fails at once
// with a message that names the hole and the field, instead of a hole that quietly plays differently
// or a crash deep inside the physics. Since X12 the page checks a hole (and a scenario) when it is
// first played (src/holes/sets.js readyHole, scenarios.js resolveScenario); tests check them all.
import { BASE_SURFACES } from './surfaces.js';
import { CLUBS } from './clubs.js';
import { createHolePlay } from './play.js';
import { meshAxis } from './terrain.js';
import { GROUND_PLANE_MARGIN, GROUND_CHECK_STEP } from './config.js';

// The surface fields a hole may override (DESIGN §4 surface table, §3 lie)
const SURFACE_FIELDS = new Set(['name', 'rest', 'keep', 'decel', 'maxPower', 'sweetScale', 'penalty']);
const WEATHER_TYPES = new Set(['clear', 'rain']);
const SAMPLES = 20; // surfaceAt / heightAt are checked on a SAMPLES × SAMPLES grid over the map

const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isPoint = p => p && isNum(p.x) && isNum(p.z);

// Throws an Error naming the hole and the field. Returns the hole.
// X12: `shots: false` skips the shot simulations (the S21 default tee shot below). The page checks
// only the hole it loads, without them (src/holes/sets.js readyHole); node --test runs the full
// check on every hole (tests/validate.test.js).
export function validateHole(hole, { shots = true } = {}) {
  const name = `hole "${hole?.id ?? '?'}"`;
  const bad = msg => { throw new Error(`${name}: ${msg}`); };
  if (!hole || typeof hole !== 'object') bad('is not an object');
  if (typeof hole.id !== 'string' || !hole.id) bad('id must be a non-empty string');
  if (typeof hole.name !== 'string') bad('name must be a string');
  for (const k of ['number', 'par', 'maxStrokes']) if (!Number.isInteger(hole[k]) || hole[k] < 1) bad(`${k} must be a whole number ≥ 1 (got ${hole[k]})`);
  // Phase 6: 1 (easy) … 5 (hard). The AI rivals (Phase T) use it; HOLE_GUIDELINES §2
  if (!Number.isInteger(hole.difficulty) || hole.difficulty < 1 || hole.difficulty > 5) bad(`difficulty must be a whole number 1–5 (got ${hole.difficulty})`);
  if (hole.maxStrokes < hole.par) bad(`maxStrokes (${hole.maxStrokes}) is below par (${hole.par})`);
  for (const k of ['tee', 'cup']) if (!isPoint(hole[k])) bad(`${k} must be { x, z } with finite numbers`);
  const m = hole.map;
  if (!m || ![m.x0, m.x1, m.z0, m.z1].every(isNum) || m.x0 >= m.x1 || m.z0 >= m.z1) bad('map must be { x0 < x1, z0 < z1 } with finite numbers');
  for (const k of ['heightAt', 'surfaceAt']) if (typeof hole[k] !== 'function') bad(`${k} must be a function`);

  if (hole.bag !== undefined) {
    if (!Array.isArray(hole.bag) || !hole.bag.length) bad('bag must be a list of club ids');
    for (const id of hole.bag) if (!Object.hasOwn(CLUBS, id)) bad(`bag has an unknown club "${id}" (known: ${Object.keys(CLUBS).join(', ')})`);
    if (!hole.bag.includes('putter')) bad('bag must include the putter');
  }
  if (hole.wind !== undefined && !isPoint(hole.wind)) bad('wind must be { x, z } with finite numbers');
  if (hole.windMax !== undefined && !(isNum(hole.windMax) && hole.windMax >= 0)) bad('windMax must be a number ≥ 0');
  if (hole.weather !== undefined) {
    const w = hole.weather;
    if (!WEATHER_TYPES.has(w?.type)) bad(`weather.type must be one of ${[...WEATHER_TYPES].join(', ')} (got ${w?.type})`);
    if (!(isNum(w.wetness) && w.wetness >= 0 && w.wetness <= 1)) bad(`weather.wetness must be 0..1 (got ${w.wetness})`);
  }
  for (const [sid, over] of Object.entries(hole.surfaceOverrides ?? {})) {
    if (!Object.hasOwn(BASE_SURFACES, sid)) bad(`surfaceOverrides has an unknown surface "${sid}" (known: ${Object.keys(BASE_SURFACES).join(', ')})`);
    for (const [k, v] of Object.entries(over)) {
      if (!SURFACE_FIELDS.has(k)) bad(`surfaceOverrides.${sid} has an unknown field "${k}" (known: ${[...SURFACE_FIELDS].join(', ')})`);
      if (k !== 'name' && k !== 'penalty' && !isNum(v)) bad(`surfaceOverrides.${sid}.${k} must be a number (got ${v})`);
    }
  }

  // The shape functions: known surfaces and finite heights everywhere on the map, tee on the tee, cup on the green
  const at = (x, z) => {
    const s = hole.surfaceAt(x, z), h = hole.heightAt(x, z);
    if (!Object.hasOwn(BASE_SURFACES, s)) bad(`surfaceAt(${x.toFixed(1)}, ${z.toFixed(1)}) returned an unknown surface "${s}"`);
    if (!isNum(h)) bad(`heightAt(${x.toFixed(1)}, ${z.toFixed(1)}) returned ${h}`);
    return s;
  };
  if (at(hole.tee.x, hole.tee.z) !== 'tee') bad('the tee is not on the "tee" surface');
  if (at(hole.cup.x, hole.cup.z) !== 'green') bad('the cup is not on the "green" surface');
  // S18: the default aim. Approaches aim at the green centre (features.green), par 4/5 tee shots at aimTarget
  const g = hole.features?.green;
  if (!g || !isNum(g.cx) || !isNum(g.cz)) bad('features.green must be { cx, cz, ... } (the default aim for approaches, S18)');
  if (at(g.cx, g.cz) !== 'green') bad(`the centre of features.green (${g.cx}, ${g.cz}) is not on the "green" surface`);
  // S21: the tee shot aims straight along the tee's facing: down −z, or toward `teeFacing` when set.
  // aimTarget (optional, par 4/5) only tells the auto-pick how far the tee shot should go.
  if (hole.aimTarget !== undefined) {
    if (!isPoint(hole.aimTarget)) bad('aimTarget must be { x, z } with finite numbers');
    const s = at(hole.aimTarget.x, hole.aimTarget.z);
    if (BASE_SURFACES[s].penalty) bad(`aimTarget (${hole.aimTarget.x}, ${hole.aimTarget.z}) is in ${s}`);
  }
  if (hole.teeFacing !== undefined) {
    if (!isPoint(hole.teeFacing)) bad('teeFacing must be { x, z } with finite numbers (the point the tee box faces, S21)');
    if (Math.hypot(hole.teeFacing.x - hole.tee.x, hole.teeFacing.z - hole.tee.z) < 1) bad('teeFacing must be away from the tee (it sets the direction the tee box faces)');
    at(hole.teeFacing.x, hole.teeFacing.z);
  }
  // K12: an optional play line (a dogleg's yardage): tee first, cup last
  if (hole.playLine !== undefined) {
    const pl = hole.playLine, same = (a, b) => a.x === b.x && a.z === b.z;
    if (!Array.isArray(pl) || pl.length < 2 || !pl.every(isPoint)) bad('playLine must be a list of at least 2 { x, z } points');
    if (!same(pl[0], hole.tee) || !same(pl.at(-1), hole.cup)) bad('playLine must start at the tee and end at the cup');
  }
  // K2/K3: obstacles (DESIGN §4 "Obstacles"): known types, positive sizes, inside the OB line.
  // K8 fairness guards: never on the tee, the fringe or the green, and never on the fairway unless the
  // hole says it is meant to be there (`onFairway: true`, like hole 3's lone tree). (The default tee
  // shot may run into trees since S21: the K4 warning shows it and the player adjusts; see below.)
  if (hole.obstacles !== undefined) {
    if (!Array.isArray(hole.obstacles)) bad('obstacles must be a list');
    const FIELDS = { tree: ['trunkR', 'trunkH', 'canopyR', 'canopyH'], boulder: ['r'] };
    hole.obstacles.forEach((o, i) => {
      const where = `obstacles[${i}]`;
      if (!o || !Object.hasOwn(FIELDS, o.type)) bad(`${where}.type must be one of ${Object.keys(FIELDS).join(', ')} (got ${o?.type})`);
      if (!isPoint(o)) bad(`${where} must have x and z (finite numbers)`);
      for (const k of FIELDS[o.type]) if (!(isNum(o[k]) && o[k] > 0)) bad(`${where}.${k} must be a number > 0 (got ${o[k]})`);
      if (o.sink !== undefined && !(isNum(o.sink) && o.sink >= 0 && o.sink < 1)) bad(`${where}.sink must be 0..1 (got ${o.sink})`);
      const s = at(o.x, o.z);
      if (s === 'ob') bad(`${where} (${o.x}, ${o.z}) is out of bounds (trees outside OB are scenery, not obstacles)`);
      if (s === 'tee' || s === 'green' || s === 'fringe') bad(`${where} (${o.x}, ${o.z}) stands on the ${s}`);
      if (s === 'fairway' && o.onFairway !== true) bad(`${where} (${o.x}, ${o.z}) stands on the fairway (set onFairway: true if that is the design)`);
      if (o.onFairway !== undefined && typeof o.onFairway !== 'boolean') bad(`${where}.onFairway must be true or false`);
    });
  }
  for (let i = 0; i <= SAMPLES; i++) for (let j = 0; j <= SAMPLES; j++) {
    at(m.x0 + (m.x1 - m.x0) * i / SAMPLES, m.z0 + (m.z1 - m.z0) * j / SAMPLES);
  }
  // K13: the flat background ground plane (scenery.ground.y) must stay under the drawn terrain, or it
  // pokes through every hollow and hides the course and the ball. The terrain mesh is flat between
  // its grid points, so heightAt on those points (scenery.mesh) finds its lowest spot. To keep the
  // load quick the check thins the grid to GROUND_CHECK_STEP; the hollows are wide and smooth, so
  // that misses the true low point by millimetres, well inside the margin.
  const sc = hole.scenery;
  if (sc?.ground !== undefined) {
    if (!isNum(sc.ground.y)) bad(`scenery.ground.y must be a number (got ${sc.ground.y})`);
    if (sc.mesh) {
      let low = { y: Infinity };
      const thin = parts => meshAxis(parts.map(([a, b, step]) => [a, b, Math.max(step, GROUND_CHECK_STEP)]));
      for (const x of thin(sc.mesh.xs)) for (const z of thin(sc.mesh.zs)) {
        const y = hole.heightAt(x, z);
        if (y < low.y) low = { x, z, y };
      }
      if (sc.ground.y > low.y - GROUND_PLANE_MARGIN) bad(`scenery.ground.y (${sc.ground.y}) must be at least ${GROUND_PLANE_MARGIN} m below the lowest terrain, ${low.y.toFixed(2)} m at (${low.x}, ${low.z}): use ${(Math.floor((low.y - GROUND_PLANE_MARGIN) * 10) / 10).toFixed(1)} or lower`);
    }
  }
  // S21 fairness (owner: "it's ok sometimes if the default aim ends not in the fairway, makes the
  // player adjust it"): the default tee shot (default aim and club, no wind, straight, at the power
  // that finishes at the default aim point, the ⚑ power) may finish in the rough, a bunker or under
  // trees, but never in a penalty (water, out of bounds). It replaces the K8 "clean default tee shot"
  // rule. A full swing may run past the aim point into trouble (a par 3 where long is wet, mtn-06).
  if (shots) {
    const play = createHolePlay(hole, { seed: 1 });
    play.reset({ wind: { x: 0, z: 0 } });
    const r = play.restPoint(play.clubIdx, play.aim, Math.min(play.pinPower(), play.lieOf().maxPower));
    const s = hole.surfaceAt(r.x, r.z);
    if (r.end === 'penalty' || BASE_SURFACES[s]?.penalty) bad(`the default tee shot (${play.club.name} to the aim point, straight along the tee's facing) ends in ${s} at (${r.x.toFixed(0)}, ${r.z.toFixed(0)}): set or move teeFacing`);
  }
  return hole;
}

// A designer scenario (src/holes/scenarios.js). `holes` = the registry (id → hole). Throws, naming
// the scenario and the field. Returns the scenario.
export function validateScenario(id, sc, holes) {
  const bad = msg => { throw new Error(`scenario "${id}": ${msg}`); };
  if (!sc || typeof sc !== 'object') bad('is not an object');
  if (!Object.hasOwn(holes, sc.hole)) bad(`unknown hole "${sc.hole}"`);
  const hole = holes[sc.hole], m = hole.map;
  if (!isPoint(sc.ball)) bad('ball must be { x, z } with finite numbers');
  if (sc.ball.x < m.x0 || sc.ball.x > m.x1 || sc.ball.z < m.z0 || sc.ball.z > m.z1) bad(`ball (${sc.ball.x}, ${sc.ball.z}) is off the map of ${sc.hole}`);
  if (!Number.isInteger(sc.strokes) || sc.strokes < 0 || sc.strokes >= hole.maxStrokes) bad(`strokes must be a whole number from 0 to ${hole.maxStrokes - 1} (got ${sc.strokes})`);
  if (!Number.isInteger(sc.seed)) bad(`seed must be a whole number (got ${sc.seed})`);
  if (sc.wind !== undefined && !isPoint(sc.wind)) bad('wind must be { x, z } with finite numbers');
  if (sc.aimAt !== undefined && !isPoint(sc.aimAt)) bad('aimAt must be { x, z } with finite numbers'); // K9
  if (!Object.hasOwn(BASE_SURFACES, sc.lie)) bad(`lie must be a surface id (got ${sc.lie})`);
  const s = hole.surfaceAt(sc.ball.x, sc.ball.z);
  if (s !== sc.lie) bad(`the ball sits on "${s}", not on the promised lie "${sc.lie}"`);
  for (const k of ['name', 'text']) if (typeof sc[k] !== 'string' || !sc[k]) bad(`${k} must be a non-empty string`);
  return sc;
}
