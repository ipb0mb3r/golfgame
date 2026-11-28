// Buttercup Meadows, hole 8: par 4, about 300 m, round the shoulder of a hill to a hilltop green. Difficulty 2.
// Plan (docs/COURSE_PLAN_MEADOW.md: short, uphill to a hilltop green, the breather) + owner's pick B (2026-11-28,
// "round the shoulder"): the hole curves LEFT and climbs round the side of a hill to the green on its top. Safe: drive
// to the corner on the right and follow the fairway round, a longer pitch up the hill. Brave: straight over the
// hill's shoulder (the inside of the bend: rough, trees either side and a bunker cut into it) onto the swelling of
// fairway high on the shoulder, a short pitch left. A big, gentle green (a breather after hole 7), the cup in its
// back-left lobe; a deep bunker in the face short right of it, a feature bunker on the left where the hilltop falls
// away. Props: a windmill on the knoll right behind the green (the aim point).
import { makeMdwHole, mdwIntro, oak } from './mdw-course.js';

const TEE = { x: 0, z: 0 };
const BEND = { x: 10, z: -170 };
const CUP = { x: -88, z: -264 }; // in the middle of the green's back-left lobe

export default makeMdwHole({
  id: 'mdw-08', number: 8, name: 'Buttercup Meadows · 8', par: 4, difficulty: 2,
  tee: TEE, cup: CUP,
  aimTarget: { x: 10, z: -175 },
  playLine: [TEE, BEND, CUP],
  teePad: { h: 0.6, r: 4.5 },
  // soft rolls; the hill does the climbing
  base: (x, z) => 0.5 * Math.sin(x / 18 + 0.3) * Math.cos(z / 29) + 0.3 * Math.sin(z / 21 + x / 37),
  hills: [
    { x: -88, z: -262, r: 60, h: 10 },   // the hill: its top is the green
    { x: -50, z: -192, r: 30, h: 4.5 },  // its shoulder, reaching toward the tee inside the bend
    { x: 54, z: -212, r: 26, h: 3 },     // a bank beyond the corner (stops through-drives)
    { x: -168, z: -300, r: 28, h: 10 },  // the windmill's knoll beyond the green, beyond OB
  ],
  // big and gentle (a breather): a bean on the hilltop, a soft tilt toward the front right (down the climb, +x)
  green: { cx: -82, cz: -258, rx: 17, rz: 12, rot: 0.75, wob: 0.07, seed: 81, blend: 0.5, lobes: [{ cx: -88, cz: -264, rx: 10, rz: 9 }, { cx: -75, cz: -252, rx: 10, rz: 9 }], raise: 0.3,
    contour: (x, z) => -0.013 * (x + 82) - 0.006 * (z + 258) },
  // the clearing: out to the right round the corner, then west round the hill to its top; deep rough at its edge
  land: { pts: [[-13, 18], [13, 18], [22, -40], [34, -110], [46, -180], [44, -226], [24, -254], [-10, -270], [-40, -288], [-74, -302], [-108, -296], [-126, -268], [-118, -232], [-96, -206], [-82, -170], [-60, -120], [-36, -64], [-22, -24], [-15, -8]], deepBand: { w: 8, wob: 0.75, seed: 81 } },
  // one blob: narrow off the tee, a fat landing zone at the corner, then the second leg climbing west round the hill
  // to the green's front; on the inside of the bend it swells toward the tee up the shoulder (the brave landing)
  fairwayShapes: [{ pts: [[-5, -28], [5, -28], [14, -90], [24, -150], [28, -190], [20, -222], [0, -240], [-24, -250], [-46, -258], [-62, -264], [-66, -250], [-62, -228], [-60, -198], [-46, -182], [-30, -187], [-12, -200], [-4, -180], [-4, -150], [-6, -95]] }],
  bunkers: [
    // cut into the shoulder short of the brave landing: a brave drive that comes up short
    { cx: -38, cz: -180, rx: 8, rz: 6, rot: 0.2, wob: 0.12, seed: 82, depth: 1.1, blend: 0.5, lobes: [{ cx: -46, cz: -178, rx: 6, rz: 5 }] },
    // the outside of the corner: the safe drive that runs too far
    { cx: 27, cz: -204, rx: 6, rz: 12, rot: -0.3, wob: 0.12, seed: 83, depth: 1.1 },
    // cut into the face right of the climb, short of the back lobe: a pitch that comes up short and right
    { cx: -70, cz: -273, rx: 8, rz: 6, rot: 0.6, wob: 0.1, seed: 84, depth: 1.5 },
    // the feature bunker behind the green, where the hilltop falls away
    { cx: -106, cz: -262, rx: 6, rz: 11, rot: 0.3, wob: 0.1, seed: 85, depth: 1.5 },
  ],
  // the layer swells into a deep-rough area under the hill, left of the shoulder (a big pull off the tee)
  deepRoughs: [{ cx: -84, cz: -168, rx: 12, rz: 30, rot: 0.45, wob: 0.08, seed: 86 }],
  ob: { x0: -134, x1: 54, z0: -310, z1: 22 },
  forest: { size: [1.0, 1.6], seed: 108, keep: 5, edgeGap: [5, 15], inset: [3, 9], clump: 3, back: false },
  obstacles: [
    // inside the bend, either side of the brave line (never in front of its landing: no blind shot): a pair between
    // the safe and the brave line, and one on the left of it
    oak(-11, -116, 1.2), oak(-17, -127, 1.0), oak(-55, -140, 1.05),
    // left of the brave landing: too far left on the shoulder is under the trees
    oak(-74, -200, 1.15), oak(-78, -212, 0.95),
  ],
  scenery: {
    // the aim point: a windmill on the knoll beyond the green, in line with the approach from the corner
    bigProps: [{ id: 'windmill', x: -168, z: -300, turn: 1.0, scale: 1.05 }],
  },
  intro: mdwIntro({
    par: 4, prev: 'mdw-07', // next: 'mdw-09' once it exists
    tagline: 'A short par 4, round the shoulder of a hill to a green on its top.',
    steps: [
      'The fairway curves left and climbs round the hill. The green is on top, under the windmill.',
      '<b>Safe:</b> drive to the corner on the right, then a pitch up the hill.',
      '<b>Brave:</b> straight over the shoulder (the trees, then a bunker) onto the fairway high on the hill: a short pitch left.',
    ],
    blurb: 'Buttercup Meadows, hole 8: a short par 4 climbing round a hill.',
  }),
});
