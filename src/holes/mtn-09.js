// Mountain 9, hole 9 (C9): par 5, about 490 m, the finale. Difficulty 4.
// Plan (GENRE_NOTES screenshots 4 and 7): a big drop from a high tee with a view; the hole wraps
// round the lake where the creek ends. The safe route plays up the left in three, around the lake. The
// brave second shot bites off the lake to reach a raised green in two. A slope and a tree line behind
// the green frame it.
import { makeMtnHole, mtnIntro, pine, boulder } from './mtn-course.js';

const TEE = { x: 0, z: 0 };
const CORNER = { x: -4, z: -270 };
const CUP = { x: 118, z: -452 };

const ramp = (z, a, b) => Math.min(1, Math.max(0, (-z - a) / (b - a)));

export default makeMtnHole({
  id: 'mtn-09', number: 9, name: 'Mountain 9 · 9', par: 5, difficulty: 4,
  tee: TEE, cup: CUP,
  aimTarget: { x: -4, z: -268 },
  playLine: [TEE, CORNER, CUP],
  teePad: { h: 0.8, r: 5 },
  // the tee sits about 20 m above the valley floor
  base: (x, z) => 21 * (1 - ramp(z, 20, 210) ** 0.8) + 0.5 * Math.sin(x / 19) * Math.cos(z / 27),
  hills: [
    { x: -50, z: -170, r: 26, h: 3.0 },
    { x: -48, z: -360, r: 30, h: 3.4 },   // left of the second leg
    { x: 128, z: -492, r: 30, h: 4.5 },   // behind the green: the backdrop
    { x: 160, z: -380, r: 22, h: 3.0 },
  ],
  green: { cx: 116, cz: -450, rx: 16, rz: 14, raise: 1.2, bank: 1.1, contour: (x, z) => 0.008 * (x - 116) - 0.01 * (z + 450) },
  fairways: [
    { pts: [{ x: 0, z: -40, w: 12 }, { x: -2, z: -160, w: 20 }, { x: -4, z: -300, w: 22 }] },
    // the safe second leg, up the left and round the top of the lake
    { pts: [{ x: -4, z: -300, w: 18 }, { x: 10, z: -390, w: 18 }, { x: 50, z: -440, w: 14 }, { x: 98, z: -448, w: 11 }] },
    // the apron between the lake and the green: a brave second shot that just carries the water runs on
    { pts: [{ x: 84, z: -428, w: 9 }, { x: 102, z: -440, w: 9 }] },
  ],
  bunkers: [
    { cx: -30, cz: -312, rx: 7, rz: 10, depth: 0.6 },   // left of the drive zone
    { cx: 30, cz: -448, rx: 7, rz: 5, depth: 0.7 },     // left of the safe lay-up line
    { cx: 134, cz: -440, rx: 4, rz: 7, depth: 1.1 },    // right of the green
  ],
  // the lake inside the bend, fed by the creek coming down the right
  ponds: [{ cx: 78, cz: -362, rx: 34, rz: 50, depth: 2.6, lip: 'rock', lipW: 2.5 }],
  creek: { pts: [{ x: 110, z: 10, w: 2.0 }, { x: 72, z: -120, w: 2.4 }, { x: 72, z: -240, w: 2.6 }, { x: 76, z: -310, w: 3.0 }], depth: 1.3, bank: 3, lip: 'rough' },
  ob: { x0: -62, x1: 172, z0: -486, z1: 18 },
  obstacles: [
    pine(-40, -100, 1.0), pine(-44, -230, 1.1), pine(30, -120, 1.0),
    pine(-36, -420, 1.05), pine(150, -470, 1.1), pine(156, -420, 1.0),
    boulder(34, -300, 1.3), boulder(128, -390, 1.4),
  ],
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
