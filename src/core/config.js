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
// X14: holding aim turns every frame (not on the OS key repeat), by game time, so the speed is the same
// at any frame rate. It starts slow (a tap is a fine nudge), reaches AIM_SPEED, then speeds up gently
// on a long hold. Shift (keyboard) turns at `fineK` × that for fine adjusting. Multipliers of AIM_SPEED
// (AIM_SPEED_PUTT with the putter), s = seconds the aim has been held.
export const AIM_TURN = {
  startK: 0.4,    // speed at the first moment of a hold
  rampS: 0.3,     // ...up to 1× over this many seconds
  fastAfterS: 1.2, // held this long, it starts to speed up again
  fastRampS: 0.8, // ...up to fastK over this many seconds
  fastK: 1.6,
  fineK: 0.25,    // Shift held
};
// X14: the heavy aim previews (the K4 warning's ⚑ arc needs the ⚑ power, a search over whole rolled-out
// shots) work at most this long per frame, and while the aim moves a new search starts at most every
// gapMs. When the aim stops the exact search for the final aim runs (over a few frames) at once.
export const AIM_PREVIEW = { budgetMs: 2.5, gapMs: 120 };

// --- Clubs and shots ---
export const AUTO_CLUB_REACH = 0.95; // auto-pick: shortest club whose reach is ≥ 95% of the distance
export const FRINGE_PUTT_DIST = 18;  // on the fringe closer than this, the putter is picked
export const SPIN = { base: 1.2, loftScale: 40, min: 0.3, max: 1 }; // first-bounce keep × clamp(base − loft / loftScale, min, max)
export const PUTT = {
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

// --- Obstacles (Phase K, DESIGN §4 "Obstacles") ---
// OBSTACLE_REST, OBSTACLE_KEEP, CANOPY_SLOW, CANOPY_DEFLECT: tunables, see TUNABLES
export const GROUND_PLANE_MARGIN = 0.1; // K13: m; the background ground plane must sit at least this far below the lowest terrain
export const GROUND_CHECK_STEP = 2;      // K13: m; validateHole samples the terrain mesh at least this coarsely for that check
export const BOULDER_SINK = 0.35;    // share of a boulder's radius below the ground (a hole may set `sink` per boulder)
export const OBSTACLE_SLIDE = 0.5;   // m/s: a ball settling on top of a boulder is nudged off at least this fast (it can't balance there)
export const OBSTACLE_EVENT_SPEED = 0.5; // m/s into the obstacle: slower contacts (a ball resting against a trunk) bounce but send no hitObstacle event

// --- Cup ---
export const CUP_R = 0.22;           // generous arcade-size cup
// CUP_CAPTURE_SPEED (tunable): slower than this over the cup = holed; faster = lip-out
export const CUP_FLY_IN = 1.4;       // landing on the fly within CUP_R × this goes straight in
export const LIP_OUT = { spread: 0.8, keep: 0.6, rearm: 1.5 }; // random deflection (rad), speed kept, re-arm at CUP_R × rearm

// --- Wind (§7) ---
// WIND_K (tunable): how strongly wind pushes the ball in the air
export const WIND_MAX = 5.5;         // default max wind speed (m/s) when a hole doesn't set one

// --- Game-layer timing (ms) ---
// Rounds (Phase 6, DESIGN §8): a course is a playlist of hole ids of any length. The final scorecard
// shows the holes in groups of this many (Out / In / Holes 19–27 …), each with a subtotal.
export const SCORECARD_GROUP = 9;
export const TIMING = { afterStop: 1300, afterPenalty: 1700, afterHoled: 1600, afterPickUp: 900, flash: 1500, skipAfter: 1000, holeCard: 2500 }; // skipAfter: X9 ⏩ Skip shows this long after the hit; holeCard: the compact hole card (holes 2+ of a round) closes by itself after this

// --- HUD display thresholds ---
// S22 (owner, playtest 1): the power bar is split into POWER_SECTIONS equal parts, and the aim line
// has a tick where a straight, no-wind shot at each of those powers lands (25/50/75% for 4)
export const POWER_SECTIONS = 4;
// S22 (owner on PR #53): the minimap's aim line shows only these ticks (less busy than the 3D line)
export const MINIMAP_TICKS = Object.freeze([0.5]);
export const HUD = { slopeMinPct: 0.5, elevMinM: 0.5, pinTickMax: 1.02, pinFlagFlip: 0.85, atTeeM: 1, minimapFit: { gap: 8, minH: 40 }, accFrame: { widthPx: 1.5, opacity: 0.6, overPx: 6 }, puttMarkerMinPx: 8,
  // PR #63 (owner: "the landing triangle is way too big"): the S22 marker is a cone pointing down at the landing spot.
  // radius = of its top for a 1 m cone; hover = gap between its tip and the ground (× its size); dotR = the dot on the ground
  // (× its size). Its size (m) = screenK × the camera distance, clamped to [min, max], × AIM_PIN_SIZE.
  aimPin: Object.freeze({ radius: 0.36, hover: 0.45, dotR: 0.32, screenK: 0.016, min: 0.6, max: 4.5 }) }; // pinFlagFlip: above this power the ⚑ flag sits left of its line (H1); atTeeM: "plays N yd" shows while the ball is this close to the tee; minimapFit (S22): px the minimap keeps clear of the bottom panel, and its smallest height; accFrame (S22, owner on PR #53): the accuracy window's edge lines past the bar (px wide, opacity, px above and below); puttMarkerMinPx (S14, PM on PR #61): on a putt bar the marker's centre stays at least this far from the left edge, inside the rounded end

// --- Camera (Phase V, DESIGN §4 "Camera"; core/views.js) ---
// The aiming view (V1) is main's camera (owner on PR #63): back m behind the ball, up m above the
// ground under it, looking at the ground `ahead` m down the aim line; clear = m above the ground at the
// camera. ballMax: in a short landscape screen the camera tilts down so the ball shows no lower than
// this share of the free band (else it hid behind the hint line). losStep = m between samples when
// checking a line of sight (V3).
export const CAM = Object.freeze({
  aim:  Object.freeze({ back: 7, up: 2.6, ahead: 30, clear: 1.5 }),
  putt: Object.freeze({ back: 3.5, up: 1.6, ahead: 5, clear: 0.8 }),
  ballMax: 0.97, losStep: 2,
  // V2 views (the buttons while aiming). landing: from backK × the carry behind the marker (clamped),
  // heightK × that above it; the marker shows at markAt of the free band.
  landing:   Object.freeze({ backK: 0.25, backMin: 22, backMax: 60, heightK: 0.6, markAt: 0.55, clear: 2 }),
  // readAbove: over the middle of the putt, high enough that the putt (+ margin m) fills `fill` of the free band (clamped); tilt = how far behind
  // the middle (× the height), so the putt points up the screen. readLow: back m behind the ball, height m up. *At = where that point shows in the free band.
  readAbove: Object.freeze({ fill: 0.7, margin: 2, hMin: 6, hMax: 60, tilt: 0.2, midAt: 0.5 }),
  readLow:   Object.freeze({ back: 3, height: 0.45, cupAt: 0.45 }),
  // V3 flight views (core/views.js pickFlightView): side = a spot `along` × the carry down the line and
  // `off` × the carry to one side, at max(minH, apexK × the apex) m; landingCam = `past` m beyond the
  // predicted landing and `off` m to one side, `height` m up. The landing camera hands over to the chase
  // camera when the ball runs more than passBy m past it.
  side:       Object.freeze({ along: 0.4, off: 0.17, minH: 15, apexK: 1,
    // QA-1 (PR #64): on tree-lined holes the first spot often has leaves in the way, so these are tried
    // next, in order (on the drawn side, then the other side): up = m higher, off = × the carry further out
    tries: Object.freeze([{ up: 0, off: 0 }, { up: 12, off: 0 }, { up: 12, off: 0.08 }, { up: 25, off: 0.12 }, { up: 40, off: 0.18 }]) }),
  landingCam: Object.freeze({ past: 25, off: 9, height: 7, passBy: 40 }),
  flightEase: Object.freeze({ look: 12 }), // how fast a standing flight camera turns to keep the ball in view (1/s)
  viewSalt: 0x5eed1e55, // V3: the view RNG = createRng(hole seed ^ this), its own stream (physics never draws from it)
  // V4 flyover (core/views.js flyoverPath; owner on #63: slower, high start behind the tee, no dive,
  // smooth). startBack / startHeight: m behind / above the tee at the start (startLiftMax: m more it may
  // rise to see the tee over a bank); lead: a path point that far down the first leg (a straight start);
  // height: m over the (smoothed) ground on the way, endHeight at the stop endBack m short of the cup;
  // rise / descend: m over which it eases from the start height / to the end height; minClear: never
  // lower than this over the ground. The path: `samples` per spline segment, smoothed smoothPasses × over
  // ±smoothM m, resampled every `step` m; the ground under it smoothed over ±groundSmoothM m; the look
  // target leads lookAhead m along it, damped over ±lookSmoothM m (it starts on the tee box and turns
  // ahead over the first teeLook m), and slides onto the flag over the
  // last lookCup m. Time: length / CAM_FLYOVER_SPEED clamped to [minTime, maxTime] s, speeding up over
  // `accel` and slowing over `decel` of it; then CAM_FLYOVER_PAUSE, then an orbit of orbitDeg in
  // CAM_FLYOVER_ORBIT s. easeTime / easeLift: the ease into the aiming view (s, m up mid-way).
  flyover:    Object.freeze({ startBack: 14, startHeight: 20, teeLook: 100, startLiftMax: 30, lead: 40, height: 20, endHeight: 18, minClear: 8,
    rise: 120, descend: 140, endBack: 35, samples: 24, smoothPasses: 4, smoothM: 30, step: 2, groundSmoothM: 40,
    lookAhead: 110, lookSmoothM: 40, lookCup: 120, orbitDeg: 50, minTime: 5, maxTime: 16, accel: 0.25, decel: 0.3,
    easeTime: 1.0, easeLift: 35 }),
  holdMs: 300,  // V2: a press on a view button longer than this is a hold (the view goes back on release); shorter is a tap (stays until tapped again)
  ease: Object.freeze({ aim: 5, view: 4 }), // how fast the camera eases to the aiming view / a button view (1/s)
  bandProbe: 60, // px each side of the screen's centre: a top panel inside this column pushes the free band down (portrait)
});

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
  // Obstacles (Phase K, DESIGN §4 "Obstacles")
  OBSTACLE_REST:         { def: 0.4,  min: 0,     max: 1 },    // share of the speed INTO a trunk or boulder that bounces back
  OBSTACLE_KEEP:         { def: 0.7,  min: 0,     max: 1 },    // share of the speed ALONG it that is kept
  CANOPY_SLOW:           { def: 0.3,  min: 0,     max: 1 },    // share of its speed a ball keeps when it flies into a tree's leaves (K3)
  CANOPY_DEFLECT:        { def: 15,   min: 0,     max: 45 },   // degrees: the leaves turn the ball left or right by up to this (seeded RNG)
  // Default aim (§3)
  CHIP_AIM_RANGE:        { def: 30,   min: 0,     max: 80 },   // m: this close to the cup, the default aim is the cup on any surface (S19)
  CHIP_FLAG_SHORT:       { def: 1.5,  min: 0,     max: 10 },   // m: within CHIP_AIM_RANGE the ⚑ marks a finish this far short of the cup (PM on PR #31: no free chip-ins)
  MINIMAP_SCALE:         { def: 1.2,  min: 0.6,   max: 1.6 },  // S22 (owner on PR #53): the minimap's size × this (1.2 = +44% area); short screens still cap its height
  AIM_FLAT_RISE:         { def: 0.5,  min: 0,     max: 5 },    // m: the aim marker's ground reads "Flat" when the landing spot is less than this above or below the ball (S22)
  TEE_AIM_CARRY:         { def: 1,    min: 0.5,   max: 1.2 },  // S21: a tee shot's default aim point is this share of the club's carry straight ahead along the tee's facing
  // AI rivals (Phase T, DESIGN §8 "Rivals", core/rivals.js). A rival's expected score on a hole, in strokes
  // over par, is RIVAL_BASE + RIVAL_DIFF_K × (difficulty − 1) − skill; the score is drawn from a normal
  // curve (width RIVAL_SPREAD) around it, rounded to whole strokes. Skill is in strokes per hole: the
  // roster spreads from RIVAL_SKILL_MIN (weakest) to RIVAL_SKILL_MAX (best); a difficulty adds its shift.
  RIVAL_BASE:            { def: 0.3,  min: -1,    max: 2 },    // strokes over par expected from a skill-0 rival on a difficulty-1 hole
  RIVAL_DIFF_K:          { def: 0.2,  min: 0,     max: 1 },    // each step of hole difficulty (1–5) adds this many strokes
  RIVAL_SPREAD:          { def: 0.75, min: 0.2,   max: 2 },    // strokes: how much a rival's score varies from hole to hole
  RIVAL_BEST_TO_PAR:     { def: -2,   min: -4,    max: 0 },    // a rival's best score on a hole, to par (owner on PR #44: eagle at best; never a hole in one on any par)
  RIVAL_SKILL_MIN:       { def: 0,    min: -1,    max: 2 },    // the weakest rival's skill (strokes per hole better than RIVAL_BASE)
  RIVAL_SKILL_MAX:       { def: 0.45, min: -1,    max: 2 },    // the best rival's skill
  RIVAL_EASY_SHIFT:      { def: -0.35, min: -1.5, max: 0 },    // Easy: added to every rival's skill (negative = weaker)
  RIVAL_HARD_SHIFT:      { def: 0.3,  min: 0,     max: 1.5 },  // Hard: added to every rival's skill (positive = stronger)
  // Camera (Phase V): the aiming view's height (V1), ball-flight variety (V3) and the hole flyover (V4)
  AIM_PIN_SIZE:          { def: 1,    min: 0.3,   max: 3 },    // the landing marker's size × this (PR #63: a small cone pointing down at the landing spot)
  CAM_AIM_HEIGHT:        { def: 1,    min: 0.5,   max: 3 },    // the full-shot aiming camera's height × main's 2.6 m (owner on #63, after comparing 1 / 1.25 / 1.5: "the today camera is the best"); putts keep main's
  CAM_VARIETY:           { def: 1,    min: 0,     max: 1 },    // 1 = varied flight camera, 0 = classic (always behind); the Settings switch sets it too
  CAM_VARIETY_MIN:       { def: 60,   min: 0,     max: 200 },  // m: shots carrying less than this (chips, pitches) are always filmed from behind
  CAM_W_BEHIND:          { def: 0.5,  min: 0,     max: 1 },    // weights of the flight views (normalised)
  CAM_W_SIDE:            { def: 0.25, min: 0,     max: 1 },
  CAM_W_LANDING:         { def: 0.25, min: 0,     max: 1 },
  CAM_MAX_RUN:           { def: 2,    min: 1,     max: 10 },   // no flight view more than this many shots in a row (landing: never twice)
  CAM_FLYOVER_SPEED:     { def: 45,   min: 10,    max: 300 },  // m/s along the route (owner on #63: 36 → 45, "a little bit faster"; travel clamped to CAM.flyover minTime..maxTime s)
  CAM_FLYOVER_PAUSE:     { def: 0,    min: 0,     max: 5 },    // s the flyover stays still above the green (owner on #63)
  CAM_FLYOVER_ORBIT:     { def: 1.4,  min: 0,     max: 8 },    // s of a slow orbit round the cup after the pause (CAM.flyover.orbitDeg)
  CAM_FLIGHT_HOLD:       { def: 1.2,  min: 0,     max: 4 },    // V3 (owner on #63): s after a full shot the camera stays at address, only turning to watch the ball, before the flight view starts
  CAM_BEHIND_STAY:       { def: 0,    min: 0,     max: 1 },    // 1 = a 'behind' shot is watched from address until the ball first lands (only side / landing cut away); 0 = the chase camera after the hold
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
