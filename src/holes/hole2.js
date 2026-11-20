// Pocket Links #2: a long, rolling par 5 with a raised tee, a big hill in the drive zone,
// a side slope toward a pond, a cross bunker and a raised two-level green.
import { ss, ell, bump } from '../core/terrain.js';
import { treesFrom } from './trees.js';

const GREEN = { cx: 22, cz: -440, rx: 17, rz: 14 };
const BUNKERS = [
  { cx: 16,  cz: -237, rx: 6,   rz: 10 },  // fairway bunker right of the drive zone
  { cx: 12,  cz: -385, rx: 8,   rz: 3.5 }, // cross bunker in the lay-up zone
  { cx: 1,   cz: -437, rx: 4.5, rz: 6 },   // green: front left
  { cx: 44,  cz: -446, rx: 4,   rz: 7 },   // green: right
  { cx: 24,  cz: -460, rx: 9,   rz: 3 },   // green: back
];
const POND = { cx: -16, cz: -300, rx: 13, rz: 20 };

// Hills and hollows: each one is a smooth bump (h > 0) or dip (h < 0) of radius r
const HILLS = [
  { x: 0,   z: -95,  r: 30, h: -1.8 }, // valley in front of the raised tee
  { x: 2,   z: -195, r: 22, h: 3.4 },  // big hill in the drive zone: land past the top and run!
  { x: -15, z: -150, r: 10, h: 1.6 },  // mound left
  { x: 16,  z: -168, r: 11, h: 1.8 },  // mound right
  { x: 6,   z: -262, r: 20, h: -1.5 }, // valley behind the big hill
  { x: 32,  z: -318, r: 12, h: 2.2 },  // mound on the right of the second shot
  { x: 20,  z: -352, r: 22, h: 1.0 },  // swell rising toward the green
  { x: 13,  z: -406, r: 9,  h: -1.1 }, // hollow short of the green that catches weak shots
];

function fairwayCenter(z) { return 22 * ss(-200, -360, z); } // dogleg right in the second half
function inFairway(x, z) {
  if (z > -28 || z < -424) return false;
  const taper = Math.min((-28 - z) / 8, (z + 424) / 8, 1);
  return Math.abs(x - fairwayCenter(z)) < 14 * Math.sqrt(taper);
}

// Ground height (meters) at any (x, z). Everything that touches the ground uses this.
function heightAt(x, z) {
  let h = 0;
  // Raised tee
  h += 3 * (1 - ss(6, 18, Math.max(Math.abs(x) * 0.9, Math.abs(z))));
  for (const b of HILLS) h += bump(x, z, b);
  // Gentle climb up to the green
  h += 1.2 * ss(-260, -420, z);
  const fc = fairwayCenter(z);
  // Side slope through the second landing area: right side high, so balls drift left toward the pond
  h += 0.04 * (x - fc) * ss(-250, -270, z) * (1 - ss(-330, -350, z));
  // Rough: banks that rise away from the fairway, plus some lumpy mounds
  const pe = Math.sqrt(ell(x, z, POND)), ge = Math.sqrt(ell(x, z, GREEN));
  const dx = Math.abs(x - fc);
  const rw = ss(15, 26, dx) * ss(1.2, 2.2, pe) * ss(1.3, 2.5, ge) * ss(12, 24, Math.abs(z));
  h += rw * (0.035 * Math.max(0, dx - 20) + 0.6 * Math.sin(x / 7.3 + z / 13.1) * Math.sin(z / 9.7 - x / 17.3));
  // Pond bowl and bunker hollows
  h -= 2.4 * (1 - ss(0.5, 1.05, pe));
  for (const b of BUNKERS) h -= 0.35 * (1 - ss(0.2, 1.15, Math.sqrt(ell(x, z, b))));
  // Raised green with its own contours
  h += 1.8 * (1 - ss(1.05, 2.0, ge));
  const gw = 1 - ss(0.85, 1.45, ge);
  if (gw > 0) {
    h += gw * (
      0.022 * (GREEN.cz - z) +                                    // tilts back to front
      0.018 * (x - GREEN.cx) +                                    // right side higher: putts break left
      0.6 * (0.5 + 0.5 * Math.tanh((GREEN.cz - 2 - z) / 2.2)) +   // a ridge: the back half is a higher tier
      0.3 * Math.exp(-((x - 15) ** 2 + (z + 433) ** 2) / 9)       // small hump front left
    );
  }
  // Flatten out far from the course
  const out = Math.max(0, Math.abs(x) - 64, z - 22, -490 - z);
  return h * (1 - ss(0, 45, out));
}

// The pond's water level sits a little below the lowest point of its rim
const WATER_Y = (() => {
  let m = Infinity;
  for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; m = Math.min(m, heightAt(POND.cx + Math.cos(a) * POND.rx, POND.cz + Math.sin(a) * POND.rz)); }
  return m - 0.15;
})();

function surfaceAt(x, z) {
  if (Math.abs(x) > 60 || z > 22 || z < -490) return 'ob';
  if (Math.abs(x) < 3.5 && z > -4 && z < 4) return 'tee';
  if (ell(x, z, POND) < 1.2 && heightAt(x, z) < WATER_Y) return 'water';
  for (const b of BUNKERS) if (ell(x, z, b) < 1) return 'sand';
  if (ell(x, z, GREEN) < 1) return 'green';
  if (ell(x, z, GREEN, 1.8) < 1) return 'fringe';
  if (inFairway(x, z)) return 'fairway';
  return 'rough';
}

// K8: the trees inside the OB line, as [x, z, size] (fixed; generated once, see trees.js)
const TREES_IN_PLAY = [
  [30.3, -206.9, 1.40],
  [50.9, -31.9, 1.17],
  [-54.2, -207.9, 0.83],
  [-58.9, -392.7, 1.40],
  [-41.9, -228.3, 1.23],
  [-48.9, -301.6, 1.03],
  [-56.0, -423.0, 1.43],
  [46.4, -135.0, 0.94],
  [38.7, -487.6, 1.03],
  [-31.6, -198.0, 1.09],
  [55.8, -175.0, 1.04],
  [-52.4, -111.2, 1.02],
  [50.8, -61.4, 0.92],
  [58.5, -121.1, 0.89],
  [-18.2, -18.7, 1.41],
  [53.0, -406.9, 1.49],
  [-15.9, -482.2, 1.28],
  [-51.2, -460.6, 0.91],
  [-50.4, -116.9, 0.90],
  [44.2, -199.8, 0.89],
  [-31.0, -136.2, 1.00],
  [5.5, -470.4, 1.45],
  [55.5, -283.9, 1.37],
  [-56.4, -236.2, 1.33],
  [-57.4, -324.2, 1.27],
  [-54.9, -483.1, 1.09],
  [-48.1, -261.0, 1.39],
  [35.4, -475.4, 1.28],
  [-37.4, -450.0, 1.39],
  [38.2, -73.5, 1.14],
  [27.6, 10.2, 1.35],
  [-47.5, -335.5, 0.82],
  [-20.5, -477.0, 1.35],
  [42.8, -244.8, 0.93],
  [-46.1, -51.1, 1.16],
  [-39.3, -384.5, 1.45],
  [-2.7, -479.5, 1.28],
  [55.2, -480.2, 0.98],
  [-35.6, -458.9, 1.24],
  [-55.5, -217.4, 1.17],
  [53.8, -373.3, 1.20],
  [-46.3, -46.9, 1.32],
  [27.1, -44.5, 0.89],
  [28.9, -136.5, 1.27],
  [-58.1, -248.0, 1.07],
  [38.1, -122.2, 1.16],
  [-40.6, -205.4, 0.92],
  [12.2, -488.7, 1.21],
  [48.1, -320.4, 1.09],
  [-35.4, -129.0, 0.81],
  [-45.0, -314.2, 1.13],
  [-46.3, -486.2, 1.40],
  [48.4, -311.7, 1.33],
  [52.5, -255.6, 1.43],
  [-52.7, -158.0, 1.04],
  [43.5, -477.8, 1.42],
  [-36.6, 4.5, 1.46],
  [-35.2, -228.4, 1.08],
  [56.7, -427.4, 1.48],
  [51.5, -325.1, 0.86],
  [-41.9, -100.7, 0.85],
  [41.4, -268.1, 1.22],
  [47.4, -298.0, 0.84],
  [-24.8, -437.2, 0.96],
  [-22.4, 14.3, 1.46],
  [-44.4, -194.6, 1.31],
  [44.5, -481.9, 1.40],
  [-29.9, -44.6, 1.49],
  [-49.4, -331.4, 1.21],
  [-59.8, -420.4, 1.41],
  [-39.7, -303.0, 1.49],
  [-33.4, -467.2, 0.98],
  [-32.3, -282.7, 1.41],
  [-27.1, -154.8, 1.17],
  [48.4, -78.1, 1.01],
  [-43.9, -233.1, 1.13],
  [35.4, -7.4, 1.03],
  [-37.6, -276.3, 0.83],
  [-39.5, -48.1, 1.32],
];

export default {
  id: 'pl-02', number: 2, name: 'Pocket Links #2', par: 5, maxStrokes: 12, difficulty: 3,
  biome: 'proto-default', // AP5: the biome set (src/biomes/), the look only
  tee: { x: 0, z: 0 }, cup: { x: 26, z: -448 },
  // S18: the tee shot's default aim, the dogleg corner in the middle of the fairway (a full Driver
  // carries the big hill and runs out to about here). Approaches aim at the centre of the green.
  aimTarget: { x: 9, z: -270 },
  bag: ['driver', '3w', '5i', '7i', '9i', 'pw', 'sw', 'putter'],
  windMax: 5.5,
  weather: { type: 'clear', wetness: 0 },
  // A little quicker than hole 1 so the slopes really show
  surfaceOverrides: {
    fairway: { keep: .45, decel: 2.2 },
    fringe:  { decel: 3.0 },
    green:   { keep: .34, decel: 0.6 }, // S17: faster green, 0.8 → 0.6
  },
  map: { x0: -70, x1: 70, z0: -500, z1: 25 },
  features: { green: GREEN, bunkers: BUNKERS, pond: POND, hills: HILLS, waterY: WATER_Y },
  obstacles: treesFrom(TREES_IN_PLAY), // K8
  heightAt, surfaceAt,

  // ---- Looks only (read by src/game, never by the physics) ----
  scenery: {
    fog: [260, 760], cameraFar: 2000,
    // A lower sun and softer fill light than hole 1 so the hills cast visible shading
    hemi: 1.15, sun: { intensity: 2.1, pos: [-90, 70, 30] },
    ground: { size: 2400, y: -3.9 }, // K13: below the lowest terrain (the pond bowl, -3.72 m); it was -0.6 and poked through the hollows
    // Terrain grid: fine near the course (finest on the green), coarse far away
    mesh: {
      xs: [[-260, -70, 10], [-70, -2, 1], [-2, 48, 0.5], [48, 70, 1], [70, 260, 10]],
      zs: [[-760, -500, 10], [-500, -468, 1], [-468, -418, 0.5], [-418, 25, 1], [25, 165, 10]],
    },
    paint: { res: 6, stripe: 6, green: 'grid', border: true },
    water: { ...POND, scale: 1.25, y: WATER_Y },
    stakes: { x: 60, z0: 18, z1: -490, step: 12 },
    trees: {
      count: 320, xSpan: 300, zTop: 80, zSpan: 640, sink: 0.2,
      exclude: (x, z) =>
        (z < -20 && z > -430 && Math.abs(x - fairwayCenter(z)) < 27) ||
        ell(x, z, GREEN, 18) < 1 || ell(x, z, POND, 6) < 1 ||
        (Math.abs(x) < 18 && z > -30 && z < 20) ||
        (Math.abs(x) < 12 && z > 0), // keep the view behind the tee open
    },
    hills: { count: 16, dist: [520, 100], xz: [90, 50], y: [35, 30], posY: -10, cz: -230 },
    clouds: { count: 16, xSpan: 700, y: [80, 40], cz: -230, zOff: 0.4, zSpan: 800 },
    trail: 600,
    minimap: { w: 60, h: 220, mobileW: 46, mobileH: 168 },
  },
  intro: {
    subtitle: 'Par 5 · {yards} yards · <i>prototype</i>',
    tagline: 'A long, rolling par 5 with a pond on the left and a two-level green.',
    steps: [
      '<b>Same swing as Hole 1:</b> aim with <kbd>◀</kbd> <kbd>▶</kbd>, change club with <kbd>▲</kbd> <kbd>▼</kbd>, and swing in three clicks (start, <b>power</b>, <b>accuracy</b>).',
      '<b>Hills matter here.</b> The ball runs on downhill slopes, stalls going uphill, kicks off the side of mounds, and putts curl toward the low side.',
      'The <b>Slope</b> readout (top left) tells you if you are hitting uphill or downhill and which way a putt will break.{grid}',
      'The aim marker already allows for the hills: it shows where a full-power shot comes down, and its label says whether that spot is above or below you.',
    ],
    grid: ' The grid on the green helps you read it too.', // Phase 7: only shown when the green has a grid (putt-grid setting)
    blurb: 'A long, rolling par 5 with a pond on the left, a two-level green, and a Driver in the bag. Reach it in two for an eagle chance!',
    link: { hole: 'pl-01', text: '← Back to Hole 1' },
    resultLink: { hole: 'pl-03', text: 'Next: Hole 3 (prototype par 4 with trees) →' }, // PM on PR #33
  },
};
