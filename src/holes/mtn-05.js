// Mountain 9, hole 5 (C5): par 4, about 390 m, dogleg left with a corner to cut (playtest 1: was a
// dogleg right; L7 asks for some lefts). Difficulty 2.
// Plan (GENRE_NOTES screenshot 1): the creek widens into a pond inside the corner, with bunkers on
// the outside of the landing zone. Two kinds of risk on one corner: carrying the pond (the brave line)
// leaves a wedge from a fairway pocket beyond it, a miss is wet; going round (the safe line) leaves a
// mid-iron, a miss finds sand. Two-tier green, the cup on the lower front tier.
import { makeMtnHole, mtnIntro, pine } from './mtn-course.js';

const TEE = { x: 0, z: 0 };
const CORNER = { x: 0, z: -240 };
const CUP = { x: -96, z: -352 };

export default makeMtnHole({
  id: 'mtn-05', number: 5, name: 'Mountain 9 · 5', par: 4, difficulty: 2,
  tee: TEE, cup: CUP,
  aimTarget: { x: 2, z: -228 },
  playLine: [TEE, CORNER, CUP],
  teePad: { h: 0.8, r: 4.5 },
  base: (x, z) => 0.9 * Math.sin(x / 21 + 0.5) * Math.cos(z / 31) + 0.5 * Math.sin(z / 17) - 0.004 * z,
  hills: [
    { x: 46, z: -130, r: 26, h: 3.0 },   // right of the first leg
    { x: 36, z: -282, r: 28, h: 3.4 },   // a bank beyond the corner
    { x: -130, z: -290, r: 28, h: 2.8 }, // left of the green
    { x: -80, z: -390, r: 26, h: 3.2 },  // behind the green
    { x: -74, z: -86, r: 24, h: 2.2 },
  ],
  // two tiers: the back (far) half is about 0.6 m higher, along the line the approach comes in, plus a tilt to the right
  green: {
    cx: -100, cz: -355, rx: 15, rz: 13, raise: 0.5, bank: 1.0,
    contour: (x, z) => { const t = (-(x + 100) - (z + 355)) / Math.SQRT2; return 0.6 * (0.5 + 0.5 * Math.tanh(t / 1.8)) + 0.006 * t - 0.012 * (x + 100); },
  },
  blend: 18,
  fairways: [
    // one flowing dogleg left (L4, L7), merging into the green (L9)
    { pts: [{ x: 0, z: -26, w: 12 }, { x: 0, z: -130, w: 19 }, { x: -2, z: -244, w: 23 }, { x: -46, z: -290, w: 19 }, { x: -84, z: -334, w: 15 }] },
    // the shortcut: a fairway island beyond the pond (owner: OK sometimes)
    { pts: [{ x: -38, z: -208, w: 11 }, { x: -54, z: -236, w: 12 }], blend: 0 },
  ],
  bunkers: [
    // L5: on the outside of the corner, where the safe drive finishes
    { cx: 24, cz: -236, rx: 7, rz: 11, rot: 0.2, wob: 0.14, seed: 2, depth: 0.6, lobes: [{ cx: 18, cz: -252, rx: 5, rz: 5 }] },
    { cx: 8, cz: -272, rx: 9, rz: 5, rot: -0.2, wob: 0.12, seed: 4, depth: 0.6 },
    { cx: -114, cz: -338, rx: 4, rz: 7, rot: -0.5, wob: 0.12, seed: 6, depth: 1.0 },  // left of the green
    { cx: -84, cz: -366, rx: 6, rz: 4, rot: 0.4, wob: 0.12, depth: 0.9 },             // short right
  ],
  // the creek comes down from the left and widens smoothly into the pond inside the corner (L8)
  creek: { pts: [{ x: -120, z: -10, w: 2.6 }, { x: -90, z: -72, w: 3.0 }, { x: -62, z: -126, w: 4.0 }, { x: -48, z: -140, w: 6.5 }], depth: 1.4, bank: 3, lip: 'rough' },
  ponds: [{ cx: -40, cz: -168, rx: 17, rz: 24, rot: -0.25, wob: 0.1, seed: 3, depth: 2.4, lip: 'rough', lipW: 2.5, lobes: [{ cx: -30, cz: -182, rx: 11, rz: 12 }] }],
  ob: { x0: -140, x1: 62, z0: -390, z1: 18 },
  forest: { gap: 8, rows: 2, spacing: 12, size: [1.1, 1.7], seed: 51, keep: 7, clear: [{ pts: [{ x: 0, z: 0 }, { x: -54, z: -238 }], w: 9 }] },
  obstacles: [],
  intro: mtnIntro({
    par: 4, prev: 'mtn-04', next: 'mtn-06',
    tagline: 'Dogleg left around a pond. Go round it, or carry it.',
    steps: [
      'The creek widens into a pond inside the corner.',
      '<b>Safe:</b> drive to the corner, past the bunkers on the outside, then a mid-iron in.',
      '<b>Brave:</b> carry the pond to the island of fairway beyond it for a short pitch.',
      'The green has two levels: the back is higher.',
    ],
    blurb: 'Mountain 9, hole 5: a dogleg left with a pond to carry, or go round.',
  }),
});
