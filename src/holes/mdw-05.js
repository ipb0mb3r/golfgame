// Buttercup Meadows, hole 5: par 4, about 370 m, dogleg RIGHT around a pond. Difficulty 2.
// Plan (docs/COURSE_PLAN_MEADOW.md): the pond sits inside the bend. Brave: carry its corner for a short iron in.
// Safe: around the outside to the elbow, a longer approach; big bunkers on the outside of the bend are the cost of
// the safe line. A patch of rough bites into the landing area (owner, L15: variety). Two-tier green, the cup on the
// upper (back) tier. Props: trees and a fence.
import { makeMdwHole, mdwIntro } from './mdw-course.js';

const TEE = { x: 0, z: 0 };
const CORNER = { x: 0, z: -235 };
const CUP = { x: 105, z: -325 }; // in the middle of the back lobe, on the upper tier

// the green's approach direction (from the corner) and the step between its two tiers
const DX = 0.76, DZ = -0.65;

export default makeMdwHole({
  id: 'mdw-05', number: 5, name: 'Buttercup Meadows · 5', par: 4, difficulty: 2,
  tee: TEE, cup: CUP,
  aimTarget: { x: -2, z: -225 },
  playLine: [TEE, CORNER, CUP],
  teePad: { h: 0.6, r: 4.5 },
  // rolling meadow, a slow rise of about 3 m toward the green
  base: (x, z) => -0.009 * z + 0.8 * Math.sin(x / 20 + 1.2) * Math.cos(z / 34) + 0.4 * Math.sin(z / 23 + x / 40),
  hills: [
    { x: -40, z: -120, r: 28, h: 3.0 },  // banks beyond the left rough
    { x: -36, z: -270, r: 30, h: 3.6 },  // the bank behind the elbow (stops through-drives)
    { x: 132, z: -350, r: 30, h: 3.6 },  // the bank behind the green
    { x: 70, z: -90, r: 26, h: 2.4 },
  ],
  // two tiers (owner's plan): a soft step about 0.9 m high across the green, the back tier up; a little side tilt
  green: { cx: 100, cz: -320, rx: 17, rz: 12, rot: -0.7, wob: 0.07, seed: 21, blend: 0.5, lobes: [{ cx: 105, cz: -325, rx: 10, rz: 9 }, { cx: 95, cz: -315, rx: 10, rz: 9 }], raise: 0.4,
    contour: (x, z) => { const s = DX * (x - 100) + DZ * (z + 320); return 0.45 * Math.tanh(s / 2.5) + 0.009 * (0.65 * (x - 100) + 0.76 * (z + 320)); } },
  blend: 18,
  fairways: [
    { pts: [{ x: 0, z: -28, w: 12 }, { x: 0, z: -130, w: 21 }, { x: 0, z: -235, w: 24 }, { x: 40, z: -278, w: 19 }, { x: 78, z: -304, w: 15 }, { x: 90, z: -312, w: 14 }] },
    // the brave landing beyond the pond: a swelling of the fairway toward the green
    { pts: [{ x: 42, z: -212, w: 9 }, { x: 58, z: -245, w: 13 }, { x: 74, z: -278, w: 13 }] },
  ],
  bunkers: [
    // the outside of the bend: the cost of the safe line
    { cx: -24, cz: -238, rx: 8, rz: 13, rot: 0.15, wob: 0.12, seed: 22, depth: 1.1 },
    { cx: -6, cz: -272, rx: 12, rz: 7, rot: 0.5, wob: 0.14, seed: 23, depth: 1.1, blend: 0.5, lobes: [{ cx: 6, cz: -281, rx: 7, rz: 5 }] },
    // greenside bowls hugging the fringe: right, and short left
    { cx: 120, cz: -304, rx: 6, rz: 10, rot: -0.7, wob: 0.1, seed: 24, depth: 1.5 },
    { cx: 86, cz: -333, rx: 8, rz: 6, rot: -0.7, wob: 0.1, seed: 25, depth: 1.5 },
  ],
  // the pond inside the bend (the brave carry, about 185 m)
  ponds: [{ cx: 48, cz: -150, rx: 17, rz: 20, rot: -0.3, wob: 0.1, seed: 26, depth: 2.2, lip: 'rough', lipW: 2.5, blend: 0.5, lobes: [{ cx: 56, cz: -170, rx: 10, rz: 10 }] }],
  // L15: a patch of rough biting into the right edge of the landing area
  roughs: [{ cx: 17, cz: -200, rx: 6, rz: 10, rot: 0.25, wob: 0.12, seed: 27 }],
  ob: { x0: -60, x1: 150, z0: -365, z1: 18 },
  forest: { gap: 8, rows: 2, spacing: 12, size: [1.0, 1.5], seed: 105, keep: 6, clear: [{ pts: [{ x: 0, z: 0 }, { x: 60, z: -250 }], w: 10 }] },
  obstacles: [],
  scenery: {
    // the edge of the course on the outside of the bend, then away over the bank
    fences: [{ id: 'railFence', points: [[-63, 14], [-63, -290], [-90, -330]] }],
  },
  intro: mdwIntro({
    par: 4, prev: 'mdw-04', next: 'mdw-06',
    tagline: 'A dogleg right around a pond. Go round it, or carry it.',
    steps: [
      'The fairway bends right around a pond.',
      '<b>Safe:</b> drive to the elbow, past the patch of rough, then a mid-iron in. Big bunkers wait on the outside of the bend.',
      '<b>Brave:</b> carry the corner of the pond for a short iron.',
      'The green has two tiers: the flag is on the upper, back one.',
    ],
    blurb: 'Buttercup Meadows, hole 5: a par 4 bending right around a pond.',
  }),
});
