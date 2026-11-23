// AP7c (small-prop scatter) and X33 (per-pick slot override): DESIGN §8b "Small props" and "Slot overrides".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBiomeSet, normalizeBiomeSet, pieceColours, checkMinimap, minimapColours, flagColour, pickId, PICKS } from '../src/core/biome.js';
import { pickedPieces } from '../src/core/assets.js';
import { propRank, normalizeSmallProps, scatterSmallProps, scatterArea, propHidden, visibleSmallProps, smallPropPart, SMALL_PROP_PIECES, holeSeed, propSpotOk, shoreline, clearOf, stakeThings } from '../src/core/smallProps.js';
import { SMALL_PROPS } from '../src/core/config.js';
import { makeTerrain } from '../src/core/terrain.js';
import { LIBRARY } from '../src/biomes/library.js';
import { BIOMES, resolveBiome } from '../src/biomes/index.js';
import { HOLES } from '../src/holes/sets.js';

const meadow = BIOMES['meadow-day'];
const withChange = change => ({ ...meadow, id: 'x-test', ...change });
// the AP7c form: weights share one set-level perHa (still valid), clusters of a fixed count
const rule = { pieces: [{ id: 'grassTuft', weight: 5 }, { id: 'grassTuft', weight: 3, cluster: { count: 8, radius: 1.2 } }, { id: 'flowerPatch', weight: 2, slots: { petal: 'propB' }, cluster: { count: 10, radius: 1.5 } }, { id: 'flowerPatch', weight: 0.6 }], perHa: 2500, on: ['rough', 'ob'] };
const MEADOW_RULE = BIOMES['test-small-props'].smallProps; // AP7d: the spec's Meadow numbers, per pick
const REAL_SETS = ['meadow-day', 'alpine-day', 'island-day', 'mtn-default', 'proto-default'];

// ---- X33: the per-pick slot override ----
test('X33: every existing set reads exactly as before through normalizeBiomeSet (string picks unchanged)', () => {
  for (const [id, set] of Object.entries(BIOMES)) {
    const n = resolveBiome(id);
    for (const field of Object.keys(PICKS)) assert.deepEqual(n[field], set[field], `${id}.${field}`);
    assert.deepEqual(n.slotOverrides, {}, id);
    // every piece's colours are the same from the set as written and as resolved
    for (const [group, pid] of pickedPieces(set)) if (group !== 'smallProps') assert.deepEqual(pieceColours(n, LIBRARY)(group, pid), pieceColours(set, LIBRARY)(group, pid), `${id} ${group} ${pid}`);
    assert.deepEqual(minimapColours(n, LIBRARY), minimapColours(set, LIBRARY), id);
  }
  // the artist's real sets pick no small props yet
  for (const id of REAL_SETS) assert.deepEqual(resolveBiome(id).smallProps, { pieces: [], perHa: 0, on: [] }, id);
});

test('X33: a pick may be { id, slots }: trees, rocks, sky, furniture; the game reads its colours from the override', () => {
  const set = withChange({ onTrees: [{ id: 'roundCanopy', slots: { canopy: 'leafAlt' } }, 'pineTree'], sky: { id: 'gradientSky', slots: { top: 'skyHorizon' } } });
  assert.equal(validateBiomeSet(set, LIBRARY), set);
  const P = meadow.palette;
  for (const s of [set, normalizeBiomeSet(set)]) {
    const look = pieceColours(s, LIBRARY);
    assert.equal(look('onTrees', 'roundCanopy').canopy, P.leafAlt);
    assert.equal(look('onTrees', 'roundCanopy').low, P.leafLow); // the other slots keep the library's keys
    assert.equal(look('onTrees', 'pineTree').canopy, P.pine);
    assert.equal(look('offTrees', 'roundCanopy').canopy, P.leaf); // another group's pick of the same piece is not overridden
    assert.equal(look('skies', 'gradientSky').top, P.skyHorizon);
  }
  const n = normalizeBiomeSet(set);
  assert.deepEqual([n.onTrees, n.sky], [['roundCanopy', 'pineTree'], 'gradientSky']); // the game reads ids as before
  assert.deepEqual(n.slotOverrides, { onTrees: { roundCanopy: { canopy: 'leafAlt' } }, skies: { gradientSky: { top: 'skyHorizon' } } });
  assert.equal(pickId(set.onTrees[0]), 'roundCanopy');
  assert.deepEqual(pickedPieces(set).filter(([g]) => g === 'onTrees'), [['onTrees', 'roundCanopy'], ['onTrees', 'pineTree']]);
  // the minimap draws the overridden canopy (darkened one step if it fails, as any look)
  const row = checkMinimap(set, LIBRARY).find(r => r.look === 'roundCanopy');
  assert.equal(row.darkened ? row.a !== P.leafAlt : row.a === P.leafAlt, true);
});

test('X33: validateBiomeSet checks the id, each slot and each palette key, naming the set and the field', () => {
  const v = s => () => validateBiomeSet(s, LIBRARY);
  assert.throws(v(withChange({ onTrees: [{ id: 'roundCanopy', slots: { leaves: 'leafAlt' } }] })), /biome set "x-test": onTrees\[0\] \(roundCanopy\)\.slots: "leaves" is not a slot of this piece \(its slots: low, canopy, top, trunk\)/);
  assert.throws(v(withChange({ onTrees: ['pineTree', { id: 'roundCanopy', slots: { canopy: 'leafy' } }] })), /biome set "x-test": onTrees\[1\] \(roundCanopy\)\.slots\.canopy: "leafy" is not a palette key/);
  assert.throws(v(withChange({ onTrees: [{ id: 'oak', slots: { canopy: 'leaf' } }] })), /biome set "x-test": onTrees: unknown piece "oak"/);
  assert.throws(v(withChange({ onTrees: [{ slots: { canopy: 'leaf' } }] })), /onTrees\[0\] must be a piece id or \{ id, slots/);
  assert.throws(v(withChange({ onTrees: [{ id: 'roundCanopy', colour: 'leaf' }] })), /onTrees\[0\] \(roundCanopy\) has an unknown key "colour" \(known: id, slots\)/);
  assert.throws(v(withChange({ onTrees: [{ id: 'roundCanopy', slots: ['leaf'] }] })), /onTrees\[0\] \(roundCanopy\)\.slots must be \{ <slot>: '<palette key>' \}/);
  assert.throws(v(withChange({ onTrees: ['roundCanopy', { id: 'roundCanopy', slots: { canopy: 'leafAlt' } }] })), /onTrees lists a piece twice/);
  assert.throws(v(withChange({ furniture: { ...meadow.furniture, stakes: { id: 'whiteStakes', slots: { post: 'wood' } } } })), /furniture\.stakes \(whiteStakes\)\.slots: "post" is not a slot of this piece \(its slots: none\)/);
  assert.throws(v(withChange({ smallProps: { pieces: [{ id: 'grassTuft', slots: { blade: 'rough' } }], perHa: 10, on: ['rough'] } })), /smallProps\.pieces\[0\] \(grassTuft\)\.slots: "blade" is not a slot of this piece \(its slots: base, tip\)/);
});

test('X33: the readability rules run on the overridden colours (minimap trees, the flag and the tee markers)', () => {
  const v = s => () => validateBiomeSet(s, LIBRARY);
  // a flag drawn in the green's colour fails the accent rules, named with the pick
  assert.throws(v(withChange({ furniture: { ...meadow.furniture, flag: { id: 'clothFlag', slots: { cloth: 'greenA' } } } })), /accent\/greenA \(furniture\.flag cloth → greenA\) ΔE 0 \(≥ 30\)/);
  assert.throws(v(withChange({ furniture: { ...meadow.furniture, teeMarkers: { id: 'ballMarkers', slots: { marker: 'rough' } } } })), /subAccent\/rough \(furniture\.teeMarkers marker → rough\) ΔE 0/);
  // a flag override that still reads passes, and the flag is drawn in it
  // (propB, Meadow's red flowers, is too close to the warning red: accent/warn catches it)
  assert.throws(v(withChange({ furniture: { ...meadow.furniture, flag: { id: 'clothFlag', slots: { cloth: 'propB' } } } })), /accent\/warn \(furniture\.flag cloth → propB\) ΔE 14 \(≥ 15\)/);
  const wood = withChange({ furniture: { ...meadow.furniture, flag: { id: 'clothFlag', slots: { cloth: 'wood' } } } });
  assert.ok(validateBiomeSet(wood, LIBRARY));
  assert.equal(flagColour(normalizeBiomeSet(wood), LIBRARY), meadow.palette.wood);
  // a canopy override the minimap can't tell from the fairway fails minimapTree, named with its look
  const P = { ...meadow.palette, leafAlt: '#e8ffd8', fairwayA: '#e8ffd8', fairwayB: '#e8ffd8' };
  const pale = withChange({ palette: P, onTrees: [{ id: 'spruceTree', slots: { canopy: 'fairwayA' } }] });
  assert.throws(v(pale), /minimapTree\/(fairway|rough) \(spruceTree\)/);
});

// ---- AP7c: the format ----
test('AP7c: the smallProps format: a bare id = weight 1, weights, clusters; { pieces: [] } stays valid', () => {
  assert.deepEqual(normalizeSmallProps({ pieces: [] }), { pieces: [], perHa: 0, on: [] });
  assert.deepEqual(normalizeSmallProps({ pieces: ['grassTuft', { id: 'flowerPatch', weight: 2, slots: { petal: 'propB' }, cluster: { count: 10, radius: 1.5 } }], perHa: 300, on: ['rough'] }), {
    pieces: [{ id: 'grassTuft', weight: 1, slots: {}, cluster: null, perHa: null, on: null, perTenM: null },
      { id: 'flowerPatch', weight: 2, slots: { petal: 'propB' }, cluster: { count: [10, 10], radius: 1.5 }, perHa: null, on: null, perTenM: null }], perHa: 300, on: ['rough'],
  });
  for (const id of REAL_SETS) assert.deepEqual(BIOMES[id].smallProps, { pieces: [] }, id);
  assert.ok(validateBiomeSet(BIOMES['test-small-props'], LIBRARY));
  const v = sp => () => validateBiomeSet(withChange({ smallProps: sp }), LIBRARY);
  const ok = { perHa: 100, on: ['rough'] };
  assert.throws(v({ pieces: [{ id: 'grassTuft', weight: 0 }], ...ok }), /biome set "x-test": smallProps\.pieces\[0\]\.weight must be a number > 0 \(got 0\)/);
  assert.throws(v({ pieces: [{ id: 'grassTuft', cluster: { count: 1, radius: 1 } }], ...ok }), /smallProps\.pieces\[0\]\.cluster\.count must be a whole number 2–30 or \[min, max\] \(1–30, min ≤ max\) \(got 1\)/);
  assert.throws(v({ pieces: [{ id: 'grassTuft', cluster: { count: 5, radius: 20 } }], ...ok }), /smallProps\.pieces\[0\]\.cluster\.radius must be a number > 0 and ≤ 8 m \(got 20\)/);
  assert.throws(v({ pieces: [{ id: 'grassTuft', cluster: { count: 5, r: 1 } }], ...ok }), /cluster has an unknown key "r"/);
  assert.throws(v({ pieces: [{ id: 'grassTuft', size: 2 }], ...ok }), /smallProps\.pieces\[0\] \(grassTuft\) has an unknown key "size" \(known: id, weight, slots, cluster, perHa, on, perTenM\)/);
  assert.throws(v({ pieces: ['grassTuft'], perHa: 99999, on: ['rough'] }), /smallProps\.perHa must be a number 0–4000/);
  assert.throws(v({ pieces: ['grassTuft'], perHa: 10, on: [] }), /smallProps\.on must list the surfaces/);
  // never on the course itself, whatever `on` says
  for (const s of ['tee', 'fairway', 'fringe', 'green', 'sand', 'water', 'rock']) assert.throws(v({ pieces: ['grassTuft'], perHa: 10, on: ['rough', s] }), new RegExp(`smallProps\\.on: props may only stand on rough, ob \\(never on "${s}"\\)`));
  assert.throws(v({ pieces: [], density: 3 }), /smallProps has an unknown key "density"/);
  // the same piece may be picked twice (two colourings); each pick has its own colours
  const two = withChange({ smallProps: { pieces: [{ id: 'flowerPatch', slots: { petal: 'propA' } }, { id: 'flowerPatch', slots: { petal: 'propB' } }], ...ok } });
  assert.ok(validateBiomeSet(two, LIBRARY));
  const [a, b] = normalizeBiomeSet(two).smallProps.pieces.map(p => pieceColours(two, LIBRARY)('smallProps', p));
  assert.deepEqual([a.petal, b.petal], [meadow.palette.propA, meadow.palette.propB]);
});

test('the bush dome shades low at the foot to top at the crown, like the trees (SPEC)', () => {
  const p = smallPropPart('flowerBush');
  const dome = []; // the first 30 triangles are the dome; its vertices come first
  const used = new Set(p.indices.slice(0, 30 * 3));
  for (const v of used) dome.push([p.positions[v * 3 + 1], p.w[v]]);
  const ys = dome.map(d => d[0]), lo = Math.min(...ys), hi = Math.max(...ys);
  for (const [y, w] of dome) { if (y - lo < 1e-6) assert.ok(Math.abs(w) < 1e-6, 'foot w = 0'); if (hi - y < 1e-6) assert.ok(Math.abs(w - 1) < 1e-6, 'crown w = 1'); }
  assert.ok(hi - lo > 0.5);
  assert.ok(dome.some(d => d[0] - lo < 1e-6) && dome.some(d => hi - d[0] < 1e-6));
});
test('AP7d: the six pieces: ids, ≤ 50 triangles, the artist\'s counts, the library slots, valid shapes', () => {
  const ids = ['grassTuft', 'flowerPatch', 'flowerBush', 'pebbles', 'flatStone', 'reeds'];
  assert.deepEqual(SMALL_PROP_PIECES.slice().sort(), ids.slice().sort());
  assert.deepEqual(Object.keys(LIBRARY.smallProps).sort(), ids.slice().sort());
  const spec = { grassTuft: 21, flowerPatch: 45, flowerBush: 46, pebbles: 30, flatStone: 24, reeds: 30 }; // SPEC §1
  for (const id of SMALL_PROP_PIECES) {
    const p = smallPropPart(id), lib = LIBRARY.smallProps[id], n = p.positions.length / 3;
    assert.ok(p.tris <= 50, id);
    assert.equal(p.tris, spec[id], id);
    assert.equal(p.tris, lib.tris, id);
    assert.ok(lib.desc.length > 20, id);
    assert.equal(p.w.length, n, id); assert.equal(p.lo.length, n, id); assert.equal(p.hi.length, n, id);
    assert.ok(p.indices.every(i => Number.isInteger(i) && i >= 0 && i < n), id);
    assert.ok(p.positions.every(Number.isFinite) && p.w.every(w => w >= 0 && w <= 1), id);
    // slots: every slot the shape paints is in the library, and every library slot is painted
    assert.deepEqual([...new Set([...p.lo, ...p.hi])].sort(), Object.keys(lib.slots).sort(), id);
    assert.ok(lib.scale[0] >= 0.8 && lib.scale[1] <= 1.4 && lib.scale[0] < lib.scale[1], id);
    assert.ok(lib.shade ? lib.shade.slots.every(s => s in lib.slots) : true, id);
  }
  // the spec's sizes (scale 1) and slot → palette keys (SPEC §1, §3)
  const h = id => smallPropPart(id).height;
  const wide = id => { const p = smallPropPart(id).positions, xs = p.filter((_, i) => i % 3 === 0), zs = p.filter((_, i) => i % 3 === 2); return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)); };
  assert.ok(h('grassTuft') >= 0.28 && h('grassTuft') <= 0.45);
  assert.ok(h('flowerPatch') <= 0.05 && wide('flowerPatch') > 0.6 && wide('flowerPatch') < 0.95);
  assert.ok(Math.abs(h('flowerBush') - 0.92) < 0.1 && wide('flowerBush') < 1.5 && wide('flowerBush') > 1.1);
  assert.ok(h('flatStone') <= 0.13 && wide('flatStone') > 0.45 && wide('flatStone') < 0.75);
  assert.ok(h('reeds') >= 0.7 && h('reeds') <= 1.15);
  const S = id => LIBRARY.smallProps[id].slots;
  assert.deepEqual(S('grassTuft'), { base: 'deepRough', tip: 'leafTop' });
  assert.deepEqual(S('reeds'), { base: 'deepRough', tip: 'leafTop' });
  assert.deepEqual(S('flowerPatch'), { petal: 'propA' });
  assert.deepEqual(S('flowerBush'), { low: 'leafLow', top: 'leafTop', flower: 'propA' });
  assert.deepEqual([S('pebbles'), S('flatStone')], [{ stone: 'boulder' }, { stone: 'boulder' }]);
  // the tint is on the green slots only: petals, flowers and stones keep their exact colour
  assert.equal(LIBRARY.smallProps.flowerPatch.shade, undefined);
  assert.equal(LIBRARY.smallProps.pebbles.shade, undefined);
  assert.deepEqual(LIBRARY.smallProps.flowerBush.shade.slots, ['low', 'top']);
  assert.deepEqual(LIBRARY.smallProps.grassTuft.shade.slots, ['base', 'tip']);
  assert.equal(LIBRARY.smallProps.grassTuft.shade.half, 0.5);
  // flat heads face up (the toon shading needs the front side up); the thin pieces are drawn from both sides
  const up = smallPropPart('flowerPatch');
  for (let t = 0; t < up.tris; t++) {
    const [a, b, c] = [0, 1, 2].map(k => up.positions.slice(up.indices[t * 3 + k] * 3, up.indices[t * 3 + k] * 3 + 3));
    assert.ok((b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]) > 0, `flower triangle ${t} faces up`);
  }
  assert.deepEqual(SMALL_PROP_PIECES.filter(id => smallPropPart(id).doubleSide), ['grassTuft', 'reeds']);
  // a piece's shape is always the same (every copy shares it)
  assert.deepEqual(smallPropPart('flowerBush'), smallPropPart('flowerBush'));
});

// ---- AP7c: the scatter ----
const scatter = (id, r = normalizeSmallProps(rule), keep) => {
  const hole = HOLES[id], t = makeTerrain(hole);
  return { hole, t, props: scatterSmallProps(hole, { heightAt: t.heightAt, surfaceAt: t.surfaceAt, rule: r, keep }) };
};
test('AP7c: the scatter is deterministic per hole (same props every load), and differs between holes', () => {
  const a = scatter('mtn-07').props, b = scatter('mtn-07').props;
  assert.ok(a.length > 1000);
  assert.deepEqual(a, b);
  assert.notEqual(holeSeed('mtn-07'), holeSeed('mtn-06'));
  assert.notDeepEqual(scatter('mtn-06').props.slice(0, 5), a.slice(0, 5));
  assert.deepEqual(scatter('mtn-07', normalizeSmallProps({ pieces: [] })).props, []);
  assert.ok(a.length <= SMALL_PROPS.maxProps);
});

test('AP7c: props stand only on the listed allowed surfaces, clear of other surfaces, the tee, the cup and the green', () => {
  for (const id of ['pl-01', 'pl-02', 'mtn-03', 'mtn-07']) {
    const { hole, t, props } = scatter(id), area = scatterArea(hole);
    assert.ok(props.length > 100, id);
    for (const p of props) {
      assert.ok(SMALL_PROPS.surfaces.includes(t.surfaceAt(p.x, p.z)), `${id} ${p.x},${p.z}`);
      for (const a of [0, 1, 2, 3]) assert.ok(['rough', 'ob'].includes(t.surfaceAt(p.x + Math.cos(a * Math.PI / 2) * SMALL_PROPS.edgeClear, p.z + Math.sin(a * Math.PI / 2) * SMALL_PROPS.edgeClear)), id);
      assert.ok(Math.hypot(p.x - hole.tee.x, p.z - hole.tee.z) >= SMALL_PROPS.teeClear, id);
      assert.ok(Math.hypot(p.x - hole.cup.x, p.z - hole.cup.z) >= SMALL_PROPS.cupClear, id);
      assert.ok(p.x >= area.x0 && p.x <= area.x1 && p.z >= area.z0 && p.z <= area.z1, id);
      assert.equal(p.y, t.heightAt(p.x, p.z));
    }
    // only the surfaces `on` lists: rough only → nothing beyond OB
    const roughOnly = scatter(id, normalizeSmallProps({ ...rule, on: ['rough'] })).props;
    assert.ok(roughOnly.length && roughOnly.every(p => t.surfaceAt(p.x, p.z) === 'rough'), id);
  }
  // the green's apron: a spot next to the green (but beyond cupClear) is refused
  const hole = HOLES['mtn-07'], t = makeTerrain(hole), ctx = { hole, surfaceAt: t.surfaceAt, area: scatterArea(hole), on: ['rough', 'ob'] };
  let found = 0;
  for (let x = -60; x <= 60; x += 0.5) for (let z = -470; z <= -390; z += 0.5) {
    if (t.surfaceAt(x, z) !== 'rough' || Math.hypot(x - hole.cup.x, z - hole.cup.z) <= SMALL_PROPS.cupClear) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => ['green', 'fringe'].includes(t.surfaceAt(x + a * 1.5, z + b * 1.5)))) { assert.equal(propSpotOk(x, z, ctx), false); found++; }
  }
  assert.ok(found > 0);
  // the game's extra test (the ocean's beach) is honoured
  assert.deepEqual(scatter('mtn-07', normalizeSmallProps(rule), x => x < 0).props.filter(p => p.x >= 0), []);
});

test('AP7c: weights share the props, and a clustered pick comes in patches within its radius', () => {
  const r = normalizeSmallProps({ pieces: [{ id: 'grassTuft', weight: 3 }, { id: 'flowerPatch', weight: 1 }], perHa: 800, on: ['rough', 'ob'] });
  const { props } = scatter('mtn-07', r);
  const n = [0, 1].map(k => props.filter(p => p.pick === k).length);
  assert.ok(n[0] / n[1] > 2.4 && n[0] / n[1] < 3.6, `${n}`);
  const c = normalizeSmallProps({ pieces: [{ id: 'flowerPatch', cluster: { count: 10, radius: 1.5 } }], perHa: 400, on: ['rough', 'ob'] });
  const patch = scatter('mtn-07', c).props;
  assert.ok(patch.length > 100);
  // every flower has another one of its patch near it (within the patch's diameter)
  for (const p of patch) assert.ok(patch.some(q => q !== p && Math.hypot(q.x - p.x, q.z - p.z) <= 3), `${p.x},${p.z}`);
  // and patches are far apart compared with their size: the average nearest-neighbour distance is small
  const nn = patch.map(p => Math.min(...patch.filter(q => q !== p).map(q => Math.hypot(q.x - p.x, q.z - p.z))));
  assert.ok(nn.reduce((s, d) => s + d, 0) / nn.length < 1);
});

// ---- AP7c: what is drawn (fairness rule: a small prop never hides the ball) ----
test('AP7c: a prop near the ball, or on the line from the ball to the camera, is hidden', () => {
  const ball = { x: 0, y: 0.02, z: 0 }, cam = { x: 0, y: 2, z: 6 }, h = 0.3, C = SMALL_PROPS;
  assert.equal(propHidden({ x: 0.5, y: 0, z: 0 }, h, ball, cam, C.ballClear, C.lineClear), true);  // next to the ball
  assert.equal(propHidden({ x: 1.5, y: 0, z: -1 }, h, ball, cam, C.ballClear, C.lineClear), false); // beside it, off the line
  assert.equal(propHidden({ x: 0, y: 0, z: 1.6 }, h, ball, cam, C.ballClear, C.lineClear), true);   // between the ball and the camera
  assert.equal(propHidden({ x: 0, y: 0, z: 4 }, h, ball, cam, C.ballClear, C.lineClear), false);    // under the line, near the camera (the line is high there)
  assert.equal(propHidden({ x: 0.5, y: 0, z: 0 }, h, { x: 0, y: 12, z: 0 }, cam, C.ballClear, C.lineClear), false); // the ball high in the air
  assert.equal(propHidden({ x: 0.5, y: 0, z: 0 }, h, ball, cam, 0, 0), false); // ?tune=PROP_BALL_CLEAR:0 turns it off
});

test('AP7c: the drawn props: nearest first, within drawDist, at most maxTris triangles, never one that could hide the ball', () => {
  const { props } = scatter('mtn-07');
  const parts = normalizeSmallProps(rule).pieces.map(p => smallPropPart(p.id)), part = k => parts[k];
  const C = SMALL_PROPS;
  // a ball in the rough with the camera behind it
  const p0 = props[Math.floor(props.length / 2)], ball = { x: p0.x, y: p0.y + 0.02, z: p0.z }, cam = { x: p0.x, y: p0.y + 2.6, z: p0.z + 6 };
  const shown = visibleSmallProps(props, cam, ball, part);
  assert.ok(shown.length > 50);
  const d = i => Math.hypot(props[i].x - cam.x, props[i].y - cam.y, props[i].z - cam.z);
  for (let k = 1; k < shown.length; k++) assert.ok(d(shown[k]) >= d(shown[k - 1]));
  assert.ok(shown.every(i => d(i) <= C.drawDist));
  assert.ok(shown.reduce((s, i) => s + part(props[i].pick).tris, 0) <= C.maxTris);
  for (const i of shown) assert.equal(propHidden(props[i], part(props[i].pick).height * props[i].scale, ball, cam, C.ballClear, C.lineClear), false);
  assert.ok(!shown.includes(props.indexOf(p0))); // the prop the ball sits on is hidden
  // a dense spot hits the triangle cap; a tighter cap draws fewer
  assert.ok(visibleSmallProps(props, cam, ball, part, { maxTris: 600 }).length <= 600 / 12);
  // with the camera's view direction (looking at the ball, −z), nothing more than `behind` m behind it is drawn
  const dir = { x: 0, y: -2.6 / Math.hypot(2.6, 6), z: -6 / Math.hypot(2.6, 6) };
  const ahead = visibleSmallProps(props, cam, ball, part, { dir });
  assert.ok(ahead.every(i => (props[i].x - cam.x) * dir.x + (props[i].y - cam.y) * dir.y + (props[i].z - cam.z) * dir.z >= -C.behind));
  assert.ok(shown.some(i => props[i].z > cam.z + 5) && !ahead.some(i => props[i].z > cam.z + 5));
  // from high above (the flyover) almost nothing is near enough
  assert.ok(visibleSmallProps(props, { x: cam.x, y: cam.y + 200, z: cam.z }, ball, part).length < shown.length / 4);
});

// ---- AP7d: per-pick density, the water-edge surface, clear of trunks and stakes ----
const meadowRule = normalizeSmallProps(MEADOW_RULE);
const scaleOf = id => LIBRARY.smallProps[id].scale;
const scatterM = (id, r = meadowRule, keep) => {
  const hole = HOLES[id], t = makeTerrain(hole);
  return { hole, t, props: scatterSmallProps(hole, { heightAt: t.heightAt, surfaceAt: t.surfaceAt, rule: r, keep, scaleOf }) };
};
// hectares of a hole's scatter area that stand on the given surfaces (1 m grid)
const hectaresOf = (hole, t, on) => {
  const a = scatterArea(hole);
  let n = 0;
  for (let x = a.x0 + 0.5; x < a.x1; x++) for (let z = a.z0 + 0.5; z < a.z1; z++) if (on.includes(t.surfaceAt(x, z))) n++;
  return n / 10000;
};

test('AP7d: a pick carries its own perHa, on, cluster range; the rule validates every field and keeps the set-level form', () => {
  const v = sp => () => validateBiomeSet(withChange({ smallProps: sp }), LIBRARY);
  assert.ok(validateBiomeSet(BIOMES['test-small-props'], LIBRARY));
  // all picks own their density: no set-level perHa / on needed
  assert.ok(v({ pieces: [{ id: 'grassTuft', perHa: 700, on: ['rough', 'ob'] }] }) && validateBiomeSet(withChange({ smallProps: { pieces: [{ id: 'grassTuft', perHa: 700, on: ['rough', 'ob'] }] } }), LIBRARY));
  // a count may be a range
  assert.ok(validateBiomeSet(withChange({ smallProps: { pieces: [{ id: 'grassTuft', perHa: 100, on: ['rough'], cluster: { count: [1, 3], radius: 1.2 } }] } }), LIBRARY));
  assert.deepEqual(normalizeSmallProps({ pieces: [{ id: 'grassTuft', perHa: 100, on: ['rough'], cluster: { count: [1, 3], radius: 1.2 } }] }).pieces[0].cluster, { count: [1, 3], radius: 1.2 });
  assert.throws(v({ pieces: [{ id: 'grassTuft', perHa: 100, on: ['rough'], cluster: { count: [3, 1], radius: 1 } }] }), /cluster\.count must be a whole number 2–30 or \[min, max\]/);
  assert.throws(v({ pieces: [{ id: 'grassTuft', perHa: 100, on: ['rough'], cluster: { count: [0, 2], radius: 1 } }] }), /cluster\.count must be/);
  assert.throws(v({ pieces: [{ id: 'grassTuft', perHa: 99999, on: ['rough'] }] }), /pieces\[0\]\.perHa must be a number 0–4000/);
  assert.throws(v({ pieces: [{ id: 'grassTuft', perHa: 100 }] }), /smallProps\.on must list the surfaces/);
  assert.throws(v({ pieces: [{ id: 'grassTuft', perHa: 100, on: ['rough', 'fairway'] }] }), /pieces\[0\]\.on: props may only stand on rough, ob \(never on "fairway"\)/);
  assert.throws(v({ pieces: [{ id: 'grassTuft', perHa: 100, on: [] }] }), /pieces\[0\]\.on must list the surfaces/);
  // a pick without its own density still needs the set's perHa and on
  assert.throws(v({ pieces: [{ id: 'grassTuft', perHa: 100, on: ['rough'] }, 'flowerPatch'] }), /smallProps\.perHa must be a number 0–4000/);
  assert.ok(validateBiomeSet(withChange({ smallProps: { pieces: [{ id: 'grassTuft', perHa: 100, on: ['rough'] }, 'flowerPatch'], perHa: 50, on: ['rough'] } }), LIBRARY));
  // the water edge
  const reeds = { id: 'reeds', perTenM: 2, on: ['waterEdge'], cluster: { count: [2, 4], radius: 0.8 } };
  assert.ok(validateBiomeSet(withChange({ smallProps: { pieces: [reeds] } }), LIBRARY));
  assert.throws(v({ pieces: [{ ...reeds, on: ['rough'] }] }), /pieces\[0\]\.perTenM needs on: \['waterEdge'\]/);
  assert.throws(v({ pieces: [{ id: 'reeds', on: ['waterEdge'] }] }), /on "waterEdge" needs perTenM/);
  assert.throws(v({ pieces: [{ ...reeds, on: ['waterEdge', 'rough'] }] }), /"waterEdge" can't be mixed with other surfaces/);
  assert.throws(v({ pieces: [{ ...reeds, perHa: 10 }] }), /has both perHa and perTenM/);
  assert.throws(v({ pieces: [{ ...reeds, perTenM: 999 }] }), /perTenM must be a number 0–20/);
  assert.throws(v({ pieces: ['grassTuft'], perHa: 10, on: ['waterEdge'] }), /smallProps\.on: "waterEdge" is for a pick with perTenM/);
  // the Meadow set of SPEC §4 reads one pick per table row
  assert.deepEqual(meadowRule.pieces.map(p => [p.id, p.perHa ?? p.perTenM]), [['grassTuft', 700], ['flowerPatch', 120], ['flowerPatch', 60], ['pebbles', 40], ['flatStone', 15], ['flowerBush', 30], ['reeds', 2]]);
});

test('AP7d: each pick lands at its own density on its own surfaces (the spec\'s Meadow numbers on mtn-07)', () => {
  const { hole, t, props } = scatterM('mtn-07');
  assert.deepEqual(props, scatterM('mtn-07').props); // deterministic
  assert.ok(props.every(p => Number.isFinite(p.y) && p.tint.length === 2 && p.tint.every(x => x >= 0 && x < 1)));
  meadowRule.pieces.forEach((p, k) => {
    const mine = props.filter(q => q.pick === k);
    assert.ok(mine.length > 0, `${p.id} #${k}`);
    // every copy on its pick's surfaces, and its size within the piece's range
    const lo = scaleOf(p.id)[0], hi = scaleOf(p.id)[1];
    for (const q of mine) {
      if (p.on[0] !== 'waterEdge') assert.ok(p.on.includes(t.surfaceAt(q.x, q.z)), `${p.id} on ${t.surfaceAt(q.x, q.z)}`);
      assert.ok(q.scale >= lo && q.scale <= hi, p.id);
    }
    if (p.perHa == null) return;
    // the asked density (copies per hectare of its surfaces): the tests drop some (edges, trunks, the tee and the green's apron), so a bit under
    const want = p.perHa * hectaresOf(hole, t, p.on);
    assert.ok(mine.length > want * 0.7 && mine.length < want * 1.15, `${p.id} #${k}: ${mine.length} of ${want.toFixed(0)}`);
  });
  // the spec's picks: the bush only beyond OB, pebbles and flat stones only in the rough
  const surf = k => new Set(props.filter(q => q.pick === k).map(q => t.surfaceAt(q.x, q.z)));
  assert.deepEqual([...surf(5)], ['ob']);
  assert.deepEqual([...surf(3)], ['rough']);
  assert.deepEqual([...surf(4)], ['rough']);
  // clusters: a patch's copies stay within its radius (a lone prop is a patch of one: [1, 3] tufts)
  const flowers = props.filter(q => q.pick === 1);
  assert.ok(flowers.filter(q => flowers.some(o => o !== q && Math.hypot(o.x - q.x, o.z - q.z) < 4)).length > flowers.length * 0.9);
});

test('AP7d: the set-level form and a per-pick form together: set-level picks share only the set\'s perHa', () => {
  const r = normalizeSmallProps({ pieces: [{ id: 'grassTuft', perHa: 400, on: ['rough'] }, { id: 'flowerPatch', weight: 1 }, { id: 'pebbles', weight: 1 }], perHa: 600, on: ['rough', 'ob'] });
  const { hole, props } = scatterM('mtn-07', r), a = scatterArea(hole), total = 600 * (a.x1 - a.x0) * (a.z1 - a.z0) / 10000;
  const n = [0, 1, 2].map(k => props.filter(p => p.pick === k).length);
  assert.ok(n[1] > 0 && Math.abs(n[1] - n[2]) < n[1] * 0.3, `${n}`); // the two share the set's perHa equally
  assert.ok(n[1] + n[2] < total * 1.05 && n[1] + n[2] > total * 0.5, `${n} of ${total}`);
  assert.ok(n[0] > 0);
});

test('AP7d: the water edge: reeds in patches on land 0–1 m outside the water, N patches per 10 m of shoreline, never in it', () => {
  for (const id of ['mtn-04', 'mtn-01', 'mtn-09']) { // rough banks (mtn-07's creek has rock banks: few reeds there, and none on the rock)
    const { hole, t, props } = scatterM(id), reeds = props.filter(p => p.pick === 6);
    const sh = shoreline(scatterArea(hole), t.surfaceAt);
    assert.ok(sh.length > 20, `${id} has a shoreline: ${sh.length.toFixed(0)} m`);
    // patches per 10 m: the asked 2 per 10 m, 2–4 reeds each (mean 3), some dropped by the edge tests
    const per10 = reeds.length / 3 / (sh.length / 10);
    assert.ok(per10 > (id === 'mtn-09' ? 0.8 : 1.4) && per10 < 2.2, `${id}: ${per10.toFixed(2)} patches per 10 m of ${sh.length.toFixed(0)} m, ${reeds.length} reeds`);
    for (const p of reeds) {
      // never in the water, never on the course; and near the water (patch centre ≤ 1 m + the patch's 0.8 m radius + the sample step from its edge)
      assert.ok(['rough', 'ob'].includes(t.surfaceAt(p.x, p.z)), `${id} reed on ${t.surfaceAt(p.x, p.z)}`);
      let near = Infinity;
      for (let d = 0.25; d <= 3 && near === Infinity; d += 0.25) for (let k = 0; k < 16; k++) if (t.surfaceAt(p.x + Math.cos(k * Math.PI / 8) * d, p.z + Math.sin(k * Math.PI / 8) * d) === 'water') { near = d; break; }
      assert.ok(near <= 2.5, `${id}: a reed ${near} m from the water`);
    }
    assert.deepEqual(reeds, scatterM(id).props.filter(p => p.pick === 6)); // deterministic
  }
  // a hole with no water scatters no reeds, and nothing else is affected
  const dry = scatterM('pl-03').props;
  assert.equal(dry.filter(p => p.pick === 6).length, 0);
  assert.ok(dry.length > 100);
  // the shoreline's outward vectors point at land
  const { hole, t } = scatterM('mtn-07');
  for (const s of shoreline(scatterArea(hole), t.surfaceAt).points.slice(0, 300)) assert.notEqual(t.surfaceAt(s.x + s.nx * 0.6, s.z + s.nz * 0.6), 'water');
});

test('AP7d: no prop within 1 m of a tree trunk or an OB stake (the game\'s keep test)', () => {
  const hole = HOLES['mtn-07'], trees = hole.obstacles.filter(o => o.type === 'tree');
  assert.ok(trees.length > 3);
  const things = [...trees.map(o => ({ x: o.x, z: o.z, r: o.trunkR })), ...stakeThings(hole.scenery.stakes)];
  assert.ok(things.length > 20);
  const clear = clearOf(things);
  assert.equal(clear(trees[0].x, trees[0].z), false);
  assert.equal(clear(trees[0].x + trees[0].trunkR + 0.9, trees[0].z), false);
  assert.equal(clear(trees[0].x + trees[0].trunkR + 1.1, trees[0].z), true);
  const st = stakeThings(hole.scenery.stakes)[0];
  assert.equal(clear(st.x + 0.9, st.z), false);
  // a scatter that would put props right at the trunks and stakes (dense, everywhere) keeps them clear
  const dense = normalizeSmallProps({ pieces: [{ id: 'grassTuft', perHa: 4000, on: ['rough', 'ob'] }] });
  const free = scatterM('mtn-07', dense).props, kept = scatterM('mtn-07', dense, clear).props;
  assert.ok(free.some(p => !clear(p.x, p.z)), 'without the test some props stand too close');
  assert.ok(kept.length > 1000 && kept.every(p => things.every(o => Math.hypot(p.x - o.x, p.z - o.z) - o.r >= 1 - 1e-9)));
});

test('AP7d: the Meadow set uses all six pieces and fills the triangle cap near the tee', () => {
  const { props } = scatterM('mtn-07'), parts = meadowRule.pieces.map(p => smallPropPart(p.id));
  const used = new Set(props.map(p => meadowRule.pieces[p.pick].id));
  assert.deepEqual([...used].sort(), SMALL_PROP_PIECES.slice().sort());
  const hole = HOLES['mtn-07'], cam = { x: hole.tee.x, y: 3, z: hole.tee.z + 3 }, ball = { x: hole.tee.x, y: 0.05, z: hole.tee.z };
  const shown = visibleSmallProps(props, cam, ball, k => parts[k]);
  const tris = shown.reduce((s, i) => s + parts[props[i].pick].tris, 0);
  assert.ok(tris <= SMALL_PROPS.maxTris && tris > SMALL_PROPS.maxTris * 0.5, `${tris}`);
});

test('AP7d follow-up: PROP_SCALE / PROP_FAR_KEEP / PROP_MAX_TRIS are tunables with the asked ranges, defaults = the owner pick C but 2x', async () => {
  const { TUNABLES } = await import('../src/core/config.js');
  assert.deepEqual([TUNABLES.PROP_SCALE.def, TUNABLES.PROP_SCALE.min, TUNABLES.PROP_SCALE.max], [2, 0.5, 3]);
  assert.deepEqual([TUNABLES.PROP_FAR_KEEP.def, TUNABLES.PROP_FAR_KEEP.min, TUNABLES.PROP_FAR_KEEP.max], [0.5, 0.1, 1]);
  assert.deepEqual([TUNABLES.PROP_DRAW_DIST.def, TUNABLES.PROP_THIN_FROM.def, SMALL_PROPS.drawDist], [60, 30, 60]); // owner pick 2026-11-23; SMALL_PROPS mirrors the draw distance
  assert.equal(TUNABLES.PROP_MAX_TRIS.def, SMALL_PROPS.maxTris);
  const { parseTune } = await import('../src/core/tune.js');
  const r = parseTune('PROP_SCALE:5,PROP_FAR_KEEP:0.05,PROP_THIN_FROM:30,PROP_MAX_TRIS:20000');
  assert.deepEqual(r.set.map(s => [s.name, s.value]), [['PROP_SCALE', 3], ['PROP_FAR_KEEP', 0.1], ['PROP_THIN_FROM', 30], ['PROP_MAX_TRIS', 20000]]);
});

test('AP7d follow-up: far thinning keeps a fixed share beyond thinFrom, the same copies every call; near props are untouched', () => {
  const { props } = scatter('mtn-07');
  const parts = normalizeSmallProps(rule).pieces.map(p => smallPropPart(p.id)), part = k => parts[k];
  const p0 = props[Math.floor(props.length / 2)], ball = { x: p0.x, y: p0.y + 0.02, z: p0.z }, cam = { x: p0.x, y: p0.y + 2.6, z: p0.z + 6 };
  const opts = { drawDist: 70, maxTris: 1e9 };
  const all = visibleSmallProps(props, cam, ball, part, opts);
  const thin = visibleSmallProps(props, cam, ball, part, { ...opts, thinFrom: 30, farKeep: 0.4 });
  const d = i => Math.hypot(props[i].x - cam.x, props[i].y - cam.y, props[i].z - cam.z);
  const far = all.filter(i => d(i) > 30), farKept = thin.filter(i => d(i) > 30);
  assert.ok(far.length > 200);
  assert.ok(Math.abs(farKept.length / far.length - 0.4) < 0.08, `${farKept.length}/${far.length}`);
  assert.deepEqual(thin.filter(i => d(i) <= 30), all.filter(i => d(i) <= 30));
  assert.deepEqual(visibleSmallProps(props, cam, ball, part, { ...opts, thinFrom: 30, farKeep: 0.4 }), thin); // deterministic
  // a copy's draw is its own fixed number (not the camera's): propRank is the same every call and spreads evenly
  assert.equal(propRank(123), propRank(123));
  const ranks = props.map((_, i) => propRank(i));
  assert.ok(ranks.every(x => x >= 0 && x < 1));
  assert.ok(Math.abs(ranks.filter(x => x < 0.4).length / ranks.length - 0.4) < 0.03);
  // the boost keeps more of a pick
  const boosted = visibleSmallProps(props, cam, ball, part, { ...opts, thinFrom: 30, farKeep: 0.4, farBoost: () => 2 });
  assert.ok(boosted.length > thin.length);
  // off by default: thinFrom unset or keep 1 draws everything
  assert.deepEqual(visibleSmallProps(props, cam, ball, part, { ...opts, thinFrom: 30, farKeep: 1 }), all);
});

test('AP7d follow-up: scale 2 grows the height and the ball clearance (a scaled bush or reeds never reach over the ball from outside it)', () => {
  const { props } = scatter('mtn-07');
  const parts = normalizeSmallProps(rule).pieces.map(p => smallPropPart(p.id)), part = k => parts[k];
  const ball = { x: 0, y: 0, z: 0 }, cam = { x: 0, y: 2.6, z: 6 };
  // the widest piece is the bush: radius 0.68 × its biggest copy 1.25 × PROP_SCALE 2 = 1.7 m; the clearance is 1.2 × 2 = 2.4 m
  const bush = smallPropPart('flowerBush');
  const reach = 0.68 * 1.25 * 2;
  assert.ok(reach < SMALL_PROPS.ballClear * 2);
  assert.ok(reach > SMALL_PROPS.ballClear); // so at scale 2 the plain 1.2 m would not have been enough
  const one = { x: 2.0, y: 0, z: 0, scale: 1 };
  const at = (scale) => visibleSmallProps([one], cam, ball, k => ({ tris: 1, height: bush.height }), { scale, maxTris: 1e9, dir: null });
  assert.equal(at(1).length, 1);
  assert.equal(at(2).length, 0); // 2.0 m away: fine at scale 1, hidden at scale 2
  assert.equal(at(0.5).length, 1); // a smaller prop keeps today's clearance, not less
  void props;
});
