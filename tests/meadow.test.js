// Buttercup Meadows (the first real course, course designer): data checks and the plan's key shots, as scripted
// shots (no wind, straight unless said). Plan: docs/COURSE_PLAN_MEADOW.md. — Agent: course-designer
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOLES, SETS, MDW, checkHoleLooks } from '../src/holes/sets.js';
import { validateHole } from '../src/core/validate.js';
import { holeLength } from '../src/core/vec.js';
import { shot, startAt } from './mtn.test.js';

// The plan: [par, length m, difficulty]
const PLAN = { 'mdw-01': [4, 350, 1], 'mdw-02': [4, 340, 1], 'mdw-03': [3, 150, 1] };
const LENGTH = { 3: [120, 210], 4: [285, 440], 5: [460, 550] }; // HOLE_GUIDELINES §4

test('Buttercup Meadows: every hole validates, is dressed in meadow-day, and has its plan par, length and difficulty', () => {
  for (const h of MDW) {
    validateHole(h);
    checkHoleLooks(h);
    const [par, len, diff] = PLAN[h.id];
    assert.equal(h.par, par, h.id);
    assert.equal(h.difficulty, diff, h.id);
    assert.equal(h.biome, 'meadow-day', h.id);
    const L = holeLength(h), [lo, hi] = LENGTH[h.par];
    assert.ok(L >= lo && L <= hi, `${h.id} plays ${L.toFixed(0)} m, outside ${lo}–${hi}`);
    assert.ok(Math.abs(L - len) <= 15, `${h.id} plays ${L.toFixed(0)} m, the plan says about ${len}`);
    assert.equal(HOLES[h.id], h);
  }
  assert.deepEqual(SETS.find(s => s.id === 'meadows').holes, MDW.map(h => h.id));
});

test('Buttercup Meadows: the default first shot stays out of trouble, and the safe line makes par or better', () => {
  for (const h of MDW) {
    const e = shot(startAt(h));
    assert.notEqual(e.ev, 'penalty', h.id);
    assert.ok(['fairway', 'green', 'fringe'].includes(e.surface), `${h.id}: the default tee shot ends on ${e.surface}`);
    const p = startAt(h);
    for (let k = 0; k < 8 && !p.finished; k++) shot(p);
    assert.ok(p.finished && p.finished.strokes <= h.par, `${h.id}: ${p.finished?.strokes} strokes on a par ${h.par}`);
  }
});

test('Buttercup Meadows 1–3 are fairly flat, not literally flat (owner): gentle rolls along the line of play', () => {
  for (const h of MDW) {
    const line = h.playLine ?? [h.tee, h.cup], hs = [];
    for (let k = 1; k < line.length; k++) {
      const a = line[k - 1], b = line[k], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 5);
      for (let i = 0; i <= n; i++) hs.push(h.heightAt(a.x + (b.x - a.x) * i / n, a.z + (b.z - a.z) * i / n));
    }
    const range = Math.max(...hs) - Math.min(...hs);
    assert.ok(range > 0.8 && range < 4, `${h.id}: ${range.toFixed(1)} m of rise and fall along the line`);
  }
});

test('mdw-02: cutting the corner past the trees leaves a wedge; the safe drive leaves a longer iron', () => {
  const h = HOLES['mdw-02'];
  const safe = shot(startAt(h));
  const brave = shot(startAt(h), { at: { x: -50, z: -248 }, club: 'driver', power: 1 });
  assert.equal(brave.surface, 'fairway');
  assert.ok(brave.toCup < 90 && safe.toCup > 110, `brave ${brave.toCup.toFixed(0)} m, safe ${safe.toCup.toFixed(0)} m from the cup`);
  // a hooked brave drive meets the trees inside the bend (a recovery, never a penalty)
  const hook = shot(startAt(h), { at: { x: -62, z: -200 }, club: 'driver', power: 1 });
  assert.notEqual(hook.ev, 'penalty');
});

test('mdw-03: a short tee shot rolls back off the raised green; the middle of the green holds', () => {
  const h = HOLES['mdw-03'];
  const mid = shot(startAt(h));
  assert.equal(mid.surface, 'green');
  const short = shot(startAt(h), { pk: 0.82 });
  assert.notEqual(short.surface, 'green', `a short shot ended on the ${short.surface}`);
});

// Owner (2026-11-24, all holes from now on): bunkers are big, deep bowls the ball rolls into, like a pit.
test('Buttercup Meadows bunkers are big, deep bowls; the Sand Wedge always gets out', () => {
  for (const h of MDW) {
    for (const b of h.features.bunkers) {
      const near = Math.hypot(b.cx - h.cup.x, b.cz - h.cup.z) < 40;
      assert.ok(b.depth >= (near ? 1.4 : 1.0), `${h.id} bunker at (${b.cx}, ${b.cz}): ${b.depth} m deep`);
      assert.ok(b.rx * b.rz >= 40, `${h.id} bunker at (${b.cx}, ${b.cz}): too small`);
      // the middle is the low point of a bowl: lower than the ground just past the sand
      const mid = h.heightAt(b.cx, b.cz), R = 1.3 * Math.max(b.rx, b.rz);
      let rim = 0; for (let k = 0; k < 8; k++) rim += h.heightAt(b.cx + R * Math.cos(k * Math.PI / 4), b.cz + R * Math.sin(k * Math.PI / 4)) / 8;
      assert.ok(rim - mid > 0.7 * b.depth, `${h.id} bunker at (${b.cx}, ${b.cz}): only ${(rim - mid).toFixed(2)} m below its rim`);
      // a Sand Wedge at the pin from the middle gets out
      const p = startAt(h, { x: b.cx, z: b.cz }, 1);
      const e = shot(p, { club: 'sw', power: near ? 'pin' : 1 });
      assert.notEqual(e.surface, 'sand', `${h.id}: stuck in the bunker at (${b.cx}, ${b.cz})`);
    }
  }
});

// Owner (2026-11-24): a bunker touches play. It may stick out into the rough, but it overlaps the fairway (or sits
// in it), or hugs the green. Never a lone bunker in the rough.
test('Buttercup Meadows bunkers touch play: each one borders the fairway, the fringe or the green', () => {
  for (const h of MDW) {
    for (const b of h.features.bunkers) {
      let play = 0;
      for (let z = b.cz - 25; z < b.cz + 25; z += 0.5) for (let x = b.cx - 25; x < b.cx + 25; x += 0.5) {
        if (h.surfaceAt(x, z) !== 'sand') continue;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (['fairway', 'fringe', 'green'].includes(h.surfaceAt(x + dx, z + dz))) play++;
      }
      assert.ok(play >= 20, `${h.id} bunker at (${b.cx}, ${b.cz}) barely touches play (${play})`);
    }
  }
});
