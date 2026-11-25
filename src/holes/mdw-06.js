// Buttercup Meadows, hole 6: par 3, about 190 m, a big drop. Difficulty 2.
// Plan (docs/COURSE_PLAN_MEADOW.md) + owner (2026-11-25: "a much deeper downhill", "not like hole 3"): the tee sits in
// a small clearing on a hilltop about 18 m above a bowl. Below, a long kidney green set on the diagonal, the water
// short and right of it. The cup is in the front-right lobe, by the water (the brave pin). The bail-out is short
// left: a patch of fairway and an open bank, no bunker there. The bunkers sit behind: a long one wrapping the back
// left, a pot at the back right. Deep rough is the clearing's edge layer, swelling on the bad side beyond the pond.
// Props: two windmills on the hill behind the green, the course's postcard view.
import { ss } from '../core/terrain.js';
import { makeMdwHole, mdwIntro } from './mdw-course.js';

const TEE = { x: 0, z: 0 };
const CUP = { x: 12, z: -188 }; // in the middle of the front-right lobe, nearest the water

export default makeMdwHole({
  id: 'mdw-06', number: 6, name: 'Buttercup Meadows · 6', par: 3, difficulty: 2,
  tee: TEE, cup: CUP,
  teePad: { h: 1.0, r: 4.5 },
  // the hilltop tee about 18 m above the bowl; the slope runs out short of the green; soft rolls
  base: (x, z) => -18 * ss(12, 150, -z) + 0.5 * Math.sin(x / 16 + 0.7) * Math.cos(z / 25),
  hills: [
    { x: -44, z: -186, r: 20, h: 2.4 },  // the bank left of the green: the bail-out, it feeds back toward the green
    { x: 6, z: -258, r: 30, h: 4 },      // the bowl's back wall behind the green (a backdrop)
    { x: 0, z: -330, r: 44, h: 8 },      // the windmills' hill, beyond OB
  ],
  // the clearing: a small hilltop tee clearing, the slope, then a round bowl around the green; deep rough at its edge
  land: { pts: [[-12, 16], [12, 16], [16, -30], [26, -80], [46, -120], [62, -160], [60, -212], [42, -240], [10, -252], [-24, -248], [-50, -228], [-60, -188], [-50, -142], [-30, -96], [-18, -46], [-14, -10]], deepBand: { w: 7, wob: 0.75, seed: 31 } },
  // the bail-out: a patch of fairway short left of the green (the front of the green is rough, sloping to the water)
  fairwayShapes: [{ pts: [[-44, -152], [-26, -146], [-14, -158], [-12, -178], [-20, -192], [-36, -190], [-48, -172]] }],
  // a long kidney on the diagonal (front right to back left); the cup's lobe tilts gently toward the water
  green: { cx: 2, cz: -196, rx: 19, rz: 10, rot: 0.55, wob: 0.07, seed: 31, blend: 0.5, lobes: [{ cx: 12, cz: -188, rx: 9, rz: 8 }, { cx: -9, cz: -205, rx: 10, rz: 9 }], raise: 0.15,
    contour: (x, z) => -0.011 * (x - 2) - 0.006 * (z + 196) },
  bunkers: [
    // behind the green (hole 3's are front-left and right): a long bowl wrapping the back left, a pot at the back right
    { cx: -16, cz: -223, rx: 13, rz: 5.5, rot: 0.4, wob: 0.1, seed: 32, depth: 1.5, blend: 0.8, lobes: [{ cx: -6, cz: -226, rx: 8, rz: 5 }] },
    { cx: 22, cz: -204, rx: 6, rz: 7, wob: 0.1, seed: 33, depth: 1.5 },
  ],
  // the water short and right of the green (only on the brave side)
  ponds: [{ cx: 28, cz: -170, rx: 14, rz: 11, rot: -0.3, wob: 0.1, seed: 34, depth: 2.0, lip: 'rough', lipW: 2.5, blend: 0.6, lobes: [{ cx: 38, cz: -184, rx: 9, rz: 8 }] }],
  // the bad side: deep rough beyond the pond, merged into the edge layer
  deepRoughs: [{ cx: 52, cz: -186, rx: 9, rz: 26, rot: 0.1, wob: 0.08, seed: 35 }],
  ob: { x0: -64, x1: 66, z0: -262, z1: 22 },
  forest: { size: [1.0, 1.6], seed: 106, keep: 5, edgeGap: [5, 14], inset: [3, 8], clump: 3, back: false },
  obstacles: [],
  scenery: {
    // the postcard: two windmills on the hill behind the green, facing the tee
    bigProps: [
      { id: 'windmill', x: -28, z: -318, turn: 0.15, scale: 1.05 },
      { id: 'windmill', x: 32, z: -330, turn: -0.2, scale: 0.95 },
    ],
  },
  intro: mdwIntro({
    par: 3, prev: 'mdw-05', // next: 'mdw-07' once it exists
    tagline: 'A big drop from a hilltop tee. Water short and right. The windmills watch.',
    steps: [
      'The green sits about 18 m below the tee: the ball flies a lot further. Take less club.',
      'Water waits short and right, by the flag. Bunkers wait behind the green.',
      '<b>Safe:</b> short left, on the patch of fairway. <b>Brave:</b> at the flag, by the water.',
    ],
    blurb: 'Buttercup Meadows, hole 6: a downhill par 3 from a hilltop tee.',
  }),
});
