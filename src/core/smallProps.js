// AP7c / AP7d: small props (grass tufts, flowers, bushes, stones, reeds) scattered by a biome set's rule
// (DESIGN §8b "Small props"). Looks only: nothing here is read by the physics, the aim line or the warnings.
// Pure: no Three.js, no DOM (coding rule 1). Numbers in config.js (SMALL_PROPS); the game draws the result
// (src/game/smallProps.js); validateBiomeSet (core/biome.js) checks the rule.
//   - the rule: smallProps { pieces: [pick], perHa?, on? } where a pick is a piece id or
//     { id, weight, slots, cluster, perHa, on, perTenM } (normalizeSmallProps); a pick with its own perHa (or
//     perTenM, along a shore) is scattered by its own density, the others share the set's perHa by weight
//   - the scatter: deterministic (a seeded stream from the hole's id), only on the listed surfaces that are
//     also in SMALL_PROPS.surfaces (or on land by the water: 'waterEdge'), clear of the tee, the cup, the
//     putting area and (with the game's keep test) trunks and stakes (scatterSmallProps)
//   - the drawing rule: the nearest props within drawDist, at most maxTris triangles, and never one that
//     could hide the ball (visibleSmallProps, propHidden)
//   - the pieces' shapes: core/smallPropShapes.js
import { SMALL_PROPS } from './config.js';
import { createRng } from './rng.js';
export { smallPropPart, SMALL_PROP_PIECES } from './smallPropShapes.js';

const TAU = Math.PI * 2;
export const SMALL_PROP_PICK_KEYS = Object.freeze(['id', 'weight', 'slots', 'cluster', 'perHa', 'on', 'perTenM']);
const WATER_EDGE = SMALL_PROPS.waterEdge;

// A cluster's count: a whole number or [min, max] → [min, max]
const countRange = c => Array.isArray(c) ? [c[0], c[1]] : [c, c];
// A pick → { id, weight, slots, cluster, perHa, on, perTenM } (a bare id = weight 1, nothing else; null = not set)
export const normalizeSmallPropPick = p => typeof p === 'string'
  ? { id: p, weight: 1, slots: {}, cluster: null, perHa: null, on: null, perTenM: null }
  : {
    id: p.id, weight: p.weight ?? 1, slots: { ...(p.slots ?? {}) },
    cluster: p.cluster ? { count: countRange(p.cluster.count), radius: p.cluster.radius } : null,
    perHa: p.perHa ?? null, on: p.on ? [...p.on] : null, perTenM: p.perTenM ?? null,
  };
// The set's rule with every pick as an object. { pieces: [] } (most sets) stays empty.
export function normalizeSmallProps(sp) {
  const pieces = (sp?.pieces ?? []).map(normalizeSmallPropPick);
  return { pieces, perHa: pieces.length ? sp.perHa ?? 0 : 0, on: pieces.length && sp.on ? [...sp.on] : [] };
}
const isShore = p => p.perTenM != null;
const isShare = p => p.perHa == null && p.perTenM == null; // takes its share of the set's perHa (AP7c)

// The format checks of the rule (the piece ids and slots are checked by validateBiomeSet's pick check).
// → an error message (without the set's name) or null.
export function smallPropsRuleError(sp) {
  const C = SMALL_PROPS;
  if (!sp || typeof sp !== 'object' || !Array.isArray(sp.pieces)) return 'smallProps must be { pieces: [...], perHa, on: [...] }';
  for (const k of Object.keys(sp)) if (!['pieces', 'perHa', 'on'].includes(k)) return `smallProps has an unknown key "${k}" (known: pieces, perHa, on)`;
  const onError = (on, f) => {
    if (!Array.isArray(on) || !on.length || !on.every(s => typeof s === 'string')) return `${f} must list the surfaces they are scattered on`;
    if (on.includes(WATER_EDGE)) return on.length === 1 ? null : `${f}: "${WATER_EDGE}" can't be mixed with other surfaces`;
    const bad = on.filter(s => !C.surfaces.includes(s));
    return bad.length ? `${f}: props may only stand on ${C.surfaces.join(', ')} (never on "${bad.join('", "')}")` : null;
  };
  let needsPerHa = false, needsOn = false;
  for (const [i, p] of sp.pieces.entries()) {
    if (typeof p === 'string') { needsPerHa = needsOn = true; continue; }
    const f = `smallProps.pieces[${i}]`;
    if (!p || typeof p !== 'object') return `${f} must be a piece id or { id, weight, slots, cluster, perHa, on, perTenM }`;
    for (const k of Object.keys(p)) if (!SMALL_PROP_PICK_KEYS.includes(k)) return `${f} has an unknown key "${k}" (known: ${SMALL_PROP_PICK_KEYS.join(', ')})`;
    if (p.weight !== undefined && !(Number.isFinite(p.weight) && p.weight > 0)) return `${f}.weight must be a number > 0 (got ${JSON.stringify(p.weight)})`;
    if (p.cluster !== undefined) {
      const c = p.cluster;
      if (!c || typeof c !== 'object') return `${f}.cluster must be { count, radius }`;
      for (const k of Object.keys(c)) if (!['count', 'radius'].includes(k)) return `${f}.cluster has an unknown key "${k}" (known: count, radius)`;
      const whole = v => Number.isInteger(v) && v >= 1 && v <= C.cluster.maxCount;
      const okCount = Array.isArray(c.count) ? c.count.length === 2 && c.count.every(whole) && c.count[0] <= c.count[1] : Number.isInteger(c.count) && c.count >= 2 && c.count <= C.cluster.maxCount;
      if (!okCount) return `${f}.cluster.count must be a whole number 2–${C.cluster.maxCount} or [min, max] (1–${C.cluster.maxCount}, min ≤ max) (got ${JSON.stringify(c.count)})`;
      if (!(Number.isFinite(c.radius) && c.radius > 0 && c.radius <= C.cluster.maxRadius)) return `${f}.cluster.radius must be a number > 0 and ≤ ${C.cluster.maxRadius} m (got ${JSON.stringify(c.radius)})`;
    }
    if (p.perHa !== undefined && !(typeof p.perHa === 'number' && p.perHa >= 0 && p.perHa <= C.maxPerHa)) return `${f}.perHa must be a number 0–${C.maxPerHa} (props per hectare of its surfaces)`;
    if (p.perTenM !== undefined && !(typeof p.perTenM === 'number' && p.perTenM >= 0 && p.perTenM <= C.maxPerTenM)) return `${f}.perTenM must be a number 0–${C.maxPerTenM} (patches per 10 m of shoreline)`;
    if (p.perHa !== undefined && p.perTenM !== undefined) return `${f} has both perHa and perTenM (on land by perHa, along a shore by perTenM)`;
    if (p.on !== undefined) { const e = onError(p.on, `${f}.on`); if (e) return e; }
    const shore = p.on?.includes(WATER_EDGE);
    if (shore && p.perTenM === undefined) return `${f}: on "${WATER_EDGE}" needs perTenM (patches per 10 m of shoreline)`;
    if (p.perTenM !== undefined && !shore) return `${f}.perTenM needs on: ['${WATER_EDGE}']`;
    if (p.perHa === undefined && p.perTenM === undefined) needsPerHa = needsOn = true;
    else if (p.perHa !== undefined && p.on === undefined) needsOn = true;
  }
  if (!sp.pieces.length) return null;
  if (needsPerHa || sp.perHa !== undefined) {
    if (!(typeof sp.perHa === 'number' && sp.perHa >= 0 && sp.perHa <= C.maxPerHa)) return `smallProps.perHa must be a number 0–${C.maxPerHa} (props per hectare)`;
  }
  if (needsOn || sp.on !== undefined) {
    const e = onError(sp.on, 'smallProps.on');
    if (e) return e;
    if (sp.on.includes(WATER_EDGE)) return `smallProps.on: "${WATER_EDGE}" is for a pick with perTenM, not the set`;
  }
  return null;
}

// ---- The scatter ----
// A hole's own seed: the id hashed (FNV-1a) with SMALL_PROPS.seed, so every hole has its own props and the
// same ones on every load.
export function holeSeed(id) {
  let h = 2166136261;
  for (const ch of String(id)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h ^ SMALL_PROPS.seed) | 0;
}
// The area props are scattered in: the OB box (the stakes' lines) grown by `margin`, clipped to the hole's
// painted map. → { x0, x1, z0, z1 }
export function scatterArea(hole) {
  const st = hole.scenery.stakes, xs = st.xs ?? [-st.x, st.x], m = SMALL_PROPS.margin, map = hole.map;
  return {
    x0: Math.max(map.x0, Math.min(...xs) - m), x1: Math.min(map.x1, Math.max(...xs) + m),
    z0: Math.max(map.z0, Math.min(st.z0, st.z1) - m), z1: Math.min(map.z1, Math.max(st.z0, st.z1) + m),
  };
}
const ring = (n, r) => Array.from({ length: n }, (_, k) => [Math.cos(k * TAU / n) * r, Math.sin(k * TAU / n) * r]);
const EDGE = ring(4, 1), GREEN = ring(6, 1), AROUND = ring(8, 1);
// May a prop stand at (x, z)? on = the surfaces it may stand on (already ∩ SMALL_PROPS.surfaces); edgeOn = the
// surfaces allowed 0.5 m around it (default: on; a shore prop also allows water there).
export function propSpotOk(x, z, { hole, surfaceAt, area, on, edgeOn = on, keep = () => true }) {
  const C = SMALL_PROPS, { tee, cup } = hole;
  if (x < area.x0 || x > area.x1 || z < area.z0 || z > area.z1) return false;
  if (Math.hypot(x - tee.x, z - tee.z) < C.teeClear) return false;
  const dCup = Math.hypot(x - cup.x, z - cup.z);
  if (dCup < C.cupClear) return false;
  if (!on.includes(surfaceAt(x, z))) return false;
  for (const [dx, dz] of EDGE) if (!edgeOn.includes(surfaceAt(x + dx * C.edgeClear, z + dz * C.edgeClear))) return false;
  if (dCup < C.greenReach) for (const [dx, dz] of GREEN) {
    const s = surfaceAt(x + dx * C.greenClear, z + dz * C.greenClear);
    if (s === 'green' || s === 'fringe') return false;
  }
  return keep(x, z);
}
// AP7d: a test "(x, z) is at least `clear` m from the edge of every round thing" (tree trunks, OB stakes):
// things = [{ x, z, r }]. A grid makes it cheap.
export function clearOf(things, clear = SMALL_PROPS.trunkClear) {
  const cell = 4, grid = new Map(), key = (i, j) => i * 100003 + j;
  for (const t of things) {
    const k = key(Math.floor(t.x / cell), Math.floor(t.z / cell));
    (grid.get(k) ?? grid.set(k, []).get(k)).push(t);
  }
  return (x, z) => {
    const i = Math.floor(x / cell), j = Math.floor(z / cell);
    for (let a = i - 1; a <= i + 1; a++) for (let b = j - 1; b <= j + 1; b++)
      for (const t of grid.get(key(a, b)) ?? []) if (Math.hypot(x - t.x, z - t.z) - t.r < clear) return false;
    return true;
  };
}
// AP7d: the OB stakes' positions as round things for clearOf (the same rows the scene draws)
export function stakeThings(st) {
  const out = [];
  for (let z = st.z0; z > st.z1; z -= st.step) for (const x of st.xs ?? [-st.x, st.x]) out.push({ x, z, r: SMALL_PROPS.stakeR });
  return out;
}

// AP7d: the ground sampled on a grid of `step` m over the area → surface id → [[x, z] of each cell's centre]
function surfaceCells(area, surfaceAt, step) {
  const by = new Map();
  for (let x = area.x0 + step / 2; x < area.x1; x += step) for (let z = area.z0 + step / 2; z < area.z1; z += step) {
    const s = surfaceAt(x, z);
    (by.get(s) ?? by.set(s, []).get(s)).push([x, z]);
  }
  return by;
}
// AP7d: the water's shoreline in the area: the water samples (SMALL_PROPS.shore.step m apart) that touch land,
// each with the unit vector pointing out of the water. A coarse grid finds where water meets land; only there
// is the fine grid read. length = the shoreline's length (m, about: each boundary sample counts `step` m).
export function shoreline(area, surfaceAt) {
  const { step, coarse } = SMALL_PROPS.shore, nx = Math.ceil((area.x1 - area.x0) / coarse), nz = Math.ceil((area.z1 - area.z0) / coarse);
  const wet = new Uint8Array(nx * nz);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) wet[i * nz + j] = surfaceAt(area.x0 + (i + 0.5) * coarse, area.z0 + (j + 0.5) * coarse) === 'water' ? 1 : 0;
  const points = [], sub = Math.round(coarse / step);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    let mixed = false;
    for (let a = Math.max(0, i - 1); a <= Math.min(nx - 1, i + 1) && !mixed; a++) for (let b = Math.max(0, j - 1); b <= Math.min(nz - 1, j + 1); b++) if (wet[a * nz + b] !== wet[i * nz + j]) { mixed = true; break; }
    if (!mixed) continue;
    for (let u = 0; u < sub; u++) for (let v = 0; v < sub; v++) {
      const x = area.x0 + i * coarse + (u + 0.5) * step, z = area.z0 + j * coarse + (v + 0.5) * step;
      if (surfaceAt(x, z) !== 'water') continue;
      let ox = 0, oz = 0;
      for (const [dx, dz] of AROUND) if (surfaceAt(x + dx * step, z + dz * step) !== 'water') { ox += dx; oz += dz; }
      const l = Math.hypot(ox, oz);
      if (l > 1e-9) points.push({ x, z, nx: ox / l, nz: oz / l });
    }
  }
  return { points, length: points.length * step };
}

// Every prop of a hole: [{ pick (index in rule.pieces), x, y, z, yaw, scale, tint: [a, b] }], always the same
// for a hole. rule = normalizeSmallProps(set.smallProps); heightAt / surfaceAt = the hole's terrain; keep(x, z)
// = an extra test from the game (the ocean's beach, clear of trunks and stakes); scaleOf(id) → [min, max] size
// (default SMALL_PROPS.scale). tint = two draws in 0..1 for the game's per-copy colour tint.
// Three kinds of pick (a prop that fails a test is dropped; a patch near a fairway is trimmed):
//   - a pick with its own perHa: that many props per hectare of ITS surfaces (the ground sampled on a grid)
//   - a pick with perTenM (on: ['waterEdge']): that many patches per 10 m of shoreline, each centred on land up
//     to shore.reach m outside the water's edge, never in the water
//   - the others share the set's perHa × the scatter area's hectares by weight (AP7c)
// A clustered pick places patches of `count` (a number or [min, max]) props within `radius` m of a centre.
export function scatterSmallProps(hole, { heightAt, surfaceAt, rule, keep, scaleOf = () => null }) {
  const out = [];
  if (!rule.pieces.length) return out;
  const C = SMALL_PROPS, area = scatterArea(hole), r = createRng(holeSeed(hole.id));
  const landOf = on => on.filter(s => C.surfaces.includes(s));
  const setOn = landOf(rule.on), base = { hole, surfaceAt, area, keep };
  const ha = (area.x1 - area.x0) * (area.z1 - area.z0) / 10000;
  const put = (pick, x, z, ctx) => {
    if (out.length >= C.maxProps) return;
    const [lo, hi] = scaleOf(rule.pieces[pick].id) ?? [C.scale[0], C.scale[0] + C.scale[1]];
    const yaw = r() * TAU, scale = lo + r() * (hi - lo), tint = [r(), r()];
    if (propSpotOk(x, z, ctx)) out.push({ pick, x, y: heightAt(x, z), z, yaw, scale, tint });
  };
  // a patch (or a lone prop) of the pick at a centre
  const patch = (p, pick, cx, cz, ctx) => {
    if (!p.cluster) { put(pick, cx, cz, ctx); return; }
    if (!propSpotOk(cx, cz, ctx)) return; // a patch's centre stands where a prop may
    const [lo, hi] = p.cluster.count, n = lo + Math.floor(r() * (hi - lo + 1));
    for (let m = 0; m < n; m++) {
      const a = r() * TAU, d = p.cluster.radius * Math.sqrt(r());
      put(pick, cx + Math.cos(a) * d, cz + Math.sin(a) * d, ctx);
    }
  };
  const meanCount = p => p.cluster ? (p.cluster.count[0] + p.cluster.count[1]) / 2 : 1;
  const W = rule.pieces.filter(isShare).reduce((s, p) => s + p.weight, 0), total = Math.min(C.maxProps, Math.round(rule.perHa * ha));
  let cells = null, shore = null;
  rule.pieces.forEach((p, pick) => {
    if (isShore(p)) {
      shore ??= shoreline(area, surfaceAt);
      if (!shore.points.length) return;
      const land = C.shore.land, ctx = { ...base, on: land, edgeOn: [...land, 'water'] };
      const n = Math.round(shore.length / 10 * p.perTenM);
      for (let k = 0; k < n; k++) {
        const s = shore.points[Math.floor(r() * shore.points.length) % shore.points.length], d = C.shore.step / 2 + r() * (C.shore.reach - C.shore.step / 2);
        patch(p, pick, s.x + s.nx * d, s.z + s.nz * d, ctx);
      }
    } else if (p.perHa != null) {
      const on = landOf(p.on ?? setOn);
      cells ??= surfaceCells(area, surfaceAt, C.areaStep);
      const list = on.flatMap(s => cells.get(s) ?? []);
      if (!list.length) return;
      const ctx = { ...base, on }, n = Math.round(p.perHa * list.length * C.areaStep * C.areaStep / 10000), h = C.areaStep / 2;
      for (let k = 0; k < Math.ceil(n / meanCount(p)); k++) {
        const [x, z] = list[Math.floor(r() * list.length) % list.length];
        patch(p, pick, x + (r() * 2 - 1) * h, z + (r() * 2 - 1) * h, ctx);
      }
    } else if (setOn.length && W > 0) {
      const ctx = { ...base, on: setOn }, n = Math.round(total * p.weight / W);
      for (let k = 0; k < Math.ceil(n / meanCount(p)); k++)
        patch(p, pick, area.x0 + r() * (area.x1 - area.x0), area.z0 + r() * (area.z1 - area.z0), ctx);
    }
  });
  return out;
}

// ---- What is drawn ----
// Could this prop hide the ball? Yes when its middle (y + h/2) is within ballClear of the ball, or within
// lineClear of the line from the ball to the camera (owner: no blind shots). h = the prop's height (m).
export function propHidden(p, h, ball, cam, ballClear, lineClear) {
  const py = p.y + h / 2;
  if (Math.hypot(p.x - ball.x, py - ball.y, p.z - ball.z) < ballClear) return true;
  const dx = cam.x - ball.x, dy = cam.y - ball.y, dz = cam.z - ball.z, L2 = dx * dx + dy * dy + dz * dz;
  const t = L2 ? Math.max(0, Math.min(1, ((p.x - ball.x) * dx + (py - ball.y) * dy + (p.z - ball.z) * dz) / L2)) : 0;
  return Math.hypot(p.x - ball.x - t * dx, py - ball.y - t * dy, p.z - ball.z - t * dz) < lineClear;
}
// The props to draw from this camera: those within drawDist (3D), none that could hide the ball, nearest
// first, until the next one would pass maxTris triangles. part(pick) = { tris, height } of the pick's piece.
// dir (optional) = the camera's view direction (unit): props more than `behind` m behind the camera are
// skipped, so the triangle cap is spent on what can be seen. → indices into props, nearest first.
// scale = PROP_SCALE: the props are drawn that much bigger, so their height and the two clearances grow with it
// (never below 1: a smaller prop keeps today's clearance). Beyond thinFrom m only a share `farKeep` is drawn:
// the copy's own fixed draw (propRank, so nothing flickers as the camera moves); farBoost(pick) (optional)
// multiplies that share for a pick (the ground-hugging flowers keep priority over the tufts).
export const propRank = i => { const h = Math.imul(i + 1, 2654435761) >>> 0; return ((h ^ (h >>> 15)) >>> 0) % 10007 / 10007; };
export function visibleSmallProps(props, cam, ball, part, { drawDist = SMALL_PROPS.drawDist, maxTris = SMALL_PROPS.maxTris, ballClear = SMALL_PROPS.ballClear, lineClear = SMALL_PROPS.lineClear, dir = null, behind = SMALL_PROPS.behind, scale = 1, thinFrom = Infinity, farKeep = 1, farBoost = null } = {}) {
  const near = [], D2 = drawDist * drawDist, T2 = thinFrom * thinFrom, grow = Math.max(1, scale);
  props.forEach((p, i) => {
    const dx = p.x - cam.x, dy = p.y - cam.y, dz = p.z - cam.z, d2 = dx * dx + dy * dy + dz * dz;
    if (d2 > D2 || (dir && dx * dir.x + dy * dir.y + dz * dir.z < -behind)) return;
    if (d2 > T2 && farKeep < 1 && propRank(i) >= farKeep * (farBoost ? farBoost(p.pick) : 1)) return;
    if (!propHidden(p, part(p.pick).height * p.scale * scale, ball, cam, ballClear * grow, lineClear * grow)) near.push([d2, i]);
  });
  near.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out = [];
  let tris = 0;
  for (const [, i] of near) {
    tris += part(props[i].pick).tris;
    if (tris > maxTris) break;
    out.push(i);
  }
  return out;
}
