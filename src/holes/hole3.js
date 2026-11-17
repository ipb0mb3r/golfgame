// Pocket Links #3 (owner design, Phase K): a par 4 dogleg right, the test bed for trees and rock.
// A wide landing area off the tee with one tree in the middle of the fairway. The inside of the
// corner is a stand of trees: the safe route plays out to the left of them and turns, a brave
// player cuts over them (a full, well-struck drive clears the leaves, a weak or mishit one doesn't).
// Straight drives that run through the corner find a rock outcrop with two boulders.
import { ss, ell, bump } from '../core/terrain.js';

const TEE = { x: 0, z: 0 };
const CORNER = { x: 0, z: -222 };          // where the first leg turns right
const GREEN = { cx: 146, cz: -238, rx: 14, rz: 12 };
const CUP = { x: 150, z: -241 };
const BUNKERS = [
  { cx: 128, cz: -250, rx: 4, rz: 7 },     // front left of the green
  { cx: 162, cz: -228, rx: 6, rz: 3.5 },   // back right
];
const OUTCROP = { cx: -6, cz: -258, rx: 13, rz: 9 }; // rock beyond the corner (K1)
// Leg A: tee → corner, leg B: corner → green. Half-widths in meters.
const LEG_A = { ax: 0, az: -28, bx: CORNER.x, bz: CORNER.z };
const LEG_B = { ax: CORNER.x, az: CORNER.z, bx: GREEN.cx - 16, bz: GREEN.cz + 2 };

// Distance from (x, z) to the segment s, and how far along it (0..1)
function seg(x, z, s) {
  const dx = s.bx - s.ax, dz = s.bz - s.az;
  const t = Math.min(1, Math.max(0, ((x - s.ax) * dx + (z - s.az) * dz) / (dx * dx + dz * dz)));
  return { d: Math.hypot(x - (s.ax + dx * t), z - (s.az + dz * t)), t };
}
// The first leg is narrow near the tee and WIDE in the landing area (z −150 … −230)
const halfA = z => 12 + 18 * ss(-90, -160, z);
function inFairway(x, z) {
  const a = seg(x, z, LEG_A), b = seg(x, z, LEG_B);
  if (a.d < halfA(z) && z < -28) return true;
  return b.d < 18 && b.t > 0;
}

// The trees (K2/K3). Sizes fit the game's ball flight: a full Driver peaks at about 11.5 m.
// trunkH = trunk height (the leaves are centred on its top), canopyR = leaf radius, canopyH = leaf height.
const tree = (x, z, s = 1) => ({ type: 'tree', x, z, trunkR: 0.35 * s, trunkH: 6.2 * s, canopyR: 3.6 * s, canopyH: 6.4 * s });
const LONE_TREE = { type: 'tree', x: -7, z: -203, trunkR: 0.45, trunkH: 6.5, canopyR: 4.5, canopyH: 8, onFairway: true }; // K8: on the fairway by design
const CORNER_TREES = [
  // the stand inside the corner: carried by a full drive on the cut line, 95–150 m out
  tree(30, -92, 0.95), tree(38, -100), tree(45, -96, 0.9), tree(52, -104, 1.05),
  tree(33, -110, 1.05), tree(42, -116), tree(50, -120, 0.95), tree(58, -114),
  tree(36, -128), tree(45, -134, 1.05), tree(54, -138), tree(62, -131, 0.95),
  tree(40, -146, 0.95), tree(49, -151), tree(58, -156, 1.05), tree(67, -150),
  // the corner itself, lining the right of the landing area
  tree(33, -165, 1.05), tree(42, -170, 0.95), tree(34, -183), tree(43, -192, 1.05),
  tree(66, -168), tree(75, -162, 0.95),
];
const BOULDERS = [
  { type: 'boulder', x: -12, z: -261, r: 1.6 },
  { type: 'boulder', x: 1, z: -265, r: 1.1 },
];

function heightAt(x, z) {
  let h = 0;
  // a slightly raised tee
  h += 1.2 * (1 - ss(5, 14, Math.max(Math.abs(x - TEE.x), Math.abs(z - TEE.z))));
  // gentle swells
  h += bump(x, z, { x: -10, z: -120, r: 30, h: 0.8 });
  h += bump(x, z, { x: 10, z: -190, r: 26, h: -0.6 });
  h += bump(x, z, { x: 80, z: -235, r: 30, h: 0.7 });
  // the rock outcrop rises out of the rough beyond the corner
  h += 2.2 * (1 - ss(0.3, 1.3, Math.sqrt(ell(x, z, OUTCROP))));
  // a raised green tilted toward the fairway
  const ge = Math.sqrt(ell(x, z, GREEN));
  h += 0.9 * (1 - ss(1.0, 1.9, ge));
  const gw = 1 - ss(0.85, 1.4, ge);
  if (gw > 0) h += gw * (0.012 * (x - GREEN.cx) - 0.01 * (z - GREEN.cz));
  for (const b of BUNKERS) h -= 0.3 * (1 - ss(0.2, 1.15, Math.sqrt(ell(x, z, b))));
  // rough banks away from the fairway
  const a = seg(x, z, LEG_A), b = seg(x, z, LEG_B);
  const off = Math.min(a.d - halfA(z), b.d - 18);
  h += 0.02 * Math.max(0, off - 6) * ss(1.3, 2.2, ge) * (1 - ss(0.5, 1.5, Math.sqrt(ell(x, z, OUTCROP))));
  // flatten out far away
  const out = Math.max(0, -70 - x, x - 190, z - 22, -290 - z);
  return h * (1 - ss(0, 40, out));
}

const OB = { x0: -62, x1: 182, z0: -282, z1: 20 };
function surfaceAt(x, z) {
  if (x < OB.x0 || x > OB.x1 || z > OB.z1 || z < OB.z0) return 'ob';
  if (Math.abs(x - TEE.x) < 3.5 && Math.abs(z - TEE.z) < 4) return 'tee';
  for (const b of BUNKERS) if (ell(x, z, b) < 1) return 'sand';
  if (ell(x, z, GREEN) < 1) return 'green';
  if (ell(x, z, GREEN, 1.8) < 1) return 'fringe';
  if (ell(x, z, OUTCROP) < 1) return 'rock';
  if (inFairway(x, z)) return 'fairway';
  return 'rough';
}

export default {
  id: 'pl-03', number: 3, name: 'Pocket Links #3', par: 4, maxStrokes: 10, difficulty: 2,
  tee: TEE, cup: CUP,
  // S18: the tee shot's default aim, right of the lone tree in the landing area (the corner). The
  // default Driver flies past the tree, so the aim warning is off for it (tests/obstacles.test.js).
  aimTarget: { x: 9, z: -222 },
  // K12: how the hole plays (tee → the corner → the cup), for the yardage on the intro card
  playLine: [TEE, CORNER, CUP],
  bag: ['driver', '3w', '5i', '7i', '9i', 'pw', 'sw', 'putter'],
  windMax: 4.5,
  weather: { type: 'clear', wetness: 0 },
  surfaceOverrides: {},
  map: { x0: -70, x1: 190, z0: -290, z1: 25 },
  features: { green: GREEN, bunkers: BUNKERS, outcrop: OUTCROP, corner: CORNER },
  // K2/K3: the physics, the aim warning, the 3D scene and the minimap all read this one list
  obstacles: [LONE_TREE, ...CORNER_TREES, ...BOULDERS],
  heightAt, surfaceAt,

  // ---- Looks only (read by src/game, never by the physics) ----
  scenery: {
    sky: 0x9fd3ff, fog: [240, 700], cameraFar: 1800,
    hemi: 1.3, sun: { intensity: 1.9, pos: [-80, 90, 40] },
    ground: { size: 2400, y: -0.75 }, // K13: below the lowest terrain (-0.60 m, the swale at the corner)
    mesh: {
      xs: [[-300, -70, 10], [-70, 116, 1], [116, 176, 0.5], [176, 190, 1], [190, 420, 10]],
      zs: [[-620, -290, 10], [-290, -258, 1], [-258, -218, 0.5], [-218, 25, 1], [25, 200, 10]],
    },
    paint: { res: 5, stripe: 6, green: 'stripes', border: true },
    flagColor: 0x40c4ff, teeColor: 0xffd400,
    stakes: { xs: [OB.x0, OB.x1], z0: 18, z1: -280, step: 12 },
    // decoration only, all of it out of bounds (the trees in play are `obstacles` above)
    trees: {
      count: 260, xSpan: 560, zTop: 90, zSpan: 520, sink: 0.1,
      exclude: (x, z) => (x > OB.x0 - 6 && x < OB.x1 + 6 && z < OB.z1 + 6 && z > OB.z0 - 6) || (Math.abs(x) < 14 && z > 0),
    },
    hills: { count: 16, dist: [460, 100], xz: [90, 50], y: [35, 30], posY: -10, cz: -140 },
    clouds: { count: 14, xSpan: 700, y: [80, 40], cz: -140, zOff: 0.4, zSpan: 700 },
    trail: 600,
    minimap: { w: 116, h: 140, mobileW: 90, mobileH: 109 },
  },
  intro: {
    subtitle: 'Par 4 · {yards} yards · <i>prototype</i>',
    steps: [
      '<b>Trees are in play here.</b> Hit a trunk and the ball bounces off. Fly into the leaves and it drops like a stone.',
      'The aim line turns <b style="color:#ff5a4a">red</b> when your shot would hit a tree or a rock, with a red marker where. High clubs fly over trees that low ones can\'t.',
      '<b>Cut the corner?</b> A full, well-struck drive over the trees on the right leaves a short pitch. Come up short and the trees catch it. The safe way is left of the lone tree and around.',
      '<b>Rock</b> is hard: the ball bounces high and runs a long way, and a shot from it is harder (max 90%).',
    ],
    blurb: 'A dogleg right with a lone tree in the landing area and a stand of trees in the corner. Play it safe, or cut it.',
    link: { hole: 'pl-01', text: '← Back to Hole 1' },
    resultLink: { hole: 'pl-01', text: '← Back to Hole 1' },
  },
};
