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
};

// Checked when they load (Gate A T7): a bad spot fails here, naming the scenario and the field.
for (const [id, sc] of Object.entries(SCENARIOS)) validateScenario(id, sc, HOLES);

// ?scenario= value → { scenario, unknown }. Ids are matched case-insensitively.
export function resolveScenario(id) {
  const key = (id ?? '').trim().toLowerCase();
  if (!key) return { scenario: null, unknown: false };
  return Object.hasOwn(SCENARIOS, key) ? { scenario: { id: key, ...SCENARIOS[key] }, unknown: false } : { scenario: null, unknown: true };
}
