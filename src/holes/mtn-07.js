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
const shelf = (x, z) => 3.2 * (1 - 0.65 * Math.min(1, Math.max(0, (-z - 150) / 210))) * Math.min(1, Math.max(0, (x - 8) / 8)) ** 2 * (x > 8 ? 1 : 0)
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
    // the wide lower fairway on the left, merging into the green (L4, L9)
    { pts: [{ x: 0, z: -32, w: 12 }, { x: -18, z: -120, w: 19 }, { x: -24, z: -270, w: 20 }, { x: -10, z: -375, w: 15 }, { x: 2, z: -408, w: 14 }] },
    // the upper shelf on the right: narrower but a real fairway, not a strip (playtest 1)
    { pts: [{ x: 26, z: -140, w: 10 }, { x: 27, z: -270, w: 11 }, { x: 21, z: -380, w: 10 }, { x: 13, z: -406, w: 12 }] },
  ],
  roughs: [{ cx: -40, cz: -205, rx: 8, rz: 14, rot: 0.2, wob: 0.15, seed: 4 }], // L6: rough biting into the left fairway
  bunkers: [
    { cx: -27, cz: -272, rx: 9, rz: 8, rot: 0.3, wob: 0.14, seed: 1, depth: 0.6, lobes: [{ cx: -18, cz: -280, rx: 5, rz: 5 }] }, // L5: long safe drives
    { cx: -9, cz: -410, rx: 6, rz: 4, rot: -0.3, wob: 0.12, seed: 3, depth: 1.0 },  // front left of the green
    { cx: 27, cz: -433, rx: 4, rz: 7, rot: 0.3, wob: 0.12, seed: 5, depth: 0.9 },   // right of the green
  ],
  // L8: a real creek between the fairways (8–10 m of water), widening smoothly into the lake
  creek: { pts: [{ x: 64, z: 16, w: 2.6 }, { x: 36, z: -55, w: 3.2 }, { x: 9, z: -125, w: 4.0 }, { x: 7, z: -220, w: 4.6 }, { x: 6, z: -280, w: 6.5 }], depth: 1.4, bank: 2.5, lip: 'rock', lipW: 2.0 },
  ponds: [{ cx: 5, cz: -312, rx: 11, rz: 28, wob: 0.08, seed: 2, depth: 2.2, lip: 'rock', lipW: 2.0 }],
  ob: { x0: -66, x1: 64, z0: -458, z1: 18 },
  forest: { gap: 8, rows: 2, spacing: 12, size: [1.1, 1.7], seed: 71, keep: 7 },
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
