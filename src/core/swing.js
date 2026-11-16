// The 3-click swing (DESIGN.md §3): the meter state machine and turning a swing into a launch.
import { G, METER_SPEED, METER_MIN, SWEET, CURVE_K, CURVE_REF_SPEED, MIN_POWER, PERFECT_POWER, SLIGHT_ERROR, SPIN, PUTT } from './config.js';
import { dirFromAim, rightFromAim, clamp, degToRad } from './vec.js';

// Meter phases: 'aim' (waiting for click 1) → 'power' (filling) → 'accuracy' (coming back) → shot.
export function createMeter() { return { phase: 'aim', value: 0, power: 0 }; }

export function resetMeter(m) { m.phase = 'aim'; m.value = 0; m.power = 0; return m; }

// A click. Returns { power, acc } when this click fires the shot, otherwise null.
export function pressMeter(m) {
  if (m.phase === 'aim') { m.phase = 'power'; m.value = 0; m.power = 0; return null; }
  if (m.phase === 'power') { m.power = m.value; m.phase = 'accuracy'; return null; }
  if (m.phase === 'accuracy') { m.phase = 'done'; return { power: m.power, acc: m.value }; }
  return null;
}

// Move the marker by dt seconds of real time. Returns { power, acc } if the meter fires on its own
// (reaching METER_MIN without a 3rd click = forced maximum slice), otherwise null.
// `changed` is set when the power locks itself at 1 (so the HUD can update).
export function tickMeter(m, dt) {
  m.changed = false;
  if (m.phase === 'power') {
    m.value += dt * METER_SPEED;
    if (m.value >= 1) { m.value = 1; m.power = 1; m.phase = 'accuracy'; m.changed = true; }
  } else if (m.phase === 'accuracy') {
    m.value -= dt * METER_SPEED;
    if (m.value <= METER_MIN) { m.value = METER_MIN; m.phase = 'done'; return { power: m.power, acc: METER_MIN }; }
  }
  return null;
}

// Accuracy → error: 0 inside the sweet spot. > 0 = early (hook, curves left), < 0 = late (slice, curves right).
export const accuracyError = acc => (Math.abs(acc) <= SWEET ? 0 : acc);

export function shotLabel(power, err) {
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
//   club, power (0..1), acc (meter value at click 3), aim (rad), lieFactor, puttMax (m), greenDecel (m/s²)
export function resolveShot({ club, power, acc, aim, lieFactor, puttMax, greenDecel }) {
  const err = accuracyError(acc);
  const p = Math.max(power, MIN_POWER);
  const label = shotLabel(power, err);
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
