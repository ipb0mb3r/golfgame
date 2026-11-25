// S24: the deep-rough surface (DESIGN §3 "Lie", §4 surface table, the hole data `deepRoughs`).
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { testHole, rollFrom, scriptedSwing } from './helpers.js';
import { createHolePlay } from '../src/core/play.js';
import { BASE_SURFACES, makeSurfaceTable } from '../src/core/surfaces.js';
import { CLUBS, lieFor } from '../src/core/clubs.js';
import { sweetHalfWidth } from '../src/core/swing.js';
import { TUNE, AUTO_CLUB_REACH, DEEP_ROUGH_DARKEN, GROUND_LOOK, SMALL_PROPS } from '../src/core/config.js';
import { applyTune, resetAllTunables } from '../src/core/tune.js';
import { validateHole, validateScenario } from '../src/core/validate.js';
import { KIND, KINDS, KIND_KEYS, kindOf } from '../src/core/ground.js';
import { paletteColour, fullPalette, validateBiomeSet, delta, checkReadability, READABILITY } from '../src/core/biome.js';
import { BIOMES } from '../src/biomes/index.js';
import { LIBRARY } from '../src/biomes/library.js';
import { HOLES, DEV_HOLES, getHole, checkHoleLooks, SETS } from '../src/holes/sets.js';
import { SCENARIOS, DEV_SCENARIOS, resolveScenario } from '../src/holes/scenarios.js';
import { makeMtnHole } from '../src/holes/mtn-course.js';
import { DEV_DEEP_ROUGH_ID } from '../src/holes/dev-deep-rough.js';

afterEach(() => resetAllTunables());
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const flatDist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// A flat hole: the ball sits on `lie` at the tee spot, `ahead` beyond 5 m, the cup far away (or `cupZ`)
function playOn(lie, clubId = '7i', { ahead = 'fairway', cupZ = -2000 } = {}) {
  const play = createHolePlay(testHole({ surfaceAt: (x, z) => (z > -5 ? lie : ahead), cup: { x: 0, z: cupZ } }), { seed: 1 });
  play.reset();
  if (clubId) play.setClub(play.bag.findIndex(c => c.id === clubId));
  play.setAim(0);
  return play;
}
// Hit and play the shot out: → { land (first touch), rest, landedOn }
function playOut(play, power, acc = 0) {
  play.hit(power, acc);
  let land = null, landedOn = null;
  for (let i = 0; i < 240 * 60; i++) {
    const ev = play.step();
    if (ev?.type === 'landed' && !land) { land = { ...play.ball.pos }; landedOn = ev.surface; }
    if (!play.ball.moving) break;
  }
  return { land, rest: { ...play.ball.pos }, landedOn };
}

test('S24: the values (owner picked option C), named "Deep rough"; no club override (the sand wedge too)', () => {
  const s = BASE_SURFACES.deepRough;
  assert.deepEqual({ ...s }, { name: 'Deep rough', rest: 0.08, keep: 0.12, decel: 9, maxPower: 0.3, sweetScale: 0.25, shape: 0.1 });
  for (const c of Object.values(CLUBS).filter(c => !c.putter)) assert.deepEqual(lieFor(c, 'deepRough', BASE_SURFACES), { maxPower: 0.3, sweetScale: 0.25 }, c.id);
  // harder than the rough on every count
  const r = BASE_SURFACES.rough;
  for (const k of ['rest', 'keep', 'maxPower', 'sweetScale', 'shape']) assert.ok(s[k] < r[k], k);
  assert.ok(s.decel > r.decel);
  // the lie line: "Deep rough · max 30% · harder timing" (hud.js lieText: the name, the cap below 1, the window below 1)
  const play = playOn('deepRough');
  assert.equal(play.lie, 'deepRough');
  assert.equal(play.surfaces[play.lie].name, 'Deep rough');
  assert.deepEqual(play.lieOf(), { maxPower: 0.3, sweetScale: 0.25 });
});

test('S24: tunable with ?tune=deepRough.<key> and per hole with surfaceOverrides (a tuned value wins)', () => {
  const t = applyTune('deepRough.maxPower:0.55,deepRough.sweetScale:0.4,deepRough.decel:12,deepRough.keep:0.1,deepRough.rest:0.05,deepRough.shape:0.2');
  assert.equal(t.rejected.length, 0, JSON.stringify(t.rejected));
  const play = playOn('deepRough');
  assert.deepEqual(play.lieOf(), { maxPower: 0.55, sweetScale: 0.4 });
  const d = play.surfaces.deepRough;
  assert.deepEqual([d.decel, d.keep, d.rest, d.shape], [12, 0.1, 0.05, 0.2]);
  resetAllTunables();
  const over = makeSurfaceTable({ surfaceOverrides: { deepRough: { maxPower: 0.65, decel: 8 } } });
  assert.equal(over.deepRough.maxPower, 0.65); assert.equal(over.deepRough.decel, 8); assert.equal(over.rough.maxPower, 0.85);
  applyTune('deepRough.maxPower:0.5');
  assert.equal(makeSurfaceTable({ surfaceOverrides: { deepRough: { maxPower: 0.65 } } }).deepRough.maxPower, 0.5);
});

test('S24: the meter turns around at 30% and the window is SWEET × 0.25', () => {
  const cap = playOn('deepRough').lieOf().maxPower;
  const g = scriptedSwing([cap + TUNE.POWER_GRACE / 2, 2 * cap], { cap });
  assert.equal(g.events[0].event, 'max');
  assert.ok(near(g.events[0].t, 0.3, 0.002));
  assert.equal(g.result.power, 0.3);
  // a full-power hit carries 60% of the club's distance
  const full = playOut(playOn('fairway'), 1).land, deep = playOut(playOn('deepRough'), 1).land;
  assert.ok(near(Math.abs(deep.z) / Math.abs(full.z), 0.3, 0.01), `deep ${deep.z.toFixed(1)} vs fairway ${full.z.toFixed(1)}`);
  // the accuracy window
  const play = playOn('deepRough');
  const h = sweetHalfWidth(play.lieOf().sweetScale);
  assert.ok(near(h, TUNE.SWEET * 0.25, 1e-12));
  assert.equal(play.hit(0.5, h * 0.98).err, 0, 'just inside: straight');
  assert.notEqual(playOn('deepRough').hit(0.5, -h * 1.02).err, 0, 'just outside: curves');
  assert.equal(playOn('fairway').hit(0.5, -TUNE.SWEET * 0.5).err, 0);
  assert.notEqual(playOn('deepRough').hit(0.5, -TUNE.SWEET * 0.5).err, 0, 'the same timing curves from the deep rough');
});

test('S24: a ball landing in deep rough stops much sooner than in the rough', () => {
  // the same shot from the fairway, landing in rough or deep rough
  const rough = playOut(playOn('fairway', '7i', { ahead: 'rough' }), 0.6), deep = playOut(playOn('fairway', '7i', { ahead: 'deepRough' }), 0.6);
  assert.equal(rough.landedOn, 'rough'); assert.equal(deep.landedOn, 'deepRough');
  assert.ok(near(rough.land.z, deep.land.z, 1e-6), 'same landing');
  const runR = flatDist(rough.land, rough.rest), runD = flatDist(deep.land, deep.rest);
  assert.ok(runD < runR * 0.6, `run-out: deep ${runD.toFixed(2)} m vs rough ${runR.toFixed(2)} m`);
  // and a ground roll at the same speed
  const roll = s => -rollFrom(testHole({ surfaceAt: () => s }), 0, 0, 0, -6).pos.z;
  assert.ok(roll('deepRough') < roll('rough') * 0.7, `roll: deep ${roll('deepRough').toFixed(2)} vs rough ${roll('rough').toFixed(2)}`);
});

test('S24: the auto-club (rule 3) and the S22 marker use the 30% cap', () => {
  // the shortest club whose capped carry reaches AUTO_CLUB_REACH × dist (flat ground: carry × cap)
  const expect = (cap, dist) => ['sw', 'pw', '9i', '7i', '5i', '3w'].find(id => CLUBS[id].carry * cap >= dist * AUTO_CLUB_REACH) ?? '3w';
  for (const dist of [20, 30, 40, 50]) {
    const pick = id => playOn(id, null, { cupZ: -dist }).club.id;
    assert.equal(pick('deepRough'), expect(0.3, dist), `${dist} m from the deep rough`);
    assert.equal(pick('rough'), expect(0.85, dist), `${dist} m from the rough`);
  }
  assert.equal(playOn('deepRough', null, { cupZ: -45 }).club.id, '7i', 'a Sand Wedge from the rough, a 7 Iron from the deep rough');
  assert.equal(playOn('deepRough', null, { cupZ: -300 }).club.id, '3w', 'nothing reaches: the longest club, never the Driver');
  const reach = playOn('deepRough', '7i').clubReach();
  assert.ok(near(reach, 0.3 * CLUBS['7i'].carry, 0.6), `the club reach shown is the capped one (${reach.toFixed(1)})`);
  // the marker: capped, at 30% power, where that lands; the 25% tick only (50% and up are above the cap)
  const full = playOn('fairway').aimMarks(), m = playOn('deepRough').aimMarks();
  assert.equal(m.capped, true); assert.equal(m.power, 0.3);
  assert.ok(near(m.dist / full.dist, 0.3, 0.01), `marker ${m.dist.toFixed(1)} vs ${full.dist.toFixed(1)}`);
  assert.deepEqual(m.ticks.map(t => t.frac), [0.25]);
  // BC4: an off-centre impact is shaped × 0.1 (less than the rough's 0.5) and the preview still shows it
  const p = playOn('deepRough'); p.setImpact({ x: -1, y: 0 });
  const shaped = p.aimMarks();
  assert.ok(shaped.shape && shaped.shape.path.length > 0);
  const r = playOn('rough'); r.setImpact({ x: -1, y: 0 });
  const bulge = mk => Math.max(...mk.shape.path.map(q => Math.abs(q.x)));
  assert.ok(bulge(shaped) < bulge(r.aimMarks()), 'curves less than from the rough');
  // ⚑: the power that finishes at a 35 m target from the deep rough (above the rough's, below the cap)
  const fl = playOn('deepRough', '7i', { cupZ: -35 }), pp = fl.pinPower();
  assert.ok(pp < 0.3, `⚑ ${pp.toFixed(3)}`);
  const rp = fl.restPoint(fl.clubIdx, fl.aim, pp);
  assert.ok(near(flatDist(rp, fl.ball.pos), 35, 1), `finishes at ${flatDist(rp, fl.ball.pos).toFixed(2)} m`);
  const far = playOn('deepRough', '7i', { cupZ: -120 });
  assert.ok(far.pinPower() > 0.3, 'out of reach: the ⚑ is in the grayed-out part');
});

test('S24: the hole data format (deepRoughs: blobs and strips), painted over fairway and rough only; bad entries throw', () => {
  const spec = {
    id: 'x-dr', number: 1, name: 'x', par: 4, difficulty: 1, tee: { x: 0, z: 0 }, cup: { x: 0, z: -200 },
    green: { cx: 0, cz: -200, rx: 12, rz: 10, raise: 0.2, contour: () => 0 },
    fairways: [{ pts: [{ x: 0, z: -20, w: 12 }, { x: 0, z: -190, w: 12 }] }],
    bunkers: [{ cx: 8, cz: -100, rx: 4, rz: 4 }],
    ob: { x0: -60, x1: 60, z0: -240, z1: 15 },
    deepRoughs: [{ pts: [{ x: 10, z: -60 }, { x: 10, z: -140 }], w: 5 }, { cx: -14, cz: -200, rx: 6, rz: 8 }, { pts: [{ x: -30, z: -50 }, { x: -30, z: -60 }] }],
  };
  const h = makeMtnHole(spec);
  assert.equal(h.surfaceAt(10, -80), 'deepRough', 'the strip, over the fairway');
  assert.equal(h.surfaceAt(14.5, -80), 'deepRough', 'the strip, over the rough');
  assert.equal(h.surfaceAt(15.5, -80), 'rough', 'beyond w');
  assert.equal(h.surfaceAt(8, -100), 'sand', 'never over a bunker');
  assert.equal(h.surfaceAt(0, -80), 'fairway');
  assert.equal(h.surfaceAt(-14, -200), 'fringe', 'the blob never covers the fringe or the green');
  assert.equal(h.surfaceAt(-18.5, -200), 'deepRough', 'the blob');
  assert.equal(h.surfaceAt(-30, -55), 'deepRough', 'a strip with the default half-width');
  assert.equal(h.surfaceAt(-30 + 3.9, -55), 'deepRough'); assert.equal(h.surfaceAt(-30 + 4.1, -55), 'rough');
  assert.deepEqual(h.features.deepRoughs, spec.deepRoughs);
  assert.doesNotThrow(() => validateHole(h, { shots: false }));
  for (const bad of [{}, { pts: [{ x: 0, z: 0 }] }, { pts: [{ x: 0, z: 0 }, { x: 1, z: 1 }], w: -1 }, { cx: 0, cz: 0, rx: 0, rz: 3 }]) {
    assert.throws(() => makeMtnHole({ ...spec, deepRoughs: [bad] }).surfaceAt(0, 0), /hole "x-dr": deepRoughs\[0\] must be a blob/);
  }
  // the first real use is Buttercup Meadows (mdw-02, owner 2026-11-24); no other course uses it yet
  for (const hole of Object.values(HOLES)) if (!hole.id.startsWith('mdw-')) assert.ok(!(hole.features.deepRoughs ?? []).length, hole.id);
});

test('S24: validateHole accepts deep rough, its surfaceOverrides and a scenario on it; the dev practice spot', () => {
  const dev = DEV_HOLES[DEV_DEEP_ROUGH_ID];
  assert.ok(dev && !Object.hasOwn(HOLES, DEV_DEEP_ROUGH_ID), 'a dev hole, not in HOLES');
  for (const s of SETS) assert.ok(!s.holes.includes(DEV_DEEP_ROUGH_ID), `not in set ${s.id}`);
  assert.equal(getHole('dev-deep-rough'), dev, '?hole=dev-deep-rough plays it');
  assert.doesNotThrow(() => validateHole(dev));
  assert.doesNotThrow(() => checkHoleLooks(dev));
  assert.doesNotThrow(() => validateHole({ ...dev, map: dev.map, heightAt: dev.heightAt, surfaceAt: dev.surfaceAt, features: dev.features, obstacles: dev.obstacles, scenery: dev.scenery, surfaceOverrides: { deepRough: { maxPower: 0.55, sweetScale: 0.4, decel: 10 } } }, { shots: false }));
  // the three spots: same distance from the cup, on their lies, only by ?scenario= (no menu lists them)
  const all = { ...HOLES, ...DEV_HOLES };
  const d = [];
  for (const [id, sc] of Object.entries(DEV_SCENARIOS)) {
    assert.ok(!Object.hasOwn(SCENARIOS, id));
    assert.doesNotThrow(() => validateScenario(id, sc, all));
    assert.equal(resolveScenario(id).scenario.hole, DEV_DEEP_ROUGH_ID);
    d.push(flatDist(sc.ball, dev.cup));
  }
  assert.deepEqual(Object.values(DEV_SCENARIOS).map(s => s.lie), ['fairway', 'rough', 'deepRough']);
  assert.ok(Math.max(...d) - Math.min(...d) < 2, d.join(', '));
  // trees may stand in the deep rough
  assert.ok(dev.obstacles.some(o => o.type === 'tree' && dev.surfaceAt(o.x, o.z) === 'deepRough'));
});

test('S24: the look: its own drawn kind (added last), the optional roughDeep colour (fallback: the rough, darker), a denser texture', () => {
  assert.equal(KINDS[KINDS.length - 1], 'deepRough', 'the older kinds keep their index');
  assert.equal(kindOf('deepRough'), KIND.deepRough);
  assert.equal(KIND_KEYS.deepRough, 'roughDeep');
  assert.equal(KIND_KEYS.ob, 'deepRough', 'the ground beyond OB keeps its key');
  const g = GROUND_LOOK.kinds.deepRough, r = GROUND_LOOK.kinds.rough;
  assert.ok(g.speck > r.speck && g.dab > r.dab && g.patch[1] < r.patch[1], 'denser specks and dabs, tighter patches');
  assert.ok(g.speck <= 0.1 && g.dab <= 0.1, 'within the shader mask (MASK_AMOUNT)');
  // a set that lists roughDeep uses it as listed; one that doesn't gets the rough, darker (which sets list it is the artist's choice)
  const dark = c => '#' + [1, 3, 5].map(i => Math.round(parseInt(c.slice(i, i + 2), 16) * (1 - DEEP_ROUGH_DARKEN)).toString(16).padStart(2, '0')).join('');
  let withKey = 0, withoutKey = 0;
  for (const [id, set] of Object.entries(BIOMES)) {
    const listed = Object.hasOwn(set.palette, 'roughDeep');
    if (listed) { withKey++; assert.equal(paletteColour(set.palette, 'roughDeep'), set.palette.roughDeep, id); }
    else { withoutKey++; assert.equal(paletteColour(set.palette, 'roughDeep'), dark(set.palette.rough), id); }
    const want = listed ? set.palette.roughDeep : dark(set.palette.rough);
    assert.equal(fullPalette(set.palette).roughDeep, want, id);
    assert.equal(fullPalette(set.palette).rough, set.palette.rough, id);
    // the readability rules pass on the colour in use in every set (validateBiomeSet runs them; no waiver)
    for (const row of checkReadability(set.palette).filter(x => x.id.startsWith('roughDeep/'))) assert.ok(row.ok, `${id} ${row.id} ΔE ${row.dE.toFixed(1)} ΔL ${row.dL.toFixed(1)}`);
    assert.ok(!Object.keys(set.readabilityWaivers ?? {}).some(k => k.startsWith('roughDeep')), id);
  }
  assert.ok(withKey + withoutKey === Object.keys(BIOMES).length);
  // the fallback is always checked, on a copy of every set with the key removed (whatever the real sets list)
  for (const [id, set] of Object.entries(BIOMES)) {
    const { roughDeep: _drop, ...palette } = set.palette;
    assert.ok(!Object.hasOwn(palette, 'roughDeep'), id);
    assert.equal(paletteColour(palette, 'roughDeep'), dark(palette.rough), id);
    assert.equal(fullPalette(palette).roughDeep, dark(palette.rough), id);
    for (const row of checkReadability(palette).filter(x => x.id.startsWith('roughDeep/'))) assert.ok(row.ok, `${id} (key removed) ${row.id}`);
    assert.doesNotThrow(() => validateBiomeSet({ ...set, palette }, LIBRARY), id);
  }
  assert.deepEqual(READABILITY.filter(x => x[0].startsWith('roughDeep')).map(x => x.slice(1)), [['roughDeep', 'rough', 15, 8], ['roughDeep', 'fairway', 15, 8], ['roughDeep', 'deepRough', 10, 5]]);
  // a set may set its own colour: used as it is, must be a colour, and must pass the rules
  const base = BIOMES['meadow-day'];
  // its own colour: halfway between the rough and the OB ground (what the real sets aim for), computed, not listed;
  // not the fallback (rough darkened), which may sit too close to a deeper OB ground
  const mid = '#' + [1, 3, 5].map(i => Math.round((parseInt(base.palette.rough.slice(i, i + 2), 16) + parseInt(base.palette.deepRough.slice(i, i + 2), 16)) / 2).toString(16).padStart(2, '0')).join('');
  const own = { ...base, palette: { ...base.palette, roughDeep: mid } };
  assert.doesNotThrow(() => validateBiomeSet(own, LIBRARY));
  assert.equal(paletteColour(own.palette, 'roughDeep'), own.palette.roughDeep);
  assert.throws(() => validateBiomeSet({ ...base, palette: { ...base.palette, roughDeep: 'dark' } }, LIBRARY), /palette\.roughDeep must be a colour/);
  assert.throws(() => validateBiomeSet({ ...base, palette: { ...base.palette, roughDeep: base.palette.rough } }, LIBRARY), /roughDeep\/rough ΔE 0/);
  assert.ok(delta(paletteColour(base.palette, 'roughDeep'), base.palette.rough).dL >= 8);
  // small props may stand on it (a set opts in with `on`)
  assert.ok(SMALL_PROPS.surfaces.includes('deepRough') && SMALL_PROPS.shore.land.includes('deepRough'));
});
