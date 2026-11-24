// Buttercup Meadows, hole 6: par 3, about 175 m, downhill. Difficulty 2.
// Plan (docs/COURSE_PLAN_MEADOW.md): from a raised tee across a dip to a green with water short and right. The safe
// miss is wide left (a bank that feeds back toward the green, and a bunker); the cup sits in the lobe nearest the
// water (the brave pin). Props: two windmills on the hill behind the green, the course's postcard view.
import { ss } from '../core/terrain.js';
import { makeMdwHole, mdwIntro } from './mdw-course.js';

const TEE = { x: 0, z: 0 };
const CUP = { x: 12, z: -174 }; // in the middle of the front-right lobe, nearest the water

export default makeMdwHole({
  id: 'mdw-06', number: 6, name: 'Buttercup Meadows · 6', par: 3, difficulty: 2,
  tee: TEE, cup: CUP,
  teePad: { h: 1.0, r: 4.5 },
  // the tee about 8 m above the green; a dip in front of it; soft rolls
  base: (x, z) => -8 * ss(10, 115, -z) - 1.6 * Math.exp(-(((z + 118) / 18) ** 2)) + 0.5 * Math.sin(x / 16 + 0.7) * Math.cos(z / 25),
  hills: [
    { x: -40, z: -178, r: 20, h: 2.6 },  // the bank left of the green: the safe miss, it feeds back toward the green
    { x: 40, z: -205, r: 24, h: 2.4 },
    { x: 0, z: -290, r: 42, h: 6 },     // the windmills' hill, beyond OB behind the green
  ],
  // a big blob green; the cup's lobe tilts gently toward the water (front right)
  green: { cx: 2, cz: -182, rx: 17, rz: 12, rot: -0.35, wob: 0.07, seed: 31, blend: 0.5, lobes: [{ cx: 12, cz: -174, rx: 9, rz: 9 }, { cx: -8, cz: -188, rx: 10, rz: 9 }], raise: 0.4,
    contour: (x, z) => -0.012 * (x - 2) - 0.008 * (z + 182) },
  // the approach fairway beyond the dip widens into the front of the green
  fairways: [{ pts: [{ x: -4, z: -112, w: 10 }, { x: -4, z: -145, w: 12 }, { x: -2, z: -166, w: 14 }] }],
  bunkers: [
    // the safe side: a bowl left of the green, hugging the fringe
    { cx: -25, cz: -179, rx: 6, rz: 10, rot: 0.2, wob: 0.1, seed: 32, depth: 1.5 },
    // a small one at the back right
    { cx: 23, cz: -197, rx: 8, rz: 5, rot: -0.4, wob: 0.1, seed: 33, depth: 1.4 },
  ],
  // the water short and right of the green (only on the brave side)
  ponds: [{ cx: 28, cz: -150, rx: 12, rz: 10, rot: -0.3, wob: 0.1, seed: 34, depth: 2.0, lip: 'rough', lipW: 2.5, blend: 0.5, lobes: [{ cx: 36, cz: -162, rx: 8, rz: 7 }] }],
  ob: { x0: -60, x1: 62, z0: -236, z1: 14 },
  forest: { gap: 10, rows: 2, spacing: 12, size: [1.0, 1.5], seed: 106, keep: 7 },
  obstacles: [],
  scenery: {
    // the postcard: two windmills on the hill behind the green, facing the tee
    bigProps: [
      { id: 'windmill', x: -28, z: -288, turn: 0.15, scale: 1.05 },
      { id: 'windmill', x: 32, z: -300, turn: -0.2, scale: 0.95 },
    ],
  },
  intro: mdwIntro({
    par: 3, prev: 'mdw-05', // next: 'mdw-07' once it exists
    tagline: 'Downhill over a dip, with water short and right. The windmills watch.',
    steps: [
      'The green sits about 8 m below the tee: the ball flies a little further.',
      'Water waits short and right of the green. The bank on the left feeds back toward the green.',
      '<b>Safe:</b> the left half of the green. <b>Brave:</b> at the flag, near the water.',
    ],
    blurb: 'Buttercup Meadows, hole 6: a downhill par 3 with water short right.',
  }),
});
