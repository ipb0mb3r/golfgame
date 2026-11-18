// Mountain 9, hole 9 (C9): par 5, about 535 m, the finale. Difficulty 4.
// Plan (GENRE_NOTES screenshots 4 and 7): a big drop from a high tee with a view; the hole wraps
// round the lake where the creek ends. The safe route plays up the left in three, around the lake. The
// brave second shot bites off the lake to reach a raised green in two. A slope and a tree line behind
// the green frame it.
import { makeMtnHole, mtnIntro, pine, boulder } from './mtn-course.js';

const TEE = { x: 0, z: 0 };
const CORNER = { x: -4, z: -280 };
const CUP = { x: 130, z: -495 };

const ramp = (z, a, b) => Math.min(1, Math.max(0, (-z - a) / (b - a)));

export default makeMtnHole({
  id: 'mtn-09', number: 9, name: 'Mountain 9 · 9', par: 5, difficulty: 4,
  tee: TEE, cup: CUP,
  aimTarget: { x: -4, z: -278 },
  playLine: [TEE, CORNER, CUP],
  teePad: { h: 0.8, r: 5 },
  // the tee sits about 20 m above the valley floor; the valley rolls (L1)
  base: (x, z) => 21 * (1 - ramp(z, 20, 220) ** 0.8) + 0.9 * Math.sin(x / 19) * Math.cos(z / 27) + 0.4 * Math.sin(z / 17),
  hills: [
    { x: -52, z: -180, r: 28, h: 3.4 },
    { x: -50, z: -390, r: 30, h: 3.6 },   // left of the second leg
    { x: 140, z: -538, r: 32, h: 5.0 },   // behind the green: the backdrop
    { x: 172, z: -420, r: 24, h: 3.4 },
  ],
  // raised, and tilted clearly toward the lake (front left low, L1)
  green: { cx: 128, cz: -492, rx: 16, rz: 14, raise: 1.2, bank: 1.1, contour: (x, z) => 0.016 * (x - 128) - 0.014 * (z + 492) },
  blend: 20,
  fairways: [
    { pts: [{ x: 0, z: -40, w: 12 }, { x: -2, z: -170, w: 21 }, { x: -4, z: -300, w: 23 }] },
    // the safe second leg: up the left and round the top of the lake, KISSING its rock edge (owner), one
    // smooth blob that runs on into the apron and the green (L4, L9: no notches)
    { pts: [{ x: -4, z: -300, w: 21 }, { x: 12, z: -405, w: 20 }, { x: 56, z: -468, w: 18 }, { x: 100, z: -484, w: 15 }, { x: 116, z: -488, w: 14 }] },
  ],
  roughs: [{ cx: -26, cz: -430, rx: 8, rz: 14, rot: 0.3, wob: 0.15, seed: 3 }], // L6: rough biting in on the far left
  bunkers: [
    { cx: -31, cz: -322, rx: 8, rz: 11, rot: 0.2, wob: 0.14, seed: 1, depth: 0.6, lobes: [{ cx: -22, cz: -334, rx: 5, rz: 5 }] }, // L5: where long drives finish
    { cx: 36, cz: -486, rx: 8, rz: 5, rot: 0.4, wob: 0.14, seed: 2, depth: 0.7 },    // left of the safe lay-up line
    { cx: 147, cz: -484, rx: 4, rz: 8, rot: -0.2, wob: 0.12, seed: 4, depth: 1.1 },  // right of the green
    { cx: 126, cz: -512, rx: 8, rz: 4, rot: 0.1, wob: 0.12, seed: 6, depth: 0.9 },   // behind the green
  ],
  // the lake inside the bend, its rock edge right at the fairway; the creek bed widens into it (L8)
  // the lake lies ACROSS the line to the green (rot): a carry is about 50 m of water, a short ball stays dry
  // in front of it, and its far end eats into the safe fairway's edge
  ponds: [{ cx: 76, cz: -404, rx: 42, rz: 25, rot: 0.55, wob: 0.07, seed: 4, depth: 2.6, lip: 'rock', lipW: 2.5, lobes: [{ cx: 100, cz: -380, rx: 22, rz: 20 }] }],
  creek: { pts: [{ x: 112, z: 10, w: 2.4 }, { x: 74, z: -130, w: 2.8 }, { x: 72, z: -250, w: 3.6 }, { x: 74, z: -310, w: 5 }, { x: 82, z: -350, w: 9 }], depth: 1.4, bank: 3.5, lip: 'rough' },
  ob: { x0: -64, x1: 182, z0: -528, z1: 18 },
  forest: { gap: 8, rows: 2, spacing: 12, size: [1.2, 1.8], seed: 91, keep: 7, clear: [{ pts: [{ x: -4, z: -285 }, { x: 128, z: -492 }], w: 14 }] }, // the brave line over the lake stays open
  obstacles: [boulder(34, -312, 1.3), boulder(150, -420, 1.4)],
  intro: mtnIntro({
    par: 5, prev: 'mtn-08',
    tagline: 'The finale: a big drop, then round the lake or over it.',
    steps: [
      'The tee sits about 20 m above the fairway: enjoy the view, the ball flies a long way.',
      '<b>Safe:</b> up the left, around the lake, and on in three.',
      '<b>Brave:</b> after a good drive, carry the lake with your second shot and reach the raised green in two.',
    ],
    blurb: 'Mountain 9, hole 9: the finale, a downhill par 5 around a lake.',
  }),
});
