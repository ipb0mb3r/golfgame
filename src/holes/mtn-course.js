// Mountain 9 (prototype, Phase C): the shared course kit. Every mtn-0N hole is a plain data spec
// turned into a hole by makeMtnHole(). Data only: it builds heightAt / surfaceAt from the spec with
// the engine's terrain helpers and never changes how the ball plays (surfaces come from the engine).
//
// The course idea (docs/COURSE_PLAN_MTN.md): "the creek", one mountain stream through the course.
// GENRE_NOTES rules built in here, so every hole gets them for free:
//   - hazards sit IN the ground: bunkers are hollows (own depth), the creek runs in a channel, ponds in a bowl
//   - surfaces make sense: water always has a lip (rough or rock), greens a fringe, trees stand in rough
//   - hills, not fields: the land beyond the fairway rises into banks, and the scenery outside OB rolls
//   - tee and green are smoothed so the first shot is from a flat lie and the cup sits on a gentle slope
import { ss, ell, bump, meshAxis } from '../core/terrain.js';
import { GROUND_PLANE_MARGIN, GROUND_CHECK_STEP } from '../core/config.js';
import { createRng } from '../core/rng.js';
import { createHolePlay } from '../core/play.js';

// ---- geometry helpers ----
// Distance from (x, z) to a polyline of points { x, z, w? }. Returns { d, w, t } where w is the
// half-width interpolated along the line (points without w use `w0`) and t = 0..1 along the whole line.
export function polyDist(x, z, pts, w0 = 0) {
  let best = { d: Infinity, w: w0, t: 0 };
  let run = 0, total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz, L = Math.sqrt(L2);
    const u = Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / L2));
    const d = Math.hypot(x - (a.x + dx * u), z - (a.z + dz * u));
    if (d < best.d) {
      const wa = a.w ?? w0, wb = b.w ?? w0;
      best = { d, w: wa + (wb - wa) * u, t: (run + L * u) / total };
    }
    run += L;
  }
  return best;
}
// Smooth minimum (k = blend distance in m): unions of shapes get rounded joints instead of sharp
// inside corners (playtest 1, L4: "no sharp angles", fairways flow like blobs)
export function smin(a, b, k) {
  if (!(k > 0)) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
// A blob (playtest 1, L4/L5): a main ellipse plus optional lobes, rotated by `rot` (rad), its edge
// wobbling by `wob` (0..0.3). Returns a "radius" like sqrt(ell): < 1 inside, 1 on the edge.
//   { cx, cz, rx, rz, rot?, wob?, seed?, lobes?: [{ cx, cz, rx, rz }] }  (lobes in world coordinates)
export function blobR(x, z, b) {
  // quick reject: far outside the blob's bounding circle (the painter calls this millions of times)
  if (b._R === undefined) {
    let R = Math.hypot(b.rx, b.rz);
    for (const l of b.lobes ?? []) R = Math.max(R, Math.hypot(l.cx - b.cx, l.cz - b.cz) + Math.hypot(l.rx, l.rz));
    Object.defineProperty(b, '_R', { value: R * (1 + (b.wob ?? 0)), enumerable: false });
  }
  const ddx = x - b.cx, ddz = z - b.cz;
  if (ddx * ddx + ddz * ddz > 9 * b._R * b._R) return 3;
  const one = (e) => {
    const dx = x - e.cx, dz = z - e.cz, c = Math.cos(b.rot ?? 0), sn = Math.sin(b.rot ?? 0);
    const u = (dx * c + dz * sn) / e.rx, v = (-dx * sn + dz * c) / e.rz;
    return Math.sqrt(u * u + v * v);
  };
  let r = one(b);
  for (const l of b.lobes ?? []) r = Math.min(r, one(l));
  if (b.wob) {
    const a = Math.atan2(z - b.cz, x - b.cx), k = b.seed ?? 1;
    r *= 1 + b.wob * (0.6 * Math.sin(3 * a + k) + 0.4 * Math.sin(5 * a + 2.3 * k));
  }
  return r;
}
// Chaikin corner cutting: a polyline (with optional half-widths w) becomes a smooth curve with the
// same end points, so creeks and fairway spines bend instead of kinking (L4, L8)
export function smoothLine(pts, rounds = 3) {
  let a = pts;
  for (let r = 0; r < rounds; r++) {
    const b = [a[0]];
    for (let i = 0; i < a.length - 1; i++) {
      const p = a[i], q = a[i + 1], mix = (t) => ({ x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t, ...(p.w !== undefined ? { w: p.w + (q.w - p.w) * t } : {}) });
      b.push(mix(0.25), mix(0.75));
    }
    b.push(a[a.length - 1]);
    a = b;
  }
  return a;
}
// A meandering creek (playtest 1, L8/L10): resample the smoothed line every ~3 m, push it sideways
// in gentle S-bends (amp m, wavelength len m) and let its width breathe (wvar, 0..0.5). The ends stay put.
export function meander(pts, { amp = 4, len = 70, wvar = 0.3, seed = 1 } = {}) {
  const out = [], total = polyLen(pts);
  let run = 0;
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1], b = pts[k], L = Math.hypot(b.x - a.x, b.z - a.z), nx = -(b.z - a.z) / L, nz = (b.x - a.x) / L;
    const n = Math.max(1, Math.round(L / 3));
    for (let i = (k === 1 ? 0 : 1); i <= n; i++) {
      const t = i / n, s = run + L * t, fade = Math.min(1, s / 25, (total - s) / 25);
      const off = amp * fade * (Math.sin(s / len * 2 * Math.PI + seed) + 0.35 * Math.sin(s / len * 5.1 + 2 * seed));
      const w = (a.w ?? 0) + ((b.w ?? 0) - (a.w ?? 0)) * t;
      out.push({ x: a.x + (b.x - a.x) * t + nx * off, z: a.z + (b.z - a.z) * t + nz * off, w: w * (1 + wvar * Math.sin(s / (len * 0.6) + 3 * seed)) });
    }
    run += L;
  }
  return out;
}
// Length of a polyline (m)
export const polyLen = pts => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - pts[i].x, p.z - pts[i].z), 0);

// ---- obstacles ----
// A pine-ish tree in play (trunk + leaves). s = size. Always placed on rough (GENRE_NOTES).
export const pine = (x, z, s = 1) => ({ type: 'tree', x, z, trunkR: 0.32 * s, trunkH: 6 * s, canopyR: 2.6 * s, canopyH: 6.5 * s });
export const boulder = (x, z, r = 1.2) => ({ type: 'boulder', x, z, r });

// ---- shared mountain scenery (looks only) ----
const SCENERY = {
  sky: 0xa8d4f5, cameraFar: 2400,
  hemi: 1.2, sun: { intensity: 2.0, pos: [-90, 80, 30] },
  paint: { res: 4, stripe: 7, green: 'stripes', border: true },
  flagColor: 0xff5a36, teeColor: 0xf2f2f2,
  trail: 600,
};

// ---- the hole builder ----
// spec fields (all positions in metres, tee at the origin is the convention, holes play toward −z):
//   id, number, name, par, difficulty, maxStrokes, tee, cup, aimTarget?, teeFacing?, playLine?, windMax?, intro
//   base(x, z)        overall ground profile (drops and climbs), default flat
//   hills: [{ x, z, r, h }]        bumps and dips (terrain.bump)
//   teePad: { h, r }  the tee box sits on a flat pad h metres above the base (raised tee), radius r
//   green: { cx, cz, rx, rz, raise, contour(x, z) → dh }  the putting surface; contour adds its slopes
//   fringe: m around the green (default 2.2)
//   fairways: [{ pts: [{ x, z, w }] }]  centre lines with half-widths
//   bunkers: [{ cx, cz, rx, rz, depth }]  hollows of sand (depth m, default 0.6)
//   creek: { pts: [{ x, z, w }], depth, bank, lip: 'rough' | 'rock' }  water in a channel, w = water half-width
//   ponds: [{ cx, cz, rx, rz, depth, lip, lipW }]  water in a bowl
//   rocks: [{ cx, cz, rx, rz, h }]  rock outcrops (rock surface, raised by h)
//   paths: [{ pts, w }]  cart paths (rock surface strip, GENRE_NOTES)
//   ob: { x0, x1, z0, z1 }   out-of-bounds box; map = the box + margin
//   banks: k  how fast the rough rises away from the fairway (m per m beyond 8 m), default 0.03
//   obstacles: [...]  trees and boulders
export function makeMtnHole(spec0) {
  // the OB line keeps at least 40 m of rough around the green, so the trees behind it fit in bounds
  const g0 = spec0.green, m0 = 40;
  const spec = { ...spec0, ob: {
    x0: Math.min(spec0.ob.x0, g0.cx - g0.rx - m0), x1: Math.max(spec0.ob.x1, g0.cx + g0.rx + m0),
    z0: Math.min(spec0.ob.z0, g0.cz - g0.rz - m0), z1: Math.max(spec0.ob.z1, g0.cz + g0.rz + m0),
  } };
  const fringeW = spec.fringe ?? 2.2;
  const G = spec.green;
  const base = spec.base ?? (() => 0);
  const hills = spec.hills ?? [], bunkers = spec.bunkers ?? [], ponds = spec.ponds ?? [], rocks = spec.rocks ?? [];
  const fairways = (spec.fairways ?? []).map(f => (f.pts.length > 2 ? { ...f, pts: smoothLine(f.pts) } : f));
  const paths = spec.paths ?? [];
  const creek = spec.creek ? { ...spec.creek, pts: meander(smoothLine(spec.creek.pts), spec.creek.meander ?? {}) } : null;
  const OB = spec.ob;
  const banks = spec.banks ?? 0.03;
  const tee = spec.tee, pad = spec.teePad ?? { h: 0.4, r: 4.5 };

  // the green's own outline size, ellipse "radius" (1 = on the edge)
  const gE = (x, z) => Math.sqrt(ell(x, z, G));
  const roughs = spec.roughs ?? [];
  const blend = spec.blend ?? 12; // m: how round the joints between fairway legs are
  // Signed distance to the fairway edge (< 0 = on the fairway). Every segment of every fairway is a
  // rounded strip; they are joined with a smooth minimum so legs flow into each other (L4), and the
  // edge wobbles a little along its length (f.wob, default 0.08) so it reads as a blob, not a ruler.
  // Segments of every fairway spine, precomputed (no allocation per lookup: the painter calls this
  // millions of times)
  const SEG = [];
  fairways.forEach((f, i) => {
    let run = 0;
    for (let k = 1; k < f.pts.length; k++) {
      const a = f.pts[k - 1], b = f.pts[k], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz);
      SEG.push({ ax: a.x, az: a.z, dx, dz, L2: dx * dx + dz * dz || 1e-9, L, wa: a.w ?? 0, wb: b.w ?? 0, run, i, wob: f.wob ?? 0.08, k: f.blend ?? blend });
      run += L;
    }
  });
  // A fairway with blend: 0 is an island (owner, hole 5): it never melts into the others, so the
  // rough between them stays visible. Islands join the rest with a plain minimum, after the blend.
  function fairwayGapRaw(x, z) {
    let gap = Infinity, island = Infinity;
    for (const g of SEG) {
      if (g.k === 0) {
        const u = Math.min(1, Math.max(0, ((x - g.ax) * g.dx + (z - g.az) * g.dz) / g.L2));
        const px = g.ax + g.dx * u - x, pz = g.az + g.dz * u - z;
        island = Math.min(island, Math.sqrt(px * px + pz * pz) - (g.wa + (g.wb - g.wa) * u));
        continue;
      }
      const u = Math.min(1, Math.max(0, ((x - g.ax) * g.dx + (z - g.az) * g.dz) / g.L2));
      const px = g.ax + g.dx * u - x, pz = g.az + g.dz * u - z;
      const d2 = px * px + pz * pz, w = g.wa + (g.wb - g.wa) * u;
      // far from this strip: it can't change the answer (the blend reaches at most k beyond its edge)
      if (gap < 1e8 && Math.sqrt(d2) - w * 1.3 > gap + g.k) continue;
      const along = g.run + g.L * u;
      const wob = 1 + g.wob * (0.6 * Math.sin(along / 17 + g.i * 1.7 + (x > 0 ? 0 : 2)) + 0.4 * Math.sin(along / 7.3 + g.i));
      gap = smin(gap, Math.sqrt(d2) - w * wob, g.k);
    }
    return Math.min(gap, island);
  }
  // Cached on a 1 m grid over the course (bilinear in between): every lookup is a few multiplies
  const GS = 2; // m per cell
  const GX0 = spec.ob.x0 - 12, GZ0 = spec.ob.z0 - 12, GW = Math.ceil((spec.ob.x1 - spec.ob.x0 + 24) / GS) + 1, GH = Math.ceil((spec.ob.z1 - spec.ob.z0 + 24) / GS) + 1;
  const GRID = new Float32Array(GW * GH);
  const GX1 = GX0 + (GW - 1) * GS, GZ1 = GZ0 + (GH - 1) * GS;
  const clampGrid = (x, z) => {
    const cx = Math.min(Math.max(x, GX0), GX1), cz = Math.min(Math.max(z, GZ0), GZ1);
    return [cx, cz, Math.hypot(x - cx, z - cz)];
  };
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) GRID[j * GW + i] = SEG.length ? Math.min(fairwayGapRaw(GX0 + i * GS, GZ0 + j * GS), 1e4) : 1e4;
  const fairwayGap = (x, z) => {
    // outside the grid (scenery far beyond OB): the edge value plus the distance to the edge
    const [cx, cz, out] = clampGrid(x, z);
    const fx = (cx - GX0) / GS, fz = (cz - GZ0) / GS;
    const i = Math.min(fx | 0, GW - 2), j = Math.min(fz | 0, GH - 2), tx = fx - i, tz = fz - j, o = j * GW + i;
    return (GRID[o] * (1 - tx) + GRID[o + 1] * tx) * (1 - tz) + (GRID[o + GW] * (1 - tx) + GRID[o + GW + 1] * tx) * tz + out;
  };

  // the creek's distance and half-width, cached on the same 1 m grid as the fairway
  const CD = creek ? new Float32Array(GW * GH) : null, CW = creek ? new Float32Array(GW * GH) : null;
  if (creek) {
    const P = creek.pts;
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const x = GX0 + i * GS, z = GZ0 + j * GS;
      let bd = Infinity, bw = 0;
      for (let k = 1; k < P.length; k++) {
        const a = P[k - 1], b = P[k], dx = b.x - a.x, dz = b.z - a.z;
        const u = Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1e-9)));
        const px = a.x + dx * u - x, pz = a.z + dz * u - z, d2 = px * px + pz * pz;
        if (d2 < bd) { bd = d2; bw = (a.w ?? 0) + ((b.w ?? 0) - (a.w ?? 0)) * u; }
      }
      CD[j * GW + i] = Math.sqrt(bd); CW[j * GW + i] = bw;
    }
  }
  const creekAt = (x, z) => {
    if (!creek) return null;
    const [cx, cz, out] = clampGrid(x, z);
    const fx = (cx - GX0) / GS, fz = (cz - GZ0) / GS;
    const i = Math.min(fx | 0, GW - 2), j = Math.min(fz | 0, GH - 2), tx = fx - i, tz = fz - j, o = j * GW + i;
    const bl = A => (A[o] * (1 - tx) + A[o + 1] * tx) * (1 - tz) + (A[o + GW] * (1 - tx) + A[o + GW + 1] * tx) * tz;
    return { d: bl(CD) + out, w: bl(CW) };
  };

  // The ground before tee and green smoothing
  function rawHeight(x, z) {
    let h = base(x, z);
    for (const b of hills) h += bump(x, z, b);
    // hills, not fields: the rough rises gently into banks away from the fairway and the green
    const gap = fairwayGap(x, z);
    if (gap > 8) h += banks * (gap - 8) * ss(1.4, 2.4, gE(x, z));
    // rock outcrops
    for (const r of rocks) h += r.h * (1 - ss(0.4, 1.25, Math.sqrt(ell(x, z, r))));
    return h;
  }
  // The green: a smooth surface at the raw height of its centre + raise, plus its contours
  const gBase = rawHeight(G.cx, G.cz) + (G.raise ?? 0);
  const teeY = rawHeight(tee.x, tee.z) + pad.h;
  function heightAt(x, z) {
    let h = rawHeight(x, z);
    // the green and its surrounds: blend to the green surface (a raised green gets a bank)
    const ge = gE(x, z);
    const gw = 1 - ss(1.0, 1.0 + (G.bank ?? 0.9), ge);
    if (gw > 0) h = h * (1 - gw) + (gBase + (G.contour ? G.contour(x, z) : 0)) * gw;
    // the tee box: a flat pad
    const td = Math.max(Math.abs(x - tee.x), Math.abs(z - tee.z));
    const tw = 1 - ss(pad.r, pad.r + 9, td);
    if (tw > 0) h = h * (1 - tw) + teeY * tw;
    // bunkers are hollows of their own depth, with a sloped face
    for (const b of bunkers) h -= (b.depth ?? 0.6) * (1 - ss(0.25, 1.12, blobR(x, z, b)));
    // ponds and lakes sit in a bowl
    for (const p of ponds) h -= (p.depth ?? 2.2) * (1 - ss(0.55, 1.15, blobR(x, z, p)));
    // the creek runs in a channel: water at the bottom, sloped banks (the lip) on each side
    if (creek) {
      const c = creekAt(x, z);
      h -= (creek.depth ?? 1.3) * (1 - ss(c.w, c.w + (creek.bank ?? 3), c.d));
    }
    return h;
  }

  function surfaceAt(x, z) {
    if (x < OB.x0 || x > OB.x1 || z < OB.z0 || z > OB.z1) return 'ob';
    if (Math.abs(x - tee.x) < 3.5 && Math.abs(z - tee.z) < 4) return 'tee';
    // water first (a creek running into a lake is one body of water), then the lips around it
    const c = creek ? creekAt(x, z) : null;
    let lip = null;
    for (let i = 0; i < ponds.length; i++) {
      const e = blobR(x, z, ponds[i]);
      if (e < 1) return 'water';
      if (!lip && e < 1 + (ponds[i].lipW ?? 2.5) / Math.min(ponds[i].rx, ponds[i].rz)) lip = ponds[i].lip ?? 'rough';
    }
    if (c && c.d < c.w) return 'water';
    if (c && c.d < c.w + (creek.lipW ?? 2.5)) return creek.lip ?? 'rough';
    if (lip) return lip;
    for (const b of bunkers) if (blobR(x, z, b) < 1) return 'sand';
    if (ell(x, z, G) < 1) return 'green';
    if (ell(x, z, G, fringeW) < 1) return 'fringe';
    for (const r of rocks) if (ell(x, z, r) < 1) return 'rock';
    for (const p of paths) { const d = polyDist(x, z, p.pts); if (d.d < (p.w ?? 1.4)) return 'rock'; }
    for (const r of roughs) if (blobR(x, z, r) < 1) return 'rough'; // L6: rough that bites into the fairway
    if (fairwayGap(x, z) < 0) return 'fairway';
    return 'rough';
  }

  // The terrain mesh: 1 m over the course, 0.5 m on the green, 10 m far away
  const M = 8; // map margin beyond OB
  const map = { x0: OB.x0 - M, x1: OB.x1 + M, z0: OB.z0 - M, z1: OB.z1 + M };
  const g0x = Math.floor(G.cx - G.rx - 8), g1x = Math.ceil(G.cx + G.rx + 8);
  const g0z = Math.floor(G.cz - G.rz - 8), g1z = Math.ceil(G.cz + G.rz + 8);
  const mesh = {
    xs: [[map.x0 - 300, map.x0, 10], [map.x0, g0x, 1], [g0x, g1x, 0.5], [g1x, map.x1, 1], [map.x1, map.x1 + 300, 10]],
    zs: [[map.z0 - 360, map.z0, 10], [map.z0, g0z, 1], [g0z, g1z, 0.5], [g1z, map.z1, 1], [map.z1, map.z1 + 200, 10]],
  };
  // K13: the background ground plane sits under the lowest drawn terrain (the same check as validateHole)
  let low = Infinity;
  const thin = parts => meshAxis(parts.map(([a, b, step]) => [a, b, Math.max(step, GROUND_CHECK_STEP)]));
  for (const x of thin(mesh.xs)) for (const z of thin(mesh.zs)) low = Math.min(low, heightAt(x, z));
  const groundY = Math.floor((low - GROUND_PLANE_MARGIN - 0.2) * 10) / 10;

  const lenZ = OB.z1 - OB.z0, midZ = (OB.z0 + OB.z1) / 2;
  // Water is painted on the ground (the creek follows the slope), so there is no flat water plane.
  const hole = {
    id: spec.id, number: spec.number, name: spec.name, par: spec.par, difficulty: spec.difficulty,
    maxStrokes: spec.maxStrokes ?? spec.par + 6,
    tee, cup: spec.cup,
    ...(spec.aimTarget ? { aimTarget: spec.aimTarget } : {}),
    ...(spec.teeFacing ? { teeFacing: spec.teeFacing } : {}), // S21: the point a turned tee box faces
    ...(spec.playLine ? { playLine: spec.playLine } : {}),
    bag: spec.bag ?? ['driver', '3w', '5i', '7i', '9i', 'pw', 'sw', 'putter'],
    windMax: spec.windMax ?? 4.5,
    weather: { type: 'clear', wetness: 0 },
    surfaceOverrides: spec.surfaceOverrides ?? {},
    map,
    features: { green: G, bunkers, ponds, rocks, creek, fairways, course: 'mtn' },
    obstacles: spec.obstacles ?? [],
    heightAt, surfaceAt,
    scenery: {
      ...SCENERY,
      fog: [320, 900 + lenZ],
      ground: { size: 3200, y: groundY },
      mesh,
      stakes: { xs: [OB.x0, OB.x1], z0: OB.z1 - 2, z1: OB.z0 + 2, step: 12 },
      trees: {
        count: Math.round(220 + lenZ * 0.6), xSpan: (OB.x1 - OB.x0) + 260, zTop: OB.z1 + 110, zSpan: lenZ + 300, sink: 0.2,
        exclude: (x, z) => (x > OB.x0 - 5 && x < OB.x1 + 5 && z > OB.z0 - 5 && z < OB.z1 + 5) || (Math.abs(x - tee.x) < 20 && z > tee.z),
      },
      hills: { count: 18, dist: [520 + lenZ * 0.4, 140], xz: [110, 70], y: [70, 60], posY: -18, cz: midZ },
      clouds: { count: 14, xSpan: 800, y: [110, 50], cz: midZ, zOff: 0.4, zSpan: 900 },
      minimap: minimapSize(OB),
      ...(spec.scenery ?? {}),
    },
    intro: spec.intro,
  };
  if (spec.forest) hole.obstacles = [...hole.obstacles, ...plantForest(hole, spec, fairways)];
  return hole;
}

// Playtest 1, L2: "many more trees close to the course". Tree lines along both sides of every
// fairway, on rough only, a few rows deep, big and varied (some taller than a drive's peak).
// forest: { gap (m beyond the fairway edge, default 7), rows (default 2), spacing (m, default 11),
//   size: [min, max] (default [1.1, 1.7]), seed, clear: [{ pts, w }] corridors kept free (brave lines),
//   keep (m: distance kept from water, sand, green, tee; default 6) }
// Trees that would block the default tee shot are left out (K8 / validateHole), so the hole stays fair.
function plantForest(hole, spec, fairways) {
  const f = spec.forest, r = createRng(f.seed ?? 7);
  const gap = f.gap ?? 7, rows = f.rows ?? 2, spacing = f.spacing ?? 11, [s0, s1] = f.size ?? [1.1, 1.7];
  const keep = f.keep ?? 6, OB = spec.ob;
  const clear = f.clear ?? [];
  const spots = [];
  for (const fw of fairways) {
    for (let k = 1; k < fw.pts.length; k++) {
      const a = fw.pts[k - 1], b = fw.pts[k], L = Math.hypot(b.x - a.x, b.z - a.z);
      const ux = (b.x - a.x) / L, uz = (b.z - a.z) / L;
      for (let d = 0; d < L; d += spacing) {
        const t = d / L, w = (a.w ?? 0) + ((b.w ?? 0) - (a.w ?? 0)) * t;
        for (const side of [-1, 1]) for (let row = 0; row < rows; row++) {
          const off = w + gap + row * 8 + r() * 5;
          const along = d + (r() - 0.5) * spacing * 0.8;
          spots.push({ x: a.x + ux * along - uz * off * side, z: a.z + uz * along + ux * off * side, s: s0 + r() * (s1 - s0) });
        }
      }
    }
  }
  const far = (x, z, d) => {
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      const sf = hole.surfaceAt(px, pz);
      if (sf !== 'rough' && sf !== 'ob' && sf !== 'rock') return false;
    }
    return hole.surfaceAt(x, z) === 'rough';
  };
  // Behind the green (owner, 2026-11-18, GENRE_NOTES screenshot 3): an arc of trees on the rough
  // around the back of the green, framing the target. Far enough back (backGap m beyond the fringe)
  // that a ball running a little long is a chip, never stuck behind trunks; never between the
  // approach and the green (the arc only covers the back half, seen from where approaches come from).
  const G = spec.green, back = f.back ?? {};
  if (back !== false && f.back !== false) {
    const from = spec.approachFrom ?? (spec.playLine ? spec.playLine[spec.playLine.length - 2] : spec.tee);
    const ax = G.cx - from.x, az = G.cz - from.z, aL = Math.hypot(ax, az), bx = ax / aL, bz = az / aL;
    const R = Math.max(G.rx, G.rz) + 2.2 + (back.gap ?? 13), span = back.span ?? 1.35; // ±77°
    for (let row = 0; row < (back.rows ?? 2); row++) {
      const rr = R + row * 8, n = Math.round(2 * span * rr / (back.spacing ?? 9));
      for (let i = 0; i <= n; i++) {
        const a = -span + 2 * span * i / n + (r() - 0.5) * 0.08;
        const c = Math.cos(a), sn = Math.sin(a), dx = bx * c - bz * sn, dz = bx * sn + bz * c;
        const d = rr + (r() - 0.5) * 4;
        spots.push({ x: G.cx + dx * d, z: G.cz + dz * d, s: s0 + r() * (s1 - s0) });
      }
    }
  }
  let trees = spots
    .filter(t => t.x > OB.x0 + 3 && t.x < OB.x1 - 3 && t.z > OB.z0 + 3 && t.z < OB.z1 - 3)
    .filter(t => Math.hypot(t.x - hole.tee.x, t.z - hole.tee.z) > 16)
    .filter(t => far(t.x, t.z, keep * 0.5) && far(t.x, t.z, keep))
    .filter(t => !clear.some(c => polyDist(t.x, t.z, c.pts).d < c.w));
  // thin out trees that stand on top of each other
  const out = [];
  for (const t of trees) if (!out.some(o => Math.hypot(o.x - t.x, o.z - t.z) < 5.5)) out.push(t);
  trees = out.map(t => pine(+t.x.toFixed(1), +t.z.toFixed(1), +t.s.toFixed(2)));
  // fairness: the default tee shot must not hit a tree (validateHole checks the same, K8)
  for (let n = 0; n < 40; n++) {
    const probe = { ...hole, obstacles: [...hole.obstacles, ...trees] };
    const play = createHolePlay(probe, { seed: 1 });
    play.reset({ wind: { x: 0, z: 0 } });
    const w = play.shotWarning();
    if (!w) break;
    const i = w.index - hole.obstacles.length;
    if (i < 0) break; // a hand-placed obstacle: validateHole will name it
    trees.splice(i, 1);
  }
  return trees;
}

// A minimap that keeps the hole's proportions inside the same box as the other holes
function minimapSize(OB) {
  const w = OB.x1 - OB.x0, h = OB.z1 - OB.z0;
  const H = 210, Hm = 160;
  const k = Math.min(H / h, 130 / w);
  return { w: Math.round(w * k), h: Math.round(h * k), mobileW: Math.round(w * k * Hm / H), mobileH: Math.round(h * k * Hm / H) };
}

// The intro card text every Mountain 9 hole shares: subtitle + the hole's own lines
// next = the next hole's id (a link on the intro and result cards when the hole is played alone)
export function mtnIntro({ par, tagline, steps, blurb, next = null, prev = null }) {
  return {
    subtitle: `Par ${par} · {yards} yards · <i>Mountain 9 prototype</i>`,
    tagline, steps, blurb,
    ...(prev ? { link: { hole: prev, text: '← Previous hole' } } : {}),
    ...(next ? { resultLink: { hole: next, text: 'Next hole →' } } : {}),
  };
}
