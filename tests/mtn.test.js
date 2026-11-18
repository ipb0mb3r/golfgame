// Phase C: the Mountain 9 prototype holes (course designer). Data checks and the PM's conditions
// from PR #49, as scripted shots (no wind, straight unless said): each hole validates, its length is
// inside HOLE_GUIDELINES §4, the default tee shot is safe, and each hole's key shots do what the
// plan (docs/COURSE_PLAN_MTN.md) says.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOLES, SETS, MTN } from '../src/holes/sets.js';
import { validateHole } from '../src/core/validate.js';
import { createHolePlay } from '../src/core/play.js';
import { holeLength } from '../src/core/vec.js';

// The plan's difficulty ramp (COURSE_PLAN_MTN.md, HOLE_GUIDELINES §2)
const DIFF = { 'mtn-01': 1, 'mtn-02': 1, 'mtn-03': 2, 'mtn-04': 2, 'mtn-05': 2, 'mtn-06': 3, 'mtn-07': 3, 'mtn-08': 3, 'mtn-09': 4 };
// Playtest 1 (L3): holes about 10% longer; the owner's caps are par 3 ≤ 210, par 4 ≤ 440, par 5 ≤ 550 m
const LENGTH = { 3: [110, 210], 4: [260, 440], 5: [420, 550] };
const aimTo = (p, t) => Math.atan2(t.x - p.ball.pos.x, -(t.z - p.ball.pos.z));
// One scripted shot: { at, club, power ('pin' = the ⚑, or 0..1), pk (× power), acc }. Returns where it ended.
export function shot(p, o = {}) {
  if (o.at) p.setAim(aimTo(p, o.at));
  if (o.club) p.setClub(p.bag.findIndex(c => c.id === o.club));
  const pw = Math.min((o.power === undefined || o.power === 'pin' ? p.pinPower() : o.power) * (o.pk ?? 1), p.lieOf().maxPower);
  const club = p.club.id;
  p.hit(pw, o.acc ?? 0);
  let ev = null;
  for (let n = 0; p.ball.moving && n < 200000; n++) { const e = p.step(); if (e && ['stopped', 'holed', 'penalty'].includes(e.type)) ev = e; }
  const end = { club, ev: ev?.type, surface: p.terrain.surfaceAt(p.ball.pos.x, p.ball.pos.z), toCup: p.distToCup(), x: p.ball.pos.x, z: p.ball.pos.z };
  p.proceed();
  return end;
}
// A lay-up: aim at `spot` and hit the power that finishes there (straight, no wind), ×pk
export function layup(p, spot, { club = null, pk = 1 } = {}) {
  p.setAim(aimTo(p, spot));
  if (club) p.setClub(p.bag.findIndex(c => c.id === club));
  const from = { x: p.ball.pos.x, z: p.ball.pos.z }, want = Math.hypot(spot.x - from.x, spot.z - from.z);
  let lo = 0, hi = 1.2;
  for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; const r = p.restPoint(p.clubIdx, p.aim, m); if (Math.hypot(r.x - from.x, r.z - from.z) < want) lo = m; else hi = m; }
  return shot(p, { power: hi, pk });
}
export function startAt(hole, ball = null, strokes = 1) {
  const p = createHolePlay(hole, { seed: 1 });
  p.reset({ seed: 1, wind: { x: 0, z: 0 }, ...(ball ? { ball, strokes } : {}) });
  return p;
}

test('Mountain 9: every hole validates, has its plan par and a length inside the guide range', () => {
  const plan = { 'mtn-01': [4, 370], 'mtn-02': [4, 330], 'mtn-03': [3, 165], 'mtn-04': [5, 478], 'mtn-05': [4, 395], 'mtn-06': [3, 175], 'mtn-07': [4, 430], 'mtn-08': [4, 300], 'mtn-09': [5, 540] };
  for (const h of MTN) {
    validateHole(h);
    const [par, len] = plan[h.id];
    assert.equal(h.par, par, h.id);
    assert.equal(h.difficulty, DIFF[h.id], `${h.id} difficulty`);
    const L = holeLength(h), [lo, hi] = LENGTH[h.par];
    assert.ok(L >= lo && L <= hi, `${h.id} plays ${L.toFixed(0)} m, outside ${lo}–${hi}`);
    assert.ok(Math.abs(L - len) <= 15, `${h.id} plays ${L.toFixed(0)} m, the plan says about ${len}`);
    assert.equal(HOLES[h.id], h);
  }
  const set = SETS.find(s => s.id === 'mountain9');
  assert.deepEqual(set.holes, MTN.map(h => h.id));
});

test('Mountain 9: the default first shot of every hole stays out of trouble (no wind, straight)', () => {
  for (const h of MTN) {
    const e = shot(startAt(h));
    assert.notEqual(e.ev, 'penalty', h.id);
    assert.ok(['fairway', 'green', 'fringe'].includes(e.surface), `${h.id}: the default tee shot ends on ${e.surface}`);
  }
});

// The safe line's lay-ups on the par 5s (the default aim for a second shot is the green, over the water)
const SAFE_LAYUP = { 'mtn-04': { x: -31, z: -408 }, 'mtn-09': { x: 40, z: -458 } };
test('Mountain 9: a straight, sensible round of the safe line makes par or better on every hole', () => {
  for (const h of MTN) {
    const p = startAt(h);
    for (let k = 0; k < 8 && !p.finished; k++) {
      if (k === 1 && SAFE_LAYUP[h.id]) layup(p, SAFE_LAYUP[h.id]);
      else shot(p);
    }
    assert.ok(p.finished, h.id);
    assert.ok(p.finished.strokes <= h.par, `${h.id}: ${p.finished.strokes} strokes on a par ${h.par}`);
  }
});

test('mtn-02: a full drive on the shortcut lands on fairway; a weaker one drops into rough; straight at the green is blocked (PM #49, playtest 1)', () => {
  const h = HOLES['mtn-02'], cut = { x: 60, z: -250 };
  const full = shot(startAt(h, { x: 0, z: 0 }, 0), { at: cut, club: 'driver', power: 1 });
  assert.equal(full.surface, 'fairway');
  assert.ok(full.toCup < 75, `the brave drive leaves ${full.toCup.toFixed(0)} m`);
  for (const pk of [0.9, 0.85]) {
    const weak = shot(startAt(h, { x: 0, z: 0 }, 0), { at: cut, club: 'driver', power: pk });
    assert.equal(weak.ev, 'stopped');
    assert.equal(weak.surface, 'rough', `a ${pk * 100}% drive ends on ${weak.surface}`);
  }
  // L2: the trees guard a straight line at the green
  const p = startAt(h, { x: 0, z: 0 }, 0);
  p.setAim(aimTo(p, h.cup)); p.setClub(p.bag.findIndex(c => c.id === 'driver'));
  assert.ok(p.aimWarning(p.clubIdx, p.aim, 1), 'a full drive straight at the green hits the trees');
});

test('mtn-03: the safe shot finds the green; a hook at the flag finds the creek', () => {
  const h = HOLES['mtn-03'];
  assert.equal(shot(startAt(h, { x: 0, z: 0 }, 0)).surface, 'green');
  const hook = shot(startAt(h, { x: 0, z: 0 }, 0), { at: h.cup, acc: 0.08 });
  assert.equal(hook.ev, 'penalty');
});

test('mtn-04: the lay-up leaves a wedge, a short pitch stays dry, a good 3 Wood reaches in two (PM #49)', () => {
  const h = HOLES['mtn-04'], lay = { x: -31, z: -408 }, green = { x: -44, z: -470 };
  const d = shot(startAt(h)), drive = { x: d.x, z: d.z };
  assert.equal(d.surface, 'fairway');
  // the lay-up: a 3 Wood to the lay-up zone, at the power that finishes there ±8% (playtest 1: the hole is longer)
  for (const pk of [0.92, 1, 1.06]) {
    const p = startAt(h, drive);
    p.setAim(aimTo(p, lay)); p.setClub(p.bag.findIndex(c => c.id === '3w'));
    const want = Math.hypot(lay.x - drive.x, lay.z - drive.z);
    let lo = 0, hi = 1.2;
    for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; const r = p.restPoint(p.clubIdx, p.aim, m); if (Math.hypot(r.x - drive.x, r.z - drive.z) < want) lo = m; else hi = m; }
    const e = shot(p, { power: hi, pk });
    assert.equal(e.ev, 'stopped', `lay-up ×${pk}`);
    assert.ok(e.toCup >= 40 && e.toCup <= 80, `lay-up ×${pk} leaves ${e.toCup.toFixed(0)} m`);
  }
  // a pitch from the lay-up zone hit 25–35% short still stays dry
  for (const pk of [0.75, 0.65]) {
    const e = shot(startAt(h, lay, 2), { pk });
    assert.equal(e.ev, 'stopped', `pitch ×${pk}`);
    assert.notEqual(e.surface, 'water');
  }
  // the brave second shot: after a full drive, a 95% 3 Wood reaches the green
  const big = shot(startAt(h, { x: 0, z: 0 }, 0), { club: 'driver', power: 1 });
  const go = shot(startAt(h, { x: big.x, z: big.z }), { at: green, club: '3w', power: 0.95 });
  assert.ok(['green', 'fringe'].includes(go.surface), `95% 3 Wood ends on ${go.surface}`);
  // L8: the creek is a real obstacle: at least 8 m of water where it crosses
  let wet = 0;
  for (let z = -445; z <= -410; z += 0.5) if (h.surfaceAt(-38, z) === 'water') wet += 0.5;
  assert.ok(wet >= 8, `the creek is ${wet} m wide`);
});

test('mtn-05: carrying the pond reaches the fairway island; a weak carry is wet; the safe drive is longer in', () => {
  const h = HOLES['mtn-05'], over = { x: -48, z: -226 };
  for (const pk of [1, 0.95, 0.9]) {
    const e = shot(startAt(h, { x: 0, z: 0 }, 0), { at: over, club: 'driver', power: pk });
    assert.equal(e.surface, 'fairway', `a ${pk * 100}% carry ends on ${e.surface}`);
  }
  const brave = shot(startAt(h, { x: 0, z: 0 }, 0), { at: over, club: 'driver', power: 1 });
  assert.equal(shot(startAt(h, { x: 0, z: 0 }, 0), { at: over, club: 'driver', power: 0.85 }).ev, 'penalty');
  const safe = shot(startAt(h, { x: 0, z: 0 }, 0));
  assert.ok(safe.toCup > brave.toCup + 30, `safe leaves ${safe.toCup.toFixed(0)} m, brave ${brave.toCup.toFixed(0)} m`);
});

test('mtn-06: the deep bunker is escaped with the Sand Wedge; the bank feeds a ball onto the green (PM #49)', () => {
  const h = HOLES['mtn-06'];
  // a deep hollow: the face on the green side is well above the sand; the front lip (toward the tee) is low, so the sand stays in view
  assert.ok(h.heightAt(12, -158) < h.heightAt(12, -164) - 1.2, 'the bunker face is deep');
  assert.ok(h.heightAt(12, -151) < h.heightAt(12, -165) - 0.5, 'the front lip (toward the tee) is lower than the back face, so the sand stays in view');
  for (const pk of [0.9, 1, 1.1]) for (const acc of [0, 0.06]) {
    const e = shot(startAt(h, { x: 12, z: -158 }), { pk, acc });
    assert.equal(e.club, 'sw');
    assert.ok(['green', 'fringe'].includes(e.surface) || e.ev === 'holed', `bunker shot ×${pk} acc ${acc} ends on ${e.surface}`);
  }
  const bank = shot(startAt(h, { x: 0, z: 0 }, 0), { at: { x: 21, z: -170 }, acc: 0.07 });
  assert.ok(['green', 'fringe'].includes(bank.surface), `the bank shot ends on ${bank.surface}`);
  assert.equal(shot(startAt(h, { x: 0, z: 0 }, 0), { pk: 1.12 }).ev, 'penalty', 'long is wet (owner: the creek behind punishes long shots)');
});

test('mtn-07: the shelf is a short carry and a better angle; the left fairway is the long way in', () => {
  const h = HOLES['mtn-07'];
  const shelf = shot(startAt(h, { x: 0, z: 0 }, 0), { at: { x: 27, z: -250 }, club: 'driver', power: 1 });
  const safe = shot(startAt(h, { x: 0, z: 0 }, 0));
  assert.equal(shelf.surface, 'fairway');
  assert.ok(shelf.x > 10, 'the brave drive is on the shelf, right of the creek');
  assert.ok(safe.x < 0, 'the default drive is on the left fairway');
  assert.ok(shelf.toCup < safe.toCup - 15, `shelf leaves ${shelf.toCup.toFixed(0)} m, safe ${safe.toCup.toFixed(0)} m`);
});

test('mtn-08: drivable with a good drive; deep bunkers escaped with the Sand Wedge (PM #49)', () => {
  const h = HOLES['mtn-08'], green = { x: 0, z: -300 };
  const full = shot(startAt(h, { x: 0, z: 0 }, 0), { at: green, club: 'driver', power: 1 });
  assert.equal(full.surface, 'green', `a full straight Driver ends on ${full.surface}`);
  const good = shot(startAt(h, { x: 0, z: 0 }, 0), { at: green, club: 'driver', power: 0.9 });
  assert.ok(good.toCup < 25 && good.ev === 'stopped', `a 90% Driver leaves ${good.toCup.toFixed(0)} m`);
  assert.equal(shot(startAt(h, { x: 0, z: 0 }, 0), { at: green, club: 'driver', power: 1, acc: 0.06 }).ev, 'penalty', 'a hook finds the pond');
  for (const b of [{ x: 19, z: -284 }, { x: 19, z: -308 }]) {
    assert.ok(h.heightAt(b.x, b.z) < h.heightAt(b.x - 8, b.z) - 1, 'a deep hollow');
    for (const pk of [0.9, 1, 1.1]) for (const acc of [0, 0.06]) {
      const e = shot(startAt(h, b), { pk, acc });
      assert.equal(e.club, 'sw');
      assert.ok(['green', 'fringe'].includes(e.surface) || e.ev === 'holed', `bunker (${b.x}, ${b.z}) ×${pk} acc ${acc} ends on ${e.surface}`);
    }
  }
});

test('mtn-09: reachable in two with good, not perfect shots; the safe lay-up leaves a wedge; the fairway kisses the lake (PM #49, owner)', () => {
  const h = HOLES['mtn-09'];
  const drive = shot(startAt(h, { x: 0, z: 0 }, 0), { club: 'driver', power: 0.95 });
  assert.equal(drive.surface, 'fairway');
  for (const pk of [0.9, 0.95]) {
    const e = shot(startAt(h, { x: drive.x, z: drive.z }), { club: '3w', power: pk });
    assert.ok(['green', 'fringe'].includes(e.surface), `3 Wood ×${pk} ends on ${e.surface}`);
  }
  const p = startAt(h);
  shot(p);
  const e = layup(p, SAFE_LAYUP['mtn-09']);
  assert.equal(e.surface, 'fairway');
  assert.ok(e.toCup > 70 && e.toCup < 120, `the lay-up leaves ${e.toCup.toFixed(0)} m`);
  // the second leg's fairway runs right up to the lake's rock edge somewhere
  let kiss = false;
  for (let x = 20; x <= 70 && !kiss; x += 1) for (let z = -470; z <= -380 && !kiss; z += 1) {
    if (h.surfaceAt(x, z) === 'fairway' && ['rock', 'water'].includes(h.surfaceAt(x + 4, z)) ) kiss = true;
  }
  assert.ok(kiss, 'the fairway touches the lake edge');
});
