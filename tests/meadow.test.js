// Buttercup Meadows (the first real course, course designer): data checks and the plan's key shots, as scripted
// shots (no wind, straight unless said). Plan: docs/COURSE_PLAN_MEADOW.md. — Agent: course-designer
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOLES, SETS, MDW, checkHoleLooks } from '../src/holes/sets.js';
import { validateHole } from '../src/core/validate.js';
import { holeLength } from '../src/core/vec.js';
import { shot, startAt, layup } from './mtn.test.js';

// The plan: [par, length m, difficulty]
const PLAN = { 'mdw-01': [4, 348, 1], 'mdw-02': [4, 335, 1], 'mdw-03': [3, 146, 1], 'mdw-04': [5, 481, 2], 'mdw-05': [4, 373, 2], 'mdw-06': [3, 174, 2] };
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
  for (const h of MDW.slice(0, 3)) {
    const line = h.playLine ?? [h.tee, h.cup], hs = [];
    for (let k = 1; k < line.length; k++) {
      const a = line[k - 1], b = line[k], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 5);
      for (let i = 0; i <= n; i++) hs.push(h.heightAt(a.x + (b.x - a.x) * i / n, a.z + (b.z - a.z) * i / n));
    }
    const range = Math.max(...hs) - Math.min(...hs);
    assert.ok(range > 0.8 && range < 4, `${h.id}: ${range.toFixed(1)} m of rise and fall along the line`);
  }
});

test('mdw-02 (map study): threading the gap inside the bend leaves a wedge; short of it is the bunker; the safe drive leaves an iron', () => {
  const h = HOLES['mdw-02'];
  const safe = shot(startAt(h));
  const brave = shot(startAt(h), { at: { x: -42, z: -250 }, club: 'driver', power: 1 });
  assert.equal(brave.surface, 'fairway');
  assert.ok(brave.toCup < 90 && safe.toCup > 110, `brave ${brave.toCup.toFixed(0)} m, safe ${safe.toCup.toFixed(0)} m from the cup`);
  assert.equal(shot(startAt(h), { at: { x: -42, z: -250 }, club: 'driver', power: 0.9 }).surface, 'sand', 'a brave drive that comes up short finds the bunker');
  // too far left: the rough under the trees inside the bend (a recovery, never a penalty)
  assert.notEqual(shot(startAt(h), { at: { x: -60, z: -240 }, club: 'driver', power: 1 }).ev, 'penalty');
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

// Owner (2026-11-24): bunkers and rough patches can overlap a lot of things, but never the green.
test('Buttercup Meadows: no bunker or rough patch covers any part of the green', async () => {
  const { blobR } = await import('../src/holes/mtn-course.js');
  for (const h of MDW) {
    const G = h.features.green;
    for (const b of [...h.features.bunkers, ...(h.features.roughs ?? [])]) {
      for (let z = b.cz - 30; z < b.cz + 30; z += 0.5) for (let x = b.cx - 30; x < b.cx + 30; x += 0.5) {
        if (blobR(x, z, b) < 1) assert.ok(blobR(x, z, G) >= 1, `${h.id}: the shape at (${b.cx}, ${b.cz}) covers the green at (${x}, ${z})`);
      }
    }
  }
});

// Holes 4–6: hills and the first water (docs/COURSE_PLAN_MEADOW.md)
test('mdw-04: a real hill (down into the valley, up to the green); safe lay-up left of the pond, or reach in two', () => {
  const h = HOLES['mdw-04'];
  assert.ok(h.heightAt(0, -250) < h.heightAt(0, 0) - 4 && h.heightAt(30, -472) > h.heightAt(0, -250) + 6, 'down into the valley, then up');
  const safe = startAt(h); shot(safe); const lay = layup(safe, { x: -8, z: -400 });
  assert.equal(lay.surface, 'fairway');
  const hero = startAt(h); shot(hero, { club: 'driver', power: 1 });
  const two = shot(hero, { club: '3w', power: 1, at: { x: 30, z: -472 } });
  assert.ok(['green', 'fringe'].includes(two.surface), `the hero second shot ends on the ${two.surface}`);
  // a second shot that comes up short and right finds the pond: the brave line has a price
  const push = startAt(h); shot(push, { club: 'driver', power: 1 });
  assert.equal(shot(push, { club: '3w', power: 0.85, at: { x: 46, z: -472 } }).ev, 'penalty');
});

test('mdw-05: carrying the pond leaves a shorter approach than the safe drive to the elbow', () => {
  const h = HOLES['mdw-05'];
  const safe = shot(startAt(h), { club: 'driver', power: 1 });
  const brave = shot(startAt(h), { club: 'driver', power: 1, at: { x: 60, z: -250 } });
  assert.equal(brave.surface, 'fairway');
  assert.ok(brave.toCup < safe.toCup - 25, `brave ${brave.toCup.toFixed(0)} m, safe ${safe.toCup.toFixed(0)} m`);
  const wet = shot(startAt(h), { club: 'driver', power: 0.7, at: { x: 60, z: -250 } });
  assert.equal(wet.ev, 'penalty', 'a weak drive on the brave line finds the pond');
});

test('mdw-06: downhill; at the flag holds the green, a miss left stays dry', () => {
  const h = HOLES['mdw-06'];
  assert.ok(h.heightAt(0, 0) - h.heightAt(2, -182) > 6, 'the tee sits well above the green');
  assert.equal(shot(startAt(h), { at: { x: 12, z: -174 } }).surface, 'green');
  assert.notEqual(shot(startAt(h), { at: { x: -30, z: -178 } }).ev, 'penalty');
});

// S24 deep rough (owner, 2026-11-24): on mdw-02's left, too far from the fairway is a punch-out; the brave gap stays open
test('mdw-02: a drive pulled well left of the fairway ends in deep rough; the brave gap and the fairway stay clear of it', () => {
  const h = HOLES['mdw-02'];
  assert.equal(shot(startAt(h), { at: { x: -50, z: -190 }, club: 'driver', power: 1 }).surface, 'deepRough');
  assert.equal(shot(startAt(h), { at: { x: -42, z: -250 }, club: 'driver', power: 1 }).surface, 'fairway');
  for (let z = -40; z >= -240; z -= 10) for (let x = -40; x <= 30; x += 2) if (h.surfaceAt(x, z) === 'deepRough') {
    assert.ok(Math.hypot(x - -42, z - -250) > 20 || z < -230, `deep rough at (${x}, ${z}) in the brave landing`);
  }
});
