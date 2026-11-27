// Buttercup Meadows, hole 7: par 4, about 400 m, along the side of a big slope. Difficulty 3.
// Plan (docs/COURSE_PLAN_MEADOW.md) + owner's pick A (2026-11-27, "the hillside"): the ground climbs to the left and
// falls to the right for the whole hole. One long blob fairway runs along the slope and bends gently left into the
// green. Safe: the middle; the slope feeds the ball right, down toward a long bunker on the low side and the rough,
// leaving a longer approach across the slope over the front-right bunker. Brave: up the high left side to a flat
// shelf (a clear look up the length of the green), past a big bunker cut into the bank and a clump of trees above it.
// The first tricky green: a big bean tilting hard from high back-left down to low front-right, the cup in the upper
// lobe. Props: a fenced pasture with 3 cows on a knoll right behind the green, beyond OB: the hole's showpiece.
import { ss } from '../core/terrain.js';
import { makeMdwHole, mdwIntro, oak } from './mdw-course.js';

const TEE = { x: 0, z: 0 };
const BEND = { x: 4, z: -240 };
const CUP = { x: -42, z: -401 }; // in the middle of the green's upper (back-left) lobe

// the side slope: m of rise per m to the left (−x)
const SIDE = 0.09;
// the low side of the landing zone falls off a steeper bank (m): a ball that stops there trickles down to the right
const DROP = 1.8;
// the hero shelf on the high left of the landing zone: the slope flattens out there (a flat lie)
const SHELF = { x: -15, z: -238, rx: 11, rz: 30 };
// the green's tilt: u runs from the low front right (−) to the high back left (+)
const GX = -34, GZ = -394;
const tiltU = (x, z) => -0.74 * (x - GX) - 0.67 * (z - GZ);

function base(x, z) {
  let h = -SIDE * x - DROP * ss(4, 28, x) * ss(80, 150, -z) + 0.5 * Math.sin(x / 19 + 0.8) * Math.cos(z / 31) + 0.3 * Math.sin(z / 23 + x / 41);
  const dx = (x - SHELF.x) / SHELF.rx, dz = (z - SHELF.z) / SHELF.rz, w = Math.exp(-(dx * dx + dz * dz));
  return h * (1 - w) + -SIDE * SHELF.x * w;
}

export default makeMdwHole({
  id: 'mdw-07', number: 7, name: 'Buttercup Meadows · 7', par: 4, difficulty: 3,
  tee: TEE, cup: CUP,
  aimTarget: { x: -4, z: -232 },
  playLine: [TEE, BEND, CUP],
  teePad: { h: 0.6, r: 4.5 },
  base,
  hills: [
    { x: -92, z: -210, r: 55, h: 14 },   // the big hillside: it climbs above the left rough and beyond OB
    { x: -100, z: -420, r: 40, h: 6 },   // the hill behind the green (a backdrop)
    { x: 24, z: -490, r: 30, h: 6 },     // the pasture's knoll behind the green, beyond OB: the cows stand up as its backdrop
  ],
  // a big bean on the diagonal; it tilts hard toward the low front right; the cup's upper lobe is gentler
  green: { cx: GX, cz: GZ, rx: 18, rz: 12, rot: 0.7, wob: 0.07, seed: 71, blend: 0.5, lobes: [{ cx: -42, cz: -401, rx: 10, rz: 9 }, { cx: -26, cz: -386, rx: 10, rz: 9 }], raise: 0.3,
    contour: (x, z) => { const u = tiltU(x, z); return 0.038 * u - 0.09 * Math.tanh((u - 10.6) / 9); } },
  // the clearing follows the slope: room on the low right for the run-off, a bay on the high left round the green
  land: { pts: [[-13, 20], [13, 20], [22, -30], [40, -100], [56, -170], [62, -240], [56, -300], [34, -350], [16, -392], [4, -428], [-20, -442], [-50, -438], [-72, -412], [-76, -370], [-66, -320], [-58, -262], [-56, -200], [-44, -130], [-26, -60], [-16, -10]], deepBand: { w: 8, wob: 0.75, seed: 71 },
    // the view (owner): no tree between the green and the pasture with its cows, down the slope behind it on the right
    open: [{ cx: 18, cz: -462, rx: 50, rz: 26, wob: 0.06, seed: 7 },
      // (owner, 2026-11-27: "remove the trees in front of the pasture so we can see") the right edge from the landing
      // zone to behind the green, and the forest beyond it
      { cx: 42, cz: -345, rx: 26, rz: 92, rot: -0.3, wob: 0.06, seed: 8 }, { cx: 14, cz: -416, rx: 32, rz: 28, wob: 0.06, seed: 9 }] },
  // one long blob: narrow off the tee, a fat landing zone that swells up to the shelf on the left, a waist at the
  // bend, then the approach widening into the green's front
  fairwayShapes: [{ pts: [[-5, -28], [5, -28], [12, -90], [20, -160], [25, -215], [23, -262], [12, -296], [-4, -320], [-20, -340], [-30, -356], [-34, -372], [-38, -386], [-52, -390], [-56, -376], [-54, -358], [-45, -336], [-31, -304], [-27, -280], [-29, -250], [-28, -222], [-19, -190], [-11, -130], [-7, -70]] }],
  bunkers: [
    // the low side: a long bunker the slope feeds the safe drive toward
    { cx: 27, cz: -242, rx: 6, rz: 17, rot: 0.08, wob: 0.12, seed: 72, depth: 1.1 },
    // cut into the bank short of the shelf: the price of a brave drive that comes up short or left
    { cx: -26, cz: -203, rx: 9, rz: 8, rot: 0.3, wob: 0.12, seed: 73, depth: 1.2, blend: 0.5, lobes: [{ cx: -31, cz: -212, rx: 6, rz: 6 }] },
    // the feature bunker at the green's low front right: from the low side the approach carries it; from the
    // shelf the front is open fairway
    { cx: -27, cz: -367, rx: 7, rz: 6, rot: 0.9, wob: 0.1, seed: 74, depth: 1.5 },
    // a pot behind the upper lobe: a long ball at the flag
    { cx: -52, cz: -414, rx: 7, rz: 6, rot: 0.7, wob: 0.1, seed: 75, depth: 1.5 },
  ],
  // the run-off on the low right swells into a deep-rough area past the long bunker (merged into the edge layer)
  deepRoughs: [{ cx: 52, cz: -275, rx: 10, rz: 32, rot: -0.35, wob: 0.08, seed: 76 }],
  ob: { x0: -84, x1: 68, z0: -450, z1: 24 },
  forest: { size: [1.0, 1.6], seed: 107, keep: 5, edgeGap: [5, 15], inset: [3, 9], clump: 3, back: false },
  obstacles: [
    // the clump on the bank above the bunker: too far left on the brave line is under the trees
    oak(-40, -214, 1.15), oak(-44, -226, 1.0), oak(-36, -228, 0.9),
  ],
  scenery: {
    // the pasture on a knoll right behind the green (owner, 2026-11-27: "bring them closer", the hole's visual
    // attraction), as close as the OB + 5 m rule allows (a closed fence = a pasture); 3 cows (phone budget)
    fences: [{ id: 'railFence', points: [[-16, -460], [60, -460], [66, -496], [24, -508], [-16, -492], [-16, -460]] }],
    bigProps: [
      { id: 'cow', x: 4, z: -472, turn: 0.5, pose: 'graze', pattern: 0 },
      { id: 'cow', x: 26, z: -483, turn: -0.4, pose: 'stand', pattern: 1 },
      { id: 'cow', x: 42, z: -474, turn: 1.0, pose: 'graze', pattern: 2, scale: 0.95 },
    ],
  },
  intro: mdwIntro({
    par: 4, prev: 'mdw-06', next: 'mdw-08',
    tagline: 'Along the side of a big slope, to the first green that really tilts.',
    steps: [
      'The ground falls to the right all the way: the ball runs right when it lands.',
      '<b>Safe:</b> the middle. The slope feeds you toward the bunker on the right, and a longer approach over the green\'s front bunker.',
      '<b>Brave:</b> up the high left side to the flat shelf, past the bunker in the bank and the trees above it.',
      'The green tilts hard toward the front right. Above the hole is fast.',
    ],
    blurb: 'Buttercup Meadows, hole 7: a par 4 along a hillside, to a tilting green.',
  }),
});
