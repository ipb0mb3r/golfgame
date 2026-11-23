// Small props, artist reference geometry (docs/art/small-props/SPEC.md). Pure: no Three.js, no DOM.
// Same part format as src/core/trees.js ({ positions, indices, w }) plus a colour pair per part:
//   lo / hi = material slot names; a vertex colour = mix(slot lo, slot hi, w). The piece's `slots` map
//   each slot name to a palette key (the biome recolours it). Units: metres, y up, foot at y 0.
// Every look is ≤ 50 triangles (ART_STYLE §5). — Agent: artist
import { lathe } from '../../../src/core/trees.js';

const TAU = Math.PI * 2;
// a tiny seeded random, so every copy of a look is the same shape
export function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const part = (p, lo, hi) => ({ ...p, lo, hi });
const moved = (p, x, y, z, sx = 1, sy = 1, sz = sx) => ({ ...p, positions: p.positions.map((v, i) => i % 3 === 0 ? v * sx + x : i % 3 === 1 ? v * sy + y : v * sz + z) });

// A blade: base (2 verts) → bend (2 verts) → tip (1 vert) = 3 triangles, drawn double-sided.
// a = direction it leans to, lean = how far the tip goes out (× h), w = base width, curl = how much the
// top part droops (0 straight … 1 bends over)
function blade(x, z, a, h, wd, lean, curl = 0.3) {
  const dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx;
  const mid = 0.55, mo = lean * h * 0.35, to = lean * h, ty = h * (1 - curl * 0.35);
  const positions = [
    x - px * wd / 2, 0, z - pz * wd / 2, x + px * wd / 2, 0, z + pz * wd / 2,
    x + dx * mo - px * wd * 0.4, h * mid, z + dz * mo - pz * wd * 0.4, x + dx * mo + px * wd * 0.4, h * mid, z + dz * mo + pz * wd * 0.4,
    x + dx * to, ty, z + dz * to];
  return { positions, indices: [0, 1, 3, 0, 3, 2, 2, 3, 4], w: [0, 0, 0.55, 0.55, 1] };
}
// A flat flower head: a centre + n petal points, facing up (n triangles)
function head(x, y, z, r, n = 5, tilt = 0, rot = 0) {
  const positions = [x, y + r * 0.15, z], indices = [], w = [1];
  for (let i = 0; i < n; i++) { const a = rot + (i / n) * TAU; positions.push(x + r * Math.cos(a), y + tilt * r * Math.cos(a), z + r * Math.sin(a)); w.push(0.6); }
  for (let i = 0; i < n; i++) indices.push(0, 1 + ((i + 1) % n), 1 + i);
  return { positions, indices, w };
}
// A small cup flower: an open cone pointing down (n triangles)
function cup(x, y, z, r, n = 5) {
  const positions = [x, y - r * 0.7, z], indices = [], w = [0.3];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; positions.push(x + r * Math.cos(a), y, z + r * Math.sin(a)); w.push(1); }
  for (let i = 0; i < n; i++) indices.push(0, 1 + ((i + 1) % n), 1 + i);
  return { positions, indices, w };
}
// A stone: a squashed lathe, wobbly ring (segs × 2 triangles)
const stone = (x, z, r, h, segs, tw) => moved(lathe([[0, 1, 1], [1, 0.35, 0.6, 0.22], [0, -0.15, 0]], segs, tw), x, 0, z, r, h, r * 0.85);

// C1 / C2: 3 low lobes; the two back ones wear a flower cap. wavy 1 = the cap's edge waves and dips on the
// front side. Flowered lobes 6 sides (cap 6 + leaf band 12 = 18), the green lobe 4 sides (12): 48 in all.
function spill(seed, wavy) {
  const r = rng(seed), out = [], L = [[0, 0, 0.62, 0.8, 1], [0.6, 0.14, 0.48, 0.58, 0], [-0.25, 0.5, 0.48, 0.6, 1]];
  for (const [x, z, rad, h, fl] of L) {
    const tw = r() * 3, segs = fl ? 6 : 4, edge = 0.6, wob = fl && wavy ? 0.2 : 0.12;
    // flowered lobe: a low round cap (pole 0.95, edge ring at 0.6) + a leaf band down to the foot
    const cap = lathe([[0, 0.95, 1], [0.86, edge, 1, wob]], segs, tw);
    const leaf = lathe([[0.86, edge, 0.75, wob], [0.95, 0, 0, 0.1]], segs, tw);
    if (fl && wavy) for (const p of [cap, leaf]) for (let k = 0; k < p.positions.length; k += 3) {
      const px = p.positions[k], pz = p.positions[k + 2];
      if (Math.abs(p.positions[k + 1] - edge) < 1e-6) p.positions[k + 1] = edge - 0.22 * Math.max(0, px / 0.86) + 0.08 * Math.sin(3 * Math.atan2(pz, px) + 1);
    }
    out.push(part(moved(cap, x, 0, z, rad, h), fl ? 'flower' : 'mid', fl ? 'flower' : 'top'));
    out.push(part(moved(leaf, x, 0, z, rad, h), 'low', 'mid'));
  }
  return out;
}

// D1–D3 (owner 2026-11-23: "a green sphere but with coloured spots instead of a big one"): one round green
// bush (an ellipsoid dome, 6 sides × 3 bands = 30 triangles) with flower spots on it.
const DOME = { r: 0.68, cy: 0.42, ry: 0.5, th: [0, 0.95, 1.75, 2.2] };   // ring angles from the top (rad)
const domeAt = (th, a) => [DOME.r * Math.sin(th) * Math.cos(a), Math.max(0, DOME.cy + DOME.ry * Math.cos(th)), DOME.r * Math.sin(th) * Math.sin(a)];
function dome(segs, tw) {
  return lathe(DOME.th.map((t, i) => { const [x, y] = domeAt(t, 0); return [i ? x : 0, y, 1 - i / 3, i ? 0.08 : 0]; }), segs, tw);
}
// a flat spot of n points lying on the dome at (th, a), lifted a little off it (n triangles)
function spot(th, a, rad, n, lift = 1.08, puff = 0.25) {
  const c = domeAt(th, a).map((v, i) => i === 1 ? DOME.cy + (v - DOME.cy) * lift : v * lift);
  let nx = Math.sin(th) * Math.cos(a) / DOME.r, ny = Math.cos(th) / DOME.ry, nz = Math.sin(th) * Math.sin(a) / DOME.r; const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
  const ux = -Math.sin(a), uz = Math.cos(a), vx = ny * Math.cos(a), vy = -Math.hypot(nx, nz), vz = ny * Math.sin(a);
  const positions = [c[0] + nx * rad * puff, c[1] + ny * rad * puff, c[2] + nz * rad * puff], indices = [], w = [1];
  for (let i = 0; i < n; i++) { const b = (i / n) * TAU, cu = Math.cos(b) * rad, cv = Math.sin(b) * rad; positions.push(c[0] + ux * cu + vx * cv, c[1] + vy * cv, c[2] + uz * cu + vz * cv); w.push(0.7); }
  for (let i = 0; i < n; i++) indices.push(0, 1 + i, 1 + ((i + 1) % n));
  return { positions, indices, w };
}
// D3: the dome's own faces painted, no extra triangles: each face its own part (leaf or flower)
function paintedDome(seed) {
  const r = rng(seed), d = dome(7, r() * 3), out = [];
  for (let i = 0; i < d.indices.length; i += 3) {
    const ids = d.indices.slice(i, i + 3), positions = [], w = [];
    for (const k of ids) { positions.push(...d.positions.slice(k * 3, k * 3 + 3)); w.push(d.w[k]); }
    const yMid = (positions[1] + positions[4] + positions[7]) / 3, fl = yMid > 0.3 && r() < 0.42;
    out.push(fl ? part({ positions, indices: [0, 1, 2], w: [1, 1, 1] }, 'flower', 'flower') : part({ positions, indices: [0, 1, 2], w: w.map(v => 1 - v) }, 'low', 'top'));
  }
  return out;
}

// ---- the looks. Each: { name, sub, slots, build(seed) → parts[] }
export const PIECES = {
  tuft: {
    A: { name: 'A · Thin fan', sub: '7 slim blades fanning out', slots: { base: 'deepRough', tip: 'leafTop' },
      build(seed) { const r = rng(seed), out = []; for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + r() * 0.6;
        out.push(part(blade(Math.cos(a) * 0.03, Math.sin(a) * 0.03, a, 0.28 + r() * 0.14, 0.055, 0.45 + r() * 0.2, 0.3), 'base', 'tip')); } return out; } },
    B: { name: 'B · Chunky blades', sub: '5 wide, round-ish cartoon blades', slots: { base: 'deepRough', tip: 'leafTop' },
      build(seed) { const r = rng(seed), out = []; for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + r() * 0.5;
        out.push(part(blade(Math.cos(a) * 0.04, Math.sin(a) * 0.04, a, 0.26 + r() * 0.1, 0.12, 0.55 + r() * 0.2, 0.6), 'base', 'tip')); } return out; } },
    C: { name: 'C · Soft mound', sub: 'a little round cushion with 4 blade tips', slots: { base: 'deepRough', tip: 'leafTop' },
      build(seed) { const r = rng(seed), out = [part(moved(lathe([[0, 1, 0.8], [0.75, 0.6, 0.5, 0.25], [1, 0, 0, 0.25]], 6, r() * 3), 0, 0, 0, 0.2, 0.13), 'base', 'tip')];
        for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + r(); out.push(part(blade(Math.cos(a) * 0.05, Math.sin(a) * 0.05, a, 0.24 + r() * 0.08, 0.09, 0.5, 0.5), 'base', 'tip')); } return out; } },
  },
  flowers: {
    A: { name: 'A · Dots on a cushion', sub: 'a low leafy cushion with 6 flat flowers', slots: { leaves: 'rough', leafTop: 'leaf', petal: 'propA' },
      build(seed) { const r = rng(seed), out = [part(moved(lathe([[0, 1, 1], [0.7, 0.7, 0.6, 0.3], [1, 0, 0, 0.3]], 6, r() * 3), 0, 0, 0, 0.32, 0.11), 'leaves', 'leafTop')];
        for (let i = 0; i < 6; i++) { const a = r() * TAU, d = 0.06 + r() * 0.2; out.push(part(head(Math.cos(a) * d, 0.1 + r() * 0.04 - d * 0.15, Math.sin(a) * d, 0.07, 4, 0.2, r() * 3), 'petal', 'petal')); } return out; } },
    B: { name: 'B · Stems and cups', sub: '6 cup flowers on stems, 2 leaves', slots: { leaves: 'rough', leafTop: 'leaf', petal: 'propA' },
      build(seed) { const r = rng(seed), out = [];
        for (let i = 0; i < 6; i++) { const a = r() * TAU, d = r() * 0.2, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.18 + r() * 0.12;
          out.push(part(blade(x, z, a, h, 0.02, 0.15, 0), 'leaves', 'leafTop'));
          out.push(part(cup(x + Math.cos(a) * h * 0.15, h, z + Math.sin(a) * h * 0.15, 0.065, 4), 'petal', 'petal')); }
        for (let i = 0; i < 2; i++) { const a = r() * TAU; out.push(part(blade(0, 0, a, 0.16, 0.09, 0.8, 0.5), 'leaves', 'leafTop')); } return out; } },
    C: { name: 'C · Flat carpet', sub: '9 flowers lying on the grass, no height', slots: { leaves: 'rough', leafTop: 'leaf', petal: 'propA' },
      build(seed) { const r = rng(seed), out = [];
        for (let i = 0; i < 9; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 0.4; out.push(part(head(Math.cos(a) * d, 0.03, Math.sin(a) * d * 0.8, 0.075, 5, 0, r() * 3), 'petal', 'petal')); } return out; } },
  },
  bush: {
    A: { name: 'A · Two round lobes', sub: '2 leafy domes, flower dots on top', slots: { low: 'leafLow', mid: 'leaf', top: 'leafTop', flower: 'propA' },
      build(seed) { const r = rng(seed), out = [], L = [[0, 0, 0.6, 0.95], [0.5, 0.2, 0.45, 0.7]];
        for (const [x, z, rad, h] of L) { out.push(part(moved(lathe([[0, 1, 1], [0.8, 0.7, 0.75, 0.15], [1, 0.25, 0.3, 0.12]], 5, r() * 3), x, 0, z, rad, h), 'low', 'top'));
          for (let i = 0; i < 2; i++) { const a = r() * TAU; out.push(part(head(x + Math.cos(a) * rad * 0.45, h * 0.93, z + Math.sin(a) * rad * 0.45, 0.13, 3, 0.4, r() * 3), 'flower', 'flower')); } }
        return out; } },
    B: { name: 'B · Flower-capped dome', sub: 'one round bush, its top covered in flowers', slots: { low: 'leafLow', mid: 'leaf', top: 'leafTop', flower: 'propA' },
      build(seed) { const r = rng(seed);
        const leaf = moved(lathe([[1.0, 0.5, 0.9, 0.18], [0.88, 0.08, 0, 0.14]], 7, 0.4), 0, 0, 0, 0.7, 1.0);
        const cap = moved(lathe([[0, 1, 1], [0.72, 0.85, 1, 0.2], [1.05, 0.5, 0.3, 0.18]], 7, 0.4), 0, 0, 0, 0.7, 1.0);
        const out = [part(leaf, 'low', 'mid'), part(cap, 'flower', 'flower')];
        for (let i = 0; i < 4; i++) { const a = r() * TAU; out.push(part(head(Math.cos(a) * 0.62, 0.42 + r() * 0.12, Math.sin(a) * 0.62, 0.12, 3, 0.6, r() * 3), 'flower', 'flower')); }
        return out; } },
    C: { name: 'C · Spilling shrub', sub: '3 low lobes, flowers spilling down one side', slots: { low: 'leafLow', mid: 'leaf', top: 'leafTop', flower: 'propA' },
      build(seed) { const r = rng(seed), out = [], L = [[0, 0, 0.6, 0.85, 1], [0.6, 0.12, 0.48, 0.6, 0], [-0.25, 0.5, 0.45, 0.55, 1]];
        for (const [x, z, rad, h, fl] of L) out.push(part(moved(lathe([[0, 1, 1], [0.8, 0.7, 0.75, 0.15], [1, 0.25, 0.3, 0.12]], 5, r() * 3), x, 0, z, rad, h), fl ? 'mid' : 'low', fl ? 'flower' : 'top'));
        return out; } },
    // owner 2026-11-22: "I like C but I'm not convinced, especially the colour sections" → C with a crisp
    // flower cap (no pink-to-green smear): each flowered lobe = a flower cap + a leaf band, split at a ring
    C1: { name: 'C1 · Clean flower caps', sub: 'a crisp flower / leaf line', slots: { low: 'leafLow', mid: 'leaf', top: 'leafTop', flower: 'propA' },
      build(seed) { return spill(seed, 0); } },
    C2: { name: 'C2 · Wavy flower caps', sub: 'a wavy edge, lower at the front', slots: { low: 'leafLow', mid: 'leaf', top: 'leafTop', flower: 'propA' },
      build(seed) { return spill(seed, 1); } },
    D1: { name: 'D1 · Flower dots', sub: 'green dome, 6 small flower dots', slots: { low: 'leafLow', mid: 'leaf', top: 'leafTop', flower: 'propA' },
      build(seed) { const r = rng(seed), d = dome(6, r() * 3); d.w = d.w.map(v => 1 - v); const out = [part(d, 'low', 'top')];
        for (let i = 0; i < 6; i++) out.push(part(spot(0.35 + r() * 0.9, (i / 6) * TAU + r() * 0.6, 0.13, 3, 1.1), 'flower', 'flower')); return out; } },
    D2: { name: 'D2 · Bigger spots', sub: 'green dome, 4 raised flower clumps', slots: { low: 'leafLow', mid: 'leaf', top: 'leafTop', flower: 'propA' },
      build(seed) { const r = rng(seed), d = dome(6, r() * 3); d.w = d.w.map(v => 1 - v); const out = [part(d, 'low', 'top')];
        for (let i = 0; i < 4; i++) out.push(part(spot(0.3 + r() * 0.8, (i / 4) * TAU + r() * 0.8, 0.19, 4, 1.12, 0.55), 'flower', 'flower')); return out; } },
    D3: { name: 'D3 · Painted patches', sub: 'green dome, some of its faces flowered', slots: { low: 'leafLow', mid: 'leaf', top: 'leafTop', flower: 'propA' },
      build(seed) { return paintedDome(seed); } },
  },
  pebbles: {
    A: { name: 'A · Three stones', sub: '3 flat round stones', slots: { stone: 'boulder', top: 'propSnow' },
      build(seed) { const r = rng(seed); return [[0, 0, 0.16, 0.09], [0.22, 0.08, 0.1, 0.06], [0.05, 0.22, 0.08, 0.05]].map(([x, z, s, h]) => part(stone(x, z, s, h, 5, r() * 3), 'stone', 'stone')); } },
    B: { name: 'B · One flat stone', sub: 'a single bigger stepping stone', slots: { stone: 'boulder', top: 'propSnow' },
      build(seed) { const r = rng(seed); return [part(moved(lathe([[0, 1, 1], [0.8, 0.8, 0.8, 0.2], [1, 0.3, 0.5, 0.2], [0, -0.2, 0]], 6, r() * 3), 0, 0, 0, 0.32, 0.12, 0.26), 'stone', 'stone')]; } },
    C: { name: 'C · Scatter of five', sub: '5 small pebbles, slightly lighter tops', slots: { stone: 'boulder', top: 'propSnow' },
      build(seed) { const r = rng(seed), out = []; for (let i = 0; i < 5; i++) { const a = r() * TAU, d = r() * 0.28, s = 0.05 + r() * 0.06;
        const p = part(stone(Math.cos(a) * d, Math.sin(a) * d, s, s * 0.6, 4, r() * 3), 'stone', 'top'); p.w = p.w.map(v => v * 0.35); out.push(p); } return out; } },
  },
  reeds: {
    A: { name: 'A · Cattails', sub: '6 tall blades and 2 brown cattail heads', slots: { base: 'deepRough', tip: 'leafTop', head: 'trunk' },
      build(seed) { const r = rng(seed), out = [];
        for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + r() * 0.5; out.push(part(blade(Math.cos(a) * 0.05, Math.sin(a) * 0.05, a, 0.8 + r() * 0.35, 0.06, 0.18 + r() * 0.12, 0.25), 'base', 'tip')); }
        for (const [x, z, h] of [[0.02, 0, 1.15], [-0.06, 0.05, 0.98]]) out.push(part(moved(lathe([[0, 1, 1], [1, 0.75, 0.8], [1, 0.1, 0.3], [0, 0, 0]], 3, 0.3), x, h - 0.2, z, 0.04, 0.22), 'head', 'head'));
        for (const [x, z, h] of [[0.02, 0, 0.95], [-0.06, 0.05, 0.78]]) out.push(part(blade(x, z, 0, h, 0.015, 0, 0), 'base', 'base'));
        return out; } },
    B: { name: 'B · Tall blades', sub: '10 tall, gently bending blades', slots: { base: 'deepRough', tip: 'leafTop', head: 'trunk' },
      build(seed) { const r = rng(seed), out = []; for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + r() * 0.4;
        out.push(part(blade(Math.cos(a) * 0.06, Math.sin(a) * 0.06, a, 0.7 + r() * 0.45, 0.06, 0.25 + r() * 0.2, 0.45), 'base', 'tip')); } return out; } },
    C: { name: 'C · Grass with plumes', sub: '6 blades and 3 soft cream plumes', slots: { base: 'deepRough', tip: 'leafTop', head: 'propSnow' },
      build(seed) { const r = rng(seed), out = [];
        for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + r() * 0.5; out.push(part(blade(Math.cos(a) * 0.05, Math.sin(a) * 0.05, a, 0.65 + r() * 0.3, 0.06, 0.3 + r() * 0.15, 0.35), 'base', 'tip')); }
        for (let i = 0; i < 3; i++) { const a = r() * TAU, x = Math.cos(a) * 0.12, z = Math.sin(a) * 0.12, h = 0.95 + r() * 0.2;
          out.push(part(blade(0, 0, a, h * 0.8, 0.015, 0.14, 0), 'base', 'base'));
          out.push(part(moved(lathe([[0, 1, 1], [1, 0.6, 0.9], [0, 0, 0.6]], 3, a), x, h * 0.8 - 0.05, z, 0.07, 0.28), 'head', 'head')); }
        return out; } },
  },
};
export const tris = parts => parts.reduce((n, p) => n + p.indices.length / 3, 0);
