// Records tests/fixtures/baseline-v2.json from the CURRENT engine (pure Node, no browser needed).
//
//   node tools/record-baseline-v2.mjs           show what would change, then write the file
//   node tools/record-baseline-v2.mjs --dry     only show what would change (writes nothing)
//
// The engine is frame-rate independent since Phase 0, so these shots must replay to within
// 0.01 m (tests/baseline-v2.test.js). Re-record only when a PR intentionally changes the feel,
// and explain why in that PR (AGENTS.md coding rule 8).
//
// Gate A T3: before writing, it prints every shot that moved (how far, and any change of club,
// end event, strokes or lip-out) plus new and removed shots. Paste that table in the PR so the
// reviewer and the owner can see that ONLY the expected shots moved. Nothing changed = nothing written.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { SHOTS, playShot } from '../tests/baseline-v2.shots.js';

const file = new URL('../tests/fixtures/baseline-v2.json', import.meta.url);
const dry = process.argv.includes('--dry');
const TOLERANCE = 0.01;

const out = {
  note: 'Golden shots from the shared engine (Phase 0+), recorded by tools/record-baseline-v2.mjs. ' +
    'Must replay within the tolerance. Re-record only for an intentional feel change, and say why in the PR.',
  tolerance: TOLERANCE,
  shots: SHOTS.map(s => ({ ...s, end: playShot(s) })),
};

const old = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { shots: [] };
const oldByName = new Map(old.shots.map(s => [s.name, s]));
const newNames = new Set(out.shots.map(s => s.name));
const sameInputs = (a, b) => JSON.stringify({ ...a, end: undefined }) === JSON.stringify({ ...b, end: undefined });

const rows = [];
for (const [i, s] of out.shots.entries()) {
  const o = oldByName.get(s.name), e = s.end;
  if (!o) { rows.push(['NEW', i + 1, s.name, '', `${e.club}, ${e.event}${e.lippedOut ? ' (lipped out)' : ''}, ${e.strokes} strokes, ends (${e.x.toFixed(2)}, ${e.z.toFixed(2)})`]); continue; }
  const oe = o.end, moved = Math.hypot(e.x - oe.x, e.y - oe.y, e.z - oe.z);
  const changes = [];
  if (!sameInputs(s, o)) changes.push('inputs changed');
  if (e.club !== oe.club) changes.push(`club ${oe.club} → ${e.club}`);
  if (e.event !== oe.event) changes.push(`event ${oe.event} → ${e.event}`);
  if (e.strokes !== oe.strokes) changes.push(`strokes ${oe.strokes} → ${e.strokes}`);
  if (!!e.lippedOut !== !!oe.lippedOut) changes.push(`lip-out ${!!oe.lippedOut} → ${!!e.lippedOut}`);
  if (moved > 0 || changes.length) {
    rows.push([moved > TOLERANCE || changes.length ? 'MOVED' : 'tiny', i + 1, s.name, moved.toFixed(3),
      `(${oe.x.toFixed(2)}, ${oe.z.toFixed(2)}) → (${e.x.toFixed(2)}, ${e.z.toFixed(2)})${changes.length ? ' · ' + changes.join(' · ') : ''}`]);
  }
}
for (const o of old.shots) if (!newNames.has(o.name)) rows.push(['REMOVED', '', o.name, '', '']);

if (!rows.length) {
  console.log(`baseline v2: all ${out.shots.length} shots replay exactly as recorded. Nothing to write.`);
} else {
  console.log('| what | # | shot | moved (m) | details |');
  console.log('|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.join(' | ')} |`);
  const count = k => rows.filter(r => r[0] === k).length;
  console.log(`\n${count('MOVED')} moved, ${count('tiny')} within ${TOLERANCE} m, ${count('NEW')} new, ${count('REMOVED')} removed, ` +
    `${out.shots.length - rows.filter(r => r[0] !== 'REMOVED').length} unchanged.`);
  if (dry) console.log('--dry: nothing written.');
  else {
    writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
    console.log(`wrote ${out.shots.length} shots to ${file.pathname}`);
  }
}
