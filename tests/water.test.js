// X43: the see-through water surface's pure part (core/water.js, DESIGN §8b "The water surface").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WATER_LOOK, TUNABLES } from '../src/core/config.js';
import { lab } from '../src/core/biome.js';
import { BIOMES } from '../src/biomes/index.js';
import { HOLES } from '../src/holes/sets.js';
import { waterSurface, waterColours, waterSurfaceOn } from '../src/core/water.js';

const terrainOf = h => ({ heightAt: h.heightAt.bind(h), surfaceAt: h.surfaceAt.bind(h) });
const cache = new Map();
const surf = id => { if (!cache.has(id)) cache.set(id, waterSurface(HOLES[id], terrainOf(HOLES[id]))); return cache.get(id); };
const WET = ['pl-01', 'pl-02', 'mtn-01', 'mtn-03', 'mtn-04', 'mtn-05', 'mtn-06', 'mtn-07', 'mtn-08', 'mtn-09'];

test('the compare switches: WATER_SURFACE 0/1 (default 1), WATER_OPACITY, WATER_SHEEN', () => {
  assert.deepEqual(TUNABLES.WATER_SURFACE, { def: 1, min: 0, max: 1 });
  assert.equal(TUNABLES.WATER_OPACITY.def, 0.5);
  assert.equal(TUNABLES.WATER_SHEEN.def, 1);
  assert.equal(waterSurfaceOn(1), true); assert.equal(waterSurfaceOn(0), false);
  assert.equal(waterSurfaceOn(0.6), true); assert.equal(waterSurfaceOn(0.4), false);
});

test('a hole without water gets no surface', () => {
  assert.equal(surf('pl-03'), null);
  assert.equal(surf('mtn-02'), null);
});

test('every hole with water gets one mesh; every wet point is drawn at least `lift` over its bed, the shore ring under the ground', () => {
  for (const id of WET) {
    const h = HOLES[id], w = surf(id);
    assert.ok(w, id);
    const s = WATER_LOOK.step, n = w.positions.length / 3;
    let wet = 0, ring = 0;
    for (let v = 0; v < n; v++) {
      const x = w.positions[v * 3], y = w.positions[v * 3 + 1], z = w.positions[v * 3 + 2];
      const bed = h.heightAt(x, z);
      if (h.surfaceAt(x, z) === 'water') { wet++; assert.ok(y >= bed + WATER_LOOK.lift - 1e-4, `${id} (${x}, ${z}): ${y} vs bed ${bed}`); } else {
        ring++; assert.ok(Math.abs(y - (bed - WATER_LOOK.dive)) < 1e-4, `${id} shore (${x}, ${z})`);
      }
      assert.ok(Number.isInteger((x - h.map.x0) / s) && Number.isInteger((z - h.map.z0) / s));
    }
    assert.equal(wet, w.bodies.reduce((a, b) => a + b.wet, 0), id);
    assert.ok(ring > 0, id);
    assert.equal(w.index.length, w.tris * 3);
    for (const i of w.index) assert.ok(i < n);
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
    assert.ok(Math.abs(y - WATER_LOOK.lift) < 1e-6 || Math.abs(y + WATER_LOOK.dive) < 1e-6, String(y));
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
  assert.deepEqual(a.positions, b.positions); assert.deepEqual(a.index, b.index);
});

test('the colours come from the palette: a tint lighter than the bed (water → skyHorizon), the sky, the sun', () => {
  for (const set of Object.values(BIOMES)) {
    const P = set.palette, c = waterColours(P);
    assert.equal(c.sky, P.skyHorizon); assert.equal(c.sun, P.sun);
    assert.match(c.tint, /^#[0-9a-f]{6}$/);
    assert.ok(lab(c.tint)[0] >= lab(P.water)[0], `${set.id}: tint ${c.tint} vs water ${P.water}`);
  }
});
