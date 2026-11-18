// S18: smarter default aim (designer: "the automatic aim is too strong"). Approaches aim at the green
// centre, putts at the cup. S21: every tee shot aims straight along the tee's facing at the club's
// carry. The ⚑ and the auto-pick use the default aim's distance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHolePlay } from '../src/core/play.js';
import { getHole } from '../src/holes/sets.js';
import { SCENARIOS } from '../src/holes/scenarios.js';
import { aimAt, dist2D } from '../src/core/vec.js';
import { FRINGE_PUTT_DIST, TUNE, setTunable, resetTunables } from '../src/core/config.js';
import { testHole } from './helpers.js';
import { validateHole } from '../src/core/validate.js';

function at(holeId, x, z) {
  const play = createHolePlay(getHole(holeId), { seed: 1 });
  play.reset({ wind: { x: 0, z: 0 } });
  play.ball.pos.x = x; play.ball.pos.z = z; play.prepare();
  return play;
}
const greenOf = id => { const g = getHole(id).features.green; return { x: g.cx, z: g.cz }; };
const aimsAt = (play, pt) => Math.abs(play.aim - aimAt(play.ball.pos, pt)) < 1e-9;

// S21 (owner playtest 2026-11-18: "on the tee box, the aiming should just be straight away instead of
// on the green"): every tee shot aims straight along the tee's facing, at the club's carry.
// The tee box faces straight down −z unless the hole sets teeFacing (PM on PR #53)
const facingOf = id => { const h = getHole(id); return h.teeFacing ?? { x: h.tee.x, z: h.tee.z - 100 }; };
const carryOut = play => play.club.carry * TUNE.TEE_AIM_CARRY;

test('S21: every tee shot (par 3, 4, 5) aims straight ahead along the facing, at the club\'s carry', () => {
  for (const [id, club] of [['pl-01', '7i'], ['pl-02', 'driver'], ['pl-03', 'driver']]) {
    const play = at(id, 0, 0);
    assert.equal(play.lie, 'tee', id);
    assert.equal(play.targetKind, 'tee', id);
    assert.equal(play.club.id, club, `${id}: the auto-pick reaches the point the tee faces`);
    assert.ok(aimsAt(play, facingOf(id)), `${id}: aims along the facing`);
    assert.ok(Math.abs(aimAt(play.ball.pos, play.target) - play.aim) < 1e-9, `${id}: the aim point is on the line`);
    assert.ok(Math.abs(play.targetDist() - carryOut(play)) < 1e-9, `${id}: ${play.targetDist().toFixed(1)} m = the club's carry`);
  }
  // straight down the hole, not at the solved dogleg corner (hole 2) or the green centre (hole 1)
  const h2 = at('pl-02', 0, 0);
  assert.equal(h2.aim, 0);
  assert.ok(dist2D(h2.target, getHole('pl-02').aimTarget) > 40);
  assert.ok(!aimsAt(at('pl-01', 0, 0), greenOf('pl-01')));
});

test('S21: the ⚑ finishes at the tee aim point, and follows the club the player picks', () => {
  // hole 3 (on hole 2 the Driver's ⚑ finishes 6 m short: no power stops on the big hill's face, so
  // the ⚑ takes the closest finish, S15)
  const play = at('pl-03', 0, 0);
  const aim = play.aim;
  for (const id of ['driver', '3w', '5i', '7i', 'pw']) {
    play.setClub(play.bag.findIndex(c => c.id === id));
    assert.equal(play.aim, aim, `${id}: changing the club does not turn the aim`);
    assert.ok(Math.abs(play.targetDist() - carryOut(play)) < 1e-9, `${id}: aims at its carry`);
    const p = play.pinPower();
    assert.ok(p <= play.lieOf().maxPower, `${id}: the ⚑ (${p.toFixed(3)}) is within reach`);
    const rest = dist2D(play.ball.pos, play.restPoint(play.clubIdx, play.aim, p));
    assert.ok(Math.abs(rest - play.targetDist()) < 2, `${id}: finishes at ${rest.toFixed(1)} of ${play.targetDist().toFixed(1)} m`);
  }
  // the player turns the aim: the ⚑ keeps the distance (as for every default aim, S18)
  play.setAim(aim + 0.08);
  const turned = dist2D(play.ball.pos, play.restPoint(play.clubIdx, play.aim, play.pinPower()));
  assert.ok(Math.abs(turned - play.targetDist()) < 2.5, `turned: ${turned.toFixed(1)} of ${play.targetDist().toFixed(1)} m`);
});

test('S21: the facing is the hole\'s teeFacing, else straight down −z; aimTarget / the green only set the auto-pick distance', () => {
  // flat, all fairway, a 4 m tee box; green centre straight ahead 140 m, the cup a little right
  const base = {
    par: 3, cup: { x: 6, z: -142 }, features: { green: { cx: 0, cz: -140 } },
    surfaceAt: (x, z) => (Math.abs(x) < 4 && Math.abs(z) < 4 ? 'tee' : z < -130 ? 'green' : 'fairway'),
  };
  const make = extra => { const p = createHolePlay(testHole({ ...base, ...extra }), { seed: 1 }); p.reset(); return p; };
  const par3 = make({ cup: { x: 30, z: -142 }, features: { green: { cx: 25, cz: -140 } } });
  assert.equal(par3.targetKind, 'tee');
  assert.equal(par3.aim, 0, 'par 3: straight down −z, not at the green');
  assert.equal(par3.club.id, '7i', 'the auto-pick still reaches the green (142 m)');
  const par4 = make({ par: 4, aimTarget: { x: -30, z: -120 } });
  assert.equal(par4.aim, 0, 'par 4: straight down −z, not at aimTarget');
  assert.equal(par4.club.id, '9i', 'aimTarget (124 m) sets the auto-pick distance');
  const faced = make({ par: 4, aimTarget: { x: -30, z: -250 }, teeFacing: { x: 20, z: -400 } });
  assert.ok(aimsAt(faced, { x: 20, z: -400 }), 'teeFacing turns the tee box');
  assert.equal(faced.club.id, 'driver', 'aimTarget 252 m out: the 3 Wood does not reach');
  const noTarget = make({ par: 5, cup: { x: 0, z: -480 } });
  assert.equal(noTarget.club.id, 'driver', 'no aimTarget: the cup distance');
  // a ball that stays on the tee box (topped) aims along the same facing from where it is
  faced.ball.pos.x = 2; faced.ball.pos.z = -2; faced.prepare();
  assert.equal(faced.targetKind, 'tee');
  assert.ok(Math.abs(faced.aim - aimAt(faced.tee, { x: 20, z: -400 })) < 1e-9, 'same direction, not re-aimed at the point');
});

test('S21: TEE_AIM_CARRY scales the tee aim distance; a penalty from the tee comes back to a tee aim', () => {
  try {
    setTunable('TEE_AIM_CARRY', 0.8);
    const p = at('pl-02', 0, 0);
    assert.ok(Math.abs(p.targetDist() - 0.8 * p.club.carry) < 1e-9);
  } finally { resetTunables(); }
  assert.equal(TUNE.TEE_AIM_CARRY, 1);
  const play = at('pl-01', 0, 0);
  const pond = getHole('pl-01').features.pond;
  play.setAim(aimAt(play.ball.pos, { x: pond.cx, z: pond.cz })); play.setClub(play.bag.findIndex(c => c.id === '9i'));
  let power = 0.5;
  while (play.restPoint(play.clubIdx, play.aim, power).end !== 'penalty') power += 0.02;
  play.hit(power, 0);
  play.simulate();
  assert.equal(play.next, 'returnToLast', 'into the pond');
  play.proceed();
  assert.equal(play.lie, 'tee');
  assert.equal(play.targetKind, 'tee');
  assert.equal(play.aim, 0);
});

// S21 fairness: the default tee shot may finish off the fairway, never in a penalty
test('S21: validateHole refuses a default tee shot that ends in water or OB, and allows rough, sand or trees', () => {
  // par 4, all fairway, a 6 m tee box, the green 380–420 m out. `band(s, z0, z1)` puts surface s across the hole.
  const hole = band => ({
    ...testHole({ number: 1,
      par: 4, cup: { x: 0, z: -400 }, aimTarget: { x: 0, z: -300 }, features: { green: { cx: 0, cz: -400 } },
      map: { x0: -60, x1: 60, z0: -430, z1: 10 },
      surfaceAt: (x, z) => (Math.abs(x) < 3 && Math.abs(z) < 3 ? 'tee' : z < -380 ? 'green' : band?.(x, z) ?? 'fairway'),
    }),
  });
  const across = (s, z0, z1) => (x, z) => (z <= z0 && z >= z1 ? s : null);
  assert.doesNotThrow(() => validateHole(hole()));
  // the Driver's ⚑ shot finishes about 215 m out, a full one about 247 m out
  assert.throws(() => validateHole(hole(across('water', -200, -230))), /default tee shot \(Driver to the aim point.*ends in water/);
  assert.throws(() => validateHole(hole(across('ob', -205, -225))), /default tee shot \(Driver to the aim point.*ends in ob/);
  assert.doesNotThrow(() => validateHole(hole(across('water', -235, -248))), 'a full swing past the aim point may find water (long is wet)');
  for (const s of ['rough', 'sand']) assert.doesNotThrow(() => validateHole(hole(across(s, -200, -300))), `${s} is fine: the player adjusts`);
  // teeFacing is checked, and can steer the line away from (or into) the water
  assert.throws(() => validateHole({ ...hole(), teeFacing: { x: 0 } }), /teeFacing must be \{ x, z \}/);
  assert.throws(() => validateHole({ ...hole(), teeFacing: { x: 0, z: 0 } }), /teeFacing must be away from the tee/);
  const pond = (x, z) => (x < -15 && z < -150 && z > -320 ? 'water' : null);
  assert.doesNotThrow(() => validateHole(hole(pond)));
  assert.throws(() => validateHole({ ...hole(pond), teeFacing: { x: -60, z: -300 } }), /ends in water/);
  // a pond straight down −z: a teeFacing that turns the tee box away from it fixes the hole
  const ahead = (x, z) => (Math.abs(x) < 20 && z < -190 && z > -260 ? 'water' : null);
  assert.throws(() => validateHole(hole(ahead)), /ends in water.*set or move teeFacing/);
  assert.doesNotThrow(() => validateHole({ ...hole(ahead), teeFacing: { x: 60, z: -300 } }));
  // aimTarget is optional since PM on PR #53
  const { aimTarget, ...noTarget } = hole();
  assert.doesNotThrow(() => validateHole(noTarget));
});

test('S21: every real hole passes the new tee rule (validated at load) and its default tee shot avoids penalties', () => {
  for (const id of ['pl-01', 'pl-02', 'pl-03']) {
    const play = at(id, getHole(id).tee.x, getHole(id).tee.z);
    play.hit(Math.min(play.pinPower(), play.lieOf().maxPower), 0);
    const ev = play.simulate();
    assert.notEqual(ev.type, 'penalty', id);
  }
});

test('approaches aim at the centre of the green, from the fairway, the rough and a bunker', () => {
  // all further than CHIP_AIM_RANGE from the cup (S19 moved the hole 1 greenside bunker to the chip test)
  for (const [hole, x, z, lie] of [['pl-02', 18, -330, 'fairway'], ['pl-02', 40, -380, 'rough'], ['pl-02', 16, -237, 'sand'], ['pl-01', 0, -100, 'fairway']]) {
    const play = at(hole, x, z);
    assert.equal(play.lie, lie);
    assert.ok(play.distToCup() > TUNE.CHIP_AIM_RANGE);
    assert.equal(play.targetKind, 'green', `${hole} ${lie}`);
    assert.ok(aimsAt(play, greenOf(hole)), `${hole} ${lie}`);
  }
  // also after a penalty sends the ball back to a fairway spot
  const s = SCENARIOS['h2-cross-bunker'];
  const play = createHolePlay(getHole(s.hole), { seed: s.seed });
  play.reset(s);
  assert.equal(play.targetKind, 'green');
});

test('putts aim at the cup (green, and the fringe close to the cup)', () => {
  const g = at('pl-02', 20, -440);
  assert.equal(g.lie, 'green');
  assert.equal(g.targetKind, 'cup');
  assert.ok(aimsAt(g, g.cup));
  assert.equal(g.club.id, 'putter');
  const f = at('pl-01', 4, -138); // fringe, 14 m short of the cup
  assert.equal(f.lie, 'fringe');
  assert.ok(f.distToCup() < FRINGE_PUTT_DIST);
  assert.equal(f.targetKind, 'cup');
  assert.equal(f.club.id, 'putter');
});

test('a chip from the fringe aims at the cup too, with a club (PM on PR #27)', () => {
  const c = at('pl-02', 5, -446); // fringe, about 21 m from the cup: too far for the putter
  assert.equal(c.lie, 'fringe');
  assert.ok(c.distToCup() >= FRINGE_PUTT_DIST);
  assert.equal(c.targetKind, 'cup');
  assert.ok(aimsAt(c, c.cup));
  assert.ok(!c.club.putter, `a club, not the putter (${c.club.id})`);
  assert.ok(Math.abs(c.targetDist() - c.distToCup()) < 1e-9, 'the ⚑ and the auto-pick use the distance to the cup');
});

test('the ⚑ uses the default aim distance: at the ⚑ power the ball finishes that far away (S15)', () => {
  for (const [hole, x, z] of [['pl-01', 0, 0], ['pl-02', 18, -330], ['pl-01', 0, -100]]) {
    const play = at(hole, x, z);
    const p = play.pinPower();
    const rest = dist2D(play.ball.pos, play.restPoint(play.clubIdx, play.aim, p));
    // within 2 m: below hole 2's raised green a ball that lands on the bank rolls back (see pin-mark)
    assert.ok(Math.abs(rest - play.targetDist()) < 2, `${hole}: finishes at ${rest.toFixed(2)} of ${play.targetDist().toFixed(2)} m`);
    // turning the aim keeps the ⚑ on the default aim's distance
    play.setAim(play.aim + 0.05);
    const turned = dist2D(play.ball.pos, play.restPoint(play.clubIdx, play.aim, play.pinPower()));
    assert.ok(Math.abs(turned - play.targetDist()) < 2, `${hole} turned: ${turned.toFixed(2)} of ${play.targetDist().toFixed(2)} m`);
  }
});

// S19 (owner, 2026-11-17): from close to the green the player always wants the flag. Within
// CHIP_AIM_RANGE of the cup the default aim is the cup on any surface (kind 'chip' off the
// green and fringe, so the scorecard can say why).
test('S19: within chip range the default aim is the cup, per surface', () => {
  for (const [hole, x, z, lie] of [
    ['pl-01', 18, -138, 'sand'], ['pl-02', 1, -441, 'sand'],
    ['pl-01', -16, -152, 'rough'], ['pl-02', 22, -463, 'rough'],
    ['pl-01', -2, -131, 'fairway'], ['pl-02', 26, -422, 'fairway'],
    ['pl-01', -15, -147, 'sand'], // the hole 1 greenside bunker (aimed at the green centre before S19)
  ]) {
    const play = at(hole, x, z);
    const where = `${hole} ${lie} (${x}, ${z}), ${play.distToCup().toFixed(1)} m`;
    assert.equal(play.lie, lie, where);
    assert.ok(play.distToCup() <= TUNE.CHIP_AIM_RANGE, where);
    assert.equal(play.targetKind, 'chip', where);
    assert.ok(aimsAt(play, play.cup), where);
    assert.ok(Math.abs(play.targetDist() - play.distToCup()) < 1e-9, `${where}: the ⚑ and the auto-pick use the distance to the cup`);
  }
  // the fringe keeps aiming at the cup at any distance (PM on PR #27), as kind 'cup'
  const f = at('pl-02', 26, -426);
  assert.equal(f.lie, 'fringe');
  assert.equal(f.targetKind, 'cup');
  assert.ok(aimsAt(f, f.cup));
});

test('S19: just outside chip range it is the green centre again, and the range is tunable', () => {
  const out = at('pl-01', 4, -112); // fairway, 40 m from the cup
  assert.ok(out.distToCup() > TUNE.CHIP_AIM_RANGE);
  assert.equal(out.targetKind, 'green');
  try {
    setTunable('CHIP_AIM_RANGE', 45);
    assert.equal(at('pl-01', 4, -112).targetKind, 'chip');
    setTunable('CHIP_AIM_RANGE', 15);
    assert.equal(at('pl-01', -2, -131).targetKind, 'green', '22 m is outside a 15 m range');
    setTunable('CHIP_AIM_RANGE', 0);
    assert.equal(at('pl-01', 18, -138).targetKind, 'green', '0 turns chip aim off');
  } finally { resetTunables(); }
  assert.equal(TUNE.CHIP_AIM_RANGE, 30);
});

test('the auto-pick uses the default aim distance (a target nearer than the pin picks a shorter club)', () => {
  // A flat test hole: green centre 100 m out, the cup 30 m behind it
  const hole = testHole({ cup: { x: 0, z: -130 }, surfaceAt: (x, z) => (z < -85 ? 'green' : 'fairway'), features: { green: { cx: 0, cz: -100 } } });
  const play = createHolePlay(hole, { seed: 1 });
  play.reset();
  play.ball.pos.z = -1; play.prepare();
  assert.equal(play.lie, 'fairway');
  assert.equal(play.targetKind, 'green');
  assert.equal(play.club.id, 'pw', 'reaches 99 m (the target), the pin would need the 9 Iron');
  // a hole without default-aim data (test holes) keeps aiming at the cup
  const plain = createHolePlay(testHole({ cup: { x: 10, z: -100 }, surfaceAt: () => 'fairway' }), { seed: 1 });
  plain.reset();
  assert.equal(plain.targetKind, 'cup');
  assert.ok(aimsAt(plain, plain.cup));
});
