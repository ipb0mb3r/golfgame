// X43: the see-through water surface's pure part (DESIGN §8b "The ground material", "The water surface").
// Looks only: surfaceAt, heightAt and every collider are unchanged (no ball stops anywhere else).
// Pure: no Three.js, no DOM (coding rule 1). The game turns the result into one mesh (src/game/scene.js).
//
// The water is found from the physics surfaces (surface 'water': ponds, creeks, lakes) on a grid of
// `look.step` m over the hole's map. Each connected body of water gets a level:
//   level = the lowest shore point of the body (half way between the last wet and the first dry grid
//   point, lowest over the whole shore) − look.drop,
// and each wet grid point is drawn at max(level, bed + look.lift): a pond in a bowl is flat at its level,
// a creek that runs down a slope follows its bed just above it.
//
// The soft edge (owner, 2026-11-23: "it should blend better, even if the surface ends up a little bit on the
// rock"): the water's real edge is found between each wet and dry grid neighbour (bisected on surfaceAt) and
// joined into a line (marching squares); every vertex gets its distance to that line, + in the water, − on
// land (`shore`). The mesh reaches past the edge onto the bank, its points there `look.hug` m over the ground,
// and the shader fades the surface out from `look.edge[1]` m inside the water to `look.edge[0]` m onto the bank,
// so the edge is a soft gradient that follows the real shore, not the line where the ground cuts the mesh.
import { WATER_LOOK } from './config.js';
import { mixHex } from './backdrop.js';

const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Squared distance from (px, pz) to the segment a–b ([x, z, x, z])
function segDist2(px, pz, s) {
  const dx = s[2] - s[0], dz = s[3] - s[1], l2 = dx * dx + dz * dz;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - s[0]) * dx + (pz - s[1]) * dz) / l2)) : 0;
  const ex = s[0] + t * dx - px, ez = s[1] + t * dz - pz;
  return ex * ex + ez * ez;
}

// hole: { map: { x0, x1, z0, z1 } }, terrain: { heightAt, surfaceAt }
// → null (no water on the hole) or { positions: Float32Array (x, y, z per vertex), shore: Float32Array (m to the
//   water's edge per vertex: + in the water, − on land, clamped to ± the search reach), index: Uint32Array,
//   bodies: [{ level, wet }], tris, box: { x0, x1, z0, z1 } }
export function waterSurface(hole, terrain, look = WATER_LOOK) {
  const { map } = hole, { heightAt, surfaceAt } = terrain, s = look.step;
  const W = Math.floor((map.x1 - map.x0) / s) + 1, H = Math.floor((map.z1 - map.z0) / s) + 1;
  const X = i => map.x0 + i * s, Z = j => map.z0 + j * s;
  const isWet = (x, z) => surfaceAt(x, z) === 'water';
  const wet = new Uint8Array(W * H);
  let any = false;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (isWet(X(i), Z(j))) { wet[j * W + i] = 1; any = true; }
  }
  if (!any) return null;

  // the bodies: 4-connected wet grid points; each one's level from its shore
  const body = new Int32Array(W * H).fill(-1), bodies = [], bed = new Float32Array(W * H);
  const hAt = new Map(); // the heights of the dry points (each asked once)
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

  // The water's edge: a crossing on every grid edge between a wet and a dry point (bisected), joined per cell
  // (marching squares: 2 crossings = one segment, 4 = two) and filed by cell for the distance search
  const cross = edge => {
    const [ka, kb] = edge, wa = wet[ka];
    let ax = X(ka % W), az = Z((ka / W) | 0), bx = X(kb % W), bz = Z((kb / W) | 0);
    for (let it = 0; it < look.bisect; it++) {
      const mx = (ax + bx) / 2, mz = (az + bz) / 2;
      if (isWet(mx, mz) === !!wa) { ax = mx; az = mz; } else { bx = mx; bz = mz; }
    }
    return [(ax + bx) / 2, (az + bz) / 2];
  };
  const crossAt = new Map(); // grid edge key → crossing (each edge bisected once)
  const crossing = (ka, kb) => {
    const key = ka < kb ? ka * 2 + (kb - ka === 1 ? 0 : 1) : kb * 2 + (ka - kb === 1 ? 0 : 1);
    let c = crossAt.get(key); if (!c) { c = cross([ka, kb]); crossAt.set(key, c); } return c;
  };
  const segs = new Map(); // cell index → [[x, z, x, z], ...]
  for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) {
    const a = j * W + i, b = a + 1, c = a + W, d = c + 1;
    const n = wet[a] + wet[b] + wet[c] + wet[d];
    if (n === 0 || n === 4) continue;
    const pts = [];
    for (const [p, q] of [[a, b], [b, d], [d, c], [c, a]]) if (wet[p] !== wet[q]) pts.push(crossing(p, q));
    const list = [];
    for (let m = 0; m + 1 < pts.length; m += 2) list.push([pts[m][0], pts[m][1], pts[m + 1][0], pts[m + 1][1]]);
    segs.set(a, list);
  }
  // Each grid point's distance to the edge (+ wet, − dry), searched within `reach` m (± reach beyond)
  const reach = Math.max(look.edge[0], look.edge[1]) + s, R = Math.ceil(reach / s);
  const shoreOf = new Float32Array(W * H);
  const done = new Uint8Array(W * H);
  const shoreAt = k => {
    if (done[k]) return shoreOf[k];
    const i = k % W, j = (k / W) | 0, x = X(i), z = Z(j);
    let best = reach * reach;
    for (let b = Math.max(0, j - R); b <= Math.min(H - 2, j + R - 1); b++) for (let a = Math.max(0, i - R); a <= Math.min(W - 2, i + R - 1); a++) {
      const list = segs.get(b * W + a); if (!list) continue;
      for (const sg of list) best = Math.min(best, segDist2(x, z, sg));
    }
    const v = Math.sqrt(best) * (wet[k] ? 1 : -1);
    done[k] = 1; shoreOf[k] = v; return v;
  };

  // The cells drawn: every cell with a wet corner, and every dry cell the fade still reaches (a corner less than
  // edge[0] m from the water); the vertices: their corners. A dry corner lies `hug` m over the ground.
  const vid = new Int32Array(W * H).fill(-1), pos = [], shore = [], idx = [];
  const box = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
  const vert = k => {
    if (vid[k] >= 0) return vid[k];
    const i = k % W, j = (k / W) | 0, x = X(i), z = Z(j);
    const y = wet[k] ? Math.max(bodies[body[k]].level, bed[k] + look.lift) : dryH(k) + look.hug;
    vid[k] = pos.length / 3; pos.push(x, y, z); shore.push(shoreAt(k));
    if (x < box.x0) box.x0 = x; if (x > box.x1) box.x1 = x; if (z < box.z0) box.z0 = z; if (z > box.z1) box.z1 = z;
    return vid[k];
  };
  const near = new Uint8Array(W * H); // dry points next to (8-neighbours of) a wet one, R deep
  for (let k = 0; k < W * H; k++) if (wet[k]) near[k] = 1;
  for (let r = 0; r < R; r++) {
    const add = [];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i; if (near[k]) continue;
      for (let dj = -1; dj <= 1 && !near[k]; dj++) for (let di = -1; di <= 1; di++) {
        const a = i + di, b = j + dj;
        if (a >= 0 && b >= 0 && a < W && b < H && near[b * W + a]) { add.push(k); break; }
      }
    }
    for (const k of add) near[k] = 1;
  }
  for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) {
    const a = j * W + i, b = a + 1, c = a + W, d = c + 1;
    if (!(near[a] && near[b] && near[c] && near[d])) continue;
    if (!(wet[a] | wet[b] | wet[c] | wet[d]) && Math.max(shoreAt(a), shoreAt(b), shoreAt(c), shoreAt(d)) <= -look.edge[0]) continue;
    const va = vert(a), vb = vert(b), vc = vert(c), vd = vert(d);
    idx.push(va, vc, vb, vb, vc, vd); // counter-clockwise seen from above (+y)
  }
  return { positions: new Float32Array(pos), shore: new Float32Array(shore), index: new Uint32Array(idx), bodies, tris: idx.length / 3, box };
}

// How opaque the surface is at a vertex's distance to the edge (0 on the bank at edge[0] m out, 1 from edge[1] m
// in, smooth between): the same smoothstep the shader runs per pixel.
export function shoreFade(d, look = WATER_LOOK) {
  const t = Math.max(0, Math.min(1, (d + look.edge[0]) / (look.edge[0] + look.edge[1])));
  return t * t * (3 - 2 * t);
}

// The surface's colours from the biome palette (hex strings '#rrggbb'): the tint (the bed's shallow `water`
// lightened toward the sky's `skyHorizon`), the sky reflected at a grazing angle and the sun's sheen.
export function waterColours(P, look = WATER_LOOK) {
  return { tint: mixHex(P.water, P.skyHorizon, look.tint), sky: P.skyHorizon, sun: P.sun };
}
