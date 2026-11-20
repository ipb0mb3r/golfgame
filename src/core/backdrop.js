// AP6a: the geometry and colours of the gradient sky, the backdrop pieces and the drawn ocean shore
// (DESIGN §8b, the artist's notes docs/art/ap6a-artist-notes.md). Pure: no Three.js, no DOM (coding
// rule 1). src/game/scene.js turns these arrays into meshes. Everything here is the LOOK only: the
// ocean lowers the DRAWN ground beyond OB, never heightAt (physics), so no ball stops anywhere else.
// Colours are '#rrggbb' (sRGB), mixed in sRGB like the artist's mock-ups.
import { BACKDROP_FIT, SKY_LOOK, RIDGE, HORN_PEAKS_LOOK, OCEAN_LOOK } from './config.js';

// '#rrggbb' → [r, g, b] 0..255 (as core/biome.js parseColour; not imported, so biome.js can import this file)
const parseColour = c => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const clamp01 = v => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
// a → b by t (0..1), in sRGB, like the mock-ups' mixHex
export function mixHex(a, b, t) {
  const A = parseColour(a), B = parseColour(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
// The mock-ups' seeded random (Park–Miller), so every shape is exactly the artist's. Never used by physics.
export function lcg(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// ---- fit: the mock-ups' backdrop (3.3 km away) inside the hole's camera far plane ----
// One factor for every distance and height, so the angles seen from the course stay the mock-ups'.
export const backdropScale = cameraFar => Math.min(1, (BACKDROP_FIT.far * cameraFar) / BACKDROP_FIT.ref);

// ---- gradient sky ----
// How far from skyHorizon (0) to skyTop (1) the dome is at a view direction whose y is dirY (the
// artist's formula; the shader in scene.js is the same).
export const skyMix = dirY => Math.pow(clamp01(dirY * SKY_LOOK.scale), SKY_LOOK.pow);
// How much of the formula's colour shows (0 = the fog colour) at dirY: the dome melts into the fog
// just under the horizon, so fogged ground meets the sky with no seam.
export const skyFogMix = dirY => smooth(SKY_LOOK.fogBand[0], SKY_LOOK.fogBand[1], dirY);
// The dome's colour at dirY (for tests and the docs; the shader does it per pixel)
export const skyColour = (palette, dirY) => mixHex(palette.fog, mixHex(palette.skyHorizon, palette.skyTop, skyMix(dirY)), skyFogMix(dirY));

// Toon puffy clouds (the style-r2 mock-up): groups of 4–6 puffs, high and far, in front (−z).
// → [{ x, y, z, r, yaw }] in mock-up metres around the centre; a puff is a sphere scaled (r, 0.8r, 0.8r),
// turned by yaw about y (its group faces the centre).
export function cloudPuffs(look = SKY_LOOK.clouds) {
  const rnd = lcg(look.seed), out = [];
  for (let i = 0; i < look.groups; i++) {
    const ang = look.ang[0] + rnd() * look.ang[1], dist = look.dist[0] + rnd() * look.dist[1];
    const n = look.puffs[0] + Math.floor(rnd() * look.puffs[1]), size = look.size[0] + rnd() * look.size[1];
    const puffs = [];
    for (let k = 0; k < n; k++) {
      const r = size * (0.55 + rnd() * 0.6) * (k === 1 || k === 2 ? 1.25 : 1);
      puffs.push({ lx: (k - n / 2) * size * 0.8, ly: r * 0.35, lz: rnd() * 20, r });
    }
    const gx = Math.sin(ang) * dist, gy = look.y[0] + rnd() * look.y[1], gz = -Math.cos(ang) * dist;
    // the group faces the centre: its local x is (cos a, 0, sin a), its local z (−sin a, 0, cos a)
    const c = Math.cos(ang), s = Math.sin(ang);
    for (const p of puffs) out.push({ x: gx + p.lx * c - p.lz * s, y: gy + p.ly, z: gz + p.lx * s + p.lz * c, r: p.r, yaw: -ang });
  }
  return out;
}

// ---- ridge layers (the mock-ups' ridgeLayer): a band of quads along an arc, base fading into the fog ----
// Peaks from a seed: [count, hMin, hMax, wMin, wMax, seed, a0 = −0.72, a1 = 0.72] → [{ a, h, w }]
export function makePeaks([count, hMin, hMax, wMin, wMax, seed, a0 = -0.72, a1 = 0.72]) {
  const rnd = lcg(seed), out = [];
  for (let i = 0; i < count; i++) out.push({ a: a0 + rnd() * (a1 - a0), h: hMin + rnd() * (hMax - hMin), w: wMin + rnd() * (wMax - wMin) });
  return out;
}
const angDiff = (a, b) => { let d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
// → { positions: [x, y, z, ...], colours: ['#rrggbb' per vertex], triangles } in mock-up metres around
// the centre (y from RIDGE.baseY). layer = a ridge layer of config.js; palette = the set's.
export function ridgeLayer(layer, palette) {
  const peaks = [...(layer.peaks ?? []), ...(layer.gen ? makePeaks(layer.gen) : []), ...(layer.back ? makePeaks(layer.back) : [])];
  const rnd = lcg(layer.seed), tops = [], [a0, a1] = layer.a, n = layer.n;
  for (let i = 0; i <= n; i++) {
    const ang = a0 + (i / n) * (a1 - a0);
    let h = 0;
    for (const p of peaks) {
      const d = Math.abs(angDiff(ang, p.a)) / p.w;
      if (d < 1) h = Math.max(h, p.h * (layer.round ? 0.5 * (1 + Math.cos(Math.PI * d)) : (1 - d) ** 1.15));
    }
    h += (rnd() - 0.5) * layer.jag;
    tops.push({ x: Math.sin(ang) * layer.dist, z: -Math.cos(ang) * layer.dist, h: Math.max(RIDGE.minH, h), sn: layer.snow + (rnd() - 0.5) * layer.jag * 2 });
  }
  const P = palette, colour = P[layer.key], hz = layer.haze;
  const lit = mixHex(colour, P.fog, hz), shd = mixHex(mixHex(colour, P.shadow, RIDGE.shade), P.fog, hz);
  const base = mixHex(colour, P.fog, Math.min(RIDGE.baseFadeMax, hz + RIDGE.baseFade));
  const kl = mixHex(P.backCap, P.fog, hz * 0.5), ks = mixHex(P.backCapShade, P.fog, hz * 0.5);
  const positions = [], colours = [], y0 = RIDGE.baseY;
  const quad = (a, b, ya0, ya1, yb0, yb1, cTop, cBot) => {
    positions.push(a.x, ya0, a.z, b.x, yb0, b.z, b.x, yb1, b.z, a.x, ya0, a.z, b.x, yb1, b.z, a.x, ya1, a.z);
    colours.push(cBot, cBot, cTop, cBot, cTop, cTop);
  };
  for (let i = 0; i < n; i++) {
    const a = tops[i], b = tops[i + 1], shade = b.h < a.h;
    const sa = Math.min(a.h, a.sn), sb = Math.min(b.h, b.sn);
    quad(a, b, y0, sa, y0, sb, shade ? shd : lit, base);
    if (a.h > a.sn || b.h > b.sn) quad(a, b, sa, a.h, sb, b.h, shade ? ks : kl, shade ? ks : kl);
  }
  return { positions, colours, triangles: positions.length / 9 };
}

// ---- horn peaks (the alpine mock-up's hornPeak) ----
// One horn: a `sides`-sided pyramid in `rows` rows, radius r·(1−t)^1.25 with ±jitter per vertex, the
// summit leaning by hook·r·t², snow above the snow line (± wobble) and on flatter faces, faceted rock
// otherwise; everything mixed `haze` toward the fog. Placed at (ang, dist) around the centre, turned
// to face it. → { positions, colours (per vertex), triangles }; y from 0 (the game puts it at baseY).
export function hornPeak({ ang, dist, h, r, hook = 0.3, sides = 6, seed = 1, snowLine = 0.55 }, palette, look = HORN_PEAKS_LOOK) {
  const rnd = lcg(seed), rows = look.rows, P = palette;
  const rand = Array.from({ length: (rows + 1) * sides }, () => rnd());
  const P3 = (k, t) => {
    const a = (k % sides) / sides * Math.PI * 2 + 0.3, nz = rand[Math.round(t * rows) * sides + (k % sides)];
    const rad = r * Math.pow(1 - t, 1.25) * (1 - look.jitter + 2 * look.jitter * nz);
    return [Math.cos(a) * rad + hook * r * t * t, t * h, Math.sin(a) * rad * 0.8];
  };
  // placement: turned by −ang + 0.4 about y (as the mock-up's mesh), then moved out to (ang, dist)
  const rot = -ang + 0.4, cr = Math.cos(rot), sr = Math.sin(rot), px = Math.sin(ang) * dist, pz = -Math.cos(ang) * dist;
  const positions = [], colours = [];
  const tri = (a, b, c, ta) => {
    for (const v of [a, b, c]) positions.push(px + v[0] * cr + v[2] * sr, v[1], pz - v[0] * sr + v[2] * cr);
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, ly = ny / Math.hypot(nx, ny, nz);
    const snow = ta > snowLine + look.wobble * Math.sin(ta * 23 + a[0]) || (ta > look.flatSnow.t && Math.abs(ly) > look.flatSnow.ny);
    const c0 = mixHex(snow ? P.backCap : mixHex(P.backFar, look.rockDark, look.rockMix[0] + look.rockMix[1] * rnd()), P.fog, look.haze);
    colours.push(c0, c0, c0);
  };
  for (let row = 0; row < rows; row++) for (let k = 0; k < sides; k++) {
    const t0 = row / rows, t1 = (row + 1) / rows;
    const a0 = P3(k, t0), b0 = P3(k + 1, t0), a1 = P3(k, t1), b1 = P3(k + 1, t1);
    if (row === rows - 1) tri(a0, b0, [hook * r, h, 0], t0); else { tri(a0, b0, b1, t0 + 0.07); tri(a0, b1, a1, t0 + 0.07); }
  }
  return { positions, colours, triangles: positions.length / 9 };
}
// Every horn of the hornPeaks piece (the hero + the others), merged: one geometry, one draw call.
export function hornRange(palette, look = HORN_PEAKS_LOOK) {
  const horns = [look.hero, ...look.others.map(([ang, dist, h, r, hook, seed]) => ({ ang, dist, h, r, hook, seed, sides: look.othersSides, snowLine: look.othersSnowLine }))];
  const parts = horns.map(hp => hornPeak(hp, palette, look));
  return { positions: parts.flatMap(p => p.positions), colours: parts.flatMap(p => p.colours), triangles: parts.reduce((s, p) => s + p.triangles, 0), horns: parts.map(p => p.triangles) };
}

// ---- ocean (Island coast) ----
// scenery.seaSide (or the piece's default): 'left' | 'right' | 'far' | 'near', several joined by '+'
// (e.g. 'left+far'). → the list of sides. Throws on anything else.
export function parseSeaSide(v) {
  if (typeof v !== 'string' || !v) throw new Error(`seaSide must be ${OCEAN_LOOK.sides.join(' | ')} or several joined by '+' (got ${JSON.stringify(v)})`);
  const sides = v.split('+');
  for (const s of sides) if (!OCEAN_LOOK.sides.includes(s)) throw new Error(`seaSide: unknown side "${s}" (known: ${OCEAN_LOOK.sides.join(', ')}; join several with '+')`);
  if (new Set(sides).size !== sides.length) throw new Error(`seaSide names a side twice (${v})`);
  if (sides.includes('left') && sides.includes('right') && sides.includes('far') && sides.includes('near')) throw new Error('seaSide: a course needs at least one side of land');
  return sides;
}
// Each side: which axis it is on and which way is out to sea
const SIDE = {
  left: { axis: 'x', dir: -1, ob: 'x0' }, right: { axis: 'x', dir: 1, ob: 'x1' },
  far: { axis: 'z', dir: -1, ob: 'z0' }, near: { axis: 'z', dir: 1, ob: 'z1' },
};
// The drawn shore of a hole. ob = hole.map's OB box ({ x0, x1, z0, z1 }), heightAt = the terrain's (only
// read, never changed), extent = { x0, x1, z0, z1 } the drawn terrain (scenery.mesh), groundY = the far
// ground plane's y, reach = how far the sea goes (m from the centre). →
//   seaY        the sea level (the lowest beach top − below)
//   outward(x, z)  m beyond the beach top on the nearest sea side (≤ 0 = land as today)
//   drawnY(x, z)   the drawn ground: heightAt on land, sloping to depth below the sea beyond the beach top
//   tint(x, z)     null on land, else { colour ('sand' or 'rock' palette key), amount 0..1 } (painted over the course map)
//   bands          the sea's flat rectangles { x0, x1, z0, z1, y, key } (key: 'water', 'mid', 'waterDeep')
//   groundY        the far ground plane's drawn y (under the sea bed)
export function oceanShore({ ob, heightAt, extent, groundY, reach, sides, cx = 0, cz = 0 }, look = OCEAN_LOOK) {
  const top = {}; // each sea side's beach top (x or z)
  for (const s of sides) top[s] = ob[SIDE[s].ob] + SIDE[s].dir * look.gap;
  // sea level: under the lowest beach top along every sea side (sampled every 5 m along the drawn terrain)
  let low = Infinity;
  for (const s of sides) {
    const along = SIDE[s].axis === 'x' ? ['z0', 'z1'] : ['x0', 'x1'];
    for (let v = extent[along[0]]; v <= extent[along[1]]; v += 5) low = Math.min(low, SIDE[s].axis === 'x' ? heightAt(top[s], v) : heightAt(v, top[s]));
  }
  const seaY = low - look.below, bedY = seaY - look.depth;
  const outward = (x, z) => {
    let d = -Infinity;
    for (const s of sides) d = Math.max(d, SIDE[s].dir * ((SIDE[s].axis === 'x' ? x : z) - top[s]));
    return d;
  };
  const drawnY = (x, z) => {
    const h = heightAt(x, z), u = outward(x, z) / look.slope;
    return u <= 0 ? h : h + (bedY - h) * smooth(0, 1, u);
  };
  // lava rock patches at the waterline: a seeded noise along each side's shore
  const noise = {};
  sides.forEach((s, i) => { const rnd = lcg(101 + i * 17); noise[s] = Array.from({ length: 512 }, () => rnd()); });
  const noiseAt = (s, v) => { const f = (v + 4096) / look.rockStep, i = Math.floor(f), t = f - i, N = noise[s]; return N[i % 512] * (1 - t) + N[(i + 1) % 512] * t; };
  const tint = (x, z) => {
    let best = null, bd = 0;
    for (const s of sides) { const d = SIDE[s].dir * ((SIDE[s].axis === 'x' ? x : z) - top[s]); if (d > bd) { bd = d; best = s; } }
    if (!best) return null;
    const u = bd / look.slope, along = SIDE[best].axis === 'x' ? z : x;
    const rock = u >= look.rockAt[0] && u <= look.rockAt[1] && noiseAt(best, along) > look.rockPatch;
    return { colour: rock ? 'rock' : 'sand', amount: smooth(0, 0.12, u) };
  };
  // the sea: per side, bands from the beach top out (they start under the land, which hides their inner
  // edge): shallow to slope + shallow, mid to + mid, deep to reach. Along the shore a band runs to
  // ±reach, or, next to another sea side, to that side's same band edge (so the corners close).
  const R = reach, edges = [[0, look.slope + look.shallow, 'water'], [look.slope + look.shallow, look.slope + look.shallow + look.mid, 'mid'], [look.slope + look.shallow + look.mid, R, 'waterDeep']];
  const bands = [];
  for (const s of sides) {
    const S = SIDE[s], c = S.axis === 'x' ? cx : cz, oc = S.axis === 'x' ? cz : cx; // centre on this axis / the other
    edges.forEach(([from, to, key], k) => {
      const a = top[s] + S.dir * from, outer = k === 2 ? c + S.dir * R : top[s] + S.dir * to;
      // along the shore (the other axis): to ±reach, or into the next sea side as far as this band goes there
      const lim = (otherSide, sign) => sides.includes(otherSide) ? top[otherSide] + sign * (k === 2 ? 2 * R : to) : oc + sign * R;
      const [lo, hi] = S.axis === 'x' ? [lim('far', -1), lim('near', 1)] : [lim('left', -1), lim('right', 1)];
      const [p0, p1] = [Math.min(a, outer), Math.max(a, outer)];
      const y = seaY - k * look.bandLift; // the shallow band on top
      bands.push(S.axis === 'x' ? { x0: p0, x1: p1, z0: lo, z1: hi, y, key } : { x0: lo, x1: hi, z0: p0, z1: p1, y, key });
    });
  }
  return { seaY, bedY, top, outward, drawnY, tint, bands, groundY: Math.min(groundY, bedY - 0.5) };
}
