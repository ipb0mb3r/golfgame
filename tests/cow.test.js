// AP7i: the cow (DESIGN §8b "Big props: the cow", docs/art/cow/SPEC.md): the piece, its palette keys, the pose /
// pattern fields and their checks, the drop, the grazing muzzle above the grass, the animation, the dev herd.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIBRARY } from '../src/biomes/library.js';
import { BIOMES } from '../src/biomes/index.js';
import { OPTIONAL_PALETTE_KEYS, paletteColour, pieceColours, validateBiomeSet } from '../src/core/biome.js';
import { COW, TUNABLES, TUNE } from '../src/core/config.js';
import { COWS as REF } from '../docs/art/cow/pieces.js';
import { cowGroups, cowAssembled, COW_PATCHES } from '../src/core/cowShape.js';
import { cowsFormatError, cowFenceError, cowMotion, cowSeed, cowRestPitch, cowGroundY } from '../src/core/cows.js';
import { bigPropShape } from '../src/core/bigPropShapes.js';
import { bigPropsFormatError, bigPropsError, placeBigProps, scaleBigProps, footprintOf } from '../src/core/bigProps.js';
import { eventPropsFormatError } from '../src/core/eventProps.js';
import { fencesClear, fencesError } from '../src/core/fences.js';
import { validateHole } from '../src/core/validate.js';
import { HOLES, checkHoleLooks } from '../src/holes/sets.js';
import { DEV_BIG_PROPS, DEV_BIG_PROPS_FENCES, DEV_BIG_PROPS_SET, devBigPropsFences } from '../src/holes/dev-big-props.js';

const ys = p => p.positions.filter((_, i) => i % 3 === 1);
const refGroup = (parts, g) => parts.filter(p => p.group === g);
const flat = parts => ({ pos: parts.flatMap(p => p.positions), w: parts.flatMap(p => p.w), lo: parts.flatMap(p => p.positions.filter((_, i) => i % 3 === 0).map(() => p.lo)) });

test('the piece: in LIBRARY.bigProps with SPEC §1 / §3 numbers (624 tris, size 2, scale 0.9–1.1, the slots)', () => {
  const cow = LIBRARY.bigProps.cow;
  assert.equal(cow.tris, 624); assert.equal(cow.size, 2); assert.deepEqual(cow.scale, [0.9, 1.1]);
  assert.deepEqual(cow.slots, { coat: 'cowCoat', patch: 'cowPatch', nose: 'cowNose', horn: 'lip', hornTip: 'propSnow', strap: 'accent', bell: 'subAccent' });
  assert.match(cow.desc, /^Meadow: .*cow/);
  const { groups, tris } = cowGroups();
  assert.equal(tris, 624);
  assert.deepEqual([groups.body.tris, groups.head.tris, groups.tail.tris], [240, 352, 32]);
  assert.equal(bigPropShape('cow').tris, 624);
  assert.ok(Math.abs(bigPropShape('cow').height - 1.75) < 0.01, 'SPEC: 1.75 m tall at 1×');
  assert.equal(cow.collider, undefined); // looks only
});

test('the shape is the artist\'s COWS.C: same vertices, slots and patches standing, the same head when grazing (pivot raised)', () => {
  for (const pattern of [0, 1, 2]) for (const [bob, swish] of [[0, 0], [0.1, 0.4]]) {
    const ref = REF.C.build({ pose: 'stand', pattern, bob, swish }), mine = cowAssembled({ pose: 'stand', pattern, bob, swish });
    for (const g of ['body', 'head', 'tail']) {
      const r = flat(refGroup(ref, g));
      assert.equal(mine[g].positions.length, r.pos.length, g);
      mine[g].positions.forEach((v, i) => assert.ok(Math.abs(v - r.pos[i]) < 1e-12, `${g} ${i}`));
      assert.deepEqual(mine[g].w, r.w, `${g} pattern ${pattern}`);
      assert.deepEqual(mine[g].lo, r.lo, g);
    }
  }
  // grazing: the reference's head at its 1.15 rad tip, moved up by the raised neck pivot (0.42 → 0.22 m drop)
  const ref = flat(refGroup(REF.C.build({ pose: 'graze' }), 'head')), mine = cowAssembled({ pose: 'graze' }).head;
  mine.positions.forEach((v, i) => assert.ok(Math.abs(v - ref.pos[i] - (i % 3 === 1 ? 0.2 : 0)) < 1e-12, `head ${i}`));
});

test('the 3 patch layouts are painted faces: the same vertices, whole faces coat or patch, no extra triangles', () => {
  const { groups } = cowGroups();
  assert.equal(COW_PATCHES.length, COW.patterns);
  for (const g of ['body', 'head']) {
    const { ws, indices } = groups[g];
    assert.equal(ws.length, 3);
    for (const w of ws) for (let t = 0; t < indices.length; t += 3) assert.ok(w[indices[t]] === w[indices[t + 1]] && w[indices[t + 1]] === w[indices[t + 2]] || groups[g].lo[indices[t]] === groups[g].hi[indices[t]] || groups[g].lo[indices[t]] === 'horn', `${g} face ${t / 3}`);
    assert.notDeepEqual(ws[0], ws[1]); assert.notDeepEqual(ws[1], ws[2]);
  }
  // each layout paints a black patch over an eye or the crown of the head, and some of the body
  for (let k = 0; k < 3; k++) {
    const patched = g => groups[g].ws[k].filter((w, i) => w === 1 && groups[g].lo[i] === 'coat').length;
    assert.ok(patched('body') > 30 && patched('head') > 6, `layout ${k}`);
  }
});

test('optional palette keys cowCoat / cowPatch / cowNose: fixed default colours; a set may define them', () => {
  assert.equal(OPTIONAL_PALETTE_KEYS.cowCoat, '#f6f1e4'); assert.equal(OPTIONAL_PALETTE_KEYS.cowPatch, '#2f3134'); assert.equal(OPTIONAL_PALETTE_KEYS.cowNose, '#f1a39b');
  for (const set of Object.values(BIOMES)) for (const k of ['cowCoat', 'cowPatch', 'cowNose']) assert.equal(set.palette[k], undefined, `${set.id} needs no change`);
  const set = BIOMES[DEV_BIG_PROPS_SET], c = pieceColours(set, LIBRARY)('bigProps', 'cow');
  assert.deepEqual(c, { coat: '#f6f1e4', patch: '#2f3134', nose: '#f1a39b', horn: set.palette.lip, hornTip: set.palette.propSnow, strap: set.palette.accent, bell: set.palette.subAccent });
  assert.equal(paletteColour(set.palette, 'propWood'), set.palette.wood); // the X50 fallbacks unchanged
  const own = { ...set, palette: { ...set.palette, cowCoat: '#8a5a3a' } };
  assert.doesNotThrow(() => validateBiomeSet(own, LIBRARY));
  assert.equal(pieceColours(own, LIBRARY)('bigProps', 'cow').coat, '#8a5a3a');
  assert.throws(() => validateBiomeSet({ ...set, palette: { ...set.palette, cowNose: 'pink' } }, LIBRARY), /palette\.cowNose must be a colour/);
  // an all-brown Alpine cow by a slot override (SPEC §3)
  const brown = { ...set, bigProps: [{ id: 'cow', slots: { coat: 'trunk', patch: 'trunkAlt' } }] };
  assert.doesNotThrow(() => validateBiomeSet(brown, LIBRARY));
  assert.equal(pieceColours(brown, LIBRARY)('bigProps', 'cow').coat, set.palette.trunk);
});

const mtn07 = HOLES['mtn-07'];
const withProps = (list, fences) => ({ ...mtn07, scenery: { ...mtn07.scenery, bigProps: list, ...(fences ? { fences } : {}) } });

test('pose / pattern: only on a cow, known values, at most 6 cows per hole (validateHole)', () => {
  assert.equal(bigPropsFormatError([{ id: 'cow', x: 100, z: 0, pose: 'graze', pattern: 2 }, { id: 'cow', x: 110, z: 0 }]), null);
  assert.match(bigPropsFormatError([{ id: 'windmill', x: 100, z: 0, pose: 'stand' }]), /\[0\] \(windmill\): "pose" is only for a cow/);
  assert.match(bigPropsFormatError([{ id: 'chalet', x: 100, z: 0, pattern: 0 }]), /"pattern" is only for a cow/);
  assert.match(bigPropsFormatError([{ id: 'cow', x: 100, z: 0, pose: 'sleep' }]), /\.pose must be 'stand' or 'graze' \(got "sleep"\)/);
  for (const bad of [3, -1, 1.5, '1']) assert.match(bigPropsFormatError([{ id: 'cow', x: 100, z: 0, pattern: bad }]), /\.pattern must be 0–2/, String(bad));
  const herd = n => Array.from({ length: n }, (_, i) => ({ id: 'cow', x: 100 + 8 * i, z: 0 }));
  assert.equal(cowsFormatError(herd(6)), null);
  assert.match(cowsFormatError(herd(7)), /7 cows on the hole \(at most 6\)/);
  assert.throws(() => validateHole(withProps(herd(7)), { shots: false }), /hole "mtn-07": scenery\.bigProps: 7 cows/);
  assert.throws(() => validateHole(withProps([{ id: 'windmill', x: 150, z: -150, pose: 'graze' }]), { shots: false }), /"pose" is only for a cow/);
  assert.doesNotThrow(() => validateHole(withProps(herd(6)), { shots: false }));
  // the event props keep their own format (no pose)
  assert.match(eventPropsFormatError([{ id: 'popupTent', x: 1, z: 2, pose: 'stand' }]), /unknown key "pose"/);
});

test('a cow\'s scaled footprint stays 3 m from every fence leg; the big-prop rules still hold (OB + 5 m, the set)', () => {
  const set = BIOMES[DEV_BIG_PROPS_SET], fence = [{ id: 'railFence', points: [[90, 20], [90, -60]] }];
  const r = footprintOf({ id: 'cow', scale: LIBRARY.bigProps.cow.size }), x = 90 + r + COW.fenceClear;
  assert.ok(r > 2.9 && r < 3.1, `footprint ${r}`);
  assert.equal(bigPropsError(mtn07, [{ id: 'cow', x: x + 0.01, z: 0 }], set, LIBRARY, fence), null);
  assert.match(bigPropsError(mtn07, [{ id: 'cow', x: x - 0.01, z: 0 }], set, LIBRARY, fence), /\(cow\) at .*comes within 3 m of scenery\.fences\[0\] \(railFence\) leg 1/);
  assert.match(bigPropsError(mtn07, [{ id: 'cow', x: x + 0.01, z: 0, scale: 1.1 }], set, LIBRARY, fence), /within 3 m of scenery\.fences/); // the scale grows it
  assert.equal(cowFenceError([{ id: 'windmill', x: 90, z: 0 }], fence, () => 5), null);                                       // only cows
  // the hole's own fences by default (checkHoleLooks / readyHole)
  const h = { ...withProps([{ id: 'cow', x: x - 1, z: 0 }], fence), biome: DEV_BIG_PROPS_SET };
  assert.throws(() => checkHoleLooks(h), /comes within 3 m of scenery\.fences\[0\]/);
  // OB + 5 m and the set still apply
  assert.match(bigPropsError(mtn07, [{ id: 'cow', x: 74, z: 0 }], set, LIBRARY), /comes within 5 m of the OB box/);
  assert.match(bigPropsError(mtn07, [{ id: 'cow', x: 150, z: 0 }], BIOMES['meadow-day'], LIBRARY), /does not offer it/);
  assert.match(bigPropsError(mtn07, [{ id: 'cow', x: 150, z: 0, scale: 1.15 }], set, LIBRARY), /scale must be 0\.9–1\.1 \(got 1\.15\)/);
});

test('the drop: a cow stands on its hooves; pose / pattern / the head\'s rest pitch come with it', () => {
  const slope = (x, z) => 0.1 * x;
  const [p] = placeBigProps([{ id: 'cow', x: 100, z: 0, turn: 0, scale: 2, pose: 'graze', pattern: 2 }], slope);
  assert.ok(Math.abs(p.y - slope(100 - 0.32 * 2, 0)) < 1e-9, `the lowest hoof (y ${p.y})`);
  assert.deepEqual([p.pose, p.pattern], ['graze', 2]);
  const [q] = placeBigProps([{ id: 'cow', x: 100, z: 0 }], () => 0);
  assert.deepEqual([q.pose, q.pattern, q.pitch, q.turn, q.scale], ['stand', 0, 0, 0, 1]);
  assert.equal(cowGroundY({ x: 0, z: 0, turn: 1, scale: 2 }, () => 3), 3);
});

// every head vertex of a placed grazing cow at a pitch, in the world → [x, y, z]
const headWorld = (p, pitch) => {
  const a = cowAssembled({ pose: 'graze', bob: pitch - COW.graze.pitch }).head, out = [];
  for (let i = 0; i < a.positions.length; i += 3) {
    const [cx, cy, cz] = [a.positions[i] * p.scale, a.positions[i + 1] * p.scale, a.positions[i + 2] * p.scale], c = Math.cos(p.turn), s = Math.sin(p.turn);
    out.push([p.x + cx * c + cz * s, p.y + cy, p.z - cx * s + cz * c]);
  }
  return out;
};

test('the grazing muzzle sits just above the grass, never in it (flat ground and slopes, every scale, the deepest munch)', () => {
  for (const scale of [0.9, 1, 1.1].map(s => s * LIBRARY.bigProps.cow.size)) {
    const [p] = placeBigProps([{ id: 'cow', x: 0, z: 0, scale, pose: 'graze' }], () => 0);
    assert.equal(p.pitch, COW.graze.pitch);
    const low = Math.min(...headWorld(p, p.pitch).map(v => v[1]));
    assert.ok(low > 0.02 && low < 0.1, `scale ${scale}: the muzzle ${low.toFixed(3)} m above the grass`);
  }
  // the deepest the motion goes is the rest pitch
  const T = { ...TUNE };
  for (let t = 0; t < 60; t += 0.05) assert.ok(cowMotion(t, { pose: 'graze', seed: 5, rest: 1.15 }, T).pitch <= 1.15 + 1e-12);
  // facing up a slope: the head lifts until it clears the ground under it
  for (const [turn, k] of [[0, 0.12], [Math.PI / 2, 0.1], [2.5, 0.08]]) {
    const ground = (x, z) => k * (Math.cos(turn) * z + Math.sin(turn) * x); // rises toward the cow's front
    const [p] = placeBigProps([{ id: 'cow', x: 0, z: 0, turn, scale: 2, pose: 'graze' }], ground);
    assert.ok(p.pitch < COW.graze.pitch, `turn ${turn}: lifted (${p.pitch})`);
    for (const [x, y, z] of headWorld(p, p.pitch)) assert.ok(y >= ground(x, z) + COW.graze.clear - 1e-9, `turn ${turn}`);
  }
  assert.equal(cowRestPitch({ x: 0, y: 0, z: 0, turn: 0, scale: 2, pose: 'stand' }, () => 0), 0);
});

test('the animation (SPEC §5): eased, the sizes and periods of the tune keys, a phase per cow, still at COW_SPEED 0', () => {
  for (const [k, def] of Object.entries({ COW_NOD: 0.1, COW_NOD_TIME: 4, COW_MUNCH: 0.18, COW_MUNCH_TIME: 2.5, COW_LIFT: 0.6, COW_LIFT_HOLD: 1.5, COW_SWISH: 0.45, COW_SWISH_TIME: 0.8, COW_PAUSE_MIN: 2, COW_PAUSE_MAX: 5, COW_ANIM_FAR: 200, COW_SPEED: 1 })) assert.equal(TUNABLES[k]?.def, def, k);
  const T = { ...TUNE }, dt = 1 / 60;
  const run = (cow, secs) => Array.from({ length: Math.round(secs / dt) }, (_, i) => cowMotion(i * dt, cow, T));
  const stand = run({ pose: 'stand', seed: cowSeed(0, { x: 90, z: -2 }) }, 120), graze = run({ pose: 'graze', seed: cowSeed(1, { x: 98, z: -13 }), rest: 1.15 }, 120);
  const range = (a, f) => [Math.min(...a.map(f)), Math.max(...a.map(f))];
  const [s0, s1] = range(stand, m => m.pitch);
  assert.ok(s0 >= -0.1 - 1e-9 && s1 <= 0.1 + 1e-9 && s1 - s0 > 0.19, 'a ±0.1 nod');
  const [g0, g1] = range(graze, m => m.pitch);
  assert.ok(Math.abs(g0 - (1.15 - 0.6)) < 0.01 && g1 <= 1.15 + 1e-9, `graze ${g0}…${g1}: lifts 0.6 rad now and then`);
  assert.ok(graze.filter(m => m.pitch < 1.15 - 0.5).length * dt > 1.5 * 8, 'lifted ~1.5 s each ~10 s');
  const [w0, w1] = range(stand, m => m.swish);
  assert.ok(w0 >= -0.45 - 1e-9 && w1 <= 0.45 + 1e-9 && w1 > 0.44 && w0 < -0.44, 'a ±0.45 swish');
  // smooth: no jumps between two frames
  for (const a of [stand, graze]) for (let i = 1; i < a.length; i++) {
    assert.ok(Math.abs(a[i].pitch - a[i - 1].pitch) < 0.03, `pitch at ${i}`);
    assert.ok(Math.abs(a[i].swish - a[i - 1].swish) < 0.08, `swish at ${i}`);
  }
  // each swish lasts COW_SWISH_TIME; the pauses between them 2–5 s
  const starts = [];
  stand.forEach((m, i) => { if (i && m.swish !== 0 && stand[i - 1].swish === 0) starts.push(i * dt); });
  assert.ok(starts.length > 15, `${starts.length} swishes in 2 min`);
  for (let i = 1; i < starts.length; i++) { const gap = starts[i] - starts[i - 1] - 0.8; assert.ok(gap > 2 - 0.05 && gap < 5 + 0.05, `pause ${gap}`); }
  // the herd is never in step: two cows differ
  const other = run({ pose: 'stand', seed: cowSeed(3, { x: 100, z: 2 }) }, 120);
  assert.ok(stand.some((m, i) => Math.abs(m.pitch - other[i].pitch) > 0.03));
  assert.ok(stand.some((m, i) => (m.swish === 0) !== (other[i].swish === 0)));
  // COW_SPEED 0: still
  const still = { ...T, COW_SPEED: 0 };
  assert.deepEqual(cowMotion(0, { pose: 'graze', seed: 3, rest: 1.1 }, still), cowMotion(37, { pose: 'graze', seed: 3, rest: 1.1 }, still));
});

test('the dev herd: 4 cows (2 standing, 2 grazing, 3 layouts) in a closed rail-fence pasture beyond OB on mtn-07, only with test-big-props', () => {
  const cows = DEV_BIG_PROPS['mtn-07'].filter(p => p.id === 'cow'), pasture = DEV_BIG_PROPS_FENCES['mtn-07'];
  assert.equal(cows.length, 4);
  assert.deepEqual(cows.map(p => p.pose ?? 'stand').sort(), ['graze', 'graze', 'stand', 'stand']);
  assert.deepEqual([...new Set(cows.map(p => p.pattern ?? 0))].sort(), [0, 1, 2]);
  assert.equal(fencesError(mtn07, pasture), null);
  assert.equal(bigPropsError(mtn07, DEV_BIG_PROPS['mtn-07'], BIOMES[DEV_BIG_PROPS_SET], LIBRARY, pasture), null);
  assert.deepEqual(devBigPropsFences(mtn07, 'meadow-day'), []);
  assert.deepEqual(devBigPropsFences(mtn07, DEV_BIG_PROPS_SET), pasture);
  // every cow inside the pasture; no scenery tree stands in it
  const [x0, x1] = [80, 108], [z0, z1] = [-34, 12];
  for (const c of cows) assert.ok(c.x > x0 && c.x < x1 && c.z > z0 && c.z < z1);
  const free = fencesClear(pasture, 1.5);
  assert.equal(free(94, -10), false); assert.equal(free(60, -10), true); assert.equal(free(120, -10), true);
  // drawn at the default size: none clipped
  assert.equal(scaleBigProps(mtn07, cows, 1, LIBRARY).clipped.length, 0);
});
