// Phase BC (owner, 2026-11-19, DESIGN §3 "Ball control"): the player chooses where the club hits the
// ball (the impact point) before the swing, and that shapes the shot. Pure: no DOM, no Three.js.
//
// The impact point is { x, y } inside the unit disc, as the player sees the ball from behind:
//   x < 0 = the left of the ball, x > 0 = the right; y < 0 = the bottom, y > 0 = the top.
// { x: 0, y: 0 } (the centre) is exactly today's shot: shapeOf() returns null and resolveShot takes
// the unchanged path, so every existing shot (baselines v1 and v2) is untouched.
//
// BC1, left / right = "start out, then curve back" (right-handed): an impact on the LEFT starts the
//   ball out to the LEFT of the aim, then it curves to the RIGHT; on the right, the mirror. A
//   left-handed player mirrors it (handed 'left'). The start angle is x × the club's `start` degrees;
//   the sideways curve is a constant push across the aim line, sized so that on flat ground with no
//   wind the ball comes back BC_BACK of the way by the time it lands (1 = it lands on the aim line,
//   whatever the power: the push only depends on the start angle and the loft).
// BC2, bottom / top = height: the loft changes by −y × the club's `height` degrees (bottom = higher).
//   The carry stays p × the club's carry on flat ground (launchVelocity solves the speed for the new
//   loft), so the power bar and the aim marker's ticks keep their meaning. A higher ball comes down
//   steeper, so it rolls less by itself; on top of that the first bounce keeps (1 + y × `roll`) of its
//   speed and the wind pushes it (1 − y × `wind`) as hard (bottom: more wind, top: less).
// The lie limits it: every effect × the surface's `shape` (1 on the tee and fairway, less in the rough
// and the sand, surfaces.js). Corners combine both.
import { G, BC, TUNE } from './config.js';
import { clamp, degToRad } from './vec.js';
import { clubShape } from './clubs.js';

export const CENTRE = Object.freeze({ x: 0, y: 0 });

// Keep an impact point inside the unit disc (the ball icon). Non-numbers count as 0.
export function clampImpact(pt) {
  const x = Number.isFinite(pt?.x) ? pt.x : 0, y = Number.isFinite(pt?.y) ? pt.y : 0;
  const r = Math.hypot(x, y);
  return r > 1 ? { x: x / r, y: y / r } : { x, y };
}
export const isCentre = pt => !pt || (pt.x === 0 && pt.y === 0);

// The shaping of a full shot with `club`, hit at `impact`, from a lie whose `shape` is lieShape
// (0..1), by a `handed` ('right' | 'left') player. Returns null for the centre (or a putt, or a lie
// that removes all shaping), else
//   { x, y }      the impact after the lie (what really shapes the shot)
//   start         rad, the launch direction relative to the aim (> 0 = to the right)
//   loft          deg, the launch loft (the club's, changed by the height)
//   push          m/s² across the aim line (> 0 = to the right): the curve back
//   windK         × the wind's push in the air
//   keepK         × the speed kept on the first bounce (the roll)
export function shapeOf(club, impact, { lieShape = 1, handed = 'right' } = {}) {
  if (club.putter || isCentre(impact)) return null;
  const pt = clampImpact(impact), k = clamp(lieShape, 0, 1);
  const x = pt.x * k * (handed === 'left' ? -1 : 1), y = pt.y * k;
  if (x === 0 && y === 0) return null;
  const s = clubShape(club);
  const start = degToRad(x * s.start);
  const loft = clamp(club.loft - y * s.height, BC.loftMin, BC.loftMax);
  const t = degToRad(loft);
  // Flat ground, no wind: the ball is in the air T = 2 v sin(loft) / G and drifts sideways at
  // v cos(loft) sin(start). A constant push a brings it back BACK of the way at landing when
  // a T² / 2 = −BACK × v cos(loft) sin(start) T, i.e. a = −BACK × G sin(start) / tan(loft) (no v).
  const push = -TUNE.BC_BACK * G * Math.sin(start) / Math.tan(t);
  return { x, y, start, loft, push, windK: 1 - y * s.wind, keepK: 1 + y * s.roll };
}
