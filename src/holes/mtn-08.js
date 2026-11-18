// Mountain 9, hole 8 (C8): par 4, about 300 m, short and downhill: a big hitter can drive the green.
// Difficulty 3. Plan: from a high tee the hole falls in two steps: a flat plateau (the safe iron
// lands here, leaving a wedge down to the green), then a run-out slope to the green. The brave drive
// threads between a small pond on the green's left and deep bunkers on its right. The green has a
// ridge across its back third that's hard to read; the cup sits on the gentle front part.
import { makeMtnHole, mtnIntro, pine, boulder } from './mtn-course.js';

const TEE = { x: 0, z: 0 };
const CUP = { x: 2, z: -298 };

// two steps down: tee → plateau (about 6 m lower), plateau → green (about 9 m lower: playtest 1, a bigger slope)
const ramp = (z, a, b) => Math.min(1, Math.max(0, (-z - a) / (b - a)));
const fall = z => -6 * ramp(z, 30, 145) ** 1.3 - 9 * ramp(z, 210, 282);

export default makeMtnHole({
  id: 'mtn-08', number: 8, name: 'Mountain 9 · 8', par: 4, difficulty: 3,
  tee: TEE, cup: CUP,
  aimTarget: { x: 0, z: -180 },
  teePad: { h: 0.6, r: 4.5 },
  base: (x, z) => fall(z) + 0.6 * Math.sin(x / 13 + 1) + 0.3 * Math.cos(z / 11),
  hills: [
    { x: -46, z: -130, r: 26, h: 3.4 },
    { x: 48, z: -165, r: 26, h: 3.4 },
    { x: 4, z: -340, r: 28, h: 4.0 },   // behind the green: a backdrop
  ],
  // a ridge across the back third: putts over it break hard; the front is gentle but tilts right to left
  green: {
    cx: 0, cz: -302, rx: 14, rz: 13, raise: 0.3, bank: 0.9,
    contour: (x, z) => 0.5 * (0.5 + 0.5 * Math.tanh((-307 - z - 0.25 * x) / 1.4)) + 0.012 * x,
  },
  blend: 16,
  fairways: [
    // the tee strip, the plateau and the run-out slope as one flowing blob into the green (L4, L9)
    { pts: [{ x: 0, z: -28, w: 11 }, { x: 0, z: -120, w: 17 }, { x: 0, z: -215, w: 23 }, { x: 2, z: -270, w: 15 }, { x: 2, z: -288, w: 13 }] },
  ],
  bunkers: [
    { cx: 19, cz: -284, rx: 4, rz: 6, rot: 0.3, wob: 0.14, seed: 2, depth: 1.4 },   // deep, right of the green's front
    { cx: 19, cz: -308, rx: 4, rz: 6, rot: -0.2, wob: 0.12, seed: 4, depth: 1.3 },  // deep, right of the green
    { cx: -16, cz: -196, rx: 6, rz: 8, rot: 0.3, wob: 0.14, seed: 6, depth: 0.5, lobes: [{ cx: -10, cz: -206, rx: 4, rz: 4 }] }, // L5: on the plateau's left
  ],
  // the creek feeds the pond, down the left side from the hills, widening into it (L8)
  ponds: [{ cx: -21, cz: -284, rx: 7, rz: 12, rot: 0.15, wob: 0.12, seed: 5, depth: 2.0, lip: 'rough', lipW: 2.2, lobes: [{ cx: -26, cz: -272, rx: 7, rz: 7 }] }],
  creek: { pts: [{ x: -68, z: -165, w: 2.4 }, { x: -46, z: -230, w: 3.4 }, { x: -36, z: -254, w: 5.5 }, { x: -29, z: -268, w: 8 }], depth: 1.3, bank: 2.5, lip: 'rough', meander: { amp: 3, len: 60, wvar: 0.25, seed: 5 } },
  ob: { x0: -58, x1: 58, z0: -334, z1: 18 },
  forest: { gap: 8, rows: 2, spacing: 11, size: [1.1, 1.7], seed: 81, keep: 7, clear: [{ pts: [{ x: 0, z: 0 }, { x: 0, z: -300 }], w: 14 }] },
  obstacles: [boulder(-36, -120, 1.2)],
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
