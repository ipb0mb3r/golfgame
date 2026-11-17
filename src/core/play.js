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
  const ball = createBall({ terrain, surfaces, cup, wind, rng });
  const lastPos = v3();
  let acc = 0; // fixed-step accumulator (seconds of simulation time not yet stepped)

  const p = {
    hole, terrain, surfaces, bag, PUTTER, tee, cup, wind, ball, lastPos,
    strokes: 0, lie: 'tee', aim: 0, clubIdx: 0, puttMax: 10, isPutt: false, shotDir: v3(0, 0, -1),
    next: null,      // what happens after the shot that just ended (see the top of this file), until proceed()
    finished: null,  // when the hole is over: { holed, pickedUp, strokes, par } (Phase 6 rounds read this)
    get club() { return bag[p.clubIdx]; },
    get pickedUp() { return p.strokes >= hole.maxStrokes; },
    get canSwing() { return !ball.moving && !p.next && !p.finished; },
    reset, newWind, prepare, hit, swing, setClub, setAim, advance, skip, step, proceed, returnToLastPos, landingPoint,
    clubReach, puttPlaysLike, lieOf, pinPower, distToCup, slope, simulate,
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
  // The lie for club i from where the ball is (S11): { maxPower, sweetScale }
  function lieOf(i = p.clubIdx) { return lieFor(bag[i], p.lie, surfaces); }

  // Where a dead-straight shot at `power` comes down, allowing for the hills (no wind).
  // Default power = the lie's cap, i.e. the strongest shot possible from here.
  // The aim ring, the club reach, the auto-pick and the ⚑ mark all use this one simulation.
  function landingPoint(i, a = p.aim, power = lieOf(i).maxPower) {
    const { vel } = launchVelocity(bag[i], power, a);
    const q = { ...ball.pos };
    const h = LANDING_SIM.dt;
    for (let k = 0; k < LANDING_SIM.maxSteps; k++) {
      const x0 = q.x, z0 = q.z, above0 = q.y - terrain.heightAt(q.x, q.z);
      q.x += vel.x * h; q.y += (vel.y - G * h / 2) * h; q.z += vel.z * h; // exact for a parabola
      vel.y -= G * h;
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
  function clubReach(i = p.clubIdx, a = p.aim) { return i === PUTTER ? p.puttMax : dist2D(ball.pos, landingPoint(i, a)); }
  // The ⚑ mark on the meter (S12): the power whose landing point (the same simulation as the aim
  // ring, so uphill and downhill are included) comes down AUTO_CLUB_REACH of the way to the pin;
  // the ball runs out the rest. It is on the meter's 0..1 scale: above the lie's cap it sits in the
  // grayed-out part (= out of reach with this club from here). Found by bisection.
  function pinPower(i = p.clubIdx) {
    if (i === PUTTER) return (puttPlaysLike() + PUTT.pinTickExtra) / p.puttMax;
    const want = distToCup() * AUTO_CLUB_REACH;
    const carryAt = pw => dist2D(ball.pos, landingPoint(i, p.aim, pw));
    let lo = 0, hi = LANDING_SIM.pinMaxPower;
    if (carryAt(hi) < want) return hi; // far out of reach: the HUD hides the mark
    for (let k = 0; k < LANDING_SIM.pinIters; k++) {
      const mid = (lo + hi) / 2;
      if (carryAt(mid) < want) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  // Putts: a slope adds or removes "distance" (uphill plays longer)
  function puttPlaysLike() { return distToCup() + ROLL_G * (cup.y - ball.pos.y) / surfaces.green.decel; }

  // Get ready for the next shot from wherever the ball is: lie, aim at the pin, putt range, auto club.
  function prepare() {
    p.next = null;
    set(ball.vel, 0, 0, 0); ball.phase = 'rest';
    ball.pos.y = terrain.heightAt(ball.pos.x, ball.pos.z);
    p.lie = terrain.surfaceAt(ball.pos.x, ball.pos.z);
    p.aim = aimAt(ball.pos, cup);
    const d = distToCup();
    p.puttMax = Math.min(PUTT.rangeMax, Math.max(PUTT.rangeMin, Math.round(Math.max(d, puttPlaysLike()) * PUTT.rangeK)));
    // The auto-pick (S13): see clubs.pickClub
    p.clubIdx = pickClub(bag, { lie: p.lie, dist: d, reach: i => clubReach(i) });
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
