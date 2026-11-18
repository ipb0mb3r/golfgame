// S23 (owner): the aim marker warns when the full-power landing (or, on a capped lie, the capped
// landing) is in water or out of bounds: play.aimMarks().hazard, and the label names it
// ("171 yd · Water", "203 yd · OB"). The game draws it blue (the tree warning stays red, K4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHolePlay, aimMarkLabel } from '../src/core/play.js';
import { getHole } from '../src/holes/sets.js';
import { SCENARIOS } from '../src/holes/scenarios.js';
import { M2Y } from '../src/core/config.js';
import { testHole } from './helpers.js';

// A flat test hole: the ball sits on `lie` at the tee, fairway ahead, then `far` beyond `edge` m
function flat(lie, far, edge, { club = '7i', surfaceOverrides } = {}) {
  const play = createHolePlay(testHole({ surfaceAt: (x, z) => (z > -5 ? lie : z < -edge ? far : 'fairway'), cup: { x: 0, z: -2000 }, ...(surfaceOverrides ? { surfaceOverrides } : {}) }), { seed: 1 });
  play.reset();
  play.setClub(play.bag.findIndex(c => c.id === club));
  play.setAim(0);
  return play;
}

test('S23: a full-power landing in water or OB is flagged, a clear one is not', () => {
  const clear = flat('fairway', 'fairway', 0).aimMarks();
  assert.equal(clear.hazard, null);
  const carry = clear.dist;
  const wet = flat('fairway', 'water', carry - 10).aimMarks();
  assert.deepEqual(wet.hazard, { id: 'water', name: 'Water' });
  assert.equal(aimMarkLabel(wet), `${Math.round(wet.dist * M2Y)} yd · Water`);
  const ob = flat('fairway', 'ob', carry - 10).aimMarks();
  assert.equal(ob.hazard.id, 'ob');
  assert.equal(aimMarkLabel(ob), `${Math.round(ob.dist * M2Y)} yd · OB`);
  // just past the landing: no warning (it is where the ball lands, not where it rolls)
  assert.equal(flat('fairway', 'water', carry + 3).aimMarks().hazard, null);
  // the ground text comes back when the landing is dry
  assert.match(aimMarkLabel(clear), /yd · Flat$/);
});

test('S23: on a capped lie (rough, sand) the capped landing is what is checked', () => {
  for (const lie of ['rough', 'sand']) {
    const full = flat('fairway', 'fairway', 0).aimMarks().dist;
    const capped = flat(lie, 'fairway', 0).aimMarks();
    assert.equal(capped.capped, true, lie);
    // water past the capped landing but before the full one: the capped marker is dry
    const mid = (capped.dist + full) / 2;
    assert.equal(flat(lie, 'water', mid).aimMarks().hazard, null, `${lie}: water beyond the cap`);
    // water before the capped landing: flagged, still capped (both shown: blue wins over grey)
    const m = flat(lie, 'water', capped.dist - 5).aimMarks();
    assert.equal(m.capped, true);
    assert.equal(m.hazard.id, 'water', lie);
  }
});

test('S23: putts never warn; a hole\'s surface table counts (a penalty override is a hazard)', () => {
  const p = flat('fairway', 'water', 10, { club: 'putter' });
  assert.equal(p.aimMarks(), null);
  const carry = flat('fairway', 'fairway', 0).aimMarks().dist;
  const rockPenalty = flat('fairway', 'rock', carry - 10, { surfaceOverrides: { rock: { penalty: true } } }).aimMarks();
  assert.equal(rockPenalty.hazard.id, 'rock');
});

// The links in the PR: the real holes, from the tee or a test spot, no wind, straight
function from(holeId, sc = null) {
  const play = createHolePlay(getHole(holeId), { seed: 1 });
  play.reset(sc ? { ...sc, wind: { x: 0, z: 0 } } : { wind: { x: 0, z: 0 } });
  const club = id => { play.setClub(play.bag.findIndex(c => c.id === id)); return play.aimMarks(); };
  return { play, auto: play.club.id, club };
}

test('S23: real holes: mtn-06 feeder bank (3 Wood long into the creek), mtn-03 tee (Driver OB), auto-picks stay dry', () => {
  const m6 = from('mtn-06', SCENARIOS['mtn6-feeder-bank']);
  assert.equal(m6.club(m6.auto).hazard, null, `the auto-pick (${m6.auto}) lands dry`);
  const w = m6.club('3w');
  assert.equal(w.hazard?.id, 'water');
  assert.match(aimMarkLabel(w), / yd · Water$/);
  const m3 = from('mtn-03');
  assert.equal(m3.club(m3.auto).hazard, null);
  assert.equal(m3.club('driver').hazard?.id, 'ob');
  // every hole's default tee shot club lands dry at full power on the default aim (the marker starts plain)
  for (const id of ['pl-01', 'pl-02', 'pl-03', 'mtn-01', 'mtn-02', 'mtn-03', 'mtn-04', 'mtn-05', 'mtn-06', 'mtn-07', 'mtn-08', 'mtn-09']) {
    const t = from(id);
    assert.equal(t.club(t.auto).hazard, null, `${id}: ${t.auto}`);
  }
});
