// Designer test spots (X8): ?scenario=<id> starts the ball at a named spot with a fixed seed, so a
// situation can be replayed on a phone without a keyboard. Data only; the engine reads `hole`, `aimAt` (optional, K9: where the aim starts),
// `ball`, `strokes`, `seed` and the optional `wind` (m/s, overrides the seeded wind).
// `lie` is what the ball should sit on; tests/scenarios.test.js checks it, so a hole edit that
// moves a bunker can't silently break a scenario.
import { HOLES } from './sets.js';
import { validateScenario } from '../core/validate.js';

export const SCENARIOS = {
  'h1-bunker': {
    hole: 'pl-01', ball: { x: -15, z: -147 }, strokes: 1, seed: 101, wind: { x: 0, z: 0 }, lie: 'sand',
    name: 'Hole 1: greenside bunker', text: 'Left bunker, about 20 m from the pin.',
  },
  'h1-green': {
    hole: 'pl-01', ball: { x: -6, z: -146 }, strokes: 1, seed: 102, wind: { x: 0, z: 0 }, lie: 'green',
    name: 'Hole 1: flat putt', text: 'A 12 m putt on a flat green.',
  },
  'h1-pond-carry': {
    hole: 'pl-01', ball: { x: -28, z: -50 }, strokes: 1, seed: 103, lie: 'rough',
    name: 'Hole 1: carry the pond', text: 'Left rough, with the pond between you and the green.',
  },
  'h2-fairway-bunker': {
    hole: 'pl-02', ball: { x: 16, z: -237 }, strokes: 1, seed: 201, lie: 'sand',
    name: 'Hole 2: fairway bunker', text: 'Right of the drive zone, about 230 yd out.',
  },
  'h2-cross-bunker': {
    hole: 'pl-02', ball: { x: 12, z: -385 }, strokes: 2, seed: 202, lie: 'sand',
    name: 'Hole 2: cross bunker', text: 'About 70 yd short of the raised green.',
  },
  'h2-green-step': {
    hole: 'pl-02', ball: { x: 22, z: -432 }, strokes: 3, seed: 203, wind: { x: 0, z: 0 }, lie: 'green',
    name: 'Hole 2: putt up the step', text: 'Lower tier: putt up over the ridge to the top tier.',
  },
  'h2-side-slope': {
    hole: 'pl-02', ball: { x: 14, z: -300 }, strokes: 2, seed: 204, lie: 'fairway',
    name: 'Hole 2: side slope', text: 'The ground falls left toward the pond.',
  },
  // K13 (owner bug): the two hollows where the old background ground plane poked through the course
  'h2-hollow-tee': {
    hole: 'pl-02', ball: { x: 0, z: -95 }, strokes: 1, seed: 205, wind: { x: 0, z: 0 }, lie: 'fairway',
    name: 'Hole 2: hollow past the tee', text: 'The lowest spot of the first fairway (1.8 m down). The ball and the course around it are visible.',
  },
  'h2-hollow-bunker': {
    hole: 'pl-02', ball: { x: 4, z: -259 }, strokes: 1, seed: 206, wind: { x: 0, z: 0 }, lie: 'fairway',
    name: 'Hole 2: hollow left of the bunker', text: 'The dip left of the fairway bunker (1.5 m down). The ball and the course around it are visible.',
  },
  // Phase K (K6): hole 3, the trees and the rock
  'h3-behind-tree': {
    hole: 'pl-03', ball: { x: -26, z: -203 }, strokes: 1, seed: 301, wind: { x: 0, z: 0 }, lie: 'fairway',
    name: 'Hole 3: behind the lone tree', text: 'Left of the lone tree, which is right in the line to the green. Go around it.',
  },
  'h3-cut-corner': {
    hole: 'pl-03', ball: { x: 0, z: 0 }, strokes: 0, seed: 302, wind: { x: 0, z: 0 }, lie: 'tee',
    name: 'Hole 3: cut the corner', text: 'Aim right, over the trees in the corner (about 20° right of the default aim). A full Driver clears them; a weak or mishit one is caught by the leaves.',
  },
  'h3-rock': {
    hole: 'pl-03', ball: { x: -4, z: -254 }, strokes: 1, seed: 303, wind: { x: 0, z: 0 }, lie: 'rock',
    name: 'Hole 3: on the rock', text: 'Through the corner onto the rock outcrop, next to the boulders: a thin lie (max 90%, harder timing).',
  },
  // K9 (owner, PR #33): a rock bounce you can try on purpose. The aim starts at the middle of the
  // outcrop (`aimAt`), so the suggested 9 Iron at the ⚑ lands on the rock (not a boulder), bounces
  // high three times and runs off the far side. Compare ?tune=rock.rest:0.4,rock.keep:0.7.
  'h3-rock-bounce': {
    hole: 'pl-03', ball: { x: -5, z: -150 }, aimAt: { x: -4, z: -262 }, strokes: 1, seed: 304, wind: { x: 0, z: 0 }, lie: 'fairway',
    name: 'Hole 3: rock bounce', text: 'Aimed at the rock outcrop: hit the ⚑ and watch the ball bounce high and run on the hard rock.',
  },
  // Phase C: Mountain 9 prototype (course designer). The key shot, a recovery spot and a putt per hole.
  'mtn1-drive-right': {
    hole: 'mtn-01', ball: { x: 0, z: 0 }, aimAt: { x: 14, z: -235 }, strokes: 0, seed: 1101, wind: { x: 0, z: 0 }, lie: 'tee',
    name: 'Mountain 1: drive down the right', text: 'Aimed down the right side, toward the creek: the best angle into the green.',
  },
  'mtn1-bunker': {
    hole: 'mtn-01', ball: { x: -21, z: -238 }, strokes: 1, seed: 1102, lie: 'sand',
    name: 'Mountain 1: fairway bunker', text: 'The shallow bunker left of the landing zone, about 110 m out.',
  },
  'mtn1-putt': {
    hole: 'mtn-01', ball: { x: -8, z: -336 }, strokes: 2, seed: 1103, wind: { x: 0, z: 0 }, lie: 'green',
    name: 'Mountain 1: flat putt', text: 'A 13 m putt on the big, almost flat green.',
  },
  'mtn2-carry-pines': {
    hole: 'mtn-02', ball: { x: 0, z: 0 }, aimAt: { x: 84, z: -257 }, strokes: 0, seed: 1201, wind: { x: 0, z: 0 }, lie: 'tee',
    name: 'Mountain 2: carry the pines', text: 'Aimed at the green, over the pines. A full Driver clears them; a weak one drops into the rough under them.',
  },
  'mtn2-under-pines': {
    hole: 'mtn-02', ball: { x: 36, z: -126 }, strokes: 1, seed: 1202, lie: 'rough',
    name: 'Mountain 2: under the pines', text: 'Caught by the pines: in the rough under them. Chip out to the fairway or find a gap.',
  },
  'mtn2-downhill-putt': {
    hole: 'mtn-02', ball: { x: 95, z: -258 }, strokes: 2, seed: 1203, wind: { x: 0, z: 0 }, lie: 'green',
    name: 'Mountain 2: downhill putt', text: 'From the back of the green, downhill toward the fairway: easy does it.',
  },
  'mtn3-at-flag': {
    hole: 'mtn-03', ball: { x: 0, z: 0 }, aimAt: { x: -3, z: -149 }, strokes: 0, seed: 1301, wind: { x: 0, z: 0 }, lie: 'tee',
    name: 'Mountain 3: at the flag', text: 'Aimed straight at the flag near the creek. A hook finds the water.',
  },
  'mtn3-creek-side': {
    hole: 'mtn-03', ball: { x: -18, z: -126 }, strokes: 1, seed: 1302, lie: 'rough',
    name: 'Mountain 3: beside the creek', text: 'In the rough on the creek bank, short left of the green. Chip over the corner of the water.',
  },
  'mtn3-tilted-putt': {
    hole: 'mtn-03', ball: { x: 12, z: -156 }, strokes: 1, seed: 1303, wind: { x: 0, z: 0 }, lie: 'green',
    name: 'Mountain 3: putt toward the creek', text: 'The green tilts toward the creek: this putt breaks left and runs on.',
  },
  'mtn4-layup': {
    hole: 'mtn-04', ball: { x: 0.6, z: -222.4 }, aimAt: { x: -30, z: -394 }, strokes: 1, seed: 1401, wind: { x: 0, z: 0 }, lie: 'fairway',
    name: 'Mountain 4: lay up', text: 'After the drive, aimed at the lay-up zone short of the creek (about 165 m). Leaves a wedge of about 50 m.',
  },
  'mtn4-go-for-it': {
    hole: 'mtn-04', ball: { x: 0.6, z: -222.4 }, aimAt: { x: -40, z: -447 }, strokes: 1, seed: 1402, wind: { x: 0, z: 0 }, lie: 'fairway',
    name: 'Mountain 4: go for it in two', text: 'Aimed at the green over the creek. A good 3 Wood gets there; a weak one is wet.',
  },
  'mtn4-pitch-over': {
    hole: 'mtn-04', ball: { x: -30, z: -392 }, strokes: 2, seed: 1403, wind: { x: 0, z: 0 }, lie: 'fairway',
    name: 'Mountain 4: pitch over the creek', text: 'From the lay-up zone, about 55 m: pitch over the creek. Even a short one stays dry on the apron.',
  },
  'mtn5-carry-pond': {
    hole: 'mtn-05', ball: { x: 0, z: 0 }, aimAt: { x: 56, z: -226 }, strokes: 0, seed: 1501, wind: { x: 0, z: 0 }, lie: 'tee',
    name: 'Mountain 5: carry the pond', text: 'Aimed over the pond at the fairway beyond it. A full Driver makes it; 90% with a hook doesn\'t.',
  },
  'mtn5-bunker': {
    hole: 'mtn-05', ball: { x: -22, z: -212 }, strokes: 1, seed: 1502, lie: 'sand',
    name: 'Mountain 5: corner bunker', text: 'The bunker on the outside of the corner, about 150 m from the green.',
  },
  'mtn5-two-tier': {
    hole: 'mtn-05', ball: { x: 100, z: -330 }, strokes: 2, seed: 1503, wind: { x: 0, z: 0 }, lie: 'green',
    name: 'Mountain 5: down a tier', text: 'From the top tier, putt down the step to the cup on the lower tier.',
  },
  'mtn6-feeder-bank': {
    hole: 'mtn-06', ball: { x: 0, z: 0 }, aimAt: { x: 21, z: -158 }, strokes: 0, seed: 1601, wind: { x: 0, z: 0 }, lie: 'tee',
    name: 'Mountain 6: use the bank', text: 'Aimed at the grassy bank right of the green: a slight hook feeds down onto the green.',
  },
  'mtn6-deep-bunker': {
    hole: 'mtn-06', ball: { x: 12, z: -145 }, strokes: 1, seed: 1602, wind: { x: 0, z: 0 }, lie: 'sand',
    name: 'Mountain 6: deep bunker', text: 'In the deep bunker in front of the bank (1.4 m deep). The Sand Wedge gets out.',
  },
  'mtn6-creek-putt': {
    hole: 'mtn-06', ball: { x: 8, z: -166 }, strokes: 1, seed: 1603, wind: { x: 0, z: 0 }, lie: 'green',
    name: 'Mountain 6: putt toward the creek', text: 'The green tilts left toward the creek: this putt breaks left.',
  },
};

// Checked when they load (Gate A T7): a bad spot fails here, naming the scenario and the field.
for (const [id, sc] of Object.entries(SCENARIOS)) validateScenario(id, sc, HOLES);

// ?scenario= value → { scenario, unknown }. Ids are matched case-insensitively.
export function resolveScenario(id) {
  const key = (id ?? '').trim().toLowerCase();
  if (!key) return { scenario: null, unknown: false };
  return Object.hasOwn(SCENARIOS, key) ? { scenario: { id: key, ...SCENARIOS[key] }, unknown: false } : { scenario: null, unknown: true };
}
