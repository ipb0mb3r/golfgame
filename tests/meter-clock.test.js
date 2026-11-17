// S16 (Gate A C3): the meter reads the real click time, not the last frame. The same click times
// give the same swing at any frame rate. Plus the missed-click constants the PM asked to pin
// (PR #24): POWER_GRACE, the grace edge (<=) and MISSED_POWER_FRACTION.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { scriptedSwing } from './helpers.js';
import { createMeter, pressMeterAt, tickMeterTo, tickMeter, pressMeter } from '../src/core/swing.js';
import { TUNABLES, TUNE, MAX_METER_DT, METER_MIN } from '../src/core/config.js';
import { applyTune, resetAllTunables } from '../src/core/tune.js';

afterEach(() => resetAllTunables());

const FPS = [30, 60, 144];
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;

test('S16: the same click times give the same swing at 30, 60 and 144 fps (default meter speed)', () => {
  // Gate A C3's example (0, 0.9 s, 1.84 s), a few others, and a first click between two frames
  const swings = [[0.9, 1.84], [0.55, 1.07], [0.3, 0.61], [0.75, 1.5]];
  for (const clicks of swings) {
    for (const start of [0, 0.0123, 0.031]) {
      const results = FPS.map(f => scriptedSwing(clicks, { dt: 1 / f, start }).result);
      for (const r of results) {
        assert.equal(r.outcome, results[0].outcome);
        assert.ok(near(r.power, results[0].power), `power ${r.power} vs ${results[0].power} (clicks ${clicks}, start ${start})`);
        assert.ok(near(r.acc, results[0].acc), `acc ${r.acc} vs ${results[0].acc} (clicks ${clicks}, start ${start})`);
      }
    }
  }
});

test('S16: the meter is read at the moment of the click (METER_SPEED 1: C3 example = power 0.9, acc −0.04)', () => {
  applyTune('METER_SPEED:1');
  for (const f of FPS) {
    const r = scriptedSwing([0.9, 1.84], { dt: 1 / f, start: 0.007 }).result;
    assert.ok(near(r.power, 0.9), `${f} fps: power ${r.power}`);
    assert.ok(near(r.acc, -0.04), `${f} fps: acc ${r.acc}`); // before S16: −0.067 at 30 fps, −0.035 at 144 fps
  }
  // at the default speed the marker moves METER_SPEED units per second
  const r = scriptedSwing([0.5, 1.0], { dt: 1 / 30 }).result;
  resetAllTunables();
  const r2 = scriptedSwing([0.5, 1.0], { dt: 1 / 144 }).result;
  assert.ok(near(r2.power, 0.5 * TUNE.METER_SPEED), `power ${r2.power}`);
  assert.ok(near(r.power, 0.5), 'METER_SPEED:1 run');
});

test('S16: grace and no-power windows are timed from the click too, at any frame rate', () => {
  applyTune('METER_SPEED:1');
  for (const f of FPS) {
    assert.equal(scriptedSwing([1 + TUNE.POWER_GRACE - 0.002, 2], { dt: 1 / f, start: 0.01 }).result.power, 1, `${f} fps: inside the grace window`);
    assert.equal(scriptedSwing([1 + TUNE.POWER_GRACE + 0.002], { dt: 1 / f, start: 0.01 }).result.outcome, 'topped', `${f} fps: just after it`);
  }
});

test('S16: a click after the marker already reached the end between two frames does nothing more', () => {
  applyTune('METER_SPEED:1');
  const m = createMeter();
  const frames = to => { for (let t = Math.ceil(m.t * 100) / 100; t <= to + 1e-9; t += 0.01) tickMeterTo(m, t); };
  pressMeterAt(m, 10);           // start
  frames(10.5); pressMeterAt(m, 10.5); // power 0.5
  frames(11.15);                 // marker at −0.15
  assert.equal(m.phase, 'accuracy');
  const r = pressMeterAt(m, 11.22); // the marker passed METER_MIN (−0.2) at 11.2: a shank, not an accuracy click
  assert.equal(r.outcome, 'shank');
  assert.equal(r.acc, METER_MIN);
  assert.ok(near(r.power, 0.5));
});

test('S16: the meter clock never runs backwards and each move is capped at MAX_METER_DT', () => {
  applyTune('METER_SPEED:1');
  const m = createMeter();
  pressMeterAt(m, 5);
  tickMeterTo(m, 5.05);
  assert.ok(near(m.value, 0.05));
  tickMeterTo(m, 5.01); // an earlier time: nothing moves
  assert.ok(near(m.value, 0.05));
  assert.equal(m.t, 5.05);
  tickMeterTo(m, 9); // a 4 s stall moves the marker only MAX_METER_DT
  assert.ok(near(m.value, 0.05 + MAX_METER_DT));
});

// ---- Pinned missed-click constants (PM on PR #24). These numbers are the designer's S8 feel: a
// change here must be a decision, so the test names the value instead of reading it from config.
test('pinned: POWER_GRACE = 0.15 s and MISSED_POWER_FRACTION = 0.15 by default', () => {
  assert.equal(TUNABLES.POWER_GRACE.def, 0.15);
  assert.equal(TUNABLES.MISSED_POWER_FRACTION.def, 0.15);
  assert.equal(TUNE.POWER_GRACE, 0.15);
  assert.equal(TUNE.MISSED_POWER_FRACTION, 0.15);
  // the mini shot really uses it
  applyTune('METER_SPEED:1');
  assert.equal(scriptedSwing([1.3]).result.power, 0.15);
});

test('pinned: the grace edge is inclusive (a click exactly POWER_GRACE after the top still counts)', () => {
  // Exact binary numbers so the edge is hit exactly: METER_SPEED 1, POWER_GRACE 0.25
  applyTune('METER_SPEED:1,POWER_GRACE:0.25');
  // the meter reaches the top on one tick, then ticks exactly POWER_GRACE more
  let m = createMeter(); pressMeter(m);
  tickMeter(m, 1); assert.equal(m.phase, 'grace');
  tickMeter(m, 0.25); assert.equal(m.phase, 'grace', 'graceT == POWER_GRACE is still inside');
  pressMeter(m); assert.equal(m.power, 1);
  // one long tick that skips past the top by exactly POWER_GRACE
  m = createMeter(); pressMeter(m);
  tickMeter(m, 1.25); assert.equal(m.phase, 'grace', 'overshoot == POWER_GRACE is still inside');
  // a hair later is outside
  m = createMeter(); pressMeter(m);
  tickMeter(m, 1); tickMeter(m, 0.25 + 2 ** -20); assert.equal(m.phase, 'nopower');
  m = createMeter(); pressMeter(m);
  tickMeter(m, 1.25 + 2 ** -20); assert.equal(m.phase, 'nopower');
});
