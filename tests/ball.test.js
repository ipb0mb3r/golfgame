import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testHole, rollFrom } from './helpers.js';
import { createHolePlay } from '../src/core/play.js';
import { BASE_SURFACES } from '../src/core/surfaces.js';
import { STATIC, ROLL_G, CUP_R } from '../src/core/config.js';
import hole1 from '../src/holes/hole1.js';
import hole2 from '../src/holes/hole2.js';

const ROLLING = ['tee', 'fairway', 'fringe', 'green', 'rough', 'sand'];

test('flat roll distance per surface ≈ v²/(2·decel), a little longer from the slow-speed trickle', () => {
  for (const s of ROLLING) {
    const v0 = 4, expect = v0 * v0 / (2 * BASE_SURFACES[s].decel);
    const { pos, ev } = rollFrom(testHole({ surfaceAt: () => s }), 0, 0, 0, -v0);
    assert.equal(ev.type, 'stopped');
    const d = -pos.z;
    assert.ok(d >= expect * 0.97 && d <= expect * 1.06 + 0.05, `${s}: rolled ${d.toFixed(3)} m, expected ≈${expect.toFixed(3)} m`);
  }
});

test('rougher surfaces stop the ball sooner', () => {
  const dist = s => -rollFrom(testHole({ surfaceAt: () => s }), 0, 0, 0, -5).pos.z;
  assert.ok(dist('green') > dist('fairway'));
  assert.ok(dist('fairway') > dist('rough'));
  assert.ok(dist('rough') > dist('sand'));
});

test('on a flat green a putt with power p stops within ±5% of p × puttMax', () => {
  for (const p of [0.3, 0.6, 1]) {
    const play = createHolePlay(testHole({ cup: { x: 0, z: -40 } }), { seed: 1 });
    play.prepare();
    play.clubIdx = play.PUTTER;
    play.hit(p, 0);
    play.simulate();
    const target = p * play.puttMax, d = -play.ball.pos.z;
    assert.ok(Math.abs(d - target) <= target * 0.05, `power ${p}: ${d.toFixed(2)} m vs ${target.toFixed(2)} m`);
  }
});

test('from the same speed, an uphill roll is shorter than a downhill roll', () => {
  const slope = testHole({ heightAt: (x, z) => -0.04 * z }); // rises toward −z
  const up = -rollFrom(slope, 0, 0, 0, -4).pos.z;
  const down = rollFrom(slope, 0, 0, 0, 4).pos.z;
  const flat = -rollFrom(testHole(), 0, 0, 0, -4).pos.z;
  assert.ok(up < flat && flat < down, `up ${up.toFixed(2)} flat ${flat.toFixed(2)} down ${down.toFixed(2)}`);
});

test('a ball at rest stays put on a gentle slope and creeps down a steep one', () => {
  const decel = BASE_SURFACES.green.decel, hold = decel * STATIC;
  const gentle = (hold / ROLL_G) * 0.5, steep = (hold / ROLL_G) * 3;
  const still = rollFrom(testHole({ heightAt: (x, z) => gentle * z }), 0, 0, 0, 0);
  assert.equal(still.ev.type, 'stopped');
  assert.ok(Math.hypot(still.pos.x, still.pos.z) < 1e-9, 'did not move');
  const creep = rollFrom(testHole({ heightAt: (x, z) => steep * z }), 0, 0, 0, 0, 240 * 3);
  assert.ok(creep.pos.z < -0.3, `crept ${(-creep.pos.z).toFixed(2)} m downhill`);
});

test("hole 2: a ball on the step between the green's tiers trickles down, one on the flat upper tier stays", () => {
  const step = rollFrom(hole2, 22, -442, 0, 0, 240 * 20);
  assert.ok(step.pos.z > -442 + 0.5, `moved off the step to z = ${step.pos.z.toFixed(2)}`);
  const top = rollFrom(hole2, 22, -447.5, 0, 0);
  assert.equal(top.ev.type, 'stopped');
  assert.ok(Math.hypot(top.pos.x - 22, top.pos.z + 447.5) < 1e-9, 'upper tier ball did not move');
});

test('hole 1 is flat: slopes are exactly zero everywhere', () => {
  const play = createHolePlay(hole1);
  for (const [x, z] of [[0, 0], [4, -152], [-20, -92], [30, -100]]) {
    const g = play.terrain.gradAt(x, z), n = play.terrain.normalAt(x, z);
    assert.deepEqual([g.x, g.z, n.x, n.y, n.z], [0, 0, -0, 1, -0]);
  }
});

test('cup: a slow ball over the cup drops, a fast one lips out', () => {
  const hole = testHole({ cup: { x: 0, z: -3 } });
  const slow = rollFrom(hole, 0, 0, 0, -2.6);
  assert.deepEqual(slow.ev, { type: 'holed', how: 'roll' });
  const fast = rollFrom(hole, 0, 0, 0, -8);
  assert.ok(fast.events.some(e => e.type === 'lippedOut'), 'lipped out');
  assert.notEqual(fast.ev.type, 'holed');
  assert.ok(Math.hypot(fast.pos.x, fast.pos.z + 3) > CUP_R, 'ended away from the cup');
});

test('G8: a ball faster than the capture speed stays out at realistic speeds (3.5–5 m/s)', () => {
  const hole = testHole({ cup: { x: 0, z: -3 } });
  let lips = 0;
  for (const v of [3.5, 4, 4.5, 5]) {
    // v is the speed at the cup: start 0.4 m short of it so the green barely slows the ball first.
    // Straight over the middle and off-centre, with several seeds so the random deflection varies.
    for (const x0 of [0, 0.08, -0.15]) for (let seed = 1; seed <= 25; seed++) {
      const play = createHolePlay(hole, { seed });
      play.ball.pos.x = x0; play.ball.pos.z = -2.6; play.ball.pos.y = 0;
      play.ball.launch({ kind: 'putt', vel: { x: 0, y: 0, z: -v }, curve: { x: 0, y: 0, z: 0 }, spinFactor: 1 });
      const events = [];
      for (let i = 0; i < 240 * 60 && play.ball.moving; i++) { const ev = play.step(); if (ev) events.push(ev); }
      assert.ok(events.some(e => e.type === 'lippedOut'), `${v} m/s x ${x0} seed ${seed}: lipped out`);
      assert.notEqual(events.at(-1).type, 'holed', `${v} m/s x ${x0} seed ${seed}: stayed out`);
      lips++;
    }
  }
  assert.equal(lips, 4 * 3 * 25);
});

test('G8: just under the capture speed still drops', () => {
  const hole = testHole({ cup: { x: 0, z: -3 } });
  for (const v of [2.6, 2.9]) assert.deepEqual(rollFrom(hole, 0, 0, 0, -v).ev, { type: 'holed', how: 'roll' }, `${v} m/s`);
});

test('a ball landing on the fly next to the cup goes straight in', () => {
  const play = createHolePlay(testHole({ cup: { x: 0, z: -2 } }), { seed: 1 });
  play.ball.pos.x = 0; play.ball.pos.z = -2; play.ball.pos.y = 1;
  play.ball.launch({ kind: 'full', vel: { x: 0, y: -1, z: 0 }, curve: { x: 0, y: 0, z: 0 }, spinFactor: 1 });
  assert.deepEqual(play.simulate(), { type: 'holed', how: 'fly' });
});

for (const bad of ['water', 'ob']) {
  test(`${bad}: +1 penalty stroke and the ball goes back to where it was hit from`, () => {
    const hole = testHole({ surfaceAt: (x, z) => (z < -5 ? bad : 'fairway'), cup: { x: 50, z: -50 } });
    const play = createHolePlay(hole, { seed: 1 });
    play.reset();
    play.clubIdx = play.bag.findIndex(c => c.id === 'pw');
    play.aim = 0;
    play.hit(0.5, 0);
    const ev = play.simulate();
    assert.deepEqual(ev, { type: 'penalty', surface: bad });
    assert.equal(play.strokes, 2);
    play.returnToLastPos();
    assert.deepEqual([play.ball.pos.x, play.ball.pos.z], [0, 0]);
    assert.equal(play.lie, 'fairway');
  });
}
