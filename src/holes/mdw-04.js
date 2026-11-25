// Buttercup Meadows, hole 4: par 5, about 480 m, the first real hill. Difficulty 2.
// Map study (docs/course/MAP_STUDY.md): a clearing, a snaking fairway with a gap of rough between two fairways and a lay-up
// bulge left of the pond, deep rough at the edge (L20). Plan (docs/COURSE_PLAN_MEADOW.md): the drive runs down into a gentle valley, then the fairway climbs to a raised
// green. The course's first water: a pond right of the second landing area. Safe: lay up left of the pond and pitch
// up the hill. Brave: a long second shot past the pond's left edge to reach in two. A gap of rough splits the two fairways short of the hill
// (owner, 2026-11-25). Props: a fenced pasture with cows on the left hillside beyond OB,
// a windmill above it.
import { ss } from '../core/terrain.js';
import { makeMdwHole, mdwIntro } from './mdw-course.js';

const TEE = { x: 0, z: 0 };
const BEND = { x: -2, z: -255 };
const CUP = { x: 36, z: -478 }; // in the middle of the green's back-right lobe

export default makeMdwHole({
  id: 'mdw-04', number: 4, name: 'Buttercup Meadows · 4', par: 5, difficulty: 2,
  tee: TEE, cup: CUP,
  aimTarget: { x: -2, z: -232 },
  playLine: [TEE, BEND, CUP],
  teePad: { h: 0.6, r: 4.5 },
  // down about 8 m into the valley (the landing area), then up about 9 m to the green; soft rolls across
  base: (x, z) => -8 * ss(20, 230, -z) + 9 * ss(330, 455, -z) + 0.6 * Math.sin(x / 22 + 0.4) * Math.cos(z / 39) + 0.3 * Math.sin(z / 27 + x / 48),
  hills: [
    { x: 46, z: -120, r: 30, h: 3.2 },   // banks either side of the valley
    { x: -46, z: -170, r: 28, h: 2.8 },
    { x: -135, z: -250, r: 50, h: 12 },  // the pasture's hillside, beyond the left OB line
    { x: -150, z: -300, r: 34, h: 6 },   // the windmill's knoll above it
    { x: 40, z: -525, r: 34, h: 3.5 },   // a bank behind the green (a backdrop)
  ],
  // a raised blob green (a short ball rolls back down the bank), tilted gently from back right to front left
  green: { cx: 30, cz: -472, rx: 16, rz: 12, rot: 0.4, wob: 0.07, seed: 11, blend: 0.5, lobes: [{ cx: 36, cz: -478, rx: 10, rz: 9 }, { cx: 20, cz: -465, rx: 10, rz: 9 }], raise: 1.0, bank: 1.2,
    contour: (x, z) => 0.012 * (x - 30) - 0.012 * (z + 472) },
  // map study: the clearing follows the hole and opens up round the pond and the green; deep rough is its edge layer
  land: { pts: [[-13, 20], [13, 20], [20, -30], [34, -110], [44, -190], [40, -260], [52, -320], [68, -380], [70, -440], [62, -500], [40, -530], [10, -534], [-14, -516], [-18, -480], [-26, -440], [-46, -404], [-54, -340], [-52, -270], [-46, -200], [-36, -120], [-22, -50], [-16, -10]], deepBand: { w: 8, wob: 0.75, seed: 11 },
    // the view (owner): no tree between the course and the pasture with its cows and windmill
    open: [{ cx: -72, cz: -262, rx: 48, rz: 96, wob: 0.06, seed: 4 }] },
  // two fairways: narrow off the tee into a wide valley landing zone; then, beyond a gap of rough, a lay-up zone
  // bulging left of the pond and a neck climbing to the green's front
  fairwayShapes: [
    { pts: [[-5, -28], [5, -28], [14, -90], [22, -170], [27, -235], [20, -290], [10, -312], [-12, -314], [-25, -280], [-27, -235], [-19, -170], [-10, -90]] },
    // owner (2026-11-25): a gap of rough (no cross bunker) splits the drive fairway from the lay-up fairway
    { pts: [[18, -352], [25, -396], [25, -428], [30, -452], [36, -462], [16, -467], [2, -449], [-10, -430], [-32, -420], [-39, -392], [-30, -362], [-12, -350]] },
  ],
  bunkers: [
    // the left edge of the lay-up area: the cost of laying up too far left
    { cx: -27, cz: -400, rx: 7, rz: 12, rot: -0.15, wob: 0.12, seed: 13, depth: 1.1 },
    // greenside bowls hugging the fringe: front left and back
    { cx: 6, cz: -474, rx: 6, rz: 9, rot: 0.3, wob: 0.1, seed: 14, depth: 1.5 },
    { cx: 39, cz: -494, rx: 9, rz: 6, rot: 0.4, wob: 0.1, seed: 15, depth: 1.5 },
  ],
  // the first water: a pond right of the second landing area, on the direct line to the green (the brave line)
  ponds: [{ cx: 45, cz: -408, rx: 13, rz: 22, rot: -0.15, wob: 0.1, seed: 16, depth: 2.0, lip: 'rough', lipW: 2.5, blend: 0.5, lobes: [{ cx: 40, cz: -429, rx: 9, rz: 10 }] }],
  // the layer swells into a dangerous area left of the climb to the green (a big pull on the approach is a punch-out)
  deepRoughs: [{ cx: -34, cz: -468, rx: 12, rz: 30, rot: 0.25, wob: 0.08, seed: 17 }],
  ob: { x0: -60, x1: 74, z0: -540, z1: 24 },
  forest: { size: [1.0, 1.6], seed: 104, keep: 5, edgeGap: [5, 15], inset: [3, 9], clump: 3, back: false },
  obstacles: [],
  scenery: {
    // a pasture on the left hillside (a closed fence = a pasture), its cows and a windmill on the knoll above
    fences: [{ id: 'railFence', points: [[-68, -195], [-68, -300], [-112, -318], [-140, -270], [-118, -200], [-68, -195]] }],
    bigProps: [
      { id: 'cow', x: -86, z: -228, turn: 1.4, pose: 'graze', pattern: 0 },
      { id: 'cow', x: -98, z: -262, turn: 0.9, pose: 'stand', pattern: 1 },
      { id: 'cow', x: -84, z: -284, turn: 2.1, pose: 'graze', pattern: 2 },
      { id: 'cow', x: -115, z: -240, turn: 1.2, pose: 'stand', pattern: 0, scale: 0.95 },
      { id: 'windmill', x: -150, z: -310, turn: 0.9, scale: 1.05 },
    ],
  },
  intro: mdwIntro({
    par: 5, prev: 'mdw-03', next: 'mdw-05',
    tagline: 'Down into the valley, then up the hill. The first pond.',
    steps: [
      'The drive runs down into a gentle valley. Then the fairway climbs to a raised green.',
      'A gap of rough splits the fairway in two, short of the hill.',
      '<b>Safe:</b> lay up left of the pond, then pitch up to the green.',
      '<b>Brave:</b> a long second shot past the pond reaches in two.',
    ],
    blurb: 'Buttercup Meadows, hole 4: a par 5 down into a valley and up to a raised green.',
  }),
});
