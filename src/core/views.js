// Camera views (Phase V, DESIGN §4 "Camera"): WHERE the camera stands and what it looks at, as pure
// math on the hole's terrain. No Three.js and no DOM: src/game/camera.js only eases toward the
// { pos, look } these return, so the choices are tested in Node (tests/views.test.js).
//
// A view is { pos: {x,y,z}, look: {x,y,z} } for a perspective camera with a vertical field of view of
// `fov` degrees. `frame` says where on the screen things must show:
//   { aspect (width / height), fov (deg), top, bottom } — top/bottom = the free band of the 3D view as
//   fractions of the canvas height (0 = top edge, 1 = bottom edge): below it sits the meter panel.
import { TUNE, CAM } from './config.js';
import { firstHit } from './obstacles.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const DEG = Math.PI / 180;

// Where p shows on the screen of a camera at `pos` looking at `look`: { x, y } in normalized device
// coordinates (−1..1, y up) and `front` (true when p is in front of the camera). Same convention as
// THREE.PerspectiveCamera + lookAt (up = +y). Used by tests and by the never-blind checks below.
export function project(view, p, frame) {
  const { pos, look } = view;
  let fx = look.x - pos.x, fy = look.y - pos.y, fz = look.z - pos.z;
  const fl = Math.hypot(fx, fy, fz) || 1; fx /= fl; fy /= fl; fz /= fl;
  // right = forward × up(0,1,0)
  let rx = -fz, rz = fx; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
  // up' = right × forward
  const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;
  const dx = p.x - pos.x, dy = p.y - pos.y, dz = p.z - pos.z;
  const depth = dx * fx + dy * fy + dz * fz;
  const t = Math.tan(frame.fov * DEG / 2);
  const sx = (dx * rx + dz * rz) / (depth * t * frame.aspect);
  const sy = (dx * ux + dy * uy + dz * uz) / (depth * t);
  return { x: sx, y: sy, front: depth > 0 };
}

// A screen fraction (0 = top, 1 = bottom) inside the free band → NDC y
const bandNdc = (frame, f) => 1 - 2 * (frame.top + f * (frame.bottom - frame.top));

// A look point for a camera at `pos` such that `target` shows at band fraction f (the same column,
// the screen's centre): the view is tilted by the angle between the target and that spot.
export function lookPlacing(pos, target, f, frame) {
  const t = Math.tan(frame.fov * DEG / 2);
  const hx = target.x - pos.x, hz = target.z - pos.z, h = Math.hypot(hx, hz) || 1e-6;
  const dep = Math.atan2(pos.y - target.y, h) + Math.atan(bandNdc(frame, f) * t);
  const L = Math.hypot(h, pos.y - target.y);
  return { x: pos.x + hx / h * Math.cos(dep) * L, y: pos.y - Math.sin(dep) * L, z: pos.z + hz / h * Math.cos(dep) * L };
}

// Is the straight line from a to b clear of the ground (by `clear` m)? Sampled every ~2 m.
export function lineClear(heightAt, a, b, clear = 0) {
  const n = Math.max(4, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / CAM.losStep));
  for (let k = 1; k < n; k++) {
    const s = k / n, x = a.x + (b.x - a.x) * s, z = a.z + (b.z - a.z) * s, y = a.y + (b.y - a.y) * s;
    if (heightAt(x, z) + clear > y) return false;
  }
  return true;
}

// V1: the aiming view: main's camera as before Phase V (owner on PR #63: "the aiming camera was fine
// before"; the 🔍 Landing button is how the player looks at the marker). Behind the ball on the aim
// line: full shots CAM.aim (7 m back, 2.6 m × CAM_AIM_HEIGHT up, looking 30 m ahead), putts CAM.putt
// (3.5 m, 1.6 m, 5 m). CAM_AIM_HEIGHT (owner on #63: "a bit too low"): 1 = main's height, default 1.25.
// The one change: when the ball would show below the free band (landscape phones, where it hid behind
// the hint line, or facing a steep upslope), the camera tilts down just enough that the ball sits at
// CAM.ballMax of the band. Same spot; wherever main showed the ball, the view is exactly main's.
//   ball = {x,y,z}, dir = {x,z} (unit, the aim), putt
export function aimView(heightAt, { ball, dir, putt = false }, frame) {
  const c = putt ? CAM.putt : CAM.aim;
  const gy = heightAt(ball.x, ball.z);
  const pos = { x: ball.x - dir.x * c.back, y: gy + c.up * (putt ? 1 : TUNE.CAM_AIM_HEIGHT), z: ball.z - dir.z * c.back };
  pos.y = Math.max(pos.y, heightAt(pos.x, pos.z) + c.clear);
  const look = { x: ball.x + dir.x * c.ahead, y: 0, z: ball.z + dir.z * c.ahead };
  look.y = heightAt(look.x, look.z);
  const view = { pos, look };
  if (!frame) return view;
  const s = project(view, ball, frame), y01 = (1 - s.y) / 2;
  const limit = frame.top + CAM.ballMax * (frame.bottom - frame.top);
  if (s.front && y01 <= limit) return view;
  return { pos, look: lookPlacing(pos, ball, CAM.ballMax, frame) };
}

// V2: the landing view (full shots, the 🔍 button). From behind and above the aim marker, looking at
// it: the landing area with what's around it (bunkers, water, trees, the green). The marker stays
// where the player aims; nothing else changes.
export function landingView(heightAt, { ball, dir, mark }, frame) {
  const c = CAM.landing;
  const D = Math.hypot(mark.x - ball.x, mark.z - ball.z);
  const back = clamp(D * c.backK, c.backMin, c.backMax);
  const pos = { x: mark.x - dir.x * back, y: mark.y + back * c.heightK, z: mark.z - dir.z * back };
  pos.y = Math.max(pos.y, heightAt(pos.x, pos.z) + c.clear);
  return { pos, look: lookPlacing(pos, mark, c.markAt, frame) };
}

// V2: the green-reading views (putts, the 👁 button).
//   'above': high over the middle of the putt, the aim pointing up the screen, ball and cup both in the
//            free band (the slope grid and the line from the ball to the cup at a glance);
//   'low':   crouched just behind the ball at grass level, looking along the line at the cup (the
//            ground's tilt shows against the horizon).
export function readView(heightAt, { ball, dir, cup }, mode, frame) {
  if (mode === 'low') {
    const c = CAM.readLow;
    const pos = { x: ball.x - dir.x * c.back, y: 0, z: ball.z - dir.z * c.back };
    pos.y = heightAt(pos.x, pos.z) + c.height;
    return { pos, look: lookPlacing(pos, cup, c.cupAt, frame) };
  }
  const c = CAM.readAbove;
  const L = Math.hypot(cup.x - ball.x, cup.z - ball.z);
  const mid = { x: (ball.x + cup.x) / 2, z: (ball.z + cup.z) / 2 };
  // High enough that the putt's length fills `fill` of the band (looking almost straight down)
  const span = (frame.bottom - frame.top) * c.fill, t = Math.tan(frame.fov * DEG / 2);
  const H = clamp((L + c.margin) / (2 * t * span), c.hMin, c.hMax);
  const pos = { x: mid.x - dir.x * H * c.tilt, y: heightAt(mid.x, mid.z) + H, z: mid.z - dir.z * H * c.tilt };
  return { pos, look: lookPlacing(pos, { x: mid.x, y: heightAt(mid.x, mid.z), z: mid.z }, c.midAt, frame) };
}

// The view buttons (V2) by shot: which views a button press steps through, in order. A tap moves to
// the next one (after the last: back to the aiming view); holding the button shows the first one
// until it is released.
export const VIEW_STEPS = Object.freeze({ full: Object.freeze(['landing']), putt: Object.freeze(['above', 'low']) });
// The next view after `cur` (null = the aiming view) for a full shot or a putt
export function nextView(cur, putt) {
  const steps = VIEW_STEPS[putt ? 'putt' : 'full'];
  const i = steps.indexOf(cur);
  return i < 0 ? steps[0] : i + 1 < steps.length ? steps[i + 1] : null;
}

// --- V3: the ball-flight camera ---------------------------------------------------------------
// The flight views. 'behind' is the chase camera (game/camera.js, as before Phase V). 'side' and
// 'landing' stand still at a spot picked when the ball is hit and turn to watch the ball.
export const FLIGHT_VIEWS = Object.freeze(['behind', 'side', 'landing']);

// Where a 'side' or 'landing' camera stands for a shot. shot = { from, dir: {x,z} (unit), land
// (predicted landing, no wind/curve), carry (m, flat), apex (m above the start) }, side = ±1 (right / left
// of the flight line). Returns { x, y, z }.
export function flightSpot(heightAt, kind, shot, side) {
  const { from, dir, land, carry, apex } = shot;
  const px = -dir.z * side, pz = dir.x * side; // perpendicular, to the right for side = +1
  let x, z, up;
  if (kind === 'side') {
    const c = CAM.side;
    x = from.x + dir.x * carry * c.along + px * carry * c.off;
    z = from.z + dir.z * carry * c.along + pz * carry * c.off;
    up = Math.max(c.minH, apex * c.apexK);
  } else {
    const c = CAM.landingCam;
    x = land.x + dir.x * c.past + px * c.off;
    z = land.z + dir.z * c.past + pz * c.off;
    up = c.height;
  }
  return { x, y: heightAt(x, z) + up, z };
}

// Can a camera at `spot` see the shot (never blind)? It must stand in bounds (outside the OB line the
// scenery forest is drawn) and see the landing spot, the top of the flight and the start past the
// hills and the in-play trees and rocks (world.obstacles, core/obstacles.js colliders).
function seesShot(world, spot, shot) {
  const { heightAt, surfaceAt, obstacles = [], penalty = () => false } = world;
  if (surfaceAt && penalty(surfaceAt(spot.x, spot.z))) return false;
  const top = { x: (shot.from.x + shot.land.x) / 2, y: shot.from.y + shot.apex, z: (shot.from.z + shot.land.z) / 2 };
  const land = { ...shot.land, y: shot.land.y + 1 }, from = { ...shot.from, y: shot.from.y + 1 };
  for (const p of [land, top, from]) {
    if (!lineClear(heightAt, spot, p)) return false;
    if (obstacles.length && firstHit(obstacles, spot, p)) return false;
  }
  return true;
}

// V3 rules: which view films this shot. world = { heightAt, surfaceAt?, penalty?(surfaceId), obstacles? }
// (a bare heightAt function also works), rng = the view stream (its own seeded RNG, never the
// physics one), history = the views of this hole's earlier shots (oldest first), shot as above plus
// putt (true for a putt) and classic (the Settings switch: always 'behind'). Returns { kind, spot (null for 'behind'), side }.
//   1. putts, and full shots carrying less than CAM_VARIETY_MIN, are 'behind' (and CAM_VARIETY 0 = Classic: always)
//   2. else a weighted draw (CAM_W_BEHIND / SIDE / LANDING)
//   3. no view more than CAM_MAX_RUN times in a row, and 'landing' never twice in a row
//   4. a 'side' or 'landing' spot that can't see the shot (seesShot) is not used: the other side is tried first
// The draw always takes the same number of random numbers (2), so the stream stays in step whatever wins.
export function pickFlightView(world, rng, history, shot) {
  if (typeof world === 'function') world = { heightAt: world };
  const heightAt = world.heightAt;
  const r1 = rng(), r2 = rng();
  const behind = { kind: 'behind', spot: null, side: 0 };
  if (TUNE.CAM_VARIETY < 0.5 || shot.classic || shot.putt || shot.carry < TUNE.CAM_VARIETY_MIN) return behind;
  const side = r2 < 0.5 ? -1 : 1;
  const run = k => { let n = 0; for (let i = history.length - 1; i >= 0 && history[i] === k; i--) n++; return n; };
  const allowed = k => (k === 'landing' ? run(k) < 1 : run(k) < TUNE.CAM_MAX_RUN);
  const w = { behind: TUNE.CAM_W_BEHIND, side: TUNE.CAM_W_SIDE, landing: TUNE.CAM_W_LANDING };
  const total = FLIGHT_VIEWS.reduce((a, k) => a + w[k], 0);
  let pick = 'behind', acc = 0;
  if (total > 0) for (const k of FLIGHT_VIEWS) { acc += w[k] / total; if (r1 < acc) { pick = k; break; } }
  // The drawn view breaks a rule: the next view in the list that doesn't (wrapping round)
  const order = FLIGHT_VIEWS.slice(FLIGHT_VIEWS.indexOf(pick)).concat(FLIGHT_VIEWS.slice(0, FLIGHT_VIEWS.indexOf(pick)));
  for (const k of order) {
    if (!allowed(k) || (k !== 'behind' && !(w[k] > 0))) continue;
    if (k === 'behind') return behind;
    for (const sd of [side, -side]) {
      const spot = flightSpot(heightAt, k, shot, sd);
      if (seesShot(world, spot, shot)) return { kind: k, spot, side: sd };
    }
  }
  return behind;
}

// --- V4: the hole flyover -------------------------------------------------------------------------
// The hole's regular route (owner: no need to show every route): tee → the landing area → green.
// Par 3: tee → cup. Par 4/5: the landing area is the hole's `aimTarget`, else `teeAim` (the S21 tee aim
// point with the Driver, given by the caller). Doglegs use aimTarget, not the playLine corner (PM on #63).
export function flyoverRoute(hole, teeAim = null) {
  const pt = p => ({ x: p.x, z: p.z });
  if (hole.par <= 3) return [pt(hole.tee), pt(hole.cup)];
  const land = hole.aimTarget ?? teeAim;
  return land ? [pt(hole.tee), pt(land), pt(hole.cup)] : [pt(hole.tee), pt(hole.cup)];
}

// The flyover's camera path: the route smoothed (Catmull-Rom), run on past the cup by CAM.flyover.past
// so the camera ends behind the green looking back at the flag. Returns { length (m), duration (s), at(t) }
// where at(t) for t in seconds gives { pos, look } (t is clamped; smoothstep easing at both ends).
export function flyoverPath(heightAt, route) {
  const c = CAM.flyover;
  const n = route.length, a = route[n - 2], b = route[n - 1];
  const dl = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const pts = [...route, { x: b.x + (b.x - a.x) / dl * c.past, z: b.z + (b.z - a.z) / dl * c.past }];
  // Sample the spline densely and measure it, so the camera moves at an even speed
  const P = i => pts[Math.max(0, Math.min(pts.length - 1, i))];
  const cr = (p0, p1, p2, p3, s) => 0.5 * (2 * p1 + (p2 - p0) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s * s + (3 * p1 - p0 - 3 * p2 + p3) * s * s * s);
  const samples = [];
  for (let i = 0; i < pts.length - 1; i++) {
    for (let k = 0; k < c.samples; k++) {
      const s = k / c.samples, p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      samples.push({ x: cr(p0.x, p1.x, p2.x, p3.x, s), z: cr(p0.z, p1.z, p2.z, p3.z, s) });
    }
  }
  samples.push(pts[pts.length - 1]);
  const cum = [0];
  for (let i = 1; i < samples.length; i++) cum.push(cum[i - 1] + Math.hypot(samples[i].x - samples[i - 1].x, samples[i].z - samples[i - 1].z));
  const length = cum[cum.length - 1];
  const cupAt = (() => { let best = 0, bd = Infinity; samples.forEach((p, i) => { const d = Math.hypot(p.x - b.x, p.z - b.z); if (d < bd) { bd = d; best = i; } }); return cum[best]; })();
  const duration = clamp(length / TUNE.CAM_FLYOVER_SPEED, c.minTime, c.maxTime);
  const pointAt = d => {
    d = clamp(d, 0, length);
    let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
    const f = (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
    return { x: samples[i - 1].x + (samples[i].x - samples[i - 1].x) * f, z: samples[i - 1].z + (samples[i].z - samples[i - 1].z) * f };
  };
  const cupPt = { x: b.x, y: heightAt(b.x, b.z), z: b.z };
  function at(t) {
    const u = clamp(t / duration, 0, 1), e = u * u * (3 - 2 * u), d = e * length;
    const q = pointAt(d);
    // Height: c.height over the course, down to c.endHeight over the last c.descend of the path
    const near = clamp((d - (length - c.descend)) / c.descend, 0, 1);
    const pos = { x: q.x, y: heightAt(q.x, q.z) + c.height + (c.endHeight - c.height) * near, z: q.z };
    // Look ahead along the route; from c.lookCup m before the cup on, at the flag (so the end looks back at it)
    let look;
    if (d >= cupAt - c.lookCup) look = { ...cupPt };
    else { const l = pointAt(Math.min(d + c.lookAhead, cupAt)); look = { x: l.x, y: heightAt(l.x, l.z), z: l.z }; }
    return { pos, look };
  }
  return { length, duration, at };
}
