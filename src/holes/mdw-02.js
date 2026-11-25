// Buttercup Meadows, hole 2: par 4, about 335 m, bending LEFT. Difficulty 1.
// Map study (docs/course/MAP_STUDY.md, owner's map 7): a clearing in the forest that follows the bend. The fairway
// snakes: narrow off the tee, a fat landing zone at the corner, a pinched second leg running left to the green.
// The inside of the bend is not empty grass: it is rough with clumps of round trees and a bunker.
// Safe: follow the fairway to the corner (aim at the big lone tree beyond it, map 19), a mid-iron in.
// Brave: cut across the inside, threading the gap between the clumps, for a wedge. Pinch bunkers on the outside of
// the corner; bowls either side of a bean green, the cup in its left lobe.
// Props: a lighter tournament tee (tent + 2 flags), a rail fence along the right OB line.
import { makeMdwHole, mdwIntro, oak, TEE_DRESS } from './mdw-course.js';

const TEE = { x: 0, z: 0 };
const CORNER = { x: -2, z: -212 };
const CUP = { x: -96, z: -291 }; // in the middle of the bean's left lobe, by the left bunker

export default makeMdwHole({
  id: 'mdw-02', number: 2, name: 'Buttercup Meadows · 2', par: 4, difficulty: 1,
  tee: TEE, cup: CUP,
  aimTarget: { x: 3, z: -206 },
  playLine: [TEE, CORNER, CUP],
  teePad: { h: 0.5, r: 4.5 },
  // fairly flat: a very gentle rise toward the green (about 1.5 m) and soft rolls
  base: (x, z) => -0.004 * z + 0.55 * Math.sin(x / 21 + 1) * Math.cos(z / 35) + 0.3 * Math.sin(z / 24),
  hills: [
    { x: 30, z: -262, r: 26, h: 2.6 },   // a bank behind the corner (stops through-drives)
    { x: -112, z: -330, r: 26, h: 2.6 },  // the bank behind the green
    { x: -4, z: -150, r: 22, h: -0.6 },  // a shallow dip in the landing area
    { x: -50, z: -170, r: 30, h: 1.4 },  // a soft knoll under the trees inside the bend
  ],
  // the clearing follows the bend; the inside of the bend is part of it (rough, trees, a bunker: the shortcut)
  land: { pts: [[-14, 22], [14, 22], [24, -20], [34, -90], [47, -168], [45, -236], [24, -282], [-14, -306], [-52, -330], [-90, -340], [-122, -328], [-136, -300], [-128, -270], [-104, -256], [-84, -232], [-76, -196], [-72, -148], [-56, -98], [-34, -58], [-22, -18]] },
  // the fairway snakes: narrow off the tee, fat at the corner, then a pinched second leg into the green's front
  fairwayShapes: [{ pts: [[-5, -26], [5, -26], [12, -90], [22, -160], [27, -210], [18, -246], [-6, -262], [-34, -277], [-58, -294], [-76, -304], [-88, -286], [-62, -270], [-50, -244], [-42, -224], [-25, -196], [-14, -150], [-9, -90]] }],
  // a wide bean across the line of the approach; back-to-front along the line of play (the back left is high)
  green: { cx: -86, cz: -300, rx: 17, rz: 12, rot: -0.75, wob: 0.07, seed: 5, blend: 0.5, lobes: [{ cx: -96, cz: -291, rx: 10, rz: 9 }, { cx: -76, cz: -309, rx: 10, rz: 9 }], raise: 0.4, contour: (x, z) => -0.015 * (x + 86) - 0.016 * (z + 300) },
  bunkers: [
    // pinch bunkers on the outside of the corner: the cost of the safe line running long
    { cx: 30, cz: -212, rx: 7, rz: 13, rot: -0.15, wob: 0.12, seed: 3, depth: 1.1 },
    { cx: 10, cz: -262, rx: 12, rz: 7, rot: -0.4, wob: 0.14, seed: 4, depth: 1.1, blend: 0.5, lobes: [{ cx: -2, cz: -268, rx: 7, rz: 6 }] },
    // inside the bend, in the gap the brave drive threads: it catches a brave drive that comes up short
    { cx: -32, cz: -202, rx: 7, rz: 9, rot: 0.4, wob: 0.12, seed: 7, depth: 1.1 },
    // bowls either side of the green, hugging the fringe
    { cx: -58, cz: -315, rx: 6, rz: 10, rot: 0.7, wob: 0.1, seed: 5, depth: 1.5 },
    { cx: -107, cz: -306, rx: 8, rz: 6, rot: -0.5, wob: 0.12, seed: 6, depth: 1.5 },
  ],
  // S24 deep rough (owner's sketch, 2026-11-25): one blob far left, under the trees, never close to the fairway.
  // Stray too far left of the fairway (or hook the brave drive) and the next shot is a punch-out.
  deepRoughs: [{ cx: -45, cz: -128, rx: 15, rz: 46, rot: -0.22, wob: 0.1, seed: 8, blend: 0.8, lobes: [{ cx: -62, cz: -206, rx: 8.5, rz: 34 }] }],
  ob: { x0: -140, x1: 52, z0: -348, z1: 26 },
  // trees in play: clumps along the clearing's edge
  forest: { size: [1.0, 1.6], seed: 102, keep: 5, edgeGap: [5, 15], inset: [3, 9], clump: 3, back: false, clear: [{ pts: [{ x: 0, z: 0 }, { x: -45, z: -250 }], w: 9 }] },
  obstacles: [
    // clumps of round trees inside the bend; the brave drive threads the gap between the two groups
    oak(-46, -118, 1.1), oak(-54, -128, 1.0), oak(-40, -132, 0.95),
    oak(-52, -186, 1.15), oak(-60, -198, 1.0), oak(-48, -202, 0.95),
    oak(-22, -176, 1.0),
    // the big lone tree beyond the corner: the safe line's aim point (map 19)
    oak(38, -250, 1.6),
  ],
  scenery: {
    eventProps: [TEE_DRESS.tent, TEE_DRESS.flagR, TEE_DRESS.flagL],
    // the edge of the course on the outside of the bend, then away over the bank
    fences: [{ id: 'railFence', points: [[55, 14], [55, -250], [74, -285]] }],
  },
  intro: mdwIntro({
    par: 4, prev: 'mdw-01', next: 'mdw-03',
    tagline: 'A bend to the left. Follow the fairway, or cut through the trees.',
    steps: [
      'The fairway bends left. Inside the bend: clumps of trees and a bunker.',
      '<b>Safe:</b> drive to the corner (aim at the big tree beyond it), then a mid-iron in.',
      '<b>Brave:</b> cut across the inside, between the two groups of trees, for a short wedge.',
      'The green is a wide bean. The flag sits in its left lobe.',
    ],
    blurb: 'Buttercup Meadows, hole 2: a par 4 bending left around clumps of trees.',
  }),
});
