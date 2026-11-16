import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMeter, pressMeter, tickMeter, resolveShot, accuracyError, shotLabel } from '../src/core/swing.js';
import { CLUBS } from '../src/core/clubs.js';
import { SWEET, METER_MIN, G, setTunable, resetTunables } from '../src/core/config.js';

const base = { club: CLUBS['7i'], power: 0.8, acc: 0, aim: 0.1, lieFactor: 1, puttMax: 10, greenDecel: 1.1 };

test('same inputs always give the same launch', () => {
  assert.deepEqual(resolveShot({ ...base, acc: 0.07 }), resolveShot({ ...base, acc: 0.07 }));
  assert.deepEqual(resolveShot({ ...base, club: CLUBS.putter }), resolveShot({ ...base, club: CLUBS.putter }));
});

test('early and late timings curve in opposite directions (hook left, slice right)', () => {
  const aim = 0; // facing −z, so +x is right
  const hook = resolveShot({ ...base, aim, acc: 0.08 }), slice = resolveShot({ ...base, aim, acc: -0.08 });
  assert.ok(hook.curve.x < 0, 'hook curves left');
  assert.ok(slice.curve.x > 0, 'slice curves right');
  assert.ok(Math.abs(hook.curve.x + slice.curve.x) < 1e-12, 'same size for the same error');
  assert.equal(hook.label, 'Hook!'); assert.equal(slice.label, 'Slice!');
});

test('inside the sweet spot the shot is straight', () => {
  assert.equal(accuracyError(SWEET), 0);
  assert.equal(accuracyError(-SWEET), 0);
  assert.ok(resolveShot({ ...base, acc: SWEET * 0.9 }).curve.x === 0);
  assert.equal(shotLabel(1, 0), 'Perfect!');
  assert.equal(shotLabel(0.5, 0), 'Nice shot!');
});

test('power 0 and power 1 are handled without errors', () => {
  for (const club of Object.values(CLUBS)) for (const power of [0, 1]) {
    const s = resolveShot({ ...base, club, power });
    for (const v of [s.vel.x, s.vel.y, s.vel.z, s.curve.x, s.curve.z]) assert.ok(Number.isFinite(v), `${club.id} power ${power}`);
    assert.ok(Math.hypot(s.vel.x, s.vel.z) > 0, 'power 0 still moves the ball a little');
  }
});

test('a full straight shot carries the club distance on flat ground', () => {
  const s = resolveShot({ ...base, power: 1, aim: 0 });
  const t = 2 * s.vel.y / G;
  assert.ok(Math.abs(-s.vel.z * t - CLUBS['7i'].carry) < 1e-9);
});

test('a putt starts at v0 = √(2·decel·D)', () => {
  const s = resolveShot({ ...base, club: CLUBS.putter, power: 0.5, aim: 0 });
  assert.equal(s.kind, 'putt');
  assert.ok(Math.abs(Math.hypot(s.vel.x, s.vel.z) - Math.sqrt(2 * 1.1 * 5)) < 1e-12);
});

test('meter: three clicks give power then accuracy', () => {
  const m = createMeter();
  assert.equal(pressMeter(m), null); assert.equal(m.phase, 'power');
  tickMeter(m, 0.6);
  assert.equal(pressMeter(m), null); assert.equal(m.phase, 'accuracy'); assert.ok(Math.abs(m.power - 0.6) < 1e-12);
  tickMeter(m, 0.55);
  const shot = pressMeter(m);
  assert.ok(Math.abs(shot.power - 0.6) < 1e-12);
  assert.ok(Math.abs(shot.acc - 0.05) < 1e-12);
});

test('meter: reaching the top starts the grace window (S8), a click there locks power at 1', () => {
  const m = createMeter();
  pressMeter(m);
  tickMeter(m, 1.05);
  assert.equal(m.phase, 'grace'); assert.equal(m.event, 'max');
  assert.equal(pressMeter(m), null);
  assert.equal(m.phase, 'accuracy'); assert.equal(m.power, 1);
  let shot = null;
  for (let i = 0; i < 100 && !shot; i++) shot = tickMeter(m, 0.05);
  assert.deepEqual(shot, { power: 1, acc: METER_MIN, outcome: 'shank' });
});

test('S10: the sweet spot is ±SWEET and CURVE_SHAPE sets how a miss grows', () => {
  assert.equal(SWEET, 0.05, 'starting value from the designer playtest');
  assert.equal(accuracyError(0.049), 0);
  assert.equal(accuracyError(0.08), 0.08, 'shape 1 = linear, error = acc as before');
  try {
    setTunable('CURVE_SHAPE', 2);
    assert.ok(Math.abs(accuracyError(0.08) - 0.2 * (0.08 / 0.2) ** 2) < 1e-12, 'quadratic');
    assert.ok(accuracyError(0.08) < 0.08, 'small misses curve gently');
    assert.ok(Math.abs(accuracyError(-0.2) + 0.2) < 1e-12, 'same error as linear at the end of the meter');
    assert.ok(accuracyError(-0.1) < 0 && accuracyError(0.1) > 0, 'signs kept');
  } finally { resetTunables(); }
});
