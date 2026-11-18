// Phase V (V1, V2, V5): the camera views are pure math in core (core/views.js); the game only eases
// toward them. These check the "never a blind shot" rule on every hole, in phone portrait and landscape.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aimView, landingView, readView, project, lineClear, nextView, VIEW_STEPS } from '../src/core/views.js';
import { TUNE } from '../src/core/config.js';
import { createHolePlay } from '../src/core/play.js';
import { HOLES } from '../src/holes/sets.js';
import { SCENARIOS } from '../src/holes/scenarios.js';
import { dirFromAim } from '../src/core/vec.js';

// The free band as session.js measures it on two phones (390×844 portrait: below the scorecard, above
// the meter panel; 844×390 landscape: from the top, above the meter panel)
const PORTRAIT = { aspect: 390 / 844, fov: 55, top: 140 / 844, bottom: 690 / 844 };
const LANDSCAPE = { aspect: 844 / 390, fov: 55, top: 0, bottom: 245 / 390 };
const FRAMES = { portrait: PORTRAIT, landscape: LANDSCAPE };
const flat = () => 0;
// Screen fraction (0 = top, 1 = bottom) of a point, and whether it is in the band and on screen
const frac = (view, p, f) => { const s = project(view, p, f); return { ...s, y01: (1 - s.y) / 2 }; };
const inBand = (s, f, slack = 0.01) => s.front && Math.abs(s.x) <= 1 && s.y01 >= f.top - slack && s.y01 <= f.bottom + slack;
const bandPos = (f, k) => f.top + k * (f.bottom - f.top);

test('V1: on flat ground the ball and the marker show where the tunables put them (portrait and landscape)', () => {
  for (const [name, f] of Object.entries(FRAMES)) {
    for (const D of [40, 80, 150, 230, 290]) {
      const ball = { x: 0, y: 0, z: 0 }, mark = { x: 0, y: 0, z: -D };
      const v = aimView(flat, { ball, dir: { x: 0, z: -1 }, mark }, f);
      const b = frac(v, ball, f), m = frac(v, mark, f);
      assert.ok(Math.abs(b.y01 - bandPos(f, TUNE.CAM_AIM_BALL)) < 0.005, `${name} ${D} m: ball at ${b.y01}`);
      assert.ok(Math.abs(m.y01 - bandPos(f, TUNE.CAM_AIM_MARK)) < 0.01, `${name} ${D} m: marker at ${m.y01}`);
      assert.ok(Math.abs(b.x) < 1e-9 && Math.abs(m.x) < 1e-9, 'both on the screen\'s centre line');
      assert.ok(v.pos.y > 0, 'above the ground');
    }
  }
});

test('V1: a longer shot puts the camera further back and higher (more of the landing area)', () => {
  let last = null;
  for (const D of [60, 120, 180, 240]) {
    const v = aimView(flat, { ball: { x: 0, y: 0, z: 0 }, dir: { x: 0, z: -1 }, mark: { x: 0, y: 0, z: -D } }, PORTRAIT);
    if (last) assert.ok(v.pos.z >= last.pos.z && v.pos.y >= last.pos.y, `${D} m`);
    last = v;
  }
});

test('V1: a hill between the ball and the marker never hides it (the camera steps back and up)', () => {
  // A 12 m ridge 60 m ahead, the marker 160 m out behind it
  const ridge = (x, z) => 12 * Math.exp(-(((z + 60) / 15) ** 2));
  const ball = { x: 0, y: 0, z: 0 }, mark = { x: 0, y: 0, z: -160 };
  for (const f of Object.values(FRAMES)) {
    const v = aimView(ridge, { ball, dir: { x: 0, z: -1 }, mark }, f);
    assert.ok(lineClear(ridge, v.pos, { ...mark, y: 0.3 }), 'the marker is in sight');
    assert.ok(inBand(frac(v, mark, f), f) && inBand(frac(v, ball, f), f), 'ball and marker on screen');
  }
});

// Every hole and every scenario: the default aim with every club the bag can reach from there
function* spots() {
  for (const hole of Object.values(HOLES)) yield { label: `${hole.id} tee`, hole, start: null };
  for (const [id, sc] of Object.entries(SCENARIOS)) yield { label: id, hole: HOLES[sc.hole], start: { id, ...sc } };
}
test('V1 never blind: on every hole and scenario, the ball and the aim marker are on screen and in sight, for every club', () => {
  let checked = 0;
  for (const { label, hole, start } of spots()) {
    const play = createHolePlay(hole, { seed: 1 });
    play.reset(start);
    const ball = { ...play.ball.pos }, h = play.terrain.heightAt;
    for (let i = 0; i < play.bag.length; i++) {
      play.setClub(i);
      const putt = !!play.club.putter, d = dirFromAim(play.aim);
      let mark;
      if (putt) { const len = Math.min(play.distToCup(), play.puttMax); mark = { x: ball.x + d.x * len, z: ball.z + d.z * len }; mark.y = h(mark.x, mark.z); }
      else mark = play.aimMarks();
      for (const [name, f] of Object.entries(FRAMES)) {
        const v = aimView(h, { ball, dir: d, mark, putt }, f);
        const why = `${label} ${play.club.name} ${name}`;
        assert.ok(inBand(frac(v, ball, f), f), `${why}: ball off screen`);
        assert.ok(inBand(frac(v, mark, f), f), `${why}: marker off screen`);
        assert.ok(lineClear(h, v.pos, { ...mark, y: mark.y + 0.3 }), `${why}: a hill hides the marker`);
        assert.ok(v.pos.y >= h(v.pos.x, v.pos.z), `${why}: camera under the ground`);
        checked++;
      }
    }
  }
  assert.ok(checked > 200, `checked ${checked}`);
});

test('V2: the landing view shows the marker in the free band, from behind and above it', () => {
  for (const hole of Object.values(HOLES)) {
    const play = createHolePlay(hole, { seed: 1 }); play.reset();
    const m = play.aimMarks(), d = dirFromAim(play.aim), ball = play.ball.pos;
    for (const [name, f] of Object.entries(FRAMES)) {
      const v = landingView(play.terrain.heightAt, { ball, dir: d, mark: m }, f);
      const s = frac(v, m, f);
      assert.ok(inBand(s, f), `${hole.id} ${name}: marker at ${s.y01}`);
      assert.ok(v.pos.y > m.y, `${hole.id}: above the landing`);
      assert.ok(Math.hypot(v.pos.x - m.x, v.pos.z - m.z) < Math.hypot(ball.x - m.x, ball.z - m.z), 'closer to the landing than the ball is');
    }
  }
});

test('V2: the green-reading views show the ball and the cup (from above: both in the band; low: the cup ahead)', () => {
  for (const id of ['h1-green', 'h2-green-step']) {
    const sc = SCENARIOS[id], hole = HOLES[sc.hole];
    const play = createHolePlay(hole, { seed: 1 }); play.reset({ id, ...sc });
    const ball = play.ball.pos, d = dirFromAim(play.aim), cup = play.cup, h = play.terrain.heightAt;
    for (const [name, f] of Object.entries(FRAMES)) {
      const above = readView(h, { ball, dir: d, cup }, 'above', f);
      assert.ok(inBand(frac(above, ball, f), f) && inBand(frac(above, cup, f), f), `${id} ${name}: above`);
      assert.ok(frac(above, cup, f).y01 < frac(above, ball, f).y01, `${id} ${name}: the putt runs up the screen`);
      const low = readView(h, { ball, dir: d, cup }, 'low', f);
      assert.ok(inBand(frac(low, cup, f), f), `${id} ${name}: low`);
      assert.ok(low.pos.y - h(low.pos.x, low.pos.z) < 1, 'low = near the grass');
    }
  }
});

test('V2: a tap steps through the views of the shot and then back to the aiming view', () => {
  assert.deepEqual(VIEW_STEPS.full, ['landing']);
  assert.equal(nextView(null, false), 'landing');
  assert.equal(nextView('landing', false), null);
  assert.equal(nextView(null, true), 'above');
  assert.equal(nextView('above', true), 'low');
  assert.equal(nextView('low', true), null);
  assert.equal(nextView('landing', true), 'above', 'a full-shot view on a putt starts the putt views');
});

test('V5: views are pure: the same inputs give the same view', () => {
  const a = aimView(flat, { ball: { x: 1, y: 2, z: 3 }, dir: { x: 0.6, z: -0.8 }, mark: { x: 100, y: 0, z: -150 } }, PORTRAIT);
  const b = aimView(flat, { ball: { x: 1, y: 2, z: 3 }, dir: { x: 0.6, z: -0.8 }, mark: { x: 100, y: 0, z: -150 } }, PORTRAIT);
  assert.deepEqual(a, b);
});
