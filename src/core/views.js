// Camera views (Phase V, DESIGN §4 "Camera"): WHERE the camera stands and what it looks at, as pure
// math on the hole's terrain. No Three.js and no DOM: src/game/camera.js only eases toward the
// { pos, look } these return, so the choices are tested in Node (tests/views.test.js).
//
// A view is { pos: {x,y,z}, look: {x,y,z} } for a perspective camera with a vertical field of view of
// `fov` degrees. `frame` says where on the screen things must show:
//   { aspect (width / height), fov (deg), top, bottom } — top/bottom = the free band of the 3D view as
//   fractions of the canvas height (0 = top edge, 1 = bottom edge): below it sits the meter panel.
import { TUNE, CAM } from './config.js';

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

// V1: the aiming view. Behind the ball on the aim line, high enough that the ball shows near the
// bottom of the free band (CAM_AIM_BALL) and the aim marker (or a putt's end point) near its top
// (CAM_AIM_MARK), so the whole flight, the landing area and the hazards in the way are on screen.
//   ball = {x,y,z}, dir = {x,z} (unit, the aim), mark = {x,y,z} (the marker / the putt's end), putt
// The camera distance behind the ball grows with the shot (CAM.aim.backK), the height is solved.
// Never blind: if a hill hides the marker from there, the camera steps back and up until it shows.
export function aimView(heightAt, { ball, dir, mark, putt = false }, frame) {
  const c = putt ? CAM.putt : CAM.aim;
  const D = Math.max(c.minDist, Math.hypot(mark.x - ball.x, mark.z - ball.z));
  const rise = mark.y - ball.y;
  const t = Math.tan(frame.fov * DEG / 2);
  const yb = bandNdc(frame, putt ? TUNE.CAM_PUTT_BALL : TUNE.CAM_AIM_BALL);
  const ym = bandNdc(frame, putt ? TUNE.CAM_PUTT_MARK : TUNE.CAM_AIM_MARK);
  const need = Math.atan(ym * t) - Math.atan(yb * t); // the angle between ball and marker seen from the camera
  let B = clamp(D * (putt ? c.backK : TUNE.CAM_AIM_BACK_K), c.backMin, c.backMax);
  let view = null;
  for (let tries = 0; tries <= CAM.losTries; tries++) {
    const H = solveHeight(B, D, rise, need, c);
    const pos = { x: ball.x - dir.x * B, y: ball.y + H, z: ball.z - dir.z * B };
    pos.y = Math.max(pos.y, heightAt(pos.x, pos.z) + c.clear);
    // Point the camera so the ball sits at its place in the band (the marker then lands at its own)
    view = { pos, look: lookPlacing(pos, ball, putt ? TUNE.CAM_PUTT_BALL : TUNE.CAM_AIM_BALL, frame) };
    const m = { x: mark.x, y: mark.y + CAM.markLift, z: mark.z };
    if (lineClear(heightAt, pos, m)) break;
    B *= CAM.losStepBack; // a hill is in the way: further back (and so higher)
  }
  return view;
}

// The camera height (above the ball) at which ball and marker are `need` radians apart, seen from B m
// behind the ball. The gap grows with the height until about √(B·(B+D)), so the lowest height that
// gives it is found by a scan then halving. Clamped to the view's [hMin, hMax].
function solveHeight(B, D, rise, need, c) {
  const gap = H => Math.atan2(H, B) - Math.atan2(H - rise, B + D);
  let lo = c.hMin, hi = null;
  if (gap(lo) >= need) return lo;
  for (let H = lo; H <= c.hMax; H += CAM.hScan) { if (gap(H) >= need) { hi = H; break; } lo = H; }
  if (hi === null) return c.hMax;
  for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (gap(m) >= need) hi = m; else lo = m; }
  return hi;
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
