// Buttercup Meadows, hole 1: par 4, about 350 m, straight. Difficulty 1, the opener.
// Map-study pilot (owner, 2026-11-24, docs/course/MAP_STUDY.md): a clearing in the forest, not a field. The
// fairway is drawn as an outline: narrow off the tee, a fat landing zone leaning right, a pinch short of the green,
// then it opens into the green. The decision (owner's map 6): a big bunker sits in the left half of the landing
// zone and a lone tree (on a ring of rough) guards the right of it. Safe: lay back short of both (the default aim).
// Brave: a full drive threaded between them. Even the easy opener has a feature: a big bunker wrapping the back
// left of the green. Props: the full tournament tee, two flags behind the green, a windmill on the hill beyond.
import { makeMdwHole, mdwIntro, oak, TEE_DRESS } from './mdw-course.js';

const TEE = { x: 0, z: 0 };
const CUP = { x: 3, z: -348 }; // dead centre of the green (owner: sometimes the flag is centred; hole 1 is)

export default makeMdwHole({
  id: 'mdw-01', number: 1, name: 'Buttercup Meadows · 1', par: 4, difficulty: 1,
  tee: TEE, cup: CUP,
  aimTarget: { x: 9, z: -194 }, // the safe lay-back, short of the bunker and the tree
  teePad: { h: 0.5, r: 4.5 },
  // soft rolls across and along the fairway, a very gentle fall toward the green (heights: a later step)
  base: (x, z) => 0.005 * z + 0.6 * Math.sin(x / 23 + 0.5) * Math.cos(z / 41) + 0.35 * Math.sin(z / 29 + x / 50),
  hills: [
    { x: -6, z: -140, r: 30, h: 0.9 },   // a soft swell short of the landing area
    { x: -40, z: -110, r: 22, h: 1.8 },  // mounds in the rough toward the trees
    { x: 38, z: -260, r: 22, h: 1.6 },
    { x: 10, z: -445, r: 34, h: 9 },     // the windmill's hill, beyond OB
  ],
  // the playable land: a clearing in the forest, its edge irregular (owner's maps). Beyond it is out of bounds.
  // Deep rough (owner rule L20) is the layer between the rough and OB: a blob band, its width swelling and thinning.
  land: { pts: [[-13, 22], [13, 22], [22, -14], [34, -64], [52, -122], [64, -190], [58, -250], [36, -290], [42, -330], [36, -376], [18, -399], [-6, -402], [-28, -390], [-40, -360], [-30, -322], [-38, -292], [-60, -250], [-64, -196], [-44, -150], [-30, -100], [-24, -48], [-18, -8]], deepBand: { w: 8, wob: 0.75, seed: 5 } },
  // the fairway as an outline: narrow off the tee, a fat landing zone leaning right, a pinch, then the green's width
  fairwayShapes: [{ pts: [[-6, -26], [4, -26], [13, -80], [28, -150], [36, -206], [29, -256], [9, -293], [15, -334], [-11, -334], [-13, -295], [-15, -258], [-15, -208], [-8, -150], [-9, -82]] }],
  // a big bean, the cup in its centre; gently tilted (back right high): putts break a little toward the front left
  green: { cx: 3, cz: -348, rx: 18, rz: 12, rot: -0.15, wob: 0.07, seed: 3, blend: 0.5, lobes: [{ cx: -7, cz: -353, rx: 10, rz: 9 }, { cx: 13, cz: -343, rx: 10, rz: 9 }], raise: 0.3,
    contour: (x, z) => 0.011 * (x - 3) - 0.009 * (z + 348) },
  bunkers: [
    // the landing-zone bunker, in the left half of the fairway where a full drive lands
    { cx: -5, cz: -236, rx: 8, rz: 14, rot: 0.15, wob: 0.12, seed: 2, depth: 1.1, blend: 0.5, lobes: [{ cx: 0, cz: -250, rx: 6, rz: 7 }] },
    // the feature bunker: a big bowl wrapping the back left of the green
    { cx: -25, cz: -359, rx: 7, rz: 12, rot: 0.6, wob: 0.1, seed: 9, depth: 1.5, blend: 0.5, lobes: [{ cx: -13, cz: -372, rx: 8, rz: 5 }] },
    // a small pot short right of the green
    { cx: 27, cz: -331, rx: 6, rz: 7, rot: 0.4, wob: 0.1, seed: 10, depth: 1.4 },
  ],
  // the lone tree right of the landing bunker stands on a ring of rough in the fairway (owner's pick A)
  roughs: [{ cx: 24, cz: -210, rx: 7.5, rz: 7.5, wob: 0.15, seed: 4 }],
  ob: { x0: -68, x1: 68, z0: -405, z1: 26 },
  // trees in play: clumps along the clearing's edge (the land outline), no back arc (the forest edge frames the green)
  forest: { size: [1.0, 1.6], seed: 101, keep: 5, edgeGap: [5, 15], inset: [3, 9], clump: 3, back: false },
  obstacles: [oak(24, -210, 1.35)],
  scenery: {
    eventProps: [
      TEE_DRESS.tent, TEE_DRESS.flagR, TEE_DRESS.flagL, TEE_DRESS.flagBack, TEE_DRESS.bench,
      // two flags behind the green, framing the hole flag in the approach view
      { id: 'featherFlag', x: -12, z: -384, turn: 0.25 },
      { id: 'featherFlag', x: 18, z: -380, turn: -0.25 },
    ],
    bigProps: [{ id: 'windmill', x: 10, z: -450, turn: 0, scale: 1.05 }],
  },
  intro: mdwIntro({
    par: 4, next: 'mdw-02',
    tagline: 'Welcome to Buttercup Meadows. A friendly opener through the trees.',
    steps: [
      'A big bunker sits in the left of the landing zone, and a lone tree guards the right of it.',
      '<b>Safe:</b> lay back short of both, then a mid-iron in.',
      '<b>Brave:</b> a full drive threaded between them leaves a wedge.',
      'A big bunker wraps the back left of the green. The flag is in the middle.',
    ],
    blurb: 'Buttercup Meadows, hole 1: a straight par 4 through a clearing in the trees.',
  }),
});
