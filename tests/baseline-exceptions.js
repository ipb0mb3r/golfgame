// Shared by tests/baseline.test.js and tools/baseline.mjs check. Not a test file itself.
// Intentional physics changes (AGENTS.md rule 9): v1 is frozen, so a shot that moves on purpose gets
// its own exception here, with the task, the reason and the expected NEW resting spot. It is then
// checked against that spot with the same tolerance; strokes and holed-or-not must still match the
// old page. Never a wider tolerance for every shot. Key = shot number (#), checked against its name.
export const EXCEPTIONS = {
  // S17 (Fix pass 2): faster greens, hole 1 green decel 1.1 → 0.7, hole 2 0.8 → 0.6 (designer:
  // approaches should run out on the green). Every shot below ends rolling on a green, so it rolls
  // further. Putts keep their distance on flat ground (putt power is calibrated to the green), but
  // break more on a slope.
  1:  { name: 'h1 full then chip and putts', task: 'S17', end: { x: 4.19, z: -159.04 }, why: 'tee shot runs 1.3 m further across the faster green' },
  5:  { name: 'h1 three-quarter tee shot', task: 'S17', end: { x: 3.94, z: -149.65 }, why: 'the chip runs 1.3 m further on the faster green' },
  6:  { name: 'h1 hook', task: 'S17', end: { x: -10.42, z: -151.76 }, why: 'the hook lands on the green and runs 1.4 m further (the old page spread 2.4 m on this shot across frame rates)' },
  14: { name: 'h2 approach from the lay-up zone', task: 'S17 + P10', end: { x: 24.51, z: -437.16 }, why: 'the approach runs 1.7 m further up the faster two-tier green (P10: 0.3 m, it settles instead of creeping)' },
  18: { name: 'h2 side-hill putt (breaks)', task: 'S17', end: { x: 26.89, z: -445.68 }, why: 'the same putt breaks 1 m more on the faster green, then settles (P10)' },
};
