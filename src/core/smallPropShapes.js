// AP7d: the shapes of the six small props (DESIGN §8b "Small props", docs/art/small-props/SPEC.md).
// Pure (no Three.js, no DOM), tested in tests/small-props.test.js. The numbers are the artist's reference
// geometry (docs/art/small-props/pieces.js, owner-approved), tidied: same blades, same stones, same triangle counts.
// A shape is one merged indexed part in the core/trees.js format plus a colour pair per vertex:
//   { positions: [x, y, z, ...], indices, w, lo: [slot per vertex], hi: [slot per vertex] }
// and a vertex's colour = mix(slot lo, slot hi, w) (sRGB, like gradientHex). Metres, y up, foot at y 0.
// Every copy of a piece has the same shape (the artist's seed 1): the variation is the turn, size and tint.
import { lathe } from './trees.js';

const TAU = Math.PI * 2;
// The artist's tiny seeded random (a linear congruential generator), so the shapes are exactly the reference.
// Only used to build a shape, never at play time.
const lcg = seed => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const part = (p, lo, hi) => ({ ...p, lo, hi });
const moved = (p, x, y, z, sx = 1, sy = 1, sz = sx) => ({ ...p, positions: p.positions.map((v, i) => i % 3 === 0 ? v * sx + x : i % 3 === 1 ? v * sy + y : v * sz + z) });

// A blade: base (2 verts) → bend (2 verts) → tip (1 vert) = 3 triangles, drawn double-sided.
// a = direction it leans to, lean = how far the tip goes out (× h), wd = base width, curl = how much the top droops (0 straight … 1 bends over)
function blade(x, z, a, h, wd, lean, curl = 0.3) {
  const dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx;
  const mid = 0.55, mo = lean * h * 0.35, to = lean * h, ty = h * (1 - curl * 0.35);
  return {
    positions: [
      x - px * wd / 2, 0, z - pz * wd / 2, x + px * wd / 2, 0, z + pz * wd / 2,
      x + dx * mo - px * wd * 0.4, h * mid, z + dz * mo - pz * wd * 0.4, x + dx * mo + px * wd * 0.4, h * mid, z + dz * mo + pz * wd * 0.4,
      x + dx * to, ty, z + dz * to],
    indices: [0, 1, 3, 0, 3, 2, 2, 3, 4], w: [0, 0, 0.55, 0.55, 1],
  };
}
// A flat flower head: a centre (a touch raised) + n petal points, facing up (n triangles)
function head(x, y, z, r, n = 5, rot = 0) {
  const positions = [x, y + r * 0.15, z], indices = [], w = [1];
  for (let i = 0; i < n; i++) { const a = rot + (i / n) * TAU; positions.push(x + r * Math.cos(a), y, z + r * Math.sin(a)); w.push(0.6); }
  for (let i = 0; i < n; i++) indices.push(0, 1 + ((i + 1) % n), 1 + i);
  return { positions, indices, w };
}
// A stone: a squashed lathe with a wobbly ring (2 × segs triangles)
const stone = (x, z, r, h, segs, twist) => moved(lathe([[0, 1, 1], [1, 0.35, 0.6, 0.22], [0, -0.15, 0]], segs, twist), x, 0, z, r, h, r * 0.85);

// The bush's dome: an ellipsoid (r 0.68, centre 0.42, half-height 0.5), 6 sides × 3 bands = 30 triangles
const DOME = { r: 0.68, cy: 0.42, ry: 0.5, th: [0, 0.95, 1.75, 2.2] }; // ring angles from the top (rad)
const domeAt = (th, a) => [DOME.r * Math.sin(th) * Math.cos(a), Math.max(0, DOME.cy + DOME.ry * Math.cos(th)), DOME.r * Math.sin(th) * Math.sin(a)];
const dome = (segs, twist) => lathe(DOME.th.map((t, i) => [i ? domeAt(t, 0)[0] : 0, domeAt(t, 0)[1], 1 - i / 3, i ? 0.08 : 0]), segs, twist);
// A raised flower clump on the dome at (th, a): n points in a fan lifted `lift` off the surface, its centre puffed `puff` × rad out along the normal (n triangles)
function spot(th, a, rad, n, lift, puff) {
  const c = domeAt(th, a).map((v, i) => i === 1 ? DOME.cy + (v - DOME.cy) * lift : v * lift);
  let nx = Math.sin(th) * Math.cos(a) / DOME.r, ny = Math.cos(th) / DOME.ry, nz = Math.sin(th) * Math.sin(a) / DOME.r;
  const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
  const ux = -Math.sin(a), uz = Math.cos(a), vx = ny * Math.cos(a), vy = -Math.hypot(nx, nz), vz = ny * Math.sin(a);
  const positions = [c[0] + nx * rad * puff, c[1] + ny * rad * puff, c[2] + nz * rad * puff], indices = [], w = [1];
  for (let i = 0; i < n; i++) {
    const b = (i / n) * TAU, cu = Math.cos(b) * rad, cv = Math.sin(b) * rad;
    positions.push(c[0] + ux * cu + vx * cv, c[1] + vy * cv, c[2] + uz * cu + vz * cv); w.push(0.7);
  }
  for (let i = 0; i < n; i++) indices.push(0, 1 + i, 1 + ((i + 1) % n));
  return { positions, indices, w };
}

// The six shapes (the artist's picks: tuft A, flowers C, bush D2, pebbles A, pebbles B, reeds B), each → parts.
const SHAPES = {
  // 7 slim blades fanning out from a tiny ring (21 triangles, 0.28–0.42 m tall)
  grassTuft(r) {
    return Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * TAU + r() * 0.6;
      return part(blade(Math.cos(a) * 0.03, Math.sin(a) * 0.03, a, 0.28 + r() * 0.14, 0.055, 0.45 + r() * 0.2, 0.3), 'base', 'tip');
    });
  },
  // 9 flat 5-point flower heads lying 3 cm above the grass over an oval ~0.8 × 0.65 m (45 triangles)
  flowerPatch(r) {
    return Array.from({ length: 9 }, () => {
      const a = r() * TAU, d = Math.sqrt(r()) * 0.4;
      return part(head(Math.cos(a) * d, 0.03, Math.sin(a) * d * 0.8, 0.075, 5, r() * 3), 'petal', 'petal');
    });
  },
  // a green dome (crown 'low', foot 'top', as in the approved mock-up) with 4 raised flower clumps (30 + 4 × 4 = 46 triangles)
  flowerBush(r) {
    const d = dome(6, r() * 3); d.w = d.w.map(v => 1 - v);
    const out = [part(d, 'low', 'top')];
    for (let i = 0; i < 4; i++) out.push(part(spot(0.3 + r() * 0.8, (i / 4) * TAU + r() * 0.8, 0.19, 4, 1.12, 0.55), 'flower', 'flower'));
    return out;
  },
  // 3 squashed 5-sided stones (30 triangles)
  pebbles(r) {
    return [[0, 0, 0.16, 0.09], [0.22, 0.08, 0.1, 0.06], [0.05, 0.22, 0.08, 0.05]].map(([x, z, s, h]) => part(stone(x, z, s, h, 5, r() * 3), 'stone', 'stone'));
  },
  // one bigger flat 6-sided stepping stone, 0.64 × 0.52 m, 0.12 m tall (24 triangles)
  flatStone(r) {
    return [part(moved(lathe([[0, 1, 1], [0.8, 0.8, 0.8, 0.2], [1, 0.3, 0.5, 0.2], [0, -0.2, 0]], 6, r() * 3), 0, 0, 0, 0.32, 0.12, 0.26), 'stone', 'stone')];
  },
  // 10 tall blades bending gently outward, 0.7–1.15 m (30 triangles)
  reeds(r) {
    return Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * TAU + r() * 0.4;
      return part(blade(Math.cos(a) * 0.06, Math.sin(a) * 0.06, a, 0.7 + r() * 0.45, 0.06, 0.25 + r() * 0.2, 0.45), 'base', 'tip');
    });
  },
};
// Pieces drawn from both sides (thin blades); the rest face out.
const DOUBLE_SIDED = new Set(['grassTuft', 'reeds']);
const SHAPE_SEED = 1; // every copy of a piece has the shape the artist's mock-up builds with seed 1

export const SMALL_PROP_PIECES = Object.freeze(Object.keys(SHAPES));
// → { positions, indices, w, lo, hi (a slot name per vertex), tris, height, doubleSide }
export function smallPropPart(id) {
  if (!SHAPES[id]) throw new Error(`no small-prop shape "${id}" (core/smallPropShapes.js)`);
  const out = { positions: [], indices: [], w: [], lo: [], hi: [] };
  for (const p of SHAPES[id](lcg(SHAPE_SEED))) {
    const base = out.positions.length / 3, n = p.positions.length / 3;
    out.positions.push(...p.positions); out.w.push(...p.w);
    for (const i of p.indices) out.indices.push(i + base);
    for (let i = 0; i < n; i++) { out.lo.push(p.lo); out.hi.push(p.hi); }
  }
  let height = 0;
  for (let i = 1; i < out.positions.length; i += 3) height = Math.max(height, out.positions[i]);
  return { ...out, tris: out.indices.length / 3, height, doubleSide: DOUBLE_SIDED.has(id) };
}
