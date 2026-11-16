// X8: every designer scenario points at a real hole and puts the ball on the surface it promises.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, resolveScenario } from '../src/holes/scenarios.js';
import { HOLES } from '../src/holes/sets.js';
import { createHolePlay } from '../src/core/play.js';

const REQUIRED = ['h1-bunker', 'h1-green', 'h1-pond-carry', 'h2-fairway-bunker', 'h2-cross-bunker', 'h2-green-step', 'h2-side-slope'];

test('all the scenarios from the task exist', () => {
  for (const id of REQUIRED) assert.ok(Object.hasOwn(SCENARIOS, id), id);
});

for (const [id, sc] of Object.entries(SCENARIOS)) {
  test(`scenario ${id} starts on ${sc.lie} with a fixed seed`, () => {
    assert.ok(Object.hasOwn(HOLES, sc.hole), 'known hole');
    assert.ok(Number.isInteger(sc.seed), 'fixed seed');
    const play = createHolePlay(HOLES[sc.hole], { seed: sc.seed });
    play.reset(sc);
    assert.equal(play.lie, sc.lie);
    assert.equal(play.strokes, sc.strokes);
    assert.ok(play.strokes < HOLES[sc.hole].maxStrokes);
    if (sc.wind) assert.deepEqual([play.wind.x, play.wind.z], [sc.wind.x, sc.wind.z]);
    // same seed, same wind every visit
    const again = createHolePlay(HOLES[sc.hole], { seed: sc.seed }); again.reset(sc);
    assert.deepEqual(again.wind, play.wind);
    if (sc.lie === 'green') assert.ok(play.club.putter, 'putter on the green');
  });
}

test('resolveScenario: case-insensitive, unknown ids are reported', () => {
  assert.equal(resolveScenario('H1-Bunker').scenario.id, 'h1-bunker');
  assert.deepEqual(resolveScenario(null), { scenario: null, unknown: false });
  for (const bad of ['nope', 'constructor', '__proto__', 'toString']) assert.deepEqual(resolveScenario(bad), { scenario: null, unknown: true }, bad);
});

test('F1: every retry of a scenario uses the same seed (first load, intro card, Play again)', () => {
  for (const [id, sc] of Object.entries(SCENARIOS)) {
    const hole = HOLES[sc.hole];
    // what the page does: one play object, reset at load, again on "Tee off" and on every "Play again"
    const play = createHolePlay(hole, { seed: sc.seed });
    const runs = [];
    for (let attempt = 0; attempt < 4; attempt++) {
      play.reset(sc);
      const wind = { x: play.wind.x, z: play.wind.z };
      play.hit(0.6, 0.12);                    // a curved shot, so wind and RNG matter
      const ev = play.simulate();
      runs.push({ wind, ev: ev.type, pos: { ...play.ball.pos }, strokes: play.strokes });
    }
    for (const r of runs.slice(1)) assert.deepEqual(r, runs[0], `${id}: retry differs`);
    // and the same as a fresh page load
    const fresh = createHolePlay(hole, { seed: sc.seed }); fresh.reset(sc);
    assert.deepEqual({ x: fresh.wind.x, z: fresh.wind.z }, runs[0].wind, `${id}: fresh load`);
  }
});

test('F1: random numbers used during a try (lip-outs, wind) do not change the next try', () => {
  const sc = SCENARIOS['h2-side-slope'];          // seeded wind (no fixed wind)
  const play = createHolePlay(HOLES[sc.hole], { seed: sc.seed });
  play.reset(sc); const first = { ...play.wind };
  for (let i = 0; i < 3; i++) play.newWind();       // draws from the same RNG, like a lip-out does
  play.reset(sc);
  assert.deepEqual({ ...play.wind }, first);
});
