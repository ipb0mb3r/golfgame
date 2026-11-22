// AP7c (small-prop scatter) and X33 (per-pick slot override): DESIGN §8b "Small props" and "Slot overrides".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBiomeSet, normalizeBiomeSet, pieceColours, checkMinimap, minimapColours, flagColour, pickId, PICKS } from '../src/core/biome.js';
import { pickedPieces } from '../src/core/assets.js';
import { normalizeSmallProps, scatterSmallProps, scatterArea, propHidden, visibleSmallProps, smallPropPart, SMALL_PROP_PIECES, holeSeed, propSpotOk } from '../src/core/smallProps.js';
import { SMALL_PROPS } from '../src/core/config.js';
import { makeTerrain } from '../src/core/terrain.js';
import { LIBRARY } from '../src/biomes/library.js';
import { BIOMES, resolveBiome } from '../src/biomes/index.js';
import { HOLES } from '../src/holes/sets.js';

const meadow = BIOMES['meadow-day'];
const withChange = change => ({ ...meadow, id: 'x-test', ...change });
const rule = BIOMES['test-small-props'].smallProps;
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
  assert.deepEqual(normalizeSmallProps({ pieces: ['grassTuft', { id: 'flowerPatch', weight: 2, slots: { headB: 'propA' }, cluster: { count: 10, radius: 1.5 } }], perHa: 300, on: ['rough'] }), {
    pieces: [{ id: 'grassTuft', weight: 1, slots: {}, cluster: null }, { id: 'flowerPatch', weight: 2, slots: { headB: 'propA' }, cluster: { count: 10, radius: 1.5 } }], perHa: 300, on: ['rough'],
  });
  for (const id of REAL_SETS) assert.deepEqual(BIOMES[id].smallProps, { pieces: [] }, id);
  assert.ok(validateBiomeSet(BIOMES['test-small-props'], LIBRARY));
  const v = sp => () => validateBiomeSet(withChange({ smallProps: sp }), LIBRARY);
  const ok = { perHa: 100, on: ['rough'] };
  assert.throws(v({ pieces: [{ id: 'grassTuft', weight: 0 }], ...ok }), /biome set "x-test": smallProps\.pieces\[0\]\.weight must be a number > 0 \(got 0\)/);
  assert.throws(v({ pieces: [{ id: 'grassTuft', cluster: { count: 1, radius: 1 } }], ...ok }), /smallProps\.pieces\[0\]\.cluster\.count must be a whole number 2–30 \(got 1\)/);
  assert.throws(v({ pieces: [{ id: 'grassTuft', cluster: { count: 5, radius: 20 } }], ...ok }), /smallProps\.pieces\[0\]\.cluster\.radius must be a number > 0 and ≤ 8 m \(got 20\)/);
  assert.throws(v({ pieces: [{ id: 'grassTuft', cluster: { count: 5, r: 1 } }], ...ok }), /cluster has an unknown key "r"/);
  assert.throws(v({ pieces: [{ id: 'grassTuft', size: 2 }], ...ok }), /smallProps\.pieces\[0\] \(grassTuft\) has an unknown key "size" \(known: id, weight, slots, cluster\)/);
  assert.throws(v({ pieces: ['grassTuft'], perHa: 99999, on: ['rough'] }), /smallProps\.perHa must be a number 0–4000/);
  assert.throws(v({ pieces: ['grassTuft'], perHa: 10, on: [] }), /smallProps\.on must list the surfaces/);
  // never on the course itself, whatever `on` says
  for (const s of ['tee', 'fairway', 'fringe', 'green', 'sand', 'water', 'rock']) assert.throws(v({ pieces: ['grassTuft'], perHa: 10, on: ['rough', s] }), new RegExp(`smallProps\\.on: props may only stand on rough, ob \\(never on "${s}"\\)`));
  assert.throws(v({ pieces: [], density: 3 }), /smallProps has an unknown key "density"/);
  // the same piece may be picked twice (two colourings); each pick has its own colours
  const two = withChange({ smallProps: { pieces: [{ id: 'flowerPatch', slots: { headB: 'propA' } }, { id: 'flowerPatch', slots: { headA: 'propB' } }], ...ok } });
  assert.ok(validateBiomeSet(two, LIBRARY));
  const [a, b] = normalizeBiomeSet(two).smallProps.pieces.map(p => pieceColours(two, LIBRARY)('smallProps', p));
  assert.deepEqual([a.headA, a.headB, b.headA, b.headB], [meadow.palette.propA, meadow.palette.propA, meadow.palette.propB, meadow.palette.propB]);
});

test('AP7c: the placeholder pieces are ≤ 50 triangles, match the library, and only use their library slots', () => {
  assert.deepEqual(SMALL_PROP_PIECES.slice().sort(), Object.keys(LIBRARY.smallProps).sort());
  for (const id of SMALL_PROP_PIECES) {
    const p = smallPropPart(id), lib = LIBRARY.smallProps[id];
    assert.ok(p.tris <= 50, id);
    assert.equal(p.tris, lib.tris, id);
    assert.equal(p.positions.length, p.tris * 9, id);
    assert.deepEqual([...new Set(p.slots)].sort(), Object.keys(lib.slots).sort(), id);
    assert.ok(p.height > 0.15 && p.height < 0.5, id); // small: below the golfer's knee
  }
  assert.deepEqual(LIBRARY.smallProps.flowerPatch.slots, { stem: 'leafLow', headA: 'propA', headB: 'propB' });
  assert.equal(LIBRARY.smallProps.grassTuft.slots.base, 'rough');
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
  // from high above (the flyover) almost nothing is near enough
  assert.ok(visibleSmallProps(props, { x: cam.x, y: cam.y + 200, z: cam.z }, ball, part).length < shown.length / 4);
});
