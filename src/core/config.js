// Every tunable number in the game lives here (DESIGN.md §3, §4, §9).
// Units: meters, seconds, radians unless the name says otherwise.
// src/core/ is pure JS: no Three.js, no DOM.
//
// The names in TUNABLES (at the end) can be overridden for one visit by a ?tune= link (X8), each
// clamped to its range; code reads them from TUNE. See src/core/tune.js.

// --- World ---
export const M2Y = 1.09361;          // meters → yards (display only)
export const G = 9.81;               // gravity, m/s²
export const ROLL_G = G * 5 / 7;     // a rolling ball feels 5/7 of gravity along a slope (some energy goes into spin)
export const GRAD_EPS = 0.05;        // central-difference step for slopes, m
export const MPS_TO_MPH = 2.237;     // wind display

// --- Timestep (F3) ---
export const PHYSICS_DT = 1 / 240;   // every physics step is exactly this long
// FLIGHT_SPEEDUP (tunable, see TUNABLES): full shots run faster than real time (putts run at 1×)
export const MAX_FRAME_DT = 0.05;    // a frame hiccup never advances the game more than this
export const MAX_METER_DT = 0.1;     // the meter follows real time, capped, so slow devices don't make it easier

// --- Swing meter (§3) ---
// METER_SPEED, SWEET, CURVE_SHAPE, CURVE_K, POWER_GRACE, NO_ACC_ERR, MISSED_POWER_FRACTION: tunables, see TUNABLES
export const METER_MIN = -0.2;       // left end of the meter (accuracy zone)
export const CURVE_SHAPE_REF = 0.2;  // every CURVE_SHAPE gives the same error at |acc| = this (the far end of the meter)
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
export const LANDING_SIM = {          // aim-ring / reach / ⚑ prediction (no wind, no curve)
  dt: 1 / 60, maxSteps: 900,
  pinMaxPower: 1.5,                  // S12: the ⚑ search looks up to this power (above 1 = out of reach)
  pinIters: 24,                      // ...and halves the range this many times (1.5 / 2^24 ≈ 0.0000001)
  restIters: 14,                     // S15: the ⚑ search on the full roll halves [0, carry power] this many times (≈ 1 cm at 215 m)
  restTol: 1,                        // S15: m; when no power finishes closer than this (a bank in the way), the ⚑ takes the closest finish
  restSeed: 1,                       // S15: the roll prediction's own random numbers (lip-outs), restarted every time
};

// --- Ball (§4) ---
export const BALL_R = 0.09;          // drawn a bit bigger than real so you can see it
export const BOUNCE_TO_ROLL = 1.2;   // a bounce slower than this (m/s, off the ground) becomes a roll
export const BOUNCE_LIFT = 0.002;    // lift the ball this much after a bounce so it doesn't re-hit the ground
export const STATIC = 0.4;           // share of a surface's friction that holds a stopped ball on a slope
export const CREEP = 0.5;            // below this speed (m/s) friction blends down so the ball trickles on steep slopes
export const STOP_SPEED = 0.06;      // a ball slower than this, with nothing pulling it, is at rest
export const CRAWL_TIME = 8;         // P10: after crawling (slower than CREEP) this long (s), full friction again: the ball settles
export const STOP_TIME = 0.5;        // P10: a ball slower than STOP_SPEED for this long (s) is at rest, even on a slope
export const ROLL_TIMEOUT = 40;      // safety net: a roll never lasts longer than this (s)

// --- Cup ---
export const CUP_R = 0.22;           // generous arcade-size cup
// CUP_CAPTURE_SPEED (tunable): slower than this over the cup = holed; faster = lip-out
export const CUP_FLY_IN = 1.4;       // landing on the fly within CUP_R × this goes straight in
export const LIP_OUT = { spread: 0.8, keep: 0.6, rearm: 1.5 }; // random deflection (rad), speed kept, re-arm at CUP_R × rearm

// --- Wind (§7) ---
// WIND_K (tunable): how strongly wind pushes the ball in the air
export const WIND_MAX = 5.5;         // default max wind speed (m/s) when a hole doesn't set one

// --- Game-layer timing (ms) ---
export const TIMING = { afterStop: 1300, afterPenalty: 1700, afterHoled: 1600, afterPickUp: 900, flash: 1500, skipAfter: 1000 }; // skipAfter: X9 ⏩ Skip shows this long after the hit

// --- HUD display thresholds ---
export const HUD = { slopeMinPct: 0.5, elevMinM: 0.5, pinTickMax: 1.02, pinFlagFlip: 0.85 }; // pinFlagFlip: above this power the ⚑ flag sits left of its line (H1)

// --- Tunables: ?tune= overrides (X8), one entry each (Gate A A5) ---
// The only names a tune link may change. Each entry is the whole definition: the default (`def`)
// and the range a tuned value is clamped to. Code reads the live value from TUNE (e.g. TUNE.SWEET),
// so adding a tunable is one line here. Tunes are applied before a hole starts (main.js reads the
// link first); a hole session reads them when it is created.
export const TUNABLES = Object.freeze({
  // Swing meter (§3)
  METER_SPEED:           { def: 1.15, min: 0.4,   max: 2 },    // meter units per second (S17: 1.0 → 1.15)
  SWEET:                 { def: 0.045, min: 0.005, max: 0.2 }, // half-width of the "perfect" zone around 0 (S10: 0.024 → 0.05; S17: 0.045, ≈78 ms at METER_SPEED 1.15)
  CURVE_SHAPE:           { def: 1,    min: 0.5,   max: 3 },    // how a miss grows: 1 = linear (error = acc; S17: near-misses hurt), 2 = quadratic (small misses curve gently, S10)
  CURVE_K:               { def: 28,   min: 0,     max: 80 },   // how strongly a mistimed 3rd click curves the ball
  // Missed clicks (S8, DESIGN §3 "Missed clicks")
  POWER_GRACE:           { def: 0.15, min: 0,     max: 0.5 },  // s after the meter reaches the top in which the power click still counts as full power
  NO_ACC_ERR:            { def: 0.6,  min: 0.2,   max: 1.5 },  // no 3rd click: a huge slice with this curve error (3× the old forced slice of 0.2)
  MISSED_POWER_FRACTION: { def: 0.15, min: 0.02,  max: 0.5 },  // no power click: the click on the way back hits a mini shot with this power
  // Ball, cup, wind, clock (§4, §7)
  CUP_CAPTURE_SPEED:     { def: 3.2,  min: 1,     max: 6 },    // m/s: slower than this over the cup = holed; faster = lip-out
  WIND_K:                { def: 0.3,  min: 0,     max: 0.6 },  // how strongly wind pushes the ball in the air (S17: 0.2 → 0.3)
  FLIGHT_SPEEDUP:        { def: 1.35, min: 0.5,   max: 3 },    // full shots run this much faster than real time (putts run at 1×)
  // Default aim (§3)
  CHIP_AIM_RANGE:        { def: 30,   min: 0,     max: 80 },   // m: this close to the cup, the default aim is the cup on any surface (S19)
  CHIP_FLAG_SHORT:       { def: 1.5,  min: 0,     max: 10 },   // m: within CHIP_AIM_RANGE the ⚑ marks a finish this far short of the cup (PM on PR #31: no free chip-ins)
  // Render quality (Gate A C4), game layer only: never affects the physics
  DPR_CAP:               { def: 2,    min: 0.5,   max: 3 },    // the 3D canvas renders at most this many pixels per CSS pixel
  ANTIALIAS:             { def: 1,    min: 0,     max: 1 },    // MSAA on (1) or off (0); off is faster on weak phones
});

// The live values. Only setTunable() / resetTunables() change them.
export const TUNE = Object.seal(Object.fromEntries(Object.entries(TUNABLES).map(([k, t]) => [k, t.def])));

// Set one whitelisted tunable (clamped). Returns the value used. Unknown names and non-numbers throw.
export function setTunable(name, value) {
  if (!Object.hasOwn(TUNABLES, name)) throw new Error(`not a tunable: ${name}`);
  if (typeof value !== 'number' || Number.isNaN(value)) throw new Error(`${name}: not a number: ${value}`);
  const { min, max } = TUNABLES[name];
  return (TUNE[name] = Math.min(max, Math.max(min, value)));
}
export const defaultTunable = name => TUNABLES[name].def;
// Put every config tunable back to its default (tune.js resetAllTunables also resets the lie values).
export function resetTunables() { for (const [k, t] of Object.entries(TUNABLES)) TUNE[k] = t.def; }
