// S14 (owner, 2026-11-18): putting is 2 clicks (start, power), with no accuracy phase, and a putt
// is always struck straight. Full shots and chips keep 3 clicks. DESIGN §3 "Putting: 2 clicks".
// scriptedSwing runs at METER_SPEED 1: the meter reaches 1 at t = 1 s, the grace window ends at
// 1 + POWER_GRACE and the marker is back at 0 at t = 2 s (where a putt meter ends).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scriptedSwing, testHole } from './helpers.js';
import { swingClicks, meterFloor, createMeter, resolveShot } from '../src/core/swing.js';
import { createHolePlay } from '../src/core/play.js';
import { CLUBS } from '../src/core/clubs.js';
import { METER_MIN, TUNE } from '../src/core/config.js';

const { POWER_GRACE, MISSED_POWER_FRACTION } = TUNE;
const near = (a, b, tol = 0.005) => Math.abs(a - b) <= tol;
const putt = (clicks, opts) => scriptedSwing(clicks, { putt: true, ...opts });

test('S14: the putter swings in 2 clicks, every other club in 3', () => {
  for (const [id, club] of Object.entries(CLUBS)) assert.equal(swingClicks(club), id === 'putter' ? 2 : 3, id);
  assert.equal(meterFloor(createMeter(1, true)), 0, 'a putt meter ends at 0 (no accuracy side)');
  assert.equal(meterFloor(createMeter(1)), METER_MIN);
});

test('S14: the power click ends a putt: power from the click, acc 0, outcome normal', () => {
  for (const t of [0.05, 0.3, 0.62, 0.99]) {
    const { result, meter } = putt([t]);
    assert.equal(result.outcome, 'normal');
    assert.ok(near(result.power, t), `power ${result.power} at ${t}`);
    assert.equal(result.acc, 0);
    assert.equal(meter.phase, 'done', 'no accuracy phase');
  }
});

test('S14: a third click after a putt does nothing (the swing is already over)', () => {
  const { result } = putt([0.5, 1.2]);
  assert.ok(near(result.power, 0.5));
  assert.equal(result.outcome, 'normal');
});

test('S14: full shots still take 3 clicks (the power click alone does not end the swing)', () => {
  const { result, meter } = scriptedSwing([0.5]); // no 3rd click: the marker runs to METER_MIN
  assert.equal(result.outcome, 'shank');
  assert.equal(meter.value, METER_MIN);
  const full = scriptedSwing([0.5, 1.0]).result; // the marker turns back at the power click: at 0 again at t = 1
  assert.equal(full.outcome, 'normal'); assert.ok(near(full.acc, 0));
});

// S8 missed clicks on a 2-click putt
test('S14 + S8: a putt power click in the grace window is power = 1 ("MAX!")', () => {
  const { result, events } = putt([1 + POWER_GRACE * 0.6]);
  assert.deepEqual(result, { power: 1, acc: 0, outcome: 'normal' });
  assert.deepEqual(events.map(e => e.event), ['max']);
});

test('S14 + S8: the grace window applies at the cap too', () => {
  const { result } = putt([0.8 + POWER_GRACE * 0.5], { cap: 0.8 });
  assert.deepEqual(result, { power: 0.8, acc: 0, outcome: 'normal' });
});

test('S14 + S8: no power click, then a click on the way back is a mini putt (straight)', () => {
  const { result, events } = putt([1 + POWER_GRACE + 0.2]);
  assert.deepEqual(result, { power: MISSED_POWER_FRACTION, acc: 0, outcome: 'topped' });
  assert.deepEqual(events.map(e => e.event), ['max', 'nopower']);
});

test('S14 + S8: start only cancels the putt when the marker is back at 0 (no stroke)', () => {
  const { result, events, meter } = putt([]);
  assert.equal(result.outcome, 'cancel');
  assert.equal(meter.value, 0);
  assert.ok(near(events.at(-1).t, 1 + POWER_GRACE));
  // the cancel comes at t = 2 s (back at 0), not at 2.2 s (METER_MIN) like a full swing
  assert.equal(putt([], { maxT: 1.99 }).result, null);
  assert.equal(putt([1.99]).result.outcome, 'topped');
  const play = createHolePlay(testHole(), { seed: 1 });
  assert.equal(play.swing(result), null); assert.equal(play.strokes, 0);
});

test('S14: a putt never curves, whatever the click timing (meter → play.swing on a flat green)', () => {
  const hole = testHole({ cup: { x: 0, z: -40 } });
  // every second-click time from start to after the cancel, every 7 ms, plus a missed power click
  for (let t = 0.02; t <= 2.05; t += 0.007) {
    const { result } = putt([t]);
    const play = createHolePlay(hole, { seed: 1 });
    play.ball.pos.z = -30; play.prepare();
    assert.ok(play.club.putter, 'on the green the putter is picked');
    const aim = play.aim;
    const shot = play.swing(result);
    if (result.outcome === 'cancel') { assert.equal(shot, null); continue; }
    assert.equal(shot.kind, 'putt');
    assert.equal(shot.err, 0, `t ${t.toFixed(3)}: no error`);
    assert.ok(Math.abs(Math.atan2(shot.dir.x, -shot.dir.z) - aim) < 1e-12, `t ${t.toFixed(3)}: along the aim`);
  }
});

test('S14: a chip from the green with a club (not the putter) keeps the accuracy click and can curve', () => {
  const s = resolveShot({ club: CLUBS.pw, power: 0.3, acc: 0.15, aim: 0, puttMax: 10, greenDecel: 1.1 });
  assert.equal(s.kind, 'full');
  assert.ok(s.err > 0);
});
