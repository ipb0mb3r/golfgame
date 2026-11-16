// X8: ?tune= overrides: whitelisted names only, numbers only, clamped, and they really change the game.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { parseTune, applyTune, tuneSummary } from '../src/core/tune.js';
import * as config from '../src/core/config.js';
import { accuracyError } from '../src/core/swing.js';
import { scriptedSwing } from './helpers.js';

afterEach(() => config.resetTunables());

test('a valid tune link is read and applied', () => {
  const r = applyTune('SWEET:0.08,CURVE_SHAPE:2');
  assert.deepEqual(r.rejected, []);
  assert.deepEqual(r.set, [{ name: 'SWEET', value: 0.08, asked: 0.08 }, { name: 'CURVE_SHAPE', value: 2, asked: 2 }]);
  assert.equal(config.SWEET, 0.08);
  assert.equal(config.CURVE_SHAPE, 2);
  assert.equal(accuracyError(0.07), 0, 'the core sees the new SWEET');
  assert.equal(tuneSummary(r), 'SWEET 0.08 · CURVE_SHAPE 2');
});

test('names are case-insensitive and spaces are ignored', () => {
  const r = applyTune(' sweet : 0.06 , ');
  assert.deepEqual(r.set, [{ name: 'SWEET', value: 0.06, asked: 0.06 }]);
  assert.equal(config.SWEET, 0.06);
});

test('unknown names, non-numbers and non-whitelisted config values are rejected', () => {
  const r = applyTune('G:20,METER_MIN:-1,SWEET:abc,SWEET:1e3,SWEET:,__proto__:1,constructor:2,CURVE_K:Infinity,CUP_R:9');
  assert.deepEqual(r.set, []);
  assert.equal(r.rejected.length, 9);
  assert.equal(config.G, 9.81);
  assert.equal(config.SWEET, config.defaultTunable('SWEET'));
  assert.throws(() => config.setTunable('G', 1));
});

test('values are clamped to the allowed range', () => {
  const r = applyTune('SWEET:5,POWER_GRACE:-3');
  assert.equal(config.SWEET, config.TUNABLES.SWEET.max);
  assert.equal(config.POWER_GRACE, config.TUNABLES.POWER_GRACE.min);
  assert.match(tuneSummary(r), /SWEET 0.2 \(clamped\)/);
});

test('the last value for a name wins', () => {
  applyTune('SWEET:0.04,SWEET:0.07');
  assert.equal(config.SWEET, 0.07);
});

test('every whitelisted tunable has a sane range that holds its default', () => {
  for (const [name, { min, max }] of Object.entries(config.TUNABLES)) {
    assert.ok(Number.isFinite(min) && Number.isFinite(max) && min < max, name);
    const d = config.defaultTunable(name);
    assert.ok(d >= min && d <= max, `${name} default ${d} in [${min}, ${max}]`);
    assert.equal(config[name], d);
  }
});

test('an empty or missing tune changes nothing', () => {
  for (const s of [null, undefined, '', ',,']) assert.deepEqual(parseTune(s), { set: [], rejected: [] });
});

test('a tuned POWER_GRACE changes the meter', () => {
  applyTune('POWER_GRACE:0.3');
  assert.equal(scriptedSwing([1.25, 2.25]).result.power, 1, 'inside the longer window');
  config.resetTunables();
  assert.equal(scriptedSwing([1.25]).result.outcome, 'topped', 'outside the default window');
});
