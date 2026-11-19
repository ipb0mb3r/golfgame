// X14 (owner 2026-11-19: "aiming on PC stutters a lot"): how far a held aim key or aim button turns in
// one frame. Every frame by game time, so the speed is the same at any frame rate; slow at first (a tap
// is a fine nudge), gently faster on a long hold, Shift = fine. Pure: the game passes dt and the held time.
import { AIM_SPEED, AIM_SPEED_PUTT, AIM_TURN, TUNE } from './config.js';

const profile = () => ({ startK: TUNE.AIM_START_K, rampS: TUNE.AIM_RAMP_S, fastK: TUNE.AIM_FAST_K, ...AIM_TURN });
// ∫ of the speed multiplier from 0 to s (piecewise linear, so the integral is exact)
function turnedK(s, T) {
  if (s <= 0) return 0;
  const rampEnd = Math.min(T.rampS, T.fastAfterS);
  const a = Math.min(s, rampEnd);
  let k = T.startK * a + (1 - T.startK) * a * a / (2 * T.rampS);
  if (s <= rampEnd) return k;
  k += Math.min(s, T.fastAfterS) - rampEnd;
  if (s <= T.fastAfterS) return k;
  const b = Math.min(s - T.fastAfterS, T.fastRampS);
  k += b + (T.fastK - 1) * b * b / (2 * T.fastRampS);
  if (s - T.fastAfterS > T.fastRampS) k += T.fastK * (s - T.fastAfterS - T.fastRampS);
  return k;
}
// The speed multiplier after holding for s seconds
export function aimSpeedK(s) {
  const T = profile();
  if (s < T.rampS) return T.startK + (1 - T.startK) * Math.max(0, s) / T.rampS;
  if (s < T.fastAfterS) return 1;
  return Math.min(T.fastK, 1 + (T.fastK - 1) * (s - T.fastAfterS) / T.fastRampS);
}
// Radians (≥ 0) the aim turns in a frame of dt seconds, when it has been held `held` seconds before it
export function aimTurn(held, dt, { putter = false, fine = false } = {}) {
  const T = profile();
  const speed = (putter ? AIM_SPEED_PUTT : AIM_SPEED) * (fine ? TUNE.AIM_FINE_K : 1);
  return speed * (turnedK(held + dt, T) - turnedK(held, T));
}
