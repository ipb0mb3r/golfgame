// X14 (owner 2026-11-19: "aiming on PC stutters a lot… not out of bounds, but a lot on the fairway"):
// the aim turns every frame by game time (aimTurn), and the K4 warning's heavy ⚑ search runs as a job a
// few ms per frame (createAimPreview). What the player sees once the aim is still must be exactly what
// play.shotWarning() / play.pinPower() gave before X14.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHolePlay } from '../src/core/play.js';
import { aimTurn, aimSpeedK, createAimPreview } from '../src/core/aimPreview.js';
import { firstHit } from '../src/core/obstacles.js';
import { launchVelocity } from '../src/core/swing.js';
import { dist2D } from '../src/core/vec.js';
import { AIM_SPEED, AIM_SPEED_PUTT, AIM_TURN, G, PHYSICS_DT, LANDING_SIM, MIN_POWER } from '../src/core/config.js';
import { getHole } from '../src/holes/sets.js';

const fresh = (id, off = 0, club = null) => {
  const p = createHolePlay(getHole(id), { seed: 1 });
  p.prepare();
  if (club !== null) p.setClub(club);
  p.setAim(p.aim + off);
  return p;
};
// A clock that moves 1 ms each time it is read: the job's per-frame budget becomes a fixed number of
// steps, so the test is the same on any machine
const tickClock = () => { let t = 0; return () => (t += 1); };
// fairway (a little off the default line), far out of bounds, and a mountain hole's long fairway
const SPOTS = [['pl-03', -0.1], ['pl-03', 1.3], ['mtn-02', -0.15], ['mtn-02', 1.3], ['mtn-04', -0.2], ['mtn-04', 1.3], ['mtn-04', 0.05]];

test('X14: the ⚑ search as a job (stopped after every step) gives exactly pinPower()', () => {
  for (const [id, off] of SPOTS) for (const club of [null, 2, 5]) {
    const p = fresh(id, off, club), ref = fresh(id, off, club).pinPower();
    const job = p.pinPowerJob();
    let frames = 0;
    while (!job.step(() => true)) frames++;
    assert.equal(job.value, ref, `${id} ${off} club ${club}`);
    assert.ok(frames > 5, 'it really was spread over many steps');
    assert.equal(p.pinPowerKnown(), ref, 'and pinPower() knows it from then on');
  }
});

test('X14: a job keeps the aim it started with (it finishes after the aim moved on)', () => {
  const p = fresh('mtn-04', -0.2), a0 = p.aim, ref = fresh('mtn-04', -0.2).pinPower();
  const job = p.pinPowerJob();
  job.step(() => true);
  p.setAim(a0 + 0.05);
  while (!job.step(() => true));
  assert.equal(job.value, ref);
  assert.equal(p.pinPowerKnown(), undefined, 'the new aim is not known yet');
  p.setAim(a0);
  assert.equal(p.pinPowerKnown(), ref, 'cached by club, aim and ball: coming back is free');
});

test('X14: turning, then still: the preview ends on exactly play.shotWarning()', () => {
  for (const [id, off] of SPOTS) {
    const p = fresh(id, off), pv = createAimPreview(p, { clock: tickClock(), budgetMs: 3, gapMs: 120 });
    const a0 = p.aim;
    let deferred = 0;
    for (let k = 0; k < 40; k++) { p.setAim(a0 + k * 0.0075); pv.update(); if (!pv.settled) deferred++; }
    let still = 0;
    let w = pv.update();
    while (!pv.settled) { w = pv.update(); still++; assert.ok(still < 200, 'settles'); }
    w = pv.update();
    assert.deepEqual(w, fresh(id, off + 39 * 0.0075).shotWarning(), `${id} ${off}`);
    if (id === 'mtn-04' && off < 0) assert.ok(deferred > 0 && still > 0, 'on a long fairway the search really is spread over frames');
  }
});

test('X14: club changes and a new shot never leave a stale warning', () => {
  const p = fresh('mtn-04', -0.2), pv = createAimPreview(p, { clock: tickClock(), budgetMs: 3 });
  const settle = () => { let w; do w = pv.update(); while (!pv.settled); return pv.update(); };
  for (const club of [0, 3, 1, p.PUTTER, 2]) {
    for (let k = 0; k < 5; k++) { p.setAim(p.aim + 0.01); pv.update(); }
    p.setClub(club);
    const q = fresh('mtn-04', 0, club); q.setAim(p.aim);
    assert.deepEqual(settle(), q.shotWarning(), `club ${club}`);
  }
  // A new shot from elsewhere: the ⚑ of the old spot must not be used
  p.ball.pos.x += 30; p.ball.pos.z -= 60; p.prepare();
  const q = createHolePlay(getHole('mtn-04'), { seed: 1 }); q.prepare(); q.ball.pos.x += 30; q.ball.pos.z -= 60; q.prepare();
  q.setAim(p.aim); q.setClub(p.clubIdx);
  assert.deepEqual(settle(), q.shotWarning());
});

test('X14: the K4 warning flight (only obstacles near the line) hits exactly what all obstacles would', () => {
  // The flight before X14: the same steps against every obstacle
  const brute = (p, i, a, power) => {
    const { vel } = launchVelocity(p.bag[i], Math.max(power, MIN_POWER), a);
    const q = { ...p.ball.pos }, q0 = { x: 0, y: 0, z: 0 }, h = PHYSICS_DT;
    for (let k = 0, n = LANDING_SIM.maxSteps * LANDING_SIM.dt / h; k < n; k++) {
      Object.assign(q0, q);
      vel.y -= G * h;
      q.x += vel.x * h; q.y += vel.y * h; q.z += vel.z * h;
      const hit = firstHit(p.obstacles, q0, q);
      if (hit) return { kind: hit.kind, index: hit.o.i, x: hit.x, y: hit.y, z: hit.z, dist: dist2D(p.ball.pos, hit) };
      if (q.y <= p.terrain.heightAt(q.x, q.z)) return null;
    }
    return null;
  };
  let hits = 0;
  for (const id of ['pl-03', 'mtn-02', 'mtn-04', 'mtn-03']) {
    const p = fresh(id);
    for (let k = -30; k <= 30; k++) for (const [i, pw] of [[0, 1], [2, 0.7], [5, 0.45]]) {
      const a = p.aim + k * 0.02;
      const w = p.aimWarning(i, a, pw);
      assert.deepEqual(w, brute(p, i, a, pw), `${id} aim ${k} club ${i}`);
      if (w) hits++;
    }
  }
  assert.ok(hits > 20, `the sweep hits trees too (${hits})`);
});

test('X14: holding aim turns the same at any frame rate, slow at first, faster on a long hold', () => {
  const hold = (secs, fps, opts) => { let held = 0, a = 0; const dt = 1 / fps; for (let k = 0; k < Math.round(secs * fps); k++) { a += aimTurn(held, dt, opts); held += dt; } return a; };
  for (const secs of [0.5, 1, 2, 3]) { // whole frames at every rate
    const ref = hold(secs, 60);
    for (const fps of [30, 144, 240]) assert.ok(Math.abs(hold(secs, fps) - ref) < 1e-9, `${secs} s at ${fps} fps`);
  }
  // A one-frame tap is a fine nudge (slower than before X14), the full speed comes after rampS
  assert.ok(aimTurn(0, 1 / 60) < AIM_SPEED / 60 * 0.5);
  assert.equal(aimSpeedK(0), AIM_TURN.startK);
  assert.equal(aimSpeedK(AIM_TURN.rampS), 1);
  assert.ok(Math.abs(aimTurn(0.5, 0.1) - AIM_SPEED * 0.1) < 1e-12, 'between the ramps it is AIM_SPEED');
  assert.ok(Math.abs(aimTurn(5, 0.1) - AIM_SPEED * AIM_TURN.fastK * 0.1) < 1e-12, 'a long hold tops out at fastK');
  // Putter and Shift
  assert.ok(Math.abs(aimTurn(0.5, 0.1, { putter: true }) - AIM_SPEED_PUTT * 0.1) < 1e-12);
  assert.ok(Math.abs(aimTurn(0.5, 0.1, { fine: true }) - AIM_SPEED * AIM_TURN.fineK * 0.1) < 1e-12);
  // The speed never jumps (the profile is continuous)
  for (let s = 0; s < 3; s += 0.01) assert.ok(Math.abs(aimSpeedK(s + 0.01) - aimSpeedK(s)) < 0.03, `at ${s}`);
});
