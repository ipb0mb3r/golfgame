// AP6: the ground material, pure part (DESIGN §8b "The ground material"). After the artist's recipe
// docs/art/style-r2/paint.js: a fine speckle + light brush dabs, broad mowing stripes, soft darker patches in the
// rough, an `edge` line round the fairway / tee / fringe, a bunker `lip`, a water `bank`, water deep-to-light with
// sparkle ripples, soft painted shadows under the trees in play. Every colour is a palette key of the hole's biome
// set; the patterns here are greyscale multipliers. Looks only: the physics surfaces never change.
// No Three.js, no DOM: the game (src/game/coursePainter.js, scene.js) paints and draws from these.
import { GROUND_LOOK } from './config.js';

// The ground detail level (?tune=GROUND_DETAIL): 0 = the flat look of before AP6, 1 = low, 2 = full
export const groundLevel = v => Math.max(0, Math.min(2, Math.round(Number(v) || 0)));

// The drawn ground kinds: the physics surfaces (`ob` = beyond the stakes) plus the drawn-only bands
export const KINDS = Object.freeze(['ob', 'rough', 'fairway', 'tee', 'fringe', 'green', 'sand', 'water', 'rock', 'edge', 'lip', 'bank']);
export const KIND = Object.freeze(Object.fromEntries(KINDS.map((k, i) => [k, i])));
// physics surface → drawn kind (any other surface is drawn as rough, as before AP6)
export const kindOf = s => KIND[s] ?? KIND.rough;
// drawn kind → palette key (fairway / green take their stripe or grid colours apart)
export const KIND_KEYS = Object.freeze({ ob: 'deepRough', rough: 'rough', fairway: 'fairwayA', tee: 'tee', fringe: 'fringe', green: 'greenA',
  sand: 'sand', water: 'water', rock: 'rock', edge: 'edge', lip: 'lip', bank: 'bank' });

// ---- noise (the recipe's, deterministic; `seed` shifts the hash) ----
const fract = v => v - Math.floor(v);
export const hash = (x, z, seed = 0) => fract(Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453);
// cache (optional) = { xi, zi, a, b, c, d }: the last cell's corners (a painter scanning a row reuses them)
export function vnoise(x, z, cache = null) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  let a, b, c, d;
  if (cache && cache.xi === xi && cache.zi === zi) ({ a, b, c, d } = cache);
  else {
    a = hash(xi, zi); b = hash(xi + 1, zi); c = hash(xi, zi + 1); d = hash(xi + 1, zi + 1);
    if (cache) Object.assign(cache, { xi, zi, a, b, c, d });
  }
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const mod = (a, n) => ((a % n) + n) % n;
// fine speckle in −0.5..0.5: square cells of 1/k m; `period` (cells) makes it tile
export const speck = (x, z, k, seed = 0, period = 0) => {
  const cx = Math.floor(x * k), cz = Math.floor(z * k);
  return hash(period ? mod(cx, period) : cx, period ? mod(cz, period) : cz, seed) - 0.5;
};
// light brush dabs in −1..1 (0 = none): one short soft stroke per `cell` m, `len` × `wid` m, near `angle`
export function dabs(x, z, cell, len, wid, angle, seed = 0, period = 0) {
  const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
  let best = 0;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const hx = period ? mod(cx + i, period) : cx + i, hz = period ? mod(cz + j, period) : cz + j;
    const h = hash(hx, hz, seed), h2 = hash(hz + 7.3, hx - 3.1, seed);
    const px = (cx + i + h) * cell, pz = (cz + j + h2) * cell, a = angle + (h - 0.5) * 0.8;
    const dx = x - px, dz = z - pz, u = dx * Math.cos(a) + dz * Math.sin(a), w = -dx * Math.sin(a) + dz * Math.cos(a);
    const d = (u / len) ** 2 + (w / wid) ** 2;
    if (d < 1) { const v = (1 - d) * (h2 > 0.5 ? 1 : -1); if (Math.abs(v) > Math.abs(best)) best = v; }
  }
  return best;
}

// ---- the shared tiling detail texture (greyscale, seeded, made in code: no image file) ----
// RGBA8, size × size px for `tile` m: R = speckle (128 = none), G = brush dabs (128 = none), B = A = 255.
// The shader maps it on the world (turned by `turn`) and multiplies each kind's amounts (the surface mask).
export function detailTexture(look = GROUND_LOOK) {
  const { size, tile, speck: k, dabCell, dabLen, dabWid } = look.texture;
  const data = new Uint8Array(size * size * 4), sp = Math.round(tile * k), dp = Math.round(tile / dabCell);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const x = (i + 0.5) / size * tile, z = (j + 0.5) / size * tile, o = (j * size + i) * 4;
    data[o] = Math.round((speck(x, z, sp / tile, look.seed, sp) + 0.5) * 255);
    data[o + 1] = Math.round((dabs(x, z, tile / dp, dabLen, dabWid, 1.3, look.seed, dp) + 1) * 127.5);
    data[o + 2] = data[o + 3] = 255;
  }
  return { data, size };
}

// ---- the drawn bands (edge, lip, bank) and the water's depth, from the painted surfaces ----
// Chamfer distance (px, 1 / √2 steps) from every pixel to the nearest pixel where isSrc(i) (or isSrc[i], an array)
export function distanceTo(W, H, isSrc) {
  const d = new Float32Array(W * H), INF = 1e9, D = Math.SQRT2;
  if (typeof isSrc === 'function') for (let i = 0; i < W * H; i++) d[i] = isSrc(i) ? 0 : INF;
  else for (let i = 0; i < W * H; i++) d[i] = isSrc[i] ? 0 : INF; // a flag per pixel (faster)
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i; let v = d[k];
    if (i > 0) v = Math.min(v, d[k - 1] + 1);
    if (j > 0) { v = Math.min(v, d[k - W] + 1); if (i > 0) v = Math.min(v, d[k - W - 1] + D); if (i < W - 1) v = Math.min(v, d[k - W + 1] + D); }
    d[k] = v;
  }
  for (let j = H - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) {
    const k = j * W + i; let v = d[k];
    if (i < W - 1) v = Math.min(v, d[k + 1] + 1);
    if (j < H - 1) { v = Math.min(v, d[k + W] + 1); if (i < W - 1) v = Math.min(v, d[k + W + 1] + D); if (i > 0) v = Math.min(v, d[k + W - 1] + D); }
    d[k] = v;
  }
  return d;
}

// base = the physics kinds per pixel (Uint8Array, kindOf), W × H at `res` px per m →
// { kinds (with edge / lip / bank), depth (m from the shore, water pixels only) }.
// A pixel is in a band when the nearest source pixel's edge is less than the band's width away.
export function groundKinds(base, W, H, res, look = GROUND_LOOK) {
  const K = KIND, kinds = Uint8Array.from(base), depth = new Float32Array(W * H);
  const within = (d, w) => d - 0.5 < w * res, n = W * H;
  const flags = test => { const f = new Uint8Array(n); for (let i = 0; i < n; i++) f[i] = test(base[i]) ? 1 : 0; return f; };
  const dCourse = distanceTo(W, H, flags(b => b === K.fairway || b === K.tee || b === K.fringe));
  const water = base.includes(K.water), sand = base.includes(K.sand);
  const dWater = water ? distanceTo(W, H, flags(b => b === K.water)) : null;
  const dShore = water ? distanceTo(W, H, flags(b => b !== K.water)) : null;
  const dNotSand = sand ? distanceTo(W, H, flags(b => b !== K.sand)) : null;
  for (let i = 0; i < W * H; i++) {
    const b = base[i];
    if (b === K.water) { depth[i] = (dShore[i] - 0.5) / res; continue; }
    if (dWater && (b === K.rough || b === K.ob || b === K.fairway || b === K.fringe) && within(dWater[i], look.bank)) { kinds[i] = K.bank; continue; }
    if ((b === K.rough || b === K.ob) && within(dCourse[i], look.edge)) kinds[i] = K.edge;
    else if (b === K.sand && within(dNotSand[i], look.lip)) kinds[i] = K.lip;
  }
  return { kinds, depth };
}

// ---- colours ----
const CACHES = {}; // per kind: the last noise cell (the result never depends on it)
// The low-frequency part of a kind's texture (base + soft patches / rock bands): painted into the course map
export function lowDetail(kind, x, z, look = GROUND_LOOK) {
  const g = look.kinds[kind]; if (!g) return 1;
  const cache = CACHES[kind] ??= { xi: NaN, zi: NaN, a: 0, b: 0, c: 0, d: 0 };
  let v = g.base;
  if (g.patch) v += g.patch[0] * vnoise(x / g.patch[1], z / g.patch[1], cache);
  if (g.bands) v += g.bands[0] * Math.floor(vnoise(x / g.bands[1], z / g.bands[1], cache) * g.bands[2]) / g.bands[2];
  return v;
}
// The fine part, evaluated per course-map pixel (level 1; level 2 draws it from the texture): the speckle only.
// The dabs (0.22 m wide) are under one map pixel (0.13–0.25 m), so they would only cost time (×3 to paint).
export function fineDetail(kind, x, z, look = GROUND_LOOK) {
  const g = look.kinds[kind];
  return g?.speck ? g.speck * speck(x, z, look.texture.speck, look.seed) : 0;
}
// The water's colour: water → waterDeep with the depth, plus the recipe's sparkle ripples
export function waterColour(P, x, z, depth, look = GROUND_LOOK) {
  const t = Math.min(1, depth / look.deep);
  let c = P.water.map((v, i) => v + (P.waterDeep[i] - v) * t);
  const w = Math.sin(x * 1.1 + 2.4 * Math.sin(z * 0.42)) * Math.sin(z * 0.9 + 1.3 * Math.sin(x * 0.3));
  for (const [at, share] of look.sparkle) if (w > at) { c = c.map(v => v + (255 - v) * share); break; }
  return c;
}
// Today's stripes (hole data `stripe` m across the fairway; the green's 2.5 m diagonals) and the 2 m putting grid
export const fairwayStripe = (z, w) => (Math.floor(z / w) & 1) === 1;      // true = fairwayA
export const greenStripe = (x, z) => (Math.floor((x - z) / 2.5) & 1) === 1; // true = greenA
export const GRID = Object.freeze({ step: 2, line: 0.17 });
export const onGridLine = (x, z) => { const fx = mod(x, GRID.step), fz = mod(z, GRID.step); return fx < GRID.line || fz < GRID.line; };

// One course-map pixel: P = palette as [r, g, b] 0..255 per key. level 2 leaves the stripes, the putting grid
// and the fine detail to the shader (fairway = fairwayA, green = greenA or gridFill).
// `out` (optional) = an [r, g, b] array to fill (the painter reuses one: no allocation per pixel)
export function groundColour(P, kind, x, z, { level, stripe, green, depth = 0, look = GROUND_LOOK }, out = [0, 0, 0]) {
  const name = KINDS[kind];
  if (name === 'water') return waterColour(P, x, z, depth, look);
  let c;
  if (name === 'fairway') c = level === 1 && !fairwayStripe(z, stripe) ? P.fairwayB : P.fairwayA;
  else if (name === 'green') {
    if (green === 'grid') c = level === 1 && onGridLine(x, z) ? P.gridLine : P.gridFill;
    else c = level === 1 && !greenStripe(x, z) ? P.greenB : P.greenA;
  } else c = P[KIND_KEYS[name]];
  const d = lowDetail(name, x, z, look) + (level === 1 ? fineDetail(name, x, z, look) : 0);
  out[0] = Math.min(255, c[0] * d); out[1] = Math.min(255, c[1] * d); out[2] = Math.min(255, c[2] * d);
  return out;
}

// The shader's surface mask (level 2), RGBA8 at maskScale × the map: R = fairway (mowing stripes), G = green
// (stripes or grid), B = speckle amount, A = dab amount (each ÷ 0.1). Each mask pixel averages the map pixels
// it covers. Rows run from z1 (near the tee) to z0, so the mask reads with the terrain's uv as it is.
export const MASK_AMOUNT = 0.1;
export function surfaceMask(kinds, W, H, look = GROUND_LOOK) {
  const n = Math.max(1, Math.round(1 / look.maskScale)), mW = Math.ceil(W / n), mH = Math.ceil(H / n);
  const data = new Uint8Array(mW * mH * 4);
  const rows = KINDS.map(k => { const g = look.kinds[k] ?? { speck: 0, dab: 0 };
    return [k === 'fairway' ? 255 : 0, k === 'green' ? 255 : 0, Math.min(255, g.speck / MASK_AMOUNT * 255), Math.min(255, g.dab / MASK_AMOUNT * 255)]; });
  for (let mj = 0; mj < mH; mj++) for (let mi = 0; mi < mW; mi++) {
    const acc = [0, 0, 0, 0]; let cnt = 0;
    for (let dj = 0; dj < n; dj++) for (let di = 0; di < n; di++) {
      const i = mi * n + di, j = mj * n + dj; if (i >= W || j >= H) continue;
      const r = rows[kinds[j * W + i]]; for (let c = 0; c < 4; c++) acc[c] += r[c]; cnt++;
    }
    const o = ((mH - 1 - mj) * mW + mi) * 4;
    for (let c = 0; c < 4; c++) data[o + c] = Math.round(acc[c] / cnt);
  }
  return { data, width: mW, height: mH };
}

// The soft shadows under the trees in play (hole obstacles of type tree): one ellipse per tree, pushed away from
// the sun (sunPos = toward the sun) and stretched along that way. → [{ x, z, rx, rz, angle }] in m / rad.
export function treeShadows(obstacles, sunPos, look = GROUND_LOOK) {
  const s = look.shadow, L = Math.hypot(sunPos[0], sunPos[2]);
  const ux = L > 1e-6 ? -sunPos[0] / L : 0, uz = L > 1e-6 ? -sunPos[2] / L : 0;
  return (obstacles ?? []).filter(o => o.type === 'tree').map(o => {
    const r = o.canopyR * s.radius;
    return { x: o.x + ux * o.canopyR * s.offset, z: o.z + uz * o.canopyR * s.offset, rx: r * s.stretch, rz: r * s.squash, angle: Math.atan2(uz, ux) };
  });
}
// The shadow's colour: `shadow` mixed toward white (multiplied into the ground)
export const shadowColour = (P, look = GROUND_LOOK) => P.shadow.map(v => Math.round(v + (255 - v) * look.shadow.light));
