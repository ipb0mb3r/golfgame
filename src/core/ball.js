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
//   { type: 'hitObstacle', kind, index }  K2: bounced off a tree trunk (kind 'trunk') or a boulder ('boulder')
//   { type: 'hitLeaves', index }          K3: flew into a tree's leaves: slowed down and turned a little
// After holed / stopped / penalty the ball is at rest (phase 'rest').
import {
  G, ROLL_G, TUNE, STATIC, CREEP, STOP_SPEED, ROLL_TIMEOUT, BOUNCE_TO_ROLL, BOUNCE_LIFT,
  CUP_R, CUP_FLY_IN, LIP_OUT, STOP_TIME, CRAWL_TIME, OBSTACLE_SLIDE, OBSTACLE_EVENT_SPEED,
} from './config.js';
import { v3, copy, set, dot, dist2D, degToRad } from './vec.js';
import { firstHit, solidNormal, solidGap } from './obstacles.js';

// obstacles = colliders from obstacles.makeColliders (K2/K3); none = the ball never checks
export function createBall({ terrain, surfaces, cup, wind, rng, obstacles = [] }) {
  const b = {
    pos: v3(), vel: v3(), curve: v3(),
    phase: 'rest',          // 'rest' | 'flight' | 'roll'
    firstBounce: true, spinFactor: 1, lipped: false, rollT: 0, slowT: 0, crawlT: 0,
    leavesHit: new Set(),   // K3: trees whose leaves this shot already went through (once per tree per shot)
    get moving() { return b.phase === 'flight' || b.phase === 'roll'; },
    launch, step,
  };

  function launch(shot) {
    copy(b.vel, shot.vel); copy(b.curve, shot.curve);
    b.spinFactor = shot.spinFactor;
    b.firstBounce = true; b.lipped = false; b.rollT = 0; b.slowT = 0; b.crawlT = 0;
    b.leavesHit.clear();
    b.phase = shot.kind === 'putt' ? 'roll' : 'flight';
  }

  const rest = ev => { set(b.vel, 0, 0, 0); b.phase = 'rest'; return ev; };
  const isPenalty = s => surfaces[s].penalty;

  function step(dt) {
    if (b.phase === 'flight') return flight(dt);
    if (b.phase === 'roll') return roll(dt);
    return null;
  }

  const from = v3(); // where the ball was at the start of this step (obstacle checks)

  function flight(dt) {
    const { pos, vel, curve } = b;
    vel.y -= G * dt;
    vel.x += (wind.x * TUNE.WIND_K + curve.x) * dt;
    vel.z += (wind.z * TUNE.WIND_K + curve.z) * dt;
    copy(from, pos);
    pos.x += vel.x * dt; pos.y += vel.y * dt; pos.z += vel.z * dt;
    if (obstacles.length) {
      const hit = firstHit(obstacles, from, pos, { leaves: true, used: b.leavesHit });
      if (hit) {
        const ev = hit.kind === 'leaves' ? leaves(hit) : solid(hit, false);
        const gh = terrain.heightAt(pos.x, pos.z);
        if (pos.y < gh) pos.y = gh; // the ground is checked on the next step
        if (ev) return ev;
      }
    }
    const gh = terrain.heightAt(pos.x, pos.z);
    if (pos.y <= gh) { pos.y = gh; return land(); }
    return null;
  }

  // K3: into the leaves. The ball keeps CANOPY_SLOW of its speed and turns left or right by up to
  // CANOPY_DEFLECT (the seeded RNG, so a replay with the same seed turns it the same way), then drops.
  // It carries on from where it is: only the speed changes. Once per tree per shot.
  function leaves(hit) {
    b.leavesHit.add(hit.o.i);
    const { vel } = b;
    const a = degToRad((rng() * 2 - 1) * TUNE.CANOPY_DEFLECT), c = Math.cos(a), sn = Math.sin(a);
    const vx = vel.x, vz = vel.z, k = TUNE.CANOPY_SLOW;
    vel.x = (vx * c - vz * sn) * k; vel.z = (vx * sn + vz * c) * k; vel.y *= k;
    return { type: 'hitLeaves', index: hit.o.i };
  }

  // K2: off a trunk or a boulder. The ball goes back to where it touched, then the speed into the
  // obstacle bounces back × OBSTACLE_REST and the speed along it is kept × OBSTACLE_KEEP (like a
  // bounce on the ground). `rolling`: only the flat (x, z) part counts and the ball stays on the ground.
  // A ball that was already touching it (t = 0: sliding over a boulder) keeps this step's move and is
  // pushed back out to the surface, so it slides along instead of standing still.
  function solid(hit, rolling) {
    const { pos, vel } = b, o = hit.o;
    if (hit.t > 0) set(pos, hit.x, hit.y, hit.z);
    const n = solidNormal(o, pos, rolling);
    const gap = solidGap(o, pos);
    if (gap < 0) { pos.x -= n.x * gap; pos.z -= n.z * gap; if (!rolling) pos.y -= n.y * gap; } // started inside: push out
    if (rolling) pos.y = terrain.heightAt(pos.x, pos.z);
    const vn = dot(vel, n);
    if (vn >= 0) return null; // already moving away
    const keep = TUNE.OBSTACLE_KEEP, back = -vn * TUNE.OBSTACLE_REST;
    vel.x = (vel.x - n.x * vn) * keep + n.x * back;
    vel.y = (vel.y - n.y * vn) * keep + n.y * back;
    vel.z = (vel.z - n.z * vn) * keep + n.z * back;
    if (rolling) vel.y = 0;
    // A ball that has stopped bouncing on top of a boulder (or a trunk, K10) can't stay balanced
    // there: nudge it off (straight out from the centre, or +x when it is dead centre). Never on a
    // real shot except a ball that drops (almost) exactly onto the top.
    if (!rolling && (o.type === 'boulder' || hit.cap) && back < BOUNCE_TO_ROLL) {
      const hs = Math.hypot(vel.x, vel.z);
      if (hs < OBSTACLE_SLIDE) {
        const hx = pos.x - o.x, hz = pos.z - o.z, hl = Math.hypot(hx, hz);
        const ux = hl > 1e-6 ? hx / hl : 1, uz = hl > 1e-6 ? hz / hl : 0;
        vel.x += ux * (OBSTACLE_SLIDE - hs); vel.z += uz * (OBSTACLE_SLIDE - hs);
      }
    }
    return -vn >= OBSTACLE_EVENT_SPEED ? { type: 'hitObstacle', kind: hit.kind, index: o.i } : null;
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
    copy(from, pos);
    pos.x += vel.x * dt; pos.z += vel.z * dt;
    pos.y = terrain.heightAt(pos.x, pos.z);
    if (obstacles.length) {
      // K2: a rolling ball bounces off trunks and boulders too (never the leaves)
      const hit = firstHit(obstacles, from, pos, { leaves: false });
      if (hit) { const ev = solid(hit, true); if (ev) return ev; }
    }
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
