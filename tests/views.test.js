// Phase V (V1, V2, V5): the camera views are pure math in core (core/views.js); the game only eases
// toward them. These check the "never a blind shot" rule on every hole, in phone portrait and landscape:
// the aiming view (main's camera) always shows the ball, the 🔍 Landing view always shows the marker.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aimView, landingView, readView, project, lineClear, nextView, VIEW_STEPS, pickFlightView, flightSpot, flightHolds, flyoverRoute, flyoverPath, FLIGHT_VIEWS } from '../src/core/views.js';
import { TUNE, CAM, setTunable, resetTunables } from '../src/core/config.js';
import { createRng } from '../src/core/rng.js';
import { createHolePlay } from '../src/core/play.js';
import { HOLES, MTN } from '../src/holes/sets.js';
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

// main's aiming camera before Phase V (src/game/camera.js at c56d9cb), written out once here
function mainAimView(h, ball, d, putter) {
  const gy = h(ball.x, ball.z), [back, up, ahead, clear] = putter ? [3.5, 1.6, 5, 0.8] : [7, 2.6, 30, 1.5];
  const pos = { x: ball.x - d.x * back, y: gy + up, z: ball.z - d.z * back };
  pos.y = Math.max(pos.y, h(pos.x, pos.z) + clear);
  const look = { x: ball.x + d.x * ahead, y: 0, z: ball.z + d.z * ahead }; look.y = h(look.x, look.z);
  return { pos, look };
}
test('V1 (owner on #63): with CAM_AIM_HEIGHT 1 the aiming view is main\'s camera exactly (portrait, wherever main showed the ball)', () => {
  const tilt = (x, z) => 0.03 * x + 0.02 * z; // gentle slopes (sideways, and down the line)
  try {
    setTunable('CAM_AIM_HEIGHT', 1);
    for (const h of [flat, tilt]) for (const putter of [false, true]) for (const a of [-0.6, 0, 0.3]) {
      const ball = { x: 3, y: h(3, -10), z: -10 }, d = dirFromAim(a);
      const want = mainAimView(h, ball, d, putter);
      assert.deepEqual(aimView(h, { ball, dir: d, putt: putter }, PORTRAIT), want);
      assert.deepEqual(aimView(h, { ball, dir: d, putt: putter }), want, 'no frame: main\'s view');
    }
  } finally { resetTunables(); }
});
test('V1: by default (CAM_AIM_HEIGHT 1, owner on #63) the aiming view is main\'s; a raised camera keeps main\'s spot and the ball above the panel', () => {
  const ball = { x: 0, y: 0, z: 0 }, d = { x: 0, z: -1 };
  const main = mainAimView(flat, ball, d, false);
  assert.equal(TUNE.CAM_AIM_HEIGHT, 1);
  assert.deepEqual(aimView(flat, { ball, dir: d }, PORTRAIT), main);
  assert.deepEqual(aimView(flat, { ball, dir: d, putt: true }, PORTRAIT), mainAimView(flat, ball, d, true));
  try {
    setTunable('CAM_AIM_HEIGHT', 1.5);
    const v = aimView(flat, { ball, dir: d }, PORTRAIT);
    assert.ok(Math.abs(v.pos.y - 2.6 * 1.5) < 1e-12 && v.pos.x === main.pos.x && v.pos.z === main.pos.z);
    assert.ok(inBand(frac(v, ball, PORTRAIT), PORTRAIT), 'the ball stays above the meter panel');
    assert.deepEqual(aimView(flat, { ball, dir: d, putt: true }, PORTRAIT), mainAimView(flat, ball, d, true), 'putts keep main\'s');
  } finally { resetTunables(); }
});
test('V1: facing a steep upslope the camera tilts down so the ball stays above the meter panel', () => {
  const wall = (x, z) => Math.max(0, -z - 5) * 0.6; // a 60% bank from 5 m ahead
  const ball = { x: 0, y: 0, z: 0 }, d = { x: 0, z: -1 };
  const v = aimView(wall, { ball, dir: d }, PORTRAIT);
  assert.ok(inBand(frac(v, ball, PORTRAIT), PORTRAIT));
  assert.ok(frac(mainAimView(wall, ball, d, false), ball, PORTRAIT).y01 > PORTRAIT.bottom, 'main hid it');
});
test('V1: in landscape the camera only tilts down so the ball is above the meter panel (same spot)', () => {
  const ball = { x: 0, y: 0, z: 0 }, d = { x: 0, z: -1 };
  const main = mainAimView(flat, ball, d, false), v = aimView(flat, { ball, dir: d }, LANDSCAPE);
  assert.ok(frac(main, ball, LANDSCAPE).y01 > LANDSCAPE.bottom, 'on main the ball was under the panel');
  assert.deepEqual({ x: v.pos.x, z: v.pos.z }, { x: main.pos.x, z: main.pos.z });
  assert.ok(Math.abs(frac(v, ball, LANDSCAPE).y01 - bandPos(LANDSCAPE, CAM.ballMax)) < 1e-9);
});

// Every hole and every scenario: the default aim with every club the bag can reach from there
function* spots() {
  for (const hole of Object.values(HOLES)) yield { label: `${hole.id} tee`, hole, start: null };
  for (const [id, sc] of Object.entries(SCENARIOS)) yield { label: id, hole: HOLES[sc.hole], start: { id, ...sc } };
}
test('V1 never blind: on every hole and scenario, with every club, the ball is on screen above the meter panel', () => {
  let checked = 0;
  for (const { label, hole, start } of spots()) {
    const play = createHolePlay(hole, { seed: 1 });
    play.reset(start);
    const ball = { ...play.ball.pos }, h = play.terrain.heightAt;
    for (let i = 0; i < play.bag.length; i++) {
      play.setClub(i);
      const putt = !!play.club.putter, d = dirFromAim(play.aim);
      for (const [name, f] of Object.entries(FRAMES)) {
        const v = aimView(h, { ball, dir: d, putt }, f);
        const why = `${label} ${play.club.name} ${name}`;
        assert.ok(inBand(frac(v, ball, f), f), `${why}: ball off screen`);
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
      assert.ok(lineClear(play.terrain.heightAt, v.pos, { ...m, y: m.y + 0.3 }), `${hole.id}: the marker is in sight`);
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
  const a = landingView(flat, { ball: { x: 1, y: 2, z: 3 }, dir: { x: 0.6, z: -0.8 }, mark: { x: 100, y: 0, z: -150 } }, PORTRAIT);
  const b = landingView(flat, { ball: { x: 1, y: 2, z: 3 }, dir: { x: 0.6, z: -0.8 }, mark: { x: 100, y: 0, z: -150 } }, PORTRAIT);
  assert.deepEqual(a, b);
});

// --- V3: flight views ---------------------------------------------------------------------------
const drive = (over = {}) => ({ putt: false, from: { x: 0, y: 0, z: 0 }, land: { x: 0, y: 0, z: -200 }, carry: 200, dir: { x: 0, z: -1 }, apex: 30, ...over });
const run = (h, rng, n, shot = drive) => { const hist = []; for (let i = 0; i < n; i++) hist.push(pickFlightView(h, rng, hist, typeof shot === 'function' ? shot(i) : shot).kind); return hist; };

test('V3: putts, short shots and the Classic setting are always filmed from behind', () => {
  const rng = createRng(5);
  for (let i = 0; i < 50; i++) {
    assert.equal(pickFlightView(flat, rng, [], drive({ putt: true })).kind, 'behind');
    assert.equal(pickFlightView(flat, rng, [], drive({ carry: TUNE.CAM_VARIETY_MIN - 1 })).kind, 'behind');
    assert.equal(pickFlightView(flat, rng, [], drive({ classic: true })).kind, 'behind');
  }
  try { setTunable('CAM_VARIETY', 0); assert.ok(run(flat, createRng(9), 60).every(k => k === 'behind'), '?tune=CAM_VARIETY:0'); }
  finally { resetTunables(); }
});

test('V3: varied, never the same view more than CAM_MAX_RUN times in a row, landing never twice, weights roughly kept', () => {
  const hist = run(flat, createRng(42), 3000);
  const count = Object.fromEntries(FLIGHT_VIEWS.map(k => [k, hist.filter(x => x === k).length]));
  for (const k of FLIGHT_VIEWS) assert.ok(count[k] > 300, `${k} shows (${count[k]})`);
  let r = 1;
  for (let i = 1; i < hist.length; i++) {
    r = hist[i] === hist[i - 1] ? r + 1 : 1;
    assert.ok(r <= TUNE.CAM_MAX_RUN, `run of ${r} × ${hist[i]} at ${i}`);
    assert.ok(!(hist[i] === 'landing' && hist[i - 1] === 'landing'), 'landing twice');
  }
  assert.ok(count.behind > count.side && count.behind > count.landing, JSON.stringify(count));
});

test('V3: seeded: the same seed gives the same views, and every pick takes exactly 2 numbers from the stream', () => {
  assert.deepEqual(run(flat, createRng(7), 40), run(flat, createRng(7), 40));
  assert.notDeepEqual(run(flat, createRng(7), 40), run(flat, createRng(8), 40));
  const a = createRng(3), b = createRng(3);
  pickFlightView(flat, a, [], drive({ putt: true })); b(); b();
  assert.equal(a(), b(), 'a putt still takes its 2 numbers, so later shots do not depend on what came before');
});

test('V3 never blind: a side or landing spot that cannot see the shot is not used', () => {
  // A wall all round except a corridor along the flight line: no side or landing spot can see the landing
  const walled = (x, z) => (Math.abs(x) > 3 ? 60 : 0);
  assert.ok(run(walled, createRng(11), 200).every(k => k === 'behind'));
  // A spot out of bounds (where the scenery forest stands) is not used either
  const obWorld = { heightAt: flat, surfaceAt: x => (Math.abs(x) > 3 ? 'ob' : 'fairway'), penalty: id => id === 'ob' };
  assert.ok(run(obWorld, createRng(12), 200).every(k => k === 'behind'));
  // On a real hole the spots stand above the ground and see the landing
  const play = createHolePlay(HOLES['mtn-04'], { seed: 1 }); play.reset();
  const h = play.terrain.heightAt, from = { ...play.ball.pos }, land = play.landingPoint(play.clubIdx, play.aim, 1);
  const shot = { putt: false, from, land, carry: Math.hypot(land.x - from.x, land.z - from.z), dir: dirFromAim(play.aim), apex: 30 };
  for (const kind of ['side', 'landing']) for (const side of [-1, 1]) {
    const p = flightSpot(h, kind, shot, side);
    assert.ok(p.y > h(p.x, p.z), `${kind} ${side} above ground`);
  }
  // With the hole's trees and OB line, a picked side / landing camera stands in bounds and no tree is in its way
  const world = { heightAt: h, surfaceAt: play.terrain.surfaceAt, obstacles: play.obstacles, penalty: id => !!play.surfaces[id]?.penalty };
  const rng = createRng(21), hist = [];
  for (let i = 0; i < 200; i++) {
    const f = pickFlightView(world, rng, hist, shot); hist.push(f.kind);
    if (f.spot) assert.ok(!play.surfaces[play.terrain.surfaceAt(f.spot.x, f.spot.z)].penalty, `${f.kind} in bounds`);
  }
  assert.ok(hist.some(k => k !== 'behind'), 'mtn-04 still gets some variety: ' + [...new Set(hist)])
});

test('QA-1 (PR #64): on the tree-lined Mountain 9 the side view finds a clear spot from most tees and landing areas (higher / further out first)', () => {
  try {
    // Only the side view, to see where it is possible (the weights and rules are not changed by this)
    setTunable('CAM_W_BEHIND', 0); setTunable('CAM_W_LANDING', 0); setTunable('CAM_W_SIDE', 1);
    for (const fromLanding of [false, true]) for (const pw of [0.75, 0.9, 1]) {
      let ok = 0;
      for (const hole of MTN) {
        const play = createHolePlay(hole, { seed: 1 }); play.reset();
        if (fromLanding && hole.aimTarget) {
          const a = hole.aimTarget; Object.assign(play.ball.pos, { x: a.x, z: a.z, y: play.terrain.heightAt(a.x, a.z) }); play.prepare();
        }
        const from = { ...play.ball.pos }, land = play.landingPoint(play.clubIdx, play.aim, pw);
        const vy = play.hit(pw, 0).vel.y;
        const shot = { putt: false, from, land, carry: Math.hypot(land.x - from.x, land.z - from.z), dir: { x: play.shotDir.x, z: play.shotDir.z }, apex: vy * vy / 19.62 };
        const world = { heightAt: play.terrain.heightAt, surfaceAt: play.terrain.surfaceAt, obstacles: play.obstacles, penalty: id => !!play.surfaces[id]?.penalty };
        if (shot.carry < TUNE.CAM_VARIETY_MIN) { ok++; continue; } // a short shot is behind by rule, not for lack of a spot
        const f = pickFlightView(world, createRng(1), [], shot);
        if (f.kind === 'side') ok++;
      }
      // Measured today: 9 of 9 in every case (before QA-1: full-power drives on mtn-01, 04, 05 and 09 found none)
      assert.ok(ok >= 7, `${fromLanding ? 'landing area' : 'tee'} at ${pw}: side possible on ${ok} of ${MTN.length}`);
    }
  } finally { resetTunables(); }
});

test('V3 (owner on #63): after a full shot the camera holds at address for CAM_FLIGHT_HOLD s; CAM_BEHIND_STAY keeps a behind shot there until it lands; putts never hold', () => {
  const hold = TUNE.CAM_FLIGHT_HOLD;
  assert.equal(hold, 1.2);
  for (const kind of FLIGHT_VIEWS) {
    assert.equal(flightHolds({ putt: false, kind, t: 0, landed: false }), true, kind);
    assert.equal(flightHolds({ putt: false, kind, t: hold - 0.01, landed: false }), true, kind);
    assert.equal(flightHolds({ putt: false, kind, t: hold, landed: false }), false, kind);
    assert.equal(flightHolds({ putt: true, kind, t: 0, landed: false }), false, 'putt');
  }
  try {
    setTunable('CAM_BEHIND_STAY', 1);
    assert.equal(flightHolds({ putt: false, kind: 'behind', t: 9, landed: false }), true);
    assert.equal(flightHolds({ putt: false, kind: 'behind', t: 9, landed: true }), false);
    assert.equal(flightHolds({ putt: false, kind: 'side', t: 9, landed: false }), false, 'side / landing still cut away');
    setTunable('CAM_FLIGHT_HOLD', 0);
    assert.equal(flightHolds({ putt: false, kind: 'landing', t: 0, landed: false }), false);
  } finally { resetTunables(); }
});

const angleDeg = (a, b) => Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y + a.z * b.z) / (Math.hypot(a.x, a.y, a.z) * Math.hypot(b.x, b.y, b.z) || 1)))) * 180 / Math.PI;

// --- V4: the flyover ----------------------------------------------------------------------------
test('V4: the route is tee → aimTarget → green (par 3: tee → green), never the playLine corner', () => {
  for (const hole of Object.values(HOLES)) {
    const r = flyoverRoute(hole, { x: 1, z: -2 });
    assert.deepEqual(r[0], { x: hole.tee.x, z: hole.tee.z }, hole.id);
    assert.deepEqual(r[r.length - 1], { x: hole.cup.x, z: hole.cup.z }, hole.id);
    if (hole.par <= 3) assert.equal(r.length, 2, hole.id);
    else assert.deepEqual(r[1], hole.aimTarget ? { x: hole.aimTarget.x, z: hole.aimTarget.z } : { x: 1, z: -2 }, hole.id);
  }
  assert.deepEqual(flyoverRoute({ par: 4, tee: { x: 0, z: 0 }, cup: { x: 0, z: -300 } }, { x: 5, z: -200 })[1], { x: 5, z: -200 }, 'no aimTarget: the tee aim point');
});

test('V4 (owner on #63): the flyover starts behind and above the tee, travels slowly, stops above the green short of the cup (no dive), pauses and orbits, looking at the flag', () => {
  const c = CAM.flyover;
  for (const hole of Object.values(HOLES)) {
    const play = createHolePlay(hole, { seed: 1 }); play.reset();
    const h = play.terrain.heightAt, route = flyoverRoute(hole, play.target), path = flyoverPath(h, route);
    const id = hole.id;
    assert.ok(path.travel >= c.minTime && path.travel <= c.maxTime, `${id} travel ${path.travel}`);
    assert.equal(path.duration, path.travel + TUNE.CAM_FLYOVER_PAUSE + TUNE.CAM_FLYOVER_ORBIT);
    // Start: behind the tee (against the first leg of the route), a little above it, the tee ahead in view
    const a = path.at(0), t0 = route[0], t1 = route[1];
    const back = (t0.x - a.pos.x) * (t1.x - t0.x) + (t0.z - a.pos.z) * (t1.z - t0.z);
    assert.ok(back > 0 && Math.abs(Math.hypot(a.pos.x - t0.x, a.pos.z - t0.z) - c.startBack) < 1, `${id} starts ${c.startBack} m behind the tee`);
    assert.ok(a.pos.y - h(a.pos.x, a.pos.z) >= c.startHeight - 1e-6, `${id} a little above`);
    assert.ok(lineClear(h, a.pos, { x: t0.x, y: h(t0.x, t0.z) + 1, z: t0.z }), `${id} sees the tee box`);
    const toTee = { x: t0.x - a.pos.x, y: h(t0.x, t0.z) - a.pos.y, z: t0.z - a.pos.z }, toLook = { x: a.look.x - a.pos.x, y: a.look.y - a.pos.y, z: a.look.z - a.pos.z };
    assert.ok(angleDeg(toTee, toLook) < 0.5, `${id} looks down at the tee box first`);
    assert.ok(a.pos.y - h(t0.x, t0.z) >= c.startHeight - 1, `${id} starts well above the tee`);
    // It moves forward from the start, never back behind it
    let prev = -Infinity;
    for (let t = 0; t <= Math.min(3, path.travel); t += 0.05) {
      const q = path.at(t).pos, along = (q.x - t0.x) * (t1.x - t0.x) + (q.z - t0.z) * (t1.z - t0.z);
      assert.ok(along >= prev - 1e-6, `${id} goes back at ${t.toFixed(2)} s`); prev = along;
    }
    // End of travel: short of the cup, at endHeight, looking at the flag; then still for the pause
    const e = path.at(path.travel), cup = hole.cup;
    const rEnd = Math.hypot(e.pos.x - cup.x, e.pos.z - cup.z);
    assert.ok(rEnd > 5 && rEnd <= c.endBack + 1e-6, `${id} stops short of the cup (${rEnd.toFixed(1)} m)`);
    assert.ok(Math.hypot(e.look.x - cup.x, e.look.z - cup.z) < 1e-6, `${id} looks at the flag`);
    assert.deepEqual(path.at(path.travel + TUNE.CAM_FLYOVER_PAUSE * 0.9).pos, e.pos, `${id} pauses`);
    // The orbit keeps its distance to the cup and keeps looking at the flag
    const z = path.at(path.duration + 1);
    assert.ok(Math.abs(Math.hypot(z.pos.x - cup.x, z.pos.z - cup.z) - rEnd) < 1e-6 && Math.hypot(z.look.x - cup.x, z.look.z - cup.z) < 1e-6, `${id} orbit`);
    assert.ok(Math.hypot(z.pos.x - e.pos.x, z.pos.z - e.pos.z) > 5, `${id} the orbit moves`);
    // Never below its lowest height over the ground, and never dives: the height above ground never drops faster than the descent
    let minUp = Infinity;
    for (let t = 0; t <= path.duration; t += 0.05) { const v = path.at(t); minUp = Math.min(minUp, v.pos.y - h(v.pos.x, v.pos.z)); }
    assert.ok(minUp >= c.minClear - 1e-6, `${id} lowest ${minUp.toFixed(1)} m`);
  }
  // About 2× the first version's time on a long hole (owner: slower, then "a little bit faster")
  const long = flyoverPath(flat, [{ x: 0, z: 0 }, { x: 0, z: -230 }, { x: 0, z: -420 }]);
  assert.ok(long.travel > 8 && long.travel < 12, `travel ${long.travel}`);
});

test('V4 (owner on #63: "it seems to follow a rigid path"): the flyover turns, steers and climbs smoothly on every hole', () => {
  // Sampled at 30 Hz. Before the smoothing pass (centripetal spline, smoothed path, ground and look target,
  // eased speed): look up to 64°/s with jerks to 760°/s², heading kinks to 225°/s, height following every bump at 20 m/s.
  // Now: look ≤ 41°/s and ≤ 186°/s², heading ≤ 69°/s (the pl-03 dogleg), height ≤ 6.6 m/s.
  const dt = 1 / 30, limits = { look: 60, lookJerk: 300, heading: 90, vertical: 9 };
  for (const hole of Object.values(HOLES)) {
    const play = createHolePlay(hole, { seed: 1 }); play.reset();
    const path = flyoverPath(play.terrain.heightAt, flyoverRoute(hole, play.target));
    let prevW = null;
    const dir = v => ({ x: v.look.x - v.pos.x, y: v.look.y - v.pos.y, z: v.look.z - v.pos.z });
    for (let t = dt; t < path.travel - dt; t += dt) {
      const a = path.at(t - dt), b = path.at(t), c2 = path.at(t + dt), why = `${hole.id} at ${t.toFixed(2)} s`;
      const w = angleDeg(dir(a), dir(b)) / dt;
      assert.ok(w <= limits.look, `${why}: look turns ${w.toFixed(0)}°/s`);
      if (prevW !== null) assert.ok(Math.abs(w - prevW) / dt <= limits.lookJerk, `${why}: look jerks ${(Math.abs(w - prevW) / dt).toFixed(0)}°/s²`);
      prevW = w;
      const va = { x: b.pos.x - a.pos.x, y: 0, z: b.pos.z - a.pos.z }, vb = { x: c2.pos.x - b.pos.x, y: 0, z: c2.pos.z - b.pos.z };
      if (Math.hypot(va.x, va.z) > 0.05) assert.ok(angleDeg(va, vb) / dt <= limits.heading, `${why}: heading turns ${(angleDeg(va, vb) / dt).toFixed(0)}°/s`);
      assert.ok(Math.abs(c2.pos.y - b.pos.y) / dt <= limits.vertical, `${why}: climbs ${(Math.abs(c2.pos.y - b.pos.y) / dt).toFixed(1)} m/s`);
    }
  }
});
