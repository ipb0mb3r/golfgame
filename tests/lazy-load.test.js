// X12: load time. The registry builds nothing at import: a Mountain 9 hole builds its grids and
// forest on first use, and the page checks a hole (validateHole without the shot simulations) only
// when it plays it. node --test runs in one process per file, so this file starts with nothing built.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOLES, SETS, MTN, resolveSet, getHole, readyHole } from '../src/holes/sets.js';
import { SCENARIOS, resolveScenario } from '../src/holes/scenarios.js';
import { lazyHole, isBuilt, buildHole } from '../src/holes/lazy.js';
import { soloCourses, aiCourses, practiceItems } from '../src/core/menu.js';
import { createRound } from '../src/core/round.js';
import { validateHole } from '../src/core/validate.js';
import { makeMtnHole } from '../src/holes/mtn-course.js';

const built = () => MTN.filter(isBuilt).map(h => h.id);

test('X12: importing the holes and scenarios builds no Mountain 9 hole', () => {
  assert.deepEqual(built(), []);
});

test('X12: the menus, a round and the AI rivals read only light fields (nothing is built)', () => {
  const c = soloCourses(SETS, HOLES);
  assert.ok(c.find(x => x.id === 'mountain9').par > 0);
  aiCourses(SETS, HOLES);
  practiceItems(SETS, HOLES, SCENARIOS);
  for (const h of MTN) assert.ok(h.name && h.par && h.number && h.difficulty && h.maxStrokes && h.intro, h.id);
  const r = createRound(resolveSet('mountain9'), { seed: 3, getHole, mode: 'ai', difficulty: 'hard' });
  assert.equal(r.length, 9);
  assert.equal(r.current.hole, HOLES['mtn-01']);
  assert.deepEqual(built(), []);
});

test('X12: a scenario builds only its own hole when it is resolved (and is checked then)', () => {
  const id = Object.keys(SCENARIOS).find(k => SCENARIOS[k].hole === 'mtn-09');
  assert.ok(id);
  assert.equal(resolveScenario(id).scenario.hole, 'mtn-09');
  assert.deepEqual(built(), ['mtn-09']);
});

test('X12: the first read of a heavy field builds the hole once; afterwards its fields are plain data', () => {
  const h = HOLES['mtn-03'];
  assert.equal(isBuilt(h), false);
  assert.equal(typeof h.surfaceAt(h.tee.x, h.tee.z), 'string');
  assert.equal(isBuilt(h), true);
  for (const k of Object.keys(h)) assert.equal(Object.getOwnPropertyDescriptor(h, k).get, undefined, k);
  assert.equal(h.surfaceAt(h.tee.x, h.tee.z), 'tee');
  assert.equal(readyHole(h), h);
});

test('X12: a lazy hole builds the same data as before (same spec → same obstacles, map and surfaces)', () => {
  // the deep bunker hole, built twice from the same module data, plus the registry copy
  const a = HOLES['mtn-06'], b = buildHole(getHole('mtn-06'));
  assert.equal(a, b);
  assert.ok(a.obstacles.length > 20, 'the forest is planted');
  for (const k of ['id', 'number', 'name', 'par', 'difficulty', 'maxStrokes', 'tee', 'cup', 'bag', 'windMax', 'weather', 'surfaceOverrides', 'intro', 'map', 'features', 'obstacles', 'heightAt', 'surfaceAt', 'scenery']) assert.ok(Object.hasOwn(a, k), k);
});

test('X12: readyHole checks the hole once, naming the hole and the field; the full check (shots) stays in tests', () => {
  const broken = { ...HOLES['pl-01'], par: 0 };
  assert.throws(() => readyHole(broken), /hole "pl-01": par must be a whole number/);
  // shots: false skips only the S21 default tee shot simulation
  // pl-01 with water everywhere but the tee and two tiny dots of green (the cup and the green centre)
  const h1 = HOLES['pl-01'], g = h1.features.green, near = (x, z, p) => Math.hypot(x - p.x, z - p.z) < 0.3;
  const wet = { ...h1, surfaceAt: (x, z) => (near(x, z, h1.tee) ? 'tee' : near(x, z, h1.cup) || near(x, z, { x: g.cx, z: g.cz }) ? 'green' : 'water') };
  assert.doesNotThrow(() => validateHole(wet, { shots: false }));
  assert.throws(() => validateHole(wet), /the default tee shot .* ends in water/);
});

test('X12: lazyHole refuses a built field that is neither light nor heavy, and a failed build stays unbuilt', () => {
  const h = lazyHole({ id: 'x' }, ['a'], () => ({ id: 'x', a: 1, b: 2 }));
  assert.throws(() => h.a, /built field "b"/);
  assert.equal(isBuilt(h), false);
  const ok = lazyHole({ id: 'y', par: 3 }, ['a'], () => ({ id: 'y', par: 3, a: 7 }));
  assert.equal(ok.par, 3);
  assert.equal(isBuilt(ok), false);
  assert.deepEqual({ ...ok }, { id: 'y', par: 3, a: 7 }); // a spread builds it
  assert.equal(isBuilt(ok), true);
  // a hole made by the course kit is lazy too
  assert.equal(isBuilt(makeMtnHole({ ...mtnSpecOf() })), false);
});

// a minimal course-kit spec (not built in this test)
const mtnSpecOf = () => ({ id: 't', number: 1, name: 'T', par: 3, difficulty: 1, tee: { x: 0, z: 0 }, cup: { x: 0, z: -150 }, green: { cx: 0, cz: -150, rx: 12, rz: 10 }, ob: { x0: -40, x1: 40, z0: -200, z1: 10 }, fairways: [] });
