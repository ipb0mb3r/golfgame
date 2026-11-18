// Mountain 9, hole 5 (C5): par 4, 360 m, dogleg right with a corner to cut. Difficulty 2.
// Plan (GENRE_NOTES screenshot 1): the creek widens into a pond inside the corner, with bunkers on
// the outside of the landing zone. Two kinds of risk on one corner: carrying the pond (the brave line)
// leaves a wedge from a fairway pocket beyond it, a miss is wet; going round (the safe line) leaves a
// mid-iron, a miss finds sand. Two-tier green, the cup on the lower front tier.
import { makeMtnHole, mtnIntro, pine } from './mtn-course.js';

const TEE = { x: 0, z: 0 };
const CORNER = { x: 0, z: -222 };
const CUP = { x: 88, z: -318 };

export default makeMtnHole({
  id: 'mtn-05', number: 5, name: 'Mountain 9 · 5', par: 4, difficulty: 2,
  tee: TEE, cup: CUP,
  aimTarget: { x: -2, z: -212 },
  playLine: [TEE, CORNER, CUP],
  teePad: { h: 0.8, r: 4.5 },
  base: (x, z) => 0.6 * Math.sin(x / 21 + 0.5) * Math.cos(z / 33) - 0.004 * z,
  hills: [
    { x: -44, z: -120, r: 24, h: 2.6 },  // left of the first leg
    { x: -34, z: -262, r: 26, h: 3.0 },  // a bank beyond the corner
    { x: 120, z: -260, r: 26, h: 2.4 },  // right of the green
    { x: 70, z: -350, r: 24, h: 2.6 },   // behind the green
    { x: 70, z: -80, r: 22, h: 1.8 },
  ],
  // two tiers: the back (far) half is about 0.5 m higher, along the line the approach comes in
  green: {
    cx: 92, cz: -322, rx: 15, rz: 13, raise: 0.5, bank: 1.0,
    contour: (x, z) => { const t = ((x - 92) - (z + 322)) / Math.SQRT2; return 0.5 * (0.5 + 0.5 * Math.tanh(t / 1.8)) + 0.004 * t; },
  },
  fairways: [
    { pts: [{ x: 0, z: -24, w: 12 }, { x: 0, z: -120, w: 18 }, { x: 0, z: -232, w: 21 }] },
    { pts: [{ x: 0, z: -232, w: 18 }, { x: 48, z: -268, w: 16 }, { x: 80, z: -304, w: 11 }] },
    // the fairway pocket beyond the pond: where the brave drive lands
    { pts: [{ x: 44, z: -206, w: 9 }, { x: 60, z: -240, w: 11 }] },
  ],
  bunkers: [
    { cx: -22, cz: -212, rx: 6, rz: 10, depth: 0.6 },   // outside of the corner, left
    { cx: -10, cz: -250, rx: 9, rz: 5, depth: 0.6 },    // through the corner
    { cx: 104, cz: -306, rx: 4, rz: 6, depth: 1.0 },    // right of the green
  ],
  // the creek comes down from the right and widens into the pond inside the corner
  creek: { pts: [{ x: 112, z: -10, w: 2.0 }, { x: 84, z: -70, w: 2.2 }, { x: 56, z: -132, w: 2.4 }, { x: 44, z: -152, w: 2.6 }], depth: 1.3, bank: 3, lip: 'rough' },
  ponds: [{ cx: 38, cz: -170, rx: 15, rz: 24, depth: 2.2, lip: 'rough', lipW: 2.5 }],
  ob: { x0: -58, x1: 132, z0: -356, z1: 18 },
  obstacles: [
    pine(-34, -80, 1.0), pine(-38, -160, 1.05), pine(60, -110, 1.0), pine(70, -170, 0.95),
    pine(118, -330, 1.05),
  ],
  intro: mtnIntro({
    par: 4, prev: 'mtn-04', next: 'mtn-06',
    tagline: 'Dogleg right around a pond. Go round it, or carry it.',
    steps: [
      'The creek widens into a pond inside the corner.',
      '<b>Safe:</b> drive to the corner, past the bunkers on the outside, then a mid-iron in.',
      '<b>Brave:</b> carry the pond to the fairway beyond it for a short pitch.',
      'The green has two levels: the back is higher.',
    ],
    blurb: 'Mountain 9, hole 5: a dogleg right with a pond to carry, or go round.',
  }),
});
