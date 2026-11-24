// Buttercup Meadows, hole 3: par 3, about 150 m, simple. Difficulty 1.
// Plan (docs/COURSE_PLAN_MEADOW.md): a wide, slightly raised green, one bunker front left and one at the right,
// no water. Safe: the middle of the green. Brave: at the pin, near a bunker. A short miss rolls back down the bank.
// Props: a bench and two flags at the tee, two flags beside the green (the last tournament dressing of the nine).
import { makeMdwHole, mdwIntro, TEE_DRESS } from './mdw-course.js';

const TEE = { x: 0, z: 0 };
const CUP = { x: 5, z: -151 };

export default makeMdwHole({
  id: 'mdw-03', number: 3, name: 'Buttercup Meadows · 3', par: 3, difficulty: 1,
  tee: TEE, cup: CUP,
  teePad: { h: 0.6, r: 4.5 },
  // soft rolls, the land falling a touch (about 1 m) to the dip short of the green
  base: (x, z) => 0.5 * Math.sin(x / 17 + 0.3) * Math.cos(z / 27) + 0.3 * Math.sin(z / 19 + x / 45) - 0.9 * Math.exp(-(((z + 105) / 30) ** 2)),
  hills: [
    { x: 40, z: -120, r: 24, h: 2.4 },   // banks either side of the green: a landscape around the target
    { x: -42, z: -160, r: 26, h: 2.6 },
    { x: 6, z: -196, r: 28, h: 2.8 },    // the bank behind the green (a backdrop)
    { x: -40, z: -60, r: 22, h: 1.8 },
  ],
  // wide, slightly raised (a short ball rolls back down the bank), one gentle tilt back to front
  green: { cx: 3, cz: -150, rx: 16, rz: 12, raise: 0.8, bank: 1.0, contour: (x, z) => 0.004 * (x - 3) - 0.011 * (z + 150) },
  // the approach fairway widens into the front of the green
  fairways: [{ pts: [{ x: 2, z: -92, w: 9 }, { x: 3, z: -122, w: 14 }, { x: 3, z: -136, w: 16 }] }],
  bunkers: [
    { cx: -12, cz: -136, rx: 5, rz: 6, rot: 0.5, wob: 0.12, seed: 7, depth: 0.8, lobes: [{ cx: -16, cz: -142, rx: 4, rz: 4 }] }, // front left
    { cx: 22, cz: -153, rx: 4, rz: 7, rot: -0.2, wob: 0.1, seed: 8, depth: 0.8 },                                           // right
  ],
  ob: { x0: -58, x1: 58, z0: -200, z1: 14 },
  forest: { gap: 10, rows: 2, spacing: 12, size: [1.0, 1.5], seed: 103, keep: 7 },
  obstacles: [],
  scenery: {
    eventProps: [
      TEE_DRESS.bench, TEE_DRESS.flagR, TEE_DRESS.flagL,
      // two flags beside the green (never in front of it)
      { id: 'featherFlag', x: -25, z: -156, turn: 1.2 },
      { id: 'featherFlag', x: 31, z: -148, turn: -1.2 },
    ],
  },
  intro: mdwIntro({
    par: 3, prev: 'mdw-02', // next: 'mdw-04' once it exists
    tagline: 'A simple par 3 to a wide, slightly raised green.',
    steps: [
      'A wide green, a little above the fairway: come up short and the ball rolls back down.',
      'One bunker guards the front left, one the right.',
      '<b>Safe:</b> the middle of the green. <b>Brave:</b> at the flag.',
    ],
    blurb: 'Buttercup Meadows, hole 3: a simple par 3.',
  }),
});
