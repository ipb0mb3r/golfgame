// AP7c: small props (grass tufts, flowers, bushes) scattered by a biome set's rule (DESIGN §8b "Small props").
// Looks only: nothing here is read by the physics, the aim line or the warnings. Pure: no Three.js, no DOM
// (coding rule 1). Numbers in config.js (SMALL_PROPS, SMALL_PROP_LOOK); the game draws the result
// (src/game/smallProps.js); validateBiomeSet (core/biome.js) checks the rule.
//   - the rule: smallProps { pieces: [pick], perHa, on } where a pick is a piece id or
//     { id, weight, slots, cluster: { count, radius } } (normalizeSmallProps)
//   - the scatter: deterministic (a seeded stream from the hole's id), only on the listed surfaces that are
//     also in SMALL_PROPS.surfaces, clear of the tee, the cup and the putting area (scatterSmallProps)
//   - the drawing rule: the nearest props within drawDist, at most maxTris triangles, and never one that
//     could hide the ball (visibleSmallProps, propHidden)
//   - the placeholder pieces' shapes (smallPropPart)
import { SMALL_PROPS, SMALL_PROP_LOOK } from './config.js';
import { createRng } from './rng.js';

const TAU = Math.PI * 2;
export const SMALL_PROP_PICK_KEYS = Object.freeze(['id', 'weight', 'slots', 'cluster']);

// A pick → { id, weight, slots, cluster } (a bare id = weight 1, no slot override, no cluster).
export const normalizeSmallPropPick = p => typeof p === 'string'
  ? { id: p, weight: 1, slots: {}, cluster: null }
  : { id: p.id, weight: p.weight ?? 1, slots: { ...(p.slots ?? {}) }, cluster: p.cluster ? { count: p.cluster.count, radius: p.cluster.radius } : null };
// The set's rule with every pick as an object. { pieces: [] } (most sets) stays empty.
export function normalizeSmallProps(sp) {
  const pieces = (sp?.pieces ?? []).map(normalizeSmallPropPick);
  return { pieces, perHa: pieces.length ? sp.perHa : 0, on: pieces.length ? [...sp.on] : [] };
}

// The format checks of the rule (the piece ids and slots are checked by validateBiomeSet's pick check).
// → an error message (without the set's name) or null.
export function smallPropsRuleError(sp) {
  const C = SMALL_PROPS;
  if (!sp || typeof sp !== 'object' || !Array.isArray(sp.pieces)) return 'smallProps must be { pieces: [...], perHa, on: [...] }';
  for (const k of Object.keys(sp)) if (!['pieces', 'perHa', 'on'].includes(k)) return `smallProps has an unknown key "${k}" (known: pieces, perHa, on)`;
  for (const [i, p] of sp.pieces.entries()) {
    if (typeof p === 'string') continue;
    const f = `smallProps.pieces[${i}]`;
    if (!p || typeof p !== 'object') return `${f} must be a piece id or { id, weight, slots, cluster }`;
    for (const k of Object.keys(p)) if (!SMALL_PROP_PICK_KEYS.includes(k)) return `${f} has an unknown key "${k}" (known: ${SMALL_PROP_PICK_KEYS.join(', ')})`;
    if (p.weight !== undefined && !(Number.isFinite(p.weight) && p.weight > 0)) return `${f}.weight must be a number > 0 (got ${JSON.stringify(p.weight)})`;
    if (p.cluster !== undefined) {
      const c = p.cluster;
      if (!c || typeof c !== 'object') return `${f}.cluster must be { count, radius }`;
      for (const k of Object.keys(c)) if (!['count', 'radius'].includes(k)) return `${f}.cluster has an unknown key "${k}" (known: count, radius)`;
      if (!(Number.isInteger(c.count) && c.count >= 2 && c.count <= C.cluster.maxCount)) return `${f}.cluster.count must be a whole number 2–${C.cluster.maxCount} (got ${JSON.stringify(c.count)})`;
      if (!(Number.isFinite(c.radius) && c.radius > 0 && c.radius <= C.cluster.maxRadius)) return `${f}.cluster.radius must be a number > 0 and ≤ ${C.cluster.maxRadius} m (got ${JSON.stringify(c.radius)})`;
    }
  }
  if (!sp.pieces.length) return null;
  if (!(typeof sp.perHa === 'number' && sp.perHa >= 0 && sp.perHa <= C.maxPerHa)) return `smallProps.perHa must be a number 0–${C.maxPerHa} (props per hectare)`;
  if (!Array.isArray(sp.on) || !sp.on.length || !sp.on.every(s => typeof s === 'string')) return 'smallProps.on must list the surfaces they are scattered on';
  const bad = sp.on.filter(s => !C.surfaces.includes(s));
  if (bad.length) return `smallProps.on: props may only stand on ${C.surfaces.join(', ')} (never on "${bad.join('", "')}")`;
  return null;
}

// ---- The placeholder pieces (SMALL_PROP_LOOK) ----
// → { positions: [x, y, z, ...] (non-indexed triangles, metres, foot at y 0), slots: [slot per vertex], tris, height }
// The game paints each vertex in its slot's colour (the pick's colours) and gives every vertex an up normal,
// so a prop is lit like the ground it stands on.
const golden = i => (i * 0.618034) % 1;
const PARTS = {
  grassTuft(L) {
    const pos = [], slots = [];
    for (let i = 0; i < L.blades; i++) {
      const a = (i / L.blades) * TAU + golden(i) * 0.6, c = Math.cos(a), s = Math.sin(a), h = L.height[0] + golden(i + 3) * L.height[1];
      const bx = c * L.ring, bz = s * L.ring, w = L.width / 2;
      pos.push(bx - s * w, 0, bz + c * w, bx + s * w, 0, bz - c * w, c * (L.ring + L.lean), h, s * (L.ring + L.lean));
      slots.push('base', 'base', 'tip');
    }
    return { pos, slots };
  },
  flowerPatch(L) {
    const pos = [], slots = [];
    L.spots.forEach(([x, z, h], i) => {
      const a = i * 1.1, c = Math.cos(a) * L.stemW / 2, s = Math.sin(a) * L.stemW / 2;
      pos.push(x - c, 0, z - s, x + c, 0, z + s, x, h, z); slots.push('stem', 'stem', 'stem');
      const ring = [0, 1, 2].map(k => [x + Math.cos(a + k * TAU / 3) * L.headR, h, z + Math.sin(a + k * TAU / 3) * L.headR]);
      for (let k = 0; k < 3; k++) {
        const p = ring[k], q = ring[(k + 1) % 3];
        pos.push(...p, ...q, x, h + L.headH, z, ...q, ...p, x, h - L.headH, z);
        slots.push(...Array(6).fill(L.heads[i]));
      }
    });
    return { pos, slots };
  },
};
export const SMALL_PROP_PIECES = Object.freeze(Object.keys(PARTS));
export function smallPropPart(id) {
  if (!PARTS[id]) throw new Error(`no small-prop shape "${id}" (core/smallProps.js)`);
  const { pos, slots } = PARTS[id](SMALL_PROP_LOOK[id]);
  let height = 0;
  for (let i = 1; i < pos.length; i += 3) height = Math.max(height, pos[i]);
  return { positions: pos, slots, tris: slots.length / 3, height };
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
const EDGE = ring(4, 1), GREEN = ring(6, 1);
// May a prop stand at (x, z)? on = the surfaces it may stand on (already ∩ SMALL_PROPS.surfaces).
export function propSpotOk(x, z, { hole, surfaceAt, area, on, keep = () => true }) {
  const C = SMALL_PROPS, { tee, cup } = hole;
  if (x < area.x0 || x > area.x1 || z < area.z0 || z > area.z1) return false;
  if (Math.hypot(x - tee.x, z - tee.z) < C.teeClear) return false;
  const dCup = Math.hypot(x - cup.x, z - cup.z);
  if (dCup < C.cupClear) return false;
  if (!on.includes(surfaceAt(x, z))) return false;
  for (const [dx, dz] of EDGE) if (!on.includes(surfaceAt(x + dx * C.edgeClear, z + dz * C.edgeClear))) return false;
  if (dCup < C.greenReach) for (const [dx, dz] of GREEN) {
    const s = surfaceAt(x + dx * C.greenClear, z + dz * C.greenClear);
    if (s === 'green' || s === 'fringe') return false;
  }
  return keep(x, z);
}
// Every prop of a hole: [{ pick (index in rule.pieces), x, y, z, yaw, scale }], always the same for a hole.
// rule = normalizeSmallProps(set.smallProps); heightAt / surfaceAt = the hole's terrain; keep(x, z) = an extra
// test from the game (the ocean's beach). perHa = props asked per hectare of the scatter area, shared by the
// picks' weights; a clustered pick places patches of `count` props within `radius` of a centre (count props
// per patch, so perHa still counts props). A prop that fails a test is dropped (a patch near a fairway is trimmed).
export function scatterSmallProps(hole, { heightAt, surfaceAt, rule, keep }) {
  const out = [];
  if (!rule.pieces.length || !rule.perHa) return out;
  const C = SMALL_PROPS, area = scatterArea(hole), on = rule.on.filter(s => C.surfaces.includes(s));
  const ctx = { hole, surfaceAt, area, on, keep };
  const ha = (area.x1 - area.x0) * (area.z1 - area.z0) / 10000, total = Math.min(C.maxProps, Math.round(rule.perHa * ha));
  const W = rule.pieces.reduce((s, p) => s + p.weight, 0), r = createRng(holeSeed(hole.id));
  const put = (pick, x, z) => {
    const yaw = r() * TAU, scale = C.scale[0] + r() * C.scale[1];
    if (out.length < C.maxProps && propSpotOk(x, z, ctx)) out.push({ pick, x, y: heightAt(x, z), z, yaw, scale });
  };
  rule.pieces.forEach((p, pick) => {
    const n = Math.round(total * p.weight / W), per = p.cluster?.count ?? 1;
    for (let k = 0; k < Math.ceil(n / per); k++) {
      const cx = area.x0 + r() * (area.x1 - area.x0), cz = area.z0 + r() * (area.z1 - area.z0);
      if (!p.cluster) { put(pick, cx, cz); continue; }
      if (!propSpotOk(cx, cz, ctx)) continue; // a patch's centre stands where a prop may
      for (let m = 0; m < per; m++) {
        const a = r() * TAU, d = p.cluster.radius * Math.sqrt(r());
        put(pick, cx + Math.cos(a) * d, cz + Math.sin(a) * d);
      }
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
// → indices into props, nearest first.
export function visibleSmallProps(props, cam, ball, part, { drawDist = SMALL_PROPS.drawDist, maxTris = SMALL_PROPS.maxTris, ballClear = SMALL_PROPS.ballClear, lineClear = SMALL_PROPS.lineClear } = {}) {
  const near = [], D2 = drawDist * drawDist;
  props.forEach((p, i) => {
    const d2 = (p.x - cam.x) ** 2 + (p.y - cam.y) ** 2 + (p.z - cam.z) ** 2;
    if (d2 <= D2 && !propHidden(p, part(p.pick).height * p.scale, ball, cam, ballClear, lineClear)) near.push([d2, i]);
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
