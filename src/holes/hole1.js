// Pocket Links #1: a flat par 3 over a pond, with three bunkers around the green.
import { ell } from '../core/terrain.js';
import { treesFrom } from './trees.js';

const GREEN = { cx: 3, cz: -150, rx: 15, rz: 12 };
const BUNKERS = [
  { cx: -15, cz: -147, rx: 6, rz: 4.5 },
  { cx: 9,   cz: -166, rx: 8, rz: 3.2 },
  { cx: 19,  cz: -140, rx: 3.5, rz: 3 },
];
const POND = { cx: -20, cz: -92, rx: 13, rz: 10 };

function fairwayCenter(z) { return 5 * Math.sin((z + 20) / 35); }
function inFairway(x, z) {
  if (z > -22 || z < -136) return false;
  const taper = Math.min((-22 - z) / 8, (z + 136) / 8, 1);
  return Math.abs(x - fairwayCenter(z)) < 13 * Math.sqrt(taper);
}

// K8: the trees inside the OB line, as [x, z, size] (fixed; generated once, see trees.js)
const TREES_IN_PLAY = [
  [28.3, -82.4, 1.40],
  [47.5, 10.6, 1.17],
  [-55.0, -181.1, 1.40],
  [44.8, -161.5, 1.29],
  [-45.7, -132.7, 1.03],
  [-52.3, -197.2, 1.43],
  [-24.4, 14.4, 1.26],
  [-45.9, -0.4, 1.24],
  [31.0, -115.8, 1.21],
  [-50.2, -157.6, 0.95],
  [-17.0, 17.6, 1.41],
  [27.8, -49.4, 1.11],
  [46.6, -106.1, 1.11],
  [41.3, -78.6, 0.89],
  [-53.6, -144.7, 1.27],
  [-44.9, -111.2, 1.39],
  [36.6, -192.2, 1.32],
  [49.1, -73.2, 1.11],
  [32.4, -173.9, 1.16],
  [-34.8, 0.5, 1.35],
  [39.9, -102.6, 0.93],
  [-43.0, 0.3, 1.16],
  [-36.7, -176.8, 1.45],
  [-8.9, -186.3, 0.88],
  [-51.8, -88.0, 1.17],
];

export default {
  id: 'pl-01', number: 1, name: 'Pocket Links #1', par: 3, maxStrokes: 10,
  tee: { x: 0, z: 0 }, cup: { x: 4, z: -152 },
  bag: ['3w', '5i', '7i', '9i', 'pw', 'sw', 'putter'],
  windMax: 5.5,
  weather: { type: 'clear', wetness: 0 },
  surfaceOverrides: {},           // hole 1 uses the base surface table as it is
  map: { x0: -60, x1: 60, z0: -180, z1: 20 },
  features: { green: GREEN, bunkers: BUNKERS, pond: POND },
  obstacles: treesFrom(TREES_IN_PLAY), // K8

  heightAt() { return 0; },       // flat
  surfaceAt(x, z) {
    if (Math.abs(x) > 55 || z > 18 || z < -200) return 'ob';
    if (Math.abs(x) < 3.5 && z > -4 && z < 4) return 'tee';
    if (ell(x, z, POND) < 1) return 'water';
    for (const b of BUNKERS) if (ell(x, z, b) < 1) return 'sand';
    if (ell(x, z, GREEN) < 1) return 'green';
    if (ell(x, z, GREEN, 1.8) < 1) return 'fringe';
    if (inFairway(x, z)) return 'fairway';
    return 'rough';
  },

  // ---- Looks only (read by src/game, never by the physics) ----
  scenery: {
    sky: 0x9fd3ff, fog: [160, 480], cameraFar: 1500,
    hemi: 1.6, sun: { intensity: 1.6, pos: [-60, 120, 40] },
    ground: { size: 1600, y: -0.1 }, // K13: below the lowest terrain (0 m) by GROUND_PLANE_MARGIN
    // The terrain mesh only covers the painted map: a flat hole is one quad, like the old course plane
    mesh: { xs: [[-60, 60, 120]], zs: [[-180, 20, 200]] },
    paint: { res: 7.5, stripe: 5, green: 'stripes', border: false },
    flagColor: 0xff3b3b, teeColor: 0x2b6cff,
    stakes: { x: 55, z0: 15, z1: -200, step: 12 },
    trees: {
      count: 170, xSpan: 280, zTop: 70, zSpan: 340, sink: 0,
      exclude: (x, z) =>
        (z < 0 && z > -140 && Math.abs(x - fairwayCenter(z)) < 27) ||
        ell(x, z, GREEN, 16) < 1 || ell(x, z, POND, 4) < 1 ||
        (Math.abs(x) < 16 && z > -20 && z < 20) ||
        (Math.abs(x) < 10 && z > 0), // keep the view behind the tee open
    },
    hills: { count: 14, dist: [330, 80], xz: [70, 40], y: [25, 25], posY: -8, cz: -80 },
    clouds: { count: 12, xSpan: 600, y: [70, 40], cz: -80, zOff: 0.3, zSpan: 500 },
    trail: 400,
    minimap: { w: 96, h: 160, mobileW: 78, mobileH: 130 },
  },
  intro: {
    subtitle: 'Par 3 · {yards} yards',
    steps: [
      '<b>Aim</b> with <kbd>◀</kbd> <kbd>▶</kbd> (arrow keys or the buttons). The yellow ring shows where a full-power shot lands.',
      '<b>Pick a club</b> with <kbd>▲</kbd> <kbd>▼</kbd> or the ‹ › buttons. The best club is chosen for you.',
      '<b>Swing in three clicks</b> (mouse, tap, or <kbd>Space</kbd>):\n        <br>1st click starts the meter,\n        <br>2nd click sets <b>power</b> (the ⚑ mark is roughly the pin),\n        <br>3rd click sets <b>accuracy</b>: stop on the <span style="color:var(--good)">green line</span> to hit it straight. Too early hooks left, too late slices right.',
      'Watch the <b>wind</b> arrow (top right). It pushes the ball in the air.',
    ],
    blurb: 'Sink it in as few strokes as you can. Water costs a penalty stroke.',
    link: { hole: 'pl-02', text: 'Try Hole 2 (prototype par 5 with hills) →' },
    resultLink: { hole: 'pl-02', text: 'Next: Hole 2 (prototype) →' },
  },
};
