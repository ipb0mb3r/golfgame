// P10 (Gate A T1): every roll on a real hole comes to rest by the rest rules, never by the 40 s
// ROLL_TIMEOUT safety net, and the `stopped` event says why it stopped.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sweep } from './rest-sweep.js';
import { rollFrom, testHole } from './helpers.js';
import { BASE_SURFACES } from '../src/core/surfaces.js';
import { ROLL_TIMEOUT, STOP_SPEED, STOP_TIME, CRAWL_TIME, CREEP } from '../src/core/config.js';

// The longest roll allowed in the sweep (s). The longest today is a 36 m putt on hole 2 that runs down the ridge (~23 s).
const LONGEST = 30;
const timeouts = shots => shots.filter(s => s.ev?.reason === 'timeout' || !s.ev);
const where = s => `${s.kind} from (${s.x}, ${s.z}) power ${s.power}`;

for (const hole of ['pl-01', 'pl-02', 'pl-03']) { // K7: hole 3 has trees, boulders and rock
  test(`P10 sweep ${hole}: putts on the green (2 m grid, 3 powers) never end by the timeout`, () => {
    const shots = sweep(hole, { step: 2, puttPowers: [0.2, 0.5, 0.9], fullPowers: [] }).filter(s => s.kind === 'putt');
    assert.ok(shots.length > 50, `${shots.length} putts`);
    assert.deepEqual(timeouts(shots).map(where), []);
    for (const s of shots) assert.ok(s.rollT < LONGEST, `${where(s)} rolled ${s.rollT.toFixed(1)} s`);
  });
  test(`P10 sweep ${hole}: full shots from the fairway and rough (8 m grid) never end by the timeout`, () => {
    const shots = sweep(hole, { step: 8, puttPowers: [], fullPowers: [0.6, 1] }).filter(s => s.kind === 'full');
    assert.ok(shots.length > 100, `${shots.length} shots`);
    assert.deepEqual(timeouts(shots).map(where), []);
    for (const s of shots) assert.ok(s.rollT < LONGEST, `${where(s)} rolled ${s.rollT.toFixed(1)} s`);
  });
}

test('P10: the stopped event says why (still, settled, timeout)', () => {
  // flat green: slows down and nothing pulls it → still
  const flat = rollFrom(testHole(), 0, 0, 0, -2);
  assert.equal(flat.ev.type, 'stopped');
  assert.equal(flat.ev.reason, 'still');
  // a slope that only just beats the grass: it used to creep for 40 s; now it settles
  const decel = BASE_SURFACES.green.decel, hold = decel * 0.4, k = 9.81 * 5 / 7;
  const g = (hold * 1.02) / k; // pull just above hold
  const slope = testHole({ heightAt: (x, z) => g * z, surfaceAt: () => 'green' });
  const r = rollFrom(slope, 0, 0, 0, 0.2);
  assert.equal(r.ev.type, 'stopped');
  assert.equal(r.ev.reason, 'settled');
  assert.ok(r.play.ball.rollT < CRAWL_TIME + STOP_TIME + 1, `rolled ${r.play.ball.rollT.toFixed(2)} s`);
});

test('P10: a steep slope still makes a resting ball trickle (faster than the grass can hold)', () => {
  // pull well above full friction: the ball keeps rolling and speeding up, it never settles
  const g = 0.3; // 30 %: pull 2.06 m/s², more than any green decel
  const steep = testHole({ heightAt: (x, z) => g * z, surfaceAt: () => 'green' });
  const r = rollFrom(steep, 0, 0, 0, 0, 240 * 3);
  assert.ok(r.play.ball.moving, 'still rolling after 3 s');
  assert.ok(Math.hypot(r.play.ball.vel.x, r.play.ball.vel.z) > CREEP, 'and faster than a crawl');
});

test('P10: a ball moving slower than STOP_SPEED rests after STOP_TIME even while something pulls it', () => {
  // pull just above hold and a crawl below STOP_SPEED from the start
  const decel = BASE_SURFACES.green.decel, hold = decel * 0.4, k = 9.81 * 5 / 7;
  const g = (hold * 1.01) / k; // (the roll divides by 1 + g², so a little margin)
  const slope = testHole({ heightAt: (x, z) => g * z, surfaceAt: () => 'green' });
  const r = rollFrom(slope, 0, 0, 0, STOP_SPEED / 2);
  assert.equal(r.ev.reason, 'settled');
  assert.ok(r.play.ball.rollT <= STOP_TIME + 0.05, `rolled ${r.play.ball.rollT.toFixed(3)} s`);
});
