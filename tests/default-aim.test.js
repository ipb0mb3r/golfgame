// S18: smarter default aim (designer: "the automatic aim is too strong"). Approaches aim at the green
// centre, par 4/5 tee shots at the hole's aimTarget, par 3 tee shots at the green centre, putts at the
// cup. The ⚑ and the auto-pick use the default aim's distance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHolePlay } from '../src/core/play.js';
import { getHole } from '../src/holes/sets.js';
import { SCENARIOS } from '../src/holes/scenarios.js';
import { aimAt, dist2D } from '../src/core/vec.js';
import { AUTO_CLUB_REACH, FRINGE_PUTT_DIST } from '../src/core/config.js';
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
  for (const [hole, x, z, lie] of [['pl-02', 18, -330, 'fairway'], ['pl-02', 40, -380, 'rough'], ['pl-01', -15, -147, 'sand'], ['pl-01', 0, -100, 'fairway']]) {
    const play = at(hole, x, z);
    assert.equal(play.lie, lie);
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

test('the ⚑ uses the default aim distance: at the ⚑ power the ball lands AUTO_CLUB_REACH of the way to the target', () => {
  for (const [hole, x, z] of [['pl-01', 0, 0], ['pl-02', 18, -330], ['pl-01', 0, -100]]) {
    const play = at(hole, x, z);
    const p = play.pinPower();
    const carry = dist2D(play.ball.pos, play.landingPoint(play.clubIdx, play.aim, p));
    assert.ok(Math.abs(carry - play.targetDist() * AUTO_CLUB_REACH) < 0.01, `${hole}: ${carry.toFixed(3)} vs ${(play.targetDist() * AUTO_CLUB_REACH).toFixed(3)}`);
    // turning the aim keeps the ⚑ on the default aim's distance
    const before = play.pinPower();
    play.setAim(play.aim + 0.05);
    assert.ok(Math.abs(play.targetDist() * AUTO_CLUB_REACH - dist2D(play.ball.pos, play.landingPoint(play.clubIdx, play.aim, play.pinPower()))) < 0.01);
    assert.ok(Number.isFinite(before));
  }
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
