// Phase T (T1–T4): AI rivals. Their scores come from skill, par and hole difficulty, seeded by the
// round seed; difficulty shifts their skill; the leaderboard shares positions on ties.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  RIVALS, DIFFICULTIES, DEFAULT_DIFFICULTY, resolveDifficulty, rivalSkill, holeOdds, rivalHoleScore, rivalScores,
  leaderboard, ordinal, placeText,
} from '../src/core/rivals.js';
import { createRound, holeSeed, bestId } from '../src/core/round.js';
import { TUNABLES, TUNE } from '../src/core/config.js';
import { applyTune, resetAllTunables } from '../src/core/tune.js';
import { HOLES, SETS, getHole, resolveSet } from '../src/holes/sets.js';
import { aiCourses, difficultyItems, soloCourses, DEV_PARAMS, PLAY_PARAMS } from '../src/core/menu.js';

afterEach(() => resetAllTunables());

const holesOf = setId => resolveSet(setId).holes.map(id => HOLES[id]);
const seedsOf = (holes, seed) => holes.map((_, i) => holeSeed(seed, i));
const sum = a => a.reduce((s, x) => s + x, 0);
const parOf = holes => sum(holes.map(h => h.par));
// One rival's total to par / the winner's total to par, over many seeded rounds
function simulate(holes, difficulty, rounds = 1000) {
  const par = parOf(holes), perRival = RIVALS.map(() => 0), winners = [];
  for (let s = 1; s <= rounds; s++) {
    const r = rivalScores(holes, seedsOf(holes, s * 7919), difficulty);
    const tp = r.map(x => sum(x.strokes) - par);
    tp.forEach((t, i) => (perRival[i] += t / rounds));
    winners.push(Math.min(...tp));
  }
  winners.sort((a, b) => a - b);
  return { perRival, mean: sum(perRival) / RIVALS.length, winnerMean: sum(winners) / rounds, winnerMedian: winners[rounds / 2] };
}
// A made-up hole of any par / difficulty (rivals only read par, maxStrokes and difficulty)
const fake = (par, difficulty, maxStrokes = par + 7) => ({ id: `f${par}-${difficulty}`, par, difficulty, maxStrokes });

test('T1: 5 invented rivals, each with a name, a flavour line and a place in the skill range', () => {
  assert.equal(RIVALS.length, 5);
  assert.equal(new Set(RIVALS.map(r => r.id)).size, 5);
  assert.equal(new Set(RIVALS.map(r => r.name)).size, 5);
  for (const r of RIVALS) {
    assert.ok(r.name && r.line, r.id);
    assert.ok(r.rank >= 0 && r.rank <= 1, r.id);
    assert.ok(Object.isFrozen(r), `${r.id} is frozen`);
  }
  // The roster spans the whole skill range: the best at RIVAL_SKILL_MAX, the weakest at RIVAL_SKILL_MIN
  const skills = RIVALS.map(r => rivalSkill(r, 'normal'));
  assert.equal(Math.max(...skills), TUNE.RIVAL_SKILL_MAX);
  assert.equal(Math.min(...skills), TUNE.RIVAL_SKILL_MIN);
});

test('T1: hole odds: a proper distribution from an eagle (par − 2) to the stroke limit, shifted by skill and difficulty', () => {
  const h = HOLES['pl-02'];
  const odds = holeOdds(0.2, h);
  assert.equal(odds[0].toPar, -2);
  assert.equal(odds.at(-1).toPar, h.maxStrokes - h.par);
  assert.ok(Math.abs(sum(odds.map(o => o.p)) - 1) < 1e-12);
  const mean = o => sum(o.map(x => x.toPar * x.p));
  // More skill = lower expected score; a harder hole = higher
  assert.ok(mean(holeOdds(0.6, h)) < mean(holeOdds(0, h)));
  for (let d = 1; d < 5; d++) assert.ok(mean(holeOdds(0.2, fake(4, d))) < mean(holeOdds(0.2, fake(4, d + 1))), `difficulty ${d} < ${d + 1}`);
  // Birdie, par, bogey, double are all possible on a normal hole for a mid-skill rival
  const p = t => odds.find(o => o.toPar === t).p;
  for (const t of [-1, 0, 1, 2]) assert.ok(p(t) > 0.01, `to par ${t}: ${p(t)}`);
});

test('T1 (owner on PR #44): no rival score is ever better than par − 2, and never a hole in one', () => {
  const holes = [...Object.values(HOLES), fake(3, 1), fake(4, 1), fake(5, 1), fake(6, 1)];
  let eagles = 0;
  for (const d of ['easy', 'normal', 'hard']) for (let s = 0; s < 400; s++) {
    for (const r of rivalScores(holes, seedsOf(holes, s), d)) r.strokes.forEach((st, i) => {
      assert.ok(st >= holes[i].par - 2, `${d} seed ${s} ${holes[i].id}: ${st} on a par ${holes[i].par}`);
      assert.ok(st >= 2, `${d} seed ${s} ${holes[i].id}: a hole in one`);
      if (st === holes[i].par - 2) eagles++;
    });
  }
  assert.ok(eagles > 0, 'eagles still happen');
  // Even the strongest rival on the easiest par 3 can't ace it: the best is a birdie
  for (const u of [0, 1e-12]) assert.equal(rivalHoleScore(5, fake(3, 1), u), 2);
  assert.equal(holeOdds(5, fake(3, 1))[0].toPar, -1);
  assert.equal(holeOdds(5, fake(5, 1))[0].toPar, -2);
  // The cap is a tunable: RIVAL_BEST_TO_PAR:-1 = birdie at best, 0 = never under par
  applyTune('RIVAL_BEST_TO_PAR:-1');
  assert.equal(holeOdds(5, fake(5, 1))[0].toPar, -1);
  applyTune('RIVAL_BEST_TO_PAR:0');
  assert.equal(rivalHoleScore(5, fake(4, 1), 0), 4);
});

test('T1: a score is always a whole number of strokes between 1 and the hole\'s stroke limit', () => {
  const holes = [fake(3, 1, 10), fake(4, 5, 10), fake(5, 3, 12), HOLES['pl-01']];
  for (const h of holes) for (const skill of [-2, 0, 0.5, 3]) for (const u of [0, 1e-9, 0.25, 0.5, 0.75, 0.999999999]) {
    const s = rivalHoleScore(skill, h, u);
    assert.ok(Number.isInteger(s) && s >= 1 && s <= h.maxStrokes, `${h.id} skill ${skill} u ${u}: ${s}`);
  }
  // Monotone: a higher u never gives fewer strokes, more skill never gives more
  const h = HOLES['pl-03'];
  for (let k = 0; k < 100; k++) {
    const u = k / 100;
    assert.ok(rivalHoleScore(0.2, h, u) <= rivalHoleScore(0.2, h, u + 0.01));
    assert.ok(rivalHoleScore(0.8, h, u) <= rivalHoleScore(0, h, u));
  }
});

test('T4: same seed = same rival scores; another seed = other scores; the player\'s play never changes them', () => {
  const holes = holesOf('test9');
  const a = rivalScores(holes, seedsOf(holes, 42), 'normal');
  const b = rivalScores(holes, seedsOf(holes, 42), 'normal');
  assert.deepEqual(a, b);
  const c = rivalScores(holes, seedsOf(holes, 43), 'normal');
  assert.notDeepEqual(a.map(r => r.strokes), c.map(r => r.strokes));
  // Through a round: the rivals are fixed when the round starts (same seed), whatever you score,
  // and Restart keeps them
  const r1 = createRound(resolveSet('test9'), { seed: 42, getHole, mode: 'ai', difficulty: 'normal' });
  const r2 = createRound(resolveSet('test9'), { seed: 42, getHole, mode: 'ai', difficulty: 'normal' });
  for (let i = 0; i < 9; i++) { r1.record({ strokes: 2, penalties: 0 }); r1.advance(); r2.record({ strokes: 9, penalties: 0 }); r2.advance(); }
  assert.deepEqual(r1.rivals.map(r => r.strokes), r2.rivals.map(r => r.strokes));
  assert.deepEqual(r1.rivals.map(r => r.strokes), a.map(r => r.strokes));
  const before = r1.rivals.map(r => [...r.strokes]);
  r1.restart();
  assert.deepEqual(r1.rivals.map(r => r.strokes), before);
});

test('T4: the rivals\' numbers never touch the hole\'s wind seed (one stream per hole, from its seed)', () => {
  // The same hole seed in another round (or another place in it) gives the same scores
  const h = HOLES['pl-02'];
  const once = rivalScores([h], [holeSeed(7, 3)], 'hard');
  const inRound = rivalScores([HOLES['pl-01'], HOLES['pl-01'], HOLES['pl-01'], h], seedsOf(Array.from({ length: 4 }), 7), 'hard');
  assert.deepEqual(once.map(r => r.strokes[0]), inRound.map(r => r.strokes[3]));
});

test('T2: difficulty Easy / Normal / Hard shifts every rival\'s skill (from config.js tunables)', () => {
  assert.deepEqual(DIFFICULTIES.map(d => d.id), ['easy', 'normal', 'hard']);
  assert.equal(DEFAULT_DIFFICULTY, 'normal');
  for (const r of RIVALS) {
    assert.ok(rivalSkill(r, 'easy') < rivalSkill(r, 'normal'));
    assert.ok(rivalSkill(r, 'hard') > rivalSkill(r, 'normal'));
    assert.equal(rivalSkill(r, 'easy') - rivalSkill(r, 'normal'), TUNE.RIVAL_EASY_SHIFT);
  }
  assert.throws(() => rivalSkill(RIVALS[0], 'insane'), /unknown difficulty/);
  assert.equal(resolveDifficulty('HARD'), 'hard');
  assert.equal(resolveDifficulty(' easy '), 'easy');
  assert.equal(resolveDifficulty('nope'), null);
  assert.equal(resolveDifficulty(null), null);
  // Same seed: a Hard rival never scores worse than the same rival on Normal, nor Normal than Easy
  const holes = holesOf('test9');
  for (let s = 0; s < 50; s++) {
    const [e, n, h] = ['easy', 'normal', 'hard'].map(d => rivalScores(holes, seedsOf(holes, s), d));
    for (let r = 0; r < 5; r++) for (let i = 0; i < 9; i++) {
      assert.ok(h[r].strokes[i] <= n[r].strokes[i] && n[r].strokes[i] <= e[r].strokes[i], `seed ${s} rival ${r} hole ${i}`);
    }
  }
});

test('T2: the rival tunables are in config.js and ?tune= can change them for a visit', () => {
  for (const k of ['RIVAL_BASE', 'RIVAL_DIFF_K', 'RIVAL_SPREAD', 'RIVAL_BEST_TO_PAR', 'RIVAL_SKILL_MIN', 'RIVAL_SKILL_MAX', 'RIVAL_EASY_SHIFT', 'RIVAL_HARD_SHIFT']) {
    assert.ok(TUNABLES[k], k);
  }
  const holes = holesOf('test9');
  const normal = simulate(holes, 'normal', 200).mean;
  const report = applyTune('RIVAL_SKILL_MIN:1,RIVAL_SKILL_MAX:1.5');
  assert.equal(report.rejected.length, 0);
  assert.ok(simulate(holes, 'normal', 200).mean < normal - 5, 'much stronger rivals with the tune');
});

test('T4: over 1 000 rounds Hard rivals average lower than Normal, Normal lower than Easy', () => {
  const holes = holesOf('test9');
  const [e, n, h] = ['easy', 'normal', 'hard'].map(d => simulate(holes, d));
  assert.ok(h.mean < n.mean && n.mean < e.mean, `easy ${e.mean} normal ${n.mean} hard ${h.mean}`);
  for (let r = 0; r < 5; r++) assert.ok(h.perRival[r] < n.perRival[r] && n.perRival[r] < e.perRival[r], RIVALS[r].id);
  // The roster is ordered: a higher rank averages a lower score
  for (let r = 1; r < 5; r++) assert.ok(n.perRival[r - 1] < n.perRival[r], `${RIVALS[r - 1].id} beats ${RIVALS[r].id}`);
});

test('T4: Normal target: over 1 000 Test 9 rounds the winning rival is about par to 2 under', () => {
  // Proposed target (PR): on the prototype holes (Test 9, par 36), the Normal winner's median is
  // between E and −2 (mean between +0 and −2). Easy's winner is over par, Hard's at least 2 under.
  const holes = holesOf('test9');
  const n = simulate(holes, 'normal');
  assert.ok(n.winnerMedian <= 0 && n.winnerMedian >= -2, `Normal winner median ${n.winnerMedian}`);
  assert.ok(n.winnerMean <= 0 && n.winnerMean >= -2, `Normal winner mean ${n.winnerMean}`);
  assert.ok(simulate(holes, 'easy').winnerMean > 0, 'Easy winner over par');
  assert.ok(simulate(holes, 'hard').winnerMean <= -2, 'Hard winner 2 or more under');
});

test('T4: any course length: 1, 3, 9, 20 and 99 holes (the same hole several times too)', () => {
  for (const n of [1, 3, 9, 20, 99]) {
    const set = { id: `len${n}`, name: `Len ${n}`, holes: Array.from({ length: n }, (_, i) => ['pl-01', 'pl-02', 'pl-03'][i % 3]) };
    const round = createRound(set, { seed: n, getHole, mode: 'ai', difficulty: 'hard' });
    assert.equal(round.rivals.length, 5);
    for (const r of round.rivals) assert.equal(r.strokes.length, n);
    assert.equal(round.leaderboard().length, 6);
    assert.ok(round.leaderboard().every(r => r.thru === 0 && r.toPar === 0 && r.posText === 'T1'));
    for (let i = 0; i < n; i++) {
      round.record({ strokes: round.current.hole.par, penalties: 0 });
      const b = round.leaderboard();
      assert.ok(b.every(r => r.thru === i + 1), `thru ${i + 1}`);
      round.advance();
    }
    const fin = round.leaderboard(), you = fin.find(r => r.you);
    assert.equal(you.toPar, 0);
    for (const r of fin.filter(x => !x.you)) {
      const rv = round.rivals.find(x => x.id === r.id);
      assert.equal(r.strokes, sum(rv.strokes));
    }
  }
});

test('T3: leaderboard: sorted by to par, ties share a position (T2) in a fixed order (you first, then the roster)', () => {
  const pars = [4, 3, 5];
  const entries = [
    { id: 'you', name: 'You', you: true, strokes: [4, 3, 5] },  // E
    { id: 'a', name: 'A', strokes: [3, 3, 5] },                  // -1
    { id: 'b', name: 'B', strokes: [5, 3, 5] },                  // +1
    { id: 'c', name: 'C', strokes: [4, 2, 6] },                  // E
    { id: 'd', name: 'D', strokes: [5, 3, 5] },                  // +1
    { id: 'e', name: 'E', strokes: [3, 4, 5] },                  // E
  ];
  const b = leaderboard(entries, pars, 3);
  assert.deepEqual(b.map(r => [r.posText, r.id, r.toPar]), [['1', 'a', -1], ['T2', 'you', 0], ['T2', 'c', 0], ['T2', 'e', 0], ['T5', 'b', 1], ['T5', 'd', 1]]);
  assert.deepEqual(b.map(r => r.pos), [1, 2, 2, 2, 5, 5]);
  assert.ok(b.every(r => r.thru === 3));
  // The same leaderboard whatever order the rivals are passed in, as long as the roster order is the same
  assert.deepEqual(leaderboard(entries, pars, 3), b);
  // After 1 hole: thru 1, last = that hole's strokes
  const one = leaderboard(entries, pars, 1);
  assert.deepEqual(one.map(r => [r.posText, r.id]), [['T1', 'a'], ['T1', 'e'], ['T3', 'you'], ['T3', 'c'], ['T5', 'b'], ['T5', 'd']]);
  assert.equal(one.find(r => r.id === 'c').last, 4);
  // Before any hole: everyone T1, level
  assert.ok(leaderboard(entries, pars, 0).every(r => r.posText === 'T1' && r.toPar === 0 && r.last === null));
  // Rivals only tie among themselves: roster order
  const rivalsOnly = leaderboard(entries.slice(1), pars, 3);
  assert.deepEqual(rivalsOnly.filter(r => r.toPar === 0).map(r => r.id), ['c', 'e']);
});

test('T3: the player\'s final place', () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th']);
  assert.equal(placeText({ pos: 1, tied: false }, 6), 'You won!');
  assert.equal(placeText({ pos: 1, tied: true }, 6), 'You tied for 1st of 6');
  assert.equal(placeText({ pos: 3, tied: false }, 6), 'You finished 3rd of 6');
  assert.equal(placeText({ pos: 5, tied: true }, 6), 'You tied for 5th of 6');
});

test('T3: a round vs AI: the leaderboard follows the scorecard; solo rounds have no rivals', () => {
  const solo = createRound(resolveSet('prototype3'), { seed: 5, getHole });
  assert.equal(solo.mode, 'solo');
  assert.equal(solo.rivals, null);
  assert.equal(solo.leaderboard(), null);
  assert.equal(solo.difficulty, null);
  const ai = createRound(resolveSet('prototype3'), { seed: 5, getHole, mode: 'ai', difficulty: 'easy' });
  assert.equal(ai.difficulty, 'easy');
  ai.record({ strokes: 3, penalties: 0 });       // par on hole 1
  const b = ai.leaderboard();
  assert.equal(b.length, 6);
  assert.equal(b.find(r => r.you).toPar, 0);
  for (const r of b.filter(x => !x.you)) assert.equal(r.toPar, ai.rivals.find(x => x.id === r.id).strokes[0] - 3);
  assert.throws(() => createRound(resolveSet('prototype3'), { seed: 5, getHole, mode: 'duel' }), /unknown mode/);
  assert.throws(() => createRound(resolveSet('prototype3'), { seed: 5, getHole, mode: 'ai', difficulty: 'insane' }), /unknown difficulty/);
});

test('T3: personal best per course AND mode (solo keeps its old key)', () => {
  assert.equal(bestId('prototype3'), 'prototype3');
  assert.equal(bestId('prototype3', 'solo'), 'prototype3');
  assert.equal(bestId('prototype3', 'ai'), 'prototype3.ai');
  assert.notEqual(bestId('test9', 'ai'), bestId('prototype3', 'ai'));
});

test('Phase T menu: vs AI lists the Solo courses, then Easy / Normal / Hard; ?ai= is a dev link', () => {
  const ai = aiCourses(SETS, HOLES);
  assert.deepEqual(ai.map(c => c.id), soloCourses(SETS, HOLES).map(c => c.id));
  for (const c of ai) assert.deepEqual(c.launch, { kind: 'round', setId: c.id, mode: 'ai' });
  const d = difficultyItems('test9');
  assert.deepEqual(d.map(x => x.launch), ['easy', 'normal', 'hard'].map(difficulty => ({ kind: 'round', setId: 'test9', mode: 'ai', difficulty })));
  assert.ok(DEV_PARAMS.includes('ai') && PLAY_PARAMS.includes('ai'));
});
