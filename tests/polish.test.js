// Phase K polish (K10–K13): trunk tops, the aim warning's accuracy, hole 3's yardage and hint, and
// the background ground plane under the terrain.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHolePlay } from '../src/core/play.js';
import { validateHole } from '../src/core/validate.js';
import { getHole, HOLES } from '../src/holes/sets.js';
import { BALL_R, M2Y, GROUND_PLANE_MARGIN } from '../src/core/config.js';
import { aimAt, holeLength } from '../src/core/vec.js';
import { meshAxis } from '../src/core/terrain.js';
import { warnHint } from '../src/game/hud.js';
import { testHole } from './helpers.js';

const TREE = { type: 'tree', x: 0, z: -20, trunkR: 0.4, trunkH: 6, canopyR: 3, canopyH: 6 };

// Every step of a shot: is the ball ever inside a trunk (lowest point below the top, centre within
// the trunk's radius + BALL_R)? Returns { inside, events, play }.
function watchTrunks(play, maxSteps = 240 * 40) {
  const b = play.ball, events = [];
  let inside = 0;
  for (let i = 0; i < maxSteps && b.moving; i++) {
    const ev = play.step();
    if (ev) events.push(ev);
    for (const o of play.obstacles) {
      if (o.type !== 'tree') continue;
      if (Math.hypot(b.pos.x - o.x, b.pos.z - o.z) < o.r + BALL_R - 1e-3 && b.pos.y < o.top - 1e-3 && b.pos.y + 2 * BALL_R > o.y0) inside++;
    }
  }
  return { inside, events, play };
}

test('K10: a ball dropped onto the top of a trunk lands on it and falls off, never through it', () => {
  const hole = testHole({ surfaceAt: () => 'fairway', obstacles: [TREE] });
  for (const dx of [0, 0.05, 0.2, 0.4]) {
    const play = createHolePlay(hole, { seed: 1 });
    const b = play.ball;
    b.pos.x = dx; b.pos.z = TREE.z; b.pos.y = TREE.trunkH + 6; // above the leaves, dead over the trunk
    b.launch({ kind: 'full', vel: { x: 0, y: 0, z: 0 }, curve: { x: 0, y: 0, z: 0 }, spinFactor: 1 });
    const r = watchTrunks(play);
    assert.equal(r.inside, 0, `dx ${dx}: never inside the trunk`);
    assert.equal(r.events.at(-1)?.type, 'stopped', `dx ${dx}: comes to rest (${r.events.map(e => e.type).slice(-4)})`);
    assert.ok(Math.hypot(b.pos.x - TREE.x, b.pos.z - TREE.z) > TREE.trunkR, `dx ${dx}: rests beside the trunk, not on it`);
    assert.ok(r.events.filter(e => e.type === 'hitObstacle').length < 40, `dx ${dx}: a few bounces, not a jitter`);
  }
});

test('K10: QA L1, hole 2 tree #55: the slowed ball coming down on the trunk top bounces off it (seeds 1–3)', () => {
  for (const seed of [1, 2, 3]) {
    const play = createHolePlay(getHole('pl-02'), { seed });
    play.reset({ ball: { x: 33.58, z: -476.5 }, wind: { x: 0, z: 0 }, seed });
    const o = play.obstacles[55];
    play.setAim(aimAt(play.ball.pos, o));
    play.hit(play.lieOf().maxPower, 0);
    const r = watchTrunks(play);
    assert.equal(r.inside, 0, `seed ${seed}: never inside a trunk`);
    assert.ok(r.events.some(e => e.type === 'hitObstacle' && e.kind === 'trunk' && e.index === 55), `seed ${seed}: hits the trunk (${r.events.map(e => e.type)})`);
  }
});

// K11: aim across the edge of a tree's leaves in fine steps and compare the warning with the real
// (straight, no wind) shot. QA L2's two grazing misses, plus the edges of a few more trees.
function grazeSweep(holeId, ball, club, at, treeIdx, steps) {
  const hole = getHole(holeId);
  let n = 0;
  const wrong = [];
  for (let k = -steps; k <= steps; k++) {
    const play = createHolePlay(hole, { seed: 1 });
    play.reset({ ball, wind: { x: 0, z: 0 }, seed: 1 });
    if (club) play.setClub(play.bag.findIndex(c => c.id === club));
    const o = play.obstacles[treeIdx], d = Math.hypot(o.x - ball.x, o.z - ball.z);
    play.setAim(aimAt(play.ball.pos, o) + (k / steps) * (o.canopy.rx + 1) / d);
    const cap = play.lieOf().maxPower;
    const power = at === 'pin' ? Math.min(play.pinPower(), cap) : cap;
    if (power > 1.02) continue;
    const w = play.aimWarning(play.clubIdx, play.aim, power);
    play.hit(power, 0);
    const hit = play.skip().find(e => e.type === 'hitLeaves' || e.type === 'hitObstacle');
    n++;
    if (!!w !== !!hit) wrong.push(`aim step ${k}: warning ${w?.kind ?? 'none'}, ball ${hit?.type ?? 'clear'}`);
  }
  return { n, wrong };
}

test('K11: the aim warning matches the real ball across the edges of the leaves (QA L2 sweep: 0 misses)', () => {
  const cases = [
    ['pl-01', { x: -0.1, z: -81.4 }, 'sw', 'pin', 15],   // L2 (a): S Wedge at the ⚑ past tree #15
    ['pl-03', { x: 156.3, z: -143.7 }, '9i', 'full', 12], // L2 (b): 9 Iron full from the rough, tree #12
    ['pl-03', { x: 0, z: -150 }, null, 'full', 0],        // the lone tree from short of it
    ['pl-03', { x: 0, z: -150 }, null, 'pin', 0],
  ];
  for (const [id, ball, club, at, tree] of cases) {
    const r = grazeSweep(id, ball, club, at, tree, 60);
    assert.ok(r.n > 50, `${id} tree ${tree}: ${r.n} shots checked`);
    assert.deepEqual(r.wrong, [], `${id} tree ${tree} at ${at} power`);
  }
});

test('K12: hole 3 is measured along its play line (about 408 yd), the others tee to cup', () => {
  const h3 = getHole('pl-03');
  assert.equal(Math.round(holeLength(h3) * M2Y), 408);
  const straight = Math.hypot(h3.cup.x - h3.tee.x, h3.cup.z - h3.tee.z);
  assert.ok(holeLength(h3) > straight + 80, 'longer than the straight line');
  for (const id of ['pl-01', 'pl-02']) {
    const h = getHole(id);
    assert.equal(holeLength(h), Math.hypot(h.cup.x - h.tee.x, h.cup.z - h.tee.z), `${id}: no play line, straight`);
  }
  const bad = playLine => assert.throws(() => validateHole({ ...h3, playLine }), /playLine/);
  bad([h3.tee]);
  bad([{ x: 1, z: 0 }, h3.cup]);
  bad([h3.tee, { x: 0, z: -100 }]);
});

test('K12: the warning hint says to aim around it or change the power', () => {
  const t = warnHint({ at: 'pin', kind: 'leaves', dist: 100 });
  assert.match(t, /aim around it or change your power$/);
  assert.doesNotMatch(t, /higher club/);
});

test('K13: the background ground plane is below the lowest drawn terrain on every hole', () => {
  for (const hole of Object.values(HOLES)) {
    let low = Infinity;
    for (const x of meshAxis(hole.scenery.mesh.xs)) for (const z of meshAxis(hole.scenery.mesh.zs)) low = Math.min(low, hole.heightAt(x, z));
    assert.ok(hole.scenery.ground.y <= low - GROUND_PLANE_MARGIN, `${hole.id}: ground ${hole.scenery.ground.y} vs lowest terrain ${low.toFixed(2)}`);
  }
  // the owner's bug: hole 2 at -0.6 hid the hollows past the tee and left of the bunker
  const h2 = getHole('pl-02');
  assert.throws(() => validateHole({ ...h2, scenery: { ...h2.scenery, ground: { ...h2.scenery.ground, y: -0.6 } } }), /pl-02.*scenery\.ground\.y \(-0\.6\) must be at least 0\.1 m below the lowest terrain/);
  const h3 = getHole('pl-03');
  assert.throws(() => validateHole({ ...h3, scenery: { ...h3.scenery, ground: { ...h3.scenery.ground, y: -0.3 } } }), /scenery\.ground\.y/);
});

