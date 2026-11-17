// Ball simulation (DESIGN.md §4): flight, bounce, roll, cup and penalties.
// step(dt) advances one fixed physics step and returns an event (or null):
//   { type: 'landed', surface, first }   ball touched the ground and bounced or started rolling
//   { type: 'lippedOut' }                 too fast over the cup, deflected
//   { type: 'holed', how: 'fly' | 'roll' }
//   { type: 'stopped', surface, reason }  reason (P10): 'still'   slow and nothing pulls it (the normal rest rule)
//                                                       'settled' slower than STOP_SPEED for STOP_TIME (a slope
//                                                                 that only just beats the grass would creep forever),
//                                                                 or stopped by the grass after a long crawl (CRAWL_TIME)
//                                                       'timeout' the ROLL_TIMEOUT safety net (never on a real hole)
//   { type: 'penalty', surface }          water or out of bounds
// After holed / stopped / penalty the ball is at rest (phase 'rest').
import {
  G, ROLL_G, TUNE, STATIC, CREEP, STOP_SPEED, ROLL_TIMEOUT, BOUNCE_TO_ROLL, BOUNCE_LIFT,
  CUP_R, CUP_FLY_IN, LIP_OUT, STOP_TIME, CRAWL_TIME,
} from './config.js';
import { v3, copy, set, dot, dist2D } from './vec.js';

export function createBall({ terrain, surfaces, cup, wind, rng }) {
  const b = {
    pos: v3(), vel: v3(), curve: v3(),
    phase: 'rest',          // 'rest' | 'flight' | 'roll'
    firstBounce: true, spinFactor: 1, lipped: false, rollT: 0, slowT: 0, crawlT: 0,
    get moving() { return b.phase === 'flight' || b.phase === 'roll'; },
    launch, step,
  };

  function launch(shot) {
    copy(b.vel, shot.vel); copy(b.curve, shot.curve);
    b.spinFactor = shot.spinFactor;
    b.firstBounce = true; b.lipped = false; b.rollT = 0; b.slowT = 0; b.crawlT = 0;
    b.phase = shot.kind === 'putt' ? 'roll' : 'flight';
  }

  const rest = ev => { set(b.vel, 0, 0, 0); b.phase = 'rest'; return ev; };
  const isPenalty = s => surfaces[s].penalty;

  function step(dt) {
    if (b.phase === 'flight') return flight(dt);
    if (b.phase === 'roll') return roll(dt);
    return null;
  }

  function flight(dt) {
    const { pos, vel, curve } = b;
    vel.y -= G * dt;
    vel.x += (wind.x * TUNE.WIND_K + curve.x) * dt;
    vel.z += (wind.z * TUNE.WIND_K + curve.z) * dt;
    pos.x += vel.x * dt; pos.y += vel.y * dt; pos.z += vel.z * dt;
    const gh = terrain.heightAt(pos.x, pos.z);
    if (pos.y <= gh) { pos.y = gh; return land(); }
    return null;
  }

  // Bounce off a sloped surface: split the speed into "into the ground" and "along the ground".
  // The into-the-ground part bounces back up (less on soft surfaces), the along part loses some speed.
  // On a slope this is what makes the ball kick sideways or forward off a mound.
  function land() {
    const { pos, vel } = b;
    const s = terrain.surfaceAt(pos.x, pos.z);
    if (isPenalty(s)) return rest({ type: 'penalty', surface: s });
    if (dist2D(pos, cup) < CUP_R * CUP_FLY_IN) return rest({ type: 'holed', how: 'fly' }); // straight in!
    const S = surfaces[s];
    const n = terrain.normalAt(pos.x, pos.z);
    const vn = dot(vel, n);
    if (vn >= 0) return null; // already moving away from the ground
    let keep = S.keep;
    const first = b.firstBounce;
    if (first) { keep *= b.spinFactor; b.firstBounce = false; }
    const up = -vn * S.rest;
    // along-the-ground part × keep, plus the bounce back along the normal
    const tx = (vel.x + n.x * -vn) * keep, ty = (vel.y + n.y * -vn) * keep, tz = (vel.z + n.z * -vn) * keep;
    vel.x = tx + n.x * up; vel.y = ty + n.y * up; vel.z = tz + n.z * up;
    pos.y += BOUNCE_LIFT;
    if (up < BOUNCE_TO_ROLL) { vel.y = 0; b.phase = 'roll'; }
    return { type: 'landed', surface: s, first };
  }

  function roll(dt) {
    const { pos, vel } = b;
    const s = terrain.surfaceAt(pos.x, pos.z);
    if (isPenalty(s)) return rest({ type: 'penalty', surface: s });
    const S = surfaces[s];
    // Gravity pulls the ball down the slope...
    const g = terrain.gradAt(pos.x, pos.z);
    const k = ROLL_G / (1 + g.x * g.x + g.z * g.z);
    const ax = -k * g.x, az = -k * g.z;
    const pull = Math.hypot(ax, az);
    const hold = S.decel * STATIC;   // ...but a stopped ball stays put on gentle slopes
    let sp = Math.hypot(vel.x, vel.z);
    // P10: time spent slower than STOP_SPEED, and slower than CREEP, in a row
    b.slowT = sp < STOP_SPEED ? b.slowT + dt : 0;
    b.crawlT = sp < CREEP ? b.crawlT + dt : 0;
    const still = sp < STOP_SPEED && pull <= hold;
    if (still || b.slowT >= STOP_TIME) {
      // A ball that comes to rest over the cup (possible only after a lip-out) drops in.
      if (dist2D(pos, cup) < CUP_R) return rest({ type: 'holed', how: 'roll' });
      return rest({ type: 'stopped', surface: s, reason: still ? 'still' : 'settled' });
    }
    vel.x += ax * dt; vel.z += az * dt;
    // ...and the grass slows it down (a bit less at a crawl, so it can trickle down steep slopes).
    // P10: a ball that has crawled for CRAWL_TIME settles into the grass: full friction again, so on a
    // slope the grass can hold it slows to a stop and the STOP_TIME rule above rests it.
    sp = Math.hypot(vel.x, vel.z);
    const fr = sp < CREEP && b.crawlT < CRAWL_TIME ? hold + (S.decel - hold) * sp / CREEP : S.decel;
    const ns = Math.max(0, sp - fr * dt);
    if (sp > 0) { vel.x *= ns / sp; vel.z *= ns / sp; }
    pos.x += vel.x * dt; pos.z += vel.z * dt;
    pos.y = terrain.heightAt(pos.x, pos.z);
    b.rollT += dt;
    if (b.rollT > ROLL_TIMEOUT) return rest({ type: 'stopped', surface: terrain.surfaceAt(pos.x, pos.z), reason: 'timeout' }); // safety net
    const dh = dist2D(pos, cup);
    if (dh < CUP_R) {
      // After a lip-out the ball can't drop until it has left the cup (G8): it is still over the
      // cup on the next steps, slower, and used to get captured almost every time.
      if (b.lipped) return null;
      if (ns < TUNE.CUP_CAPTURE_SPEED) return rest({ type: 'holed', how: 'roll' });
      // Too fast: lip out, lose speed and get knocked sideways
      b.lipped = true;
      const a = (rng() - 0.5) * LIP_OUT.spread, c = Math.cos(a), sn = Math.sin(a);
      const vx = vel.x, vz = vel.z;
      vel.x = (vx * c - vz * sn) * LIP_OUT.keep; vel.z = (vx * sn + vz * c) * LIP_OUT.keep;
      return { type: 'lippedOut' };
    } else if (dh > CUP_R * LIP_OUT.rearm) b.lipped = false;
    return null;
  }

  return b;
}
