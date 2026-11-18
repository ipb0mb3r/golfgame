// Mountain 9, hole 2 (C2): par 4, 300 m, dogleg right, gently uphill. Difficulty 1.
// Plan: no creek on this hole (a pure warm-up). A stand of pines on a patch of rough fills the inside
// of the corner. The safe drive plays to the elbow and leaves a short iron; the brave drive carries
// the pines toward the green. Clipping the leaves costs distance, not a stroke: the ball drops into
// rough under them (PM condition on #49). Green: one clear back-to-front slope.
import { makeMtnHole, mtnIntro, pine } from './mtn-course.js';

const TEE = { x: 0, z: 0 };
const CORNER = { x: 0, z: -200 };
const CUP = { x: 86, z: -258 };

export default makeMtnHole({
  id: 'mtn-02', number: 2, name: 'Mountain 9 · 2', par: 4, difficulty: 1,
  tee: TEE, cup: CUP,
  aimTarget: { x: -3, z: -196 },
  playLine: [TEE, CORNER, CUP],
  teePad: { h: 0.6, r: 4.5 },
  // gently uphill toward the green (about 3.5 m), rolling across
  base: (x, z) => -0.011 * z + 0.5 * Math.sin(x / 19 + 1) * Math.cos(z / 37),
  hills: [
    { x: -36, z: -120, r: 22, h: 2.6 },  // mound left of the first leg
    { x: -30, z: -240, r: 26, h: 3.2 },  // a bank behind the corner (stops through-drives)
    { x: 60, z: -300, r: 26, h: 3.0 },   // the hill behind the green
    { x: 4, z: -150, r: 18, h: -0.5 },   // a soft dip in the landing area
  ],
  // back-to-front: the far (right) side is higher, putts from the back run toward the fairway
  green: { cx: 84, cz: -257, rx: 14, rz: 12, raise: 0.4, contour: (x) => 0.02 * (x - 84) },
  fairways: [
    { pts: [{ x: 0, z: -24, w: 12 }, { x: 0, z: -110, w: 19 }, { x: 0, z: -212, w: 21 }] },
    { pts: [{ x: 0, z: -212, w: 18 }, { x: 40, z: -238, w: 15 }, { x: 70, z: -252, w: 11 }] },
    // the brave line's landing pocket beyond the pines (the reward: a short pitch from the fairway)
    { pts: [{ x: 48, z: -180, w: 8 }, { x: 68, z: -208, w: 11 }, { x: 72, z: -236, w: 9 }] },
  ],
  bunkers: [
    { cx: -14, cz: -232, rx: 8, rz: 6, depth: 0.5 },   // through the corner: the cost of a long safe drive
    { cx: 101, cz: -266, rx: 4, rz: 8, depth: 0.9 },   // back right of the green
    { cx: 78, cz: -244, rx: 6, rz: 3.5, depth: 0.8 },  // front of the green, short side
  ],
  ob: { x0: -55, x1: 122, z0: -292, z1: 18 },
  obstacles: [
    // the stand of pines inside the corner, on rough (carried by a good drive on the brave line)
    pine(26, -92, 0.85), pine(34, -100, 0.9), pine(42, -94, 0.8),
    pine(29, -112, 0.9), pine(38, -118, 0.85), pine(47, -108, 0.8),
    pine(33, -132, 0.85), pine(44, -134, 0.8),
    // a few pines framing the left of the first leg
    pine(-32, -70, 1.0), pine(-36, -160, 1.1),
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
