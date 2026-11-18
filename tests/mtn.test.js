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
const LENGTH = { 3: [110, 190], 4: [260, 400], 5: [420, 500] };
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
export function startAt(hole, ball = null, strokes = 1) {
  const p = createHolePlay(hole, { seed: 1 });
  p.reset({ seed: 1, wind: { x: 0, z: 0 }, ...(ball ? { ball, strokes } : {}) });
  return p;
}

test('Mountain 9: every hole validates, has its plan par and a length inside the guide range', () => {
  const plan = { 'mtn-01': [4, 340], 'mtn-02': [4, 300], 'mtn-03': [3, 150], 'mtn-04': [5, 450], 'mtn-05': [4, 360], 'mtn-06': [3, 175], 'mtn-07': [4, 390], 'mtn-08': [4, 280], 'mtn-09': [5, 490] };
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

test('Mountain 9: a straight, sensible round of the safe line makes par or better on every hole', () => {
  for (const h of MTN) {
    const p = startAt(h);
    for (let k = 0; k < 8 && !p.finished; k++) shot(p);
    assert.ok(p.finished, h.id);
    assert.ok(p.finished.strokes <= h.par, `${h.id}: ${p.finished.strokes} strokes on a par ${h.par}`);
  }
});

test('mtn-02: a full drive carries the corner pines; a clipped one drops into playable rough (PM #49)', () => {
  const h = HOLES['mtn-02'], green = { x: 84, z: -257 };
  const full = shot(startAt(h, { x: 0, z: 0 }, 0), { at: green, club: 'driver', power: 1 });
  assert.equal(full.surface, 'fairway');
  assert.ok(full.toCup < 50, `the brave drive leaves ${full.toCup.toFixed(0)} m`);
  for (const pk of [0.9, 0.85, 0.8]) {
    const weak = shot(startAt(h, { x: 0, z: 0 }, 0), { at: green, club: 'driver', power: 1, pk });
    assert.equal(weak.ev, 'stopped');
    assert.equal(weak.surface, 'rough', `a ${pk * 100}% drive ends on ${weak.surface}`);
  }
});

test('mtn-03: the safe shot finds the green; a hook at the flag finds the creek', () => {
  const h = HOLES['mtn-03'];
  assert.equal(shot(startAt(h, { x: 0, z: 0 }, 0)).surface, 'green');
  const hook = shot(startAt(h, { x: 0, z: 0 }, 0), { at: h.cup, acc: 0.08 });
  assert.equal(hook.ev, 'penalty');
});
