// Buttercup Meadows, hole 3: par 3, about 150 m, simple. Difficulty 1.
// Map study (docs/course/MAP_STUDY.md): a small tee clearing opens into a round clearing around the green (owner's
// maps 14 and 16). A blob of fairway in front of a wide, slightly raised bean green set at an angle. The feature
// bunker wraps the right side, beside the cup's lobe (the brave pin); a smaller one guards the front left. Safe: the
// middle of the green. A short ball rolls back down the bank. Deep rough is the layer at the clearing's edge (L20).
// Props: a bench and two flags at the tee, two flags beside the green (the last tournament dressing of the nine).
import { makeMdwHole, mdwIntro, TEE_DRESS } from './mdw-course.js';

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
  // the clearing: a small tee clearing that opens into a round clearing around the green; deep rough at its edge
  land: { pts: [[-13, 18], [13, 18], [17, -20], [22, -58], [36, -96], [48, -128], [50, -160], [38, -190], [12, -203], [-16, -201], [-40, -188], [-50, -160], [-46, -122], [-30, -84], [-20, -45], [-16, -12]], deepBand: { w: 7, wob: 0.75, seed: 9 } },
  // a blob of fairway in front of the green, flowing into its front
  fairwayShapes: [{ pts: [[-6, -84], [8, -86], [18, -104], [22, -126], [14, -142], [-6, -144], [-18, -130], [-14, -104]] }],
  bunkers: [
    { cx: -17, cz: -131, rx: 7, rz: 8, rot: 0.5, wob: 0.12, seed: 7, depth: 1.5, blend: 0.5, lobes: [{ cx: -21, cz: -138, rx: 5, rz: 6 }] }, // front left
    { cx: 30, cz: -146, rx: 7, rz: 12, rot: -0.2, wob: 0.1, seed: 8, depth: 1.5, blend: 0.5, lobes: [{ cx: 24, cz: -163, rx: 7, rz: 6 }] }, // the feature bunker, wrapping the right
  ],
  ob: { x0: -56, x1: 56, z0: -208, z1: 22 },
  forest: { size: [1.0, 1.6], seed: 103, keep: 5, edgeGap: [5, 14], inset: [3, 8], clump: 3, back: false },
  obstacles: [],
  scenery: {
    eventProps: [
      TEE_DRESS.bench, TEE_DRESS.flagR, TEE_DRESS.flagL,
      // two flags beside the green (never in front of it)
      { id: 'featherFlag', x: -30, z: -160, turn: 1.2 },
      { id: 'featherFlag', x: 44, z: -150, turn: -1.2 },
    ],
  },
  intro: mdwIntro({
    par: 3, prev: 'mdw-02', next: 'mdw-04',
    tagline: 'A simple par 3 to a wide, slightly raised green.',
    steps: [
      'A wide green, a little above the fairway: come up short and the ball rolls back down.',
      'A big bunker wraps the right side, beside the flag. A smaller one guards the front left.',
      '<b>Safe:</b> the middle of the green. <b>Brave:</b> at the flag.',
    ],
    blurb: 'Buttercup Meadows, hole 3: a simple par 3.',
  }),
});
