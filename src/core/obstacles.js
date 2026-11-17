// Obstacles (Phase K, DESIGN §4 "Obstacles"): tree trunks, tree leaves (canopies) and boulders.
// A hole lists them as data:
//   { type: 'tree', x, z, trunkR, trunkH, canopyR, canopyH }
//   { type: 'boulder', x, z, r, sink? }
// makeColliders() turns that list into the shapes the physics, the aim warning and the renderer all
// use, so what you see is exactly what the ball hits (K5):
//   trunk    a vertical cylinder of radius trunkR from the ground (at x, z) up to trunkH
//   canopy   an ellipsoid centred on the top of the trunk: canopyR across, canopyH tall
//            (so the leaves start canopyH / 2 below the top of the trunk)
//   boulder  a sphere of radius r, sunk into the ground by sink × r (default BOULDER_SINK)
// The ball is a sphere of radius BALL_R whose lowest point is ball.pos, so the tests below use its
// centre (pos.y + BALL_R) and grow solid shapes by BALL_R. The leaves are not grown: the ball is in
// the leaves when its centre is.
import { BALL_R, BOULDER_SINK } from './config.js';

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
// hit per tree per shot, K3). Returns null or { t, kind: 'trunk' | 'boulder' | 'leaves', o, x, y, z }
// with the ball's position (lowest point) at the moment of contact.
export function firstHit(colliders, a, b, { leaves = true, used = null } = {}) {
  const ay = a.y + BALL_R, dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  let best = null;
  const keep = (t, kind, o) => { if (t !== null && (!best || t < best.t)) best = { t, kind, o }; };
  for (const o of colliders) {
    if (o.type === 'tree') {
      const t = segCircle(a.x, a.z, dx, dz, o.x, o.z, o.r + BALL_R);
      // the ball's centre must be below the top of the trunk where it meets it
      if (t !== null && ay + dy * t <= o.top) keep(t, 'trunk', o);
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
// A trunk's normal is horizontal. `flat` (rolling ball): a boulder's normal is made horizontal too.
export function solidNormal(o, p, flat = false) {
  let nx = p.x - o.x, nz = p.z - o.z, ny = o.type === 'boulder' && !flat ? p.y + BALL_R - o.y : 0;
  let len = Math.hypot(nx, ny, nz);
  if (len < 1e-9) { nx = 1; ny = 0; nz = 0; len = 1; } // dead centre: any way out will do
  return { x: nx / len, y: ny / len, z: nz / len };
}

// The ball's distance outside a solid obstacle (negative = overlapping), for pushing it out.
export function solidGap(o, p) {
  if (o.type === 'tree') return Math.hypot(p.x - o.x, p.z - o.z) - (o.r + BALL_R);
  return Math.hypot(p.x - o.x, p.y + BALL_R - o.y, p.z - o.z) - (o.r + BALL_R);
}
