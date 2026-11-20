// AP5 (plain Node, dev / artist): prints every readability rule (ART_STYLE §4.4) for one biome set or a
// bare palette module, so the artist sees ΔE / ΔL per pair. `node tools/biome-check.mjs mtn-default`
// (a set in src/biomes/), or `--all` for every registered set. X26: then the minimap tree rules, per
// onTrees look, on the colour the minimap draws ("darkened" = the one fixed MINIMAP_TREE_DARKEN step).
import { checkReadability, checkMinimap } from '../src/core/biome.js';
import { LIBRARY } from '../src/biomes/library.js';
import { BIOMES } from '../src/biomes/index.js';

const args = process.argv.slice(2);
const ids = args.includes('--all') || !args.length ? Object.keys(BIOMES) : args;
let failed = 0;
for (const id of ids) {
  const set = BIOMES[id];
  if (!set) { console.log(`unknown biome set "${id}" (known: ${Object.keys(BIOMES).join(', ')})`); failed++; continue; }
  const waived = set.readabilityWaivers ?? {};
  console.log(`\n${id}: ${set.name}`);
  for (const r of [...checkReadability(set.palette), ...checkMinimap(set, LIBRARY)]) {
    const verdict = r.ok ? 'pass' : Object.hasOwn(waived, r.id) ? 'WAIVED' : 'FAIL';
    if (verdict === 'FAIL') failed++;
    console.log(`  ${r.id.padEnd(20)} ΔE ${r.dE.toFixed(0).padStart(3)} (≥ ${r.minE})  ΔL ${r.dL.toFixed(0).padStart(3)}${r.minL ? ` (≥ ${r.minL})` : '      '}  ${verdict}${verdict === 'WAIVED' ? `: ${waived[r.id]}` : ''}${r.look ? `  (${r.look} ${r.a}${r.darkened ? ', darkened' : ''})` : ''}`);
  }
}
process.exitCode = failed ? 1 : 0;
