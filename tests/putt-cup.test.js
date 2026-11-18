// Gate A T5 (putt accuracy) and T6 (cup rules). DESIGN §3, §4 "Cup", §6.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testHole } from './helpers.js';
import { createHolePlay } from '../src/core/play.js';
import { resolveShot } from '../src/core/swing.js';
import { CLUBS } from '../src/core/clubs.js';
import { CUP_R, CUP_FLY_IN, LIP_OUT, PUTT, METER_MIN } from '../src/core/config.js';

const deg = r => r * 180 / Math.PI;
const putt = (acc, outcome = 'normal') => resolveShot({ club: CLUBS.putter, power: 0.5, acc, aim: 0, puttMax: 10, greenDecel: 1.1, outcome, lie: { maxPower: 1, sweetScale: 1.5 } });
// Direction of a putt in degrees: > 0 = right of the aim line (x = right, holes play toward −z)
const angle = s => deg(Math.atan2(s.dir.x, -s.dir.z));

// --- T5 putt accuracy, since S14: a putt is always struck straight (owner, 2026-11-18) ---
test('T5 / S14: a putt goes exactly along the aim whatever acc or outcome says (no pull, push or curve)', () => {
  for (let a = METER_MIN; a <= 1 + 1e-9; a += 0.01) {
    for (const outcome of ['normal', 'shank', 'topped']) {
      const s = putt(a, outcome);
      assert.equal(s.kind, 'putt');
      assert.equal(s.err, 0, `acc ${a.toFixed(2)} ${outcome}: no error`);
      assert.equal(angle(s), 0, `acc ${a.toFixed(2)} ${outcome}: straight`);
      assert.deepEqual(s.curve, { x: 0, y: 0, z: 0 });
    }
  }
  // the speed doesn't depend on acc either; a 'shank' (only reachable through testHit) is a normal putt
  const v = s => Math.hypot(s.vel.x, s.vel.z);
  assert.ok(Math.abs(v(putt(0.15)) - v(putt(0))) < 1e-12);
  assert.equal(putt(METER_MIN, 'shank').label, putt(0).label);
  assert.equal(PUTT.aimErrorK, undefined, 'the putt aim error is gone');
});

// --- T6 cup rules ---
const flat = (cup = { x: 0, z: -3 }) => testHole({ cup });
function dropAt(dx, { lipped = false } = {}) {
  const play = createHolePlay(flat(), { seed: 1 });
  play.ball.pos.x = dx; play.ball.pos.z = -3; play.ball.pos.y = 0.01;
  play.ball.launch({ kind: 'full', vel: { x: 0, y: -1, z: 0 }, curve: { x: 0, y: 0, z: 0 }, spinFactor: 1 });
  play.ball.lipped = lipped;
  return play.simulate();
}

test('T6: landing on the fly within CUP_R × 1.4 goes straight in; at 1.5 × it does not', () => {
  assert.equal(CUP_FLY_IN, 1.4);
  assert.deepEqual(dropAt(CUP_R * 1.3), { type: 'holed', how: 'fly' });
  assert.notEqual(dropAt(CUP_R * 1.5).type, 'holed');
});

// A ball at rest-speed placed at (dx, z) relative to the cup, rolling toward it
function rollAt(dx, vx, { lipped = false, seed = 1 } = {}) {
  const play = createHolePlay(flat(), { seed });
  play.ball.pos.x = dx; play.ball.pos.z = -3; play.ball.pos.y = 0;
  play.ball.launch({ kind: 'putt', vel: { x: vx, y: 0, z: 0 }, curve: { x: 0, y: 0, z: 0 }, spinFactor: 1 });
  play.ball.lipped = lipped;
  const events = [];
  for (let i = 0; i < 240 * 60 && play.ball.moving; i++) { const ev = play.step(); if (ev) events.push(ev); }
  return { events, end: events.at(-1), play };
}

test('T6: a ball at rest over the cup drops, even right after a lip-out', () => {
  // lipped = true: the "over the cup" capture is off, so only the rest rule can drop it
  const r = rollAt(CUP_R * 0.5, 0, { lipped: true });
  assert.deepEqual(r.end, { type: 'holed', how: 'roll' });
});

test('T6: exactly on the cup edge (distance = CUP_R) the ball stays out', () => {
  const r = rollAt(CUP_R, 0);
  assert.equal(r.end.type, 'stopped');
});

test('T6: after a lip-out the ball can only drop again once it has been more than CUP_R × 1.5 away', () => {
  assert.equal(LIP_OUT.rearm, 1.5);
  // Still "lipped" and starting 1.4 × CUP_R out: it rolls slowly across the cup and doesn't drop
  const near = rollAt(CUP_R * 1.4, -1.5, { lipped: true });
  assert.notEqual(near.end.type, 'holed');
  assert.ok(near.play.ball.pos.x < -CUP_R, 'rolled across and out the other side');
  // Starting 1.6 × CUP_R out it re-arms on the way in and drops
  assert.deepEqual(rollAt(CUP_R * 1.6, -1.5, { lipped: true }).end, { type: 'holed', how: 'roll' });
});

test('T6: a lip-out keeps LIP_OUT.keep (60%) of the speed', () => {
  assert.equal(LIP_OUT.keep, 0.6);
  const play = createHolePlay(flat(), { seed: 3 });
  play.ball.pos.x = 0.4; play.ball.pos.z = -3; play.ball.pos.y = 0;
  play.ball.launch({ kind: 'putt', vel: { x: -5, y: 0, z: 0 }, curve: { x: 0, y: 0, z: 0 }, spinFactor: 1 });
  let before = 0;
  for (let i = 0; i < 2400; i++) {
    before = Math.hypot(play.ball.vel.x, play.ball.vel.z);
    const ev = play.step();
    if (ev?.type === 'lippedOut') break;
  }
  const after = Math.hypot(play.ball.vel.x, play.ball.vel.z);
  // one step of green friction (1.1 m/s² × 1/240 s) is taken before the lip-out
  assert.ok(Math.abs(after - before * LIP_OUT.keep) < 0.01, `${before.toFixed(3)} → ${after.toFixed(3)} m/s`);
});

test('T6: a lipped ball that rolls back down a slope into the cup drops', () => {
  // The green rises 10% past the cup (z < -3). A firm putt lips out, runs up, rolls back and drops.
  const hole = testHole({ cup: { x: 0, z: -3 }, heightAt: (x, z) => (z < -3 ? (-3 - z) * 0.1 : 0) });
  let found = null;
  for (let seed = 1; seed <= 40 && !found; seed++) {
    const play = createHolePlay(hole, { seed });
    play.ball.pos.x = 0; play.ball.pos.z = -2.5; play.ball.pos.y = 0;
    play.ball.launch({ kind: 'putt', vel: { x: 0, y: 0, z: -3.6 }, curve: { x: 0, y: 0, z: 0 }, spinFactor: 1 });
    const evs = [];
    for (let i = 0; i < 240 * 60 && play.ball.moving; i++) { const ev = play.step(); if (ev) evs.push(ev.type); }
    if (evs[0] === 'lippedOut' && evs.at(-1) === 'holed') found = { seed, evs };
  }
  assert.ok(found, 'some seed lips out first and then drops on the way back');
  assert.equal(found.seed, 6, 'deterministic: the same seed every run (6 since S17 made the green faster; was 1)');
});
