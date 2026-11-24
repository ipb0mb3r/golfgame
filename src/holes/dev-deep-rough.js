// S24: dev only. A flat practice spot to compare the lies side by side: a straight fairway, the plain rough on its
// left, a deep-rough strip along its right edge (the `deepRoughs` strip format) and a deep-rough pocket right of the
// green (the blob format). Not a real hole: it is in no set and no menu (sets.js DEV_HOLES), only
// ?hole=dev-deep-rough and the three test spots ?scenario=dr-fairway | dr-rough | dr-deep (scenarios.js
// DEV_SCENARIOS), each about 150 m from the flag. Dressed in meadow-day, which has no roughDeep colour of its own,
// so it shows the fallback (the rough, one DEEP_ROUGH_DARKEN step darker).
import { makeMdwHole, mdwIntro, oak } from './mdw-course.js';

export const DEV_DEEP_ROUGH_ID = 'dev-deep-rough';
// the three spots, all at z = −120 (≈ 147 m to the cup)
export const DEV_DEEP_ROUGH_SPOTS = Object.freeze({ fairway: { x: 0, z: -120 }, rough: { x: -22, z: -120 }, deepRough: { x: 20, z: -120 } });

export default makeMdwHole({
  id: DEV_DEEP_ROUGH_ID, number: 1, name: 'Dev · Deep rough', par: 4, difficulty: 1,
  tee: { x: 0, z: 0 }, cup: { x: 0, z: -265 },
  aimTarget: { x: 0, z: -200 },
  teePad: { h: 0.3, r: 4.5 },
  green: { cx: 0, cz: -265, rx: 14, rz: 11, raise: 0.2, contour: () => 0 },
  fairways: [{ pts: [{ x: 0, z: -25, w: 12 }, { x: 0, z: -250, w: 12 }] }],
  deepRoughs: [
    // the strip along the fairway's right edge (x 12…28), from the landing zone to short of the green
    { pts: [{ x: 20, z: -50 }, { x: 20, z: -235 }], w: 8 },
    // a greenside pocket right of the green
    { cx: 30, cz: -262, rx: 8, rz: 12, wob: 0.1, seed: 4 },
  ],
  ob: { x0: -60, x1: 60, z0: -300, z1: 16 },
  // two trees in the deep rough (trees may stand there; on the minimap their dots get a rough-coloured ring)
  obstacles: [oak(26, -185, 0.9), oak(25, -80, 0.9)],
  intro: mdwIntro({
    par: 4,
    tagline: 'Dev practice spot: fairway, rough and deep rough side by side.',
    steps: ['Rough on the left, deep rough on the right of the fairway.', 'Test spots: dr-fairway, dr-rough, dr-deep.', 'A deep-rough pocket guards the right of the green.'],
    blurb: 'Dev only (S24): compare the lies.',
  }),
});
