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
