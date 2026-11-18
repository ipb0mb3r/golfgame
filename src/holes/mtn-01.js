// Mountain 9, hole 1 (C1): par 4, 340 m, straight and gently downhill. Difficulty 1, the warm-up.
// Plan (docs/COURSE_PLAN_MTN.md): a wide, mostly flat fairway set in rolling ground (GENRE_NOTES
// screenshot 8). One shallow bunker left of the landing zone. The creek is visible far right; a drive
// down the right side gets the open angle into a big flat green (a bunker guards its front left).
import { makeMtnHole, mtnIntro, pine } from './mtn-course.js';

const TEE = { x: 0, z: 0 };
const CUP = { x: 5, z: -372 };

export default makeMtnHole({
  id: 'mtn-01', number: 1, name: 'Mountain 9 · 1', par: 4, difficulty: 1,
  tee: TEE, cup: CUP,
  aimTarget: { x: -2, z: -236 },
  teePad: { h: 1.0, r: 4.5 },
  // gently downhill (about 6 m), rolling across the fairway (playtest 1, L1), a little rise to the green
  base: (x, z) => 0.017 * z + 0.9 * Math.sin(x / 21) * Math.cos(z / 37) + 0.5 * Math.sin(z / 23 + x / 40),
  hills: [
    { x: -10, z: -150, r: 28, h: 1.2 },  // a swell in the first landing area
    { x: 14, z: -280, r: 22, h: -0.9 },  // a dip right of the landing zone
    { x: -46, z: -90, r: 24, h: 3.0 },   // mounds in the left rough
    { x: -48, z: -320, r: 28, h: 3.4 },
    { x: 8, z: -405, r: 26, h: 3.0 },    // a backdrop behind the green
  ],
  // a big, gently tilted green (back right high): putts break toward the front left
  green: { cx: 3, cz: -370, rx: 17, rz: 14, raise: 0.3, contour: (x, z) => 0.012 * (x - 3) - 0.01 * (z + 370) },
  // L4/L9: one flowing blob, widest in the landing zone, merging into the green's front
  fairways: [{ pts: [{ x: 0, z: -26, w: 13 }, { x: -1, z: -120, w: 25 }, { x: 1, z: -250, w: 26 }, { x: 3, z: -330, w: 19 }, { x: 3, z: -360, w: 15 }] }],
  bunkers: [
    // L5: a shallow blob bunker where real drives finish, left of centre
    { cx: -19, cz: -246, rx: 6, rz: 10, rot: 0.25, wob: 0.12, seed: 2, depth: 0.45, lobes: [{ cx: -14, cz: -258, rx: 5, rz: 5 }] },
    { cx: -14, cz: -360, rx: 5, rz: 7, rot: -0.3, wob: 0.1, depth: 0.9 },   // front left of the green
  ],
  // the creek runs far right of the fairway, beyond a wide strip of rough
  creek: { pts: [{ x: 52, z: 20, w: 2.6 }, { x: 46, z: -130, w: 3.0 }, { x: 49, z: -270, w: 3.2 }, { x: 42, z: -400, w: 3.4 }], depth: 1.3, bank: 3, lip: 'rough' },
  ob: { x0: -64, x1: 64, z0: -402, z1: 18 },
  forest: { gap: 9, rows: 2, spacing: 13, size: [1.1, 1.6], seed: 11, keep: 6 },
  obstacles: [],
  intro: mtnIntro({
    par: 4, next: 'mtn-02',
    tagline: 'A wide, friendly opener. The creek runs far right.',
    steps: [
      'A wide fairway, gently downhill. Plenty of room off the tee.',
      'The creek is far right: a drive down the right side gives the best angle into the green.',
      'A bunker guards the front left of the big green.',
    ],
    blurb: 'Mountain 9, hole 1: a wide, gently downhill par 4 to warm up.',
  }),
});
