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

// --- Phone performance budget (AP0, DESIGN §8b "Phone performance budget") ---
// One source for the debug overlay, window.__golf.perf() and tools/perf-check.mjs. Target: a mid-range
// phone (iPhone 12 / Pixel 6 class) at 60 fps, never below 30 fps on an XR-class phone.
export const PERF_BUDGET = Object.freeze({
  fpsTarget: 60,            // mid-range phone
  fpsOk: 55,                // the overlay shows fps as ok at or above this (60 fps with vsync jitter)
  fpsFloor: 30,             // never below this on an XR-class phone
  drawCalls: 150,           // per frame (the real limit on phones; AP1)
  triangles: 300000,        // on screen per frame
  terrainTriangles: 200000, // of which the terrain (coarser far away, 1 m cells near the course)
  modelTriangles: 500,      // one tree / rock model (300–500)
  golferTriangles: Object.freeze({ ps1: 3000, clean: 8000 }),
  textureSize: 512,         // px, the longest side of one small stylised texture (owner: flat colour with texture)
  textureSizePs1: 256,      // px, the same for the PS1 look
  gpuMB: 64,                // graphics memory per hole (geometry + textures, estimated)
  downloadMB: 8,            // per course
});

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
// at any frame rate. It starts slow (a tap is a fine nudge): AIM_START_K × the speed, up to 1× over
// AIM_RAMP_S seconds; held past fastAfterS it speeds up gently to AIM_FAST_K over fastRampS. Shift
// (keyboard) turns at AIM_FINE_K × that. Multipliers of AIM_SPEED (AIM_SPEED_PUTT with the putter).
// The four AIM_* names are tunables (?tune=, PM on PR #65); these two are not.
export const AIM_TURN = { fastAfterS: 1.2, fastRampS: 0.8 };

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

// --- Ball control (Phase BC, core/shape.js) ---
// The per-club amounts are in clubs.js (`shape`); a ?tune= link changes one as <club>.<key>
// (e.g. driver.start:8, pw.height:9), clamped to these ranges. BC_BACK and BC_LEFTY are TUNABLES.
export const SHAPE_RANGES = Object.freeze({
  start:  Object.freeze({ min: 0, max: 25 }),  // deg the ball starts out to the side at a full left / right impact
  height: Object.freeze({ min: 0, max: 15 }),  // deg of loft added (bottom) / removed (top)
  roll:   Object.freeze({ min: 0, max: 0.9 }), // first bounce keeps × (1 ± roll)
  wind:   Object.freeze({ min: 0, max: 0.9 }), // the wind pushes it × (1 ∓ wind)
});
export const BC = Object.freeze({ loftMin: 4, loftMax: 60 }); // deg: a shaped launch loft stays in this range
// BC4: the shaped aim line samples the predicted ground track every `every` physics steps (1/20 s)
export const SHAPE_PREVIEW = Object.freeze({ every: 12 });
// BC5: the ball icon. A keyboard press (Shift + arrows) moves the dot `keyStep`; a tap within `snap` of
// the centre (share of the radius) is the centre; two taps within `doubleTapMs` reset it.
export const IMPACT_UI = Object.freeze({ keyStep: 0.25, snap: 0.12, doubleTapMs: 320 });

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

// --- AP6a: the look of the gradient sky and the new backdrop pieces (DESIGN §8b, the artist's notes
// docs/art/ap6a-artist-notes.md; the numbers are the artist's mock-ups': docs/art/{style-r2,alpine,island}/mockup.html).
// Distances and heights are the mock-ups' (m from the hole's centre, angles around −z). BACKDROP_FIT scales
// the whole backdrop (and the clouds) by one factor so its farthest layer sits at `far` × the hole's
// cameraFar: what is seen from the course (the angles) stays the mock-ups'; only the parallax grows.
export const BACKDROP_FIT = Object.freeze({ far: 0.86, ref: 3300 }); // ref = the mock-ups' farthest layer (m)
export const SKY_LOOK = Object.freeze({
  scale: 1.9, pow: 0.62,            // dome colour = mix(skyHorizon, skyTop, clamp(dir.y × scale, 0, 1) ^ pow)
  fogBand: Object.freeze([-0.04, 0.03]), // dir.y: below the first value the dome is the fog colour, mixed to the formula by the second (no seam where fogged ground meets the sky)
  dome: 0.95,                       // the dome's radius × cameraFar (drawn first, behind everything)
  clouds: Object.freeze({ groups: 9, puffs: [4, 3], size: [55, 50], ang: [-0.7, 1.4], dist: [2300, 600], y: [380, 520], emissive: 0.72, seed: 7 }),
});
// Ridge layers: { dist, a: [from, to] (rad around −z), n (segments), peaks and/or gen / back (makePeaks args:
// count, hMin, hMax, wMin, wMax, seed), snow (m; above it the cap colours), key (palette colour), haze
// (toward fog), jag (m), seed, round (soft round tops) }. The base fades `baseFade` further into the fog;
// shaded faces are mixed `shade` toward `shadow`.
// AP6b: a `round` layer is shaded smoothly from the slope of its silhouette (fully `shade` where it falls by
// softSlope m per m or more) and fades to its base colour at its foot (y 0); `trim` drops its low tail.
export const RIDGE = Object.freeze({ baseFade: 0.45, baseFadeMax: 0.85, shade: 0.25, baseY: -60, minH: 10, softSlope: 0.35 });
// Horn peaks (Alpine)
export const HORN_PEAKS_LOOK = Object.freeze({
  baseY: -40,                       // m, from the hole's ground plane (scenery.ground.y), where the horns start (mock-up)
  hero: Object.freeze({ ang: 0.06, dist: 3000, h: 1150, r: 780, hook: 0.26, sides: 6, seed: 21, snowLine: 0.55 }),
  // [ang, dist, h, r, hook, seed] (5 sides, snow line othersSnowLine)
  others: Object.freeze([[-0.42, 3100, 780, 900, -0.15, 22], [-0.2, 3250, 640, 820, 0.12, 23], [0.3, 3150, 720, 900, -0.18, 24], [0.5, 3000, 820, 860, 0.15, 25], [-0.62, 3050, 660, 920, 0.1, 26], [0.72, 3100, 620, 880, -0.1, 27]]),
  othersSides: 5, othersSnowLine: 0.36, rows: 7, jitter: 0.2, wobble: 0.08, flatSnow: Object.freeze({ ny: 0.58, t: 0.22 }),
  rockDark: '#34465e', rockMix: Object.freeze([0.3, 0.25]), haze: 0.12,
  farRidge: Object.freeze({ dist: 3300, a: [-1.2, 1.2], n: 200, gen: [14, 380, 620, 0.05, 0.11, 3], snow: 420, key: 'backFar', haze: 0.25, jag: 30, seed: 11 }),
  // the dark forested slopes in front: a full ring (the mock-up's front arc + more slopes around), so no view shows a bare horizon
  slopes: Object.freeze({ dist: 1500, a: [-Math.PI, Math.PI], n: 360, peaks: [{ a: -0.75, h: 520, w: 0.45 }, { a: 0.8, h: 560, w: 0.5 }], gen: [6, 140, 260, 0.12, 0.3, 5], back: [9, 160, 320, 0.25, 0.5, 15, 0.9, 2 * Math.PI - 0.9], snow: 9999, key: 'backNear', haze: 0.08, jag: 10, seed: 12 }),
});
// Haze hills (the stronger far-hill tint, an option to roundHills): a near ring in backNear, a far ring in backFar
export const HAZE_HILLS_LOOK = Object.freeze({
  far: Object.freeze({ dist: 2700, a: [-Math.PI, Math.PI], n: 400, gen: [22, 190, 330, 0.22, 0.45, 31, -Math.PI, Math.PI], snow: 9999, key: 'backFar', haze: 0.22, jag: 3, seed: 32, round: true }),
  near: Object.freeze({ dist: 1600, a: [-Math.PI, Math.PI], n: 400, gen: [20, 80, 150, 0.18, 0.4, 33, -Math.PI, Math.PI], snow: 9999, key: 'backNear', haze: 0.1, jag: 2, seed: 34, round: true }),
});
// Ocean (Island coast). The sea is DRAWN only: heightAt (physics) never changes. Beyond OB on a sea side
// the drawn ground slopes from the beach top (gap m beyond the OB line) to depth m below sea level over slope m.
export const OCEAN_LOOK = Object.freeze({
  sides: Object.freeze(['left', 'right', 'far', 'near']), // scenery.seaSide: one or several joined by '+', e.g. 'left+far'
  gap: 6, slope: 30, depth: 3, below: 1,   // sea level = the lowest beach top − below (m), never under the far ground plane
  shallow: 110, mid: 250,                  // m: the shore bands from the waterline (shallow = water, mid = half way water → waterDeep)
  bandLift: 0.04,                          // m between the bands (the shallow one on top)
  rockAt: Object.freeze([0.45, 1]),        // the lava rock patches: between these fractions of the slope...
  rockPatch: 0.55, rockStep: 23,           // ...where a seeded noise along the shore (one value per rockStep m) is above rockPatch
  ridge: Object.freeze({ dist: 2600, a: [-0.8, 0.8], n: 110, peaks: [{ a: -0.3, h: 560, w: 0.36 }, { a: 0.1, h: 240, w: 0.18 }], snow: 9999, key: 'backFar', haze: 0.16, jag: 6, seed: 35, round: true, trim: true }),
  island: Object.freeze({ dist: 2900, a: [0.3, 0.8], n: 30, peaks: [{ a: 0.55, h: 70, w: 0.22 }], snow: 9999, key: 'backNear', haze: 0.3, jag: 3, seed: 36, round: true, trim: true }),
});
// AP7a: the gradient tree pieces (pineTree, spruceTree, palmTree; core/trees.js builds them, DESIGN §8b).
// Shapes are in UNIT spaces so an in-play tree fits its collider (obstacles.js): the trunk in the trunk
// cylinder's (radius 1, y 0 → 1), the canopy in the canopy ellipsoid's (radius 1 across, y −1 → 1).
// Gradient: a per-vertex weight 0 (bottom, leafLow) → 0.5 (the mid colour: pine / leafAlt / leaf, library slots) → 1 (top, leafTop); `dark` lowers the
// weight of each tier's droop tip and underside so the tiers read. scenery = the size of a scenery tree
// (offTrees, before its random 0.8–1.5 scale), in the obstacle format (m); lod = what a scenery tree draws
// with fewer sides, rings, tiers or lobes (there are hundreds; ~100–170 triangles each); far = the cheaper
// version beyond TREE_FAR.from (AP7b), merged over lod.
// tiers: [bottom y, top y, radius]. tierProfile: the tier's outline from its top pole, as [r × radius,
// depth × tier height]: the rounded shoulder (2 points), the skirt edge, the droop tip; then the underside
// pole at `underside` × height.
// A scenery tier's lighter outline (lod.tierProfile): one shoulder point, the skirt edge, the droop tip
const FAR_TIER = Object.freeze([[0.55, 0.2], [1, 0.8], [0.88, 1]]);
export const TREE_LOOK = Object.freeze({
  tierProfile: Object.freeze([[0.42, 0.1], [0.78, 0.38], [1, 0.84], [0.9, 1]]), underside: 0.62,
  // wobble: the skirt's radius waves by ± this fraction around the tier (3 lobes), so no tier is a perfect circle
  pineTree: Object.freeze({
    // AP7b (artist on #105, less "lollipop"): 4 fuller, overlapping tiers, the widest skirt on the
    // collider's floor (was 3 tiers, the lowest ending at −0.12)
    segs: 10, trunkSegs: 6, trunkTop: 0.7, dark: 0.16, wobble: 0.06,
    tiers: Object.freeze([[-1, -0.3, 1.04], [-0.6, 0.15, 0.88], [-0.2, 0.58, 0.68], [0.22, 1, 0.44]]),
    scenery: Object.freeze({ trunkR: 0.3, trunkH: 3, canopyR: 2.5, canopyH: 6.4 }), lod: Object.freeze({ segs: 5, trunkSegs: 3, tierProfile: FAR_TIER, tiers: Object.freeze([[-1, -0.12, 1.02], [-0.5, 0.45, 0.82], [0.05, 1, 0.56]]) }),
    far: Object.freeze({ tiers: Object.freeze([[-1, 0.05, 1], [-0.4, 1, 0.64]]) }),
  }),
  spruceTree: Object.freeze({
    segs: 9, trunkSegs: 6, trunkTop: 0.65, dark: 0.18, wobble: 0.07,
    tiers: Object.freeze([[-1, -0.38, 0.92], [-0.66, -0.02, 0.78], [-0.3, 0.34, 0.64], [0.06, 0.68, 0.5], [0.4, 1, 0.34]]),
    scenery: Object.freeze({ trunkR: 0.26, trunkH: 3.6, canopyR: 1.8, canopyH: 8.6 }), lod: Object.freeze({ segs: 5, trunkSegs: 3, tierProfile: FAR_TIER, tiers: Object.freeze([[-1, -0.2, 0.9], [-0.45, 0.4, 0.66], [0.15, 1, 0.4]]) }),
    far: Object.freeze({ tiers: Object.freeze([[-1, 0, 0.88], [-0.3, 1, 0.56]]) }),
  }),
  palmTree: Object.freeze({
    lean: 0.2, // rad: scenery palms lean more than the others (TREE_VARIETY.sceneryLean)
    trunkSegs: 6, rings: 8, trunkTop: 0.7, bend: 1.6, ringBulge: 0.12, // bend: the trunk's sideways bow (trunk radii)
    // AP7b, the owner-approved crown "C + a little B" (docs/art/palm/SPEC.md, every number from there):
    // fronds per layer: count, reach (× canopy radius), start / peak / end height, where the peak is (0..1
    // along), bend (the droop's power), curl (the outer part pulled in and down), width (× radius), droop
    // (how much lower the edges hang than the spine, × width), stations, turn (rad). tuft: a small round
    // lathe in the centre (radius, height, sides); cap: where the fronds meet. fit: the crown is scaled
    // across so its widest frond reaches this × the canopy radius (the collider's edge).
    fronds: Object.freeze([
      Object.freeze({ n: 4, reach: 0.78, y0: 0.14, peak: 0.75, tp: 0.5, end: 0.2, bend: 1, curl: 0.8, width: 0.33, droop: 0.55, steps: 5, turn: 0.6 }),
      Object.freeze({ n: 7, reach: 1, y0: 0.06, peak: 0.58, tp: 0.5, end: -0.25, bend: 1, curl: 0.9, width: 0.36, droop: 0.6, steps: 5, turn: 0.15 }),
    ]),
    tuft: Object.freeze({ r: 0.16, h: 0.32, segs: 6 }), cap: Object.freeze({ r: 0.13, segs: 6 }), fit: 0.95,
    // The palm collider rule (AP7b, no "hitting air"): a palm's canopy collider is wide and flat, its
    // half-height = aspect × its radius (spec 0.65); validateHole fails one taller than maxAspect × radius
    // (core/trees.js palmColliderError). The crown as built spans y −0.57 … +0.70 of the canopy space.
    collider: Object.freeze({ aspect: 0.65, maxAspect: 0.8 }),
    // scenery: the same flat proportion as in play (canopyH = 2 × 0.65 × canopyR)
    scenery: Object.freeze({ trunkR: 0.24, trunkH: 7.5, canopyR: 3.2, canopyH: 4.2 }),
    lod: Object.freeze({ trunkSegs: 4, rings: 4, frondSteps: 3, tuft: Object.freeze({ r: 0.16, h: 0.32, segs: 4 }), cap: Object.freeze({ r: 0.13, segs: 4 }) }),
    // far (AP7b): 3 + 5 fronds of 2 stations, a 3-sided trunk
    far: Object.freeze({
      trunkSegs: 3, rings: 2, frondSteps: 2, cap: Object.freeze({ r: 0.13, segs: 3 }),
      fronds: Object.freeze([
        Object.freeze({ n: 3, reach: 0.78, y0: 0.14, peak: 0.75, tp: 0.5, end: 0.2, bend: 1, curl: 0.8, width: 0.36, droop: 0.55, steps: 5, turn: 0.6 }),
        Object.freeze({ n: 5, reach: 1, y0: 0.06, peak: 0.58, tp: 0.5, end: -0.25, bend: 1, curl: 0.9, width: 0.4, droop: 0.6, steps: 5, turn: 0.15 }),
      ]),
    }),
  }),
  // Round canopy (the artist's round tree). AP7b (artist + QA on #105: less "lollipop", no egg in tall
  // colliders): the lobes are STACKED to fill the collider, never stretched. They are built round in
  // the collider's own proportions (`aspect` = the canopy collider's half-height / radius, so 1.25 on
  // the mountain holes, 1.5 on pl-01/02) and the number of layers grows with it: a ring of `base` lobes
  // sitting on the collider's floor (flat-ish bottoms), `mid` rings in between (one per `step` of
  // height, counted in canopy radii), a `top` dome touching its top. Lobes [n around, r (× canopy
  // radius), radial (how far out from the axis), segs, rows]; squat: a lobe's height above its centre
  // = r × squat (a bit wider than tall); flat: the lower half's height × this; turn: each ring's
  // rotation (rad) so the lobes of one ring sit over the gaps of the one below; jitter: each lobe of a
  // ring sits up to this much higher (canopy radii), so the rings never read as flat layers. A mid lobe's radius
  // follows the spacing of the rings (× midFill, within [midMin, its r]).
  // aspects: the collider proportions an in-play tree is built for (the nearest is used: one draw call
  // per proportion a hole uses, today one per hole); the default (tests, menus) is the mountain's.
  roundCanopy: Object.freeze({
    trunkSegs: 7, trunkTop: 0.75, flat: 0.7, dark: 0.12, squat: 1, aspect: 1.25,
    aspects: Object.freeze([0.9, 1.25, 1.5]),
    stack: Object.freeze({
      base: Object.freeze([3, 0.6, 0.42, 9, 5]), mid: Object.freeze([3, 0.6, 0.4, 7, 4]), top: Object.freeze([1, 0.76, 0, 11, 6]),
      step: 0.8, midFill: 0.85, midMin: 0.5, turn: 1.05, jitter: 0.08,
      // AP7b (artist on #110): at most maxRows rows (the base ring + the dome; no "tower of blobs"). In a
      // tall collider the lobes grow instead, the dome up to grow[1] and the base lobes up to grow[0]
      // (pulled in so lobe + radial ≤ reach), until the rows overlap by `overlap` (canopy radii); still
      // short (the 1.5 colliders), the dome may be up to domeTall × as tall as wide
      maxRows: 2, grow: Object.freeze([0.66, 1.02]), reach: 1.04, overlap: 0.2, domeTall: 1.12,
    }),
    // lod (AP7b, artist via PM: lighter scenery, ~100 triangles): 3 base lobes of 5 sides, a 6-sided dome
    scenery: Object.freeze({ trunkR: 0.32, trunkH: 5, canopyR: 3, canopyH: 6 }),
    lod: Object.freeze({ trunkSegs: 3, midRings: 0, stack: Object.freeze({
      base: Object.freeze([3, 0.6, 0.42, 5, 3]), mid: Object.freeze([0, 0, 0, 0, 0]), top: Object.freeze([1, 0.76, 0, 6, 4]),
      step: 0.8, midFill: 0, midMin: 0, turn: 0, jitter: 0.08, maxRows: 2, grow: Object.freeze([0.66, 1.02]), reach: 1.04, overlap: 0.2, domeTall: 1.12 }) }),
    far: Object.freeze({ stack: Object.freeze({ base: Object.freeze([2, 0.66, 0.36, 5, 3]), mid: Object.freeze([0, 0, 0, 0, 0]), top: Object.freeze([1, 0.8, 0, 6, 3]), step: 1, midFill: 0, midMin: 0, turn: 0, jitter: 0 }) }),
  }),
  // Birch (Alpine): a slim pale trunk (trunkAlt) with dark bark marks (`mark` bands [from, to] of its
  // height), a light airy canopy of small lobes with gaps (lift: the canopy weights are raised, lighter)
  birchTree: Object.freeze({
    trunkSegs: 4, trunkTop: 0.6, marks: Object.freeze([[0.14, 0.18], [0.36, 0.39], [0.56, 0.61], [0.78, 0.81]]),
    flat: 0.7, dark: 0.1, lift: 0.12,
    // AP7b (artist on #110): lower and a bit wider, 5 lobes in two rows (2 up, 3 low, gaps between), the
    // canopy starting at ~40–45 % of the tree's height (a mountain collider), the pale trunk seen below
    blobs: Object.freeze([[0.14, 0.42, 0.16, 0.5, 0.55, 8, 5], [0.54, -0.28, 0.04, 0.42, 0.46, 6, 5], [-0.3, -0.22, 0.46, 0.42, 0.46, 6, 5], [-0.24, 0.3, -0.24, 0.44, 0.5, 8, 5], [-0.3, -0.34, -0.46, 0.42, 0.46, 6, 5]]),
    scenery: Object.freeze({ trunkR: 0.16, trunkH: 4.5, canopyR: 2, canopyH: 5 }), lod: Object.freeze({ segScale: 0.6, rowsLess: 1, blobCount: 3, trunkSegs: 3, marks: Object.freeze([[0.3, 0.34], [0.62, 0.66]]) }),
    far: Object.freeze({ segScale: 0.6, rowsLess: 2, blobCount: 2, marks: Object.freeze([]) }),
  }),
});
// AP7a: per-copy variety of the gradient trees (looks only; their own seeded streams, never physics).
// In play: a random turn and a canopy lean up to canopyLean rad (inside its collider). Scenery: the
// spot's size × a width factor [from, spread], a turn, a lean up to sceneryLean rad (or the piece's `lean`).
// AP7b: the cheap far trees (DESIGN §8b "Gradient tree pieces"). A scenery tree standing more than `from` m
// outside the course's OB box (the stakes' box) is drawn with its piece's `far` version (TREE_LOOK[id].far,
// on top of its lod: 2 tiers / 3 lobes, ~60–110 triangles, the same size, colours and fog), so the forests
// keep their density within the 300k budget. Every gradient piece has one (the palm since AP7b).
export const TREE_FAR = Object.freeze({ from: 35 });
export const TREE_VARIETY = Object.freeze({ seed: 78, canopyLean: 0.06, sceneryLean: 0.07, width: Object.freeze([0.86, 0.28]) });
// AP6: the ground material (DESIGN §8b "The ground material"), after the artist's recipe docs/art/style-r2/paint.js.
// Looks only: the physics surfaces (surfaceAt) never change. Widths in m; amounts multiply the palette colour.
//   edge: the darker `edge` line drawn on the rough (or ob) side of the fairway, tee and fringe; lip: the darker
//   `lip` band just inside a bunker's edge; bank: the `bank` band on the land round water (not on green, tee, sand,
//   rock); deep: m from the shore at which water is full `waterDeep`.
//   sparkle: the water's ripple highlights ([threshold, share toward white], recipe).
//   shadow: a soft painted shadow under every tree in play: radius × canopyR, offset × canopyR away from the sun,
//   the colour = `shadow` mixed toward white by `light`, strength at the centre / at `mid` of the radius.
//   texture: the shared tiling greyscale detail texture (seeded, made in code): `size` px for `tile` m, speckle
//   cells per m, dab cells (m) and dab size (m), and the turn (rad) of its world mapping.
//   kinds: per drawn ground kind, the recipe's base multiplier (`base`), its soft large patches (`patch`: amount,
//   scale m), the fine speckle (`speck`) and brush dabs (`dab`) amounts.
export const GROUND_LOOK = Object.freeze({
  seed: 66,
  edge: 0.6, lip: 0.5, bank: 1.4, deep: 6,
  sparkle: Object.freeze([[0.8, 0.45], [0.6, 0.15]]),
  shadow: Object.freeze({ radius: 1.15, offset: 0.55, light: 0.45, centre: 0.95, mid: 0.75, midAt: 0.7, stretch: 1.25, squash: 0.9 }),
  texture: Object.freeze({ size: 512, tile: 16, speck: 3, dabCell: 2, dabLen: 0.8, dabWid: 0.22, turn: 0.4 }),
  maskScale: 0.5,                 // the shader's surface mask: × the course map's resolution
  // the smooth edges (AP6 follow-up): a pixel where the surfaces change is sampled sub × sub times; a pixel
  // whose centre is less than `near` px from a band's outer line is blended too (a sample is ≤ 0.53 px away)
  aa: Object.freeze({ sub: 4, near: 0.75 }),
  kinds: Object.freeze({
    fairway:   Object.freeze({ base: 0.97, speck: 0.04, dab: 0.03 }),
    tee:       Object.freeze({ base: 0.97, speck: 0.04, dab: 0.03 }),
    fringe:    Object.freeze({ base: 0.98, speck: 0.04, dab: 0 }),
    edge:      Object.freeze({ base: 0.98, speck: 0.04, dab: 0 }),
    green:     Object.freeze({ base: 0.99, speck: 0.025, dab: 0 }),
    rough:     Object.freeze({ base: 0.9, patch: Object.freeze([0.1, 22]), speck: 0.05, dab: 0.05 }),
    ob:        Object.freeze({ base: 0.88, patch: Object.freeze([0.12, 28]), speck: 0.05, dab: 0.06 }),
    sand:      Object.freeze({ base: 0.98, patch: Object.freeze([0.02, 3]), speck: 0.05, dab: 0 }),
    lip:       Object.freeze({ base: 0.96, speck: 0.06, dab: 0 }),
    bank:      Object.freeze({ base: 0.96, speck: 0.06, dab: 0 }),
    rock:      Object.freeze({ base: 0.88, bands: Object.freeze([0.16, 2.4, 3]), speck: 0, dab: 0 }),
    water:     Object.freeze({ base: 1, speck: 0, dab: 0 }),
  }),
});

// X43: the see-through water surface (DESIGN §8b "The water surface", core/water.js). Looks only.
//   step: m between the grid points the water is found on and drawn with; lift: m above the bed a wet point is drawn
//   at least; drop: m a body's flat level sits under its lowest shore point.
//   The soft edge (owner 2026-11-23: "it should blend better, even if the surface ends up a little bit on the rock"):
//   edge: [out, in] m: the surface fades from fully drawn `in` m inside the water's edge to nothing `out` m onto the
//   bank (smooth, per pixel, from each vertex's distance to the real edge); hug: m over the ground the mesh lies
//   where it reaches onto the bank (never under it, so the ground never cuts it); bisect: halvings of a grid step
//   that find the water's edge between a wet and a dry grid point (1 m / 2^4 ≈ 6 cm).
//   tint: how far the surface colour goes from the palette's `water` toward `skyHorizon` (lighter than the bed).
//   fresnel: [power, strength] the sky (`skyHorizon`) reflected at a grazing angle, and how much more opaque the
//   surface gets there; sheen: [shininess, strength] the sun's soft highlight (× WATER_SHEEN), sun direction from the
//   scene's light; ripple: [[wavelength m, speed m/s, angle rad, slope], ...] a few slow sine waves that tilt the
//   normal (no texture), faded to flat between fade[0] and fade[1] m from the camera so nothing shimmers far away.
//   renderOrder: drawn first among the see-through things (the aim marks, rings and the ball's shadow come after,
//   so they read on top); the ball is drawn after the water too (props.js).
export const WATER_LOOK = Object.freeze({
  step: 1, lift: 0.08, drop: 0.05,
  edge: Object.freeze([0.5, 0.9]), hug: 0.06, bisect: 4,
  tint: 0.3,
  fresnel: Object.freeze([4, 0.35]),
  sheen: Object.freeze([60, 0.5]),
  ripple: Object.freeze([Object.freeze([7, 0.35, 0.4, 0.05]), Object.freeze([4.3, 0.25, 2.1, 0.035]), Object.freeze([2.6, 0.18, -1.2, 0.02])]),
  fade: Object.freeze([25, 90]),
  renderOrder: -0.2,
});

// AP7c: small props scattered by a biome set's rule (DESIGN §8b "Small props", core/smallProps.js). Looks only:
// no physics, no effect on the aim line or the warnings. Every number of the scatter and the drawing is here.
//   surfaces: the ONLY surfaces a prop may stand on, whatever the set's `on` says (never tee, fairway, fringe,
//     green, sand, water, rock / paths); validateBiomeSet rejects any other id in `on`.
//   maxPerHa / maxProps: the most a set may ask for (props per hectare) / the most one hole scatters.
//   cluster: the limits of a pick's `cluster` ({ count, radius }).
//   margin: m the scatter area reaches beyond the OB box (for props `on: ['ob']`), clipped to the hole's map.
//   edgeClear: m a prop keeps from any surface it may not stand on (4 samples around it).
//   teeClear: m around the tee; cupClear: m around the cup (the putting area); greenClear: m from the green and
//     fringe, checked within greenReach m of the cup (6 samples), so a big green keeps its apron clear.
//   ballClear: m around the ball (3D) where every prop is hidden (owner: no blind shots; live value
//     ?tune=PROP_BALL_CLEAR); lineClear: m around the line from the ball to the camera where props are hidden too.
//   drawDist: m from the camera beyond which no prop is drawn; maxTris: the most small-prop triangles drawn in one
//     frame (the nearest first), so a dense set never pushes a hole over PERF_BUDGET; moveStep: m the camera or
//     the ball must move before the drawn props are picked again; turnStep: the camera turn (1 − cos of the angle)
//     that picks them again; behind: m behind the camera beyond which none is drawn (the cap is spent on what is seen).
//   scale: per-copy size [from, spread] (seeded, the scatter's own stream; each copy also gets a random turn).
export const SMALL_PROPS = Object.freeze({
  seed: 61,
  surfaces: Object.freeze(['rough', 'ob']),   // the ground a prop may stand on (a pick's `on`)
  waterEdge: 'waterEdge',                      // AP7d: the extra `on` name of a shore pick (reeds): land beside water (below)
  maxPerHa: 4000, maxProps: 20000, maxPerTenM: 20,
  cluster: Object.freeze({ maxCount: 30, maxRadius: 8 }),
  margin: 30, edgeClear: 0.5, teeClear: 8, cupClear: 14, greenClear: 2.5, greenReach: 45,
  ballClear: 1.2, lineClear: 0.5,
  drawDist: 60, maxTris: 10000, moveStep: 0.5, behind: 2, turnStep: 0.05,
  scale: Object.freeze([0.8, 0.45]),           // a piece without its own range: from, spread (× 0.8–1.25)
  areaStep: 2,                                 // m, the grid that measures a pick's surfaces (per-pick perHa)
  // AP7d: the water-edge surface. A shore patch's centre stands on land `reach` m or less outside the water's
  // edge; `step` m is the grid that finds the shoreline (each boundary point stands for `step` m of it).
  shore: Object.freeze({ reach: 1, step: 0.5, coarse: 2, land: Object.freeze(['rough', 'ob']) }),
  trunkClear: 1,                               // AP7d: m from a tree trunk's edge or an OB stake (nothing stands closer)
  stakeR: 0.05, sceneryTrunkR: 0.3,            // m: an OB stake's radius; a scenery tree's trunk (its real radius is not stored)
});
// AP7e: the big props placed by hand in a hole's scenery.bigProps (DESIGN §8b "Big props", core/bigProps.js). Looks only.
//   obClear: m a prop's footprint (its piece's radius × scale) must stay outside the OB stakes' box (validation).
//   drop: the prop stands at the lowest ground under its footprint (never floats; a sunk foot is fine): heightAt is
//     read at the centre and on rings at these fractions of the footprint radius, `perRing` points each.
//   maxTris: one piece's triangles (ART_STYLE §5: a big prop ≤ 1,500; tests/big-props.test.js).
//   treeClear: m beyond a prop's footprint where no scenery tree stands (so none pokes through a roof; only on a hole
//     with props: the other trees keep their places). Small props keep SMALL_PROPS.trunkClear from the footprint.
export const BIG_PROPS = Object.freeze({
  obClear: 5, treeClear: 3,
  drop: Object.freeze({ rings: Object.freeze([0.5, 1]), perRing: 12 }),
  maxTris: 1500,
});
// AP1b: the terrain mesh's detail by distance (src/core/terrainMesh.js, DESIGN §5 "Terrain mesh").
// Looks only: the ball always uses heightAt.
export const TERRAIN_LOD = Object.freeze({
  tile: 8,          // m, the side of a tile in the fine area (each tile has one cell size)
  fineStep: 1,      // m, the cells in and around the play area (the green band keeps its own 0.5 m)
  steps: Object.freeze([8, 4, 2]), // m, the coarser cells tried away from the play area, coarsest first
  tol: 0.01,        // m, a coarser tile stays this close to heightAt on every 1 m point
  finerStep: 0.5,   // m, the cells of a steep tile (creek banks, bunker faces, rock edges)
  fineTol: 0.05,    // m, a play-area tile gets finerStep cells when 1 m cells miss heightAt by more than this
  roughTol: 0.12,   // m, the same for the other tiles (the ball is rarely there; the triangle budget)
  detailSurfaces: Object.freeze(['fairway', 'green', 'fringe', 'tee', 'sand']), // the play area (+ one tile of margin)
});
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

// FL1: how the flagstick looks (src/game/props.js). Its size is TUNE.FLAG_R / FLAG_H (what the ball hits).
// cloth: m wide/high, its centre clothDrop m below the top; minH: m, a 0-tall pole still gets a valid mesh
// (hidden). wobble: rad the stick leans after a hit, swinging wobbleHz times a second, fading with time
// constant wobbleDecay s, over after wobbleS s.
export const FLAG_FX = Object.freeze({ clothW: 0.9, clothH: 0.55, clothDrop: 0.3, minH: 0.01, wobble: 0.09, wobbleHz: 2.5, wobbleDecay: 0.35, wobbleS: 1.6 });

// AP5: the HUD's own colours on the course (aim line, obstacle warning, aim dots). They never come
// from a biome set; the biome readability rules (core/biome.js, ART_STYLE §4.4) check every palette against them.
// X25: the aim guide's other states, read by props.js (3D) and hud.js (minimap) from here: capped = the
// lie's power cap (the minimap's grey is a touch lighter, as before), hazard = lands in water or OB (S23).
export const UI_COLORS = Object.freeze({ aim: '#ffd447', warn: '#ff4a3a', aimDot: '#ffffff', capped: '#b8b8b8', cappedMap: '#c8c8c8', hazard: '#46b4ff' });
// X26: the minimap draws a tree in its canopy colour and a boulder in its rock colour; when one is too
// close to the fairway or the rough (core/biome.js MINIMAP_READABILITY), the minimap darkens it ONE fixed
// step: each RGB channel moves this share of the way to black (0.5: half way, so they read clearly, not
// just pass the rule: 0.35 passed but left today's mountain trees only ΔL 9 from the rough, hard to see).
// If it still fails, the set fails (validateBiomeSet).
export const MINIMAP_DARKEN = 0.5;

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
  // Ball control (Phase BC, core/shape.js; per-club amounts in clubs.js)
  BC_BACK:               { def: 1,    min: 0,     max: 2 },    // how far a shaped shot curves back by the time it lands (flat, no wind): 1 = onto the aim line, 0 = no curve, >1 = across it
  BC_LEFTY:              { def: 0,    min: 0,     max: 1 },    // 1 = a left-handed player (the impact point's left / right is mirrored); 0 = right-handed
  // Ball, cup, wind, clock (§4, §7)
  CUP_CAPTURE_SPEED:     { def: 3.2,  min: 1,     max: 6 },    // m/s: slower than this over the cup = holed; faster = lip-out
  WIND_K:                { def: 0.3,  min: 0,     max: 0.6 },  // how strongly wind pushes the ball in the air (S17: 0.2 → 0.3)
  FLIGHT_SPEEDUP:        { def: 1.35, min: 0.5,   max: 3 },    // full shots run this much faster than real time (putts run at 1×)
  // Obstacles (Phase K, DESIGN §4 "Obstacles")
  OBSTACLE_REST:         { def: 0.4,  min: 0,     max: 1 },    // share of the speed INTO a trunk or boulder that bounces back
  OBSTACLE_KEEP:         { def: 0.7,  min: 0,     max: 1 },    // share of the speed ALONG it that is kept
  CANOPY_SLOW:           { def: 0.3,  min: 0,     max: 1 },    // share of its speed a ball keeps when it flies into a tree's leaves (K3)
  CANOPY_DEFLECT:        { def: 15,   min: 0,     max: 45 },   // degrees: the leaves turn the ball left or right by up to this (seeded RNG)
  // Flagstick (FL1, DESIGN §4 "Cup"): a thin vertical pole standing in the cup. Putts ignore it.
  FLAG_R:                { def: 0.025, min: 0,    max: 0.2 },  // m: the pole's radius (the drawn pole is 0.025)
  FLAG_H:                { def: 2.6,  min: 0,     max: 4 },    // m: the pole's height above the cup (the drawn pole is 2.6); 0 = no pole
  FLAG_REST:             { def: 0.15, min: 0,     max: 1 },    // share of the speed INTO the pole that bounces back (soft: the ball drops dead)
  FLAG_KEEP:             { def: 0.2,  min: 0,     max: 1 },    // share of the speed ALONG the pole's side (a glancing hit) that is kept
  FLAG_PUTT_HIDE:        { def: 3,    min: 0,     max: 30 },   // m: on a putt the drawn pole and flag are hidden while the ball is this close to the cup (0 = never hide). Looks only
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
  AIM_START_K:           { def: 0.4,  min: 0.05,  max: 1 },    // X14: a held aim starts at this × the aim speed (a tap is a fine nudge)...
  AIM_RAMP_S:            { def: 0.3,  min: 0.01,  max: 1 },    // ...and reaches full speed after this many seconds
  AIM_FAST_K:            { def: 1.6,  min: 1,     max: 3 },    // X14: held past 1.2 s, it speeds up to this × (over 0.8 s)
  AIM_FINE_K:            { def: 0.25, min: 0.05,  max: 1 },    // X14: Shift + ◀ ▶ turns at this × (fine aim)
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
  // AP6 (looks only): the ground material. 0 = the flat painted course of before AP6, 1 = low (edge lines, lip, bank,
  // water, rough patches and tree shadows painted into the course map, no extra texture or shader work), 2 = full
  // (1 + the tiling detail texture, mowing stripes and putting grid drawn by the shader). Rounded to a whole level.
  GROUND_DETAIL:         { def: 2,    min: 0,     max: 2 },
  // AP7c (game layer only, looks): m around the ball where small props are hidden (SMALL_PROPS.ballClear is the same default)
  PROP_BALL_CLEAR:       { def: 1.2,  min: 0,     max: 5 },
  // AP7c: m from the camera beyond which no small prop is drawn (SMALL_PROPS.drawDist is the same default; maxTris still caps the triangles)
  PROP_DRAW_DIST:        { def: 60,   min: 20,    max: 100 },
  // AP7d follow-up (owner: "too subtle"; looks only, defaults = today): PROP_SCALE = one multiplier on every small prop's size (on top of the copy's own scale; the ball clearance grows with it);
  // beyond PROP_THIN_FROM m from the camera only the share PROP_FAR_KEEP of the props is drawn (fixed per copy, no flicker; PROP_THIN_FROM >= PROP_DRAW_DIST = off);
  // PROP_MAX_TRIS = the triangle cap of the small props (read when the hole is built)
  PROP_SCALE:            { def: 2,    min: 0.5,   max: 3 },
  PROP_THIN_FROM:        { def: 30,   min: 5,     max: 100 },
  PROP_FAR_KEEP:         { def: 0.5,  min: 0.1,   max: 1 },
  PROP_MAX_TRIS:         { def: 10000, min: 1000, max: 60000 },
  // AP7e follow-up (owner: big props hard to notice; looks only, default 2.5 = owner pick 2026-11-23): BIG_PROP_SCALE = one multiplier on every big prop's size, on top of its own scale (0.9–1.15);
  // the footprint (tree clearing, OB + obClear m rule) grows with it: a prop that would then reach inside OB + obClear m is not drawn (console note)
  BIG_PROP_SCALE:        { def: 2.5,    min: 0.5,   max: 4 },
  // X43 (owner: "a simple semi-transparent surface on the water"; looks only): WATER_OPACITY = the see-through water
  // surface's opacity looking straight down (more at a grazing angle; default 0.5 = owner pick 2026-11-23);
  // WATER_SHEEN = × the sun's highlight (0 = none). Read when the hole is built.
  WATER_OPACITY:         { def: 0.5,  min: 0.1,   max: 0.9 },
  WATER_SHEEN:           { def: 1,    min: 0,     max: 3 },
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
