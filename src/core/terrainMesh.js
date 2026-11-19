// AP1b: the terrain mesh, with detail by distance (DESIGN §5 "Terrain mesh"). Pure: no Three.js, no
// DOM. src/game/scene.js turns the arrays into one BufferGeometry (one draw call).
//
// The hole's scenery.mesh ({ xs, zs }: [start, end, step] parts) still says where the mesh ends, its
// far cell size and where the fine area and the green's finer band are. The mesh is cut into tiles:
//   - the fine area (the parts with a step of 1 m or less, about the map) is cut into
//     TERRAIN_LOD.tile m squares. A tile is drawn with 1 m cells when the play area is in it or next
//     to it (TERRAIN_LOD.detailSurfaces: fairway, green, fringe, tee, sand, plus one tile of margin),
//     with the green band's 0.5 m cells around the green, and otherwise with the coarsest cells
//     (2, 4 or 8 m) that stay within TERRAIN_LOD.tol of heightAt on every 1 m point of the tile;
//   - the far ring keeps the far cell size of scenery.mesh (10 m) across, one tile row / column long
//     along the fine area, so the far silhouettes are drawn from the same points as before.
// Physics never reads this mesh: the ball keeps heightAt. Where a fine tile meets a coarser one, the
// fine tile's edge points are put on the coarse edge (the coarse tile's points are a subset of the
// fine one's), so there are no cracks. Normals come from heightAt by central differences, so the
// shading is continuous across tiles.
import { TERRAIN_LOD } from './config.js';
import { meshAxis } from './terrain.js';

// The fine area and the far step of one axis of scenery.mesh: { lo, hi, step, bandLo, bandHi, bandStep, outLo, outHi, farStep }
function axisPlan(parts) {
  const fine = parts.filter(p => p[2] <= TERRAIN_LOD.fineStep + 1e-9);
  if (!fine.length) return null;
  const band = fine.filter(p => p[2] < TERRAIN_LOD.fineStep - 1e-9);
  const far = parts.filter(p => p[2] > TERRAIN_LOD.fineStep + 1e-9);
  return {
    lo: Math.min(...fine.map(p => p[0])), hi: Math.max(...fine.map(p => p[1])),
    band: band.length ? [Math.min(...band.map(p => p[0])), Math.max(...band.map(p => p[1])), Math.min(...band.map(p => p[2]))] : null,
    outLo: parts[0][0], outHi: parts[parts.length - 1][1],
    farStep: far.length ? Math.max(...far.map(p => p[2])) : TERRAIN_LOD.tile,
  };
}

// Tile edges along one axis: [outLo, lo] (far), then lo + k·tile up to hi, then [hi, outHi] (far)
function cuts(P) {
  const c = [];
  if (P.outLo < P.lo - 1e-6) c.push({ a: P.outLo, b: P.lo, far: true });
  for (let v = P.lo; v < P.hi - 1e-6; v += TERRAIN_LOD.tile) c.push({ a: v, b: Math.min(v + TERRAIN_LOD.tile, P.hi), far: false });
  if (P.outHi > P.hi + 1e-6) c.push({ a: P.hi, b: P.outHi, far: true });
  return c;
}

// The drawn height of one tile at (x, z) (for the checks in tests/terrain-mesh.test.js)
export const tileHeight = (t, x, z) => gridHeight(t.xs, t.zs, t.h, x, z);
// Heights on the piecewise-linear surface of a grid (axes xs, zs; heights h[j * nx + i]) at (x, z),
// with the same triangles as the index below (diagonal from (i+1, j) to (i, j+1))
export function gridHeight(xs, zs, h, x, z) {
  const nx = xs.length;
  const i = findCell(xs, x), j = findCell(zs, z);
  const u = (x - xs[i]) / (xs[i + 1] - xs[i]), v = (z - zs[j]) / (zs[j + 1] - zs[j]);
  const a = h[j * nx + i], b = h[j * nx + i + 1], c = h[(j + 1) * nx + i], d = h[(j + 1) * nx + i + 1];
  return u + v <= 1 ? a + u * (b - a) + v * (c - a) : d + (1 - u) * (c - d) + (1 - v) * (b - d);
}
// The cell index k with axis[k] <= v <= axis[k + 1] (clamped to the axis)
function findCell(axis, v) {
  let lo = 0, hi = axis.length - 2;
  if (v <= axis[0]) return 0;
  if (v >= axis[hi + 1]) return hi;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (axis[m] <= v) lo = m; else hi = m - 1; }
  return lo;
}

// Build the mesh of a hole: { positions, normals, uvs, index, tiles, triangles, heightOnMesh(x, z) }.
// terrain = makeTerrain(hole) (heightAt, surfaceAt).
export function buildTerrainMesh(hole, terrain) {
  const { surfaceAt } = terrain;
  const sc = hole.scenery, map = hole.map;
  const PX = axisPlan(sc.mesh.xs), PZ = axisPlan(sc.mesh.zs);
  const heightAt = PX && PZ ? latticeCache(PX, PZ, terrain.heightAt) : terrain.heightAt;
  let tiles;
  if (!PX || !PZ) {
    // no fine area (a flat hole drawn as one quad): one tile on the hole's own axes
    tiles = [{ col: 0, row: 0, xs: meshAxis(sc.mesh.xs), zs: meshAxis(sc.mesh.zs) }];
  } else {
    tiles = planTiles(PX, PZ, heightAt, surfaceAt);
  }
  return assemble(tiles, map, heightAt, PX, PZ);
}

// heightAt, remembered on the 1 m points of the fine area (and one point around it): the tiles, their
// error checks and the normals all read the same points, so each is worked out once
function latticeCache(PX, PZ, heightAt) {
  const s = TERRAIN_LOD.fineStep, x0 = PX.lo - s, z0 = PZ.lo - s;
  const nx = Math.round((PX.hi - PX.lo) / s) + 3, nz = Math.round((PZ.hi - PZ.lo) / s) + 3;
  const H = new Float64Array(nx * nz).fill(NaN);
  return (x, z) => {
    const fi = (x - x0) / s, fj = (z - z0) / s, i = Math.round(fi), j = Math.round(fj);
    if (i < 0 || j < 0 || i >= nx || j >= nz || Math.abs(fi - i) > 1e-7 || Math.abs(fj - j) > 1e-7) return heightAt(x, z);
    const k = j * nx + i;
    const v = H[k];
    return v === v ? v : (H[k] = heightAt(x0 + i * s, z0 + j * s));
  };
}

function planTiles(PX, PZ, heightAt, surfaceAt) {
  const L = TERRAIN_LOD, CX = cuts(PX), CZ = cuts(PZ), nC = CX.length, nR = CZ.length;
  const step = new Float64Array(nC * nR), detail = new Uint8Array(nC * nR), inBand = new Uint8Array(nC * nR);
  const detailSet = new Set(L.detailSurfaces);
  for (let r = 0; r < nR; r++) for (let c = 0; c < nC; c++) {
    const X = CX[c], Z = CZ[r], k = r * nC + c;
    if (X.far || Z.far) continue;
    // the play area: any 1 m point of the tile on a detail surface
    const xs = meshAxis([[X.a, X.b, L.fineStep]]), zs = meshAxis([[Z.a, Z.b, L.fineStep]]);
    for (const z of zs) { for (const x of xs) if (detailSet.has(surfaceAt(x, z))) { detail[k] = 1; break; } if (detail[k]) break; }
    if (PX.band && PZ.band && X.a < PX.band[1] && X.b > PX.band[0] && Z.a < PZ.band[1] && Z.b > PZ.band[0]) inBand[k] = 1;
  }
  for (let r = 0; r < nR; r++) for (let c = 0; c < nC; c++) {
    const X = CX[c], Z = CZ[r], k = r * nC + c;
    if (X.far || Z.far) continue;
    if (inBand[k]) { step[k] = Math.min(PX.band[2], PZ.band[2]); continue; }
    // one tile of margin around the play area
    let near = false;
    for (let dr = -1; dr <= 1 && !near; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < nR && cc >= 0 && cc < nC && detail[rr * nC + cc]) { near = true; break; }
    }
    step[k] = near ? L.fineStep : coarsest(X, Z, heightAt);
    // steep spots (creek banks, bunker faces, rock edges): 0.5 m cells where 1 m cells would miss
    // heightAt in the middle of a cell by more than fineTol (play area) or roughTol (elsewhere)
    if (step[k] === L.fineStep && needsFiner(X, Z, heightAt, near ? L.fineTol : L.roughTol)) step[k] = L.finerStep;
  }
  const tiles = [];
  for (let r = 0; r < nR; r++) for (let c = 0; c < nC; c++) {
    const X = CX[c], Z = CZ[r], k = r * nC + c;
    // far ring: the far step across, one fine tile along (so its edge points are on the fine tile's)
    const sx = X.far ? PX.farStep : Z.far ? L.tile : step[k];
    const sz = Z.far ? PZ.farStep : X.far ? L.tile : step[k];
    tiles.push({ col: c, row: r, xs: meshAxis([[X.a, X.b, sx]]), zs: meshAxis([[Z.a, Z.b, sz]]) });
  }
  return tiles;
}

// True when a 1 m cell of the tile misses heightAt by more than tol at its centre (the middle of
// its diagonal, where a cell's two triangles are furthest from a curved ground)
function needsFiner(X, Z, heightAt, tol) {
  const L = TERRAIN_LOD, xs = meshAxis([[X.a, X.b, L.fineStep]]), zs = meshAxis([[Z.a, Z.b, L.fineStep]]);
  for (let j = 0; j < zs.length - 1; j++) for (let i = 0; i < xs.length - 1; i++) {
    const mid = (heightAt(xs[i + 1], zs[j]) + heightAt(xs[i], zs[j + 1])) / 2;
    if (Math.abs(mid - heightAt((xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2)) > tol) return true;
  }
  return false;
}

// The coarsest step (from TERRAIN_LOD.steps, largest first) whose surface stays within tol of the
// true heights on every 1 m point of the tile
function coarsest(X, Z, heightAt) {
  const L = TERRAIN_LOD;
  const fx = meshAxis([[X.a, X.b, L.fineStep]]), fz = meshAxis([[Z.a, Z.b, L.fineStep]]);
  const H = new Float64Array(fx.length * fz.length);
  fz.forEach((z, j) => fx.forEach((x, i) => { H[j * fx.length + i] = heightAt(x, z); }));
  for (const s of L.steps) {
    if (s <= L.fineStep) break;
    const xs = meshAxis([[X.a, X.b, s]]), zs = meshAxis([[Z.a, Z.b, s]]);
    const h = new Float64Array(xs.length * zs.length);
    // the coarse points are fine points too (the last one is the tile's end, the fine axis's last)
    const at = (v, a, b, n) => (v >= b - 1e-9 ? n - 1 : Math.round((v - a) / L.fineStep));
    zs.forEach((z, j) => xs.forEach((x, i) => { h[j * xs.length + i] = H[at(z, Z.a, Z.b, fz.length) * fx.length + at(x, X.a, X.b, fx.length)]; }));
    let ok = true;
    for (let j = 0; j < fz.length && ok; j++) for (let i = 0; i < fx.length; i++) {
      if (Math.abs(gridHeight(xs, zs, h, fx[i], fz[j]) - H[j * fx.length + i]) > L.tol) { ok = false; break; }
    }
    if (ok) return s;
  }
  return L.fineStep;
}

// Heights, crack-free edges, normals, uvs and the index of every tile, in one set of arrays
function assemble(tiles, map, heightAt, PX, PZ) {
  const byPos = new Map(tiles.map(t => [t.col + ',' + t.row, t]));
  for (const t of tiles) {
    t.h = new Float64Array(t.xs.length * t.zs.length);
    t.zs.forEach((z, j) => t.xs.forEach((x, i) => { t.h[j * t.xs.length + i] = heightAt(x, z); }));
  }
  // No cracks: an edge with more points than its neighbour's takes the neighbour's (coarser) edge line
  const lerpAxis = (axis, vals, v) => { const k = findCell(axis, v), u = (v - axis[k]) / (axis[k + 1] - axis[k]); return vals[k] + u * (vals[k + 1] - vals[k]); };
  for (const t of tiles) {
    const nx = t.xs.length, nz = t.zs.length;
    const edges = [
      { n: byPos.get(t.col - 1 + ',' + t.row), mine: j => j * nx, theirs: (o, j) => j * o.xs.length + o.xs.length - 1, a: t.zs, b: o => o.zs },
      { n: byPos.get(t.col + 1 + ',' + t.row), mine: j => j * nx + nx - 1, theirs: (o, j) => j * o.xs.length, a: t.zs, b: o => o.zs },
      { n: byPos.get(t.col + ',' + (t.row - 1)), mine: i => i, theirs: (o, i) => (o.zs.length - 1) * o.xs.length + i, a: t.xs, b: o => o.xs },
      { n: byPos.get(t.col + ',' + (t.row + 1)), mine: i => (nz - 1) * nx + i, theirs: (o, i) => i, a: t.xs, b: o => o.xs },
    ];
    for (const e of edges) {
      if (!e.n) continue;
      const theirAxis = e.b(e.n);
      if (theirAxis.length >= e.a.length) continue;
      const vals = theirAxis.map((_, k) => e.n.h0 ? e.n.h0[e.theirs(e.n, k)] : e.n.h[e.theirs(e.n, k)]);
      if (!t.h0) t.h0 = t.h.slice(); // keep the true heights for the neighbours that read this tile
      e.a.forEach((v, k) => { t.h[e.mine(k)] = lerpAxis(theirAxis, vals, v); });
    }
  }
  // Vertex arrays
  let nv = 0, ni = 0;
  for (const t of tiles) { t.v0 = nv; nv += t.xs.length * t.zs.length; ni += (t.xs.length - 1) * (t.zs.length - 1) * 6; }
  const positions = new Float32Array(nv * 3), normals = new Float32Array(nv * 3), uvs = new Float32Array(nv * 2);
  const index = new Uint32Array(ni);
  const inFine = (x, z) => PX && x >= PX.lo - 1e-6 && x <= PX.hi + 1e-6 && z >= PZ.lo - 1e-6 && z <= PZ.hi + 1e-6;
  let p = 0;
  for (const t of tiles) {
    const nx = t.xs.length;
    t.zs.forEach((z, j) => t.xs.forEach((x, i) => {
      const k = t.v0 + j * nx + i;
      positions[k * 3] = x; positions[k * 3 + 1] = t.h[j * nx + i]; positions[k * 3 + 2] = z;
      // the normal: central differences of heightAt, 1 m apart in the fine area, the far step outside
      const d = inFine(x, z) ? TERRAIN_LOD.fineStep : (PX ? PX.farStep : 1);
      const gx = (heightAt(x + d, z) - heightAt(x - d, z)) / (2 * d), gz = (heightAt(x, z + d) - heightAt(x, z - d)) / (2 * d);
      const inv = 1 / Math.sqrt(gx * gx + 1 + gz * gz);
      normals[k * 3] = -gx * inv; normals[k * 3 + 1] = inv; normals[k * 3 + 2] = -gz * inv;
      uvs[k * 2] = (x - map.x0) / (map.x1 - map.x0);
      uvs[k * 2 + 1] = (map.z1 - z) / (map.z1 - map.z0);
    }));
    for (let j = 0; j < t.zs.length - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = t.v0 + j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      index[p++] = a; index[p++] = c; index[p++] = b;
      index[p++] = b; index[p++] = c; index[p++] = d;
    }
  }
  for (const t of tiles) delete t.h0;
  // The drawn height at (x, z), for the checks (tests/terrain-mesh.test.js): the ball must sit on it
  const colX = [...new Set(tiles.map(t => t.xs[0]))].sort((a, b) => a - b).concat(Infinity);
  const rowZ = [...new Set(tiles.map(t => t.zs[0]))].sort((a, b) => a - b).concat(Infinity);
  const heightOnMesh = (x, z) => {
    const c = findCell(colX, x), r = findCell(rowZ, z);
    const t = byPos.get(c + ',' + r);
    return gridHeight(t.xs, t.zs, t.h, x, z);
  };
  return { positions, normals, uvs, index, tiles, triangles: ni / 3, heightOnMesh };
}
