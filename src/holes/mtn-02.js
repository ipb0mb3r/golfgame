// Mountain 9, hole 2 (C2): par 4, 300 m, dogleg right, gently uphill. Difficulty 1.
// Plan: no creek on this hole (a pure warm-up). A stand of pines on a patch of rough fills the inside
// of the corner. The safe drive plays to the elbow and leaves a short iron; the brave drive carries
// the pines toward the green. Clipping the leaves costs distance, not a stroke: the ball drops into
// rough under them (PM condition on #49). Green: one clear back-to-front slope.
import { makeMtnHole, mtnIntro, pine } from './mtn-course.js';

const TEE = { x: 0, z: 0 };
const CORNER = { x: 2, z: -215 };
const CUP = { x: 96, z: -287 };

export default makeMtnHole({
  id: 'mtn-02', number: 2, name: 'Mountain 9 · 2', par: 4, difficulty: 1,
  tee: TEE, cup: CUP,
  aimTarget: { x: -2, z: -208 },
  playLine: [TEE, CORNER, CUP],
  teePad: { h: 0.6, r: 4.5 },
  // gently uphill toward the green (about 3.5 m), rolling across (L1)
  base: (x, z) => -0.011 * z + 0.9 * Math.sin(x / 19 + 1) * Math.cos(z / 33) + 0.4 * Math.sin(z / 21),
  hills: [
    { x: -38, z: -120, r: 24, h: 3.0 },  // mound left of the first leg
    { x: -32, z: -250, r: 28, h: 3.6 },  // a bank behind the corner (stops through-drives)
    { x: 70, z: -330, r: 28, h: 3.4 },   // the hill behind the green
    { x: 4, z: -150, r: 20, h: -0.8 },   // a dip in the landing area
  ],
  // back-to-front and right-to-left: putts from the back run toward the fairway and break left
  green: { cx: 94, cz: -285, rx: 15, rz: 13, raise: 0.4, contour: (x, z) => 0.022 * (x - 94) - 0.01 * (z + 285) },
  // L4: one flowing fairway. The inside of the corner swells toward the green (the shortcut morphs
  // out of the fairway instead of sticking out), and the approach merges into the green (L9).
  blend: 18,
  fairways: [
    { pts: [{ x: 0, z: -26, w: 12 }, { x: 0, z: -120, w: 20 }, { x: 3, z: -212, w: 24 }, { x: 46, z: -252, w: 20 }, { x: 80, z: -278, w: 15 }] },
    { pts: [{ x: 12, z: -168, w: 12 }, { x: 40, z: -222, w: 16 }, { x: 70, z: -262, w: 15 }] },
  ],
  bunkers: [
    // L5: where a long safe drive finishes, through the corner
    { cx: -12, cz: -244, rx: 9, rz: 6, rot: 0.3, wob: 0.14, seed: 3, depth: 0.5, lobes: [{ cx: -2, cz: -250, rx: 5, rz: 4 }] },
    { cx: 111, cz: -294, rx: 4, rz: 8, rot: -0.4, wob: 0.1, depth: 0.9 },  // back right of the green
    { cx: 80, cz: -296, rx: 6, rz: 4, rot: 0.5, wob: 0.12, seed: 5, depth: 0.8 }, // short left of the green
  ],
  ob: { x0: -56, x1: 132, z0: -322, z1: 18 },
  // L2: lines of trees along the fairway; the stand inside the corner guards the shortcut
  forest: { gap: 8, rows: 2, spacing: 12, size: [1.1, 1.7], seed: 21, keep: 6, clear: [{ pts: [{ x: 0, z: 0 }, { x: 62, z: -252 }], w: 8 }] },
  obstacles: [
    // the stand of pines inside the corner, on rough (a full drive on the brave line must clear them)
    pine(24, -90, 0.95), pine(33, -98, 1.0), pine(42, -92, 0.9), pine(50, -100, 1.0),
    pine(28, -112, 1.0), pine(37, -118, 0.95), pine(47, -110, 0.9), pine(56, -118, 1.0),
    pine(33, -134, 0.9), pine(44, -136, 0.85), pine(54, -140, 1.0),
  ],
  intro: mtnIntro({
    par: 4, prev: 'mtn-01', next: 'mtn-03',
    tagline: 'A short dogleg right. Play to the corner, or carry the pines.',
    steps: [
      'The fairway turns right around a stand of pines.',
      '<b>Safe:</b> drive to the corner, then a short iron in.',
      '<b>Brave:</b> aim right, over the pines, for a short pitch. Clip the leaves and the ball drops in the rough under them.',
      'The green slopes from back to front.',
    ],
    blurb: 'Mountain 9, hole 2: a short dogleg right around a stand of pines.',
  }),
});
