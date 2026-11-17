// Tiny vector helpers on plain {x, y, z} objects.
export const v3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
export const copy = (out, a) => { out.x = a.x; out.y = a.y; out.z = a.z; return out; };
export const set = (out, x, y, z) => { out.x = x; out.y = y; out.z = z; return out; };
export const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const dist2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// Flat length of a line through points [{ x, z }, ...] (K12: a hole's play line)
export const pathLength = pts => pts.reduce((sum, q, i) => i ? sum + dist2D(pts[i - 1], q) : 0, 0);
// How long a hole plays (K12): along its playLine when it has one (a dogleg), else tee to cup in a straight line
export const holeLength = hole => pathLength(hole.playLine ?? [hole.tee, hole.cup]);
export const speed2D = v => Math.hypot(v.x, v.z);
// Aim angle 0 = straight down −z. Positive = to the right.
export const dirFromAim = a => v3(Math.sin(a), 0, -Math.cos(a));
export const rightFromAim = a => v3(Math.cos(a), 0, Math.sin(a));
export const aimAt = (from, to) => Math.atan2(to.x - from.x, -(to.z - from.z));
export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
export const degToRad = d => d * (Math.PI / 180); // same rounding as THREE.MathUtils.degToRad
