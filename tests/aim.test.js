// X14 (owner 2026-11-19: "aiming on PC stutters a lot… not out of bounds, but a lot on the fairway"):
// the K4 warning re-ran the ⚑ search (whole rolled-out shots) on every aim frame. PM on PR #65: the
// player's warning is now the full-power arc only (the ⚑ shows on putts only since S22), the warning
// flight only tests obstacles near its line, and a held aim turns every frame by game time (aimTurn).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHolePlay } from '../src/core/play.js';
import { aimTurn, aimSpeedK } from '../src/core/aim.js';
import { firstHit } from '../src/core/obstacles.js';
import { launchVelocity } from '../src/core/swing.js';
import { dist2D } from '../src/core/vec.js';
import { AIM_SPEED, AIM_SPEED_PUTT, AIM_TURN, TUNE, G, PHYSICS_DT, LANDING_SIM, MIN_POWER, setTunable, resetTunables } from '../src/core/config.js';
import { applyTune, resetAllTunables } from '../src/core/tune.js';
import { getHole } from '../src/holes/sets.js';

const fresh = (id, off = 0) => { const p = createHolePlay(getHole(id), { seed: 1 }); p.prepare(); p.setAim(p.aim + off); return p; };

test('X14: the player\'s warning is the full-power arc only, and costs no ⚑ search', () => {
  for (const [id, off] of [['pl-03', -0.1], ['pl-03', 1.3], ['mtn-02', -0.15], ['mtn-04', -0.2], ['mtn-04', 1.3], ['mtn-04', 0.05]]) {
    const p = fresh(id, off);
    for (let k = 0; k < 30; k++) {
      p.setAim(p.aim + 0.0075);
      const full = p.aimWarning(p.clubIdx, p.aim, p.lieOf().maxPower);
      assert.deepEqual(p.shotWarning(), full && { ...full, at: 'full' }, `${id} ${off} ${k}`);
    }
  }
  // a fairway aim step on the heaviest hole is cheap now (it was ~40 ms with the ⚑ search)
  const p = fresh('mtn-04', -0.2), t0 = performance.now();
  for (let k = 0; k < 30; k++) { p.setAim(p.aim + 0.0075); p.shotWarning(); p.aimMarks(); }
  assert.ok((performance.now() - t0) / 30 < 15, 'well under a frame per aim step');
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
  // A one-frame tap is a fine nudge (slower than before X14), the full speed comes after AIM_RAMP_S
  assert.ok(aimTurn(0, 1 / 60) < AIM_SPEED / 60 * 0.5);
  assert.equal(aimSpeedK(0), TUNE.AIM_START_K);
  assert.equal(aimSpeedK(TUNE.AIM_RAMP_S), 1);
  assert.ok(Math.abs(aimTurn(0.5, 0.1) - AIM_SPEED * 0.1) < 1e-12, 'between the ramps it is AIM_SPEED');
  assert.ok(Math.abs(aimTurn(5, 0.1) - AIM_SPEED * TUNE.AIM_FAST_K * 0.1) < 1e-12, 'a long hold tops out at AIM_FAST_K');
  assert.ok(Math.abs(aimTurn(0.5, 0.1, { putter: true }) - AIM_SPEED_PUTT * 0.1) < 1e-12);
  assert.ok(Math.abs(aimTurn(0.5, 0.1, { fine: true }) - AIM_SPEED * TUNE.AIM_FINE_K * 0.1) < 1e-12);
  // The speed never jumps (the profile is continuous)
  for (let s = 0; s < 3; s += 0.01) assert.ok(Math.abs(aimSpeedK(s + 0.01) - aimSpeedK(s)) < 0.03, `at ${s}`);
  assert.ok(AIM_TURN.fastAfterS > 1, 'the long-hold speed-up starts after the start ramp');
});

test('X14 (PM on PR #65): the aim ramp is tunable with ?tune=', () => {
  try {
    applyTune('AIM_START_K:1,AIM_RAMP_S:0.5,AIM_FAST_K:2,AIM_FINE_K:0.5');
    assert.equal(aimSpeedK(0), 1, 'start at full speed');
    assert.ok(Math.abs(aimTurn(0, 0.1) - AIM_SPEED * 0.1) < 1e-12);
    assert.ok(Math.abs(aimTurn(5, 0.1) - AIM_SPEED * 2 * 0.1) < 1e-12);
    assert.ok(Math.abs(aimTurn(0.6, 0.1, { fine: true }) - AIM_SPEED * 0.5 * 0.1) < 1e-12);
    setTunable('AIM_START_K', 0.2); setTunable('AIM_RAMP_S', 1);
    assert.ok(Math.abs(aimSpeedK(0.5) - 0.6) < 1e-12, 'halfway up the ramp');
    for (const fps of [30, 144]) {
      const hold = f => { let held = 0, a = 0; for (let k = 0; k < 2 * f; k++) { a += aimTurn(held, 1 / f); held += 1 / f; } return a; };
      assert.ok(Math.abs(hold(fps) - hold(60)) < 1e-9, `tuned, still frame-rate independent (${fps} fps)`);
    }
  } finally { resetAllTunables?.(); resetTunables(); }
});
