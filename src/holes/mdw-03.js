// Buttercup Meadows, hole 3: par 3, about 150 m, simple. Difficulty 1.
// Plan (docs/COURSE_PLAN_MEADOW.md): a wide, slightly raised green, one bunker front left and one at the right,
// no water. Safe: the middle of the green. Brave: at the pin, near a bunker. A short miss rolls back down the bank.
// Props: a bench and two flags at the tee, two flags beside the green (the last tournament dressing of the nine).
import { makeMdwHole, mdwIntro, oak, TEE_DRESS } from './mdw-course.js';

const TEE = { x: 0, z: 0 };
const CUP = { x: 13, z: -145 }; // in the middle of the right lobe, by the right bunker (the brave pin)

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
  green: { cx: 3, cz: -150, rx: 16, rz: 11, rot: 0.1, wob: 0.07, seed: 7, blend: 0.5, lobes: [{ cx: -8, cz: -156, rx: 10, rz: 9 }, { cx: 13, cz: -145, rx: 9, rz: 9 }], raise: 0.8, bank: 1.0, contour: (x, z) => 0.004 * (x - 3) - 0.011 * (z + 150) },
  // the approach fairway widens into the front of the green
  fairways: [{ pts: [{ x: 2, z: -92, w: 9 }, { x: 3, z: -122, w: 14 }, { x: 3, z: -136, w: 16 }] }],
  bunkers: [
    { cx: -17, cz: -131, rx: 7, rz: 8, rot: 0.5, wob: 0.12, seed: 7, depth: 1.5, blend: 0.5, lobes: [{ cx: -21, cz: -138, rx: 5, rz: 6 }] }, // front left
    { cx: 30, cz: -143, rx: 6, rz: 9, rot: -0.3, wob: 0.1, seed: 8, depth: 1.5 },                                           // right
  ],
  ob: { x0: -58, x1: 58, z0: -200, z1: 14 },
  forest: { gap: 10, rows: 2, spacing: 12, size: [1.0, 1.5], seed: 103, keep: 7 },
  // round trees framing both sides of the hole, well off the line (on rough)
  obstacles: [
    oak(-34, -30, 1.0), oak(-42, -58, 1.1), oak(-36, -88, 0.95), oak(-46, -112, 1.05),
    oak(36, -36, 1.05), oak(44, -66, 0.95), oak(38, -94, 1.1),
  ],
  scenery: {
    eventProps: [
      TEE_DRESS.bench, TEE_DRESS.flagR, TEE_DRESS.flagL,
      // two flags beside the green (never in front of it)
      { id: 'featherFlag', x: -30, z: -160, turn: 1.2 },
      { id: 'featherFlag', x: 40, z: -146, turn: -1.2 },
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
