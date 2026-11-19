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
// (3.5 m, 1.6 m, 5 m). CAM_AIM_HEIGHT: 1 = main's height, the default (owner on #63: "the today camera is the best").
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
// of the flight line), tryAt = { up, off } (CAM.side.tries: higher and further out, QA-1). Returns { x, y, z }.
export function flightSpot(heightAt, kind, shot, side, tryAt = { up: 0, off: 0 }) {
  const { from, dir, land, carry, apex } = shot;
  const px = -dir.z * side, pz = dir.x * side; // perpendicular, to the right for side = +1
  let x, z, up;
  if (kind === 'side') {
    const c = CAM.side;
    x = from.x + dir.x * carry * c.along + px * carry * (c.off + tryAt.off);
    z = from.z + dir.z * carry * c.along + pz * carry * (c.off + tryAt.off);
    up = Math.max(c.minH, apex * c.apexK) + tryAt.up;
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
//   4. a 'side' or 'landing' spot that can't see the shot (seesShot) is not used. A side camera first tries
//      higher and further out (CAM.side.tries, QA-1: above the tree tops), then the same on the other side;
//      a landing camera tries the other side. Then 'behind'.
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
    const tries = k === 'side' ? CAM.side.tries : [undefined];
    for (const sd of [side, -side]) for (const tryAt of tries) {
      const spot = flightSpot(heightAt, k, shot, sd, tryAt);
      if (seesShot(world, spot, shot)) return { kind: k, spot, side: sd };
    }
  }
  return behind;
}

// V3 (owner on #63: "the pause after hitting the ball where you wonder where it is going"): does the
// camera stay at address, only turning to watch the ball? For CAM_FLIGHT_HOLD s after a full shot, and
// with CAM_BEHIND_STAY a 'behind' shot until the ball first lands. Putts: never (they follow as before).
//   s = { putt, kind (the flight view), t (s since the hit), landed }
export function flightHolds({ putt, kind, t, landed }) {
  if (putt) return false;
  if (t < TUNE.CAM_FLIGHT_HOLD) return true;
  return kind === 'behind' && TUNE.CAM_BEHIND_STAY >= 0.5 && !landed;
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

// The flyover's camera path (owner on #63: slower, start high behind the tee, no dive, smooth).
// Built once per hole, then read by time:
//   1. the route (a point startBack m behind the tee, the tee, one lead m down the first leg, the landing
//      area, a stop endBack m short of the cup) as a centripetal Catmull-Rom spline (no loops or overshoot),
//   2. smoothed (moving average, smoothPasses × smoothM m) and resampled every `step` m by arc length,
//   3. the height: the ground smoothed over ±groundSmoothM m plus a profile (startHeight above the tee,
//      easing to `height`, then to endHeight over the last `descend` m), never under minClear m,
//   4. the look target leads lookAhead m along the path, averaged (damped) over ±lookSmoothM m; it starts
//      on the tee box (turning ahead over the first teeLook m) and slides onto the flag over the last lookCup m,
//   5. travel time = length / CAM_FLYOVER_SPEED (clamped to [minTime, maxTime]) with an ease-in / ease-out
//      speed curve (accel and decel shares of the time), then a CAM_FLYOVER_PAUSE s pause and a slow
//      orbit of orbitDeg round the cup in CAM_FLYOVER_ORBIT s, looking at the flag.
// Returns { length (m), travel (s), duration (s, all of it), at(t) } where at(t) (seconds, clamped) gives { pos, look }.
export function flyoverPath(heightAt, route) {
  const c = CAM.flyover;
  const n = route.length, a = route[n - 2], b = route[n - 1], t0 = route[0], t1 = route[1];
  const dl = Math.hypot(b.x - a.x, b.z - a.z) || 1, d0 = Math.hypot(t1.x - t0.x, t1.z - t0.z) || 1;
  const ux = (t1.x - t0.x) / d0, uz = (t1.z - t0.z) / d0;
  const start = { x: t0.x - ux * c.startBack, z: t0.z - uz * c.startBack };
  const endBack = Math.min(c.endBack, dl * 0.5);
  const stop = { x: b.x - (b.x - a.x) / dl * endBack, z: b.z - (b.z - a.z) / dl * endBack };
  const lead = Math.min(c.lead, d0 * 0.5);
  const pts = [start, t0, { x: t0.x + ux * lead, z: t0.z + uz * lead }, ...route.slice(1, -1), stop];
  // 1. centripetal Catmull-Rom (alpha 0.5), with mirrored end points
  const P = i => i < 0 ? { x: 2 * pts[0].x - pts[1].x, z: 2 * pts[0].z - pts[1].z }
    : i >= pts.length ? { x: 2 * pts[pts.length - 1].x - pts[pts.length - 2].x, z: 2 * pts[pts.length - 1].z - pts[pts.length - 2].z } : pts[i];
  const raw = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const kt = (p, q) => Math.max(1e-6, Math.sqrt(Math.hypot(q.x - p.x, q.z - p.z)));
    const T1 = kt(p0, p1), T2 = T1 + kt(p1, p2), T3 = T2 + kt(p2, p3);
    for (let k = 0; k < c.samples; k++) {
      const t = T1 + (T2 - T1) * k / c.samples;
      const L = (pa, pb, ta, tb) => ({ x: (pa.x * (tb - t) + pb.x * (t - ta)) / (tb - ta), z: (pa.z * (tb - t) + pb.z * (t - ta)) / (tb - ta) });
      const A1 = L(p0, p1, 0, T1), A2 = L(p1, p2, T1, T2), A3 = L(p2, p3, T2, T3);
      const B1 = L(A1, A2, 0, T2), B2 = L(A2, A3, T1, T3);
      raw.push(L(B1, B2, T1, T2));
    }
  }
  raw.push(pts[pts.length - 1]);
  // 2. resample by arc length, smooth, resample again (so the speed along it is even)
  const resample = arr => {
    const cum = [0];
    for (let i = 1; i < arr.length; i++) cum.push(cum[i - 1] + Math.hypot(arr[i].x - arr[i - 1].x, arr[i].z - arr[i - 1].z));
    const L = cum[cum.length - 1], m = Math.max(2, Math.ceil(L / c.step)), out = [];
    for (let k = 0, j = 1; k <= m; k++) {
      const d = L * k / m;
      while (j < arr.length - 1 && cum[j] < d) j++;
      const f = (d - cum[j - 1]) / ((cum[j] - cum[j - 1]) || 1);
      out.push({ x: arr[j - 1].x + (arr[j].x - arr[j - 1].x) * f, z: arr[j - 1].z + (arr[j].z - arr[j - 1].z) * f });
    }
    return out;
  };
  // A moving average over ±w samples that keeps the two ends where they are
  const smoothArr = (arr, w, get, set) => {
    const out = arr.map(v => ({ ...v }));
    for (let i = 1; i < arr.length - 1; i++) {
      const r = Math.min(w, i, arr.length - 1 - i);
      let acc = null;
      for (let j = i - r; j <= i + r; j++) { const v = get(arr[j]); acc = acc ? acc.map((x, q) => x + v[q]) : [...v]; }
      set(out[i], acc.map(x => x / (2 * r + 1)));
    }
    return out;
  };
  let path = resample(raw);
  const wS = Math.max(1, Math.round(c.smoothM / c.step));
  for (let k = 0; k < c.smoothPasses; k++) path = smoothArr(path, wS, v => [v.x, v.z], (o, [x, z]) => { o.x = x; o.z = z; });
  path = resample(path);
  const N = path.length, step = (() => { let L = 0; for (let i = 1; i < N; i++) L += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z); return L / (N - 1); })();
  const length = step * (N - 1), dAt = i => i * step;
  const sm = u => u * u * (3 - 2 * u);
  // Never blind at the start: behind a tee cut into a slope the camera rises until it sees the tee box
  const teeY = heightAt(t0.x, t0.z) + 1, gs = Math.max(heightAt(start.x, start.z), teeY - 1); // startHeight is over the tee too
  let lift = 0;
  while (lift < c.startLiftMax && !lineClear(heightAt, { x: start.x, y: gs + c.startHeight + lift, z: start.z }, { x: t0.x, y: teeY, z: t0.z })) lift += 1;
  // 3. the height: smoothed ground + a smooth profile, never under minClear
  const ground = path.map(q => heightAt(q.x, q.z));
  const wG = Math.max(1, Math.round(c.groundSmoothM / c.step));
  let gS = ground.map(g => ({ g }));
  for (let k = 0; k < 2; k++) gS = smoothArr(gS, wG, v => [v.g], (o, [g]) => { o.g = g; });
  const profile = d => {
    const up = clamp(d / c.rise, 0, 1), down = clamp((d - (length - c.descend)) / Math.max(1, c.descend), 0, 1);
    return (c.startHeight + lift) + (c.height - c.startHeight - lift) * sm(up) + (c.endHeight - c.height) * sm(down);
  };
  let ys = path.map((q, i) => ({ y: Math.max(gS[i].g + profile(dAt(i)), ground[i] + c.minClear) }));
  ys[0].y = gs + c.startHeight + lift;
  for (let k = 0; k < 2; k++) ys = smoothArr(ys, wG, v => [v.y], (o, [y]) => { o.y = y; });
  ys = ys.map((v, i) => ({ y: Math.max(v.y, ground[i] + c.minClear) }));
  // 4. the look target: lead along the path, damped, from the tee box to the flag
  const cupPt = { x: b.x, y: heightAt(b.x, b.z), z: b.z }, teePt = { x: t0.x, y: heightAt(t0.x, t0.z), z: t0.z };
  const nLead = Math.round(c.lookAhead / step);
  let looks = path.map((q, i) => { const j = Math.min(N - 1, i + nLead); return { x: path[j].x, z: path[j].z }; });
  const wL = Math.max(1, Math.round(c.lookSmoothM / step));
  for (let k = 0; k < 2; k++) looks = smoothArr(looks, wL, v => [v.x, v.z], (o, [x, z]) => { o.x = x; o.z = z; });
  // The tee part is blended as a DIRECTION (pitch and yaw from the start pose toward the tee box, easing
  // to the look-ahead direction over the first teeLook m), so the look point never sweeps under the camera
  const p0 = { x: path[0].x, y: ys[0].y, z: path[0].z };
  const yaw0 = Math.atan2(teePt.x - p0.x, teePt.z - p0.z), pitch0 = Math.atan2(teePt.y - p0.y, Math.hypot(teePt.x - p0.x, teePt.z - p0.z));
  looks = looks.map((l, i) => {
    const d = dAt(i), wt = 1 - sm(clamp(d / c.teeLook, 0, 1)), wc = sm(clamp((d - (length - c.lookCup)) / c.lookCup, 0, 1));
    let x = l.x, z = l.z, y = heightAt(x, z);
    if (wt > 0) {
      const q = { x: path[i].x, y: ys[i].y, z: path[i].z };
      const yaw1 = Math.atan2(x - q.x, z - q.z), pitch1 = Math.atan2(y - q.y, Math.hypot(x - q.x, z - q.z));
      let dy = yaw0 - yaw1; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      const yaw = yaw1 + dy * wt, pitch = pitch1 + (pitch0 - pitch1) * wt, R = Math.hypot(x - q.x, y - q.y, z - q.z); // the same distance: no step when the blend ends
      x = q.x + Math.sin(yaw) * Math.cos(pitch) * R; z = q.z + Math.cos(yaw) * Math.cos(pitch) * R; y = q.y + Math.sin(pitch) * R;
    }
    x += (cupPt.x - x) * wc; z += (cupPt.z - z) * wc; y += (cupPt.y - y) * wc;
    return { x, y, z };
  });
  looks[N - 1] = { ...cupPt };
  // 5. time: an ease-in / ease-out speed curve (accelerate over `accel` of the time, slow over `decel`)
  const travel = clamp(length / TUNE.CAM_FLYOVER_SPEED, c.minTime, c.maxTime);
  const pause = TUNE.CAM_FLYOVER_PAUSE, orbit = TUNE.CAM_FLYOVER_ORBIT;
  const duration = travel + pause + orbit;
  const A = c.accel, D = c.decel, vmax = 1 / (1 - A / 2 - D / 2); // the share of the path per share of time at full speed
  const progress = u => {
    if (u <= A) { const s = u / A; return vmax * A * (s * s * s * (1 - s / 2)) ; } // smooth start (zero speed and zero acceleration)
    if (u >= 1 - D) { const s = (1 - u) / D; return 1 - vmax * D * (s * s * s * (1 - s / 2)); }
    return vmax * (A / 2 + (u - A));
  };
  const sample = (arr, f) => { const x = clamp(f, 0, 1) * (N - 1), i = Math.min(N - 2, Math.floor(x)), r = x - i; return [arr[i], arr[i + 1], r]; };
  const lerp3 = (p, q, r, y0, y1) => ({ x: p.x + (q.x - p.x) * r, y: y0 + (y1 - y0) * r, z: p.z + (q.z - p.z) * r });
  const endPos = { x: path[N - 1].x, y: ys[N - 1].y, z: path[N - 1].z };
  function at(t) {
    t = clamp(t, 0, duration);
    if (t <= travel) {
      const f = progress(travel > 0 ? t / travel : 1);
      const [p, q, r] = sample(path, f), [ya, yb] = sample(ys, f), [la, lb] = sample(looks, f);
      return { pos: lerp3(p, q, r, ya.y, yb.y), look: lerp3(la, lb, r, la.y, lb.y) };
    }
    const u = orbit > 0 ? clamp((t - travel - pause) / orbit, 0, 1) : 0, e = sm(u);
    const ang = e * c.orbitDeg * Math.PI / 180, rx = endPos.x - cupPt.x, rz = endPos.z - cupPt.z;
    const x = cupPt.x + rx * Math.cos(ang) - rz * Math.sin(ang), z = cupPt.z + rx * Math.sin(ang) + rz * Math.cos(ang);
    return { pos: { x, y: Math.max(endPos.y, heightAt(x, z) + c.minClear), z }, look: { ...cupPt } };
  }
  return { length, travel, duration, at };
}
