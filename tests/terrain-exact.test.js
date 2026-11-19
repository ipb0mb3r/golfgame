// X20: the faster Mountain 9 heightAt must give exactly the heights it gave before (DESIGN §5).
// tests/fixtures/terrain-heights.json was recorded from the old heightAt (main 29ebbf3, before X20):
//   - `pts`: the exact height at 500 seeded points per hole (the map, the scenery around it, and
//     the bunkers, ponds, rocks, creek, green and tee, where the speed-ups skip work), and
//   - `hash`: a hash of the bits of every height on a dense grid over the map (0.613 m) and a
//     coarser one over the whole scenery (7.3 m), so any change anywhere shows.
// Re-record only if a hole's terrain is changed on purpose (a course designer's edit):
//   RECORD_TERRAIN=1 node --test tests/terrain-exact.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { HOLES } from '../src/holes/sets.js';
import { createRng } from '../src/core/rng.js';

const FIXTURE = new URL('./fixtures/terrain-heights.json', import.meta.url);
const N_PTS = 500;

// The seeded sample points of one hole: [x, z] pairs
function samplePoints(hole) {
  const r = createRng(2020), m = hole.map, f = hole.features ?? {};
  const pts = [];
  const around = (cx, cz, rad, n) => { for (let i = 0; i < n; i++) { const a = r() * 2 * Math.PI, d = rad * Math.sqrt(r()); pts.push([cx + Math.cos(a) * d, cz + Math.sin(a) * d]); } };
  const spots = [];
  for (const b of [...(f.bunkers ?? []), ...(f.ponds ?? []), ...(f.rocks ?? [])]) spots.push([b.cx, b.cz, 2.5 * Math.max(b.rx, b.rz) + 4]);
  if (f.green) spots.push([f.green.cx, f.green.cz, 2.5 * Math.max(f.green.rx ?? 15, f.green.rz ?? 15)]);
  spots.push([hole.tee.x, hole.tee.z, 18]);
  for (const p of f.creek?.pts ?? []) if (r() < 0.25) spots.push([p.x, p.z, (p.w ?? 3) + 8]);
  const nNear = Math.floor(N_PTS * 0.4 / spots.length);
  for (const [cx, cz, rad] of spots) around(cx, cz, rad, nNear);
  while (pts.length < N_PTS * 0.8) pts.push([m.x0 + r() * (m.x1 - m.x0), m.z0 + r() * (m.z1 - m.z0)]);
  while (pts.length < N_PTS) pts.push([m.x0 - 300 + r() * (m.x1 - m.x0 + 600), m.z0 - 360 + r() * (m.z1 - m.z0 + 560)]);
  return pts;
}

// FNV-1a over the 8 bytes of each height (exact: one changed bit changes the hash)
function denseHash(hole) {
  const m = hole.map, f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
  let h = 0x811c9dc5, n = 0;
  const mix = v => { f64[0] = v; for (const w of u32) for (let s = 0; s < 32; s += 8) h = Math.imul(h ^ ((w >>> s) & 255), 0x01000193); n++; };
  for (let z = m.z0; z <= m.z1; z += 0.613) for (let x = m.x0; x <= m.x1; x += 0.613) mix(hole.heightAt(x, z));
  for (let z = m.z0 - 360; z <= m.z1 + 200; z += 7.3) for (let x = m.x0 - 300; x <= m.x1 + 300; x += 7.3) mix(hole.heightAt(x, z));
  return { hash: (h >>> 0).toString(16), n };
}

const record = () => Object.fromEntries(Object.values(HOLES).map(h => [h.id, {
  pts: samplePoints(h).map(([x, z]) => h.heightAt(x, z)), ...denseHash(h),
}]));

if (process.env.RECORD_TERRAIN) {
  writeFileSync(FIXTURE, JSON.stringify(record()) + '\n');
  console.log('recorded', FIXTURE.pathname);
}
const REF = JSON.parse(readFileSync(FIXTURE, 'utf8'));

for (const hole of Object.values(HOLES)) {
  test(`X20: ${hole.id} heightAt gives the recorded heights exactly`, () => {
    const ref = REF[hole.id];
    assert.ok(ref, `no recorded heights for ${hole.id} (record them with RECORD_TERRAIN=1)`);
    const pts = samplePoints(hole);
    let worst = 0, at = null, diff = 0;
    pts.forEach(([x, z], i) => {
      const d = Math.abs(hole.heightAt(x, z) - ref.pts[i]);
      if (d !== 0) diff++;
      if (d > worst) { worst = d; at = [x, z]; }
    });
    assert.ok(worst <= 1e-9, `${hole.id}: up to ${worst} m off at ${at}`);
    assert.equal(diff, 0, `${hole.id}: ${diff} of ${pts.length} points differ (largest ${worst} m)`);
    assert.deepEqual(denseHash(hole), { hash: ref.hash, n: ref.n }, `${hole.id}: the dense grid of heights changed`);
  });
}
