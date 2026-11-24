// Buttercup Meadows, hole 2: par 4, about 340 m, curving LEFT around a group of round trees. Difficulty 1.
// Plan (docs/COURSE_PLAN_MEADOW.md): fairly flat with soft rolls. Safe: play out to the right, to the elbow,
// then a mid-iron in. Brave: cut close to (or over) the trees inside the bend, for a wedge. Two big bunkers
// on the outside of the bend catch a long safe drive. The green has one clear back-to-front slope.
// Props: a lighter tournament tee (tent + 2 flags), a rail fence along the right OB line.
import { makeMdwHole, mdwIntro, oak, TEE_DRESS } from './mdw-course.js';

const TEE = { x: 0, z: 0 };
const CORNER = { x: -2, z: -212 };
const CUP = { x: -96, z: -291 }; // in the middle of the bean's left lobe, by the left bunker

export default makeMdwHole({
  id: 'mdw-02', number: 2, name: 'Buttercup Meadows · 2', par: 4, difficulty: 1,
  tee: TEE, cup: CUP,
  aimTarget: { x: 1, z: -206 },
  playLine: [TEE, CORNER, CUP],
  teePad: { h: 0.5, r: 4.5 },
  // fairly flat: a very gentle rise toward the green (about 1.5 m) and soft rolls
  base: (x, z) => -0.004 * z + 0.55 * Math.sin(x / 21 + 1) * Math.cos(z / 35) + 0.3 * Math.sin(z / 24),
  hills: [
    { x: 38, z: -110, r: 26, h: 2.6 },   // a mound right of the first leg, beyond the rough
    { x: 30, z: -255, r: 28, h: 3.0 },   // a bank behind the elbow (stops through-drives)
    { x: -110, z: -335, r: 28, h: 3.0 },  // the bank behind the green
    { x: -4, z: -150, r: 22, h: -0.6 },  // a shallow dip in the landing area
    { x: -70, z: -150, r: 30, h: 1.6 },  // the trees' knoll, inside the bend
  ],
  // back-to-front along the line of the approach (the back left is high): putts from the back run toward the fairway
  // a wide bean across the line of the approach (owner: greens are often blobs)
  green: { cx: -86, cz: -300, rx: 17, rz: 12, rot: -0.75, wob: 0.07, seed: 5, blend: 0.5, lobes: [{ cx: -96, cz: -291, rx: 10, rz: 9 }, { cx: -76, cz: -309, rx: 10, rz: 9 }], raise: 0.4, contour: (x, z) => -0.015 * (x + 86) - 0.016 * (z + 300) },
  // one flowing fairway: the inside of the bend swells toward the green (the shortcut grows out of the fairway),
  // and the approach merges into the green's front
  blend: 18,
  fairways: [
    { pts: [{ x: 0, z: -26, w: 12 }, { x: 0, z: -120, w: 21 }, { x: -3, z: -212, w: 24 }, { x: -46, z: -256, w: 20 }, { x: -76, z: -287, w: 15 }] },
    { pts: [{ x: -18, z: -178, w: 8 }, { x: -42, z: -226, w: 13 }, { x: -68, z: -268, w: 14 }] },
  ],
  bunkers: [
    // the outside of the bend: the cost of the safe line (a harder next shot, no penalty)
    { cx: 22, cz: -204, rx: 8, rz: 14, rot: -0.2, wob: 0.12, seed: 3, depth: 1.1 },
    { cx: 7, cz: -244, rx: 12, rz: 8, rot: -0.5, wob: 0.14, seed: 4, depth: 1.1, blend: 0.5, lobes: [{ cx: -1, cz: -251, rx: 7, rz: 6 }] },
    { cx: -64, cz: -312, rx: 6, rz: 10, rot: 0.7, wob: 0.1, seed: 5, depth: 1.5 },   // right of the green
    { cx: -104, cz: -305, rx: 8, rz: 6, rot: -0.5, wob: 0.12, seed: 6, depth: 1.5 }, // left of the green
  ],
  ob: { x0: -132, x1: 56, z0: -345, z1: 18 },
  forest: { gap: 8, rows: 2, spacing: 12, size: [1.0, 1.5], seed: 102, keep: 6, clear: [{ pts: [{ x: 0, z: 0 }, { x: -60, z: -254 }], w: 8 }] },
  obstacles: [
    // the group of round trees inside the bend, on rough (the brave drive plays just right of them, or over)
    oak(-34, -96, 1.0), oak(-44, -88, 0.95), oak(-52, -102, 1.05), oak(-40, -114, 1.0),
    oak(-58, -120, 0.95), oak(-46, -130, 1.0), oak(-62, -140, 1.05),
    oak(-35, -140, 0.9), oak(-40, -152, 1.0), oak(-52, -156, 0.95), oak(-28, -78, 0.9),
  ],
  scenery: {
    eventProps: [TEE_DRESS.tent, TEE_DRESS.flagR, TEE_DRESS.flagL],
    // the edge of the course on the outside of the bend, then away over the bank
    fences: [{ id: 'railFence', points: [[59, 14], [59, -250], [78, -285]] }],
  },
  intro: mdwIntro({
    par: 4, prev: 'mdw-01', next: 'mdw-03',
    tagline: 'A gentle bend to the left, around a group of trees.',
    steps: [
      'The fairway curves left around a group of round trees.',
      '<b>Safe:</b> drive out to the right, to the elbow, then a mid-iron in.',
      '<b>Brave:</b> cut close to the trees for a short wedge. Two bunkers wait on the outside of the bend.',
      'The green slopes from back to front.',
    ],
    blurb: 'Buttercup Meadows, hole 2: a par 4 curving left around a group of trees.',
  }),
});
