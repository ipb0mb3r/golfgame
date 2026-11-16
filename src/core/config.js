// Every tunable number in the game lives here (DESIGN.md §3, §4, §9).
// Units: meters, seconds, radians unless the name says otherwise.
// src/core/ is pure JS: no Three.js, no DOM.

// --- World ---
export const M2Y = 1.09361;          // meters → yards (display only)
export const G = 9.81;               // gravity, m/s²
export const ROLL_G = G * 5 / 7;     // a rolling ball feels 5/7 of gravity along a slope (some energy goes into spin)
export const GRAD_EPS = 0.05;        // central-difference step for slopes, m
export const MPS_TO_MPH = 2.237;     // wind display

// --- Timestep (F3) ---
export const PHYSICS_DT = 1 / 240;   // every physics step is exactly this long
export const FLIGHT_SPEEDUP = 1.35;  // full shots run 1.35× faster than real time (putts run at 1×)
export const MAX_FRAME_DT = 0.05;    // a frame hiccup never advances the game more than this
export const MAX_METER_DT = 0.1;     // the meter follows real time, capped, so slow devices don't make it easier

// --- Swing meter (§3) ---
export const METER_SPEED = 1.0;      // meter units per second
export const METER_MIN = -0.2;       // left end of the meter (accuracy zone); reaching it = forced max slice
export const SWEET = 0.024;          // half-width of the "perfect" zone around 0
export const CURVE_K = 28;           // how strongly a mistimed 3rd click curves the ball
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
export const CUP_CAPTURE_SPEED = 3.2; // slower than this over the cup = holed; faster = lip-out
export const CUP_FLY_IN = 1.4;       // landing on the fly within CUP_R × this goes straight in
export const LIP_OUT = { spread: 0.8, keep: 0.6, rearm: 1.5 }; // random deflection (rad), speed kept, re-arm at CUP_R × rearm

// --- Wind (§7) ---
export const WIND_K = 0.2;           // how strongly wind pushes the ball in the air
export const WIND_MAX = 5.5;         // default max wind speed (m/s) when a hole doesn't set one

// --- Game-layer timing (ms) ---
export const TIMING = { afterStop: 1300, afterPenalty: 1700, afterHoled: 1600, afterPickUp: 900, flash: 1500 };
