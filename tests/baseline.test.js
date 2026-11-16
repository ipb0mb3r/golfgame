// F0 baseline: the shots recorded from the pre-refactor pages must land within the tolerance
// (0.5 m) when replayed through the new core. See tools/baseline.mjs and tests/fixtures/baseline.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHolePlay } from '../src/core/play.js';
import { getHole } from '../src/holes/sets.js';

import { applyTune } from '../src/core/tune.js';

// v1 checks PHYSICS ONLY (flight, bounce, roll, slopes); v2 checks swing feel (AGENTS.md rule 8).
// These shots were recorded from the old pages, so they replay with the old swing mapping: a neutral
// lie window (S11 sweetScale 1) and the linear curve (S10 CURVE_SHAPE 1). Otherwise the new, gentler
// swing would turn the old hook/slice inputs into different shots.
applyTune('tee.sweetScale:1,fairway.sweetScale:1,green.sweetScale:1,CURVE_SHAPE:1');

const base = JSON.parse(readFileSync(new URL('./fixtures/baseline.json', import.meta.url), 'utf8'));

export function replay(shot) {
  const play = createHolePlay(getHole(shot.hole), { seed: 1 });
  play.wind.x = play.wind.z = 0;
  play.ball.pos.x = shot.start.x; play.ball.pos.z = shot.start.z;
  play.prepare();
  const club = play.club.name, aim = play.aim;
  play.strokes = shot.start.strokes;
  play.aim += shot.aimOff;
  play.hit(shot.power, shot.acc);
  const ev = play.simulate();
  if (ev && ev.type === 'penalty') play.returnToLastPos();
  const { x, y, z } = play.ball.pos;
  return { club, aim, ev, end: { x, y, z, strokes: play.strokes } };
}

for (const [i, shot] of base.shots.entries()) {
  test(`baseline #${i + 1} ${shot.scenario} (power ${shot.power}, acc ${shot.acc})`, t => {
    const r = replay(shot);
    assert.equal(r.club, shot.start.club, 'auto-picked club');
    assert.ok(Math.abs(r.aim - shot.start.aim) < 1e-3, 'auto aim at the pin');
    const off = e => Math.hypot(r.end.x - e.x, r.end.z - e.z);
    const d = off(shot.end);
    if (d > base.tolerance) {
      // The old page itself landed this shot in different places at different frame rates
      // (its leftover partial step, fixed by F3). Accept a match with one of those old results.
      const alts = Object.entries(shot.endAtFps || {}).filter(([, e]) => e);
      const spread = Math.max(0, ...alts.map(([, e]) => Math.hypot(e.x - shot.end.x, e.z - shot.end.z)));
      const match = alts.find(([, e]) => off(e) <= base.tolerance && e.strokes === r.end.strokes);
      assert.ok(spread > base.tolerance && match,
        `rest position off by ${d.toFixed(3)} m (old ${shot.end.x}, ${shot.end.z}; new ${r.end.x.toFixed(3)}, ${r.end.z.toFixed(3)})`);
      t.diagnostic(`off by ${d.toFixed(2)} m from the old 60 fps result, but the old page spread ${spread.toFixed(2)} m across frame rates; matches its ${match[0]} fps result within ${off(match[1]).toFixed(3)} m`);
    }
    assert.equal(r.end.strokes, shot.end.strokes, 'strokes');
    assert.equal(r.ev.type === 'holed', shot.end.state === 'holed', 'holed or not');
  });
}
