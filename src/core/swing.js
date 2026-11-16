// The 3-click swing (DESIGN.md §3): the meter state machine and turning a swing into a launch.
import {
  G, METER_SPEED, METER_MIN, SWEET, CURVE_SHAPE, CURVE_SHAPE_REF, CURVE_K, CURVE_REF_SPEED, MIN_POWER, PERFECT_POWER,
  SLIGHT_ERROR, SPIN, PUTT, POWER_GRACE, NO_ACC_ERR, MISSED_POWER_FRACTION,
} from './config.js';
import { dirFromAim, rightFromAim, clamp, degToRad } from './vec.js';

// Meter phases (DESIGN §3 "Missed clicks"):
//   'aim'       waiting for click 1
//   'power'     filling toward 1; a click sets the power
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
export function createMeter() { return { phase: 'aim', value: 0, power: 0, graceT: 0, event: null }; }

export function resetMeter(m) { m.phase = 'aim'; m.value = 0; m.power = 0; m.graceT = 0; m.event = null; return m; }

export const isSwinging = phase => phase === 'power' || phase === 'grace' || phase === 'nopower' || phase === 'accuracy';

// A click. Returns the swing result when this click ends the swing, otherwise null.
export function pressMeter(m) {
  switch (m.phase) {
    case 'aim': m.phase = 'power'; m.value = 0; m.power = 0; m.graceT = 0; return null;
    case 'power': m.power = m.value; m.phase = 'accuracy'; return null;
    case 'grace': m.power = 1; m.phase = 'accuracy'; return null;
    case 'nopower': m.phase = 'done'; m.power = MISSED_POWER_FRACTION; return { power: MISSED_POWER_FRACTION, acc: m.value, outcome: 'topped' };
    case 'accuracy': m.phase = 'done'; return { power: m.power, acc: m.value, outcome: 'normal' };
    default: return null;
  }
}

// Move the marker by dt seconds of real time. Returns a swing result if the swing ends on its own
// (marker reaches METER_MIN), otherwise null. `m.event` is set for the HUD when something happens:
// 'max' (meter reached 1) or 'nopower' (grace window passed).
export function tickMeter(m, dt) {
  m.event = null;
  const step = dt * METER_SPEED;
  if (m.phase === 'power') {
    m.value += step;
    if (m.value < 1) return null;
    // Reached the top: the marker turns back (keeping the overshoot) and the grace window starts.
    const over = m.value - 1;
    m.value = 1 - over; m.phase = 'grace'; m.graceT = over / METER_SPEED; m.event = 'max';
    if (m.graceT <= POWER_GRACE) return null;
    m.phase = 'nopower'; m.event = 'nopower'; // a frame long enough to skip the whole window
  } else if (m.phase === 'grace') {
    m.value -= step; m.graceT += dt;
    if (m.graceT > POWER_GRACE) { m.phase = 'nopower'; m.event = 'nopower'; }
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
export function accuracyError(acc) {
  const a = Math.abs(acc);
  if (a <= SWEET) return 0;
  return Math.sign(acc) * CURVE_SHAPE_REF * (a / CURVE_SHAPE_REF) ** CURVE_SHAPE;
}

// The curve error of a swing result: a missed 3rd click is a fixed huge slice.
export const swingError = (acc, outcome = 'normal') => (outcome === 'shank' ? -NO_ACC_ERR : accuracyError(acc));

export function shotLabel(power, err, outcome = 'normal') {
  if (outcome === 'shank') return 'Shanked!';
  if (outcome === 'topped') return 'Topped!';
  if (err === 0) return power > PERFECT_POWER ? 'Perfect!' : 'Nice shot!';
  return err > 0 ? (err < SLIGHT_ERROR ? 'Slight hook' : 'Hook!') : (err > -SLIGHT_ERROR ? 'Slight slice' : 'Slice!');
}

// Launch velocity for a full shot: power 1 carries `carry × lie` meters on flat ground (no air drag).
export function launchVelocity(club, p, aim, lieFactor) {
  const theta = degToRad(club.loft);
  const carry = p * club.carry * lieFactor;
  const v = Math.sqrt(carry * G / Math.sin(2 * theta));
  const d = dirFromAim(aim), h = v * Math.cos(theta);
  return { vel: { x: d.x * h, y: v * Math.sin(theta), z: d.z * h }, speed: v };
}

// Everything a swing decides. Same inputs always give the same output.
//   club, power (0..1), acc (meter value at click 3), aim (rad), lieFactor, puttMax (m), greenDecel (m/s²),
//   outcome (from the meter, default 'normal')
export function resolveShot({ club, power, acc, aim, lieFactor, puttMax, greenDecel, outcome = 'normal' }) {
  const err = swingError(acc, outcome);
  const p = Math.max(power, MIN_POWER);
  const label = shotLabel(power, err, outcome);
  if (club.putter) {
    const ang = aim - err * PUTT.aimErrorK;
    const D = p * puttMax;
    const v0 = Math.sqrt(2 * greenDecel * D);   // on flat ground this stops after D meters
    const dir = { x: Math.sin(ang), y: 0, z: -Math.cos(ang) };
    return { kind: 'putt', err, label, vel: { x: dir.x * v0, y: 0, z: dir.z * v0 }, curve: { x: 0, y: 0, z: 0 }, spinFactor: 1, dir };
  }
  const { vel, speed } = launchVelocity(club, p, aim, lieFactor);
  const r = rightFromAim(aim), c = -err * CURVE_K * (speed / CURVE_REF_SPEED);
  const spinFactor = clamp(SPIN.base - club.loft / SPIN.loftScale, SPIN.min, SPIN.max);
  return { kind: 'full', err, label, vel, curve: { x: r.x * c, y: r.y * c, z: r.z * c }, spinFactor, dir: dirFromAim(aim) };
}
