// Mountain 9, hole 7 (C7): par 4, about 430 m, a split fairway. Difficulty 3.
// Plan: the creek splits the fairway lengthwise and ends in a small pond between the two routes, short
// of the green. Left: a wide, lower fairway (the safe line) and a longer approach over a bunker to a
// cup on the back-left tier. Right: a narrow upper shelf above a rock lip (the brave line): a short
// carry over the creek off the tee, then a clear angle into the two-tier green.
import { makeMtnHole, mtnIntro, pine, boulder } from './mtn-course.js';

const TEE = { x: 0, z: 0 };
const CUP = { x: 4, z: -430 };

// the shelf right of the creek sits up to about 3 m above the lower fairway and runs downhill toward
// the green, so a drive on it rolls on
const shelf = (x, z) => 3.2 * (1 - 0.65 * Math.min(1, Math.max(0, (-z - 150) / 210))) * Math.min(1, Math.max(0, (x - 13) / 8)) ** 2 * (x > 13 ? 1 : 0)
  * Math.min(1, Math.max(0, (-z - 100) / 40)) * Math.min(1, Math.max(0, (z + 385) / 45));

export default makeMtnHole({
  id: 'mtn-07', number: 7, name: 'Mountain 9 · 7', par: 4, difficulty: 3,
  tee: TEE, cup: CUP,
  aimTarget: { x: -20, z: -222 },
  teePad: { h: 0.8, r: 4.5 },
  base: (x, z) => shelf(x, z) + 0.9 * Math.sin(x / 17) * Math.cos(z / 29) + 0.4 * Math.sin(z / 15),
  hills: [
    { x: -56, z: -165, r: 26, h: 3.0 },  // banks left of the lower fairway
    { x: -54, z: -330, r: 26, h: 2.8 },
    { x: 54, z: -220, r: 24, h: 2.6 },   // right of the shelf
    { x: 6, z: -466, r: 30, h: 3.6 },    // behind the green
  ],
  // two tiers: the back half about 0.6 m higher, and a tilt from right to left (L1)
  green: {
    cx: 8, cz: -425, rx: 15, rz: 12, raise: 0.6, bank: 1.0,
    contour: (x, z) => 0.6 * (0.5 + 0.5 * Math.tanh((-425 - z) / 1.8)) + 0.004 * (-425 - z) + 0.01 * (x - 8),
  },
  blend: 16,
  fairways: [
    // the wide lower fairway on the left: a blob that swells in the landing zone and runs into the green (L4, L9)
    { pts: [{ x: -2, z: -32, w: 13 }, { x: -18, z: -120, w: 22 }, { x: -26, z: -220, w: 26 }, { x: -24, z: -300, w: 21 }, { x: -10, z: -375, w: 19 }, { x: 2, z: -408, w: 17 }] },
    // the upper shelf on the right, a blob of its own, narrower than the left side (the brave line)
    { pts: [{ x: 32, z: -140, w: 11 }, { x: 34, z: -220, w: 15 }, { x: 31, z: -300, w: 13 }, { x: 22, z: -375, w: 13 }, { x: 13, z: -406, w: 14 }] },
  ],
  roughs: [{ cx: -40, cz: -205, rx: 8, rz: 14, rot: 0.2, wob: 0.15, seed: 4 }], // L6: rough biting into the left fairway
  bunkers: [
    { cx: -27, cz: -272, rx: 9, rz: 8, rot: 0.3, wob: 0.14, seed: 1, depth: 0.6, lobes: [{ cx: -18, cz: -280, rx: 5, rz: 5 }] }, // L5: long safe drives
    { cx: -9, cz: -410, rx: 6, rz: 4, rot: -0.3, wob: 0.12, seed: 3, depth: 1.0 },  // front left of the green
    { cx: 27, cz: -433, rx: 4, rz: 7, rot: 0.3, wob: 0.12, seed: 5, depth: 0.9 },   // right of the green
  ],
  // L8: a real creek between the fairways (8–10 m of water), widening smoothly into the lake
  // L8/L10: a real creek between the fairways (10–14 m of water), meandering, widening into the lake
  creek: { pts: [{ x: 66, z: 16, w: 2.8 }, { x: 38, z: -55, w: 3.6 }, { x: 10, z: -125, w: 5.0 }, { x: 6, z: -200, w: 6.0 }, { x: 6, z: -250, w: 8 }, { x: 6, z: -272, w: 12 }],
    depth: 1.5, bank: 2.5, lip: 'rock', lipW: 2.0, meander: { amp: 3, len: 70, wvar: 0.25, seed: 3 } },
  ponds: [{ cx: 6, cz: -308, rx: 15, rz: 34, rot: 0.08, wob: 0.1, seed: 2, depth: 2.4, lip: 'rock', lipW: 2.0, lobes: [{ cx: 12, cz: -330, rx: 12, rz: 16 }, { cx: 0, cz: -290, rx: 12, rz: 14 }] }],
  ob: { x0: -70, x1: 72, z0: -458, z1: 18 },
  forest: { gap: 7, rows: 3, spacing: 10, size: [1.1, 1.8], seed: 71, keep: 7 },
  obstacles: [boulder(46, -396, 1.3)],
  intro: mtnIntro({
    par: 4, prev: 'mtn-06', next: 'mtn-08',
    tagline: 'The creek splits the fairway: wide and low, or narrow and high.',
    steps: [
      'The creek splits the fairway in two and ends in a small pond short of the green.',
      '<b>Safe:</b> the wide fairway on the left. A longer approach, over a bunker.',
      '<b>Brave:</b> carry the creek to the narrow shelf on the right, above a rock edge, for a clear look at the green.',
      'Two-tier green: the back is higher.',
    ],
    blurb: 'Mountain 9, hole 7: a split fairway, low and wide or high and narrow.',
  }),
});
