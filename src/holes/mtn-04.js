// Mountain 9, hole 4 (C4): par 5, 450 m, a gentle dogleg left. Difficulty 2.
// Plan: the creek crosses in front of the green, about 35 m short of the cup. Most players lay up
// short of it and pitch over (the lay-up zone leaves a wedge, about 40–70 m, PM condition on #49).
// A good drive opens the chance to carry the creek with the second shot and reach in two. Between the
// creek and the green the apron rises gently, so a slightly short pitch stays dry. The second leg runs
// a little downhill, which helps the brave second shot.
import { makeMtnHole, mtnIntro, pine } from './mtn-course.js';

const TEE = { x: 0, z: 0 };
const CORNER = { x: 0, z: -252 };
const CUP = { x: -42, z: -472 };

export default makeMtnHole({
  id: 'mtn-04', number: 4, name: 'Mountain 9 · 4', par: 5, difficulty: 2,
  tee: TEE, cup: CUP,
  aimTarget: { x: 1, z: -240 },
  playLine: [TEE, CORNER, CUP],
  teePad: { h: 0.6, r: 4.5 },
  // rolling first leg, then the second leg falls about 4.5 m toward the creek; the green sits up again
  base: (x, z) => -4.5 * Math.min(1, Math.max(0, (-z - 250) / 180)) + 0.9 * Math.sin(x / 17) * Math.cos(z / 29) + 0.5 * Math.sin(z / 19),
  hills: [
    { x: 42, z: -165, r: 28, h: 3.4 },   // banks right of the first leg
    { x: 36, z: -285, r: 24, h: 3.0 },   // stops drives running through the corner
    { x: -50, z: -150, r: 26, h: 2.6 },
    { x: -80, z: -365, r: 28, h: 3.2 },  // left of the second leg
    { x: -50, z: -506, r: 28, h: 3.6 },  // behind the green (a backdrop)
  ],
  // the slope just before the green bounces a ball up onto it (owner liked it); the green tilts left
  green: { cx: -44, cz: -470, rx: 15, rz: 13, raise: 1.0, bank: 1.1, contour: (x, z) => 0.014 * (x + 44) - 0.008 * (z + 470) },
  blend: 16,
  fairways: [
    { pts: [{ x: 0, z: -26, w: 12 }, { x: 0, z: -130, w: 21 }, { x: 0, z: -250, w: 23 }, { x: -20, z: -360, w: 20 }, { x: -31, z: -410, w: 18 }] },
    // the apron between the creek and the green, merging into the green (L9)
    { pts: [{ x: -40, z: -440, w: 13 }, { x: -43, z: -456, w: 15 }] },
  ],
  // L6: a patch of rough biting into the left of the second leg
  roughs: [{ cx: -38, cz: -372, rx: 9, rz: 16, rot: -0.2, wob: 0.15, seed: 2 }],
  bunkers: [
    // L5: where the default drive finishes, on the right
    { cx: 17, cz: -266, rx: 7, rz: 10, rot: -0.3, wob: 0.14, seed: 1, depth: 0.5, lobes: [{ cx: 11, cz: -276, rx: 5, rz: 4 }] },
    { cx: -61, cz: -478, rx: 4, rz: 8, rot: 0.3, wob: 0.12, seed: 3, depth: 0.9 },  // left of the green
    { cx: -24, cz: -484, rx: 6, rz: 4, rot: -0.3, wob: 0.1, depth: 0.8 },           // back right
  ],
  // L8: the creek is a real obstacle in front of the green: 8–10 m of water, wider where it turns
  creek: {
    pts: [{ x: 64, z: 10, w: 2.4 }, { x: 56, z: -220, w: 2.8 }, { x: 46, z: -360, w: 3.4 }, { x: 10, z: -418, w: 4.2 }, { x: -40, z: -430, w: 4.8 }, { x: -100, z: -418, w: 4.4 }],
    depth: 1.5, bank: 3.5, lip: 'rough', lipW: 2.6,
  },
  ob: { x0: -104, x1: 74, z0: -508, z1: 18 },
  forest: { gap: 9, rows: 2, spacing: 12, size: [1.1, 1.7], seed: 41, keep: 7 },
  obstacles: [],
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
