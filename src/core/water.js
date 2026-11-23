// X43: the see-through water surface's pure part (DESIGN §8b "The ground material", "The water surface").
// Looks only: surfaceAt, heightAt and every collider are unchanged (no ball stops anywhere else).
// Pure: no Three.js, no DOM (coding rule 1). The game turns the result into one mesh (src/game/scene.js).
//
// The water is found from the physics surfaces (surface 'water': ponds, creeks, lakes) on a grid of
// `look.step` m over the hole's map. Each connected body of water gets a level:
//   level = the lowest shore point of the body (half way between the last wet and the first dry grid
//   point, lowest over the whole shore) − look.drop,
// and each wet grid point is drawn at max(level, bed + look.lift): a pond in a bowl is flat at its level,
// a creek that runs down a slope follows its bed just above it. The grid points just outside the water
// (the shore ring) are put look.dive m UNDER the ground, so the surface runs into the bank and the
// ground's depth cuts it cleanly at the water's edge (no floating edge, no gap).
import { WATER_LOOK } from './config.js';
import { mixHex } from './backdrop.js';

const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// hole: { map: { x0, x1, z0, z1 } }, terrain: { heightAt, surfaceAt }
// → null (no water on the hole) or { positions: Float32Array (x, y, z per vertex), index: Uint32Array,
//   bodies: [{ level, wet }], tris, box: { x0, x1, z0, z1 } }
export function waterSurface(hole, terrain, look = WATER_LOOK) {
  const { map } = hole, { heightAt, surfaceAt } = terrain, s = look.step;
  const W = Math.floor((map.x1 - map.x0) / s) + 1, H = Math.floor((map.z1 - map.z0) / s) + 1;
  const X = i => map.x0 + i * s, Z = j => map.z0 + j * s;
  const wet = new Uint8Array(W * H);
  let any = false;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (surfaceAt(X(i), Z(j)) === 'water') { wet[j * W + i] = 1; any = true; }
  }
  if (!any) return null;

  // the bodies: 4-connected wet grid points; each one's level from its shore
  const body = new Int32Array(W * H).fill(-1), bodies = [], bed = new Float32Array(W * H);
  const hAt = new Map(); // the heights of the dry shore points (each asked once)
  const dryH = k => { let h = hAt.get(k); if (h === undefined) { h = heightAt(X(k % W), Z((k / W) | 0)); hAt.set(k, h); } return h; };
  const stack = [];
  for (let k0 = 0; k0 < W * H; k0++) {
    if (!wet[k0] || body[k0] >= 0) continue;
    const id = bodies.length;
    let shore = Infinity, n = 0;
    body[k0] = id; stack.push(k0);
    while (stack.length) {
      const k = stack.pop(), i = k % W, j = (k / W) | 0;
      bed[k] = heightAt(X(i), Z(j)); n++;
      for (const [di, dj] of NB) {
        const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= W || b >= H) continue;
        const q = b * W + a;
        if (wet[q]) { if (body[q] < 0) { body[q] = id; stack.push(q); } } else shore = Math.min(shore, (bed[k] + dryH(q)) / 2);
      }
    }
    bodies.push({ level: shore - look.drop, wet: n });
  }

  // the cells drawn: every cell with a wet corner; the vertices: their corners
  const vid = new Int32Array(W * H).fill(-1), pos = [], idx = [];
  const box = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
  const vert = k => {
    if (vid[k] >= 0) return vid[k];
    const i = k % W, j = (k / W) | 0, x = X(i), z = Z(j);
    let y;
    if (wet[k]) y = Math.max(bodies[body[k]].level, bed[k] + look.lift);
    else y = dryH(k) - look.dive;
    vid[k] = pos.length / 3; pos.push(x, y, z);
    if (x < box.x0) box.x0 = x; if (x > box.x1) box.x1 = x; if (z < box.z0) box.z0 = z; if (z > box.z1) box.z1 = z;
    return vid[k];
  };
  for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) {
    const a = j * W + i, b = a + 1, c = a + W, d = c + 1;
    if (!(wet[a] | wet[b] | wet[c] | wet[d])) continue;
    const va = vert(a), vb = vert(b), vc = vert(c), vd = vert(d);
    idx.push(va, vc, vb, vb, vc, vd); // counter-clockwise seen from above (+y)
  }
  return { positions: new Float32Array(pos), index: new Uint32Array(idx), bodies, tris: idx.length / 3, box };
}

// The surface's colours from the biome palette (hex strings '#rrggbb'): the tint (the bed's shallow `water`
// lightened toward the sky's `skyHorizon`), the sky reflected at a grazing angle and the sun's sheen.
export function waterColours(P, look = WATER_LOOK) {
  return { tint: mixHex(P.water, P.skyHorizon, look.tint), sky: P.skyHorizon, sun: P.sun };
}

// The quality switch: WATER_SURFACE 0 = today's look (the painted bed, and the old pond surface where a hole
// has one), 1 = the see-through surface over every water area (the old pond surface is then not drawn: X42).
export const waterSurfaceOn = v => Number(v) >= 0.5;
