// AP7e: big props (DESIGN §8b "Big props", docs/art/big-props/SPEC.md): the four pieces, the hand placement in
// scenery.bigProps and its checks, the ?biome= skip, the drop onto the terrain, the dev overlay.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIBRARY } from '../src/biomes/library.js';
import { BIOMES, resolveBiome } from '../src/biomes/index.js';
import { ALL_PALETTE_KEYS } from '../src/core/biome.js';
import { BIG_PROPS } from '../src/core/config.js';
import { bigPropShape, BIG_PROP_PIECES } from '../src/core/bigPropShapes.js';
import { bigPropsFormatError, bigPropsError, bigPropsFor, placeBigProps, bigPropsClear, footprintOf, obBoxOf } from '../src/core/bigProps.js';
import { validateHole } from '../src/core/validate.js';
import { HOLES, checkHoleLooks } from '../src/holes/sets.js';
import { DEV_BIG_PROPS, DEV_BIG_PROPS_SET, holeBigProps } from '../src/holes/dev-big-props.js';

// the spec's numbers (SPEC §1): triangles per piece
const SPEC_TRIS = { windmill: 328, chalet: 404, chaletTall: 404, beachHut: 114 };

test('the four pieces: in the library with desc / slots / tris, the spec\'s triangle counts, each ≤ 1,500', () => {
  assert.deepEqual(Object.keys(LIBRARY.bigProps), ['windmill', 'chalet', 'chaletTall', 'beachHut']);
  assert.deepEqual(BIG_PROP_PIECES, Object.keys(LIBRARY.bigProps));
  for (const [id, piece] of Object.entries(LIBRARY.bigProps)) {
    const shape = bigPropShape(id);
    assert.ok(typeof piece.desc === 'string' && piece.desc.length > 20, id);
    assert.equal(shape.tris, SPEC_TRIS[id], `${id} triangles`);
    assert.equal(piece.tris, shape.tris, `${id}: library tris`);
    assert.ok(shape.tris <= BIG_PROPS.maxTris, `${id} ≤ ${BIG_PROPS.maxTris}`);
    // every slot names a palette key, and every slot the shape uses is a library slot
    for (const key of Object.values(piece.slots)) assert.ok(ALL_PALETTE_KEYS.includes(key), `${id}: ${key}`);
    for (const part of Object.values(shape.parts)) for (const s of [...part.lo, ...part.hi]) assert.ok(Object.hasOwn(piece.slots, s), `${id} uses slot ${s}`);
    // well formed: indices in range, a weight per vertex, the foot at y 0
    for (const part of Object.values(shape.parts)) {
      const n = part.positions.length / 3;
      assert.equal(part.w.length, n); assert.equal(part.lo.length, n);
      assert.ok(part.indices.every(i => i >= 0 && i < n));
    }
    assert.equal(Math.min(...shape.parts.body.positions.filter((_, i) => i % 3 === 1)), 0, `${id}: the foot at y 0`);
    const [lo, hi] = piece.scale;
    assert.ok(lo > 0 && lo <= 1 && hi >= 1, id);
  }
  // SPEC §3: the slots → palette keys
  assert.deepEqual(LIBRARY.bigProps.windmill.slots, { wall: 'propSnow', base: 'rock', cap: 'roof', spar: 'wood', sail: 'propSnow', glass: 'glass' });
  assert.deepEqual(LIBRARY.bigProps.chalet.slots, { stone: 'propSnow', wood: 'wood', roof: 'roof', shut: 'accent', flower: 'accent', leaf: 'leaf', glass: 'glass' });
  assert.deepEqual(LIBRARY.bigProps.chaletTall.slots, LIBRARY.bigProps.chalet.slots);
  assert.deepEqual(LIBRARY.bigProps.beachHut.slots, { wall: 'wood', post: 'trunk', roof: 'roof', door: 'water', trim: 'propSnow' });
  // the beach hut is never below 0.9 (its door reads door-sized)
  assert.ok(LIBRARY.bigProps.beachHut.scale[0] >= 0.9);
});

test('the shapes match the spec\'s sizes; the windmill\'s sails are a part of their own', () => {
  const w = bigPropShape('windmill');
  assert.deepEqual(Object.keys(w.parts), ['body', 'sails']);
  assert.equal(w.parts.body.tris + w.parts.sails.tris, 328);
  const top = part => Math.max(...part.positions.filter((_, i) => i % 3 === 1));
  assert.ok(Math.abs(top(w.parts.body) - 12.2) < 1e-9, 'the cap tip at 12.2 m');
  for (const id of ['chalet', 'chaletTall', 'beachHut']) assert.deepEqual(Object.keys(bigPropShape(id).parts), ['body']);
  const span = (id, axis) => { const p = bigPropShape(id).parts.body.positions.filter((_, i) => i % 3 === axis); return Math.max(...p) - Math.min(...p); };
  assert.ok(span('beachHut', 1) > 4.6 && span('beachHut', 1) < 4.8, 'hut 4.7 m tall');
  assert.ok(span('chalet', 0) > 12 && span('chalet', 0) < 14, 'chalet ~12 m wide (+ roof overhang)');
  assert.ok(bigPropShape('chaletTall').height > bigPropShape('chalet').height);
  // the footprint radius reaches the sails' tips (6.8 m + the hub's offset)
  assert.ok(w.radius > 6.4 && w.radius < 7.5, `windmill radius ${w.radius}`);
});

// a hole as validateHole / bigPropsError see it: mtn-07 with its own bigProps replaced
const mtn07 = HOLES['mtn-07'];
const withProps = list => ({ id: 'mtn-07', scenery: { stakes: mtn07.scenery.stakes, bigProps: list } });
const offerAll = BIOMES[DEV_BIG_PROPS_SET];

test('scenery.bigProps format: { id, x, z, turn, scale }, turn and scale optional; bad ones fail validateHole', () => {
  assert.equal(bigPropsFormatError(undefined), null);
  assert.equal(bigPropsFormatError([]), null);
  assert.equal(bigPropsFormatError([{ id: 'windmill', x: 100, z: -150 }]), null);
  assert.match(bigPropsFormatError({}), /must be a list/);
  assert.match(bigPropsFormatError([{ x: 1, z: 2 }]), /\[0\] must be/);
  assert.match(bigPropsFormatError([{ id: 'windmill', x: 'a', z: 2 }]), /\.x must be a number/);
  assert.match(bigPropsFormatError([{ id: 'windmill', x: 1, z: 2, turn: NaN }]), /\.turn must be a number/);
  assert.match(bigPropsFormatError([{ id: 'windmill', x: 1, z: 2, size: 2 }]), /unknown key "size"/);
  // validateHole runs it on the hole's scenery
  const h = { ...mtn07, scenery: { ...mtn07.scenery, bigProps: [{ id: 'windmill', x: 1 }] } };
  assert.throws(() => validateHole(h, { shots: false }), /hole "mtn-07": scenery\.bigProps\[0\] \(windmill\)\.z must be a number/);
});

test('placement rules: the set must offer the id, the scale in range, the footprint clear of the OB box + 5 m', () => {
  const box = obBoxOf(mtn07.scenery.stakes); // x −70…72, z −475…16
  assert.deepEqual(box, { x0: -70, x1: 72, z0: -475, z1: 16 });
  const r = footprintOf({ id: 'windmill' }), edge = box.x1 + BIG_PROPS.obClear + r;
  assert.equal(bigPropsError(withProps([]).scenery, [], offerAll, LIBRARY), null);
  assert.equal(bigPropsError(withProps([]), [{ id: 'windmill', x: edge + 0.01, z: -150 }], offerAll, LIBRARY), null);
  assert.match(bigPropsError(withProps([]), [{ id: 'windmill', x: edge - 0.01, z: -150 }], offerAll, LIBRARY), /footprint .* comes within 5 m of the OB box/);
  // scale grows the footprint
  assert.match(bigPropsError(withProps([]), [{ id: 'windmill', x: edge + 0.01, z: -150, scale: 1.1 }], offerAll, LIBRARY), /comes within/);
  // beyond the far end (behind the green) and inside the box
  assert.equal(bigPropsError(withProps([]), [{ id: 'chalet', x: 0, z: -475 - 5 - footprintOf({ id: 'chalet' }) - 0.01 }], offerAll, LIBRARY), null);
  assert.match(bigPropsError(withProps([]), [{ id: 'chalet', x: 0, z: -200 }], offerAll, LIBRARY), /comes within/);
  // the set must offer it (meadow-day offers none today)
  assert.match(bigPropsError(withProps([]), [{ id: 'windmill', x: 200, z: -150 }], BIOMES['meadow-day'], LIBRARY), /biome set "meadow-day" does not offer it \(its bigProps: none\)/);
  assert.match(bigPropsError(withProps([]), [{ id: 'cow', x: 200, z: -150 }], offerAll, LIBRARY), /not a big-prop piece/);
  // the scale range; the beach hut never below 0.9
  assert.match(bigPropsError(withProps([]), [{ id: 'beachHut', x: 200, z: -150, scale: 0.85 }], offerAll, LIBRARY), /scale must be 0\.9–1\.15 \(got 0\.85\)/);
  assert.match(bigPropsError(withProps([]), [{ id: 'chalet', x: 200, z: -150, scale: 1.3 }], offerAll, LIBRARY), /scale must be/);
});

test('checkHoleLooks (readyHole) fails a hole whose set does not offer its prop; a hole with none is normal', () => {
  const h = { ...mtn07, id: 'mtn-07', biome: 'meadow-day', scenery: { ...mtn07.scenery, bigProps: [{ id: 'windmill', x: 150, z: -150 }] } };
  assert.throws(() => checkHoleLooks(h), /hole "mtn-07": scenery\.bigProps\[0\] \(windmill\): biome set "meadow-day" does not offer it/);
  assert.doesNotThrow(() => checkHoleLooks({ ...h, biome: DEV_BIG_PROPS_SET }));
  // every real hole today has none, and passes
  for (const hole of Object.values(HOLES)) { assert.equal(hole.scenery.bigProps, undefined, hole.id); assert.doesNotThrow(() => checkHoleLooks(hole)); }
});

test('?biome= override to a set without the prop: the prop is skipped, never an error', () => {
  const list = [{ id: 'windmill', x: 1, z: 2 }, { id: 'beachHut', x: 3, z: 4 }];
  assert.deepEqual(bigPropsFor(list, ['beachHut']), { keep: [list[1]], skipped: [list[0]] });
  assert.deepEqual(bigPropsFor(list, []), { keep: [], skipped: list });
  assert.deepEqual(bigPropsFor(undefined, ['windmill']), { keep: [], skipped: [] });
  // a resolved set's bigProps are ids (an X33 override pick resolves to its id)
  assert.deepEqual(resolveBiome(DEV_BIG_PROPS_SET).bigProps, ['windmill', 'chalet', 'chaletTall', 'beachHut']);
});

test('the drop: each prop stands at the lowest ground under its footprint (never floats)', () => {
  const slope = (x, z) => 0.1 * x + 0.05 * z; // a tilted plane
  const [p] = placeBigProps([{ id: 'chalet', x: 100, z: -100, turn: 0.5 }], slope), r = footprintOf({ id: 'chalet' });
  assert.ok(Math.abs(p.y - slope(100 - r * 0.1 / Math.hypot(0.1, 0.05), -100 - r * 0.05 / Math.hypot(0.1, 0.05))) < 0.1, `y ${p.y}`);
  assert.ok(p.y < slope(100, -100));
  assert.deepEqual({ turn: p.turn, scale: p.scale }, { turn: 0.5, scale: 1 });
  // on the hole: never above any ground sample under the footprint
  for (const q of placeBigProps(DEV_BIG_PROPS['mtn-07'], mtn07.heightAt)) {
    const rr = footprintOf(q);
    for (let a = 0; a < 6.28; a += 0.5) for (const f of [0, 0.5, 1]) assert.ok(q.y <= mtn07.heightAt(q.x + Math.cos(a) * rr * f, q.z + Math.sin(a) * rr * f) + 0.3, q.id);
  }
});

test('scenery trees keep out of a prop\'s footprint (+ treeClear) and its sight corridor to the tee', () => {
  assert.equal(bigPropsClear([], 3), null);
  const p = { id: 'beachHut', x: 100, z: 0 }, r = footprintOf(p), ok = bigPropsClear([p], 3, { x: 0, z: 0 });
  assert.equal(ok(100 + r + 2.9, 0), false); assert.equal(ok(100, r + 3.1), true);   // the ring
  assert.equal(ok(50, 0), false); assert.equal(ok(50, r + 0.1), true);              // the corridor toward the tee
  assert.equal(ok(-10, 0), true);                                                   // not beyond the tee
});

test('the dev overlay: only with test-big-props, one of each beyond OB on mtn-07, every entry valid', () => {
  assert.deepEqual(DEV_BIG_PROPS['mtn-07'].map(p => p.id).sort(), ['beachHut', 'chalet', 'chaletTall', 'windmill']);
  assert.deepEqual(holeBigProps(mtn07, 'meadow-day'), []);
  assert.deepEqual(holeBigProps(mtn07, DEV_BIG_PROPS_SET), DEV_BIG_PROPS['mtn-07']);
  assert.deepEqual(holeBigProps(HOLES['pl-01'], DEV_BIG_PROPS_SET), []);
  for (const [id, list] of Object.entries(DEV_BIG_PROPS)) {
    assert.equal(bigPropsFormatError(list), null, id);
    assert.equal(bigPropsError(HOLES[id], list, BIOMES[DEV_BIG_PROPS_SET], LIBRARY), null, id);
  }
  // the dev set is meadow-day plus the four props, nothing else changed
  const { id, name, description, bigProps, ...rest } = BIOMES[DEV_BIG_PROPS_SET];
  const { id: _i, name: _n, description: _d, bigProps: none, ...meadow } = BIOMES['meadow-day'];
  assert.deepEqual(rest, meadow); assert.deepEqual(none, []);
});
