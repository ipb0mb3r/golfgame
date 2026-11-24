// Buttercup Meadows, hole 1: par 4, about 350 m, straight. Difficulty 1, the opener.
// Plan (docs/COURSE_PLAN_MEADOW.md): a wide fairway with soft rolls (fairly flat, not literally flat), one bunker
// left of the landing zone. Driving down the right side, near the tree line, opens the angle into a big green with
// a gentle tilt, guarded front left. Props: the full tournament tee, two flags behind the green, a windmill on the
// far hill behind the green.
import { makeMdwHole, mdwIntro, TEE_DRESS } from './mdw-course.js';

const TEE = { x: 0, z: 0 };
const CUP = { x: 4, z: -350 };

export default makeMdwHole({
  id: 'mdw-01', number: 1, name: 'Buttercup Meadows · 1', par: 4, difficulty: 1,
  tee: TEE, cup: CUP,
  aimTarget: { x: -2, z: -228 },
  teePad: { h: 0.5, r: 4.5 },
  // soft rolls across and along the fairway (about ±0.7 m), a very gentle fall toward the green
  base: (x, z) => 0.005 * z + 0.6 * Math.sin(x / 23 + 0.5) * Math.cos(z / 41) + 0.35 * Math.sin(z / 29 + x / 50),
  hills: [
    { x: -6, z: -140, r: 30, h: 0.9 },   // a soft swell short of the landing area
    { x: 12, z: -262, r: 22, h: -0.6 },  // a shallow dip right of the landing zone
    { x: -50, z: -110, r: 26, h: 2.6 },  // mounds in the rough and beyond OB: a landscape, not a field
    { x: 52, z: -190, r: 28, h: 2.4 },
    { x: -48, z: -320, r: 26, h: 2.8 },
    { x: 10, z: -395, r: 26, h: 2.6 },   // a low bank behind the green (a backdrop)
    { x: 10, z: -445, r: 34, h: 9 },     // the windmill's hill, beyond OB
  ],
  // big and gently tilted (back right high): putts break a little toward the front left
  green: { cx: 3, cz: -348, rx: 17, rz: 14, raise: 0.3, contour: (x, z) => 0.011 * (x - 3) - 0.009 * (z + 348) },
  // one flowing blob, widest in the landing zone, merging into the green's front
  fairways: [{ pts: [{ x: 0, z: -26, w: 13 }, { x: 0, z: -120, w: 25 }, { x: 2, z: -240, w: 27 }, { x: 3, z: -310, w: 19 }, { x: 3, z: -338, w: 15 }] }],
  bunkers: [
    // a shallow blob where real drives finish, left of centre
    { cx: -20, cz: -238, rx: 6, rz: 10, rot: 0.25, wob: 0.12, seed: 2, depth: 0.45, lobes: [{ cx: -15, cz: -250, rx: 5, rz: 5 }] },
    { cx: -15, cz: -337, rx: 5, rz: 7, rot: -0.3, wob: 0.1, depth: 0.9 }, // front left of the green: the right side has the open angle
  ],
  ob: { x0: -62, x1: 62, z0: -390, z1: 18 },
  forest: { gap: 9, rows: 2, spacing: 13, size: [1.0, 1.5], seed: 101, keep: 6 },
  obstacles: [],
  scenery: {
    eventProps: [
      TEE_DRESS.tent, TEE_DRESS.flagR, TEE_DRESS.flagL, TEE_DRESS.flagBack, TEE_DRESS.bench,
      // two flags behind the green, framing the hole flag in the approach view
      { id: 'featherFlag', x: -9, z: -373, turn: 0.25 },
      { id: 'featherFlag', x: 15, z: -373, turn: -0.25 },
    ],
    bigProps: [{ id: 'windmill', x: 10, z: -445, turn: 0, scale: 1.05 }],
  },
  intro: mdwIntro({
    par: 4, next: 'mdw-02',
    tagline: 'Welcome to Buttercup Meadows. A wide, friendly opener.',
    steps: [
      'A wide fairway with soft rolls. Plenty of room off the tee.',
      'A bunker waits left of the landing zone. A drive down the right side opens up the green.',
      'The big green tilts gently toward the front left. Aim at the windmill behind it.',
    ],
    blurb: 'Buttercup Meadows, hole 1: a wide, straight par 4 to start.',
  }),
});
