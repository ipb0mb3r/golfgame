// Every tunable number in the game lives here (DESIGN.md §3, §4, §9).
// Units: meters, seconds, radians unless the name says otherwise.
// src/core/ is pure JS: no Three.js, no DOM.
//
// Names declared with `let` can be overridden for one visit by a ?tune= link (X8). Only the
// names in TUNABLES can be changed, each clamped to its range; see src/core/tune.js.

// --- World ---
export const M2Y = 1.09361;          // meters → yards (display only)
export const G = 9.81;               // gravity, m/s²
export const ROLL_G = G * 5 / 7;     // a rolling ball feels 5/7 of gravity along a slope (some energy goes into spin)
export const GRAD_EPS = 0.05;        // central-difference step for slopes, m
export const MPS_TO_MPH = 2.237;     // wind display

// --- Timestep (F3) ---
export const PHYSICS_DT = 1 / 240;   // every physics step is exactly this long
export let FLIGHT_SPEEDUP = 1.35;    // full shots run 1.35× faster than real time (putts run at 1×)
export const MAX_FRAME_DT = 0.05;    // a frame hiccup never advances the game more than this
export const MAX_METER_DT = 0.1;     // the meter follows real time, capped, so slow devices don't make it easier

// --- Swing meter (§3) ---
export let METER_SPEED = 1.0;        // meter units per second
export const METER_MIN = -0.2;       // left end of the meter (accuracy zone)
export let SWEET = 0.05;             // half-width of the "perfect" zone around 0 (S10: was 0.024, ≈48 ms → ≈100 ms)
export let CURVE_SHAPE = 2;          // S10: how a miss grows: 1 = linear (error = acc), 2 = quadratic (small misses curve gently; PM default)
export const CURVE_SHAPE_REF = 0.2;  // ...all shapes give the same error at |acc| = this (the far end of the meter)
export let CURVE_K = 28;             // how strongly a mistimed 3rd click curves the ball
// Missed clicks (S8, DESIGN §3 "Missed clicks")
export let POWER_GRACE = 0.15;       // s after the meter reaches 1 in which the power click still counts as power = 1
export let NO_ACC_ERR = 0.6;         // no 3rd click: a huge slice with this curve error (3× the old forced slice of 0.2)
export let MISSED_POWER_FRACTION = 0.15; // no power click: the click on the way back hits a mini shot with this power
export const CURVE_REF_SPEED = 43;   // launch speed (m/s) at which the curve is exactly CURVE_K × error
export const MIN_POWER = 0.02;       // power is never below this (so a 0 click still moves the ball)
export const PERFECT_POWER = 0.97;   // a straight shot above this power says "Perfect!"
export const SLIGHT_ERROR = 0.07;    // |error| below this is a "slight" hook/slice
export const AIM_SPEED = 0.45;       // rad/s while holding aim
export const AIM_SPEED_PUTT = 0.3;   // rad/s with the putter

// --- Clubs and shots ---
export const AUTO_CLUB_REACH = 0.95; // auto-pick: shortest club whose reach is ≥ 95% of the distance
export const FRINGE_PUTT_DIST = 18;  // on the fringe closer than this, the putter is picked
export const SPIN = { base: 1.2, loftScale: 40, min: 0.3, max: 1 }; // first-bounce keep × clamp(base − loft / loftScale, min, max)
export const PUTT = {
  aimErrorK: 0.25,    // a mistimed putt pushes the line by error × this (rad)
  rangeK: 1.5,        // putt range = distance (plays-like) × this ...
  rangeMin: 6,        // ... clamped to [min, max] meters
  rangeMax: 36,
  pinTickExtra: 0.3,  // the ⚑ mark aims this far past the cup
};
export const LANDING_SIM = { dt: 1 / 60, maxSteps: 900 }; // aim-ring / reach prediction (no wind, no curve)

// --- Ball (§4) ---
export const BALL_R = 0.09;          // drawn a bit bigger than real so you can see it
export const BOUNCE_TO_ROLL = 1.2;   // a bounce slower than this (m/s, off the ground) becomes a roll
export const BOUNCE_LIFT = 0.002;    // lift the ball this much after a bounce so it doesn't re-hit the ground
export const STATIC = 0.4;           // share of a surface's friction that holds a stopped ball on a slope
export const CREEP = 0.5;            // below this speed (m/s) friction blends down so the ball trickles on steep slopes
export const STOP_SPEED = 0.06;      // a ball slower than this, with nothing pulling it, is at rest
export const ROLL_TIMEOUT = 40;      // safety net: a roll never lasts longer than this (s)

// --- Cup ---
export const CUP_R = 0.22;           // generous arcade-size cup
export let CUP_CAPTURE_SPEED = 3.2;  // slower than this over the cup = holed; faster = lip-out
export const CUP_FLY_IN = 1.4;       // landing on the fly within CUP_R × this goes straight in
export const LIP_OUT = { spread: 0.8, keep: 0.6, rearm: 1.5 }; // random deflection (rad), speed kept, re-arm at CUP_R × rearm

// --- Wind (§7) ---
export let WIND_K = 0.2;             // how strongly wind pushes the ball in the air
export const WIND_MAX = 5.5;         // default max wind speed (m/s) when a hole doesn't set one

// --- Game-layer timing (ms) ---
export const TIMING = { afterStop: 1300, afterPenalty: 1700, afterHoled: 1600, afterPickUp: 900, flash: 1500 };

// --- HUD display thresholds ---
export const HUD = { slopeMinPct: 0.5, elevMinM: 0.5, pinTickMax: 1.02 };

// --- ?tune= overrides (X8) ---
// The only names a tune link may change, with the range each value is clamped to.
export const TUNABLES = {
  SWEET:                 { min: 0.005, max: 0.2 },
  CURVE_SHAPE:           { min: 0.5,   max: 3 },
  CURVE_K:               { min: 0,     max: 80 },
  METER_SPEED:           { min: 0.4,   max: 2 },
  POWER_GRACE:           { min: 0,     max: 0.5 },
  NO_ACC_ERR:            { min: 0.2,   max: 1.5 },
  MISSED_POWER_FRACTION: { min: 0.02,  max: 0.5 },
  CUP_CAPTURE_SPEED:     { min: 1,     max: 6 },
  WIND_K:                { min: 0,     max: 0.6 },
  FLIGHT_SPEEDUP:        { min: 0.5,   max: 3 },
};
const SETTERS = {
  SWEET: v => { SWEET = v; }, CURVE_SHAPE: v => { CURVE_SHAPE = v; }, CURVE_K: v => { CURVE_K = v; },
  METER_SPEED: v => { METER_SPEED = v; }, POWER_GRACE: v => { POWER_GRACE = v; }, NO_ACC_ERR: v => { NO_ACC_ERR = v; },
  MISSED_POWER_FRACTION: v => { MISSED_POWER_FRACTION = v; }, CUP_CAPTURE_SPEED: v => { CUP_CAPTURE_SPEED = v; },
  WIND_K: v => { WIND_K = v; }, FLIGHT_SPEEDUP: v => { FLIGHT_SPEEDUP = v; },
};
const DEFAULTS = { SWEET, CURVE_SHAPE, CURVE_K, METER_SPEED, POWER_GRACE, NO_ACC_ERR, MISSED_POWER_FRACTION, CUP_CAPTURE_SPEED, WIND_K, FLIGHT_SPEEDUP };

// Set one whitelisted tunable (clamped). Returns the value used. Unknown names throw.
export function setTunable(name, value) {
  if (!Object.hasOwn(TUNABLES, name)) throw new Error(`not a tunable: ${name}`);
  const { min, max } = TUNABLES[name];
  const v = Math.min(max, Math.max(min, value));
  SETTERS[name](v);
  return v;
}
export const defaultTunable = name => DEFAULTS[name];
// Put every tunable back to its default (tests use this).
export function resetTunables() { for (const k of Object.keys(DEFAULTS)) SETTERS[k](DEFAULTS[k]); }
