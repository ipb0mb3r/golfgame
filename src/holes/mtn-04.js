// Mountain 9, hole 4 (C4): par 5, 450 m, a gentle dogleg left. Difficulty 2.
// Plan: the creek crosses in front of the green, about 35 m short of the cup. Most players lay up
// short of it and pitch over (the lay-up zone leaves a wedge, about 40–70 m, PM condition on #49).
// A good drive opens the chance to carry the creek with the second shot and reach in two. Between the
// creek and the green the apron rises gently, so a slightly short pitch stays dry. The second leg runs
// a little downhill, which helps the brave second shot.
import { makeMtnHole, mtnIntro, pine } from './mtn-course.js';

const TEE = { x: 0, z: 0 };
const CORNER = { x: 0, z: -228 };
const CUP = { x: -38, z: -449 };

export default makeMtnHole({
  id: 'mtn-04', number: 4, name: 'Mountain 9 · 4', par: 5, difficulty: 2,
  tee: TEE, cup: CUP,
  aimTarget: { x: 1, z: -222 },
  playLine: [TEE, CORNER, CUP],
  teePad: { h: 0.6, r: 4.5 },
  // rolling first leg, then the second leg falls about 4 m toward the creek; the green sits up again
  base: (x, z) => -4 * Math.min(1, Math.max(0, (-z - 230) / 180)) + 0.5 * Math.sin(x / 17) * Math.cos(z / 29),
  hills: [
    { x: 40, z: -150, r: 26, h: 3.0 },   // banks right of the first leg
    { x: 34, z: -260, r: 22, h: 2.6 },   // stops drives running through the corner
    { x: -48, z: -140, r: 24, h: 2.2 },
    { x: -74, z: -330, r: 26, h: 2.8 },  // left of the second leg
    { x: -46, z: -478, r: 26, h: 3.2 },  // behind the green (a backdrop)
  ],
  green: { cx: -40, cz: -447, rx: 15, rz: 13, raise: 0.9, bank: 1.1, contour: (x, z) => 0.005 * (x + 40) },
  fairways: [
    { pts: [{ x: 0, z: -24, w: 12 }, { x: 0, z: -120, w: 20 }, { x: 0, z: -236, w: 22 }] },
    // the second leg to the lay-up zone (ends before the creek's lip)
    { pts: [{ x: 0, z: -236, w: 20 }, { x: -18, z: -330, w: 18 }, { x: -28, z: -392, w: 17 }] },
    // the apron between the creek and the green
    { pts: [{ x: -38, z: -418, w: 12 }, { x: -40, z: -432, w: 13 }] },
  ],
  bunkers: [
    { cx: 18, cz: -250, rx: 6, rz: 9, depth: 0.5 },     // through the corner on the right
    { cx: -58, cz: -455, rx: 4, rz: 7, depth: 0.9 },    // left of the green
    { cx: -22, cz: -460, rx: 5, rz: 4, depth: 0.8 },    // back right
  ],
  // the creek: down the right of the first leg, then across the fairway in front of the green
  creek: {
    pts: [{ x: 62, z: 10, w: 2.2 }, { x: 54, z: -200, w: 2.4 }, { x: 44, z: -330, w: 2.6 }, { x: 10, z: -398, w: 2.8 }, { x: -38, z: -410, w: 2.8 }, { x: -96, z: -398, w: 2.6 }],
    depth: 1.3, bank: 3, lip: 'rough', lipW: 2.4,
  },
  ob: { x0: -100, x1: 72, z0: -482, z1: 18 },
  obstacles: [
    // pines inside the dogleg, on rough
    pine(-34, -236, 1.0), pine(-42, -252, 1.1), pine(-50, -270, 0.95),
    pine(-36, -100, 1.0), pine(30, -70, 1.05),
  ],
  intro: mtnIntro({
    par: 5, prev: 'mtn-03', next: 'mtn-05',
    tagline: 'Lay up short of the creek, or carry it and reach in two.',
    steps: [
      'A gentle dogleg left. The creek crosses in front of the green.',
      '<b>Safe:</b> lay up short of the creek, about 50 m out, then a wedge over it.',
      '<b>Brave:</b> after a good drive, carry the creek with your second shot and reach the green in two.',
    ],
    blurb: 'Mountain 9, hole 4: a par 5 with the creek in front of the green. Lay up or go?',
  }),
});
