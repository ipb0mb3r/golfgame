// Designer test spots (X8): ?scenario=<id> starts the ball at a named spot with a fixed seed, so a
// situation can be replayed on a phone without a keyboard. Data only; the engine reads `hole`,
// `ball`, `strokes`, `seed` and the optional `wind` (m/s, overrides the seeded wind).
// `lie` is what the ball should sit on; tests/scenarios.test.js checks it, so a hole edit that
// moves a bunker can't silently break a scenario.
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
};

// ?scenario= value → { scenario, unknown }. Ids are matched case-insensitively.
export function resolveScenario(id) {
  const key = (id ?? '').trim().toLowerCase();
  if (!key) return { scenario: null, unknown: false };
  return Object.hasOwn(SCENARIOS, key) ? { scenario: { id: key, ...SCENARIOS[key] }, unknown: false } : { scenario: null, unknown: true };
}
