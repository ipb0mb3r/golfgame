// Surfaces, RNG, clubs, scoring, the fixed-step clock and the "core stays pure" rule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { BASE_SURFACES, getEffectiveSurface, makeSurfaceTable } from '../src/core/surfaces.js';
import { createRng } from '../src/core/rng.js';
import { makeBag, lieFactor, CLUBS } from '../src/core/clubs.js';
import { resultName, resultText } from '../src/core/scoring.js';
import { createHolePlay } from '../src/core/play.js';
import { HOLES, SETS, getHole, DEFAULT_HOLE } from '../src/holes/sets.js';
import hole1 from '../src/holes/hole1.js';
import hole2 from '../src/holes/hole2.js';

test('surface overrides change only what the hole says', () => {
  assert.deepEqual(makeSurfaceTable(hole1).green, { id: 'green', ...BASE_SURFACES.green });
  const g2 = getEffectiveSurface('green', hole2);
  assert.equal(g2.decel, 0.8); assert.equal(g2.keep, 0.34); assert.equal(g2.rest, BASE_SURFACES.green.rest);
  assert.equal(BASE_SURFACES.green.decel, 1.1, 'base table untouched');
  assert.throws(() => getEffectiveSurface('lava', hole1));
});

test("each hole keeps today's surface values (DESIGN §4 table)", () => {
  const want = {
    'pl-01': { fairway: [.42, 2.4], fringe: [.36, 3.2], green: [.32, 1.1] },
    'pl-02': { fairway: [.45, 2.2], fringe: [.36, 3.0], green: [.34, 0.8] },
  };
  for (const [id, rows] of Object.entries(want)) {
    const t = makeSurfaceTable(getHole(id));
    for (const [s, [keep, decel]] of Object.entries(rows)) assert.deepEqual([t[s].keep, t[s].decel], [keep, decel], `${id} ${s}`);
  }
});

test('seeded RNG: same seed, same numbers; all in [0, 1)', () => {
  const a = createRng(42), b = createRng(42), c = createRng(43);
  const sa = Array.from({ length: 50 }, a), sb = Array.from({ length: 50 }, b), sc = Array.from({ length: 50 }, c);
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  assert.ok(sa.every(v => v >= 0 && v < 1));
});

test('wind comes from the seed and respects windMax; a hole can fix it', () => {
  const w = seed => { const p = createHolePlay(hole2, { seed }); p.reset(); return { ...p.wind }; };
  assert.deepEqual(w(7), w(7));
  for (let s = 1; s < 50; s++) assert.ok(Math.hypot(w(s).x, w(s).z) <= hole2.windMax + 1e-9);
  const fixed = createHolePlay({ ...hole1, wind: { x: 1, z: -2 } }); fixed.reset();
  assert.deepEqual(fixed.wind, { x: 1, y: 0, z: -2 });
});

test('the same shot ends in the same place at any frame rate (fixed-step accumulator)', () => {
  const end = (fps, holeDef, power, acc) => {
    const p = createHolePlay(holeDef, { seed: 3 });
    p.reset(); p.wind.x = 1.5; p.wind.z = -0.5;
    p.hit(power, acc);
    for (let i = 0; i < 1e5 && p.ball.moving; i++) p.advance(1 / fps);
    return [p.ball.pos.x, p.ball.pos.z, p.strokes];
  };
  for (const [h, pw, acc] of [[hole1, 0.9, 0.04], [hole2, 1, -0.05]]) {
    const ref = end(60, h, pw, acc);
    for (const fps of [24, 30, 75, 144, 240]) assert.deepEqual(end(fps, h, pw, acc), ref, `${h.id} at ${fps} fps`);
  }
});

test('bags: hole 1 has no driver, the putter is always last; sand wedge lie', () => {
  assert.deepEqual(makeBag(hole1.bag).map(c => c.id), ['3w', '5i', '7i', '9i', 'pw', 'sw', 'putter']);
  assert.equal(makeBag().length, 8);
  assert.throws(() => makeBag(['7i']));
  const s = makeSurfaceTable(hole1);
  assert.equal(lieFactor(CLUBS.sw, 'sand', s), 0.85);
  assert.equal(lieFactor(CLUBS['7i'], 'sand', s), 0.6);
  assert.equal(lieFactor(CLUBS['7i'], 'rough', s), 0.85);
  assert.equal(lieFactor(CLUBS.putter, 'rough', s), 1);
});

test('auto club: 7 iron off hole 1 tee, driver off hole 2 tee, putter on the green', () => {
  const p1 = createHolePlay(hole1); p1.reset(); assert.equal(p1.club.name, '7 Iron');
  const p2 = createHolePlay(hole2); p2.reset(); assert.equal(p2.club.name, 'Driver');
  p2.ball.pos.x = 20; p2.ball.pos.z = -440; p2.prepare();
  assert.equal(p2.lie, 'green'); assert.equal(p2.club.name, 'Putter');
});

test('score names', () => {
  assert.equal(resultName(1, 3), 'Hole in one!');
  assert.equal(resultName(2, 3), 'Birdie!');
  assert.equal(resultName(3, 5), 'Eagle!');
  assert.equal(resultName(5, 5), 'Par');
  assert.equal(resultName(9, 5), '+4');
  assert.equal(resultText(4, 3), 'You finished in 4 strokes on a par 3 (1 over par).');
});

test('every hole module is complete and registered', () => {
  assert.ok(HOLES[DEFAULT_HOLE]);
  assert.equal(getHole('nope'), HOLES[DEFAULT_HOLE]);
  for (const h of Object.values(HOLES)) {
    for (const k of ['id', 'name', 'par', 'maxStrokes', 'tee', 'cup', 'map', 'heightAt', 'surfaceAt', 'scenery', 'intro']) assert.ok(h[k] !== undefined, `${h.id}.${k}`);
    assert.equal(h.surfaceAt(h.tee.x, h.tee.z), 'tee', `${h.id} tee`);
    assert.equal(h.surfaceAt(h.cup.x, h.cup.z), 'green', `${h.id} cup`);
    for (let i = 0; i < 400; i++) {
      const x = h.map.x0 + (h.map.x1 - h.map.x0) * ((i * 37) % 400) / 400, z = h.map.z0 + (h.map.z1 - h.map.z0) * i / 400;
      assert.ok(BASE_SURFACES[h.surfaceAt(x, z)], `${h.id} surface at ${x},${z}`);
      assert.ok(Number.isFinite(h.heightAt(x, z)));
    }
  }
  for (const s of SETS) for (const id of s.holes) assert.ok(HOLES[id], `${s.id} → ${id}`);
});

test('src/core is pure: no Three.js, no DOM, no Math.random', () => {
  const dir = new URL('../src/core/', import.meta.url);
  for (const f of readdirSync(dir)) {
    const src = readFileSync(new URL(f, dir), 'utf8').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(src, /from\s+['"]three['"]|THREE\./, `${f} imports Three.js`);
    assert.doesNotMatch(src, /\b(document|window|localStorage|requestAnimationFrame)\b/, `${f} touches the DOM`);
    assert.doesNotMatch(src, /Math\.random/, `${f} uses Math.random`);
  }
});

test('?hole= ids are case-insensitive; an unknown id falls back to hole 1 and says so', async () => {
  const { resolveHole } = await import('../src/holes/sets.js');
  assert.deepEqual(resolveHole('PL-02'), { hole: hole2, unknown: false });
  assert.deepEqual(resolveHole(' pl-02 '), { hole: hole2, unknown: false });
  assert.deepEqual(resolveHole(null), { hole: hole1, unknown: false });
  assert.deepEqual(resolveHole(''), { hole: hole1, unknown: false });
  assert.deepEqual(resolveHole('pl-99'), { hole: hole1, unknown: true });
  assert.deepEqual(resolveHole('constructor'), { hole: hole1, unknown: true });
  assert.deepEqual(resolveHole('__proto__'), { hole: hole1, unknown: true });
});

test('?seed=: 0 is a valid seed; missing or junk gives null', async () => {
  const { parseSeed } = await import('../src/core/rng.js');
  assert.equal(parseSeed('0'), 0);
  assert.equal(parseSeed('42'), 42);
  assert.equal(parseSeed('-7'), -7);
  for (const bad of [null, undefined, '', '  ', 'abc']) assert.equal(parseSeed(bad), null);
  assert.notDeepEqual(Array.from({ length: 3 }, createRng(0)), Array.from({ length: 3 }, createRng(1)));
});
