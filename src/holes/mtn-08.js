// Mountain 9, hole 8 (C8): par 4, about 280 m, short and downhill: a big hitter can drive the green.
// Difficulty 3. Plan: from a high tee the hole falls in two steps: a flat plateau (the safe iron
// lands here, leaving a wedge down to the green), then a run-out slope to the green. The brave drive
// threads between a small pond on the green's left and deep bunkers on its right. The green has a
// ridge across its back third that's hard to read; the cup sits on the gentle front part.
import { makeMtnHole, mtnIntro, pine, boulder } from './mtn-course.js';

const TEE = { x: 0, z: 0 };
const CUP = { x: 2, z: -272 };

// two steps down: tee → plateau (about 6 m lower), plateau → green (about 6 m lower again)
const ramp = (z, a, b) => Math.min(1, Math.max(0, (-z - a) / (b - a)));
const fall = z => -6 * ramp(z, 30, 135) ** 1.3 - 6.5 * ramp(z, 190, 255);

export default makeMtnHole({
  id: 'mtn-08', number: 8, name: 'Mountain 9 · 8', par: 4, difficulty: 3,
  tee: TEE, cup: CUP,
  aimTarget: { x: 0, z: -165 },
  teePad: { h: 0.6, r: 4.5 },
  base: (x, z) => fall(z) + 0.4 * Math.sin(x / 13 + 1),
  hills: [
    { x: -44, z: -120, r: 24, h: 3.0 },
    { x: 46, z: -150, r: 24, h: 3.0 },
    { x: 4, z: -312, r: 26, h: 3.5 },   // behind the green: a backdrop
  ],
  // a ridge across the back third: putts over it break hard; the front is gentle
  green: {
    cx: 0, cz: -276, rx: 14, rz: 13, raise: 0.3, bank: 0.9,
    contour: (x, z) => 0.45 * (0.5 + 0.5 * Math.tanh((-281 - z - 0.25 * x) / 1.4)) + 0.006 * x,
  },
  fairways: [
    { pts: [{ x: 0, z: -26, w: 11 }, { x: 0, z: -110, w: 16 }] },
    { pts: [{ x: 0, z: -110, w: 16 }, { x: 0, z: -195, w: 22 }] },              // the plateau
    { pts: [{ x: 0, z: -195, w: 16 }, { x: 2, z: -252, w: 11 }, { x: 2, z: -262, w: 10 }] }, // the run-out to the green
  ],
  bunkers: [
    { cx: 19, cz: -258, rx: 4, rz: 6, depth: 1.4 },   // deep, right of the green's front
    { cx: 19, cz: -282, rx: 4, rz: 6, depth: 1.3 },   // deep, right of the green
  ],
  ponds: [{ cx: -21, cz: -258, rx: 7, rz: 12, depth: 2.0, lip: 'rough', lipW: 2.2 }],
  // the creek feeds the pond, down the left side from the hills
  creek: { pts: [{ x: -66, z: -150, w: 2.0 }, { x: -44, z: -210, w: 2.2 }, { x: -28, z: -246, w: 2.4 }], depth: 1.2, bank: 2.5, lip: 'rough' },
  ob: { x0: -56, x1: 56, z0: -306, z1: 18 },
  obstacles: [
    pine(-36, -60, 1.0), pine(38, -70, 1.05), pine(-40, -180, 1.0), pine(40, -210, 1.1), pine(36, -290, 1.0),
    boulder(-34, -110, 1.2),
  ],
  intro: mtnIntro({
    par: 4, prev: 'mtn-07', next: 'mtn-09',
    tagline: 'Short and downhill. Drive the green, or iron to the plateau.',
    steps: [
      'The hole drops in two steps: a flat plateau, then down to the green.',
      '<b>Safe:</b> an iron to the plateau, then a wedge down.',
      '<b>Brave:</b> the Driver at the green, between the pond on the left and deep bunkers on the right.',
      'A ridge crosses the back of the green: putts over it break hard.',
    ],
    blurb: 'Mountain 9, hole 8: a short, downhill par 4 you can drive.',
  }),
});
