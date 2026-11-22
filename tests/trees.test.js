// AP7a: the gradient tree pieces (core/trees.js): the phone budget, the fit to the collider, the gradient.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TREE_IDS, treeParts, sceneryTree, triangles, partBounds, gradientHex, treeColours, lathe, canopyAspect, isFarTree } from '../src/core/trees.js';
import { TREE_LOOK, TREE_FAR, PERF_BUDGET } from '../src/core/config.js';
import { LIBRARY } from '../src/biomes/library.js';
import { BIOMES } from '../src/biomes/index.js';
import { minimapColours, minimapShade, pieceColours } from '../src/core/biome.js';

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

test('the mid colours (artist Q4 on #105): pine → pine, spruce and palm → leafAlt, round canopy and birch → leaf; the minimap follows', () => {
  const MID = { pineTree: 'pine', spruceTree: 'leafAlt', palmTree: 'leafAlt', roundCanopy: 'leaf', birchTree: 'leaf' };
  assert.deepEqual(Object.keys(MID).sort(), [...TREE_IDS].sort());
  for (const group of ['onTrees', 'offTrees']) for (const [id, key] of Object.entries(MID)) assert.equal(LIBRARY[group][id].slots.canopy, key, `${group}.${id}`);
  for (const [setId, set] of Object.entries(BIOMES)) {
    assert.ok(set.palette.leafAlt, `${setId} defines leafAlt`);
    const trees = minimapColours(set, LIBRARY).trees;
    for (const id of set.onTrees.filter(i => MID[i])) {
      assert.equal(pieceColours(set, LIBRARY)('onTrees', id).canopy, set.palette[MID[id]], `${setId} ${id} 3D mid colour`);
      assert.equal(trees[id], minimapShade(set.palette, 'tree', set.palette[MID[id]], id).colour, `${setId} ${id} minimap colour`);
    }
  }
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
    // (the palm's crown keeps to the middle: a palm crown is flat, and the colliders are taller than wide)
    const palm = id === 'palmTree';
    assert.ok(c.y1 - c.y0 >= (palm ? 0.85 : 1.3) && c.y1 >= (palm ? 0.3 : 0.8), `${id} canopy height`);
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

test('AP7b: the round canopy is built per collider proportion, stacked (more rings when taller), never past the collider, within budget', () => {
  const L = TREE_LOOK.roundCanopy;
  assert.equal(canopyAspect('roundCanopy', 2.6, 3.25), 1.25); // the mountain holes
  assert.equal(canopyAspect('roundCanopy', 2.33, 3.5), 1.5);  // pl-01 / pl-02
  assert.equal(canopyAspect('roundCanopy', 4.5, 4), 0.9);     // pl-03
  assert.equal(canopyAspect('pineTree', 2.6, 3.25), null);    // the other pieces: one shape, fitted
  let lobes = 0;
  for (const a of L.aspects) {
    const p = treeParts('roundCanopy', a), c = partBounds(p.canopy), n = triangles(p.trunk) + triangles(p.canopy);
    assert.ok(n <= PERF_BUDGET.modelTriangles, `aspect ${a}: ${n} triangles`);
    assert.ok(c.y0 >= -1.001 && c.y1 <= 1.001 && c.rMax <= 1.1, `aspect ${a} inside the collider`);
    // fills it: from its floor (the canopy starts at the collider's bottom, ~30 % of the tree: no lollipop) to its top
    assert.ok(c.y0 <= -0.97 && c.y1 >= 0.97 && c.x1 - c.x0 >= 1.6, `aspect ${a} fills the collider: ${JSON.stringify(c)}`);
    assert.ok(p.canopy.positions.length >= lobes, `aspect ${a}: at least as many lobes as a shorter collider`);
    lobes = p.canopy.positions.length;
  }
  assert.deepEqual(treeParts('roundCanopy'), treeParts('roundCanopy', L.aspect));
});

test('AP7b: the far scenery trees: cheaper than the scenery version, the same size; only beyond TREE_FAR.from outside the OB box; the palm has none', () => {
  for (const [id, p] of Object.entries(LIBRARY.offTrees).filter(([, q]) => q.gradient)) {
    const near = sceneryTree(id), far = sceneryTree(id, true);
    if (!TREE_LOOK[id].far) { assert.equal(p.farTris, undefined, id); assert.deepEqual(far, near, `${id}: no far version`); continue; }
    assert.equal(p.farTris, triangles(far), `${id} farTris`);
    assert.ok(triangles(far) <= 0.7 * triangles(near), `${id}: far ${triangles(far)} vs ${triangles(near)}`);
    const a = partBounds(near), b = partBounds(far);
    assert.ok(Math.abs(a.y1 - b.y1) < 0.05 * a.y1 && b.rMax >= 0.8 * a.rMax, `${id}: the same size`);
  }
  assert.equal(TREE_LOOK.palmTree.far, undefined);
  const stakes = { xs: [-40, 40], z0: 10, z1: -300 }, d = TREE_FAR.from;
  assert.equal(isFarTree('pineTree', stakes, 40 + d - 1, -100), false);
  assert.equal(isFarTree('pineTree', stakes, 40 + d + 1, -100), true);
  assert.equal(isFarTree('pineTree', stakes, 0, -300 - d - 1), true);
  assert.equal(isFarTree('pineTree', { x: 55, z0: 15, z1: -200 }, -55 - d - 1, 0), true); // the { x } stakes form
  assert.equal(isFarTree('palmTree', stakes, 500, 0), false);
});
