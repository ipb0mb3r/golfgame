// X43: the see-through water surface's pure part (core/water.js, DESIGN §8b "The water surface").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WATER_LOOK, TUNABLES } from '../src/core/config.js';
import { lab } from '../src/core/biome.js';
import { BIOMES } from '../src/biomes/index.js';
import { HOLES } from '../src/holes/sets.js';
import { waterSurface, waterColours, shoreFade } from '../src/core/water.js';

const terrainOf = h => ({ heightAt: h.heightAt.bind(h), surfaceAt: h.surfaceAt.bind(h) });
const cache = new Map();
const surf = id => { if (!cache.has(id)) cache.set(id, waterSurface(HOLES[id], terrainOf(HOLES[id]))); return cache.get(id); };
const WET = ['pl-01', 'pl-02', 'mtn-01', 'mtn-03', 'mtn-04', 'mtn-05', 'mtn-06', 'mtn-07', 'mtn-08', 'mtn-09'];

test('the look switches: WATER_LINES (0 = no web), WATER_CELL (m), WATER_SPEED; the old tint switches are gone', () => {
  assert.deepEqual([TUNABLES.WATER_LINES.def, TUNABLES.WATER_LINES.min], [0.85, 0]);
  assert.equal(TUNABLES.WATER_CELL.def, 2.4); assert.ok(TUNABLES.WATER_CELL.min > 0);
  assert.equal(TUNABLES.WATER_SPEED.def, 1); assert.equal(TUNABLES.WATER_SPEED.min, 0);
  for (const gone of ['WATER_SURFACE', 'WATER_OPACITY', 'WATER_SHEEN']) assert.equal(TUNABLES[gone], undefined, gone);
  // visible from the tee without shimmer (owner on #131): lines 1.5-2.5 px on screen at any distance, no fade by
  // distance (only the fog), a coarser web (~6-10 m cells) where the main cells get small on screen, dimmer far away
  assert.equal(WATER_LOOK.fade, undefined);
  assert.ok(WATER_LOOK.linePx >= 1.5 && WATER_LOOK.linePx <= 2.5);
  const coarse = TUNABLES.WATER_CELL.def * WATER_LOOK.coarse[0];
  assert.ok(coarse >= 6 && coarse <= 10, String(coarse));
  assert.ok(WATER_LOOK.coarse[1] > 0 && WATER_LOOK.coarse[1] <= 1);
  assert.ok(WATER_LOOK.cellPx[0] >= 4 * WATER_LOOK.linePx && WATER_LOOK.cellPx[0] < WATER_LOOK.cellPx[1]);
  assert.ok(WATER_LOOK.dim[0] > 0 && WATER_LOOK.dim[0] < 1 && WATER_LOOK.dim[1] > WATER_LOOK.cellPx[1]);
  assert.ok(WATER_LOOK.ballClear[1] >= 1.5 && WATER_LOOK.ballClear[0] < WATER_LOOK.ballClear[1]);
});

test('a hole without water gets no surface', () => {
  assert.equal(surf('pl-03'), null);
  assert.equal(surf('mtn-02'), null);
});

test('every hole with water gets one mesh; every wet point is drawn at least `lift` over its bed, the bank points `hug` over the ground', () => {
  for (const id of WET) {
    const h = HOLES[id], w = surf(id);
    assert.ok(w, id);
    const s = WATER_LOOK.step, n = w.positions.length / 3;
    let wet = 0, ring = 0;
    assert.equal(w.shore.length, n);
    for (let v = 0; v < n; v++) {
      const x = w.positions[v * 3], y = w.positions[v * 3 + 1], z = w.positions[v * 3 + 2];
      const bed = h.heightAt(x, z);
      if (h.surfaceAt(x, z) === 'water') { wet++; assert.ok(y >= bed + WATER_LOOK.lift - 1e-4, `${id} (${x}, ${z}): ${y} vs bed ${bed}`); assert.ok(w.shore[v] >= 0, `${id} wet shore`); } else {
        ring++; assert.ok(Math.abs(y - (bed + WATER_LOOK.hug)) < 1e-4, `${id} bank (${x}, ${z})`); assert.ok(w.shore[v] <= 0, `${id} dry shore`);
      }
      assert.ok(Number.isInteger((x - h.map.x0) / s) && Number.isInteger((z - h.map.z0) / s));
    }
    assert.equal(wet, w.bodies.reduce((a, b) => a + b.wet, 0), id);
    assert.ok(ring > 0, id);
    assert.equal(w.index.length, w.tris * 3);
    for (const i of w.index) assert.ok(i < n);
  }
});

test('the soft edge: the fade is 0 at edge[0] m onto the bank, 1 from edge[1] m inside, smooth and rising between', () => {
  const [out, inn] = WATER_LOOK.edge;
  assert.ok(out + inn >= 0.5 && out + inn <= 1.5, 'a short band (owner: 0.5–1.5 m)');
  assert.equal(shoreFade(-out), 0); assert.equal(shoreFade(-out - 1), 0);
  assert.equal(shoreFade(inn), 1); assert.equal(shoreFade(inn + 3), 1);
  let last = 0;
  for (let d = -out; d <= inn; d += 0.05) { const f = shoreFade(d); assert.ok(f >= last - 1e-12); last = f; }
  // a vertex's distance to the edge is close to its true distance: a grid point next to the shore is less than
  // one step from it, and a wet point at the shore's grid neighbour reads within the step
  for (const id of ['pl-01', 'mtn-04', 'mtn-07']) {
    const w = surf(id), s = WATER_LOOK.step;
    let edgeBand = 0;
    for (let v = 0; v < w.shore.length; v++) {
      assert.ok(Math.abs(w.shore[v]) <= Math.max(out, inn) + s + 1e-4, `${id} ${w.shore[v]}`);
      if (Math.abs(w.shore[v]) < s) edgeBand++;
    }
    assert.ok(edgeBand > 0, id);
  }
});

test('the mesh reaches onto the bank only as far as the fade: every drawn cell has a corner the fade still shows', () => {
  for (const id of WET) {
    const w = surf(id);
    for (let t = 0; t < w.tris; t += 2) { // two triangles per cell, the first one holds 3 of its 4 corners
      const a = w.index[t * 3], b = w.index[t * 3 + 1], c = w.index[t * 3 + 2], d = w.index[t * 3 + 5];
      assert.ok(Math.max(w.shore[a], w.shore[b], w.shore[c], w.shore[d]) > -WATER_LOOK.edge[0], id);
    }
  }
});

test('every water point of the map (on the grid) is inside the surface', () => {
  for (const id of ['pl-01', 'pl-02', 'mtn-05']) {
    const h = HOLES[id], w = surf(id), s = WATER_LOOK.step, have = new Set();
    for (let v = 0; v < w.positions.length / 3; v++) have.add(`${w.positions[v * 3]},${w.positions[v * 3 + 2]}`);
    for (let z = h.map.z0; z <= h.map.z1; z += s) for (let x = h.map.x0; x <= h.map.x1; x += s) {
      if (h.surfaceAt(x, z) === 'water') assert.ok(have.has(`${x},${z}`), `${id} (${x}, ${z})`);
    }
  }
});

test('a pond is flat at its level: pl-01 (flat ground) at lift, pl-02 near its WATER_Y (X42: no longer hides the bed)', () => {
  const a = surf('pl-01');
  assert.equal(a.bodies.length, 1);
  for (let v = 0; v < a.positions.length / 3; v++) {
    const y = a.positions[v * 3 + 1];
    assert.ok(Math.abs(y - WATER_LOOK.lift) < 1e-6 || Math.abs(y - WATER_LOOK.hug) < 1e-6, String(y));
  }
  const b = surf('pl-02');
  assert.equal(b.bodies.length, 1);
  // the level is the shore half way between the last wet and the first dry grid point: on the bowl's steep wall a bit
  // under the hole's own WATER_Y (near the shore the surface then follows the bed, so the water's edge is covered)
  const wy = HOLES['pl-02'].features.waterY;
  assert.ok(b.bodies[0].level < wy && b.bodies[0].level > wy - 0.35, `${b.bodies[0].level} vs ${HOLES['pl-02'].features.waterY}`);
});

test('a creek on a slope follows its bed (it is not one flat sheet at its lowest point)', () => {
  const w = surf('mtn-04'), h = HOLES['mtn-04'];
  let follow = 0, n = 0;
  for (let v = 0; v < w.positions.length / 3; v++) {
    const x = w.positions[v * 3], y = w.positions[v * 3 + 1], z = w.positions[v * 3 + 2];
    if (h.surfaceAt(x, z) !== 'water') continue;
    n++; if (Math.abs(y - (h.heightAt(x, z) + WATER_LOOK.lift)) < 1e-4) follow++;
  }
  assert.ok(follow / n > 0.9, `${follow} / ${n}`);
});

test('phone budget: the water mesh stays small (≤ 20k triangles on every hole, one draw call)', () => {
  for (const id of WET) assert.ok(surf(id).tris <= 20000, `${id}: ${surf(id).tris}`);
});

test('deterministic: the same hole gives the same mesh', () => {
  const h = HOLES['mtn-03'], a = waterSurface(h, terrainOf(h)), b = waterSurface(h, terrainOf(h));
  assert.deepEqual(a.positions, b.positions); assert.deepEqual(a.index, b.index); assert.deepEqual(a.shore, b.shore);
});

test('the web\'s colour comes from the palette: the sky\'s cloud warmed toward the sun, near white, lighter than the bed', () => {
  for (const set of Object.values(BIOMES)) {
    const P = set.palette, c = waterColours(P);
    assert.deepEqual(Object.keys(c), ['line']);
    assert.match(c.line, /^#[0-9a-f]{6}$/);
    assert.ok(lab(c.line)[0] >= 90, `${set.id}: line ${c.line} not near white`);
    assert.ok(lab(c.line)[0] > lab(P.water)[0] + 10, `${set.id}: line ${c.line} vs water ${P.water}`);
  }
});
