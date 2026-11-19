// Phase BC (BC1 curve, BC2 height): the impact point shapes a full shot (core/shape.js).
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { resolveShot } from '../src/core/swing.js';
import { shapeOf, clampImpact, CENTRE } from '../src/core/shape.js';
import { CLUBS, clubShape } from '../src/core/clubs.js';
import { createHolePlay } from '../src/core/play.js';
import { applyTune, resetAllTunables } from '../src/core/tune.js';
import { setTunable } from '../src/core/config.js';
import { testHole } from './helpers.js';

afterEach(() => resetAllTunables());

const FULL = ['driver', '3w', '5i', '7i', '9i', 'pw', 'sw'];
const base = { power: 1, acc: 0, aim: 0, puttMax: 10, greenDecel: 0.7 };

// A full shot on a flat test hole of one surface (no wind unless given). Returns where it first
// landed, where it stopped, its highest point and its widest point to the side.
function fly(clubId, impact, { power = 1, wind = { x: 0, z: 0 }, surface = 'fairway', handed, acc = 0 } = {}) {
  const hole = testHole({ surfaceAt: () => surface, cup: { x: 0, z: -5000 }, wind });
  const p = createHolePlay(hole, { seed: 1, ...(handed ? { handed } : {}) });
  p.reset();
  p.setClub(p.bag.findIndex(c => c.id === clubId));
  p.setAim(0);
  p.setImpact(impact);
  const shot = p.hit(power, acc);
  let apex = 0, wide = 0, land = null;
  while (p.ball.moving) {
    const ev = p.step(), b = p.ball.pos;
    if (p.ball.phase === 'flight') { apex = Math.max(apex, b.y); if (Math.abs(b.x) > Math.abs(wide)) wide = b.x; }
    if (ev?.type === 'landed' && ev.first) land = { x: b.x, z: b.z };
  }
  const r = p.ball.pos;
  return { shot, land, apex, wide, rest: { x: r.x, z: r.z }, roll: Math.hypot(r.x - land.x, r.z - land.z) };
}

test('BC: a centre hit is exactly the shot without an impact point (every club, power, timing, lie)', () => {
  for (const id of [...FULL, 'putter']) for (const power of [0.15, 0.5, 1]) for (const acc of [0, 0.03, -0.1, 0.18]) {
    const plain = resolveShot({ ...base, club: CLUBS[id], power, acc, aim: 0.3 });
    for (const impact of [null, CENTRE, { x: 0, y: 0 }]) for (const lieShape of [1, 0.5]) {
      assert.deepEqual(resolveShot({ ...base, club: CLUBS[id], power, acc, aim: 0.3, impact, lieShape }), plain, `${id} ${power} ${acc}`);
    }
  }
  assert.equal(shapeOf(CLUBS.driver, CENTRE), null);
});

test('BC: a putt ignores the impact point (S14: putts stay straight)', () => {
  const plain = resolveShot({ ...base, club: CLUBS.putter, power: 0.6 });
  assert.deepEqual(resolveShot({ ...base, club: CLUBS.putter, power: 0.6, impact: { x: -1, y: 0.4 } }), plain);
});

test('BC1: a left impact starts the ball left, then curves right and lands on the aim line (right-handed)', () => {
  for (const id of FULL) for (const power of [0.5, 1]) {
    const L = fly(id, { x: -1, y: 0 }, { power }), R = fly(id, { x: 1, y: 0 }, { power });
    assert.ok(L.shot.vel.x < 0 && L.shot.curve.x > 0, `${id}: left starts left, pushes right`);
    assert.ok(R.shot.vel.x > 0 && R.shot.curve.x < 0, `${id}: right starts right, pushes left`);
    assert.ok(L.wide < -0.5 && R.wide > 0.5, `${id}: it goes out first (${L.wide.toFixed(2)}, ${R.wide.toFixed(2)})`);
    // BC_BACK 1: back on the aim line where it lands (flat ground, no wind), at any power
    assert.ok(Math.abs(L.land.x) < 0.3 && Math.abs(R.land.x) < 0.3, `${id} ${power}: lands on the line (${L.land.x.toFixed(2)}, ${R.land.x.toFixed(2)})`);
    // and it runs on to the curve's side
    assert.ok(L.rest.x > L.land.x && R.rest.x < R.land.x, `${id}: rolls on the way it curves`);
    // mirror images
    assert.ok(Math.abs(L.wide + R.wide) < 1e-6 && Math.abs(L.rest.x + R.rest.x) < 1e-6, `${id}: left and right mirror`);
  }
});

test('BC1: the Driver curves most, the wedges least', () => {
  const wide = FULL.map(id => -fly(id, { x: -1, y: 0 }).wide);
  for (let i = 1; i < wide.length; i++) assert.ok(wide[i] < wide[i - 1], `${FULL[i]} curves less than ${FULL[i - 1]}`);
});

test('BC1: the handedness switch mirrors it (a left-handed left impact starts right and curves left)', () => {
  const lefty = fly('7i', { x: -1, y: 0 }, { handed: 'left' }), righty = fly('7i', { x: 1, y: 0 });
  assert.ok(lefty.shot.vel.x > 0 && lefty.shot.curve.x < 0);
  assert.ok(Math.abs(lefty.rest.x - righty.rest.x) < 1e-9);
  setTunable('BC_LEFTY', 1);
  assert.equal(createHolePlay(testHole()).handed, 'left', 'BC_LEFTY:1 = left-handed');
});

test('BC1: BC_BACK sets how far it comes back (0 = a straight push out, 2 = across the line)', () => {
  setTunable('BC_BACK', 0);
  const push = fly('7i', { x: -1, y: 0 });
  assert.equal(push.shot.curve.x, 0);
  assert.ok(push.land.x < -10);
  setTunable('BC_BACK', 2);
  assert.ok(fly('7i', { x: -1, y: 0 }).land.x > 10);
});

test('BC2: a bottom hit flies higher, rolls less and drifts more in the wind; a top hit the opposite; the carry stays', () => {
  const W = { x: 5, z: 0 };
  for (const id of FULL) {
    const C = fly(id, CENTRE), B = fly(id, { x: 0, y: -1 }), T = fly(id, { x: 0, y: 1 });
    for (const s of [B, T]) assert.ok(Math.abs(-s.land.z - -C.land.z) < 0.01 * -C.land.z, `${id}: same carry (${(-s.land.z).toFixed(1)} vs ${(-C.land.z).toFixed(1)})`);
    assert.ok(B.apex > C.apex && C.apex > T.apex, `${id}: height bottom > centre > top`);
    assert.ok(B.roll < C.roll && C.roll < T.roll, `${id}: roll bottom ${B.roll.toFixed(1)} < centre ${C.roll.toFixed(1)} < top ${T.roll.toFixed(1)}`);
    const dC = fly(id, CENTRE, { wind: W }).land.x, dB = fly(id, { x: 0, y: -1 }, { wind: W }).land.x, dT = fly(id, { x: 0, y: 1 }, { wind: W }).land.x;
    assert.ok(dB > dC && dC > dT && dT > 0, `${id}: wind drift bottom ${dB.toFixed(1)} > centre ${dC.toFixed(1)} > top ${dT.toFixed(1)}`);
  }
});

test('BC2: height and roll change steadily from the bottom to the top (no jumps back)', () => {
  for (const id of FULL) {
    let prev = null;
    for (let y = -1; y <= 1 + 1e-9; y += 0.25) {
      const s = fly(id, { x: 0, y });
      if (prev) {
        assert.ok(s.apex < prev.apex, `${id} y ${y}: lower`);
        assert.ok(s.roll >= prev.roll - 0.05, `${id} y ${y}: rolls at least as far (${s.roll.toFixed(2)} vs ${prev.roll.toFixed(2)})`);
      }
      prev = s;
    }
  }
});

test('BC: corners combine (low-left = high, starts left, curves right)', () => {
  const C = fly('9i', CENTRE), LL = fly('9i', { x: -0.7, y: -0.7 });
  assert.ok(LL.apex > C.apex && LL.shot.vel.x < 0 && LL.shot.curve.x > 0);
});

test('BC: the lie limits the shaping (rough, sand), and a lie with shape 0 hits it dead centre', () => {
  const s = id => shapeOf(CLUBS['7i'], { x: -1, y: -1 }, { lieShape: id });
  assert.ok(Math.abs(s(0.5).start - s(1).start * 0.5) < 1e-12);
  assert.ok(Math.abs((s(0.3).loft - 26) - (s(1).loft - 26) * 0.3) < 1e-12);
  assert.equal(s(0), null);
  const fair = fly('7i', { x: -1, y: 0 }), rough = fly('7i', { x: -1, y: 0 }, { surface: 'rough' }), sand = fly('7i', { x: -1, y: 0 }, { surface: 'sand' });
  assert.ok(Math.abs(rough.wide) < Math.abs(fair.wide) && Math.abs(sand.wide) < Math.abs(rough.wide));
  applyTune('rough.shape:0');
  const p = createHolePlay(testHole({ surfaceAt: () => 'rough' }));
  assert.equal(p.surfaces.rough.shape, 0, 'rough.shape is a tune name');
});

test('BC: the impact point stays inside the ball and resets to the centre every shot', () => {
  assert.deepEqual(clampImpact({ x: 3, y: 4 }), { x: 0.6, y: 0.8 });
  assert.deepEqual(clampImpact({ x: 0.2, y: -0.3 }), { x: 0.2, y: -0.3 });
  assert.deepEqual(clampImpact({ x: NaN }), { x: 0, y: 0 });
  const p = createHolePlay(testHole({ surfaceAt: () => 'fairway', cup: { x: 0, z: -5000 } }));
  p.reset();
  assert.deepEqual(p.setImpact({ x: 2, y: 0 }), { x: 1, y: 0 });
  p.hit(0.5, 0);
  p.simulate();
  p.proceed();
  assert.deepEqual(p.impact, CENTRE);
});

test('BC: the per-club amounts are ?tune= names (driver.start, pw.height, …)', () => {
  const before = shapeOf(CLUBS.driver, { x: -1, y: 0 }).start;
  const r = applyTune('driver.start:5,pw.height:9,7i.roll:0.5,9i.wind:0.1,driver.start:99');
  assert.deepEqual(r.rejected, []);
  assert.equal(clubShape(CLUBS.driver).start, 25, 'clamped to SHAPE_RANGES');
  assert.equal(clubShape(CLUBS.pw).height, 9);
  assert.ok(Math.abs(shapeOf(CLUBS.driver, { x: -1, y: 0 }).start - before * 25 / CLUBS.driver.shape.start) < 1e-12, 'the tuned value is used');
  resetAllTunables();
  assert.equal(clubShape(CLUBS.driver).start, CLUBS.driver.shape.start);
  assert.deepEqual(clubShape(CLUBS.putter), { start: 0, height: 0, roll: 0, wind: 0 });
});
