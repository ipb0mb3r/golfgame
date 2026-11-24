// Paints the course onto a canvas: used as the ground texture and for the minimap.
import { createRng } from '../core/rng.js';
import { parseColour, sceneLight, fullPalette } from '../core/biome.js';
import { TUNE, GROUND_LOOK } from '../core/config.js';
import { groundLevel, kindOf, KIND, KINDS, baseKinds, groundKindsAA, groundColour, surfaceMask, treeShadows, shadowColour } from '../core/ground.js';

// AP5: every colour comes from the hole's biome set (DESIGN §8b): surface → palette key.
// A surface not listed is painted as rough; the ground outside OB is deepRough.
// S24: the deepRough SURFACE is the optional key roughDeep (its fallback: the rough, darker), not the OB ground's key.
const SURFACE_KEYS = { tee: 'tee', fringe: 'fringe', sand: 'sand', water: 'water', ob: 'deepRough', rough: 'rough', rock: 'rock', deepRough: 'roughDeep' };
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

// AP6: the ground (DESIGN §8b "The ground material"). → { canvas, mask, level, stripe, green }:
// canvas = the painted course map (the terrain's colour and the minimap), mask = the shader's surface mask
// (level 2, else null; core/ground.js surfaceMask). Level 0 (?tune=GROUND_DETAIL:0) = the flat look of before AP6.
export function paintGround(hole, surfaceAt, biome, { green: greenOverride = null, level = groundLevel(TUNE.GROUND_DETAIL) } = {}) {
  const green = greenOverride ?? hole.scenery.paint.green, stripe = hole.scenery.paint.stripe;
  if (level === 0) return { canvas: paintCourse(hole, surfaceAt, biome, { green }), mask: null, level, stripe, green };
  const { map } = hole, { res, border } = hole.scenery.paint;
  const W = Math.round((map.x1 - map.x0) * res), H = Math.round((map.z1 - map.z0) * res);
  // the physics kind at a point in map pixels (u, v); the plain border is OB
  const kindAt = (u, v) => (border && (u < 2 || v < 2 || u >= W - 2 || v >= H - 2)) ? KIND.ob : kindOf(surfaceAt(map.x0 + u / res, map.z0 + v / res));
  const base = baseKinds(W, H, kindAt);
  // AP6 follow-up: smooth edges (owner on #125; the hard per-pixel path and its switch went in AP7e)
  const { kinds, depth, mix } = groundKindsAA(base, W, H, res, kindAt);
  const p = Object.fromEntries(Object.entries(fullPalette(biome.palette)).map(([k, c]) => [k, parseColour(c)]));
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'), img = ctx.createImageData(W, H), opts = { level, stripe, green, depth: 0 }, rgb = [0, 0, 0], sum = [0, 0, 0], NK = KINDS.length;
  for (let j = 0; j < H; j++) {
    const z = map.z0 + (j + 0.5) / res;
    for (let i = 0; i < W; i++) {
      const k = j * W + i, x = map.x0 + (i + 0.5) / res, m = mix ? mix.at[k] : -1; opts.depth = depth[k];
      let c;
      if (m < 0) c = groundColour(p, kinds[k], x, z, opts, rgb);
      else { // a mixed pixel: each kind's colour by the share of the pixel it covers
        c = sum.fill(0);
        for (let q = 0; q < NK; q++) {
          const w = mix.w[m * NK + q]; if (!w) continue;
          const cq = groundColour(p, q, x, z, opts, rgb);
          c[0] += cq[0] * w; c[1] += cq[1] * w; c[2] += cq[2] * w;
        }
      }
      img.data[k * 4] = c[0]; img.data[k * 4 + 1] = c[1]; img.data[k * 4 + 2] = c[2]; img.data[k * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // soft shadows under the trees in play, multiplied into the ground (no real-time shadows: phone budget)
  const spots = treeShadows(hole.obstacles, sceneLight(biome, hole.scenery).sunPos);
  if (spots.length) {
    const [sr, sg, sb] = shadowColour(p), { centre, mid, midAt } = GROUND_LOOK.shadow;
    ctx.globalCompositeOperation = 'multiply';
    for (const t of spots) {
      ctx.save();
      ctx.translate((t.x - map.x0) * res, (t.z - map.z0) * res); ctx.rotate(t.angle); ctx.scale(t.rx * res, t.rz * res);
      const gr = ctx.createRadialGradient(0, 0, 0.2, 0, 0, 1);
      gr.addColorStop(0, `rgba(${sr},${sg},${sb},${centre})`); gr.addColorStop(midAt, `rgba(${sr},${sg},${sb},${mid})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  return { canvas, mask: level === 2 ? surfaceMask(kinds, W, H, undefined, mix) : null, level, stripe, green };
}

// The flat painted course of before AP6 (GROUND_DETAIL 0), unchanged.
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
  const p = Object.fromEntries(Object.entries(fullPalette(biome.palette)).map(([k, c]) => [k, parseColour(c)]));
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
