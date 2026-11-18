// Mountain 9, hole 6 (C6): par 3, about 175 m, uphill to a raised green. Difficulty 3.
// Plan (GENRE_NOTES screenshot 3): the creek runs left of and behind the green (the bad side). A grassy
// bank on the right feeds balls down onto the green: the safe play. One deep bunker is cut into the
// front of that bank, facing the tee so its sand stays in view (PM condition on #49). The brave
// shot flies straight at a cup on the left, near the water.
import { makeMtnHole, mtnIntro, pine, boulder } from './mtn-course.js';

const TEE = { x: 0, z: 0 };
const CUP = { x: -4, z: -175 };

export default makeMtnHole({
  id: 'mtn-06', number: 6, name: 'Mountain 9 · 6', par: 3, difficulty: 3,
  tee: TEE, cup: CUP,
  teePad: { h: 0.4, r: 4.5 },
  // the green sits about 4 m above the tee (5 m was a 3 Wood at this length)
  base: (x, z) => 3.5 * Math.min(1, Math.max(0, (-z - 30) / 130)) + 0.6 * Math.sin(x / 15) + 0.4 * Math.cos(z / 19),
  hills: [
    { x: 23, z: -172, r: 10, h: 2.8 },  // the feeder bank right of the green
    { x: 6, z: -214, r: 22, h: 3.2 },   // behind the creek: a backdrop
    { x: 38, z: -100, r: 24, h: 2.4 },
    { x: -42, z: -80, r: 24, h: 2.0 },
  ],
  // raised, clearly tilted from right to left (toward the creek, L1)
  green: { cx: 0, cz: -175, rx: 14, rz: 11, raise: 1.0, bank: 0.9, contour: (x, z) => 0.016 * x + 0.006 * (z + 175) },
  // playtest 1 (owner): one fairway, not two. The approach and the feeder bank are a single blob
  // in front of and right of the green, with the deep bunker sitting IN it (L4, L5, L9)
  blend: 14,
  fairways: [
    { pts: [{ x: 2, z: -122, w: 10 }, { x: 4, z: -150, w: 14 }, { x: 4, z: -162, w: 14 }] },
    { pts: [{ x: 14, z: -150, w: 7 }, { x: 22, z: -172, w: 7 }] },
  ],
  bunkers: [{ cx: 12, cz: -158, rx: 4, rz: 4.5, rot: 0.4, wob: 0.14, seed: 2, depth: 1.4, lobes: [{ cx: 15, cz: -153, rx: 3, rz: 3 }] }],
  // the creek runs down the left of the green and close round the back of it: long is wet (owner liked it)
  creek: { pts: [{ x: -68, z: -120, w: 2.8 }, { x: -28, z: -154, w: 3.2 }, { x: -19, z: -182, w: 3.4 }, { x: 4, z: -193, w: 3.4 }, { x: 60, z: -201, w: 3.4 }], depth: 1.4, bank: 3, lip: 'rock', lipW: 1.6, meander: { amp: 0, wvar: 0.15 } }, // kept tight behind the green (long is wet)
  ob: { x0: -58, x1: 58, z0: -214, z1: 14 },
  forest: { gap: 9, rows: 3, spacing: 11, size: [1.2, 1.8], seed: 61, keep: 7 },
  obstacles: [boulder(-30, -194, 1.4), boulder(-34, -172, 1.1)],
  intro: mtnIntro({
    par: 3, prev: 'mtn-05', next: 'mtn-07',
    tagline: 'Uphill to a raised green, with the creek left and behind.',
    steps: [
      'The green sits about 4 m above the tee: take a little more club.',
      '<b>Safe:</b> aim at the grassy bank on the right. It feeds the ball down onto the green.',
      '<b>Brave:</b> straight at the flag, with the creek waiting left and long.',
      'Watch the deep bunker in front of the bank.',
    ],
    blurb: 'Mountain 9, hole 6: an uphill par 3 with a bank that helps and a creek that doesn\'t.',
  }),
});
