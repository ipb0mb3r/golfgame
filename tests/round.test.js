// Phase 6 (R1, R2, R5, R6, R7): rounds of any length. Owner rule: a course is a playlist of hole ids
// of ANY length, and the same hole can appear several times. Nothing may assume 9 holes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRound, holeSeed, toParText, isNewBest } from '../src/core/round.js';
import { createHolePlay } from '../src/core/play.js';
import { HOLES, SETS, getHole, resolveSet } from '../src/holes/sets.js';
import { validateHole } from '../src/core/validate.js';
import { testHole } from './helpers.js';

const lookup = id => HOLES[id];
const done = (strokes, extra = {}) => ({ holed: !extra.pickedUp, pickedUp: false, strokes, penalties: 0, ...extra });

// Play a whole round with the given strokes per hole (a number, or a finished object)
function playRound(round, scores) {
  for (const s of scores) {
    round.record(typeof s === 'number' ? done(s) : s);
    round.advance();
  }
  return round;
}

test('R6: the test sets are Prototype 3 (pl-01..03) and Test 9 (the same 3 holes three times)', () => {
  assert.deepEqual(resolveSet('prototype3').holes, ['pl-01', 'pl-02', 'pl-03']);
  assert.equal(resolveSet('PROTOTYPE3').name, 'Prototype 3');
  assert.deepEqual(resolveSet('test9').holes, [].concat(...Array(3).fill(['pl-01', 'pl-02', 'pl-03'])));
  assert.equal(resolveSet('nope'), null);
  assert.equal(resolveSet(null), null);
  for (const s of SETS) for (const id of s.holes) assert.ok(HOLES[id], `${s.id}: ${id}`);
});

test('R1/R2: a 9-hole round gives the correct total, including a picked-up hole and a penalty', () => {
  const set = resolveSet('test9'); // pars 3,5,4 × 3 = 36
  const round = createRound(set, { seed: 7, getHole: lookup });
  assert.equal(round.length, 9);
  assert.equal(round.current.number, 1);
  assert.equal(round.current.of, 9);
  const scores = [3, 6, { ...done(5), penalties: 1 }, 2, { holed: false, pickedUp: true, strokes: 12, penalties: 0 }, 4, 4, 5, 3];
  playRound(round, scores);
  assert.equal(round.done, true);
  assert.equal(round.current, null);
  const t = round.totals;
  assert.equal(t.played, 9);
  assert.equal(t.par, 36);
  assert.equal(t.strokes, 3 + 6 + 5 + 2 + 12 + 4 + 4 + 5 + 3); // 44
  assert.equal(t.toPar, 8);
  assert.equal(t.pickedUp, 1);
  assert.equal(t.penalties, 1);
  const c = round.cards;
  assert.deepEqual(c.map(r => r.result), ['Par', 'Bogey', 'Bogey', 'Birdie!', 'Picked up', 'Par', 'Bogey', 'Par', 'Birdie!']);
  assert.equal(c[4].pickedUp, true);
  assert.equal(c[4].toPar, 7, 'a picked-up par 5 at the 12-stroke limit counts 12 (+7)');
  assert.deepEqual(c.map(r => r.number), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(c.map(r => r.holeId), set.holes, 'the same hole id can appear several times');
  // One group of 9 ("Out", PM Phase 7): its subtotal is the total
  const g = round.groups();
  assert.equal(g.length, 1);
  assert.equal(g[0].label, 'Out');
  assert.equal(g[0].strokes, 44);
  assert.equal(g[0].par, 36);
});

test('R5: a 1-hole set works end to end (no 9-hole assumption)', () => {
  const round = createRound({ id: 'one', name: 'One', holes: ['pl-03'] }, { seed: 1, getHole: lookup });
  assert.equal(round.length, 1);
  assert.deepEqual([round.current.number, round.current.of, round.current.hole.id], [1, 1, 'pl-03']);
  round.record(done(3));
  assert.equal(round.advance(), null);
  assert.equal(round.done, true);
  assert.deepEqual(round.totals, { played: 1, strokes: 3, par: 4, toPar: -1, penalties: 0, pickedUp: 0 });
  const g = round.groups();
  assert.equal(g.length, 1);
  assert.equal(g[0].label, 'Hole 1');
  assert.equal(g[0].rows.length, 1);
  assert.equal(g[0].toPar, -1);
});

test('R5: a 20-hole set: groups of 9 (Out, In, Holes 19–20) with subtotals that add up to the total', () => {
  const ids = Array.from({ length: 20 }, (_, i) => ['pl-01', 'pl-02', 'pl-03'][i % 3]);
  const round = createRound({ id: 'twenty', name: 'Twenty', holes: ids }, { seed: 99, getHole: lookup });
  assert.equal(round.length, 20);
  const scores = ids.map((id, i) => HOLES[id].par + (i % 4 === 0 ? 1 : i % 5 === 0 ? -1 : 0));
  // Halfway: the groups already list every hole; unplayed ones have no score yet
  playRound(round, scores.slice(0, 12));
  assert.equal(round.current.number, 13);
  let g = round.groups();
  assert.deepEqual(g.map(x => x.rows.length), [9, 9, 2]);
  assert.equal(g[1].played, 3);
  assert.equal(g[2].played, 0);
  assert.equal(g[2].rows[0].strokes, null);
  playRound(round, scores.slice(12));
  assert.equal(round.done, true);
  g = round.groups();
  assert.deepEqual(g.map(x => x.label), ['Out', 'In', 'Holes 19–20']);
  assert.deepEqual(g.map(x => [x.from, x.to]), [[1, 9], [10, 18], [19, 20]]);
  const t = round.totals;
  assert.equal(g.reduce((s, x) => s + x.strokes, 0), t.strokes);
  assert.equal(g.reduce((s, x) => s + x.par, 0), t.par);
  assert.equal(g.reduce((s, x) => s + x.toPar, 0), t.toPar);
  assert.equal(t.par, ids.reduce((s, id) => s + HOLES[id].par, 0));
  assert.equal(t.strokes, scores.reduce((a, b) => a + b, 0));
  assert.equal(round.cards.at(-1).number, 20);
  // And 99 holes, for good measure: 11 groups, the last one full
  const big = createRound({ id: 'big', name: 'Big', holes: Array(99).fill('pl-01') }, { seed: 1, getHole: lookup });
  assert.deepEqual(big.groups().map(x => x.rows.length), Array(11).fill(9));
  assert.equal(big.groups()[10].label, 'Holes 91–99');
  assert.deepEqual(big.groups().slice(0, 3).map(x => x.label), ['Out', 'In', 'Holes 19–27']);
});

test('R7: one seed per round; each hole\'s seed (and so its wind) comes from it', () => {
  const set = resolveSet('test9');
  const winds = seed => {
    const r = createRound(set, { seed, getHole: lookup });
    return set.holes.map((id, i) => {
      const play = createHolePlay(getHole(id), { seed: r.seedAt(i) });
      play.reset();
      return [play.wind.x, play.wind.z];
    });
  };
  const a = winds(12345), b = winds(12345), c = winds(54321);
  assert.deepEqual(a, b, 'same round seed → the same winds on every hole');
  assert.notDeepEqual(a, c, 'another round seed → other winds');
  // The same hole played twice in one round gets its own wind (seed by place, not by hole id)
  assert.notDeepEqual(a[0], a[3]);
  assert.equal(new Set(a.map(w => w.join())).size, 9);
  assert.equal(holeSeed(1, 0), holeSeed(1, 0));
  assert.notEqual(holeSeed(1, 0), holeSeed(1, 1));
  assert.notEqual(holeSeed(0, 0), holeSeed(1, 0));
  assert.ok(Number.isInteger(holeSeed(-5, 3)));
});

test('R5: restart clears everything: back to hole 1, empty scorecard, same seeds', () => {
  const round = createRound(resolveSet('prototype3'), { seed: 3, getHole: lookup });
  const seeds = [0, 1, 2].map(round.seedAt);
  playRound(round, [4, 5]);
  assert.equal(round.index, 2);
  round.restart();
  assert.equal(round.index, 0);
  assert.equal(round.done, false);
  assert.deepEqual(round.cards, []);
  assert.deepEqual(round.totals, { played: 0, strokes: 0, par: 0, toPar: 0, penalties: 0, pickedUp: 0 });
  assert.equal(round.current.seed, seeds[0]);
  assert.deepEqual(round.groups()[0].rows.map(r => r.strokes), [null, null, null]);
  // A new round object (what Play again does) shares nothing with the old one
  const fresh = createRound(resolveSet('prototype3'), { seed: 4, getHole: lookup });
  playRound(fresh, [3]);
  assert.equal(round.cards.length, 0);
});

test('R1: the round refuses out-of-order use instead of miscounting', () => {
  const round = createRound(resolveSet('prototype3'), { seed: 1, getHole: lookup });
  assert.throws(() => round.advance(), /no score yet/);
  round.record(done(3));
  assert.throws(() => round.record(done(3)), /already recorded/);
  assert.throws(() => createRound({ id: 'empty', name: 'E', holes: [] }, { getHole: lookup }), /no holes/);
  assert.throws(() => createRound({ id: 'x', name: 'X', holes: ['nope'] }, { getHole: lookup }), /unknown hole "nope"/);
});

test('R1/R2: a round driven by real hole play records play.finished (strokes incl. penalties)', () => {
  const hole = testHole({ id: 't1', par: 3, maxStrokes: 4, cup: { x: 0, z: -60 }, surfaceAt: (x, z) => (z < -30 && z > -40 ? 'water' : 'fairway') });
  const round = createRound({ id: 'sim', name: 'Sim', holes: ['t1', 't1'] }, { seed: 5, getHole: id => (id === 't1' ? hole : null) });
  for (let h = 0; h < 2; h++) {
    const play = createHolePlay(round.current.hole, { seed: round.current.seed });
    play.reset(); play.ball.pos.z = -10; play.prepare();
    // Hit into the water until the stroke limit picks the ball up
    for (let k = 0; k < 10 && !play.finished; k++) {
      play.setAim(0); play.setClub(play.bag.findIndex(c => c.id === 'pw'));
      play.swing({ power: 0.25, acc: 0, outcome: 'normal' });
      while (play.ball.moving) play.advance(1 / 60);
      play.proceed();
    }
    assert.ok(play.finished?.pickedUp);
    round.record(play.finished);
    round.advance();
  }
  const t = round.totals;
  assert.equal(t.strokes, 8);
  assert.equal(t.pickedUp, 2);
  assert.equal(t.penalties, 4, 'two water balls per hole (each 1 + 1 penalty = the 4-stroke limit)');
  assert.deepEqual(round.cards.map(r => r.result), ['Picked up', 'Picked up']);
});

test('R6: personal best: lower to-par wins, the first finished round is a best', () => {
  assert.equal(isNewBest(null, { toPar: 5 }), true);
  assert.equal(isNewBest({ toPar: 2 }, { toPar: 1 }), true);
  assert.equal(isNewBest({ toPar: 2 }, { toPar: 2 }), false);
  assert.equal(isNewBest({ toPar: -1 }, { toPar: 0 }), false);
  assert.equal(isNewBest({ toPar: 'x' }, { toPar: 0 }), true);
  assert.deepEqual([toParText(0), toParText(3), toParText(-2)], ['E', '+3', '-2']);
});

test('holes need a difficulty 1–5 (the AI rivals use it in Phase T)', () => {
  assert.deepEqual(Object.values(HOLES).map(h => h.difficulty), [1, 3, 2]);
  for (const d of [0, 6, 2.5, undefined, '3']) assert.throws(() => validateHole({ ...HOLES['pl-01'], difficulty: d }), /difficulty must be a whole number 1–5/);
});

test('PM on PR #38: every hole has a one-line tagline for the compact hole card (holes 2+ of a round)', () => {
  for (const h of Object.values(HOLES)) {
    assert.equal(typeof h.intro.tagline, 'string', h.id);
    assert.ok(h.intro.tagline.length > 0 && h.intro.tagline.length <= 90 && !h.intro.tagline.includes('\n'), `${h.id}: ${h.intro.tagline}`);
  }
});

test('Phase 7: scorecard group names: Out / In only for full groups of 9, else the hole numbers', () => {
  const labels = n => createRound({ id: 'n', name: 'N', holes: Array(n).fill('pl-01') }, { seed: 1, getHole: lookup }).groups().map(g => g.label);
  assert.deepEqual(labels(3), ['Holes 1–3']);
  assert.deepEqual(labels(9), ['Out']);
  assert.deepEqual(labels(12), ['Out', 'Holes 10–12']);
  assert.deepEqual(labels(18), ['Out', 'In']);
  assert.deepEqual(labels(27), ['Out', 'In', 'Holes 19–27']);
});
