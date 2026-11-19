// FL1: the flagstick is an obstacle (DESIGN §4 "Cup"). A ball that hits it in the air or on the roll
// loses almost all its speed and drops by the pole; the normal cup rules then decide whether it is in.
// Putts ignore it, and the aim line, the marker, the K4 warning and the ⚑ never see it.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHolePlay } from '../src/core/play.js';
import { TUNE, CUP_R, CUP_FLY_IN } from '../src/core/config.js';
import { applyTune, resetAllTunables } from '../src/core/tune.js';
import { HOLES } from '../src/holes/sets.js';
import { SCENARIOS } from '../src/holes/scenarios.js';
import { testHole } from './helpers.js';

afterEach(() => resetAllTunables());

const CUP = { x: 0, z: -1000 };
const flat = (extra = {}) => testHole({ cup: CUP, map: { x0: -50, x1: 50, z0: -1100, z1: 50 }, ...extra });
const toCup = q => Math.hypot(q.x - CUP.x, q.z - CUP.z);

// Launch the ball from (x, y, z) with this velocity (a chip in the air, or `kind: 'putt'` rolling),
// play it out and return the events and where it ended.
function play(hole, { x = 0, y = 0, z, vel, kind = 'full' }) {
  const p = createHolePlay(hole, { seed: 1 });
  Object.assign(p.ball.pos, { x, y: y + p.terrain.heightAt(x, z), z });
  p.ball.launch({ kind, vel, curve: { x: 0, y: 0, z: 0 }, spinFactor: 1 });
  const events = [];
  let afterPole = null;
  for (let i = 0; i < 240 * 60 && p.ball.moving; i++) {
    const ev = p.step();
    if (!ev) continue;
    events.push(ev);
    if (ev.type === 'hitFlag' && !afterPole) afterPole = { ...p.ball.vel, ...{ pos: { ...p.ball.pos } } };
  }
  return { events, end: events.at(-1), pos: { ...p.ball.pos }, afterPole, pole: events.find(e => e.type === 'hitFlag') };
}

test('FL1: a ball that hits the pole in the air loses almost all its speed and drops by it', () => {
  // 15 m/s flat into the pole 1 m up (it falls ~4 cm on the way)
  const r = play(flat(), { y: 1, z: CUP.z + 3, vel: { x: 0, y: 0, z: -15 } });
  assert.ok(r.pole, 'hits the pole');
  assert.equal(r.pole.rolling, false);
  const h = Math.hypot(r.afterPole.x, r.afterPole.z);
  assert.ok(h <= 15 * TUNE.FLAG_REST + 1e-9, `keeps only ${h.toFixed(2)} m/s across the ground`);
  assert.ok(r.afterPole.z > 0, 'a soft rebound, back the way it came');
  assert.ok(r.afterPole.pos.y > 0.7, 'hit in the air, about 0.8 m up');
  assert.ok(toCup(r.pos) < 1.5, `drops dead by the pole (${toCup(r.pos).toFixed(2)} m)`);
});

test('FL1: a dead drop high on the pole stays out (normal cup rules: it lands beyond the fly-in radius)', () => {
  const r = play(flat(), { y: 2.2, z: CUP.z + 2, vel: { x: 0, y: 0, z: -12 } });
  assert.ok(r.pole);
  assert.equal(r.end.type, 'stopped', 'not holed');
  const d = toCup(r.pos);
  assert.ok(d > CUP_R && d < 1.5, `stops ${d.toFixed(2)} m from the cup`);
});

test('FL1: a ball that hits the pole low drops in (on the fly, within CUP_R × CUP_FLY_IN)', () => {
  const r = play(flat(), { y: 0.4, z: CUP.z + 0.6, vel: { x: 0, y: -1, z: -6 } });
  assert.ok(r.pole);
  assert.deepEqual(r.end, { type: 'holed', how: 'fly' });
  // without the pole the same ball lands past the cup and runs away
  applyTune('FLAG_H:0');
  const q = play(flat(), { y: 0.4, z: CUP.z + 0.6, vel: { x: 0, y: -1, z: -6 } });
  assert.ok(!q.pole);
  assert.equal(q.end.type, 'stopped');
  assert.ok(toCup(q.pos) > CUP_R * CUP_FLY_IN);
});

test('FL1: a glancing hit keeps only FLAG_KEEP of its speed along the pole', () => {
  // passes 0.1 m to the side of the pole's centre (pole + ball = 0.115 m): a glancing blow
  const r = play(flat(), { x: 0.1, y: 1.5, z: CUP.z + 2, vel: { x: 0, y: 0, z: -10 } });
  assert.ok(r.pole);
  assert.ok(Math.hypot(r.afterPole.x, r.afterPole.z) < 10 * Math.max(TUNE.FLAG_KEEP, TUNE.FLAG_REST) + 1e-9);
});

test('FL1: a rolling chip can hit the pole (after a lip-out) and dies by it', () => {
  // a fast running chip (not a putt; it skids onto the green at 20 m/s and runs on at ~6 m/s)
  // straight at the cup lips out; some lip-outs then run into the pole
  let rolled = 0;
  for (let k = 0; k < 40; k++) {
    const r = play(flat(), { x: (k - 20) * 0.004, z: CUP.z + 3, vel: { x: 0, y: 0, z: -20 } });
    if (!r.pole?.rolling) continue;
    rolled++;
    assert.ok(Math.hypot(r.afterPole.x, r.afterPole.z) < 1, 'loses almost all its speed (it met the pole at ~4 m/s)');
    assert.ok(toCup(r.pos) < 1.5, `ends by the pole (${toCup(r.pos).toFixed(2)} m, ${r.end.type})`);
  }
  assert.ok(rolled > 0, 'some rolling chips hit the pole');
});

test('FL1: putts never touch the pole (today\'s cup rules)', () => {
  for (const [x, v] of [[0, 2], [0, 4], [0, 8], [0.08, 6], [0.15, 5]]) {
    const r = play(flat(), { x, z: CUP.z + 3, vel: { x: 0, y: 0, z: -v }, kind: 'putt' });
    applyTune('FLAG_H:0');
    const q = play(flat(), { x, z: CUP.z + 3, vel: { x: 0, y: 0, z: -v }, kind: 'putt' });
    resetAllTunables();
    assert.ok(!r.events.some(e => e.type === 'hitFlag'), `putt ${v} m/s: no pole`);
    assert.deepEqual(r.events, q.events, `putt ${v} m/s: same events`);
    assert.deepEqual(r.pos, q.pos, `putt ${v} m/s: same end`);
  }
  // a slow putt still drops, a fast one still lips out and runs on
  assert.equal(play(flat(), { z: CUP.z + 3, vel: { x: 0, y: 0, z: -2 }, kind: 'putt' }).end.type, 'holed');
  assert.ok(play(flat(), { z: CUP.z + 3, vel: { x: 0, y: 0, z: -8 }, kind: 'putt' }).events.some(e => e.type === 'lippedOut'));
});

test('FL1: FLAG_H:0 takes the pole out', () => {
  applyTune('FLAG_H:0');
  assert.ok(!play(flat(), { y: 1, z: CUP.z + 3, vel: { x: 0, y: 0, z: -15 } }).pole);
});

test('FL1: the pole is not a tree: the aim line, marker, K4 warning, ⚑ and auto-pick are the same with or without it', () => {
  const look = p => JSON.stringify({ m: p.aimMarks(), w: p.shotWarning(), pin: p.pinPower(), club: p.clubIdx });
  let checked = 0;
  // every hole's tee and every scenario spot, every club (incl. h2-green-step's Driver, whose full shot hits the pole)
  const spots = [...Object.values(HOLES).map(h => [h, null]), ...Object.entries(SCENARIOS).map(([id, sc]) => [HOLES[sc.hole], { id, ...sc, wind: { x: 0, z: 0 } }])];
  for (const [hole, start] of spots) {
    for (const impact of [{ x: 0, y: 0 }, { x: 0, y: 1 }]) {
      const out = [];
      for (const tune of ['', 'FLAG_H:0']) {
        resetAllTunables(); if (tune) applyTune(tune);
        const p = createHolePlay(hole, { seed: 1 }); p.reset(start);
        const s = [look(p)];
        for (let i = 0; i < p.bag.length - 1; i++) { p.setClub(i); p.setImpact(impact); s.push(look(p)); }
        out.push(s);
      }
      assert.deepEqual(out[0], out[1], `${hole.id} ${start?.id ?? 'tee'}`);
      checked++;
    }
  }
  assert.ok(checked > 20);
  // and a shot straight through the pole on a hole with a tree elsewhere is never warned
  const hole = flat({ surfaceAt: () => 'fairway', obstacles: [{ type: 'tree', x: 30, z: -500, trunkR: 0.3, trunkH: 5, canopyR: 3, canopyH: 4 }] });
  const p = createHolePlay(hole, { seed: 1 }); p.reset({ ball: { x: 0, z: CUP.z + 20 }, wind: { x: 0, z: 0 } });
  for (let i = 0; i < p.bag.length - 1; i++) { p.setClub(i); assert.equal(p.shotWarning(), null, p.club.name); assert.equal(p.aimWarning(), null); }
});
