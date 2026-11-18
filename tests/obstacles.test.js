// Phase K (K7): trees, boulders and rock. Trunk and boulder bounces, the leaves (slow + seeded
// deflection), a ball rolling into a trunk, the aim warning (K4), the rock lie (K1), skip = watch with
// obstacles, hole data checks, and hole 3's design promises (K6).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHolePlay } from '../src/core/play.js';
import { makeColliders, firstHit } from '../src/core/obstacles.js';
import { validateHole } from '../src/core/validate.js';
import { getHole, HOLES, SETS } from '../src/holes/sets.js';
import { SCENARIOS } from '../src/holes/scenarios.js';
import { BASE_SURFACES } from '../src/core/surfaces.js';
import { BALL_R, TUNE, BOULDER_SINK, setTunable, resetTunables } from '../src/core/config.js';
import { applyTune, resetAllTunables } from '../src/core/tune.js';
import { aimAt } from '../src/core/vec.js';
import { testHole, rollFrom } from './helpers.js';

const TREE = { type: 'tree', x: 0, z: -20, trunkR: 0.4, trunkH: 6, canopyR: 3, canopyH: 6 }; // leaves 3–9 m
const fairway = () => 'fairway';
const treeHole = (obstacles = [TREE], extra = {}) => testHole({ surfaceAt: fairway, obstacles, ...extra });

// Launch the ball from (x, y above ground, z) with a velocity and run it, collecting every event
function fly(hole, { x = 0, y = 0, z = 0, vel, seed = 1, maxSteps = 240 * 60 }) {
  const play = createHolePlay(hole, { seed });
  const b = play.ball;
  b.pos.x = x; b.pos.z = z; b.pos.y = play.terrain.heightAt(x, z) + y;
  b.launch({ kind: 'full', vel, curve: { x: 0, y: 0, z: 0 }, spinFactor: 1 });
  const events = [], log = [];
  for (let i = 0; i < maxSteps && b.moving; i++) {
    const before = { ...b.vel };
    const ev = play.step();
    if (ev) { events.push(ev); log.push({ ev, before, after: { ...b.vel }, pos: { ...b.pos } }); }
  }
  return { play, events, log, types: events.map(e => e.type) };
}
const speed = v => Math.hypot(v.x, v.y, v.z);

test('K2: colliders come from the hole data (trunk, canopy on top of the trunk, sunk boulder)', () => {
  const hole = treeHole([TREE, { type: 'boulder', x: 5, z: -5, r: 2 }], { heightAt: () => 1 });
  const [t, b] = makeColliders(hole, hole.heightAt);
  assert.deepEqual([t.type, t.y0, t.top, t.r], ['tree', 1, 7, 0.4]);
  assert.deepEqual(t.canopy, { x: 0, y: 7, z: -20, rx: 3, ry: 3 });
  assert.equal(b.type, 'boulder');
  assert.ok(Math.abs(b.y - (1 + 2 * (1 - BOULDER_SINK))) < 1e-12);
  // K8: holes 1 and 2 now have their in-bounds trees as obstacles (none of them boulders)
  assert.equal(createHolePlay(getHole('pl-01')).obstacles.length, 25);
  assert.equal(createHolePlay(getHole('pl-02')).obstacles.length, 79);
});

test('K2: a ball flying into a trunk bounces back off it (OBSTACLE_REST, OBSTACLE_KEEP)', () => {
  const r = fly(treeHole(), { y: 1.5, vel: { x: 0, y: 4, z: -20 } });
  const hit = r.log.find(l => l.ev.type === 'hitObstacle');
  assert.ok(hit, `events: ${r.types}`);
  assert.equal(hit.ev.kind, 'trunk');
  assert.equal(hit.ev.index, 0);
  // head-on: the speed into the trunk comes back × OBSTACLE_REST, the vertical speed is kept × OBSTACLE_KEEP
  // (`before` is the speed before the step, so gravity takes off up to G × PHYSICS_DT ≈ 0.04 m/s)
  assert.ok(Math.abs(hit.after.z - -hit.before.z * TUNE.OBSTACLE_REST) < 1e-9, `${hit.before.z} → ${hit.after.z}`);
  assert.ok(Math.abs(hit.after.y - hit.before.y * TUNE.OBSTACLE_KEEP) < 0.05, `${hit.before.y} → ${hit.after.y}`);
  assert.ok(hit.pos.z > TREE.z + TREE.trunkR, 'the ball is on the near side of the trunk');
  assert.ok(r.play.ball.pos.z > TREE.z, 'and ends up on the near side');
  assert.equal(r.types.at(-1), 'stopped');
});

test('K2: a glancing hit sends the ball off to the side, and a fast ball never passes through a trunk', () => {
  const side = fly(treeHole(), { x: 0.3, y: 1.5, vel: { x: 0, y: 4, z: -20 } });
  assert.ok(side.types.includes('hitObstacle'));
  assert.ok(side.play.ball.pos.x > 0.3, 'kicked to the right (it hit the right side of the trunk)');
  // 70 m/s = 0.29 m per step: a step-by-step check could skip a 0.4 m trunk, the swept check can't.
  // (Near the edge it's a glancing hit: the ball is turned aside and carries on past.)
  for (const x of [-0.45, -0.2, 0, 0.2, 0.45]) {
    const fast = fly(treeHole(), { x, y: 1, vel: { x: 0, y: 1, z: -70 } });
    assert.ok(fast.types.includes('hitObstacle'), `x ${x}: ${fast.types}`);
    if (Math.abs(x) <= 0.2) assert.ok(fast.play.ball.pos.z > TREE.z, `x ${x}: stayed on the near side`);
  }
});

test('K2: boulders bounce the ball away from their centre, in the air and when rolling', () => {
  const boulder = { type: 'boulder', x: 0, z: -10, r: 1.5 };
  const hole = treeHole([boulder]);
  // dropped onto its front slope: kicked back toward the tee
  const drop = fly(hole, { z: -9, y: 6, vel: { x: 0, y: 0, z: 0 } });
  const hit = drop.log.find(l => l.ev.type === 'hitObstacle');
  assert.equal(hit?.ev.kind, 'boulder');
  assert.ok(hit.after.z > 0, 'kicked back');
  assert.ok(drop.play.ball.pos.z > -9, 'lands in front of the boulder');
  // rolled into it: back the way it came
  const roll = rollFrom(hole, 0, 0, 0, -10);
  assert.ok(roll.events.some(e => e.type === 'hitObstacle' && e.kind === 'boulder'));
  assert.ok(roll.pos.z > boulder.z + boulder.r, `rests in front (${roll.pos.z.toFixed(2)})`);
  assert.equal(roll.ev.type, 'stopped');
});

test('K2: a ball dropped dead on top of a boulder rolls off it and comes to rest (never balances there)', () => {
  const hole = treeHole([{ type: 'boulder', x: 0, z: -10, r: 1.5 }]);
  const r = fly(hole, { z: -10, y: 5, vel: { x: 0, y: 0, z: 0 } });
  assert.equal(r.types.at(-1), 'stopped', `events: ${r.types.slice(-5)}`);
  assert.ok(Math.hypot(r.play.ball.pos.x, r.play.ball.pos.z + 10) > 1.5, 'off the boulder');
  assert.ok(r.types.filter(t => t === 'hitObstacle').length < 40, 'a handful of bounces, not a jitter');
});

test('K2: a ball rolling into a trunk bounces off and rests in front of it', () => {
  const r = rollFrom(treeHole(), 0, 0, 0, -12);
  const hits = r.events.filter(e => e.type === 'hitObstacle');
  assert.equal(hits.length, 1, 'one hit event (slow touches after it send none)');
  assert.equal(hits[0].kind, 'trunk');
  assert.ok(r.pos.z > TREE.z + TREE.trunkR, `rests in front (${r.pos.z.toFixed(2)})`);
  assert.equal(r.ev.type, 'stopped');
  assert.ok(r.events.every(e => e.type !== 'hitLeaves'), 'a rolling ball never touches the leaves');
});

test('K3: the leaves keep CANOPY_SLOW of the speed and turn the ball by at most CANOPY_DEFLECT, once per tree', () => {
  const r = fly(treeHole(), { y: 6, z: 0, vel: { x: 0, y: 2, z: -30 } });
  const leaves = r.log.filter(l => l.ev.type === 'hitLeaves');
  assert.equal(leaves.length, 1, `once per tree per shot (${r.types})`);
  const { before, after } = leaves[0];
  assert.ok(Math.abs(speed(after) / speed(before) - TUNE.CANOPY_SLOW) < 0.002, 'keeps CANOPY_SLOW of its speed');
  const turn = Math.abs(Math.atan2(after.x, -after.z) - Math.atan2(before.x, -before.z)) * 180 / Math.PI;
  assert.ok(turn <= TUNE.CANOPY_DEFLECT + 1e-9, `turned ${turn.toFixed(2)}°`);
  assert.ok(r.play.ball.pos.z > TREE.z - TREE.canopyR - 6, 'drops near the tree instead of flying on');
});

test('K3: same seed = same deflection (replays match); other seeds turn it differently', () => {
  const end = seed => { const r = fly(treeHole(), { y: 6, vel: { x: 0, y: 2, z: -30 }, seed }); return { ...r.play.ball.pos }; };
  assert.deepEqual(end(7), end(7));
  const ends = new Set([1, 2, 3, 4, 5, 6].map(s => end(s).x.toFixed(3)));
  assert.ok(ends.size >= 5, `different seeds, different ends (${[...ends]})`);
});

test('K3: a shot high enough flies over the leaves; CANOPY_SLOW and CANOPY_DEFLECT are tunables', () => {
  const over = fly(treeHole(), { y: 10, vel: { x: 0, y: 3, z: -30 } });
  assert.ok(!over.types.includes('hitLeaves') && !over.types.includes('hitObstacle'), `${over.types}`);
  try {
    applyTune('CANOPY_SLOW:0.5,CANOPY_DEFLECT:0');
    const r = fly(treeHole(), { y: 6, vel: { x: 0, y: 2, z: -30 } });
    const { before, after } = r.log.find(l => l.ev.type === 'hitLeaves');
    assert.ok(Math.abs(speed(after) / speed(before) - 0.5) < 0.002);
    assert.ok(Math.abs(after.x) < 1e-12, 'no turn');
  } finally { resetAllTunables(); }
});

test('K4: the aim warning shows where a shot hits a tree, and goes away when the line is clear', () => {
  const hole = treeHole([{ ...TREE, z: -25 }], { cup: { x: 0, z: -150 } });
  const play = createHolePlay(hole, { seed: 1 });
  play.reset();
  play.setClub(play.bag.findIndex(c => c.id === '5i'));
  play.setAim(0);
  const w = play.aimWarning();
  assert.ok(w, 'straight at the tree: warning');
  assert.ok(['leaves', 'trunk'].includes(w.kind));
  assert.equal(w.index, 0);
  assert.ok(Math.abs(w.dist - 25) < 4, `about 25 m out (${w.dist.toFixed(1)})`);
  play.setAim(0.3);
  assert.equal(play.aimWarning(), null, 'aimed well to the side: no warning');
  // a high club clears it: 25 m out the 5 iron is 8 m up (in the leaves), the wedge 15 m (over them)
  play.setAim(0);
  play.setClub(play.bag.findIndex(c => c.id === 'pw'));
  assert.equal(play.aimWarning(), null, 'the wedge flies over it');
  play.setClub(play.PUTTER);
  assert.equal(play.aimWarning(), null, 'putts never warn');
  assert.equal(createHolePlay(testHole()).aimWarning(), null, 'no obstacles, no warning');
});

test('K4: the warning matches what the ball really does (same flight, same colliders)', () => {
  const hole = treeHole([{ ...TREE, z: -25 }], { cup: { x: 0, z: -150 } });
  for (const [club, aim] of [['5i', 0], ['5i', 0.08], ['7i', -0.05], ['pw', 0], ['3w', 0.1], ['5i', 0.3], ['driver', 0]]) {
    const play = createHolePlay(hole, { seed: 1 });
    play.reset();
    play.setClub(play.bag.findIndex(c => c.id === club)); play.setAim(aim);
    const w = play.aimWarning();
    play.hit(play.lieOf().maxPower, 0);
    const hit = play.skip().find(e => e.type === 'hitLeaves' || e.type === 'hitObstacle');
    assert.equal(!!hit, !!w, `${club} aim ${aim}: warning ${w?.kind ?? 'none'}, ball ${hit?.type ?? 'clear'}`);
  }
});

test('K4: the ⚑ and the auto-pick ignore obstacles (the warning is the information)', () => {
  const h3 = getHole('pl-03'), bare = { ...h3, obstacles: [] };
  for (const id of ['h3-behind-tree', 'h3-cut-corner', 'h3-rock']) {
    const sc = SCENARIOS[id];
    const a = createHolePlay(h3, { seed: 1 }), b = createHolePlay(bare, { seed: 1 });
    a.reset(sc); b.reset(sc);
    assert.equal(a.clubIdx, b.clubIdx, `${id}: same club`);
    assert.equal(a.pinPower(), b.pinPower(), `${id}: same ⚑`);
  }
});

test('K1: rock is a thin lie (cap 90%, window ×0.8) and is named on the lie line', () => {
  assert.equal(BASE_SURFACES.rock.name, 'Rock');
  const play = createHolePlay(getHole('pl-03'), { seed: 1 });
  play.reset(SCENARIOS['h3-rock']);
  assert.equal(play.lie, 'rock');
  assert.deepEqual(play.lieOf(), { maxPower: 0.9, sweetScale: 0.8 });
  // tunable like every surface (S17)
  try {
    const t = applyTune('rock.rest:0.4,rock.keep:0.6,rock.decel:3,rock.maxPower:0.8,rock.sweetScale:0.7');
    assert.equal(t.rejected.length, 0);
    const tuned = createHolePlay(getHole('pl-03'), { seed: 1 });
    tuned.reset(SCENARIOS['h3-rock']);
    assert.deepEqual([tuned.surfaces.rock.rest, tuned.surfaces.rock.keep, tuned.surfaces.rock.decel], [0.4, 0.6, 3]);
    assert.deepEqual(tuned.lieOf(), { maxPower: 0.8, sweetScale: 0.7 });
  } finally { resetAllTunables(); }
});

test('K1: rock bounces higher and rolls further than fairway', () => {
  const ground = s => testHole({ surfaceAt: () => s });
  const bounce = s => {
    const r = fly(ground(s), { y: 10, vel: { x: 0, y: 0, z: -15 } });
    return r.log.find(l => l.ev.type === 'landed').after.y;
  };
  assert.ok(bounce('rock') > bounce('fairway') * 1.5, `rock ${bounce('rock').toFixed(2)} vs fairway ${bounce('fairway').toFixed(2)} m/s up`);
  const roll = s => -rollFrom(ground(s), 0, 0, 0, -6).pos.z;
  assert.ok(roll('rock') > roll('fairway') * 1.2, `rock ${roll('rock').toFixed(1)} m vs fairway ${roll('fairway').toFixed(1)} m`);
});

test('K7: skip = watch with obstacles (leaves, trunk, boulder, at 30/60/144 fps)', () => {
  const run = (setup, mode, frame) => {
    const play = createHolePlay(getHole('pl-03'), { seed: 9 });
    play.reset({ wind: { x: 0, z: 0 } });
    setup(play);
    const events = [];
    let t = 0;
    while (play.ball.moving) {
      if (mode === 'skip' && t >= 1) { events.push(...play.skip()); break; }
      events.push(...play.advance(frame)); t += frame;
    }
    return { pos: { ...play.ball.pos }, next: play.next, strokes: play.strokes, events: events.map(e => e.type + (e.kind ? `:${e.kind}` : '')) };
  };
  const shots = {
    'cut too weak (leaves)': p => { p.setAim(aimAt(p.ball.pos, { x: 65, z: -207 })); p.setClub(0); p.hit(0.85, 0); },
    'cut, sliced (leaves)': p => { p.setAim(aimAt(p.ball.pos, { x: 65, z: -207 })); p.setClub(0); p.hit(1, -0.15); },
    'into the lone tree': p => { p.ball.pos.x = -26; p.ball.pos.z = -203; p.prepare(); p.hit(1, 0); },
    'putt into the boulder': p => { p.ball.pos.x = -2; p.ball.pos.z = -260; p.prepare(); p.setAim(aimAt(p.ball.pos, { x: 1, z: -265 })); p.setClub(p.PUTTER); p.hit(0.6, 0); },
  };
  for (const [name, setup] of Object.entries(shots)) {
    const watched = run(setup, 'watch', 1 / 60);
    assert.ok(watched.events.some(e => /hitLeaves|hitObstacle/.test(e)), `${name}: ${watched.events}`);
    for (const frame of [1 / 30, 1 / 60, 1 / 144]) assert.deepEqual(run(setup, 'skip', frame), watched, `${name} at ${Math.round(1 / frame)} fps`);
  }
});

test('K2: hole data checks name the obstacle and the field', () => {
  const ok = treeHole();
  const surf = (x, z) => (Math.abs(x) > 40 ? 'ob' : Math.hypot(x, z) < 3 ? 'tee' : z < -30 && Math.abs(x) < 8 ? 'green' : z < -30 && Math.abs(x) < 10 ? 'fringe' : Math.abs(x) > 10 ? 'rough' : 'fairway');
  const base = { ...ok, number: 1, obstacles: [{ ...TREE, x: 20 }], tee: { x: 0, z: 0 }, cup: { x: 0, z: -40 }, surfaceAt: surf, features: { green: { cx: 0, cz: -40 } }, aimTarget: { x: 0, z: -20 } };
  assert.doesNotThrow(() => validateHole(base));
  const bad = (obstacles, re) => assert.throws(() => validateHole({ ...base, obstacles }), re);
  bad({}, /obstacles must be a list/);
  bad([{ type: 'bush', x: 20, z: -20 }], /obstacles\[0\]\.type/);
  bad([{ ...TREE, x: 20, canopyR: 0 }], /obstacles\[0\]\.canopyR/);
  bad([{ type: 'boulder', x: 20, z: -20 }], /obstacles\[0\]\.r/);
  bad([{ type: 'boulder', x: 20, z: -20, r: 1, sink: 1 }], /sink/);
  bad([{ ...TREE, x: 45 }], /out of bounds/);
  bad([{ ...TREE, z: 0 }], /stands on the tee/);
  bad([{ ...TREE, z: -40 }], /stands on the green/);
  // K8 fairness guards
  bad([{ ...TREE, x: 9, z: -40 }], /stands on the fringe/);
  bad([{ ...TREE, x: 5 }], /stands on the fairway \(set onFairway/);
  // S21: a tree in the default tee line is allowed now (the K4 warning shows it, the player adjusts);
  // only a default tee shot that ends in a penalty is refused (tests/default-aim.test.js)
  assert.doesNotThrow(() => validateHole({ ...base, obstacles: [{ ...TREE, x: 0, z: -10, onFairway: true }] }));
  assert.doesNotThrow(() => validateHole({ ...base, obstacles: [{ ...TREE, x: 7, z: -10, trunkH: 1, canopyH: 1, canopyR: 0.5, onFairway: true }] }), 'a fairway tree out of the line is fine when meant');
});

test('K2: firstHit is the earliest contact along the step', () => {
  const cols = makeColliders(treeHole([{ ...TREE, z: -10 }, { ...TREE, z: -20 }]), () => 0);
  const h = firstHit(cols, { x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: -30 }, { leaves: false });
  assert.equal(h.o.i, 0);
  assert.ok(Math.abs(h.z - (-10 + TREE.trunkR + BALL_R)) < 1e-9);
  assert.equal(firstHit(cols, { x: 5, y: 1, z: 0 }, { x: 5, y: 1, z: -30 }), null, 'passes beside');
});

// ---- Hole 3 (K6): the owner's design promises ----
const h3 = () => { const p = createHolePlay(getHole('pl-03'), { seed: 1 }); p.reset({ wind: { x: 0, z: 0 } }); return p; };
const driveAt = (pt, power, acc = 0) => {
  const p = h3(); p.setAim(aimAt(p.ball.pos, pt)); p.setClub(0);
  const w = p.aimWarning(); p.hit(power, acc);
  const events = p.skip().map(e => e.type);
  return { w, events, lie: p.surfaces[getHole('pl-03').surfaceAt(p.ball.pos.x, p.ball.pos.z)].id, pos: p.ball.pos };
};

test('K6: hole 3 is a par 4 dogleg of 340–380 m with trees, boulders and rock, in the practice set', () => {
  const hole = getHole('pl-03');
  assert.equal(hole.par, 4);
  const corner = hole.features.corner;
  const len = Math.hypot(corner.x - hole.tee.x, corner.z - hole.tee.z) + Math.hypot(hole.cup.x - corner.x, hole.cup.z - corner.z);
  assert.ok(len >= 340 && len <= 380, `${len.toFixed(0)} m along the playing line`);
  assert.ok(hole.obstacles.filter(o => o.type === 'tree').length > 10);
  assert.ok(hole.obstacles.some(o => o.type === 'boulder'));
  assert.equal(hole.surfaceAt(hole.features.outcrop.cx, hole.features.outcrop.cz), 'rock');
  assert.ok(SETS.find(s => s.id === 'practice').holes.includes('pl-03'));
  assert.ok(HOLES['pl-03']);
});

test('K6: the default tee shot (default aim and club) has no aim warning and finds the fairway', () => {
  const p = h3();
  assert.equal(p.club.id, 'driver');
  assert.equal(p.aimWarning(), null);
  p.hit(p.pinPower(), 0);
  p.skip();
  assert.equal(getHole('pl-03').surfaceAt(p.ball.pos.x, p.ball.pos.z), 'fairway');
});

test('K6: the lone tree stands in the landing area and blocks the line from behind it', () => {
  const p = createHolePlay(getHole('pl-03'), { seed: 1 });
  p.reset(SCENARIOS['h3-behind-tree']);
  const w = p.aimWarning();
  assert.equal(w?.index, 0, 'the lone tree (obstacle 0) is in the way');
  const lone = getHole('pl-03').obstacles[0];
  assert.equal(getHole('pl-03').surfaceAt(lone.x, lone.z), 'fairway', 'in the middle of the fairway');
});

test('K6: cutting the corner: a full, straight Driver clears the trees; weak or mishit ones are caught', () => {
  const line = { x: 65, z: -207 };
  const full = driveAt(line, 1);
  assert.equal(full.w, null, 'no warning on the full shot');
  assert.ok(!full.events.includes('hitLeaves'), `${full.events}`);
  assert.equal(full.lie, 'fairway', 'lands in the second leg');
  assert.ok(Math.hypot(full.pos.x - 150, full.pos.z + 241) < 100, 'leaves a short approach');
  for (const [power, acc] of [[0.85, 0], [1, 0.15], [1, -0.15]]) {
    const r = driveAt(line, power, acc);
    assert.ok(r.events.includes('hitLeaves'), `power ${power} acc ${acc}: caught by the leaves (${r.events})`);
  }
  // a lower-flying club on the same line shows the warning before the swing
  const p = h3(); p.setAim(aimAt(p.ball.pos, line)); p.setClub(p.bag.findIndex(c => c.id === '5i'));
  assert.equal(p.aimWarning()?.kind, 'leaves');
});

test('K6: the safe route: second shots from the landing area left of the corner have a clear line', () => {
  for (const [x, z] of [[0, -230], [10, -225], [-15, -235], [-20, -180], [15, -180]]) {
    const p = createHolePlay(getHole('pl-03'), { seed: 1 });
    p.reset({ ball: { x, z }, wind: { x: 0, z: 0 } });
    assert.equal(p.lie, 'fairway', `(${x}, ${z})`);
    assert.equal(p.aimWarning(), null, `(${x}, ${z}) → green: clear`);
  }
});

// ---- PM on PR #33: warning at ⚑ power too, K8 trees in play on holes 1–2, K9 rock bounce ----
test('PR #33 item 1: the warning also checks the ⚑ shot and says which (pin / full / both)', () => {
  // a tight cut line: a full Driver just clears the corner trees, the ⚑ Driver (96% power) doesn't
  const p = h3(); p.setAim(aimAt(p.ball.pos, { x: 55, z: -207 })); p.setClub(0);
  assert.equal(p.aimWarning(), null, 'full power: clear');
  const w = p.shotWarning();
  assert.equal(w?.at, 'pin', 'the ⚑ shot hits the leaves');
  assert.equal(w.kind, 'leaves');
  // behind the lone tree every power hits it
  const b = createHolePlay(getHole('pl-03'), { seed: 1 }); b.reset(SCENARIOS['h3-behind-tree']);
  assert.equal(b.shotWarning()?.at, 'both');
  // and the ⚑ warning is what the ball does at ⚑ power
  const q = h3(); q.setAim(aimAt(q.ball.pos, { x: 55, z: -207 })); q.setClub(0);
  q.hit(Math.min(q.pinPower(), q.lieOf().maxPower), 0);
  assert.ok(q.skip().some(e => e.type === 'hitLeaves'));
  // a clear line: no warning at all
  assert.equal(h3().shotWarning(), null);
});

test('K8: every tree inside OB on holes 1–2 is an obstacle; none on the tee, fairway, fringe or green', () => {
  for (const id of ['pl-01', 'pl-02']) {
    const hole = getHole(id);
    assert.ok(hole.obstacles.length > 20, id);
    for (const o of hole.obstacles) {
      assert.equal(o.type, 'tree');
      const s = hole.surfaceAt(o.x, o.z);
      assert.ok(!['ob', 'tee', 'fairway', 'fringe', 'green'].includes(s), `${id} tree (${o.x}, ${o.z}) on ${s}`);
    }
  }
});

test('K8: the default tee shot is never blocked, on every hole', () => {
  for (const hole of Object.values(HOLES)) {
    const p = createHolePlay(hole, { seed: 1 }); p.reset({ wind: { x: 0, z: 0 } });
    assert.equal(p.shotWarning(), null, hole.id);
  }
});

test('K9: h3-rock-bounce aims at the outcrop and the ⚑ shot lands on the rock (not a boulder)', () => {
  const p = createHolePlay(getHole('pl-03'), { seed: 1 });
  p.reset(SCENARIOS['h3-rock-bounce']);
  assert.equal(p.targetKind, 'spot');
  p.hit(Math.min(p.pinPower(), p.lieOf().maxPower), 0);
  const ev = p.skip();
  const landed = ev.filter(e => e.type === 'landed');
  assert.equal(landed[0].surface, 'rock', 'first bounce on rock');
  assert.ok(landed.filter(e => e.surface === 'rock').length >= 2, 'bounces on the rock more than once');
  assert.ok(!ev.some(e => e.type === 'hitObstacle'), 'no boulder');
});

test('PR #33 item 4: hole 2 result card links on to hole 3', () => {
  assert.equal(getHole('pl-02').intro.resultLink.hole, 'pl-03');
});
