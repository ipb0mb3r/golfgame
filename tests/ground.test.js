// AP6: the ground material's pure part (core/ground.js, DESIGN §8b "The ground material").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GROUND_LOOK, PERF_BUDGET, TUNABLES } from '../src/core/config.js';
import { ALL_PALETTE_KEYS, parseColour } from '../src/core/biome.js';
import { BIOMES } from '../src/biomes/index.js';
import { HOLES } from '../src/holes/sets.js';
import {
  groundLevel, KINDS, KIND, kindOf, KIND_KEYS, speck, dabs, detailTexture, distanceTo, groundKinds, groundKindsAA, nearestPoints, baseKinds,
  groundColour, surfaceMask, treeShadows, shadowColour, waterColour, fairwayStripe,
} from '../src/core/ground.js';

test('GROUND_DETAIL: a tunable 0..2, default 2 (the new look); levels are whole numbers', () => {
  assert.deepEqual(TUNABLES.GROUND_DETAIL, { def: 2, min: 0, max: 2 });
  assert.equal(groundLevel(0), 0); assert.equal(groundLevel(1.4), 1); assert.equal(groundLevel(1.6), 2);
  assert.equal(groundLevel(9), 2); assert.equal(groundLevel(-1), 0); assert.equal(groundLevel('x'), 0);
});

test('every drawn kind is coloured by a palette key, and every surface maps to a kind', () => {
  for (const k of KINDS) assert.ok(ALL_PALETTE_KEYS.includes(KIND_KEYS[k]), `${k} → ${KIND_KEYS[k]}`);
  for (const k of ['fairwayB', 'greenB', 'gridFill', 'gridLine', 'waterDeep', 'shadow']) assert.ok(ALL_PALETTE_KEYS.includes(k));
  for (const s of ['tee', 'fairway', 'fringe', 'green', 'rough', 'sand', 'rock', 'water', 'ob']) assert.equal(KINDS[kindOf(s)], s);
  assert.equal(kindOf('lava'), KIND.rough); // an unknown surface is drawn as rough, as before AP6
});

test('the detail texture: within the phone budget, deterministic, tiles seamlessly', () => {
  const t = GROUND_LOOK.texture;
  assert.ok(t.size <= PERF_BUDGET.textureSize);
  const a = detailTexture(), b = detailTexture();
  assert.equal(a.data.length, t.size * t.size * 4);
  assert.deepEqual(a.data, b.data);
  const k = Math.round(t.tile * t.speck) / t.tile, sp = Math.round(t.tile * t.speck), dp = Math.round(t.tile / t.dabCell);
  for (const [x, z] of [[0.1, 0.2], [3.3, 7.9], [15.9, 0.05]]) {
    assert.equal(speck(x, z, k, 5, sp), speck(x + t.tile, z - t.tile, k, 5, sp));
    assert.equal(dabs(x, z, t.tile / dp, t.dabLen, t.dabWid, 1.3, 5, dp), dabs(x + t.tile, z + t.tile, t.tile / dp, t.dabLen, t.dabWid, 1.3, 5, dp));
  }
  // greyscale pattern only: B and A are constant, R and G spread round the middle
  let sum = 0; for (let i = 0; i < a.data.length; i += 4) { assert.equal(a.data[i + 2], 255); sum += a.data[i]; }
  assert.ok(Math.abs(sum / (a.data.length / 4) - 127.5) < 8);
});

test('distanceTo: chamfer distances in pixels', () => {
  const W = 7, H = 1, d = distanceTo(W, H, i => i === 0);
  assert.deepEqual([...d], [0, 1, 2, 3, 4, 5, 6]);
  const d2 = distanceTo(3, 3, i => i === 0);
  assert.ok(Math.abs(d2[8] - 2 * Math.SQRT2) < 1e-6);
});

// A test patch at 4 px / m: rough everywhere, a fairway block, a bunker, a pond
function patch() {
  const res = 4, W = 120, H = 80, base = new Uint8Array(W * H).fill(KIND.rough);
  const fill = (i0, j0, i1, j1, k) => { for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) base[j * W + i] = k; };
  fill(10, 10, 50, 70, KIND.fairway);
  fill(60, 10, 80, 30, KIND.sand);
  fill(60, 45, 100, 70, KIND.water);
  return { res, W, H, base };
}

test('groundKinds: the edge line outside the fairway, the lip inside the bunker, the bank round water; physics kinds kept', () => {
  const { res, W, H, base } = patch(), { kinds, depth } = groundKinds(base, W, H, res);
  const at = (i, j) => KINDS[kinds[j * W + i]];
  // edge: on the rough side, ~0.6 m (2–3 px at 4 px / m), never on the fairway itself
  assert.equal(at(49, 40), 'fairway'); assert.equal(at(50, 40), 'edge'); assert.equal(at(51, 40), 'edge'); assert.equal(at(52, 40), 'rough');
  assert.equal(at(9, 40), 'edge'); assert.equal(at(6, 40), 'rough');
  // lip: inside the sand, ~0.5 m
  assert.equal(at(60, 20), 'lip'); assert.equal(at(61, 20), 'lip'); assert.equal(at(63, 20), 'sand');
  // bank: on the land round the water; the water keeps its pixels, deeper toward the middle
  assert.equal(at(59, 55), 'bank'); assert.equal(at(55, 55), 'bank'); assert.equal(at(53, 55), 'rough');
  assert.equal(at(60, 55), 'water'); assert.equal(at(80, 57), 'water');
  assert.ok(depth[57 * W + 80] > depth[57 * W + 61]);
  // a band only ever replaces a pixel's colour: fairway, green, tee, water and sand cells never become rough, and vice versa
  for (let i = 0; i < W * H; i++) {
    const b = KINDS[base[i]], k = KINDS[kinds[i]];
    if (k !== b) assert.ok((k === 'edge' && ['rough', 'ob'].includes(b)) || (k === 'lip' && b === 'sand') || (k === 'bank' && ['rough', 'ob', 'fairway', 'fringe'].includes(b)), `${b} → ${k}`);
  }
});

test('GROUND_EDGE_AA: a tunable 0..1, default 1 (smooth edges); 0 = the hard per-pixel edges (compare switch)', () => {
  assert.deepEqual(TUNABLES.GROUND_EDGE_AA, { def: 1, min: 0, max: 1 });
});

test('baseKinds: the same physics kind per map pixel as asking every pixel, with about a third of the calls', () => {
  for (const id of ['pl-03', 'mtn-03', 'mtn-06']) {
    const hole = HOLES[id], { map } = hole, { res } = hole.scenery.paint;
    const W = Math.round((map.x1 - map.x0) * res), H = Math.round((map.z1 - map.z0) * res);
    let calls = 0;
    const kindAt = (u, v) => { calls++; return kindOf(hole.surfaceAt(map.x0 + u / res, map.z0 + v / res)); };
    const fast = baseKinds(W, H, kindAt);
    assert.ok(calls < W * H * 0.4, `${id}: ${calls} calls for ${W * H} px`);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (fast[j * W + i] !== kindAt(i + 0.5, j + 0.5)) assert.fail(`${id} (${i}, ${j})`);
  }
});

test('nearestPoints: each pixel finds its nearest boundary point, within the limit only', () => {
  const W = 20, H = 5, seed = new Int32Array(W * H).fill(-1);
  for (let j = 0; j < H; j++) seed[j * W + 5] = j;          // a vertical line at x = 5.3 px
  const px = Array(H).fill(5.3), pz = Array.from({ length: H }, (_, j) => j + 0.5);
  const near = nearestPoints(W, H, seed, px, pz, 6);
  for (let i = 0; i < W; i++) {
    const p = near[2 * W + i], d = Math.abs(i + 0.5 - 5.3);
    if (d < 6) { assert.equal(p, 2); } else assert.equal(p, -1);
  }
});

// A smooth test patch: a round fairway (r 6 m) and a round bunker (r 3 m), its exact shape known below the pixel
function roundPatch() {
  const res = 4, W = 100, H = 60, fx = 12, fz = 7.5, sx = 18.5, sz = 7.5, R = 6, r = 3;
  const kindAtM = (x, z) => Math.hypot(x - sx, z - sz) < r ? KIND.sand : Math.hypot(x - fx, z - fz) < R ? KIND.fairway : KIND.rough;
  const sampleKind = (u, v) => kindAtM(u / res, v / res), base = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) base[j * W + i] = sampleKind(i + 0.5, j + 0.5);
  return { res, W, H, base, sampleKind, fx, fz, R, sx, sz, r };
}
const shares = (g, W, H) => { const a = new Float64Array(KINDS.length);
  for (let k = 0; k < W * H; k++) { const m = g.mix.at[k]; if (m < 0) a[g.kinds[k]]++; else for (let q = 0; q < KINDS.length; q++) a[q] += g.mix.w[m * KINDS.length + q]; }
  return a; };

test('groundKindsAA: smooth edges, the same bands and widths as the hard rule, each pixel shared out by area', () => {
  const t = roundPatch(), { res, W, H, base } = t, g = groundKindsAA(base, W, H, res, t.sampleKind);
  // each mixed row sums to 1 and only holds kinds a band rule allows for that pixel
  const NK = KINDS.length;
  let mixed = 0;
  for (let k = 0; k < W * H; k++) {
    const m = g.mix.at[k]; if (m < 0) continue; mixed++;
    let sum = 0; for (let q = 0; q < NK; q++) sum += g.mix.w[m * NK + q];
    assert.ok(Math.abs(sum - 1) < 1e-6);
  }
  assert.ok(mixed > 100, 'the boundaries are blended');
  // the area of each band is its true one (an annulus, in px²) within a few %: the widths are kept
  const A = shares(g, W, H), px2 = res * res, e = GROUND_LOOK.edge, l = GROUND_LOOK.lip;
  const sandArea = Math.PI * t.r ** 2 * px2, lipArea = Math.PI * (t.r ** 2 - (t.r - l) ** 2) * px2;
  assert.ok(Math.abs(A[KIND.sand] + A[KIND.lip] - sandArea) / sandArea < 0.01, 'the sand plays where it is');
  assert.ok(Math.abs(A[KIND.lip] - lipArea) / lipArea < 0.06, `lip ${A[KIND.lip]} vs ${lipArea}`);
  // the edge ring round the fairway, minus where the bunker covers it (sand cuts the fairway's outline)
  const edgeArea = Math.PI * ((t.R + e) ** 2 - t.R ** 2) * px2;
  assert.ok(A[KIND.edge] < edgeArea && A[KIND.edge] > edgeArea * 0.8, `edge ${A[KIND.edge]} vs ${edgeArea}`);
  // the same pixels change kind as with the hard rule, give or take the blended rim
  const hard = groundKinds(base, W, H, res), Ah = shares({ ...hard, mix: { at: new Int32Array(W * H).fill(-1) } }, W, H);
  for (const k of ['edge', 'lip', 'sand', 'fairway']) assert.ok(Math.abs(A[KIND[k]] - Ah[KIND[k]]) / Ah[KIND[k]] < 0.12, k);
  // a pixel far from any boundary is one kind, exactly as before
  assert.equal(g.mix.at[30 * W + 48], -1); assert.equal(KINDS[g.kinds[30 * W + 48]], 'fairway');
  assert.equal(g.mix.at[30 * W + 90], -1); assert.equal(KINDS[g.kinds[30 * W + 90]], 'rough');
});

test('groundKindsAA: water keeps its pixels, the bank round it, the depth from the shore', () => {
  const { res, W, H, base } = patch(), sampleKind = (u, v) => base[Math.min(H - 1, Math.floor(v)) * W + Math.min(W - 1, Math.floor(u))];
  const g = groundKindsAA(base, W, H, res, sampleKind), at = (i, j) => KINDS[g.kinds[j * W + i]];
  assert.equal(at(80, 57), 'water'); assert.equal(at(57, 55), 'bank'); assert.equal(at(50, 55), 'edge'); assert.equal(at(30, 40), 'fairway');
  assert.ok(g.depth[57 * W + 80] > g.depth[57 * W + 61]);
  // the straight block edges of this patch fall on pixel borders: nothing to blend there
  assert.equal(g.mix.at[40 * W + 49], -1); assert.equal(at(49, 40), 'fairway'); assert.equal(at(50, 40), 'edge');
});

const P = Object.fromEntries(Object.entries(BIOMES['meadow-day'].palette).map(([k, c]) => [k, parseColour(c)]));
const close = (a, b, eps = 1e-9) => a.every((v, i) => Math.abs(v - b[i]) < eps);

test('groundColour: the palette colour times the texture; level 1 paints the stripes, level 2 leaves them to the shader', () => {
  const o1 = { level: 1, stripe: 7, green: 'stripes' }, o2 = { level: 2, stripe: 7, green: 'stripes' };
  const base = GROUND_LOOK.kinds.fairway.base;
  // level 2: the fairway is fairwayA × the base (the shader stripes it), the grid's green is gridFill
  assert.ok(close(groundColour(P, KIND.fairway, 0.5, 3.5, o2), P.fairwayA.map(v => v * base)));
  assert.ok(close(groundColour(P, KIND.green, 0.3, 0.3, { ...o2, green: 'grid' }), P.gridFill.map(v => v * GROUND_LOOK.kinds.green.base)));
  // level 1: alternating stripes (within the fine texture's few %)
  const near = (c, key) => c.every((v, i) => Math.abs(v / P[key][i] - 1) < 0.12);
  assert.ok(fairwayStripe(7.5, 7) && near(groundColour(P, KIND.fairway, 0.5, 7.5, o1), 'fairwayA'));
  assert.ok(!fairwayStripe(3.5, 7) && near(groundColour(P, KIND.fairway, 0.5, 3.5, o1), 'fairwayB'));
  assert.ok(near(groundColour(P, KIND.green, 0.05, 1, { ...o1, green: 'grid' }), 'gridLine'));
  assert.ok(near(groundColour(P, KIND.edge, 3, 3, o1), 'edge'));
  assert.ok(near(groundColour(P, KIND.lip, 3, 3, o1), 'lip'));
  assert.ok(near(groundColour(P, KIND.bank, 3, 3, o1), 'bank'));
  // water: water at the shore, toward waterDeep in the middle (a calm spot: no sparkle)
  const calm = [0, 0]; // sin(0)·sin(0) = 0
  assert.ok(close(waterColour(P, ...calm, 0), P.water));
  assert.ok(close(waterColour(P, ...calm, 100), P.waterDeep));
});

test('surfaceMask: stripe weights and texture amounts per kind, at maskScale of the map, rows from the tee end', () => {
  const { res, W, H, base } = patch(), { kinds } = groundKinds(base, W, H, res), m = surfaceMask(kinds, W, H);
  const n = Math.round(1 / GROUND_LOOK.maskScale);
  assert.equal(m.width, Math.ceil(W / n)); assert.equal(m.height, Math.ceil(H / n));
  const px = (i, j) => [...m.data.slice(((m.height - 1 - Math.floor(j / n)) * m.width + Math.floor(i / n)) * 4).slice(0, 4)];
  assert.deepEqual(px(30, 40).slice(0, 2), [255, 0]);                       // fairway: mowing stripes
  assert.deepEqual(px(90, 5).slice(0, 2), [0, 0]);                          // rough
  assert.equal(px(90, 5)[2], Math.round(GROUND_LOOK.kinds.rough.speck / 0.1 * 255));
  assert.deepEqual(px(80, 57), [0, 0, 0, 0]);                               // water: no texture (its ripples are painted)
});

test('treeShadows: one soft shadow per tree in play, pushed away from the sun', () => {
  const trees = [{ type: 'tree', x: 10, z: -20, canopyR: 3 }, { type: 'boulder', x: 0, z: 0, r: 1 }];
  const [s, ...rest] = treeShadows(trees, [40, 60, 30]);
  assert.equal(rest.length, 0);
  assert.ok(s.x < 10 && s.z < -20);                                     // the sun is at +x +z
  assert.ok(Math.abs(s.rx - 3 * GROUND_LOOK.shadow.radius * GROUND_LOOK.shadow.stretch) < 1e-9);
  const c = shadowColour(P);
  assert.ok(c.every((v, i) => v >= P.shadow[i] && v <= 255));
  assert.deepEqual(treeShadows(undefined, [0, 1, 0]), []);
});

test('vnoise: the painter\'s corner cache never changes a value', async () => {
  const { vnoise, lowDetail } = await import('../src/core/ground.js');
  const cache = { xi: NaN, zi: NaN, a: 0, b: 0, c: 0, d: 0 };
  for (const [x, z] of [[0.2, 0.3], [0.7, 0.3], [5.5, -2.1], [5.6, -2.1], [0.2, 0.3]]) assert.equal(vnoise(x, z, cache), vnoise(x, z));
  assert.equal(lowDetail('rough', 12.3, -40.2), lowDetail('rough', 12.3, -40.2));
});
