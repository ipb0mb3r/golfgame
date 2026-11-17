// S11: the lie on the meter (DESIGN §3 "Lie: power cap and accuracy window").
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { testHole, scriptedSwing } from './helpers.js';
import { createHolePlay } from '../src/core/play.js';
import { BASE_SURFACES } from '../src/core/surfaces.js';
import { CLUBS, lieFor } from '../src/core/clubs.js';
import { accuracyError, sweetHalfWidth, resolveShot, createMeter, pressMeter, tickMeter } from '../src/core/swing.js';
import { TUNE, AUTO_CLUB_REACH, METER_MIN } from '../src/core/config.js';
import { applyTune, resetAllTunables } from '../src/core/tune.js';

afterEach(() => resetAllTunables());
const { SWEET, POWER_GRACE } = TUNE; // the defaults
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// A flat hole where the ball sits on `lie` and the cup is far away (so a shot never drops)
function playOn(lie, clubId = '7i', cupZ = -400) {
  const play = createHolePlay(testHole({ surfaceAt: (x, z) => (z > -5 ? lie : 'fairway'), cup: { x: 0, z: cupZ } }), { seed: 1 });
  play.reset();
  play.clubIdx = play.bag.findIndex(c => c.id === clubId);
  return play;
}
// Where the ball first touches the ground, measured from where it was hit
function carryOf(play, power, acc = 0) {
  const from = { ...play.ball.pos };
  const shot = play.hit(power, acc);
  for (let i = 0; i < 240 * 30; i++) { const ev = play.step(); if (ev?.type === 'landed' || ev?.type === 'penalty') break; }
  return { carry: Math.hypot(play.ball.pos.x - from.x, play.ball.pos.z - from.z), shot };
}

test('the starting values from the design table', () => {
  const t = { tee: [1, 1.2], fairway: [1, 1], fringe: [0.95, 1], rough: [0.85, 0.7], sand: [0.6, 0.5], green: [1, 1.5] };
  for (const [id, [maxPower, sweetScale]] of Object.entries(t)) assert.deepEqual(lieFor(CLUBS['7i'], id, BASE_SURFACES), { maxPower, sweetScale }, id);
  assert.deepEqual(lieFor(CLUBS.putter, 'green', BASE_SURFACES), { maxPower: 1, sweetScale: 1.5 });
});

test('cap enforced: the meter turns around at the cap and S8 applies there', () => {
  const cap = 0.85;
  // the marker reaches the cap at t = 0.85 s: MAX! there, a grace click gives power = cap
  const g = scriptedSwing([cap + POWER_GRACE / 2, 2 * cap], { cap });
  assert.equal(g.events[0].event, 'max');
  assert.ok(near(g.events[0].t, cap, 0.002));
  assert.equal(g.result.power, cap);
  assert.ok(near(g.result.acc, 0, 0.005), 'back at 0 after 2 × cap seconds');
  // missed power: red after the grace window counted from the cap; mini shot; start-only cancels
  const t = scriptedSwing([cap + POWER_GRACE + 0.05], { cap });
  assert.deepEqual(t.events.map(e => e.event), ['max', 'nopower']);
  assert.equal(t.result.outcome, 'topped');
  assert.equal(scriptedSwing([], { cap }).result.outcome, 'cancel');
  const s = scriptedSwing([0.5], { cap }).result;
  assert.equal(s.outcome, 'shank'); assert.equal(s.acc, METER_MIN); assert.ok(near(s.power, 0.5, 1e-9));
  // the marker never goes above the cap, whatever the frame time
  for (const dt of [1 / 240, 1 / 30, 0.1]) {
    const m = createMeter(cap); pressMeter(m);
    let top = 0;
    for (let i = 0; i < 200 && m.phase !== 'done'; i++) { tickMeter(m, dt); top = Math.max(top, m.value); }
    assert.ok(top <= cap + 1e-12, `dt ${dt}: top ${top}`);
  }
});

test('cap enforced: from the rough even power 1 only gets 85% of the club distance', () => {
  const full = carryOf(playOn('fairway'), 1).carry;
  const rough = carryOf(playOn('rough'), 1).carry;
  assert.ok(near(rough / full, 0.85, 0.01), `rough ${rough.toFixed(1)} vs fairway ${full.toFixed(1)}`);
  // resolveShot clamps too, so nothing can sneak past the cap
  const a = resolveShot({ club: CLUBS['7i'], power: 1, acc: 0, aim: 0, puttMax: 10, greenDecel: 1.1, lie: { maxPower: 0.6, sweetScale: 1 } });
  const b = resolveShot({ club: CLUBS['7i'], power: 0.6, acc: 0, aim: 0, puttMax: 10, greenDecel: 1.1 });
  assert.deepEqual(a.vel, b.vel);
});

test('below the cap, power % is the same distance from every lie (no hidden multiplier)', () => {
  for (const lie of ['tee', 'fringe', 'rough', 'sand']) {
    const c = carryOf(playOn(lie), 0.5).carry, f = carryOf(playOn('fairway'), 0.5).carry;
    assert.ok(near(c, f, 0.05), `${lie}: ${c.toFixed(2)} vs fairway ${f.toFixed(2)}`);
  }
});

test('the ⚑ mark matches the real distance on every lie', () => {
  for (const lie of ['fairway', 'rough', 'tee']) {
    const play = playOn(lie, '7i', -100);
    const p = play.pinPower();
    assert.ok(p < 1);
    const { carry } = carryOf(play, p);
    assert.ok(near(carry, 100 * AUTO_CLUB_REACH, 0.3), `${lie}: ⚑ at ${p.toFixed(3)} carries ${carry.toFixed(2)} m`);
  }
  // out of reach: the mark sits above the cap (in the grayed-out part)
  const far = playOn('sand', '7i', -120);
  assert.ok(far.pinPower() > far.lieOf().maxPower);
  assert.ok(far.clubReach() < 120 * AUTO_CLUB_REACH, 'the club reach shown is the capped one');
});

test('accuracy window width per surface (SWEET × sweetScale)', () => {
  const w = { tee: 1.2, fairway: 1, fringe: 1, rough: 0.7, sand: 0.5 };
  for (const [lie, scale] of Object.entries(w)) {
    const play = playOn(lie);
    const h = sweetHalfWidth(play.lieOf().sweetScale);
    assert.ok(near(h, SWEET * scale, 1e-12), lie);
    assert.equal(play.hit(0.5, h * 0.98).err, 0, `${lie}: just inside is straight`);
    assert.notEqual(playOn(lie).hit(0.5, -h * 1.02).err, 0, `${lie}: just outside curves`);
  }
  assert.equal(accuracyError(0.055, 1.2), 0, 'tee: wider');
  assert.notEqual(accuracyError(0.04, 0.7), 0, 'rough: narrower');
  // putting on the green is the easiest
  const putt = createHolePlay(testHole(), { seed: 1 }); putt.reset();
  assert.ok(putt.club.putter);
  assert.equal(putt.hit(0.5, SWEET * 1.4).err, 0);
});

test('sand wedge override: in a bunker it gets a higher cap and a wider window than other clubs', () => {
  const sw = playOn('sand', 'sw'), iron = playOn('sand', 'pw');
  assert.deepEqual(sw.lieOf(), { maxPower: 0.85, sweetScale: 0.7 });
  assert.deepEqual(iron.lieOf(), { maxPower: 0.6, sweetScale: 0.5 });
  const a = carryOf(sw, 1).carry;
  assert.ok(near(a, 0.85 * CLUBS.sw.carry, 0.6), `sand wedge carries ${a.toFixed(1)}`);
  // and on the fairway the sand wedge has no special values
  assert.deepEqual(playOn('fairway', 'sw').lieOf(), { maxPower: 1, sweetScale: 1 });
});

test('the putter ignores the power cap on the fringe and the green, but keeps the timing window', () => {
  const s = BASE_SURFACES;
  assert.deepEqual(lieFor(CLUBS.putter, 'fringe', s), { maxPower: 1, sweetScale: s.fringe.sweetScale });
  assert.deepEqual(lieFor(CLUBS.putter, 'green', s), { maxPower: 1, sweetScale: s.green.sweetScale });
  assert.equal(lieFor(CLUBS['9i'], 'fringe', s).maxPower, 0.95, 'other clubs still get the fringe cap');
  assert.equal(lieFor(CLUBS.putter, 'rough', s).maxPower, 0.85, 'off the green surfaces the cap still applies');
  // a full-power putt from the fringe uses the whole putt range
  const play = playOn('fringe', 'putter');
  const meter = scriptedSwing([1 + POWER_GRACE / 2, 2], { cap: play.lieOf().maxPower });
  assert.equal(meter.result.power, 1);
  const a = play.hit(1, 0), b = playOn('green', 'putter').hit(1, 0);
  assert.deepEqual(a.vel, b.vel);
});

test('lie values are tunable through ?tune= (X8)', () => {
  const r = applyTune('rough.maxPower:0.8,sand.sweetScale:0.6,SW.SAND.MAXPOWER:0.9,sand.decel:1,tee.maxPower:5');
  assert.deepEqual(r.set.map(s => [s.name, s.value]), [['rough.maxPower', 0.8], ['sand.sweetScale', 0.6], ['sw.sand.maxPower', 0.9], ['tee.maxPower', 1]]);
  assert.deepEqual(r.rejected.map(x => x.text), ['sand.decel:1'], 'only maxPower and sweetScale');
  assert.equal(playOn('rough').lieOf().maxPower, 0.8);
  assert.equal(playOn('sand', 'pw').lieOf().sweetScale, 0.6);
  assert.equal(playOn('sand', 'sw').lieOf().maxPower, 0.9);
  resetAllTunables();
  assert.equal(playOn('rough').lieOf().maxPower, 0.85, 'reset');
});
