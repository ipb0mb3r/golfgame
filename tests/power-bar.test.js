// S22 (owner, playtest 1): no ⚑ on full shots; the power bar is in POWER_SECTIONS equal parts and the
// aim line ends in a marker where a straight, no-wind full-power shot lands, with ticks at 25/50/75%
// and a label "N yd · Flat / ▲ n yd / ▼ n yd" (+ "max 85%" when the lie caps the power, PM on PR #53).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHolePlay, aimMarkLabel, minimapTicks } from '../src/core/play.js';
import { getHole } from '../src/holes/sets.js';
import { dist2D } from '../src/core/vec.js';
import { POWER_SECTIONS, MINIMAP_TICKS, M2Y, TUNE, TUNABLES, setTunable, resetTunables } from '../src/core/config.js';
import { testHole } from './helpers.js';

// A test hole with a constant slope; the ball sits on `lie`
function on(lie, { rise = 0, club = '7i' } = {}) {
  const play = createHolePlay(testHole({ heightAt: (x, z) => -z * rise, surfaceAt: (x, z) => (z > -5 ? lie : 'fairway'), cup: { x: 0, z: -2000 } }), { seed: 1 });
  play.reset();
  play.setClub(play.bag.findIndex(c => c.id === club));
  play.setAim(0);
  return play;
}
// Where the real ball first touches down, straight and without wind
function realCarry(play, power) {
  play.hit(power, 0);
  for (let i = 0; i < 1e5 && play.ball.moving; i++) if (play.step()?.type === 'landed') break;
  return dist2D(play.ball.pos, { x: 0, z: 0 });
}

test('S22: carry is linear in power, so the ticks sit at 25/50/75% of the full carry (flat and ±5%)', () => {
  assert.equal(POWER_SECTIONS, 4);
  for (const rise of [0, 0.05, -0.05]) for (const club of ['driver', '7i', 'sw']) {
    const m = on('fairway', { rise, club }).aimMarks();
    assert.equal(m.capped, false);
    assert.equal(m.power, 1);
    assert.deepEqual(m.ticks.map(t => t.frac), [0.25, 0.5, 0.75]);
    for (const t of m.ticks) assert.ok(Math.abs(t.dist / m.dist - t.frac) < 0.003, `${club} ${rise}: tick ${t.frac} at ${(t.dist / m.dist).toFixed(4)}`);
    // the marker is where the real ball lands at 100% (within half a metre)
    assert.ok(Math.abs(realCarry(on('fairway', { rise, club }), 1) - m.dist) < 0.5, `${club} ${rise}: marker = the real carry`);
    assert.ok(Math.abs(realCarry(on('fairway', { rise, club }), 0.5) - m.ticks[1].dist) < 0.5, `${club} ${rise}: 50% tick = the real carry at 50%`);
  }
});

test('S22: on a capped lie the marker is at the cap (greyed, "max n%") and only the ticks below it are drawn', () => {
  const rough = on('rough').aimMarks();
  assert.equal(rough.capped, true);
  assert.equal(rough.power, 0.85);
  assert.deepEqual(rough.ticks.map(t => t.frac), [0.25, 0.5, 0.75]);
  const flat = on('fairway').aimMarks();
  assert.ok(Math.abs(rough.dist - 0.85 * flat.dist) < 0.5, 'the capped carry');
  assert.ok(Math.abs(rough.ticks[1].dist - flat.ticks[1].dist) < 1e-9, 'a tick means the same power everywhere');
  assert.match(aimMarkLabel(rough), /· max 85%$/);
  const sand = on('sand').aimMarks();
  assert.equal(sand.power, 0.5);
  assert.deepEqual(sand.ticks.map(t => t.frac), [0.25], 'the 50% tick sits on the cap, so only 25% shows');
});

test('S22: the label: yards to the marker and the ground there', () => {
  const flat = on('fairway');
  assert.equal(aimMarkLabel(flat.aimMarks()), `${Math.round(flat.aimMarks().dist * M2Y)} yd · Flat`);
  const up = on('fairway', { rise: 0.05 }).aimMarks();
  assert.equal(up.ground, 'up');
  assert.equal(aimMarkLabel(up), `${Math.round(up.dist * M2Y)} yd · ▲ ${Math.round(up.rise * M2Y)} yd`);
  const down = on('fairway', { rise: -0.05 }).aimMarks();
  assert.equal(down.ground, 'down');
  assert.match(aimMarkLabel(down), /^\d+ yd · ▼ \d+ yd$/);
  assert.equal(aimMarkLabel({ dist: 100, rise: 0.3, ground: 'flat', capped: false, power: 1 }), '109 yd · Flat');
  assert.equal(aimMarkLabel({ dist: 100, rise: 0.6, ground: 'up', capped: false, power: 1 }), '109 yd · ▲ 1 yd', 'never "▲ 0 yd"');
  assert.equal(aimMarkLabel(null), '');
  // the "Flat" band is tunable
  assert.equal(on('fairway', { rise: 0.02 }).aimMarks().ground, 'up', 'about 3 m up');
  try {
    setTunable('AIM_FLAT_RISE', 5);
    assert.equal(on('fairway', { rise: 0.02 }).aimMarks().ground, 'flat');
  } finally { resetTunables(); }
});

test('S22: a putt has no marker; the marker follows the club and the aim; the real holes have one', () => {
  const g = createHolePlay(getHole('pl-01'), { seed: 1 });
  g.reset(); g.ball.pos.x = -6; g.ball.pos.z = -146; g.prepare();
  assert.ok(g.club.putter);
  assert.equal(g.aimMarks(), null);
  const p = on('fairway', { club: 'driver' });
  const d = p.aimMarks().dist;
  p.setClub(p.bag.findIndex(c => c.id === '9i'));
  assert.ok(p.aimMarks().dist < d - 50);
  const before = p.aimMarks();
  p.setAim(0.2);
  assert.ok(dist2D(p.aimMarks(), before) > 5, 'moves with the aim');
  for (const id of ['pl-01', 'pl-02', 'pl-03']) {
    const h = createHolePlay(getHole(id), { seed: 1 }); h.reset();
    const m = h.aimMarks();
    assert.ok(m && m.ticks.length === 3 && m.dist > 100, id);
    assert.ok(Math.abs(m.dist - h.clubReach()) < 1e-9, `${id}: the marker is the club reach the HUD shows ("max N yd")`);
  }
});

test('S22 (owner on PR #53): the minimap shows only the 50% tick; the 3D line keeps all three', () => {
  assert.deepEqual(MINIMAP_TICKS, [0.5]);
  const m = on('fairway').aimMarks();
  assert.equal(m.ticks.length, 3);
  assert.deepEqual(minimapTicks(m).map(t => t.frac), [0.5]);
  assert.deepEqual(minimapTicks(on('sand').aimMarks()), [], 'in a bunker (cap 50%) there is no 50% tick to show');
  assert.deepEqual(minimapTicks(null), []);
});

test('S22 (owner on PR #53): the minimap is 1.2 × the hole size (+44% area), tunable', () => {
  assert.equal(TUNE.MINIMAP_SCALE, 1.2);
  assert.ok(TUNE.MINIMAP_SCALE ** 2 >= 1.4, 'at least +40% area');
  assert.ok(TUNABLES.MINIMAP_SCALE.min < 1 && TUNABLES.MINIMAP_SCALE.max > 1.2);
});
