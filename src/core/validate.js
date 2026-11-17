// Checks hole and scenario data when it loads (Gate A T7), so a typo in a data file fails at once
// with a message that names the hole and the field, instead of a hole that quietly plays differently
// or a crash deep inside the physics. src/holes/sets.js and scenarios.js call these at load time.
import { BASE_SURFACES } from './surfaces.js';
import { CLUBS } from './clubs.js';

// The surface fields a hole may override (DESIGN §4 surface table, §3 lie)
const SURFACE_FIELDS = new Set(['name', 'rest', 'keep', 'decel', 'maxPower', 'sweetScale', 'penalty']);
const WEATHER_TYPES = new Set(['clear', 'rain']);
const SAMPLES = 20; // surfaceAt / heightAt are checked on a SAMPLES × SAMPLES grid over the map

const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isPoint = p => p && isNum(p.x) && isNum(p.z);

// Throws an Error naming the hole and the field. Returns the hole.
export function validateHole(hole) {
  const name = `hole "${hole?.id ?? '?'}"`;
  const bad = msg => { throw new Error(`${name}: ${msg}`); };
  if (!hole || typeof hole !== 'object') bad('is not an object');
  if (typeof hole.id !== 'string' || !hole.id) bad('id must be a non-empty string');
  if (typeof hole.name !== 'string') bad('name must be a string');
  for (const k of ['number', 'par', 'maxStrokes']) if (!Number.isInteger(hole[k]) || hole[k] < 1) bad(`${k} must be a whole number ≥ 1 (got ${hole[k]})`);
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
  if (hole.par >= 4 && hole.aimTarget === undefined) bad('a par 4 or 5 needs aimTarget: { x, z }, the default aim for the tee shot (S18)');
  if (hole.aimTarget !== undefined) {
    if (!isPoint(hole.aimTarget)) bad('aimTarget must be { x, z } with finite numbers');
    const s = at(hole.aimTarget.x, hole.aimTarget.z);
    if (BASE_SURFACES[s].penalty) bad(`aimTarget (${hole.aimTarget.x}, ${hole.aimTarget.z}) is in ${s}`);
  }
  for (let i = 0; i <= SAMPLES; i++) for (let j = 0; j <= SAMPLES; j++) {
    at(m.x0 + (m.x1 - m.x0) * i / SAMPLES, m.z0 + (m.z1 - m.z0) * j / SAMPLES);
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
  if (!Object.hasOwn(BASE_SURFACES, sc.lie)) bad(`lie must be a surface id (got ${sc.lie})`);
  const s = hole.surfaceAt(sc.ball.x, sc.ball.z);
  if (s !== sc.lie) bad(`the ball sits on "${s}", not on the promised lie "${sc.lie}"`);
  for (const k of ['name', 'text']) if (typeof sc[k] !== 'string' || !sc[k]) bad(`${k} must be a non-empty string`);
  return sc;
}
