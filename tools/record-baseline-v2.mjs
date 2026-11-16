// Records tests/fixtures/baseline-v2.json from the CURRENT engine (pure Node, no browser needed).
//
//   node tools/record-baseline-v2.mjs
//
// The engine is frame-rate independent since Phase 0, so these shots must replay to within
// 0.01 m (tests/baseline-v2.test.js). Re-record only when a PR intentionally changes the feel,
// and explain why in that PR (AGENTS.md coding rule 8).
import { writeFileSync } from 'node:fs';
import { SHOTS, playShot } from '../tests/baseline-v2.shots.js';

const out = {
  note: 'Golden shots from the shared engine (Phase 0+), recorded by tools/record-baseline-v2.mjs. ' +
    'Must replay within the tolerance. Re-record only for an intentional feel change, and say why in the PR.',
  tolerance: 0.01,
  shots: SHOTS.map(s => ({ ...s, end: playShot(s) })),
};
const file = new URL('../tests/fixtures/baseline-v2.json', import.meta.url);
writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${out.shots.length} shots to ${file.pathname}`);
