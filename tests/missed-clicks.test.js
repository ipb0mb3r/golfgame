// S8: every row of the "Missed clicks" table in DESIGN §3, on the meter state machine with
// scripted click times. METER_SPEED = 1, so the meter reaches 1 at t = 1 s, the grace window
// ends at 1 + POWER_GRACE, the marker is back at 0 at t = 2 s and at METER_MIN at 2.2 s.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scriptedSwing, testHole } from './helpers.js';
import { resolveShot, swingError } from '../src/core/swing.js';
import { createHolePlay } from '../src/core/play.js';
import { CLUBS } from '../src/core/clubs.js';
import { METER_MIN, POWER_GRACE, NO_ACC_ERR, MISSED_POWER_FRACTION, CURVE_K, CURVE_REF_SPEED } from '../src/core/config.js';

const near = (a, b, tol = 0.005) => Math.abs(a - b) <= tol;
const shotFor = r => resolveShot({ club: CLUBS['7i'], power: r.power, acc: r.acc, aim: 0, lieFactor: 1, puttMax: 10, greenDecel: 1.1, outcome: r.outcome });

test('row 1: all 3 clicks give a normal shot', () => {
  const { result, events } = scriptedSwing([0.7, 1.4]);
  assert.equal(result.outcome, 'normal');
  assert.ok(near(result.power, 0.7), `power ${result.power}`);
  assert.ok(near(result.acc, 0), `acc ${result.acc}`);
  assert.deepEqual(events, [], 'no MAX! or No power');
  assert.equal(shotFor(result).label, 'Nice shot!');
});

test('row 2: a power click within POWER_GRACE after the meter reaches 1 counts as power = 1', () => {
  const late = 1 + POWER_GRACE * 0.6;
  const { result, events } = scriptedSwing([late, 2]); // the marker keeps moving: back at 0 at t = 2
  assert.equal(result.outcome, 'normal');
  assert.equal(result.power, 1);
  assert.ok(near(result.acc, 0), `acc ${result.acc}`);
  assert.equal(events.length, 1);
  assert.equal(events[0].event, 'max', 'MAX! flash when the meter reaches 1');
  assert.ok(near(events[0].t, 1, 0.002));
  assert.equal(shotFor(result).label, 'Perfect!');
});

test('row 2 edge: just inside the grace window is power 1, just outside is a mini shot', () => {
  assert.equal(scriptedSwing([1 + POWER_GRACE - 0.01, 2]).result.power, 1);
  const out = scriptedSwing([1 + POWER_GRACE + 0.01]).result;
  assert.equal(out.outcome, 'topped');
});

test('row 3: start + power and no 3rd click is a huge slice (NO_ACC_ERR, 3× the old forced slice)', () => {
  for (const clicks of [[0.7], [1 + POWER_GRACE / 2]]) {
    const { result } = scriptedSwing(clicks);
    assert.equal(result.outcome, 'shank');
    assert.equal(result.acc, METER_MIN);
    const shot = shotFor(result);
    assert.equal(shot.err, -NO_ACC_ERR);
    assert.equal(shot.label, 'Shanked!');
    assert.ok(shot.curve.x > 0, 'a slice curves right');
    assert.ok(near(NO_ACC_ERR / Math.abs(METER_MIN), 3, 1e-9), 'about 3× the old forced slice');
    const speed = Math.hypot(shot.vel.x, shot.vel.y, shot.vel.z);
    assert.ok(near(shot.curve.x, NO_ACC_ERR * CURVE_K * speed / CURVE_REF_SPEED, 1e-9));
  }
  assert.equal(swingError(0, 'shank'), -NO_ACC_ERR);
});

test('row 4: no power click, then a click on the way back = mini shot with accuracy from the click', () => {
  const { result, events } = scriptedSwing([1.3]);
  assert.deepEqual(events.map(e => e.event), ['max', 'nopower'], 'red "No power" after the grace window');
  assert.ok(near(events[1].t, 1 + POWER_GRACE, 0.002));
  assert.equal(result.outcome, 'topped');
  assert.equal(result.power, MISSED_POWER_FRACTION);
  assert.ok(near(result.acc, 0.7), `acc ${result.acc}`);
  assert.equal(shotFor(result).label, 'Topped!');
  // ... clicking on the impact zone is a straight mini shot
  const straight = scriptedSwing([2]).result;
  assert.equal(straight.outcome, 'topped');
  assert.equal(shotFor(straight).err, 0);
  const full = shotFor({ power: 1, acc: 0, outcome: 'normal' }), mini = shotFor(straight);
  assert.ok(near(mini.vel.z / full.vel.z, Math.sqrt(MISSED_POWER_FRACTION), 1e-9), 'carries MISSED_POWER_FRACTION of a full shot');
});

test('row 5: start only, marker reaches METER_MIN = swing cancelled, no stroke', () => {
  const { result, events } = scriptedSwing([]);
  assert.deepEqual(events.map(e => e.event), ['max', 'nopower']);
  assert.equal(result.outcome, 'cancel');
  const play = createHolePlay(testHole(), { seed: 1 });
  play.reset();
  assert.equal(play.swing(result), null);
  assert.equal(play.strokes, 0, 'a cancelled swing does not count');
  assert.equal(play.ball.moving, false);
  // the other outcomes do cost a stroke
  for (const clicks of [[0.7, 1.4], [0.7], [1.3]]) {
    const p = createHolePlay(testHole(), { seed: 1 }); p.reset();
    assert.ok(p.swing(scriptedSwing(clicks).result));
    assert.equal(p.strokes, 1, `clicks ${clicks}`);
  }
});

test('a long frame that skips the whole grace window still ends in "No power"', () => {
  const { result } = scriptedSwing([], { dt: 0.3 });
  assert.equal(result.outcome, 'cancel');
});

test('extra clicks after the swing ends do nothing', () => {
  const r = scriptedSwing([0.7, 1.4, 1.5, 1.6]);
  assert.equal(r.result.outcome, 'normal');
  assert.equal(r.meter.phase, 'done');
});
