// Mountain 9, hole 1 (C1): par 4, 340 m, straight and gently downhill. Difficulty 1, the warm-up.
// Plan (docs/COURSE_PLAN_MTN.md): a wide, mostly flat fairway set in rolling ground (GENRE_NOTES
// screenshot 8). One shallow bunker left of the landing zone. The creek is visible far right; a drive
// down the right side gets the open angle into a big flat green (a bunker guards its front left).
import { makeMtnHole, mtnIntro, pine } from './mtn-course.js';

const TEE = { x: 0, z: 0 };
const CUP = { x: 4, z: -342 };

export default makeMtnHole({
  id: 'mtn-01', number: 1, name: 'Mountain 9 · 1', par: 4, difficulty: 1,
  tee: TEE, cup: CUP,
  aimTarget: { x: -2, z: -232 },
  teePad: { h: 1.0, r: 4.5 },
  // gently downhill all the way (about 6 m), then a little rise to the green
  base: (x, z) => 0.018 * z + 0.6 * Math.sin(x / 23) * Math.cos(z / 41),
  hills: [
    { x: -8, z: -150, r: 26, h: 0.7 },   // a soft swell in the first landing area
    { x: 14, z: -268, r: 20, h: -0.6 },  // a shallow dip right of the landing zone
    { x: -42, z: -90, r: 22, h: 2.4 },   // mounds in the left rough (not a field)
    { x: -46, z: -300, r: 26, h: 2.8 },
  ],
  green: { cx: 2, cz: -340, rx: 17, rz: 14, raise: 0.3, contour: (x, z) => 0.004 * (x - 2) },
  fairways: [{ pts: [{ x: 0, z: -24, w: 13 }, { x: 0, z: -110, w: 24 }, { x: 0, z: -290, w: 24 }, { x: 2, z: -322, w: 14 }] }],
  bunkers: [
    { cx: -21, cz: -238, rx: 7, rz: 11, depth: 0.45 },  // left of the landing zone, shallow
    { cx: -14, cz: -330, rx: 5, rz: 7, depth: 0.9 },    // front left of the green
  ],
  // the creek runs far right of the fairway, beyond a wide strip of rough
  creek: { pts: [{ x: 50, z: 20, w: 2.4 }, { x: 44, z: -120, w: 2.6 }, { x: 47, z: -250, w: 2.8 }, { x: 40, z: -370, w: 2.8 }], depth: 1.3, bank: 3, lip: 'rough' },
  ob: { x0: -62, x1: 62, z0: -372, z1: 18 },
  obstacles: [
    pine(-36, -60, 1), pine(-40, -72, 1.1), pine(-33, -178, 0.95), pine(-38, -192, 1.05),
    pine(32, -150, 1), pine(30, -300, 0.95),
  ],
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
