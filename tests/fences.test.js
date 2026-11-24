// AP7f: fences (DESIGN §8b "Fences", docs/art/fence/SPEC.md): the library looks and their shapes, the
// scenery.fences format and every validateHole rule, the line layout (posts on every point, equal spans, sheared
// to the slope, sunk), the biome set's optional `fences` list, the tree clearing, the dev overlay.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FENCES, TUNABLES } from '../src/core/config.js';
import { LIBRARY } from '../src/biomes/library.js';
import { BIOMES, resolveBiome } from '../src/biomes/index.js';
import { validateBiomeSet, pieceColours, paletteColour, pickId } from '../src/core/biome.js';
import { validateHole } from '../src/core/validate.js';
import { fenceShape, FENCE_PIECES } from '../src/core/fenceShapes.js';
import { fencesFormatError, fencesError, fencesSetError, fenceLength, postSpots, layFence, fencesClear, segmentToBox } from '../src/core/fences.js';
import { parseTune } from '../src/core/tune.js';
import { HOLES, readyHole, checkHoleLooks } from '../src/holes/sets.js';
import { DEV_FENCES, DEV_FENCES_SET, holeFences } from '../src/holes/dev-fences.js';
import { FENCES as REF } from '../docs/art/fence/pieces.js';

const mtn07 = readyHole(HOLES['mtn-07']);
const withFences = list => ({ ...mtn07, scenery: { ...mtn07.scenery, fences: list } });
const S = TUNABLES.FENCE_SCALE.def;

test('library: railFence and ropeFence with tris / spacing / slots / desc; each segment ≤ 100 triangles', () => {
  assert.deepEqual(Object.keys(LIBRARY.fences), ['railFence', 'ropeFence']);
  assert.deepEqual(FENCE_PIECES, Object.keys(LIBRARY.fences));
  for (const [id, piece] of Object.entries(LIBRARY.fences)) {
    const shape = fenceShape(id);
    assert.equal(shape.tris, piece.tris, `${id} tris`);
    assert.ok(shape.tris <= FENCES.maxTris, `${id} ≤ ${FENCES.maxTris}`);
    assert.equal(shape.spacing, piece.spacing, `${id} spacing`);
    assert.ok(piece.desc.length > 20);
    for (const part of [shape.post, shape.span]) for (const s of [...part.lo, ...part.hi]) assert.ok(Object.hasOwn(piece.slots, s), `${id}: slot ${s}`);
  }
  assert.equal(fenceShape('railFence').tris, 36); assert.equal(fenceShape('ropeFence').tris, 63);   // SPEC §1
  assert.deepEqual([LIBRARY.fences.railFence.spacing, LIBRARY.fences.ropeFence.spacing], [3, 2.6]);
  // SPEC §3 / §3b (X50): propWoodDark → propWood (rail fence), propWoodDark → bank + lip → propSnow (rope fence)
  assert.deepEqual(LIBRARY.fences.railFence.slots, { post: 'propWoodDark', postTop: 'propWood', rail: 'propWoodDark', railTop: 'propWood' });
  assert.deepEqual(LIBRARY.fences.ropeFence.slots, { post: 'propWoodDark', postTop: 'bank', rope: 'lip', ropeTop: 'propSnow' });
});

test('the shapes are the artist\'s pieces.js (A → railFence, I2 → ropeFence): same vertices and triangles', () => {
  for (const [id, ref] of [['railFence', REF.A], ['ropeFence', REF.I2]]) {
    const shape = fenceShape(id);
    assert.equal(ref.spacing, shape.spacing, id);
    const flat = parts => parts.flatMap(p => p.positions);
    for (const [mine, theirs] of [[shape.post, ref.post()], [shape.span, ref.span()]]) {
      const a = mine.positions, b = flat(theirs);
      assert.equal(a.length, b.length, id);
      a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-9, `${id} vertex ${i}`));
      assert.equal(mine.tris, theirs.reduce((n, p) => n + p.indices.length / 3, 0));
    }
  }
  // sizes at 1× (SPEC §2): rail fence posts 1.2 m, rails 0.13 m out from the line; rope fence posts ~1.0 m
  assert.equal(fenceShape('railFence').height, 1.2);
  assert.ok(Math.abs(fenceShape('railFence').halfWidth - 0.13) < 1e-9);
  assert.ok(fenceShape('ropeFence').height > 1 && fenceShape('ropeFence').height < 1.05);
});

test('scenery.fences format: { id, points }; fewer than 2 points or a bad point fails validateHole', () => {
  assert.equal(fencesFormatError(undefined), null);
  assert.equal(fencesFormatError([]), null);
  assert.equal(fencesFormatError([{ id: 'railFence', points: [[0, 0], [5, 0]] }]), null);
  assert.match(fencesFormatError({}), /must be a list/);
  assert.match(fencesFormatError([{ points: [[0, 0], [5, 0]] }]), /\[0\] must be \{ id, points/);
  assert.match(fencesFormatError([{ id: 'railFence', points: [[0, 0]] }]), /points must list at least 2 points \[x, z\] \(got 1\)/);
  assert.match(fencesFormatError([{ id: 'railFence' }]), /points must list at least 2 points/);
  assert.match(fencesFormatError([{ id: 'railFence', points: [[0, 0], [5, 'a']] }]), /points\[1\] must be \[x, z\]/);
  assert.match(fencesFormatError([{ id: 'railFence', points: [[0, 0], [5, 0, 1]] }]), /points\[1\] must be \[x, z\]/);
  assert.match(fencesFormatError([{ id: 'railFence', points: [[0, 0], [5, 0]], scale: 2 }]), /unknown key "scale"/);
  assert.throws(() => validateHole(withFences([{ id: 'railFence', points: [[-80, 0]] }]), { shots: false }), /hole "mtn-07": scenery\.fences\[0\] \(railFence\)\.points must list at least 2 points/);
});

test('validateHole: an unknown look, a leg under 1 m, a leg inside OB + 2 m, more than 600 m all fail', () => {
  const box = { x0: -70, x1: 72, z0: -475, z1: 16 }; // mtn-07's OB stakes' box
  const need = FENCES.obClear + fenceShape('railFence').halfWidth * S;  // 2.195 m at the default FENCE_SCALE 1.5
  assert.equal(fencesError(mtn07, []), null);
  assert.equal(fencesError(mtn07, [{ id: 'railFence', points: [[box.x0 - need - 0.01, 0], [box.x0 - need - 0.01, -100]] }]), null);
  assert.match(fencesError(mtn07, [{ id: 'railFence', points: [[box.x0 - need + 0.01, 0], [box.x0 - need + 0.01, -100]] }]), /leg 1 .* comes 2\.18 m from the OB box \(it must stay 2\.(19|20) m outside/);
  // a leg that cuts across the box (both ends outside) fails too, and so does one that starts inside
  assert.match(fencesError(mtn07, [{ id: 'railFence', points: [[-80, -100], [80, -100]] }]), /comes 0\.00 m from the OB box/);
  assert.match(fencesError(mtn07, [{ id: 'railFence', points: [[-80, 30], [-80, 20], [0, -10]] }]), /leg 2 .* comes 0\.00 m/);
  // behind the far end (the last stake row) is outside the box
  assert.equal(fencesError(mtn07, [{ id: 'ropeFence', points: [[-20, -480], [20, -480]] }]), null);
  // the thickness is the scaled one
  const x = box.x1 + FENCES.obClear + fenceShape('railFence').halfWidth * 1.0 + 0.01;
  assert.equal(fencesError(mtn07, [{ id: 'railFence', points: [[x, 0], [x, -50]] }], 1), null);
  assert.match(fencesError(mtn07, [{ id: 'railFence', points: [[x, 0], [x, -50]] }], 2.5), /comes/);
  // legs at least 1 m
  assert.match(fencesError(mtn07, [{ id: 'railFence', points: [[-80, 0], [-80, -0.9], [-80, -50]] }]), /leg 1 .* is 0\.90 m long \(at least 1 m\)/);
  // ≤ 600 m per hole, all entries together
  assert.equal(fencesError(mtn07, [{ id: 'railFence', points: [[-80, 0], [-80, -300]] }, { id: 'railFence', points: [[-90, 0], [-90, -300]] }]), null);
  assert.match(fencesError(mtn07, [{ id: 'railFence', points: [[-80, 0], [-80, -300]] }, { id: 'railFence', points: [[-90, 0], [-90, -300.5]] }]), /601 m of fence on the hole \(at most 600 m\)/);
  // not a fence look
  assert.match(fencesError(mtn07, [{ id: 'picketFence', points: [[-80, 0], [-80, -10]] }]), /is not a fence look \(the library's fences: railFence, ropeFence\)/);
  // through validateHole
  assert.throws(() => validateHole(withFences([{ id: 'railFence', points: [[-71, 0], [-71, -100]] }]), { shots: false }), /hole "mtn-07": scenery\.fences\[0\] \(railFence\) leg 1 .* OB box/);
  assert.doesNotThrow(() => validateHole(withFences(DEV_FENCES['mtn-07']), { shots: false }));
});

test('segmentToBox: 0 across or inside the box, else the true distance', () => {
  const b = { x0: 0, x1: 10, z0: 0, z1: 10 };
  assert.equal(segmentToBox([-5, 5], [15, 5], b), 0);
  assert.equal(segmentToBox([2, 2], [3, 3], b), 0);
  assert.equal(segmentToBox([-3, -5], [-3, 15], b), 3);
  assert.ok(Math.abs(segmentToBox([-3, -3], [-4, -4], b) - Math.hypot(3, 3)) < 1e-9);
  assert.ok(Math.abs(segmentToBox([12, 14], [14, 12], b) - Math.sqrt(18)) < 1e-9); // nearest to the corner (10, 10) mid-segment
});

test('the set\'s optional fences list: offered ids only; the real sets are untouched (no list = none)', () => {
  assert.equal(fencesSetError([{ id: 'railFence', points: [] }], BIOMES[DEV_FENCES_SET]), null);
  assert.match(fencesSetError([{ id: 'ropeFence', points: [] }], BIOMES['proto-default']), /biome set "proto-default" does not offer it \(its fences: none\)/);
  const set = { ...BIOMES['meadow-day'], id: 'x', fences: ['railFence'] };
  assert.match(fencesSetError([{ id: 'ropeFence' }], set), /its fences: railFence/);
  // validateBiomeSet: the list is optional; unknown pieces and bad slot overrides fail; an X33 override works
  assert.doesNotThrow(() => validateBiomeSet(set, LIBRARY));
  assert.throws(() => validateBiomeSet({ ...set, fences: ['picket'] }, LIBRARY), /fences: unknown piece "picket" \(the library's fences: railFence, ropeFence\)/);
  assert.throws(() => validateBiomeSet({ ...set, fences: 'railFence' }, LIBRARY), /fences must be a list/);
  assert.throws(() => validateBiomeSet({ ...set, fences: ['railFence', 'railFence'] }, LIBRARY), /fences lists a piece twice/);
  assert.throws(() => validateBiomeSet({ ...set, fences: [{ id: 'railFence', slots: { plank: 'propSnow' } }] }, LIBRARY), /fences\[0\] \(railFence\)\.slots: "plank" is not a slot/);
  const white = { ...set, fences: [{ id: 'railFence', slots: { rail: 'propSnow', railTop: 'propSnow' } }] };
  assert.doesNotThrow(() => validateBiomeSet(white, LIBRARY));
  const look = pieceColours(white, LIBRARY)('fences', 'railFence');
  assert.deepEqual(look, { post: paletteColour(set.palette, 'propWoodDark'), postTop: paletteColour(set.palette, 'propWood'), rail: set.palette.propSnow, railTop: set.palette.propSnow });
  // resolved: ids; a set without the list has none. The real sets may or may not have a list yet (the artist
  // writes them, X51): none = undefined, else only library fences, read the same once resolved
  assert.deepEqual(resolveBiome(DEV_FENCES_SET).fences, ['railFence', 'ropeFence']);
  for (const id of ['meadow-day', 'alpine-day', 'island-day', 'mtn-default', 'proto-default']) {
    const list = BIOMES[id].fences;
    assert.deepEqual(resolveBiome(id).fences, list?.map(pickId), id);
    for (const p of list ?? []) assert.ok(LIBRARY.fences[pickId(p)], `${id}: ${pickId(p)}`);
  }
  assert.equal(BIOMES['proto-default'].fences, undefined); assert.equal(BIOMES['mtn-default'].fences, undefined);
});

test('checkHoleLooks (readyHole) fails a hole whose set does not offer its fence; every real hole passes', () => {
  const h = { ...withFences(DEV_FENCES['mtn-07']), biome: 'proto-default' };
  assert.throws(() => checkHoleLooks(h), /hole "mtn-07": scenery\.fences\[0\] \(railFence\): biome set "proto-default" does not offer it/);
  assert.doesNotThrow(() => checkHoleLooks({ ...h, biome: DEV_FENCES_SET }));
  for (const hole of Object.values(HOLES)) assert.doesNotThrow(() => checkHoleLooks(hole), hole.id); // Buttercup Meadows places rail fences
});

test('layout: a post on every point, equal spans ≤ spacing × scale per leg', () => {
  assert.deepEqual(postSpots([[0, 0], [9, 0]], 3), [[0, 0], [3, 0], [6, 0], [9, 0]]);
  assert.deepEqual(postSpots([[0, 0], [10, 0]], 3).length, 5);          // 4 spans of 2.5 m
  assert.deepEqual(postSpots([[0, 0], [1, 0]], 3), [[0, 0], [1, 0]]);
  const corner = postSpots([[0, 0], [9, 0], [9, 4.5]], 4.5);            // a corner keeps its post, no double post
  assert.deepEqual(corner, [[0, 0], [4.5, 0], [9, 0], [9, 4.5]]);
  const f = layFence('railFence', [[0, 0], [9, 0], [9, 9]], () => 0, 1.5);
  assert.equal(f.posts, 5); assert.equal(f.spans, 4);
  assert.equal(f.tris, 5 * 12 + 4 * 24);
  assert.equal(f.positions.length / 3, f.w.length); assert.equal(f.w.length, f.lo.length); assert.equal(f.lo.length, f.hi.length);
  // the spacing grows with the scale (SPEC §1: posts every 4.5 m at 1.5×), so the cost per metre goes down
  const per100 = s => layFence('railFence', [[0, 0], [600, 0]], () => 0, s).tris / 6;
  assert.ok(per100(1.5) < per100(1));
  assert.ok(Math.abs(per100(1) - 1200) < 20 && Math.abs(per100(1.5) - 800) < 20, `${per100(1)} ${per100(1.5)}`); // SPEC §5
  const rope = s => layFence('ropeFence', [[0, 0], [600, 0]], () => 0, s).tris / 6;
  assert.ok(Math.abs(rope(1) - 2420) < 40 && Math.abs(rope(1.5) - 1620) < 40, `${rope(1)} ${rope(1.5)}`);
});

test('layout on a slope: posts stand on the ground sunk 0.1 m, rails sheared to meet both posts', () => {
  const slope = (x, z) => 0.2 * x + 0.05 * z, S2 = 1.5;
  const f = layFence('railFence', [[0, 0], [12, 0]], slope, S2), shape = fenceShape('railFence');
  const pv = shape.post.positions.length / 3, sv = shape.span.positions.length / 3, at = i => f.positions.slice(i * 3, i * 3 + 3);
  // every post's lowest vertex is the ground at its spot minus the sink; its top 1.2 × scale higher
  for (let k = 0; k < f.posts; k++) {
    const ys = []; let cx = 0, cz = 0;
    for (let i = 0; i < pv; i++) { const [x, y, z] = at(k * pv + i); ys.push(y); cx += x / pv; cz += z / pv; }
    assert.ok(Math.abs(Math.min(...ys) - (slope(cx, cz) - FENCES.sink)) < 1e-6, `post ${k}`);
    assert.ok(Math.abs(Math.max(...ys) - Math.min(...ys) - 1.2 * S2) < 1e-6);
  }
  // each rail's ends are at the two posts' heights (+ the rail height × scale): it meets both posts
  for (let k = 0; k < f.spans; k++) {
    const a = 12 / f.spans * k, b = 12 / f.spans * (k + 1), base = f.posts * pv + k * sv;
    for (let i = 0; i < sv; i++) {
      const [x, y] = at(base + i), t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      const ground = slope(a, 0) + (slope(b, 0) - slope(a, 0)) * t - FENCES.sink, h = y - ground;
      assert.ok([0.45, 0.95].some(r => Math.abs(h - r * S2) <= 0.07 * S2 + 1e-6), `span ${k} vertex ${i}: ${h}`);
    }
  }
  // the dev fences on mtn-07: no post floats (its foot is at or below the ground under it)
  for (const fence of DEV_FENCES['mtn-07']) {
    const g = layFence(fence.id, fence.points, mtn07.heightAt, S), n = fenceShape(fence.id).post.positions.length / 3;
    for (let k = 0; k < g.posts; k++) for (let i = 0; i < n; i++) {
      const [x, y, z] = g.positions.slice((k * n + i) * 3, (k * n + i) * 3 + 3);
      if (fenceShape(fence.id).post.positions[i * 3 + 1] === 0) assert.ok(y <= mtn07.heightAt(x, z) + 0.05, `${fence.id} post ${k}`);
    }
  }
});

test('scenery trees keep 1.5 m from every leg (SPEC §7.5)', () => {
  assert.equal(fencesClear([], 1.5), null);
  const ok = fencesClear([{ id: 'railFence', points: [[0, 0], [10, 0], [10, 10]] }], FENCES.treeClear);
  assert.equal(FENCES.treeClear, 1.5);
  assert.equal(ok(5, 1.4), false); assert.equal(ok(5, 1.6), true);
  assert.equal(ok(11.4, 5), false); assert.equal(ok(11.6, 5), true);
  assert.equal(ok(-1.6, 0), true); assert.equal(ok(-1.4, 0), false);
});

test('FENCE_SCALE: a tunable, default 1.5 (owner to compare 1 / 1.5 / 2 with ?tune=)', () => {
  assert.deepEqual(TUNABLES.FENCE_SCALE, { def: 1.5, min: 0.5, max: 2.5 });
  for (const v of [1, 1.5, 2]) assert.deepEqual(parseTune(`FENCE_SCALE:${v}`).set, [{ name: 'FENCE_SCALE', value: v, asked: v }]);
});

test('the dev overlay: only with test-fences, both looks beyond OB on mtn-07, ~600 m, every entry valid', () => {
  assert.deepEqual(holeFences(mtn07, 'meadow-day'), []);
  assert.deepEqual(holeFences(mtn07, DEV_FENCES_SET), DEV_FENCES['mtn-07']);
  assert.deepEqual(holeFences(HOLES['pl-01'], DEV_FENCES_SET), []);
  const total = DEV_FENCES['mtn-07'].reduce((n, f) => n + fenceLength(f.points), 0);
  assert.ok(total > 590 && total <= FENCES.maxLength, `${total}`);
  assert.deepEqual([...new Set(DEV_FENCES['mtn-07'].map(f => f.id))].sort(), ['railFence', 'ropeFence']);
  for (const [id, list] of Object.entries(DEV_FENCES)) {
    assert.equal(fencesFormatError(list), null, id);
    assert.equal(fencesError(readyHole(HOLES[id]), list), null, id);
    assert.equal(fencesError(readyHole(HOLES[id]), list, TUNABLES.FENCE_SCALE.max), null, `${id} at the largest FENCE_SCALE`);
    assert.equal(fencesSetError(list, BIOMES[DEV_FENCES_SET]), null, id);
  }
  // a sloped run: the rail fence climbs at least 2 m along its first leg
  const [x, z0, z1] = [-73, 14, -300], hs = []; for (let z = z0; z >= z1; z -= 5) hs.push(mtn07.heightAt(x, z));
  assert.ok(Math.max(...hs) - Math.min(...hs) > 2);
  // the dev set is meadow-day plus both looks, nothing else changed
  const { id, name, description, fences, ...rest } = BIOMES[DEV_FENCES_SET];
  const { id: _i, name: _n, description: _d, fences: _f, ...meadow } = BIOMES['meadow-day']; // meadow's own list (if any) is the artist's
  assert.deepEqual(rest, meadow); assert.deepEqual(fences, ['railFence', 'ropeFence']);
});
