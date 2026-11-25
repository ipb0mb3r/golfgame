// Buttercup Meadows, hole 5: par 4, about 360 m, dogleg RIGHT around a big lake. Difficulty 2.
// Map study (docs/course/MAP_STUDY.md, owner's maps 12 and 15): the inside of the dogleg is a big lake (owner,
// 2026-11-25: "a lot bigger"), wrapping round the corner toward the green. The fairway snakes round it inside a
// clearing (deep rough at its edge, L20). Safe: drive to the corner (aim at the big lone tree beyond it), a mid-iron
// in, the lake well right. Brave: carry the lake's corner (about 35 m of water at 150–190 m) onto the second leg for
// a short iron. A weak brave drive is wet. Big bunkers on the outside of the corner; a two-tier bean green, the cup
// on the upper (back) tier. Props: a rail fence along the left OB line.
import { makeMdwHole, mdwIntro, oak } from './mdw-course.js';

const TEE = { x: 0, z: 0 };
const CORNER = { x: 0, z: -200 };
const CUP = { x: 127, z: -299 }; // in the middle of the back lobe, on the upper tier

// the green's approach direction (from the corner) and the step between its two tiers
const DX = 0.786, DZ = -0.618;

export default makeMdwHole({
  id: 'mdw-05', number: 5, name: 'Buttercup Meadows · 5', par: 4, difficulty: 2,
  tee: TEE, cup: CUP,
  aimTarget: { x: -3, z: -195 },
  playLine: [TEE, CORNER, CUP],
  teePad: { h: 0.6, r: 4.5 },
  // rolling meadow, a slow rise of about 3 m toward the green
  base: (x, z) => -0.009 * z + 0.8 * Math.sin(x / 20 + 1.2) * Math.cos(z / 34) + 0.4 * Math.sin(z / 23 + x / 40),
  hills: [
    { x: -40, z: -110, r: 26, h: 2.6 },  // banks beyond the left rough
    { x: -30, z: -250, r: 28, h: 3.2 },  // the bank behind the corner (stops through-drives)
    { x: 150, z: -330, r: 30, h: 3.6 },  // the bank behind the green
  ],
  // the clearing wraps round the lake and the corner; deep rough is its edge layer
  land: { pts: [[-13, 20], [13, 20], [24, -20], [60, -36], [110, -70], [140, -140], [152, -220], [160, -290], [150, -332], [120, -348], [82, -330], [42, -304], [4, -280], [-30, -266], [-52, -226], [-50, -150], [-36, -80], [-22, -30], [-16, 0]], deepBand: { w: 8, wob: 0.75, seed: 21 } },
  // the fairway snakes round the lake: down the first leg, round the corner, along the lake to the green's front
  fairwayShapes: [{ pts: [[-5, -26], [5, -26], [12, -90], [14, -150], [16, -188], [34, -212], [60, -234], [86, -254], [108, -274], [118, -284], [112, -301], [84, -289], [56, -277], [28, -263], [4, -250], [-18, -232], [-25, -200], [-19, -150], [-10, -90]] }],
  // two tiers (plan): a soft step about 0.9 m high across the green, the back tier up; a little side tilt
  green: { cx: 122, cz: -295, rx: 17, rz: 12, rot: -0.67, wob: 0.07, seed: 21, blend: 0.5, lobes: [{ cx: 127, cz: -299, rx: 10, rz: 9 }, { cx: 116, cz: -290, rx: 10, rz: 9 }], raise: 0.4,
    contour: (x, z) => { const s = DX * (x - 122) + DZ * (z + 295); return 0.45 * Math.tanh(s / 2.5) + 0.009 * (0.62 * (x - 122) + 0.786 * (z + 295)); } },
  bunkers: [
    // the outside of the corner: the cost of the safe line running long
    { cx: -27, cz: -212, rx: 7, rz: 13, rot: 0.15, wob: 0.12, seed: 22, depth: 1.1 },
    { cx: -8, cz: -248, rx: 12, rz: 7, rot: 0.4, wob: 0.14, seed: 23, depth: 1.1, blend: 0.5, lobes: [{ cx: 4, cz: -256, rx: 7, rz: 5 }] },
    // greenside bowls hugging the fringe: right, and back left
    { cx: 145, cz: -284, rx: 6, rz: 10, rot: -0.67, wob: 0.1, seed: 24, depth: 1.5 },
    { cx: 114, cz: -313, rx: 9, rz: 6, rot: -0.67, wob: 0.1, seed: 25, depth: 1.5 },
  ],
  // the big lake inside the dogleg (owner: "a lot bigger"), wrapping round toward the green
  ponds: [{ cx: 60, cz: -128, rx: 30, rz: 60, rot: -0.3, wob: 0.08, seed: 26, depth: 2.4, lip: 'rough', lipW: 3, blend: 1.0,
    lobes: [{ cx: 36, cz: -181, rx: 15, rz: 18 }, { cx: 78, cz: -178, rx: 24, rz: 20 }, { cx: 102, cz: -200, rx: 28, rz: 20 }] }],
  ob: { x0: -60, x1: 166, z0: -356, z1: 26 },
  forest: { size: [1.0, 1.6], seed: 105, keep: 5, edgeGap: [5, 15], inset: [3, 9], clump: 3, back: false, clear: [{ pts: [{ x: 0, z: 0 }, { x: 40, z: -225 }], w: 10 }] },
  // the big lone tree beyond the corner: the safe drive's aim point (map 19)
  obstacles: [
    oak(-36, -238, 1.6),
    // round trees on the lake's shore (owner: "more natural"), never on the brave carry
    oak(42, -54, 1.2), oak(52, -47, 1.0), oak(33, -62, 0.9),
    oak(94, -78, 1.25), oak(104, -90, 1.0), oak(92, -92, 0.9),
    oak(134, -186, 1.1), oak(140, -200, 0.95),
    oak(26, -112, 1.0),
  ],
  scenery: {
    // the edge of the course on the outside of the bend, then away over the bank
    fences: [{ id: 'railFence', points: [[-63, 14], [-63, -270], [-90, -310]] }],
  },
  intro: mdwIntro({
    par: 4, prev: 'mdw-04', next: 'mdw-06',
    tagline: 'A dogleg right around a big lake. Go round it, or carry its corner.',
    steps: [
      'The fairway bends right around a big lake.',
      '<b>Safe:</b> drive to the corner (aim at the big tree beyond it), then a mid-iron in.',
      '<b>Brave:</b> carry the corner of the lake onto the second leg for a short iron. Come up short and you are wet.',
      'The green has two tiers: the flag is on the upper, back one.',
    ],
    blurb: 'Buttercup Meadows, hole 5: a par 4 bending right around a big lake.',
  }),
});
