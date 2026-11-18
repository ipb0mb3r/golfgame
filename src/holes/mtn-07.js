// Mountain 9, hole 7 (C7): par 4, about 390 m, a split fairway. Difficulty 3.
// Plan: the creek splits the fairway lengthwise and ends in a small pond between the two routes, short
// of the green. Left: a wide, lower fairway (the safe line) and a longer approach over a bunker to a
// cup on the back-left tier. Right: a narrow upper shelf above a rock lip (the brave line): a short
// carry over the creek off the tee, then a clear angle into the two-tier green.
import { makeMtnHole, mtnIntro, pine, boulder } from './mtn-course.js';

const TEE = { x: 0, z: 0 };
const CUP = { x: 4, z: -393 };

// the shelf right of the creek sits up to about 3 m above the lower fairway and runs downhill toward
// the green, so a drive on it rolls on
const shelf = (x, z) => 3.2 * (1 - 0.65 * Math.min(1, Math.max(0, (-z - 140) / 190))) * Math.min(1, Math.max(0, (x - 6) / 8)) ** 2 * (x > 6 ? 1 : 0)
  * Math.min(1, Math.max(0, (-z - 95) / 35)) * Math.min(1, Math.max(0, (z + 345) / 40));

export default makeMtnHole({
  id: 'mtn-07', number: 7, name: 'Mountain 9 · 7', par: 4, difficulty: 3,
  tee: TEE, cup: CUP,
  aimTarget: { x: -18, z: -206 },
  teePad: { h: 0.8, r: 4.5 },
  base: (x, z) => shelf(x, z) + 0.5 * Math.sin(x / 17) * Math.cos(z / 31),
  hills: [
    { x: -50, z: -150, r: 24, h: 2.6 },  // banks left of the lower fairway
    { x: -48, z: -300, r: 24, h: 2.4 },
    { x: 48, z: -200, r: 22, h: 2.2 },   // right of the shelf
    { x: 6, z: -425, r: 28, h: 3.2 },    // behind the green
  ],
  // two tiers: the back half about 0.5 m higher; a gentle slope toward the front
  green: {
    cx: 8, cz: -388, rx: 15, rz: 12, raise: 0.6, bank: 1.0,
    contour: (x, z) => 0.5 * (0.5 + 0.5 * Math.tanh((-388 - z) / 1.8)) + 0.004 * (-388 - z),
  },
  fairways: [
    // the wide lower fairway on the left
    { pts: [{ x: 0, z: -30, w: 11 }, { x: -14, z: -110, w: 17 }, { x: -20, z: -250, w: 18 }, { x: -6, z: -345, w: 12 }, { x: 2, z: -368, w: 10 }] },
    // the narrow upper shelf on the right
    { pts: [{ x: 22, z: -128, w: 6 }, { x: 23, z: -250, w: 8 }, { x: 18, z: -350, w: 8 }, { x: 12, z: -368, w: 9 }] },
  ],
  bunkers: [
    { cx: -24, cz: -246, rx: 9, rz: 9, depth: 0.6 },   // in the left landing zone: a long drive on the safe side finds sand
    { cx: -8, cz: -372, rx: 6, rz: 4, depth: 1.0 },    // front left of the green: the left route's approach carries it
    { cx: 26, cz: -396, rx: 4, rz: 6, depth: 0.9 },    // right of the green
  ],
  // the creek splits the fairway and ends in the pond short of the green
  creek: { pts: [{ x: 62, z: 14, w: 2.0 }, { x: 34, z: -50, w: 2.2 }, { x: 8, z: -115, w: 2.4 }, { x: 6, z: -200, w: 2.4 }, { x: 5, z: -262, w: 2.4 }], depth: 1.2, bank: 2.5, lip: 'rock', lipW: 2.0 },
  ponds: [{ cx: 4, cz: -282, rx: 6, rz: 14, depth: 2.0, lip: 'rock', lipW: 2.0 }],
  ob: { x0: -62, x1: 60, z0: -420, z1: 18 },
  obstacles: [
    pine(-44, -60, 1.0), pine(-46, -200, 1.1), pine(-44, -330, 0.95),
    pine(44, -110, 1.0), pine(44, -300, 1.05),
    boulder(34, -360, 1.3),
  ],
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
