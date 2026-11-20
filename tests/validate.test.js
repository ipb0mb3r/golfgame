// Gate A T7: bad hole and scenario data fails at load with a clear message naming the hole and field.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateHole, validateScenario } from '../src/core/validate.js';
import { makeBag } from '../src/core/clubs.js';
import { HOLES } from '../src/holes/sets.js';
import { SCENARIOS } from '../src/holes/scenarios.js';

const hole1 = HOLES['pl-01'];
const withChange = change => ({ ...hole1, ...change });

test('the real holes and scenarios pass', () => {
  for (const h of Object.values(HOLES)) assert.equal(validateHole(h), h);
  for (const [id, sc] of Object.entries(SCENARIOS)) assert.equal(validateScenario(id, sc, HOLES), sc);
});

test('a typo in the bag fails, naming the hole and the club', () => {
  assert.throws(() => validateHole(withChange({ bag: ['drvier', '7i', 'putter'] })), /hole "pl-01": bag has an unknown club "drvier"/);
  assert.throws(() => validateHole(withChange({ bag: ['7i', '9i'] })), /bag must include the putter/);
  assert.throws(() => makeBag(['drvier', '7i', 'putter']), /unknown club "drvier"/, 'makeBag no longer drops it silently');
});

test('surfaceOverrides: unknown surfaces and fields fail instead of being ignored or added', () => {
  assert.throws(() => validateHole(withChange({ surfaceOverrides: { grean: { decel: 0.1 } } })), /unknown surface "grean"/);
  assert.throws(() => validateHole(withChange({ surfaceOverrides: { fairway: { decell: 9 } } })), /surfaceOverrides\.fairway has an unknown field "decell"/);
  assert.throws(() => validateHole(withChange({ surfaceOverrides: { green: { decel: '0.8' } } })), /surfaceOverrides\.green\.decel must be a number/);
});

test('surfaceAt returning an unknown surface fails at load, not in prepare()', () => {
  assert.throws(() => validateHole(withChange({ surfaceAt: (x, z) => (z < -100 ? 'lava' : hole1.surfaceAt(x, z)) })), /surfaceAt\(.*\) returned an unknown surface "lava"/);
  assert.throws(() => validateHole(withChange({ heightAt: () => NaN })), /heightAt\(.*\) returned NaN/);
});

test('tee, cup, numbers, map and weather are checked', () => {
  assert.throws(() => validateHole(withChange({ tee: { x: 0, z: NaN } })), /hole "pl-01": tee must be/);
  assert.throws(() => validateHole(withChange({ biome: undefined })), /hole "pl-01": biome must be a biome set id/); // AP5
  assert.throws(() => validateHole(withChange({ cup: { x: 30, z: -40 } })), /the cup is not on the "green" surface/);
  assert.throws(() => validateHole(withChange({ par: 0 })), /par must be a whole number/);
  assert.throws(() => validateHole(withChange({ maxStrokes: 2 })), /maxStrokes \(2\) is below par/);
  assert.throws(() => validateHole(withChange({ map: { x0: 5, x1: -5, z0: 0, z1: 1 } })), /map must be/);
  assert.throws(() => validateHole(withChange({ weather: { type: 'snow', wetness: 0 } })), /weather\.type/);
  assert.throws(() => validateHole(withChange({ weather: { type: 'rain', wetness: 2 } })), /weather\.wetness/);
  assert.throws(() => validateHole(withChange({ id: '' })), /id must be/);
});

test('scenarios: NaN or off-map ball, wrong lie, unknown hole and bad strokes fail with the scenario id', () => {
  const sc = SCENARIOS['h1-bunker'];
  assert.throws(() => validateScenario('x', { ...sc, ball: { x: NaN, z: -147 } }, HOLES), /scenario "x": ball must be/);
  assert.throws(() => validateScenario('x', { ...sc, ball: { x: 500, z: -147 } }, HOLES), /off the map/);
  assert.throws(() => validateScenario('x', { ...sc, lie: 'green' }, HOLES), /sits on "sand", not on the promised lie "green"/);
  assert.throws(() => validateScenario('x', { ...sc, hole: 'pl-09' }, HOLES), /unknown hole "pl-09"/);
  assert.throws(() => validateScenario('x', { ...sc, strokes: 10 }, HOLES), /strokes must be/);
  assert.throws(() => validateScenario('x', { ...sc, seed: 1.5 }, HOLES), /seed must be/);
});

test('S18: the default aim data is checked (green centre, aimTarget when given)', () => {
  const hole2 = HOLES['pl-02'];
  // S21 (PM on PR #53): aimTarget no longer steers the tee aim, so it is optional (the auto-pick then uses the cup)
  assert.equal(validateHole({ ...hole2, aimTarget: undefined }).id, 'pl-02');
  assert.throws(() => validateHole({ ...hole2, aimTarget: { x: 0, z: NaN } }), /aimTarget must be/);
  assert.throws(() => validateHole({ ...hole2, aimTarget: { x: -16, z: -300 } }), /aimTarget \(-16, -300\) is in water/);
  assert.throws(() => validateHole(withChange({ features: { ...hole1.features, green: { cx: 3, cz: -100, rx: 15, rz: 12 } } })), /centre of features\.green .* is not on the "green" surface/);
  assert.throws(() => validateHole(withChange({ features: {} })), /features\.green must be/);
  assert.equal(validateHole(withChange({ aimTarget: undefined })).id, 'pl-01', 'a par 3 needs no aimTarget');
});
