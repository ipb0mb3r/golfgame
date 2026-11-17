// The 3-click swing (DESIGN.md §3): the meter state machine and turning a swing into a launch.
import {
  G, MAX_METER_DT, METER_MIN, CURVE_SHAPE_REF, CURVE_REF_SPEED, MIN_POWER, PERFECT_POWER, SLIGHT_ERROR, SPIN, PUTT, TUNE,
} from './config.js';
import { dirFromAim, rightFromAim, clamp, degToRad } from './vec.js';

// Meter phases (DESIGN §3 "Missed clicks"; the list is METER_PHASES in core/states.js):
//   'aim'       waiting for click 1
//   'power'     filling toward 1; a click sets the power
// The top of the meter is the lie's power cap `m.cap` (S11, default 1): everything below that says
// "1" applies at the cap instead.
//   'grace'     the meter reached 1 and the marker is coming back; for POWER_GRACE s a click still
//               counts as the power click with power = 1 ("MAX!")
//   'nopower'   the grace window passed with no power click (meter shown red); a click = mini shot
//   'accuracy'  power is set, the marker is coming back; a click sets the accuracy
//   'done'      the swing has ended
// A swing ends with a result { power, acc, outcome }:
//   outcome 'normal'  all three clicks
//           'shank'   no 3rd click: huge slice (error −NO_ACC_ERR)
//           'topped'  no power click, then a click on the way back: power = MISSED_POWER_FRACTION
//           'cancel'  start click only: no shot and no stroke
//
// Real click time (S16, Gate A C3): `m.t` is the time (s, any clock) the marker has been moved up
// to. The game moves it with tickMeterTo(m, frameTime) every frame and clicks with
// pressMeterAt(m, clickTime), which first moves the marker to the moment of the click. So a click
// reads the meter where it really was when the player clicked, not where it was at the last frame,
// and the same click times give the same swing at 30 or 144 fps.
export function createMeter(cap = 1) { return { phase: 'aim', value: 0, power: 0, graceT: 0, event: null, cap, t: 0 }; }

// Back to aim. `cap` = the power cap for the next swing (keeps the current one when left out).
export function resetMeter(m, cap = m.cap) { m.phase = 'aim'; m.value = 0; m.power = 0; m.graceT = 0; m.event = null; m.cap = cap; return m; }

// Which phases are mid-swing is decided in one place (Gate A A3): core/states.js
import { isSwinging } from './states.js';
export { isSwinging };

// A click. Returns the swing result when this click ends the swing, otherwise null.
export function pressMeter(m) {
  switch (m.phase) {
    case 'aim': m.phase = 'power'; m.value = 0; m.power = 0; m.graceT = 0; return null;
    case 'power': m.power = m.value; m.phase = 'accuracy'; return null;
    case 'grace': m.power = m.cap; m.phase = 'accuracy'; return null;
    case 'nopower': m.phase = 'done'; m.power = TUNE.MISSED_POWER_FRACTION; return { power: TUNE.MISSED_POWER_FRACTION, acc: m.value, outcome: 'topped' };
    case 'accuracy': m.phase = 'done'; return { power: m.power, acc: m.value, outcome: 'normal' };
    default: return null;
  }
}

// The meter's clock (S16): move the marker from m.t to `now` (seconds). Each move is capped at
// MAX_METER_DT, so a long stall (a hidden tab, a slow frame) can't jump the marker past the window.
// Time never runs backwards: an earlier `now` moves nothing. Returns what tickMeter returns.
export function tickMeterTo(m, now) {
  const dt = Math.min(Math.max(now - m.t, 0), MAX_METER_DT);
  if (now > m.t) m.t = now;
  return tickMeter(m, dt);
}

// A click at time `now` (seconds, the same clock as tickMeterTo). The first click starts the meter's
// clock at the click; a later click first moves the marker to the moment of the click, then reads it.
// If the swing ended on its own before the click (the marker reached METER_MIN), that result is
// returned and the click does nothing. Returns the swing result when the swing ends, otherwise null.
export function pressMeterAt(m, now) {
  if (m.phase === 'aim') { m.t = now; return pressMeter(m); }
  if (isSwinging(m.phase)) { const r = tickMeterTo(m, now); if (r) return r; }
  return pressMeter(m);
}

// Move the marker by dt seconds of real time. Returns a swing result if the swing ends on its own
// (marker reaches METER_MIN), otherwise null. `m.event` is set for the HUD when something happens:
// 'max' (meter reached 1) or 'nopower' (grace window passed).
export function tickMeter(m, dt) {
  m.event = null;
  const step = dt * TUNE.METER_SPEED;
  if (m.phase === 'power') {
    m.value += step;
    if (m.value < m.cap) return null;
    // Reached the top (the cap): the marker turns back (keeping the overshoot) and the grace window starts.
    const over = m.value - m.cap;
    m.value = m.cap - over; m.phase = 'grace'; m.graceT = over / TUNE.METER_SPEED; m.event = 'max';
    if (m.graceT <= TUNE.POWER_GRACE) return null;
    m.phase = 'nopower'; m.event = 'nopower'; // a frame long enough to skip the whole window
  } else if (m.phase === 'grace') {
    m.value -= step; m.graceT += dt;
    if (m.graceT > TUNE.POWER_GRACE) { m.phase = 'nopower'; m.event = 'nopower'; }
  } else if (m.phase === 'nopower' || m.phase === 'accuracy') {
    m.value -= step;
  } else return null;
  if (m.value > METER_MIN) return null;
  m.value = METER_MIN;
  const hadPower = m.phase === 'accuracy';
  m.phase = 'done';
  return hadPower ? { power: m.power, acc: METER_MIN, outcome: 'shank' } : { power: 0, acc: METER_MIN, outcome: 'cancel' };
}

// Accuracy → error: 0 inside the sweet spot. > 0 = early (hook, curves left), < 0 = late (slice, curves right).
// Outside the sweet spot the error grows with |acc| ^ CURVE_SHAPE, scaled so every shape gives the same
// error at |acc| = CURVE_SHAPE_REF: shape 1 = linear (error = acc), shape 2 = small misses curve gently.
// sweetScale (S11) widens or narrows the window for the lie.
export const sweetHalfWidth = (sweetScale = 1) => TUNE.SWEET * sweetScale;
export function accuracyError(acc, sweetScale = 1) {
  const a = Math.abs(acc);
  if (a <= sweetHalfWidth(sweetScale)) return 0;
  return Math.sign(acc) * CURVE_SHAPE_REF * (a / CURVE_SHAPE_REF) ** TUNE.CURVE_SHAPE;
}

// The curve error of a swing result: a missed 3rd click is a fixed huge slice.
export const swingError = (acc, outcome = 'normal', sweetScale = 1) => (outcome === 'shank' ? -TUNE.NO_ACC_ERR : accuracyError(acc, sweetScale));

export function shotLabel(power, err, outcome = 'normal') {
  if (outcome === 'shank') return 'Shanked!';
  if (outcome === 'topped') return 'Topped!';
  if (err === 0) return power > PERFECT_POWER ? 'Perfect!' : 'Nice shot!';
  return err > 0 ? (err < SLIGHT_ERROR ? 'Slight hook' : 'Hook!') : (err > -SLIGHT_ERROR ? 'Slight slice' : 'Slice!');
}

// Launch velocity for a full shot: power p carries p × `carry` meters on flat ground (no air drag),
// from any lie (S11: the lie caps the power instead of hiding a multiplier).
export function launchVelocity(club, p, aim) {
  const theta = degToRad(club.loft);
  const carry = p * club.carry;
  const v = Math.sqrt(carry * G / Math.sin(2 * theta));
  const d = dirFromAim(aim), h = v * Math.cos(theta);
  return { vel: { x: d.x * h, y: v * Math.sin(theta), z: d.z * h }, speed: v };
}

// Everything a swing decides. Same inputs always give the same output.
//   club, power (0..1), acc (meter value at click 3), aim (rad), puttMax (m), greenDecel (m/s²),
//   outcome (from the meter, default 'normal'), lie ({ maxPower, sweetScale }, default no limits)
export function resolveShot({ club, power, acc, aim, puttMax, greenDecel, outcome = 'normal', lie = { maxPower: 1, sweetScale: 1 } }) {
  const err = swingError(acc, outcome, lie.sweetScale);
  const p = Math.max(Math.min(power, lie.maxPower), MIN_POWER); // the cap is enforced here too
  const label = shotLabel(power, err, outcome);
  if (club.putter) {
    const ang = aim - err * PUTT.aimErrorK;
    const D = p * puttMax;
    const v0 = Math.sqrt(2 * greenDecel * D);   // on flat ground this stops after D meters
    const dir = { x: Math.sin(ang), y: 0, z: -Math.cos(ang) };
    return { kind: 'putt', err, label, vel: { x: dir.x * v0, y: 0, z: dir.z * v0 }, curve: { x: 0, y: 0, z: 0 }, spinFactor: 1, dir };
  }
  const { vel, speed } = launchVelocity(club, p, aim);
  const r = rightFromAim(aim), c = -err * TUNE.CURVE_K * (speed / CURVE_REF_SPEED);
  const spinFactor = clamp(SPIN.base - club.loft / SPIN.loftScale, SPIN.min, SPIN.max);
  return { kind: 'full', err, label, vel, curve: { x: r.x * c, y: r.y * c, z: r.z * c }, spinFactor, dir: dirFromAim(aim) };
}
