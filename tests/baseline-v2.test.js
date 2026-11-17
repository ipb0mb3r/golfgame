// Baseline v2: shots recorded from the shared engine itself. The engine is frame-rate independent,
// so they must replay within 0.01 m. If a PR changes the feel on purpose, re-record with
// `node tools/record-baseline-v2.mjs` and explain why in the PR (AGENTS.md coding rule 8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { playShot } from './baseline-v2.shots.js';

const base = JSON.parse(readFileSync(new URL('./fixtures/baseline-v2.json', import.meta.url), 'utf8'));

for (const [i, shot] of base.shots.entries()) {
  test(`baseline v2 #${i + 1} ${shot.name}`, () => {
    const r = playShot(shot), e = shot.end;
    assert.equal(r.club, e.club, 'auto-picked club');
    assert.equal(r.event, e.event, 'how the shot ended');
    assert.equal(r.strokes, e.strokes, 'strokes');
    assert.equal(r.lippedOut ?? false, e.lippedOut ?? false, 'lipped out on the way');
    const d = Math.hypot(r.x - e.x, r.y - e.y, r.z - e.z);
    assert.ok(d <= base.tolerance, `rest position off by ${d.toFixed(4)} m (recorded ${e.x.toFixed(3)}, ${e.z.toFixed(3)}; now ${r.x.toFixed(3)}, ${r.z.toFixed(3)})`);
  });
}
