// Obstacles (Phase K, DESIGN §4 "Obstacles"): tree trunks, tree leaves (canopies) and boulders.
// A hole lists them as data:
//   { type: 'tree', x, z, trunkR, trunkH, canopyR, canopyH }
//   { type: 'boulder', x, z, r, sink? }
// makeColliders() turns that list into the shapes the physics, the aim warning and the renderer all
// use, so what you see is exactly what the ball hits (K5):
//   trunk    a vertical cylinder of radius trunkR from the ground (at x, z) up to trunkH, with a
//            flat top (K10) that a falling ball lands on
//   canopy   an ellipsoid centred on the top of the trunk: canopyR across, canopyH tall
//            (so the leaves start canopyH / 2 below the top of the trunk)
//   boulder  a sphere of radius r, sunk into the ground by sink × r (default BOULDER_SINK)
// The ball is a sphere of radius BALL_R whose lowest point is ball.pos, so the tests below use its
// centre (pos.y + BALL_R) and grow solid shapes by BALL_R. The leaves are not grown: the ball is in
// the leaves when its centre is.
import { BALL_R, BOULDER_SINK, TUNE } from './config.js';

export function makeColliders(hole, heightAt) {
  return (hole.obstacles ?? []).map((o, i) => {
    const y0 = heightAt(o.x, o.z);
    if (o.type === 'tree') {
      const top = y0 + o.trunkH;
      return {
        type: 'tree', i, x: o.x, z: o.z, y0, r: o.trunkR, top,
        canopy: { x: o.x, y: top, z: o.z, rx: o.canopyR, ry: o.canopyH / 2 },
      };
    }
    const r = o.r;
    return { type: 'boulder', i, x: o.x, z: o.z, y0, r, y: y0 + r * (1 - (o.sink ?? BOULDER_SINK)) };
  });
}

// Earliest t in [0, 1] where the moving point a + t·(b − a) is within R of c, in 2D (x, z).
// 0 when it starts inside and is moving further in. null when it never gets that close.
function segCircle(ax, az, dx, dz, cx, cz, R) {
  const fx = ax - cx, fz = az - cz;
  const c = fx * fx + fz * fz - R * R, b = fx * dx + fz * dz;
  if (c <= 0) return b < 0 ? 0 : null; // inside: a hit only while still moving in (just bounced = moving out)
  const a = dx * dx + dz * dz;
  if (a < 1e-12) return null;
  const disc = b * b - a * c;
  if (b >= 0 || disc < 0) return null; // moving away, or passing wide
  const t = (-b - Math.sqrt(disc)) / a;
  return t <= 1 ? t : null;
}
// The same in 3D (a sphere)
function segSphere(ax, ay, az, dx, dy, dz, cx, cy, cz, R) {
  const fx = ax - cx, fy = ay - cy, fz = az - cz;
  const c = fx * fx + fy * fy + fz * fz - R * R, b = fx * dx + fy * dy + fz * dz;
  if (c <= 0) return b < 0 ? 0 : null;
  const a = dx * dx + dy * dy + dz * dz;
  if (a < 1e-12) return null;
  const disc = b * b - a * c;
  if (b >= 0 || disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / a;
  return t <= 1 ? t : null;
}

// The first obstacle the ball meets moving from a to b (ball positions, i.e. its lowest point) in
// one step. Leaves count only in the air (`leaves` true) and only for trees not in `used` (one canopy
// hit per tree per shot, K3). Returns null or { t, kind: 'trunk' | 'boulder' | 'leaves', o, cap, x, y, z }
// with the ball's position (lowest point) at the moment of contact. cap: true = the top of a trunk (K10).
export function firstHit(colliders, a, b, { leaves = true, used = null } = {}) {
  const ay = a.y + BALL_R, dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  let best = null;
  const keep = (t, kind, o, cap = false) => { if (t !== null && (!best || t < best.t)) best = { t, kind, o, cap }; };
  for (const o of colliders) {
    if (o.type === 'tree') {
      const t = segCircle(a.x, a.z, dx, dz, o.x, o.z, o.r + BALL_R);
      // the side: the ball's lowest point must be below the top of the trunk where it meets it
      // (K10: it used to be the centre, which let a ball skimming just over the top slip in)
      if (t !== null && a.y + dy * t <= o.top) keep(t, 'trunk', o);
      // K10: the top cap. A ball coming down onto the top of the trunk (its lowest point crossing
      // the top while over the trunk, grown by BALL_R like the side) lands on it instead of
      // dropping through. With the side test above, no way into the trunk is left open.
      if (dy < 0 && a.y >= o.top && b.y < o.top) {
        const tc = (o.top - a.y) / dy;
        if (Math.hypot(a.x + dx * tc - o.x, a.z + dz * tc - o.z) <= o.r + BALL_R) keep(tc, 'trunk', o, true);
      }
      if (leaves && !used?.has(o.i)) {
        // an ellipsoid is a sphere once y is scaled by rx / ry
        const c = o.canopy, k = c.rx / c.ry;
        keep(segSphere(a.x, ay * k, a.z, dx, dy * k, dz, c.x, c.y * k, c.z, c.rx), 'leaves', o);
      }
    } else keep(segSphere(a.x, ay, a.z, dx, dy, dz, o.x, o.y, o.z, o.r + BALL_R), 'boulder', o);
  }
  if (best) { best.x = a.x + dx * best.t; best.y = a.y + dy * best.t; best.z = a.z + dz * best.t; }
  return best;
}

// Unit normal of a solid obstacle at the ball whose lowest point is p (away from the obstacle).
// A trunk's normal is horizontal, except on its top (K10: the ball at or above the top), where it
// points straight up. `flat` (rolling ball): a boulder's normal is made horizontal too.
const onTop = (o, p) => o.type === 'tree' && p.y >= o.top - 1e-6;
export function solidNormal(o, p, flat = false) {
  if (!flat && onTop(o, p)) return { x: 0, y: 1, z: 0 };
  let nx = p.x - o.x, nz = p.z - o.z, ny = o.type === 'boulder' && !flat ? p.y + BALL_R - o.y : 0;
  let len = Math.hypot(nx, ny, nz);
  if (len < 1e-9) { nx = 1; ny = 0; nz = 0; len = 1; } // dead centre: any way out will do
  return { x: nx / len, y: ny / len, z: nz / len };
}

// The ball's distance outside a solid obstacle (negative = overlapping), for pushing it out.
export function solidGap(o, p) {
  if (onTop(o, p)) return Math.max(p.y - o.top, Math.hypot(p.x - o.x, p.z - o.z) - (o.r + BALL_R)); // on the top: nothing to push out
  if (o.type === 'tree') return Math.hypot(p.x - o.x, p.z - o.z) - (o.r + BALL_R);
  return Math.hypot(p.x - o.x, p.y + BALL_R - o.y, p.z - o.z) - (o.r + BALL_R);
}

// FL1: the flagstick, a thin vertical cylinder standing in the cup (x, z, from the ground y0), radius
// TUNE.FLAG_R and height TUNE.FLAG_H (read live, so ?tune= works). It is NOT one of the hole's
// colliders: the aim warning (K4) never sees it, only the real ball does (ball.js).
export const makePole = cup => ({ x: cup.x, z: cup.z, y0: cup.y });
// The moment the ball moving from a to b (lowest points) in one step touches the pole's side: its
// lowest point below the top of the pole there. Returns null or { t, x, y, z }. A ball dropping onto
// the 2.5 cm top is not a case worth a cap (unlike a trunk's, K10).
export function poleHit(pole, a, b) {
  if (!(TUNE.FLAG_H > 0)) return null;
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const t = segCircle(a.x, a.z, dx, dz, pole.x, pole.z, TUNE.FLAG_R + BALL_R);
  if (t === null || a.y + dy * t > pole.y0 + TUNE.FLAG_H) return null;
  return { t, x: a.x + dx * t, y: a.y + dy * t, z: a.z + dz * t };
}
