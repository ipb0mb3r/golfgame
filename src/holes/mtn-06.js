// Mountain 9, hole 6 (C6): par 3, about 160 m, uphill to a raised green. Difficulty 3.
// Plan (GENRE_NOTES screenshot 3): the creek runs left of and behind the green (the bad side). A grassy
// bank on the right feeds balls down onto the green: the safe play. One deep bunker is cut into the
// front of that bank, facing the tee so its sand stays in view (PM condition on #49). The brave
// shot flies straight at a cup on the left, near the water.
import { makeMtnHole, mtnIntro, pine, boulder } from './mtn-course.js';

const TEE = { x: 0, z: 0 };
const CUP = { x: -4, z: -160 };

export default makeMtnHole({
  id: 'mtn-06', number: 6, name: 'Mountain 9 · 6', par: 3, difficulty: 3,
  tee: TEE, cup: CUP,
  teePad: { h: 0.4, r: 4.5 },
  // the green sits about 6 m above the tee
  base: (x, z) => 5.5 * Math.min(1, Math.max(0, (-z - 30) / 120)) + 0.4 * Math.sin(x / 15),
  hills: [
    { x: 23, z: -158, r: 9, h: 2.6 },   // the feeder bank right of the green (short grass: it rolls)
    { x: 6, z: -204, r: 24, h: 3.0 },   // behind the creek: a backdrop
    { x: 36, z: -90, r: 24, h: 2.0 },
    { x: -40, z: -70, r: 24, h: 1.6 },
  ],
  // raised, gently tilted from right to left (toward the creek)
  green: { cx: 0, cz: -160, rx: 14, rz: 12, raise: 1.0, bank: 0.9, contour: (x, z) => 0.01 * x + 0.004 * (z + 160) },
  fairways: [
    { pts: [{ x: 2, z: -112, w: 10 }, { x: 2, z: -140, w: 12 }] },
    { pts: [{ x: 21, z: -150, w: 6 }, { x: 22, z: -168, w: 6 }] }, // the feeder bank, mown short
  ],
  bunkers: [{ cx: 12, cz: -145, rx: 4, rz: 4.5, depth: 1.4 }], // deep, cut into the front of the right bank
  // the creek runs down the left of the green and round the back of it
  creek: { pts: [{ x: -66, z: -110, w: 2.4 }, { x: -28, z: -140, w: 2.6 }, { x: -22, z: -174, w: 2.6 }, { x: 4, z: -190, w: 2.6 }, { x: 60, z: -196, w: 2.6 }], depth: 1.4, bank: 3, lip: 'rock', lipW: 2.0 },
  ob: { x0: -58, x1: 58, z0: -204, z1: 14 },
  obstacles: [
    pine(-40, -120, 1.05), pine(-44, -100, 0.95), pine(40, -140, 1.0), pine(44, -176, 1.1),
    boulder(-30, -186, 1.4), boulder(-34, -162, 1.1),
  ],
  intro: mtnIntro({
    par: 3, prev: 'mtn-05', next: 'mtn-07',
    tagline: 'Uphill to a raised green, with the creek left and behind.',
    steps: [
      'The green sits about 6 m above the tee: take a little more club.',
      '<b>Safe:</b> aim at the grassy bank on the right. It feeds the ball down onto the green.',
      '<b>Brave:</b> straight at the flag, with the creek waiting left and long.',
      'Watch the deep bunker in front of the bank.',
    ],
    blurb: 'Mountain 9, hole 6: an uphill par 3 with a bank that helps and a creek that doesn\'t.',
  }),
});
