// AP7g: event props (DESIGN §8b "Event props", docs/art/tee-props/SPEC.md): the library pieces and their shapes,
// the scenery.eventProps format and every validateHole zone rule (SPEC §6.3, incl. the owner's tent rule), the set's
// optional `eventProps` list, the drop, the tree clearing, the dev overlay.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_PROPS, TUNABLES } from '../src/core/config.js';
import { LIBRARY } from '../src/biomes/library.js';
import { BIOMES, resolveBiome } from '../src/biomes/index.js';
import { validateBiomeSet, pieceColours, pickId } from '../src/core/biome.js';
import { validateHole } from '../src/core/validate.js';
import { eventPropShape, EVENT_PROP_PIECES } from '../src/core/eventPropShapes.js';
import { eventPropsFormatError, eventPropsError, eventPropsSetError, eventFootprint, fromTee, teeAim, scaleEventProps, placeEventProps, eventPropsClear, surfaceNear } from '../src/core/eventProps.js';
import { parseTune } from '../src/core/tune.js';
import { HOLES, readyHole, checkHoleLooks } from '../src/holes/sets.js';
import { DEV_EVENT_PROPS, DEV_EVENT_PROPS_SET, holeEventProps } from '../src/holes/dev-event-props.js';
import { PIECES as REF } from '../docs/art/tee-props/pieces.js';

// pl-01: tee (0, 0), tee box |x| < 3.5, |z| < 4, plays toward −z, rough to OB at |x| > 55, fairway z −22…−136,
// pond (−20, −92), green (3, −150) 15 × 12 m with a 1.8 m fringe, bunkers left / behind / right of it
const pl01 = readyHole(HOLES['pl-01']);
const err = (id, x, z, extra = {}) => eventPropsError(pl01, [{ id, x, z, ...extra }]);
const FLAG_R = 0.75 * TUNABLES.EVENT_PROP_SCALE.def, TENT_R = eventPropShape('popupTent').radius * TUNABLES.EVENT_PROP_SCALE.def;

test('library: featherFlag, popupTent and parkBench with tris / slots / desc; each ≤ 300 triangles', () => {
  assert.deepEqual(Object.keys(LIBRARY.eventProps), ['featherFlag', 'popupTent', 'parkBench']);
  assert.deepEqual(EVENT_PROP_PIECES, Object.keys(LIBRARY.eventProps));
  for (const [id, piece] of Object.entries(LIBRARY.eventProps)) {
    const shape = eventPropShape(id);
    assert.equal(shape.tris, piece.tris, `${id} tris`);
    assert.ok(shape.tris <= EVENT_PROPS.maxTris, `${id} ≤ ${EVENT_PROPS.maxTris}`);
    assert.ok(piece.desc.length > 20);
    for (const part of Object.values(shape.parts)) for (const s of [...part.lo, ...part.hi]) assert.ok(Object.hasOwn(piece.slots, s), `${id}: slot ${s}`);
  }
  assert.equal(eventPropShape('featherFlag').tris, 45); assert.equal(eventPropShape('popupTent').tris, 104); // SPEC §1
  // SPEC §3: the biome's accents
  assert.deepEqual(LIBRARY.eventProps.featherFlag.slots, { pole: 'propSnow', body: 'accent', top: 'subAccent', stripe: 'propSnow', base: 'rock' });
  assert.deepEqual(LIBRARY.eventProps.popupTent.slots, { leg: 'propSnow', roof: 'accent', valance: 'subAccent' });
  // AP7h bench SPEC §1 / §3b (X50): 132 triangles, 1.8 × 0.55 m (before scale), the props' wood, dark at the foot
  const bench = eventPropShape('parkBench');
  assert.equal(bench.tris, 132); assert.equal(LIBRARY.eventProps.parkBench.tris, 132);
  assert.deepEqual(LIBRARY.eventProps.parkBench.slots, { slat: 'propWoodDark', slatTop: 'propWood', frame: 'propWoodDark', frameTop: 'propWood' });
  assert.deepEqual(Object.keys(bench.parts), ['slats', 'frame']);
  const xs = [], zs = [];
  for (const p of Object.values(bench.parts)) for (let i = 0; i < p.positions.length; i += 3) { xs.push(p.positions[i]); zs.push(p.positions[i + 2]); }
  assert.ok(Math.abs(Math.max(...xs) - Math.min(...xs) - 1.8) < 1e-9, 'width 1.8 m');
  assert.ok(Math.abs(Math.max(...zs) - Math.min(...zs) - 0.55) < 0.05, 'depth ~0.55 m');
  assert.ok(Math.abs(bench.height - 0.85) < 0.05, 'back ~0.85 m');
  // the banner and the roof are parts of their own (double-sided sheets; a banner sway could come later)
  assert.deepEqual(Object.keys(eventPropShape('featherFlag').parts), ['pole', 'banner']);
  assert.deepEqual(Object.keys(eventPropShape('popupTent').parts), ['frame', 'roof']);
});

test('the shapes are the artist\'s pieces.js (F1 → featherFlag, T1 → popupTent): same vertices, sizes', () => {
  const flat = parts => parts.flatMap(p => p.positions);
  const same = (a, b, what) => { assert.equal(a.length, b.length, what); a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-9, `${what} ${i}`)); };
  const f = REF.flag.F1.build(), flag = eventPropShape('featherFlag');
  same(flag.parts.pole.positions, flat(f.filter(p => p.lo === 'pole' || p.lo === 'base')), 'flag pole');
  same(flag.parts.banner.positions, flat(f.filter(p => ['body', 'stripe', 'top'].includes(p.lo))), 'flag banner');
  const t = REF.tent.T1.build(), tent = eventPropShape('popupTent');
  same(tent.parts.frame.positions, flat([...t.filter(p => p.lo === 'leg'), ...t.filter(p => p.lo === 'valance')]), 'tent frame');
  same(tent.parts.roof.positions, flat(t.filter(p => p.lo === 'roof')), 'tent roof');
  // sizes at 1× (SPEC §1): flag 0.75 × 3.42 m, tent 3.1 m wide, 3.2 m tall; × 1.3 in game ≈ 1 × 4.4 m and 4 × 4 × 4.2 m
  assert.ok(Math.abs(flag.radius - 0.75) < 1e-9); assert.equal(flag.height, 3.42); assert.equal(tent.height, 3.2);
  assert.ok(Math.abs(flag.height * 1.3 - 4.45) < 0.01 && Math.abs(tent.height * 1.3 - 4.16) < 0.01);
});

test('scenery.eventProps format: the big props\' { id, x, z, turn, scale }; bad ones fail validateHole', () => {
  assert.equal(eventPropsFormatError(undefined), null);
  assert.equal(eventPropsFormatError([{ id: 'featherFlag', x: 6, z: 0, turn: 1 }]), null);
  assert.match(eventPropsFormatError({}), /scenery\.eventProps must be a list/);
  assert.match(eventPropsFormatError([{ x: 1, z: 2 }]), /scenery\.eventProps\[0\] must be/);
  assert.match(eventPropsFormatError([{ id: 'featherFlag', x: 'a', z: 2 }]), /\.x must be a number/);
  assert.match(eventPropsFormatError([{ id: 'featherFlag', x: 1, z: 2, zone: 'tee' }]), /unknown key "zone"/);
  const h = { ...pl01, scenery: { ...pl01.scenery, eventProps: [{ id: 'featherFlag', x: 1 }] } };
  assert.throws(() => validateHole(h, { shots: false }), /hole "pl-01": scenery\.eventProps\[0\] \(featherFlag\)\.z must be a number/);
});

test('rule: an unknown piece or a scale out of range fails', () => {
  assert.match(err('beachFlag', 6, 0), /is not an event prop \(the library's eventProps: featherFlag, popupTent, parkBench\)/);
  assert.equal(err('featherFlag', 6, 0, { scale: 0.9 }), null);
  assert.match(err('featherFlag', 6, 0, { scale: 0.85 }), /scale must be 0\.9–1\.15 \(got 0\.85\)/);
  assert.match(err('popupTent', -10.5, 5, { scale: 1.2 }), /scale must be/);
});

test('rule: the footprint is not on the tee box nor within 1.5 m of it', () => {
  const edge = 3.5 + EVENT_PROPS.teeBox + FLAG_R; // 5.975 m from the tee centre, beside the box
  assert.equal(err('featherFlag', edge + 0.05, 0), null);
  assert.match(err('featherFlag', edge - 0.05, 0), /footprint \(1\.0 m\) is on the tee box or within 1\.5 m of it/);
  assert.match(err('featherFlag', 2, 0), /on the tee box/);
  // the scale grows the footprint
  assert.match(err('featherFlag', edge + 0.05, 0, { scale: 1.15 }), /on the tee box/);
});

test('rule: nothing in the tee camera\'s clear zone (±4 m of the aim line, 12 m behind the tee to the tee)', () => {
  assert.match(err('featherFlag', 0, 8), /inside the tee camera's clear zone/);
  assert.match(err('featherFlag', 4 + FLAG_R - 0.05, 8), /camera/);
  assert.equal(err('featherFlag', 4 + FLAG_R + 0.05, 8), null);
  assert.match(err('featherFlag', 0, 12 + FLAG_R - 0.05), /camera/);
  assert.equal(err('featherFlag', 0, 12 + FLAG_R + 0.05), null);       // behind the zone (here: beyond OB, fine for a flag)
  // the zone turns with the tee's facing (mtn-07 faces the landing area at (−20, −222))
  const m = readyHole(HOLES['mtn-07']), a = teeAim(m);
  assert.ok(Math.abs(Math.hypot(a.dx, a.dz) - 1) < 1e-9 && a.dx < 0);
  const behind = { x: m.tee.x - a.dx * 8, z: m.tee.z - a.dz * 8 }, t = fromTee(m, behind.x, behind.z);
  assert.ok(Math.abs(t.ahead + 8) < 1e-9 && t.side < 1e-9);
  assert.match(eventPropsError(m, [{ id: 'featherFlag', ...behind }]), /camera/);
});

test('rule: nothing more than 4 m in front of the tee while within 15 m of it', () => {
  assert.equal(err('featherFlag', 8, -(4 - FLAG_R) + 0.05), null);
  assert.match(err('featherFlag', 8, -(4 - FLAG_R) - 0.05), /reaches 4\.0 m in front of the tee \(at most 4 m while within 15 m of the tee\)/);
  assert.match(err('featherFlag', 10, -10), /in front of the tee/);       // 14.1 m from the tee
  assert.equal(err('featherFlag', 12, -10), null);                         // 15.6 m: the course side, rough is fine for a flag
});

test('rule: not on the fairway, a bunker, water, the fringe or the green; 8 m from the green\'s edge', () => {
  assert.match(err('featherFlag', 0, -60), /stands on the fairway/);
  assert.match(err('featherFlag', 19, -140), /stands on the sand/);
  assert.match(err('featherFlag', -20, -92), /stands on the water/);
  assert.match(err('featherFlag', 3, -150), /stands on the green/);
  assert.match(err('featherFlag', 3, -150 - 12 - 1.0), /stands on the (fringe|green)/);
  assert.match(err('featherFlag', -14, -156), /within 8 m of the green's edge/);
  assert.equal(err('featherFlag', -22, -160), null);
  // flags may stand at the outer rough edge (owner), and beyond OB
  assert.equal(err('featherFlag', 54, -60), null);
  assert.equal(err('featherFlag', 58, -60), null);
});

test('rule: no popupTent within 25 m of the green', () => {
  assert.match(err('popupTent', -30, -160), /a popupTent within 25 m of the green/);
  assert.equal(err('featherFlag', -30, -160), null);                      // a flag may stand there
});

test('rule (owner): a popupTent beyond the tee zone keeps its footprint 5 m from every in-play surface', () => {
  const edge = -55 - EVENT_PROPS.tentPlay - TENT_R;                         // the rough ends at |x| = 55 on pl-01
  assert.equal(err('popupTent', edge - 0.1, -70), null);                  // beyond OB, 5 m clear
  assert.match(err('popupTent', edge + 0.1, -70), /a popupTent beyond the tee zone .* footprint \(2\.9 m\) comes within 5 m of the rough/);
  assert.match(err('popupTent', -40, -70), /comes within 5 m of the rough/); // in the rough
  // in the tee zone the tee rules apply instead: beside the tee in the rough is fine, the same spot 16 m off is not
  assert.equal(err('popupTent', -10.5, 5), null);
  assert.ok(fromTee(pl01, -14, 8).dist > EVENT_PROPS.teeZone);
  assert.match(err('popupTent', -14, 8), /beyond the tee zone/);
});

test('surfaceNear: finds a surface within R m (grid + rim), null when none', () => {
  const at = (x, z) => (x > 10 ? 'green' : 'rough');
  assert.equal(surfaceNear(at, 0, 0, 9.9, s => s === 'green'), null);
  assert.equal(surfaceNear(at, 0, 0, 10.1, s => s === 'green').s, 'green');
  assert.equal(surfaceNear(at, 0, 0, 30, s => s === 'green').s, 'green');   // the coarse grid past 10 m
});

test('the set\'s optional eventProps list; checkHoleLooks fails a hole whose set does not offer the piece', () => {
  assert.equal(eventPropsSetError(DEV_EVENT_PROPS['pl-01'], BIOMES[DEV_EVENT_PROPS_SET]), null);
  assert.match(eventPropsSetError([{ id: 'popupTent' }], BIOMES['proto-default']), /biome set "proto-default" does not offer it \(its eventProps: none\)/);
  const set = { ...BIOMES['meadow-day'], id: 'x', eventProps: ['featherFlag'] };
  assert.match(eventPropsSetError([{ id: 'popupTent' }], set), /its eventProps: featherFlag/);
  assert.doesNotThrow(() => validateBiomeSet(set, LIBRARY));
  assert.throws(() => validateBiomeSet({ ...set, eventProps: ['tent'] }, LIBRARY), /eventProps: unknown piece "tent" \(the library's eventProps: featherFlag, popupTent, parkBench\)/);
  // X33: a white tent with an accent valance (SPEC §3)
  const white = { ...set, eventProps: [{ id: 'popupTent', slots: { roof: 'propSnow', valance: 'accent' } }] };
  assert.doesNotThrow(() => validateBiomeSet(white, LIBRARY));
  assert.deepEqual(pieceColours(white, LIBRARY)('eventProps', 'popupTent'), { leg: set.palette.propSnow, roof: set.palette.propSnow, valance: set.palette.accent });
  assert.deepEqual(pieceColours(set, LIBRARY)('eventProps', 'featherFlag').body, set.palette.accent);
  // the real sets may or may not have a list yet (the artist writes them, X51): none = undefined, else only library
  // pieces, read the same once resolved
  for (const id of ['meadow-day', 'alpine-day', 'island-day', 'mtn-default', 'proto-default']) {
    const list = BIOMES[id].eventProps;
    assert.deepEqual(resolveBiome(id).eventProps, list?.map(pickId), id);
    for (const p of list ?? []) assert.ok(LIBRARY.eventProps[pickId(p)], `${id}: ${pickId(p)}`);
  }
  assert.equal(BIOMES['proto-default'].eventProps, undefined); assert.equal(BIOMES['mtn-default'].eventProps, undefined);
  const h = { ...pl01, scenery: { ...pl01.scenery, eventProps: DEV_EVENT_PROPS['pl-01'] } };
  assert.throws(() => checkHoleLooks(h), /hole "pl-01": scenery\.eventProps\[0\] \(popupTent\): biome set "proto-default" does not offer it/);
  assert.doesNotThrow(() => checkHoleLooks({ ...h, biome: DEV_EVENT_PROPS_SET }));
  assert.doesNotThrow(() => validateHole(h, { shots: false }));
  for (const hole of Object.values(HOLES)) assert.equal(hole.scenery.eventProps, undefined, hole.id);
});

test('EVENT_PROP_SCALE: a tunable, default 1.3; the drawn props are scaled and dropped on the lowest ground', () => {
  assert.deepEqual(TUNABLES.EVENT_PROP_SCALE, { def: 1.3, min: 0.5, max: 2 });
  assert.deepEqual(parseTune('EVENT_PROP_SCALE:1').set, [{ name: 'EVENT_PROP_SCALE', value: 1, asked: 1 }]);
  assert.ok(Math.abs(eventFootprint({ id: 'popupTent' }) - eventPropShape('popupTent').radius * 1.3) < 1e-9);
  const [s] = scaleEventProps([{ id: 'popupTent', x: 100, z: -100, scale: 1.1 }], 1.3);
  assert.ok(Math.abs(s.scale - 1.43) < 1e-9);
  const slope = (x, z) => 0.1 * x + 0.05 * z, [p] = placeEventProps([s], slope);
  assert.ok(p.y < slope(100, -100));
  const r = eventPropShape('popupTent').radius * s.scale;
  for (let a = 0; a < 6.28; a += 0.3) assert.ok(p.y <= slope(100 + Math.cos(a) * r, -100 + Math.sin(a) * r) + 0.05);
});

test('scenery trees keep out of a footprint (+ 3 m) and its sight corridor to the tee', () => {
  assert.equal(eventPropsClear([], 3, { x: 0, z: 0 }), null);
  const [p] = scaleEventProps([{ id: 'popupTent', x: -64, z: 0 }], 1.3), r = eventPropShape('popupTent').radius * p.scale;
  const ok = eventPropsClear([p], 3, { x: 0, z: 0 });
  assert.equal(ok(-64 - r - 2.9, 0), false); assert.equal(ok(-64, r + 3.1), true);
  assert.equal(ok(-30, 0), false); assert.equal(ok(-30, r + 0.1), true);
});

test('the dev overlay: only with test-event-props, a dressed pl-01 tee, a course-side tent, two flags behind the green; every entry valid', () => {
  assert.deepEqual(holeEventProps(pl01, 'meadow-day'), []);
  assert.deepEqual(holeEventProps(pl01, DEV_EVENT_PROPS_SET), DEV_EVENT_PROPS['pl-01']);
  assert.deepEqual(holeEventProps(HOLES['mtn-07'], DEV_EVENT_PROPS_SET), []);
  for (const [id, list] of Object.entries(DEV_EVENT_PROPS)) {
    assert.equal(eventPropsFormatError(list), null, id);
    assert.equal(eventPropsError(readyHole(HOLES[id]), list), null, id);
    assert.equal(eventPropsSetError(list, BIOMES[DEV_EVENT_PROPS_SET]), null, id);
  }
  const list = DEV_EVENT_PROPS['pl-01'], zone = p => fromTee(pl01, p.x, p.z).dist <= EVENT_PROPS.teeZone;
  const tee = list.filter(zone);
  assert.equal(tee.filter(p => p.id === 'popupTent').length, 1); assert.ok(tee.filter(p => p.id === 'featherFlag').length >= 2); // SPEC §4: 1 tent + 2–4 flags
  assert.equal(list.filter(p => !zone(p) && p.id === 'popupTent').length, 1);
  assert.equal(list.filter(p => p.id === 'featherFlag' && p.z < -150 - 12).length, 2);                                       // behind the green
  // the dev set is meadow-day plus both pieces, nothing else changed
  const { id, name, description, eventProps, ...rest } = BIOMES[DEV_EVENT_PROPS_SET];
  const { id: _i, name: _n, description: _d, eventProps: _e, ...meadow } = BIOMES['meadow-day']; // meadow's own list (if any) is the artist's
  assert.deepEqual(rest, meadow); assert.deepEqual(eventProps, ['featherFlag', 'popupTent', 'parkBench']);
});
