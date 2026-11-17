// S18: smarter default aim (designer: "the automatic aim is too strong"). Approaches aim at the green
// centre, par 4/5 tee shots at the hole's aimTarget, par 3 tee shots at the green centre, putts at the
// cup. The ⚑ and the auto-pick use the default aim's distance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHolePlay } from '../src/core/play.js';
import { getHole } from '../src/holes/sets.js';
import { SCENARIOS } from '../src/holes/scenarios.js';
import { aimAt, dist2D } from '../src/core/vec.js';
import { FRINGE_PUTT_DIST, TUNE, setTunable, resetTunables } from '../src/core/config.js';
import { testHole } from './helpers.js';

function at(holeId, x, z) {
  const play = createHolePlay(getHole(holeId), { seed: 1 });
  play.reset({ wind: { x: 0, z: 0 } });
  play.ball.pos.x = x; play.ball.pos.z = z; play.prepare();
  return play;
}
const greenOf = id => { const g = getHole(id).features.green; return { x: g.cx, z: g.cz }; };
const aimsAt = (play, pt) => Math.abs(play.aim - aimAt(play.ball.pos, pt)) < 1e-9;

test('par 5 tee shot (hole 2): aims at the fairway target, not the pin', () => {
  const play = at('pl-02', 0, 0);
  assert.equal(play.targetKind, 'fairway');
  assert.ok(aimsAt(play, getHole('pl-02').aimTarget));
  assert.ok(!aimsAt(play, play.cup));
  assert.equal(play.club.id, 'driver', 'the target is out of 3 Wood reach');
  assert.ok(Math.abs(play.targetDist() - dist2D(play.ball.pos, getHole('pl-02').aimTarget)) < 1e-9);
});

test('par 3 tee shot (hole 1): aims at the centre of the green', () => {
  const play = at('pl-01', 0, 0);
  assert.equal(play.targetKind, 'green');
  assert.ok(aimsAt(play, greenOf('pl-01')));
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
