// AP7a: the gradient tree pieces (core/trees.js): the phone budget, the fit to the collider, the gradient.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TREE_IDS, treeParts, sceneryTree, triangles, partBounds, gradientHex, treeColours, lathe } from '../src/core/trees.js';
import { TREE_LOOK, PERF_BUDGET } from '../src/core/config.js';
import { LIBRARY } from '../src/biomes/library.js';

const gradientPieces = group => Object.entries(LIBRARY[group]).filter(([, p]) => p.gradient).map(([id]) => id);

test('every gradient tree piece has a builder, the gradient slots, and its tris is the real count', () => {
  for (const group of ['onTrees', 'offTrees']) for (const id of gradientPieces(group)) {
    assert.ok(TREE_IDS.includes(id), `${group}.${id} has no core/trees.js builder`);
    const p = LIBRARY[group][id];
    for (const slot of ['low', 'canopy', 'top', 'trunk']) assert.ok(p.slots[slot], `${group}.${id} slot ${slot}`);
    assert.equal(p.slots.low, 'leafLow'); assert.equal(p.slots.top, 'leafTop');
    const parts = treeParts(id), n = group === 'onTrees' ? triangles(parts.trunk) + triangles(parts.canopy) : triangles(sceneryTree(id));
    assert.equal(p.tris, n, `${group}.${id} tris`);
  }
  assert.deepEqual(gradientPieces('onTrees').sort(), [...TREE_IDS].sort());
});

test('the phone budget: every tree ≤ 500 triangles (the palm ≤ 400), a scenery tree lighter than in play', () => {
  for (const id of TREE_IDS) {
    const p = treeParts(id), n = triangles(p.trunk) + triangles(p.canopy);
    assert.ok(n <= PERF_BUDGET.modelTriangles, `${id}: ${n}`);
    assert.ok(triangles(sceneryTree(id)) < n, `${id} scenery`);
  }
  const palm = treeParts('palmTree');
  assert.ok(triangles(palm.trunk) + triangles(palm.canopy) <= 400);
});

test('fit to the collider: the canopy roughly fills the unit ellipsoid box, the trunk its unit cylinder', () => {
  for (const id of TREE_IDS) {
    const { trunk, canopy } = treeParts(id), c = partBounds(canopy), t = partBounds(trunk);
    // the look never reaches far outside the canopy collider...
    assert.ok(c.rMax <= 1.1 && c.y0 >= -1.001 && c.y1 <= 1.001, `${id} canopy inside: ${JSON.stringify(c)}`);
    // ...and fills most of it (a ball hitting the leaves hits something you see)
    assert.ok(c.x1 - c.x0 >= 1.6 && c.z1 - c.z0 >= 1.5, `${id} canopy width`);
    assert.ok(c.y1 - c.y0 >= 1.5 && c.y1 >= 0.8, `${id} canopy height`);
    assert.ok(t.y0 === 0 && t.y1 === 1, `${id} trunk from its foot to the trunk top`);
    // the trunk is the collider's width (the palm's bows sideways by `bend` trunk radii, its top and foot on the axis)
    assert.ok(t.rMax <= 1 + (TREE_LOOK[id].bend ?? 0) + 1e-9, `${id} trunk radius ${t.rMax}`);
  }
});

test('the conifers: the spruce is narrower than the pine and has more tiers', () => {
  const pine = partBounds(treeParts('pineTree').canopy), spruce = partBounds(treeParts('spruceTree').canopy);
  assert.ok(spruce.rMax < pine.rMax);
  assert.ok(TREE_LOOK.spruceTree.tiers.length > TREE_LOOK.pineTree.tiers.length);
});

test('the gradient: leafLow at the bottom, leaf in the middle, leafTop at the top; trunk vertices take the trunk / mark', () => {
  const low = '#000000', mid = '#808080', top = '#ffffff';
  assert.equal(gradientHex(low, mid, top, 0), low);
  assert.equal(gradientHex(low, mid, top, 0.5), mid);
  assert.equal(gradientHex(low, mid, top, 1), top);
  for (const id of TREE_IDS) { // weights rise with height: the lowest vertex is darker than the highest
    const { canopy } = treeParts(id);
    let lo = 0, hi = 0;
    for (let i = 0; i < canopy.w.length; i++) {
      if (canopy.positions[i * 3 + 1] < canopy.positions[lo * 3 + 1]) lo = i;
      if (canopy.positions[i * 3 + 1] > canopy.positions[hi * 3 + 1]) hi = i;
    }
    assert.ok(canopy.w[hi] - canopy.w[lo] >= 0.7, `${id} gradient spans bottom → top`);
    assert.ok(canopy.w.every(w => w >= 0 && w <= 1));
  }
  const c = { low, canopy: mid, top, trunk: '#112233', mark: '#445566' };
  const s = sceneryTree('birchTree'), cols = treeColours(s, c, i => s.trunk[i]);
  assert.ok(cols.includes('#112233') && cols.includes('#445566'), 'birch bark has the trunk colour and the marks');
});

test('lathe: faces point outward (a closed shape has a positive signed volume)', () => {
  const p = lathe([[0, 1, 0], [1, 0, 0], [0, -1, 0]], 8);
  let vol = 0;
  for (let i = 0; i < p.indices.length; i += 3) {
    const [a, b, c] = [0, 1, 2].map(k => p.positions.slice(p.indices[i + k] * 3, p.indices[i + k] * 3 + 3));
    vol += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  assert.ok(vol > 0, `volume ${vol}`);
  assert.equal(triangles(p), 16);
});
