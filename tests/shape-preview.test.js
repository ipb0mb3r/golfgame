// Phase BC, BC4 + BC5: the aim line, the marker and the warning show the SHAPED shot ("no surprises",
// never a blind shot), and the ball icon's rules (core/shape.js). The game only draws what these return.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHolePlay } from '../src/core/play.js';
import { CENTRE, impactFromOffset, stepImpact, isDoubleTap, impactCaption, clampImpact } from '../src/core/shape.js';
import { IMPACT_UI } from '../src/core/config.js';
import { landingView, project, lineClear } from '../src/core/views.js';
import { resetAllTunables, applyTune } from '../src/core/tune.js';
import { HOLES } from '../src/holes/sets.js';
import { SCENARIOS } from '../src/holes/scenarios.js';
import { dirFromAim, dist2D } from '../src/core/vec.js';
import { testHole } from './helpers.js';

afterEach(() => resetAllTunables());

const IMPACTS = [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -0.7, y: -0.7 }, { x: 0.7, y: 0.7 }];
const NO_WIND = { x: 0, z: 0 };
const PORTRAIT = { aspect: 390 / 844, fov: 55, top: 140 / 844, bottom: 690 / 844 };
const LANDSCAPE = { aspect: 844 / 390, fov: 55, top: 0, bottom: 245 / 390 };
const inBand = (v, p, f) => {
  const s = project(v, p, f), y01 = (1 - s.y) / 2;
  return s.front && Math.abs(s.x) <= 1 && y01 >= f.top - 0.01 && y01 <= f.bottom + 0.01;
};

// Every hole's tee and every scenario spot, with no wind (the aim line shows a windless shot)
function* spots() {
  for (const hole of Object.values(HOLES)) yield { label: `${hole.id} tee`, hole, start: { wind: NO_WIND } };
  for (const [id, sc] of Object.entries(SCENARIOS)) yield { label: id, hole: HOLES[sc.hole], start: { id, ...sc, wind: NO_WIND } };
}
// The real shot from here: club i, the default aim, full (capped) power, a perfect timing, this impact.
// Returns where it first came down, whether it touched an obstacle first, and where it stopped.
function realShot(hole, start, i, impact) {
  const p = createHolePlay(hole, { seed: 1 });
  p.reset(start);
  p.setClub(i); p.setImpact(impact);
  p.hit(p.lieOf().maxPower, 0);
  let land = null, hitFirst = false, touched = false;
  while (p.ball.moving) {
    const ev = p.step();
    if (ev?.type === 'hitObstacle' || ev?.type === 'hitLeaves') { touched = true; if (!land) hitFirst = true; }
    if (!land && (ev?.type === 'landed' || !p.ball.moving)) land = { ...p.ball.pos };
  }
  return { land, hitFirst, touched, rest: { ...p.ball.pos } };
}

test('BC4: a centre hit shows exactly the aim line, marker and warning of before Phase BC (no `shape`)', () => {
  for (const hole of Object.values(HOLES)) {
    const p = createHolePlay(hole, { seed: 1 }); p.reset();
    const before = p.aimMarks(), warn = p.shotWarning();
    assert.equal(before.shape, undefined);
    p.setImpact({ x: 0.5, y: 0.5 }); p.aimMarks(); p.shotWarning();
    p.setImpact(CENTRE);
    assert.deepEqual(p.aimMarks(), before, hole.id);
    assert.deepEqual(p.shotWarning(), warn, hole.id);
    // a putt never shapes
    const q = createHolePlay(hole, { seed: 1 }); q.reset(); q.setClub(q.PUTTER); q.setImpact({ x: -1, y: 0 });
    assert.equal(q.aimMarks(), null);
  }
});

test('BC4 never blind: on every hole and scenario, every club, a shaped default shot lands at the marker, stops at the shown end, or is warned', () => {
  let checked = 0, warned = 0;
  for (const { label, hole, start } of spots()) {
    const p = createHolePlay(hole, { seed: 1 });
    p.reset(start);
    for (let i = 0; i < p.bag.length; i++) {
      if (p.bag[i].putter) continue;
      p.setClub(i);
      for (const impact of IMPACTS) {
        p.setImpact(impact);
        const m = p.aimMarks(), warn = p.shotWarning(), why = `${label} ${p.club.name} (${impact.x}, ${impact.y})`;
        const real = realShot(hole, start, i, impact);
        if (!m.shape) { assert.ok(p.surfaces[p.lie].shape === 0, `${why}: only a lie with no shaping shows no shape`); continue; }
        assert.ok(m.shape.path.length >= 2 && m.shape.roll.length >= 1, why);
        // the line starts at the ball and its flight part ends at the marker
        assert.ok(dist2D(m.shape.path[0], p.ball.pos) < 1e-9 && dist2D(m.shape.path.at(-1), m) < 1e-9, `${why}: the line runs ball → marker`);
        if (warn) {
          warned++;
          assert.ok(real.hitFirst || dist2D(real.land, m) > 1e-6, `${why}: warned but the real shot flies clear to the marker`);
        } else {
          assert.ok(!real.hitFirst, `${why}: the real shot hits an obstacle with no warning`);
          assert.ok(dist2D(real.land, m) < 1e-6, `${why}: lands ${dist2D(real.land, m).toFixed(3)} m from the marker`);
          // where it stops: the shown end (the real ball's own lip-out draws may differ near the cup)
          // (and a slow roll can touch a rock without an event), so this one is checked to 0.5 m
          if (!real.touched && dist2D(real.rest, p.cup) > 2) assert.ok(dist2D(real.rest, m.shape.rest) < 0.5, `${why}: stops ${dist2D(real.rest, m.shape.rest).toFixed(3)} m from the shown end`);
        }
        // the 🔍 Landing view shows the shaped marker
        for (const f of [PORTRAIT, LANDSCAPE]) {
          const v = landingView(p.terrain.heightAt, { ball: p.ball.pos, dir: dirFromAim(p.aim), mark: m }, f);
          assert.ok(inBand(v, m, f) && lineClear(p.terrain.heightAt, v.pos, { ...m, y: m.y + 0.3 }), `${why}: the landing view shows the marker`);
        }
        checked++;
      }
    }
  }
  assert.ok(checked > 300, `checked ${checked}`);
  assert.ok(warned > 0, 'some shaped shots hit trees (the warning is exercised)');
});

test('BC4: the shaped line goes out and back (left impact: out left, lands near the line, runs on right), ticks too', () => {
  const hole = testHole({ surfaceAt: () => 'fairway', cup: { x: 0, z: -5000 } });
  const p = createHolePlay(hole, { seed: 1 }); p.reset(); p.setAim(0);
  for (let i = 0; i < p.bag.length; i++) {
    if (p.bag[i].putter) continue;
    p.setClub(i); p.setAim(0);
    const straight = p.aimMarks();
    p.setImpact({ x: -1, y: 0 });
    const m = p.aimMarks();
    assert.ok(Math.min(...m.shape.path.map(q => q.x)) < -0.5, `${p.club.name}: out to the left`);
    assert.ok(Math.abs(m.x) < 0.3, `${p.club.name}: lands on the aim line (BC_BACK 1)`);
    assert.ok(m.shape.rest.x > m.x + 0.2, `${p.club.name}: runs on to the right`);
    // the same carry along its own start line, so a little shorter down the aim line (× cos start)
    const start = p.bag[i].shape.start * Math.PI / 180;
    assert.ok(Math.abs(m.dist - straight.dist * Math.cos(start)) < 0.5, `${p.club.name}: same carry (${m.dist.toFixed(2)} vs ${straight.dist.toFixed(2)})`);
    for (const t of m.ticks) assert.ok(Math.abs(t.x) < 0.3, 'ticks on the line too');
    p.setImpact({ x: 1, y: 0 });
    const r = p.aimMarks();
    assert.ok(Math.abs(r.shape.rest.x + m.shape.rest.x) < 1e-6, 'right mirrors left');
    // bottom = less roll, top = more roll than the centre
    const run = pt => { p.setImpact(pt); const q = p.aimMarks(); return dist2D(q, q.shape.rest); };
    p.setImpact(CENTRE);
    assert.ok(run({ x: 0, y: -1 }) < run({ x: 0, y: 1 }), `${p.club.name}: high rolls less than low`);
    p.setImpact(CENTRE);
  }
  // BC_BACK 0.88 (the owner's comparison): it lands short of the line, on the start side
  applyTune('BC_BACK:0.88');
  p.setClub(0); p.setImpact({ x: -1, y: 0 });
  assert.ok(p.aimMarks().x < -0.3);
});

test('BC4: the warning follows the curve (a tree beside the line is hit only by the shot that bends into it)', () => {
  // a tall thin tree half way, 4.5 m left of the aim line: a straight 7 iron passes it, a left-impact
  // one bulges out left into it (≈ 4.6 m at the middle of its flight)
  const tree = { type: 'tree', x: -4.5, z: -75, trunkR: 0.4, trunkH: 40, canopyR: 0.5, canopyH: 1 };
  const hole = testHole({ surfaceAt: () => 'fairway', cup: { x: 0, z: -5000 }, obstacles: [tree] });
  const p = createHolePlay(hole, { seed: 1 }); p.reset(); p.setAim(0);
  p.setClub(p.bag.findIndex(c => c.id === '7i')); p.setAim(0);
  assert.equal(p.shotWarning(), null, 'straight: clear');
  p.setImpact({ x: -1, y: 0 });
  assert.ok(p.shotWarning(), 'left impact: warned');
  p.setImpact({ x: 1, y: 0 });
  assert.equal(p.shotWarning(), null, 'right impact: clear');
});

test('BC5: a press on the ball icon gives the impact point (screen y down = bottom), snapping to the centre', () => {
  assert.deepEqual(impactFromOffset(0, 0, 32), CENTRE);
  assert.deepEqual(impactFromOffset(32 * IMPACT_UI.snap * 0.9, 0, 32), CENTRE, 'near the centre = the centre');
  assert.deepEqual(impactFromOffset(-32, 0, 32), { x: -1, y: -0 });
  const b = impactFromOffset(0, 16, 32);
  assert.ok(b.x === 0 && b.y === -0.5, 'below the centre = the bottom of the ball');
  const far = impactFromOffset(64, -64, 32);
  assert.ok(Math.abs(Math.hypot(far.x, far.y) - 1) < 1e-12 && far.x > 0 && far.y > 0, 'outside the ball: on the rim');
  assert.deepEqual(impactFromOffset(5, 5, 0), CENTRE);
});

test('BC5: Shift + arrows step the dot on a grid, inside the disc, and back to the exact centre', () => {
  let pt = CENTRE;
  for (let k = 0; k < 6; k++) pt = stepImpact(pt, -1, 0);
  assert.deepEqual(pt, { x: -1, y: 0 }, 'stops at the rim');
  for (let k = 0; k < 4; k++) pt = stepImpact(pt, 1, 0);
  assert.equal(pt, CENTRE);
  pt = stepImpact(stepImpact(stepImpact(CENTRE, 0, 1), 0, 1), 1, 0);
  assert.deepEqual(pt, { x: 0.25, y: 0.5 });
  for (let k = 0; k < 8; k++) pt = stepImpact(pt, 1, 1);
  assert.ok(Math.hypot(pt.x, pt.y) <= 1 + 1e-12, 'a corner stays on the ball');
  assert.deepEqual(clampImpact(pt), pt);
});

test('BC5: double tap resets; the caption says what the dot does (handedness mirrors it)', () => {
  assert.ok(isDoubleTap(1000, 1000 + IMPACT_UI.doubleTapMs - 1));
  assert.ok(!isDoubleTap(1000, 1000 + IMPACT_UI.doubleTapMs));
  assert.ok(!isDoubleTap(-Infinity, 1000));
  assert.equal(impactCaption(CENTRE), '');
  assert.equal(impactCaption({ x: -0.7, y: -0.7 }), 'High · starts ◀ curves ▶');
  assert.equal(impactCaption({ x: 1, y: 0 }), 'starts ▶ curves ◀');
  assert.equal(impactCaption({ x: 0, y: 0.5 }), 'Low');
  assert.equal(impactCaption({ x: -1, y: 0 }, 'left'), 'starts ▶ curves ◀');
});

test('BC5: the impact point resets to the centre for every shot, and a putt ignores it', () => {
  const hole = testHole({ surfaceAt: () => 'fairway', cup: { x: 0, z: -5000 } });
  const p = createHolePlay(hole, { seed: 1 }); p.reset();
  p.setImpact({ x: -1, y: 0.3 });
  p.hit(1, 0); p.simulate(); p.proceed();
  assert.deepEqual(p.impact, CENTRE);
});

test('BC4 (PR #68): the flight camera\'s landing is the shaped one off the centre, and exactly landingPoint at the centre', () => {
  for (const hole of Object.values(HOLES)) {
    const p = createHolePlay(hole, { seed: 1 }); p.reset({ wind: NO_WIND });
    p.setClub(0);
    for (const pw of [0.5, 1]) {
      assert.deepEqual(p.flightLanding(0, p.aim, pw), p.landingPoint(0, p.aim, pw), hole.id);
      for (const imp of [{ x: -1, y: 0 }, { x: 1, y: 0 }]) {
        p.setImpact(imp);
        const real = realShot(hole, { wind: NO_WIND }, 0, imp), q = p.flightLanding(0, p.aim, p.lieOf().maxPower);
        if (pw === 1) assert.ok(dist2D(q, real.land) < 0.5 || real.hitFirst, `${hole.id} ${imp.x}`);
        p.setImpact(CENTRE);
      }
    }
    // BC_BACK:1 brings a shaped shot back onto the aim line; with less curve back (0.88) the left and
    // right shaped landings sit on opposite sides of the straight one, and the camera follows them
    applyTune('BC_BACK:0.88');
    const s = p.landingPoint(0), d = dirFromAim(p.aim), side = q => (q.x - s.x) * d.z - (q.z - s.z) * d.x;
    p.setImpact({ x: -1, y: 0 }); const l = side(p.flightLanding(0));
    p.setImpact({ x: 1, y: 0 }); const r = side(p.flightLanding(0));
    assert.ok(Math.sign(l) !== Math.sign(r) && Math.abs(l) > 1 && Math.abs(r) > 1, `${hole.id} ${l} ${r}`);
    p.setImpact(CENTRE); resetAllTunables();
  }
});
