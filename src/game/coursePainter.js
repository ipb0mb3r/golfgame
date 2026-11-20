// Paints the course onto a canvas: used as the ground texture and for the minimap.
import { createRng } from '../core/rng.js';
import { parseColour } from '../core/biome.js';

// AP5: every colour comes from the hole's biome set (DESIGN §8b): surface → palette key.
// A surface not listed is painted as rough; the ground outside OB is deepRough.
const SURFACE_KEYS = { tee: 'tee', fringe: 'fringe', sand: 'sand', water: 'water', ob: 'deepRough', rough: 'rough', rock: 'rock' };
// p = the palette as [r, g, b] 0..255 per key
const GREEN_STYLES = {
  // Diagonal stripes (hole 1): the green's two shades
  stripes: p => (x, z) => (Math.floor((x - z) / 2.5) & 1) ? p.greenA : p.greenB,
  // Grid lines every 2 m, the classic way to help read the slopes (hole 2)
  grid: p => (x, z) => {
    const fx = ((x % 2) + 2) % 2, fz = ((z % 2) + 2) % 2;
    return (fx < 0.17 || fz < 0.17) ? p.gridLine : p.gridFill;
  },
};

// biome = the hole's biome set (src/biomes/). `green` (optional) replaces the hole's own green style:
// the putt-grid setting (M4, core/menu.js greenStyle)
export function paintCourse(hole, surfaceAt, biome, { green: greenOverride = null } = {}) {
  const { map } = hole, { res, stripe, border } = hole.scenery.paint;
  const green = greenOverride ?? hole.scenery.paint.green;
  const W = Math.round((map.x1 - map.x0) * res), H = Math.round((map.z1 - map.z0) * res);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const r = createRng(7);
  const p = Object.fromEntries(Object.entries(biome.palette).map(([k, c]) => [k, parseColour(c)]));
  const colors = Object.fromEntries(Object.entries(SURFACE_KEYS).map(([s, k]) => [s, p[k]]));
  const greenColor = GREEN_STYLES[green](p);
  for (let j = 0; j < H; j++) {
    const z = map.z0 + (j + 0.5) / res;     // row 0 = far end (behind the green)
    for (let i = 0; i < W; i++) {
      const x = map.x0 + (i + 0.5) / res;
      // optional plain border: it gets stretched past the map by the terrain mesh
      const edge = border && (i < 2 || j < 2 || i >= W - 2 || j >= H - 2);
      const s = edge ? 'ob' : surfaceAt(x, z);
      const n = edge ? 0 : (r() - 0.5) * 10;
      let c;
      switch (s) {
        case 'fairway': c = (Math.floor(z / stripe) & 1) ? p.fairwayA : p.fairwayB; break;
        case 'green': c = greenColor(x, z); break;
        default: c = colors[s] || colors.rough;
      }
      const k = (j * W + i) * 4;
      img.data[k] = c[0] + n; img.data[k + 1] = c[1] + n; img.data[k + 2] = c[2] + n * 0.5; img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
