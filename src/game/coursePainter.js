// Paints the course onto a canvas: used as the ground texture and for the minimap.
import { createRng } from '../core/rng.js';

const COLORS = {
  tee: [118, 192, 82], fringe: [96, 172, 66], sand: [232, 214, 160], water: [58, 128, 196],
  ob: [62, 120, 46], rough: [74, 140, 52],
  fairwayA: [112, 182, 70], fairwayB: [101, 169, 62],
};
const GREEN_STYLES = {
  // Diagonal stripes (hole 1)
  stripes: (x, z) => (Math.floor((x - z) / 2.5) & 1) ? [126, 206, 92] : [117, 196, 85],
  // Grid lines every 2 m, the classic way to help read the slopes (hole 2)
  grid: (x, z) => {
    const fx = ((x % 2) + 2) % 2, fz = ((z % 2) + 2) % 2;
    return (fx < 0.17 || fz < 0.17) ? [92, 168, 70] : [124, 204, 90];
  },
};

export function paintCourse(hole, surfaceAt) {
  const { map } = hole, { res, stripe, green, border } = hole.scenery.paint;
  const W = Math.round((map.x1 - map.x0) * res), H = Math.round((map.z1 - map.z0) * res);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const r = createRng(7);
  const greenColor = GREEN_STYLES[green];
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
        case 'fairway': c = (Math.floor(z / stripe) & 1) ? COLORS.fairwayA : COLORS.fairwayB; break;
        case 'green': c = greenColor(x, z); break;
        default: c = COLORS[s] || COLORS.rough;
      }
      const k = (j * W + i) * 4;
      img.data[k] = c[0] + n; img.data[k + 1] = c[1] + n; img.data[k + 2] = c[2] + n * 0.5; img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
