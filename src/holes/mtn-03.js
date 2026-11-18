// Mountain 9, hole 3 (C3): par 3, 150 m, downhill from a high tee. Difficulty 2.
// Plan: the first real look at the creek. From the high tee the whole hole is in view below (no
// blind shot). The creek bends around the front left of a green that tilts toward it. The safe shot
// plays to the right half; the cup is tucked left, near the bend (the brave shot).
import { makeMtnHole, mtnIntro, pine, boulder } from './mtn-course.js';

const TEE = { x: 0, z: 0 };
const CUP = { x: -2, z: -165 };

export default makeMtnHole({
  id: 'mtn-03', number: 3, name: 'Mountain 9 · 3', par: 3, difficulty: 2,
  tee: TEE, cup: CUP,
  teePad: { h: 0.5, r: 4.5 },
  // the tee sits about 13 m above the green; the slope below it is rough, then the approach fairway
  base: (x, z) => -13 * Math.min(1, Math.max(0, (-z - 10) / 125)) ** 1.2 + 0.6 * Math.sin(x / 13) + 0.4 * Math.cos(z / 17),
  hills: [
    { x: 36, z: -134, r: 22, h: 2.8 },  // bank right of the green: misses right stay up and come back
    { x: 10, z: -200, r: 26, h: 3.4 },  // the bank behind the green (a backdrop)
    { x: -46, z: -66, r: 24, h: 2.4 },
  ],
  // L1: tilts clearly toward the creek (front left low): aim right of the cup and let it feed
  green: { cx: 5, cz: -166, rx: 15, rz: 12, raise: 0.2, bank: 0.7, contour: (x, z) => 0.022 * (x - 5) - 0.016 * (z + 166) },
  // L9: the approach fairway widens into the front of the green
  fairways: [{ pts: [{ x: 6, z: -104, w: 9 }, { x: 6, z: -136, w: 13 }, { x: 5, z: -152, w: 15 }] }],
  bunkers: [{ cx: 22, cz: -176, rx: 4, rz: 7, rot: 0.3, wob: 0.12, seed: 4, depth: 0.8, lobes: [{ cx: 19, cz: -184, rx: 4, rz: 3 }] }],
  // the creek comes in from the left, bends round the front left of the green and leaves behind it (L8: a real hazard, 5–6 m wide)
  creek: { pts: [{ x: -72, z: -104, w: 2.6 }, { x: -36, z: -128, w: 2.9 }, { x: -24, z: -152, w: 3.0 }, { x: -25, z: -178, w: 3.0 }, { x: -66, z: -206, w: 3.0 }], depth: 1.4, bank: 3, lip: 'rough' },
  ob: { x0: -62, x1: 58, z0: -206, z1: 14 },
  forest: { gap: 10, rows: 3, spacing: 11, size: [1.2, 1.8], seed: 31, keep: 7 },
  obstacles: [boulder(-36, -112, 1.3)],
  intro: mtnIntro({
    par: 3, prev: 'mtn-02', next: 'mtn-04',
    tagline: 'Downhill to a green beside the creek.',
    steps: [
      'The green sits about 13 m below the tee, so the ball flies further: take less club.',
      'The creek bends around the front left. The green tilts toward it.',
      '<b>Safe:</b> the right half of the green. <b>Brave:</b> at the flag, near the water.',
    ],
    blurb: 'Mountain 9, hole 3: a downhill par 3 with the creek guarding the left.',
  }),
});
