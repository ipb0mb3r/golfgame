// Mountain 9, hole 3 (C3): par 3, 150 m, downhill from a high tee. Difficulty 2.
// Plan: the first real look at the creek. From the high tee the whole hole is in view below (no
// blind shot). The creek bends around the front left of a green that tilts toward it. The safe shot
// plays to the right half; the cup is tucked left, near the bend (the brave shot).
import { makeMtnHole, mtnIntro, pine, boulder } from './mtn-course.js';

const TEE = { x: 0, z: 0 };
const CUP = { x: -3, z: -149 };

export default makeMtnHole({
  id: 'mtn-03', number: 3, name: 'Mountain 9 · 3', par: 3, difficulty: 2,
  tee: TEE, cup: CUP,
  teePad: { h: 0.5, r: 4.5 },
  // the tee sits about 12 m above the green; the slope below it is rough, then a short fairway
  base: (x, z) => -12 * Math.min(1, Math.max(0, (-z - 10) / 110)) ** 1.2 + 0.4 * Math.sin(x / 13),
  hills: [
    { x: 34, z: -120, r: 22, h: 2.4 },  // bank right of the green: misses right stay up and come back
    { x: 10, z: -182, r: 24, h: 3.0 },  // the bank behind the green (a backdrop)
    { x: -44, z: -60, r: 24, h: 2.0 },
  ],
  // tilts toward the creek: front left is low
  green: { cx: 4, cz: -150, rx: 15, rz: 12, raise: 0.2, bank: 0.7, contour: (x, z) => 0.013 * (x - 4) - 0.011 * (z + 150) },
  fairways: [{ pts: [{ x: 6, z: -96, w: 9 }, { x: 6, z: -128, w: 12 }] }],
  bunkers: [{ cx: 21, cz: -160, rx: 4, rz: 7, depth: 0.7 }],
  // the creek comes in from the left, bends round the front left of the green and leaves behind it
  creek: { pts: [{ x: -70, z: -96, w: 2.4 }, { x: -34, z: -118, w: 2.6 }, { x: -22, z: -138, w: 2.6 }, { x: -24, z: -162, w: 2.6 }, { x: -64, z: -190, w: 2.6 }], depth: 1.3, bank: 3, lip: 'rough' },
  ob: { x0: -60, x1: 56, z0: -190, z1: 14 },
  obstacles: [
    pine(-40, -150, 1.05), pine(-46, -132, 0.95), pine(38, -60, 1), pine(42, -150, 1.1),
    boulder(-34, -100, 1.3),
  ],
  intro: mtnIntro({
    par: 3, prev: 'mtn-02', next: 'mtn-04',
    tagline: 'Downhill to a green beside the creek.',
    steps: [
      'The green sits about 12 m below the tee, so the ball flies further: take less club.',
      'The creek bends around the front left. The green tilts toward it.',
      '<b>Safe:</b> the right half of the green. <b>Brave:</b> at the flag, near the water.',
    ],
    blurb: 'Mountain 9, hole 3: a downhill par 3 with the creek guarding the left.',
  }),
});
