// Playing one hole: the rules around the ball (strokes, lie, club pick, penalties, the fixed-step clock)
// and the hole flow (Gate A A1): after each shot ends, core decides what happens next.
// The game layer calls these and turns the returned events into text, camera moves, delays and HUD updates.
//
// Hole flow, one shot:
//   swing(result)  the ONLY way to hit the ball (A8); null for a cancelled swing or when a shot can't start
//   advance(dt)    events; when one ends the shot (stopped, penalty, holed), p.next says what's next:
//                    'aim'           stopped: the next shot is from here
//                    'returnToLast'  penalty: back to where the shot was hit from
//                    'holed'         in the cup: the hole is over (p.finished)
//                    'pickedUp'      the stroke limit is reached: the hole is over (p.finished)
//   skip()         (X9) run the rest of the shot at once: the same fixed steps, nothing drawn, same end
//   proceed()      do it (after whatever delay the game shows): prepares the next shot, or nothing when the hole is over
import {
  G, ROLL_G, PHYSICS_DT, TUNE, AUTO_CLUB_REACH, PUTT, LANDING_SIM, WIND_MAX,
} from './config.js';
import { v3, copy, set, dist2D, aimAt, dirFromAim, rightFromAim } from './vec.js';
import { createRng } from './rng.js';
import { makeTerrain } from './terrain.js';
import { makeSurfaceTable } from './surfaces.js';
import { makeBag, lieFor, pickClub } from './clubs.js';
import { resolveShot, launchVelocity } from './swing.js';
import { createBall } from './ball.js';
import { makeColliders, firstHit } from './obstacles.js';
import { isShotEnd } from './states.js';


export function createHolePlay(hole, { seed = 1 } = {}) {
  const terrain = makeTerrain(hole);
  const surfaces = makeSurfaceTable(hole);
  const bag = makeBag(hole.bag);
  const PUTTER = bag.length - 1;
  const tee = v3(hole.tee.x, terrain.heightAt(hole.tee.x, hole.tee.z), hole.tee.z);
  const cup = v3(hole.cup.x, terrain.heightAt(hole.cup.x, hole.cup.z), hole.cup.z);
  const rng = createRng(seed);
  const wind = v3();
  const obstacles = makeColliders(hole, terrain.heightAt); // K2/K3: trunks, leaves, boulders (none on holes 1–2)
  const ball = createBall({ terrain, surfaces, cup, wind, rng, obstacles });
  const lastPos = v3();
  let acc = 0; // fixed-step accumulator (seconds of simulation time not yet stepped)

  const p = {
    hole, terrain, surfaces, bag, PUTTER, tee, cup, wind, ball, lastPos, obstacles,
    strokes: 0, lie: 'tee', aim: 0, clubIdx: 0, puttMax: 10, isPutt: false, shotDir: v3(0, 0, -1),
    target: v3(), targetKind: 'cup', // S18: the default aim point for this shot and what it is ('cup' | 'chip' | 'green' | 'fairway')
    next: null,      // what happens after the shot that just ended (see the top of this file), until proceed()
    finished: null,  // when the hole is over: { holed, pickedUp, strokes, par } (Phase 6 rounds read this)
    get club() { return bag[p.clubIdx]; },
    get pickedUp() { return p.strokes >= hole.maxStrokes; },
    get canSwing() { return !ball.moving && !p.next && !p.finished; },
    reset, newWind, prepare, hit, swing, setClub, setAim, advance, skip, step, proceed, returnToLastPos, landingPoint,
    restPoint, aimWarning, clubReach, puttPlaysLike, lieOf, pinPower, distToCup, targetDist, defaultTarget, slope, simulate,
  };

  function newWind() {
    if (hole.wind) { set(wind, hole.wind.x, 0, hole.wind.z); return; }
    const a = rng() * Math.PI * 2, s = rng() * (hole.windMax ?? WIND_MAX);
    set(wind, Math.sin(a) * s, 0, -Math.cos(a) * s);
  }

  // Back to the start of the hole. `start` (optional, from a designer scenario, X8) puts the ball
  // somewhere else: { ball: { x, z }, strokes, wind: { x, z }, seed }. With a `seed`, the random
  // numbers (wind, lip-outs) restart from it, so every retry of a scenario is identical (F1).
  function reset(start = null) {
    if (start?.seed != null) rng.reseed(start.seed);
    p.strokes = start?.strokes ?? 0;
    p.finished = null;
    copy(ball.pos, tee);
    if (start?.ball) { ball.pos.x = start.ball.x; ball.pos.z = start.ball.z; }
    newWind();
    if (start?.wind) set(wind, start.wind.x, 0, start.wind.z);
    prepare();
  }

  function distToCup() { return dist2D(ball.pos, cup); }
  // S18: meters to the default aim point (the ⚑ and the auto-pick use this, not the pin)
  function targetDist() { return dist2D(ball.pos, p.target); }

  // The default aim (S18, designer: "the automatic aim is too strong"). It is a starting point, not
  // the answer: the player adjusts to the flag and the wind.
  //   on the green or the fringe (putt or chip)       the cup (PM on PR #27: a fringe chip aims at the flag)
  //   within CHIP_AIM_RANGE of the cup, any surface  the cup, kind 'chip' (S19, owner: from close to the
  //                                                  green the player always wants the flag)
  //   tee shot on a par 4 or 5                       the hole's fairway target (hole.aimTarget)
  //   everything else (approaches, par 3 tee shots)  the centre of the green (hole.features.green)
  // A hole without that data (test holes) aims at the cup. Returns { kind, x, z }.
  const greenCentre = hole.features?.green ? { x: hole.features.green.cx, z: hole.features.green.cz } : null;
  function defaultTarget(lie = p.lie) {
    if (lie === 'green' || lie === 'fringe') return { kind: 'cup', x: cup.x, z: cup.z };
    if (distToCup() <= TUNE.CHIP_AIM_RANGE) return { kind: 'chip', x: cup.x, z: cup.z };
    if (lie === 'tee' && hole.par >= 4 && hole.aimTarget) return { kind: 'fairway', ...hole.aimTarget };
    if (greenCentre) return { kind: 'green', ...greenCentre };
    return { kind: 'cup', x: cup.x, z: cup.z };
  }
  // The lie for club i from where the ball is (S11): { maxPower, sweetScale }
  function lieOf(i = p.clubIdx) { return lieFor(bag[i], p.lie, surfaces); }

  // Where a dead-straight shot at `power` comes down, allowing for the hills (no wind).
  // Default power = the lie's cap, i.e. the strongest shot possible from here.
  // The aim ring, the club reach, the auto-pick and the ⚑ mark all use this one simulation.
  // `onStep(from, to)` (optional, K4) sees every step of the flight; when it returns something the
  // flight stops there and landingPoint returns that instead.
  function landingPoint(i, a = p.aim, power = lieOf(i).maxPower, onStep = null) {
    const { vel } = launchVelocity(bag[i], power, a);
    const q = { ...ball.pos }, q0 = { x: 0, y: 0, z: 0 };
    const h = LANDING_SIM.dt;
    for (let k = 0; k < LANDING_SIM.maxSteps; k++) {
      const x0 = q.x, z0 = q.z, above0 = q.y - terrain.heightAt(q.x, q.z);
      if (onStep) copy(q0, q);
      q.x += vel.x * h; q.y += (vel.y - G * h / 2) * h; q.z += vel.z * h; // exact for a parabola
      vel.y -= G * h;
      if (onStep) { const r = onStep(q0, q); if (r) return r; }
      const above = q.y - terrain.heightAt(q.x, q.z);
      if (vel.y < 0 && above <= 0) {
        // The ball went under the ground during this step: go back to where it crossed it
        // (S12: a whole step overshoots most when the ground rises toward the ball).
        const t = above0 > 0 ? above0 / (above0 - above) : 1;
        q.x = x0 + (q.x - x0) * t; q.z = z0 + (q.z - z0) * t; q.y = terrain.heightAt(q.x, q.z);
        break;
      }
    }
    return q;
  }
  // K4 "no blind shots": does a straight shot with club i at this aim and power (default: the lie's
  // cap, the shot the yellow ring shows) hit a tree trunk, a tree's leaves or a boulder before it
  // comes down? The same flight as the ring (no wind, no curve), checked against the same obstacles
  // as the ball. Returns null (clear) or { kind: 'trunk' | 'leaves' | 'boulder', index, x, y, z, dist }
  // where dist = meters from the ball (flat) to where it would hit. Putts: null (they roll).
  // The ⚑ and the auto-pick ignore obstacles on purpose: the warning is the information.
  let warnMemo = null;
  function aimWarning(i = p.clubIdx, a = p.aim, power = lieOf(i).maxPower) {
    if (i === PUTTER || !obstacles.length) return null;
    const key = `${i}|${a}|${power}|${ball.pos.x}|${ball.pos.z}`;
    if (warnMemo?.key === key) return warnMemo.value;
    let value = null;
    const r = landingPoint(i, a, power, (q0, q1) => {
      const hit = firstHit(obstacles, q0, q1);
      return hit && { warn: true, kind: hit.kind, index: hit.o.i, x: hit.x, y: hit.y, z: hit.z };
    });
    if (r.warn) { const { warn, ...w } = r; value = { ...w, dist: dist2D(ball.pos, w) }; }
    warnMemo = { key, value };
    return value;
  }
  function clubReach(i = p.clubIdx, a = p.aim) { return i === PUTTER ? p.puttMax : dist2D(ball.pos, landingPoint(i, a)); }

  // Where a dead-straight shot at `power` comes to REST (S15): the real ball physics (flight, bounces,
  // roll, slopes, cup, the same PHYSICS_DT steps) on a second ball, with no wind and its own random
  // numbers restarted each time, so the real ball, the wind and the game's RNG are untouched.
  // `power` may be above the lie's cap (the ⚑ search looks past it). Water or out of bounds: where the
  // ball went in. Holed: the cup. Returns { x, y, z, end } (end = the event that ended the shot).
  const simWind = v3(), simRng = createRng(LANDING_SIM.restSeed);
  const simBall = createBall({ terrain, surfaces, cup, wind: simWind, rng: simRng }); // no obstacles: the ⚑ ignores them (K4)
  const NO_CAP = { maxPower: Infinity, sweetScale: 1 };
  function restPoint(i, a = p.aim, power = lieOf(i).maxPower) {
    simRng.reseed(LANDING_SIM.restSeed);
    copy(simBall.pos, ball.pos);
    simBall.launch(resolveShot({ club: bag[i], power, acc: 0, aim: a, lie: NO_CAP, puttMax: p.puttMax, greenDecel: surfaces.green.decel }));
    let end = null;
    while (simBall.moving) { const ev = simBall.step(PHYSICS_DT); if (isShotEnd(ev)) end = ev; }
    return { x: simBall.pos.x, y: simBall.pos.y, z: simBall.pos.z, end: end?.type ?? null };
  }

  // The ⚑ mark on the meter: the power at which a straight shot with no wind finishes at the default
  // aim point (S18: the green centre, the tee target, the cup for a chip or a putt).
  // S15: it simulates the whole shot to where the ball comes to rest (restPoint), so a long club's run
  // out is included (before, it aimed the landing 95% of the way and a 3 Wood ran 7–11 m past).
  // It is on the meter's 0..1 scale: above the lie's cap it sits in the grayed-out part (= out of reach
  // with this club from here). Found by bisection. The HUD asks for it on every aim change, so the
  // answer is kept for the same club, aim, ball and target, until the next prepare().
  let pinMemo = null;
  // PM on PR #31 ("harder is much better", no free chip-ins): a chip or pitch at the cup from within
  // CHIP_AIM_RANGE has its ⚑ CHIP_FLAG_SHORT meters short of the cup, so a perfect ⚑ chip leaves a
  // short putt and holing it means adding power on purpose. Putts and everything else: 0.
  function chipShort() {
    const atCup = p.targetKind === 'chip' || p.targetKind === 'cup';
    return atCup && distToCup() <= TUNE.CHIP_AIM_RANGE ? TUNE.CHIP_FLAG_SHORT : 0;
  }
  function pinPower(i = p.clubIdx) {
    if (i === PUTTER) return (puttPlaysLike() + PUTT.pinTickExtra) / p.puttMax;
    const key = `${i}|${p.aim}|${ball.pos.x}|${ball.pos.z}|${p.target.x}|${p.target.z}|${chipShort()}`;
    if (pinMemo?.key === key) return pinMemo.value;
    const want = Math.max(0, targetDist() - chipShort());
    const restAt = pw => dist2D(ball.pos, restPoint(i, p.aim, pw));
    // Bracket first with the cheap landing simulation: the power that only CARRIES all the way is
    // (almost always) enough to finish there, because the ball runs on after it lands. Only when it
    // isn't (it rolls back off a slope) does the search look up to pinMaxPower.
    const carryAt = pw => dist2D(ball.pos, landingPoint(i, p.aim, pw));
    let lo = 0, hi = LANDING_SIM.pinMaxPower, value;
    if (carryAt(hi) >= want) {
      for (let k = 0; k < LANDING_SIM.pinIters; k++) { const mid = (lo + hi) / 2; if (carryAt(mid) < want) lo = mid; else hi = mid; }
      lo = 0;
      if (restAt(hi) < want) hi = LANDING_SIM.pinMaxPower;
    }
    if (restAt(hi) < want) value = hi; // far out of reach: the HUD hides the mark
    else {
      for (let k = 0; k < LANDING_SIM.restIters; k++) {
        const mid = (lo + hi) / 2;
        if (restAt(mid) < want) lo = mid; else hi = mid;
      }
      value = hi;
      // Where the finish jumps over the target (a ball that lands on a bank rolls back, a little more
      // power carries onto the top and runs on), no power finishes there. Then take the closest of:
      // just short of the jump, just past it, and the landing rule from before S15 (land
      // AUTO_CLUB_REACH of the way).
      const miss = pw => Math.abs(restAt(pw) - want);
      if (miss(value) > LANDING_SIM.restTol) {
        let a = 0, b = LANDING_SIM.pinMaxPower;
        for (let k = 0; k < LANDING_SIM.pinIters; k++) { const mid = (a + b) / 2; if (carryAt(mid) < want * AUTO_CLUB_REACH) a = mid; else b = mid; }
        for (const pw of [lo, b]) if (miss(pw) < miss(value)) value = pw;
      }
    }
    pinMemo = { key, value };
    return value;
  }
  // Putts: a slope adds or removes "distance" (uphill plays longer)
  function puttPlaysLike() { return distToCup() + ROLL_G * (cup.y - ball.pos.y) / surfaces.green.decel; }

  // Get ready for the next shot from wherever the ball is: lie, default aim (S18), putt range, auto club.
  function prepare() {
    p.next = null;
    pinMemo = null; warnMemo = null; // a new shot (or new tunables): work the ⚑ and the K4 warning out again
    set(ball.vel, 0, 0, 0); ball.phase = 'rest';
    ball.pos.y = terrain.heightAt(ball.pos.x, ball.pos.z);
    p.lie = terrain.surfaceAt(ball.pos.x, ball.pos.z);
    const t = defaultTarget();
    p.targetKind = t.kind;
    set(p.target, t.x, terrain.heightAt(t.x, t.z), t.z);
    p.aim = aimAt(ball.pos, p.target);
    const d = distToCup();
    p.puttMax = Math.min(PUTT.rangeMax, Math.max(PUTT.rangeMin, Math.round(Math.max(d, puttPlaysLike()) * PUTT.rangeK)));
    // The auto-pick (S13) for the default aim's distance (S18): see clubs.pickClub
    p.clubIdx = pickClub(bag, { lie: p.lie, dist: targetDist(), cupDist: d, reach: i => clubReach(i) });
  }

  // The player's choices while aiming, always through these (A8): the club index is clamped to the bag.
  function setClub(i) { p.clubIdx = Math.min(Math.max(Math.round(i), 0), PUTTER); return p.clubIdx; }
  function setAim(a) { if (Number.isFinite(a)) p.aim = a; return p.aim; }

  // A finished swing from the meter { power, acc, outcome }: hit it. This is the only way to hit the
  // ball (Gate A A8). A cancelled swing does nothing (no stroke), and nothing happens while the ball
  // is moving, before proceed() or after the hole is over. Returns the resolved shot, or null.
  function swing(result) {
    if (!result || result.outcome === 'cancel' || !p.canSwing) return null;
    return launch(result.power, result.acc, result.outcome ?? 'normal');
  }
  // Shorthand for tests and tools: swing({ power, acc, outcome }).
  function hit(power, acc, outcome = 'normal') { return swing({ power, acc, outcome }); }

  // power 0..1, acc = meter value at the 3rd click, outcome from the meter. Returns the resolved shot.
  function launch(power, accuracy, outcome) {
    p.strokes++;
    copy(lastPos, ball.pos);
    const shot = resolveShot({
      club: p.club, power, acc: accuracy, aim: p.aim, lie: lieOf(),
      puttMax: p.puttMax, greenDecel: surfaces.green.decel, outcome,
    });
    p.isPutt = shot.kind === 'putt';
    copy(p.shotDir, shot.dir);
    ball.launch(shot);
    acc = 0;
    return shot;
  }

  // One fixed physics step. A penalty costs a stroke here. The event that ends the shot sets p.next.
  function step() {
    const ev = ball.step(PHYSICS_DT);
    if (ev && ev.type === 'penalty') p.strokes++;
    if (isShotEnd(ev)) decide(ev);
    return ev;
  }

  // The hole flow (Gate A A1): what happens after a shot ends. Holed beats the stroke limit, and
  // the stroke limit (strokes incl. penalties ≥ maxStrokes) ends the hole as "picked up".
  function decide(ev) {
    let next;
    if (ev.type === 'holed') next = 'holed';
    else if (p.pickedUp) next = 'pickedUp';
    else next = ev.type === 'penalty' ? 'returnToLast' : 'aim';
    if (next === 'holed' || next === 'pickedUp') p.finished = { holed: next === 'holed', pickedUp: next === 'pickedUp', strokes: p.strokes, par: hole.par };
    p.next = next;
    return next;
  }

  // Carry out p.next: get the next shot ready ('aim' from where the ball stopped, 'returnToLast'
  // after a penalty). When the hole is over it changes nothing. Returns what it did (the old p.next).
  function proceed() {
    const n = p.next;
    if (n === 'aim') prepare();
    else if (n === 'returnToLast') returnToLastPos();
    return n;
  }

  // Advance by `realDt` seconds of real time using the fixed-step accumulator: only whole
  // PHYSICS_DT steps are taken and the remainder waits for the next frame, so the same shot
  // ends in the same place at any frame rate. Returns the events of this frame, in order.
  function advance(realDt) {
    const events = [];
    if (!ball.moving) return events;
    acc += realDt * (p.isPutt ? 1 : TUNE.FLIGHT_SPEEDUP);
    while (acc >= PHYSICS_DT && ball.moving) {
      acc -= PHYSICS_DT;
      const ev = step();
      if (ev) events.push(ev);
    }
    if (!ball.moving) acc = 0;
    return events;
  }

  // Skip to the end of the shot (X9): run the remaining fixed PHYSICS_DT steps now, with nothing
  // drawn. These are exactly the steps advance() would take frame by frame (no step depends on the
  // frame time), so a skipped shot ends exactly where a watched one does: same spot, strokes, lip-outs
  // and p.next. Returns the events, in order (the game shows them as it would have). Nothing happens
  // when the ball isn't moving.
  function skip(maxSteps = 1e7) {
    const events = [];
    for (let i = 0; i < maxSteps && ball.moving; i++) {
      const ev = step();
      if (ev) events.push(ev);
    }
    acc = 0;
    return events;
  }

  // After a penalty: back to where the shot was hit from.
  function returnToLastPos() { copy(ball.pos, lastPos); prepare(); }

  // Slope under the ball relative to the aim, in percent: along > 0 = uphill, side > 0 = breaks left.
  function slope() {
    const g = terrain.gradAt(ball.pos.x, ball.pos.z);
    const d = dirFromAim(p.aim), r = rightFromAim(p.aim);
    return { along: (g.x * d.x + g.z * d.z) * 100, side: (g.x * r.x + g.z * r.z) * 100 };
  }

  // Headless: run the current shot to the end. Returns the last event.
  function simulate(maxSteps = 1e6) {
    for (let i = 0; i < maxSteps && ball.moving; i++) {
      const ev = step();
      if (isShotEnd(ev)) return ev;
    }
    return null;
  }

  return p;
}
