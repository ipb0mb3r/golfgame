// AP1b: the terrain mesh with detail by distance (src/core/terrainMesh.js, DESIGN §5 "Terrain mesh").
// The mesh is looks only (the ball uses heightAt), so the checks are about what the player sees:
//   - every hole's terrain is inside the phone budget (PERF_BUDGET.terrainTriangles),
//   - the ball sits on the drawn ground: on the play area (fairway, green, fringe, tee, sand) and
//     everywhere else in bounds, the drawn height is as close to heightAt as the old full mesh was
//     (the worst spot and 99% of the points, see below),
//   - no cracks: where two tiles meet, both draw the same edge,
//   - the background ground plane stays under the lowest drawn point (K13).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOLES } from '../src/holes/sets.js';
import { makeTerrain, meshAxis } from '../src/core/terrain.js';
import { buildTerrainMesh, tileHeight, gridHeight } from '../src/core/terrainMesh.js';
import { PERF_BUDGET, TERRAIN_LOD, GROUND_PLANE_MARGIN } from '../src/core/config.js';
import { createRng } from '../src/core/rng.js';

// The mesh before AP1b: one grid on the hole's scenery.mesh axes, heightAt at every point
function oldMeshHeight(hole, xs, zs, x, z) {
  const i = Math.max(0, xs.findIndex(v => v > x) - 1), j = Math.max(0, zs.findIndex(v => v > z) - 1);
  const cx = [xs[i], xs[i + 1]], cz = [zs[j], zs[j + 1]];
  const h = [hole.heightAt(cx[0], cz[0]), hole.heightAt(cx[1], cz[0]), hole.heightAt(cx[0], cz[1]), hole.heightAt(cx[1], cz[1])];
  return gridHeight(cx, cz, h, x, z);
}

const PLAY = new Set(TERRAIN_LOD.detailSurfaces);
const built = new Map();
const meshOf = hole => built.get(hole.id) ?? built.set(hole.id, buildTerrainMesh(hole, makeTerrain(hole))).get(hole.id);

for (const hole of Object.values(HOLES)) {
  test(`AP1b: ${hole.id} terrain mesh is inside the triangle budget`, () => {
    const m = meshOf(hole);
    assert.ok(m.triangles <= PERF_BUDGET.terrainTriangles, `${hole.id}: ${m.triangles} terrain triangles > ${PERF_BUDGET.terrainTriangles}`);
    assert.equal(m.index.length, m.triangles * 3);
    assert.ok(m.index.every(k => k < m.positions.length / 3));
  });

  test(`AP1b: ${hole.id} the ball sits on the drawn ground where it can go`, () => {
    // 6000 seeded points in bounds: how far the drawn ground is from heightAt (where the ball sits),
    // with the old full mesh and with the new one, on the play area and on the rest
    const m = meshOf(hole), map = hole.map, r = createRng(77);
    const xs = meshAxis(hole.scenery.mesh.xs), zs = meshAxis(hole.scenery.mesh.zs);
    const err = { play: { old: [], now: [] }, rest: { old: [], now: [] } };
    for (let k = 0; k < 6000; k++) {
      const x = map.x0 + r() * (map.x1 - map.x0), z = map.z0 + r() * (map.z1 - map.z0);
      const s = hole.surfaceAt(x, z);
      if (s === 'ob') continue;
      const h = hole.heightAt(x, z), e = PLAY.has(s) ? err.play : err.rest;
      e.old.push(Math.abs(oldMeshHeight(hole, xs, zs, x, z) - h));
      e.now.push(Math.abs(m.heightOnMesh(x, z) - h));
    }
    const q = (a, p) => { const v = [...a].sort((u, w) => u - w); return v[Math.min(v.length - 1, Math.floor(v.length * p))] ?? 0; };
    for (const [where, e] of Object.entries(err)) {
      // the worst spot no more than 1.5 cm further off than before, and 99% of the points within 5 mm
      // of how close they were or within TERRAIN_LOD.tol (the coarser tiles' limit); BALL_R is 9 cm
      assert.ok(q(e.now, 1) <= q(e.old, 1) + 0.015, `${hole.id} ${where}: worst ${q(e.now, 1).toFixed(3)} m off heightAt, was ${q(e.old, 1).toFixed(3)} m`);
      assert.ok(q(e.now, 0.99) <= Math.max(q(e.old, 0.99) + 0.005, TERRAIN_LOD.tol), `${hole.id} ${where}: 99% within ${q(e.now, 0.99).toFixed(4)} m, was ${q(e.old, 0.99).toFixed(4)} m`);
    }
  });

  test(`AP1b: ${hole.id} terrain tiles meet without cracks, above the ground plane`, () => {
    const m = meshOf(hole);
    const at = new Map(m.tiles.map(t => [t.col + ',' + t.row, t]));
    for (const t of m.tiles) {
      const right = at.get(t.col + 1 + ',' + t.row), down = at.get(t.col + ',' + (t.row + 1));
      const x1 = t.xs[t.xs.length - 1], z1 = t.zs[t.zs.length - 1];
      for (const z of [...t.zs, ...(right?.zs ?? [])]) if (right) {
        const d = Math.abs(tileHeight(t, x1, z) - tileHeight(right, x1, z));
        assert.ok(d < 1e-9, `${hole.id}: crack of ${d} m at x ${x1}, z ${z}`);
      }
      for (const x of [...t.xs, ...(down?.xs ?? [])]) if (down) {
        const d = Math.abs(tileHeight(t, x, z1) - tileHeight(down, x, z1));
        assert.ok(d < 1e-9, `${hole.id}: crack of ${d} m at x ${x}, z ${z1}`);
      }
    }
    let low = Infinity;
    for (let k = 1; k < m.positions.length; k += 3) low = Math.min(low, m.positions[k]);
    assert.ok(hole.scenery.ground.y <= low - GROUND_PLANE_MARGIN + 1e-6, `${hole.id}: ground plane ${hole.scenery.ground.y} not under the lowest drawn point ${low}`);
  });
}
