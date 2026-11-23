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

// The physics kind at every map pixel centre, kindAt(u, v) in pixel units. Faster than asking every pixel: the
// even pixels are asked first; a 2 × 2 block whose 4 × 4 even neighbours all agree takes their kind, the others
// ask kindAt themselves. The same map unless a surface is narrower than 2 px (0.5 m at 4 px / m): none is.
export function baseKinds(W, H, kindAt) {
  const cW = Math.ceil(W / 2) + 1, cH = Math.ceil(H / 2) + 1, c = new Uint8Array(cW * cH), base = new Uint8Array(W * H);
  for (let cj = 0; cj < cH; cj++) for (let ci = 0; ci < cW; ci++) c[cj * cW + ci] = kindAt(Math.min(2 * ci, W - 1) + 0.5, Math.min(2 * cj, H - 1) + 0.5);
  for (let cj = 0; cj < cH - 1; cj++) for (let ci = 0; ci < cW - 1; ci++) {
    const v = c[cj * cW + ci];
    let same = true;
    for (let b = Math.max(0, cj - 1); b <= Math.min(cH - 1, cj + 2) && same; b++)
      for (let a = Math.max(0, ci - 1); a <= Math.min(cW - 1, ci + 2); a++) if (c[b * cW + a] !== v) { same = false; break; }
    for (let dj = 0; dj < 2; dj++) for (let di = 0; di < 2; di++) {
      const i = 2 * ci + di, j = 2 * cj + dj; if (i >= W || j >= H) continue;
      base[j * W + i] = same || (di === 0 && dj === 0) ? v : kindAt(i + 0.5, j + 0.5);
    }
  }
  return base;
}

// ---- anti-aliased bands and boundaries (AP6 follow-up; the only path since AP7e, owner on #125) ----
// Deciding each pixel by its centre (before #125) showed a 0.6 m line's stair-steps at 4 px / m.
// The smooth version keeps the same rule but measures it below the pixel: the pixels where the surfaces change
// (an 8-neighbour of another kind) are sampled look.aa.sub² times (sampleKind), the band distances are true
// sub-pixel distances to the surface boundaries found there, and every pixel near a boundary or a band's
// outer line gets the share of each kind it covers (mix), which the painter blends. Same widths, same colours.

// Nearest-boundary-point transform: seed[k] ≥ 0 = pixel k holds a boundary point (px, pz in pixel units, the
// centre of pixel (i, j) is (i + 0.5, j + 0.5)). Two sweeps pass each pixel's nearest point on (8 neighbours).
// Only points nearer than `limit` px are kept (beyond, near[k] = −1), so only the seeds' box grown by `limit`
// is swept. → near: the point index per pixel.
export function nearestPoints(W, H, seed, px, pz, limit) {
  const n = W * H, near = new Int32Array(n).fill(-1), best = new Float32Array(n).fill(limit * limit);
  let i0 = W, i1 = -1, j0 = H, j1 = -1;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, s = seed[k]; if (s < 0) continue;
    near[k] = s; const dx = px[s] - i - 0.5, dz = pz[s] - j - 0.5; best[k] = dx * dx + dz * dz;
    if (i < i0) i0 = i; if (i > i1) i1 = i; if (j < j0) j0 = j; if (j > j1) j1 = j;
  }
  if (i1 < 0) return near;
  const g = Math.ceil(limit) + 1;
  i0 = Math.max(0, i0 - g); i1 = Math.min(W - 1, i1 + g); j0 = Math.max(0, j0 - g); j1 = Math.min(H - 1, j1 + g);
  // few seeds in a big box (a fairway's outline over the whole map): each seed's point is offered to the pixels
  // within `limit` of it instead (exact, and cheaper than sweeping the box)
  if (px.length * (2 * g + 1) ** 2 < (i1 - i0 + 1) * (j1 - j0 + 1) * 8) {
    const L2 = limit * limit;
    for (let s = 0; s < px.length; s++) {
      const x = px[s], z = pz[s], a0 = Math.max(0, Math.floor(x - limit)), a1 = Math.min(W - 1, Math.floor(x + limit));
      const b0 = Math.max(0, Math.floor(z - limit)), b1 = Math.min(H - 1, Math.floor(z + limit));
      for (let j = b0; j <= b1; j++) {
        const dz = z - j - 0.5, dz2 = dz * dz; if (dz2 >= L2) continue;
        for (let i = a0; i <= a1; i++) {
          const dx = x - i - 0.5, q = dx * dx + dz2, k = j * W + i;
          if (q < best[k]) { best[k] = q; near[k] = s; }
        }
      }
    }
    return near;
  }
  const relax = (k, m, cx, cz) => {
    const s = near[m]; if (s < 0) return;
    const dx = px[s] - cx, dz = pz[s] - cz, q = dx * dx + dz * dz;
    if (q < best[k]) { best[k] = q; near[k] = s; }
  };
  for (let j = j0; j <= j1; j++) {
    const cz = j + 0.5;
    for (let i = i0; i <= i1; i++) {
      const k = j * W + i, cx = i + 0.5;
      if (i > i0) relax(k, k - 1, cx, cz);
      if (j > j0) { relax(k, k - W, cx, cz); if (i > i0) relax(k, k - W - 1, cx, cz); if (i < i1) relax(k, k - W + 1, cx, cz); }
    }
    for (let i = i1 - 1; i >= i0; i--) relax(j * W + i, j * W + i + 1, i + 0.5, cz);
  }
  for (let j = j1; j >= j0; j--) {
    const cz = j + 0.5;
    for (let i = i1; i >= i0; i--) {
      const k = j * W + i, cx = i + 0.5;
      if (i < i1) relax(k, k + 1, cx, cz);
      if (j < j1) { relax(k, k + W, cx, cz); if (i < i1) relax(k, k + W + 1, cx, cz); if (i > i0) relax(k, k + W - 1, cx, cz); }
    }
    for (let i = i0 + 1; i <= i1; i++) relax(j * W + i, j * W + i - 1, i + 0.5, cz);
  }
  return near;
}

// base = the physics kinds at the pixel centres (baseKinds), sampleKind(u, v) = the physics kind at a point
// in pixel units (u = i + fraction) → { kinds (the main kind per pixel), depth, mix }. mix.at[k] = −1 (pixel k
// is all kinds[k]) or a row of mix.w: the share of each drawn kind (KINDS order, sums to 1).
export function groundKindsAA(base, W, H, res, sampleKind, look = GROUND_LOOK) {
  const K = KIND, NK = KINDS.length, n = W * H, S = look.aa.sub, SS = S * S;
  // 1. the pixels where the surfaces change: sampled S × S
  const subAt = new Int32Array(n).fill(-1), mixedList = [];
  for (let j = 0; j < H; j++) {
    const up = j > 0 ? -W : 0, dn = j < H - 1 ? W : 0;
    for (let i = 0; i < W; i++) {
      const k = j * W + i, b = base[k], l = i > 0 ? -1 : 0, r = i < W - 1 ? 1 : 0;
      if (base[k + l] !== b || base[k + r] !== b || base[k + up] !== b || base[k + dn] !== b || base[k + up + l] !== b
        || base[k + up + r] !== b || base[k + dn + l] !== b || base[k + dn + r] !== b) { subAt[k] = mixedList.length; mixedList.push(k); }
    }
  }
  const subs = new Uint8Array(mixedList.length * SS);
  mixedList.forEach((k, r) => {
    const i = k % W, j = (k - i) / W;
    for (let b = 0; b < S; b++) for (let a = 0; a < S; a++) subs[r * SS + b * S + a] = sampleKind(i + (a + 0.5) / S, j + (b + 0.5) / S);
  });
  // a sample of pixel (i, j), a / b may step one pixel out (−1 or S): that neighbour's sample
  const subKind = (i, j, a, b) => {
    if (a < 0) { i--; a += S; } else if (a >= S) { i++; a -= S; }
    if (b < 0) { j--; b += S; } else if (b >= S) { j++; b -= S; }
    i = Math.max(0, Math.min(W - 1, i)); j = Math.max(0, Math.min(H - 1, j));
    const k = j * W + i, r = subAt[k];
    return r < 0 ? base[k] : subs[r * SS + b * S + a];
  };
  // 2. a field per boundary (course, water, sand): the boundary points found between the samples (the one
  // nearest each mixed pixel's centre), then each pixel's nearest point (nearestPoints)
  const flag = test => Uint8Array.from(KINDS, (_, i) => test(i) ? 1 : 0);
  const isLand = flag(i => i === K.rough || i === K.ob || i === K.fairway || i === K.fringe);
  const isBare = flag(i => i === K.rough || i === K.ob);
  const wEdge = look.edge * res, wLip = look.lip * res, wBank = look.bank * res, T = look.aa.near;
  const fields = [
    { inside: flag(i => i === K.fairway || i === K.tee || i === K.fringe), limit: wEdge + 2 },
    base.includes(K.water) ? { inside: flag(i => i === K.water), limit: Math.max(wBank, look.deep * res) + 2 } : null,
    base.includes(K.sand) ? { inside: flag(i => i === K.sand), limit: wLip + 2 } : null,
  ];
  const live = fields.filter(Boolean);
  for (const f of live) { f.seed = new Int32Array(n).fill(-1); f.px = []; f.pz = []; }
  const bq = new Float64Array(3), bx = new Float64Array(3), bz = new Float64Array(3);
  for (const k of mixedList) {
    const i = k % W, j = (k - i) / W, cx = i + 0.5, cz = j + 0.5;
    bq.fill(Infinity);
    const pair = (k0, k1, x, z) => {
      if (k0 === k1) return;
      const q = (x - cx) * (x - cx) + (z - cz) * (z - cz);
      for (let f = 0; f < live.length; f++) {
        const ins = live[f].inside;
        if (ins[k0] !== ins[k1] && q < bq[f]) { bq[f] = q; bx[f] = x; bz[f] = z; }
      }
    };
    for (let b = 0; b < S; b++) for (let a = -1; a < S; a++) pair(subKind(i, j, a, b), subKind(i, j, a + 1, b), i + (a + 1) / S, j + (b + 0.5) / S);
    for (let a = 0; a < S; a++) for (let b = -1; b < S; b++) pair(subKind(i, j, a, b), subKind(i, j, a, b + 1), i + (a + 0.5) / S, j + (b + 1) / S);
    for (let f = 0; f < live.length; f++) if (bq[f] < Infinity) { const F = live[f]; F.seed[k] = F.px.length; F.px.push(bx[f]); F.pz.push(bz[f]); }
  }
  for (const f of live) { f.near = nearestPoints(W, H, f.seed, f.px, f.pz, f.limit); f.seed = null; }
  // the signed distance (px, > 0 outside the region) from pixel k's centre; with nrm, also the way it grows (the
  // unit normal, into nrm), so a sample's distance is s + n · offset (exact for a straight boundary)
  const nrm = [0, 0];
  const signed = (f, k, i, j, withNormal) => {
    if (!f) return Infinity;
    const sign = f.inside[base[k]] ? -1 : 1, p = f.near[k];
    if (withNormal) { nrm[0] = 0; nrm[1] = 0; }
    if (p < 0) return sign * f.limit;
    const dx = i + 0.5 - f.px[p], dz = j + 0.5 - f.pz[p], d = Math.sqrt(dx * dx + dz * dz);
    if (withNormal && d > 1e-6) { nrm[0] = sign * dx / d; nrm[1] = sign * dz / d; }
    return sign * d;
  };
  const [fCourse, fWater, fSand] = fields;
  // the rule: b = the physics kind, sc / sw / ss = the signed distances (px) to the course,
  // the water and the sand
  const rule = (b, sc, sw, ss) => {
    if (b === K.water) return b;
    if (fWater && isLand[b] && sw < wBank) return K.bank;
    if (isBare[b] && sc < wEdge) return K.edge;
    if (b === K.sand && -ss < wLip) return K.lip;
    return b;
  };
  // 3. every pixel: its centre's kind; near a boundary or a band's outer line, the share of each kind
  const kinds = new Uint8Array(n), depth = new Float32Array(n), at = new Int32Array(n).fill(-1), rows = [];
  const cnt = new Float32Array(NK), N = new Float64Array(6);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, b = base[k];
    // far from every boundary (most of the map): the pixel is its physics kind
    if (subAt[k] < 0 && fCourse.near[k] < 0 && (!fWater || fWater.near[k] < 0) && (!fSand || fSand.near[k] < 0)) {
      kinds[k] = b; if (b === K.water) depth[k] = fWater.limit / res; continue;
    }
    const sc = signed(fCourse, k, i, j), sw = signed(fWater, k, i, j), ss = signed(fSand, k, i, j);
    if (b === K.water) depth[k] = Math.max(0, -sw) / res;
    const near = subAt[k] >= 0 || (isBare[b] && Math.abs(sc - wEdge) < T) || (fWater && isLand[b] && Math.abs(sw - wBank) < T)
      || (b === K.sand && Math.abs(-ss - wLip) < T);
    if (!near) { kinds[k] = rule(b, sc, sw, ss); continue; }
    fields.forEach((f, q) => { signed(f, k, i, j, true); N[q * 2] = nrm[0]; N[q * 2 + 1] = nrm[1]; });
    cnt.fill(0);
    for (let sb = 0; sb < S; sb++) for (let sa = 0; sa < S; sa++) {
      const ox = (sa + 0.5) / S - 0.5, oz = (sb + 0.5) / S - 0.5;
      cnt[rule(subKind(i, j, sa, sb), sc + N[0] * ox + N[1] * oz, sw + N[2] * ox + N[3] * oz, ss + N[4] * ox + N[5] * oz)]++;
    }
    let top = 0, main = 0;
    for (let c = 0; c < NK; c++) if (cnt[c] > top) { top = cnt[c]; main = c; }
    kinds[k] = main;
    if (top === SS) continue;
    at[k] = rows.length / NK;
    for (let c = 0; c < NK; c++) rows.push(cnt[c] / SS);
  }
  return { kinds, depth, mix: { at, w: Float32Array.from(rows) } };
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
// mix (optional, groundKindsAA): a mixed pixel counts each kind by its share.
export function surfaceMask(kinds, W, H, look = GROUND_LOOK, mix = null) {
  const n = Math.max(1, Math.round(1 / look.maskScale)), mW = Math.ceil(W / n), mH = Math.ceil(H / n);
  const data = new Uint8Array(mW * mH * 4);
  const rows = KINDS.map(k => { const g = look.kinds[k] ?? { speck: 0, dab: 0 };
    return [k === 'fairway' ? 255 : 0, k === 'green' ? 255 : 0, Math.min(255, g.speck / MASK_AMOUNT * 255), Math.min(255, g.dab / MASK_AMOUNT * 255)]; });
  for (let mj = 0; mj < mH; mj++) for (let mi = 0; mi < mW; mi++) {
    const acc = [0, 0, 0, 0]; let cnt = 0;
    for (let dj = 0; dj < n; dj++) for (let di = 0; di < n; di++) {
      const i = mi * n + di, j = mj * n + dj; if (i >= W || j >= H) continue;
      const k = j * W + i, m = mix ? mix.at[k] : -1;
      if (m < 0) { const r = rows[kinds[k]]; for (let c = 0; c < 4; c++) acc[c] += r[c]; }
      else for (let q = 0; q < KINDS.length; q++) {
        const w = mix.w[m * KINDS.length + q]; if (!w) continue;
        for (let c = 0; c < 4; c++) acc[c] += rows[q][c] * w;
      }
      cnt++;
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
