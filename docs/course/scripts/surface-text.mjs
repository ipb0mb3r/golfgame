// Course designer helper (not part of the game): print a hole's surfaces as text, one character every 4 m across,
// a row every 12 m. Cheap way to check a shape without a screenshot.
//   node docs/course/scripts/surface-text.mjs <hole-id> <x0> <x1> <z0> <z1>   e.g. mdw-05 0 168 -60 -310
// F fairway, . rough, D deep rough, S sand, G green, f fringe, ~ water, T tee, space = OB. Last line: the closest
// deep rough to the fairway (m).
import { HOLES, DEV_HOLES } from '../../../src/holes/sets.js';
const [, , id, x0, x1, z0, z1] = process.argv, h = HOLES[id] ?? DEV_HOLES[id];
const C = { fairway: 'F', rough: '.', deepRough: 'D', ob: ' ', sand: 'S', green: 'G', fringe: 'f', tee: 'T', water: '~', rock: 'R' };
for (let z = +z0; z >= +z1; z -= 12) { let row = ''; for (let x = +x0; x <= +x1; x += 4) row += C[h.surfaceAt(x, z)] ?? '?'; console.log(String(z).padStart(5), row); }
let best = Infinity;
for (let z = +z0; z > +z1; z -= 1) for (let x = +x0; x < +x1; x += 1) if (h.surfaceAt(x, z) === 'deepRough')
  for (let a = 0; a < 16; a++) for (let d = 1; d < 20; d++) if (h.surfaceAt(x + Math.cos(a * Math.PI / 8) * d, z + Math.sin(a * Math.PI / 8) * d) === 'fairway') { best = Math.min(best, d); break; }
console.log('closest deep rough to fairway (m):', best);
