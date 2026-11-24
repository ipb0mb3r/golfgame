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
  // FL1: the flagstick. Both aim at the cup with no wind; tests/flagpole.test.js checks the powers in the text.
  'h1-pin-chip': {
    hole: 'pl-01', ball: { x: 4, z: -132 }, strokes: 1, seed: 104, wind: { x: 0, z: 0 }, lie: 'fairway',
    name: 'Hole 1: chip at the pin', text: 'A 20 m chip straight at the flagstick. Around 27% it hits the pole low and drops in; around 30% it hits it high and stops by it.',
  },
  'h1-pin-approach': {
    hole: 'pl-01', ball: { x: 4, z: -62 }, aimAt: { x: 4, z: -152 }, strokes: 1, seed: 105, wind: { x: 0, z: 0 }, lie: 'fairway',
    name: 'Hole 1: approach at the pin', text: 'A 90 m P Wedge aimed at the flagstick. Around 85% it hops into the pole and drops in; around 88% it hits it and stops by it.',
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
    name: 'Hole 3: rock bounce', text: 'Aimed at the rock outcrop: land it on the rock (use the ticks on the aim line) and watch the ball bounce high and run on the hard rock.',
  },
  // Phase C: Mountain 9 prototype (course designer). The key shot, a recovery spot and a putt per hole.
  'mtn1-drive-right': {
    hole: 'mtn-01', ball: { x: 0, z: 0 }, aimAt: { x: 14, z: -250 }, strokes: 0, seed: 1101, wind: { x: 0, z: 0 }, lie: 'tee',
    name: 'Mountain 1: drive down the right', text: 'Aimed down the right side, toward the creek: the best angle into the green.',
  },
  'mtn1-bunker': {
    hole: 'mtn-01', ball: { x: -19, z: -246 }, strokes: 1, seed: 1102, lie: 'sand',
    name: 'Mountain 1: fairway bunker', text: 'The shallow bunker left of the landing zone, about 110 m out.',
  },
  'mtn1-putt': {
    hole: 'mtn-01', ball: { x: -8, z: -366 }, strokes: 2, seed: 1103, wind: { x: 0, z: 0 }, lie: 'green',
    name: 'Mountain 1: flat putt', text: 'A 13 m putt across the big green: it breaks a little toward the front left.',
  },
  'mtn2-carry-pines': {
    hole: 'mtn-02', ball: { x: 0, z: 0 }, aimAt: { x: 60, z: -250 }, strokes: 0, seed: 1201, wind: { x: 0, z: 0 }, lie: 'tee',
    name: 'Mountain 2: carry the pines', text: 'The shortcut over the pines inside the corner. A full Driver lands on the fairway; a weaker one drops into the rough.',
  },
  'mtn2-under-pines': {
    hole: 'mtn-02', ball: { x: 33, z: -108 }, strokes: 1, seed: 1202, lie: 'rough',
    name: 'Mountain 2: under the pines', text: 'Caught by the pines: in the rough under them. Chip out to the fairway or find a gap.',
  },
  'mtn2-downhill-putt': {
    hole: 'mtn-02', ball: { x: 106, z: -288 }, strokes: 2, seed: 1203, wind: { x: 0, z: 0 }, lie: 'green',
    name: 'Mountain 2: downhill putt', text: 'From the back of the green, downhill toward the fairway: easy does it.',
  },
  'mtn3-at-flag': {
    hole: 'mtn-03', ball: { x: 0, z: 0 }, aimAt: { x: -2, z: -165 }, strokes: 0, seed: 1301, wind: { x: 0, z: 0 }, lie: 'tee',
    name: 'Mountain 3: at the flag', text: 'Aimed straight at the flag near the creek. A hook finds the water.',
  },
  'mtn3-creek-side': {
    hole: 'mtn-03', ball: { x: -18, z: -126 }, strokes: 1, seed: 1302, lie: 'rough',
    name: 'Mountain 3: beside the creek', text: 'In the rough on the creek bank, short left of the green. Chip over the corner of the water.',
  },
  'mtn3-tilted-putt': {
    hole: 'mtn-03', ball: { x: 14, z: -172 }, strokes: 1, seed: 1303, wind: { x: 0, z: 0 }, lie: 'green',
    name: 'Mountain 3: putt toward the creek', text: 'The green tilts toward the creek: this putt breaks left and runs on.',
  },
  'mtn4-layup': {
    hole: 'mtn-04', ball: { x: 0.7, z: -240.2 }, aimAt: { x: -31, z: -408 }, strokes: 1, seed: 1401, wind: { x: 0, z: 0 }, lie: 'fairway',
    name: 'Mountain 4: lay up', text: 'After the drive, aimed at the lay-up zone short of the creek (a 3 Wood at about 75%). Leaves a wedge of about 60 m.',
  },
  'mtn4-go-for-it': {
    hole: 'mtn-04', ball: { x: 0.7, z: -240.2 }, aimAt: { x: -44, z: -470 }, strokes: 1, seed: 1402, wind: { x: 0, z: 0 }, lie: 'fairway',
    name: 'Mountain 4: go for it in two', text: 'Aimed at the green over the creek. A good 3 Wood gets there; a weak one is wet.',
  },
  'mtn4-pitch-over': {
    hole: 'mtn-04', ball: { x: -31, z: -408 }, strokes: 2, seed: 1403, wind: { x: 0, z: 0 }, lie: 'fairway',
    name: 'Mountain 4: pitch over the creek', text: 'From the lay-up zone, about 60 m: pitch over the creek (now a real one, 8–10 m wide). Even a short one stays dry on the apron.',
  },
  'mtn5-carry-pond': {
    hole: 'mtn-05', ball: { x: 0, z: 0 }, aimAt: { x: -60, z: -217 }, strokes: 0, seed: 1501, wind: { x: 0, z: 0 }, lie: 'tee',
    name: 'Mountain 5: carry the pond', text: 'Aimed over the pond at the small island of fairway beyond it, beside the trees. A 95% Driver lands on it; a bit more or less finds the rough around it; 85% is wet.',
  },
  'mtn5-bunker': {
    hole: 'mtn-05', ball: { x: 24, z: -236 }, strokes: 1, seed: 1502, lie: 'sand',
    name: 'Mountain 5: corner bunker', text: 'The bunker on the outside of the corner, where the safe drive finishes.',
  },
  'mtn5-two-tier': {
    hole: 'mtn-05', ball: { x: -106, z: -362 }, strokes: 2, seed: 1503, wind: { x: 0, z: 0 }, lie: 'green',
    name: 'Mountain 5: down a tier', text: 'From the top tier, putt down the step to the cup on the lower tier.',
  },
  'mtn6-feeder-bank': {
    hole: 'mtn-06', ball: { x: 0, z: 0 }, aimAt: { x: 21, z: -170 }, strokes: 0, seed: 1601, wind: { x: 0, z: 0 }, lie: 'tee',
    name: 'Mountain 6: use the bank', text: 'Aimed at the grassy bank right of the green: a slight hook feeds down onto the green.',
  },
  'mtn6-deep-bunker': {
    hole: 'mtn-06', ball: { x: 12, z: -158 }, strokes: 1, seed: 1602, wind: { x: 0, z: 0 }, lie: 'sand',
    name: 'Mountain 6: deep bunker', text: 'In the deep bunker (1.4 m), now inside the fairway in front of the green. The Sand Wedge gets out.',
  },
  'mtn6-creek-putt': {
    hole: 'mtn-06', ball: { x: -8, z: -180 }, strokes: 1, seed: 1603, wind: { x: 0, z: 0 }, lie: 'green',
    name: 'Mountain 6: putt toward the creek', text: 'Near the left edge: the green tilts toward the creek, so this putt breaks hard left.',
  },
  'mtn7-shelf': {
    hole: 'mtn-07', ball: { x: 0, z: 0 }, aimAt: { x: 27, z: -250 }, strokes: 0, seed: 1701, wind: { x: 0, z: 0 }, lie: 'tee',
    name: 'Mountain 7: the upper shelf', text: 'Aimed at the narrow shelf right of the creek: a short carry over the water, a rock edge below it.',
  },
  'mtn7-left-approach': {
    hole: 'mtn-07', ball: { x: -20, z: -222 }, strokes: 1, seed: 1702, wind: { x: 0, z: 0 }, lie: 'fairway',
    name: 'Mountain 7: the long way in', text: 'From the wide left fairway: a long approach over the front-left bunker.',
  },
  'mtn7-up-a-tier': {
    hole: 'mtn-07', ball: { x: 12, z: -417 }, strokes: 2, seed: 1703, wind: { x: 0, z: 0 }, lie: 'green',
    name: 'Mountain 7: putt up a tier', text: 'From the lower front tier, up the step to the cup on the back tier.',
  },
  'mtn8-drive-green': {
    hole: 'mtn-08', ball: { x: 0, z: 0 }, aimAt: { x: 0, z: -300 }, strokes: 0, seed: 1801, wind: { x: 0, z: 0 }, lie: 'tee',
    name: 'Mountain 8: drive the green', text: 'Aimed at the green, 300 m and 15 m down. Pick the Driver: a full, straight one gets there. Pond left, deep bunkers right.',
  },
  'mtn8-deep-bunker': {
    hole: 'mtn-08', ball: { x: 19, z: -284 }, strokes: 1, seed: 1802, wind: { x: 0, z: 0 }, lie: 'sand',
    name: 'Mountain 8: deep bunker', text: 'In the deep bunker right of the green (1.4 m). The Sand Wedge gets out.',
  },
  'mtn8-ridge-putt': {
    hole: 'mtn-08', ball: { x: -4, z: -312 }, strokes: 2, seed: 1803, wind: { x: 0, z: 0 }, lie: 'green',
    name: 'Mountain 8: over the ridge', text: 'From the back of the green, down over the ridge to the cup: hard to read.',
  },
  'mtn9-big-drop': {
    hole: 'mtn-09', ball: { x: 0, z: 0 }, strokes: 0, seed: 1901, wind: { x: 0, z: 0 }, lie: 'tee',
    name: 'Mountain 9: the big drop', text: 'The finale\'s tee, 20 m above the fairway. A full Driver runs a long way down the slope.',
  },
  'mtn9-over-the-lake': {
    hole: 'mtn-09', ball: { x: -4.4, z: -334.6 }, strokes: 1, seed: 1902, wind: { x: 0, z: 0 }, lie: 'fairway',
    name: 'Mountain 9: over the lake in two', text: 'After a big drive, about 210 m: a 3 Wood over the lake to the raised green. Short is wet.',
  },
  'mtn9-layup': {
    hole: 'mtn-09', ball: { x: -2.5, z: -278 }, aimAt: { x: 40, z: -458 }, strokes: 1, seed: 1903, wind: { x: 0, z: 0 }, lie: 'fairway',
    name: 'Mountain 9: lay up round the lake', text: 'The safe second shot, up the left along the lake edge. Leaves about 95 m.',
  },
  // Buttercup Meadows (course designer, docs/COURSE_PLAN_MEADOW.md): the key shot, a recovery spot and a putt per hole.
  'mdw1-drive-right': {
    hole: 'mdw-01', ball: { x: 0, z: 0 }, aimAt: { x: 14, z: -240 }, strokes: 0, seed: 2101, wind: { x: 0, z: 0 }, lie: 'tee',
    name: 'Meadows 1: drive down the right', text: 'Aimed down the right side, near the tree line: the open angle into the green, away from its front-left bunker.',
  },
  'mdw1-bunker': {
    hole: 'mdw-01', ball: { x: -21, z: -236 }, strokes: 1, seed: 2102, lie: 'sand',
    name: 'Meadows 1: fairway bunker', text: 'The shallow bunker left of the landing zone, about 115 m out.',
  },
  'mdw1-putt': {
    hole: 'mdw-01', ball: { x: -8, z: -341 }, strokes: 2, seed: 2103, wind: { x: 0, z: 0 }, lie: 'green',
    name: 'Meadows 1: across the big green', text: 'A 15 m putt across the big green: it breaks a little toward the front left.',
  },
  'mdw2-cut-the-corner': {
    hole: 'mdw-02', ball: { x: 0, z: 0 }, aimAt: { x: -50, z: -248 }, strokes: 0, seed: 2201, wind: { x: 0, z: 0 }, lie: 'tee',
    name: 'Meadows 2: cut the corner', text: 'Aimed left, just past the group of round trees: a full Driver leaves a short wedge. Hook it and you meet the trees.',
  },
  'mdw2-outside-bunker': {
    hole: 'mdw-02', ball: { x: 22, z: -204 }, strokes: 1, seed: 2202, lie: 'sand',
    name: 'Meadows 2: outside the bend', text: 'In the shallow bunker on the outside of the bend, about 135 m from the green.',
  },
  'mdw2-downhill-putt': {
    hole: 'mdw-02', ball: { x: -95, z: -308 }, strokes: 2, seed: 2203, wind: { x: 0, z: 0 }, lie: 'green',
    name: 'Meadows 2: from the back', text: 'From the high back of the green, down the slope to the cup: hit it softly.',
  },
  'mdw3-at-the-flag': {
    hole: 'mdw-03', ball: { x: 0, z: 0 }, strokes: 0, seed: 2301, wind: { x: 0, z: 0 }, lie: 'tee',
    name: 'Meadows 3: the tee shot', text: 'A simple par 3 to a wide, slightly raised green. Short rolls back down the bank.',
  },
  'mdw3-bunker': {
    hole: 'mdw-03', ball: { x: -17, z: -131 }, strokes: 1, seed: 2302, wind: { x: 0, z: 0 }, lie: 'sand',
    name: 'Meadows 3: front-left bunker', text: 'In the bunker short left of the green, about 22 m from the flag.',
  },
  'mdw3-putt': {
    hole: 'mdw-03', ball: { x: -5, z: -158 }, strokes: 1, seed: 2303, wind: { x: 0, z: 0 }, lie: 'green',
    name: 'Meadows 3: birdie putt', text: 'A 12 m birdie putt from the back left, down the gentle back-to-front slope.',
  },
};

// Checked (Gate A T7) when one is first played: a bad spot fails there, naming the scenario and the
// field. X12: not all at load, since checking a spot builds its hole; tests/validate.test.js checks them all.
const checked = new Set();

// ?scenario= value → { scenario, unknown }. Ids are matched case-insensitively.
export function resolveScenario(id) {
  const key = (id ?? '').trim().toLowerCase();
  if (!key) return { scenario: null, unknown: false };
  if (!Object.hasOwn(SCENARIOS, key)) return { scenario: null, unknown: true };
  if (!checked.has(key)) { validateScenario(key, SCENARIOS[key], HOLES); checked.add(key); }
  return { scenario: { id: key, ...SCENARIOS[key] }, unknown: false };
}
