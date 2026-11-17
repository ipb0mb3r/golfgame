// Small synthetic holes for unit tests.
export function testHole({ heightAt = () => 0, surfaceAt = () => 'green', cup = { x: 0, z: -1000 }, ...rest } = {}) {
  return {
    id: 'test', number: 0, name: 'Test', par: 4, maxStrokes: 10, difficulty: 1,
    tee: { x: 0, z: 0 }, cup, wind: { x: 0, z: 0 },
    weather: { type: 'clear', wetness: 0 }, surfaceOverrides: {},
    map: { x0: -50, x1: 50, z0: -50, z1: 50 }, features: {},
    heightAt, surfaceAt, ...rest,
  };
}

// Roll a ball from (x, z) with velocity (vx, vz) until it ends. Returns { pos, ev, play }.
import { createHolePlay } from '../src/core/play.js';
export function rollFrom(hole, x, z, vx, vz, maxSteps = 240 * 60) {
  const play = createHolePlay(hole, { seed: 1 });
  play.ball.pos.x = x; play.ball.pos.z = z; play.ball.pos.y = play.terrain.heightAt(x, z);
  play.ball.launch({ kind: 'putt', vel: { x: vx, y: 0, z: vz }, curve: { x: 0, y: 0, z: 0 }, spinFactor: 1 });
  const events = [];
  for (let i = 0; i < maxSteps && play.ball.moving; i++) { const ev = play.step(); if (ev) events.push(ev); }
  return { pos: play.ball.pos, ev: events[events.length - 1] || null, events, play };
}

// Play a swing on the meter with clicks at scripted times (seconds after the first click, which is
// at t = 0). `cap` = the lie's power cap (S11). Like the game (S16): frames every `dt` move the meter
// with tickMeterTo(frame time), and each click is pressMeterAt(its own time), between frames.
// `start` = when the first click happens relative to the frame clock (0 = exactly on a frame).
// `speed` = METER_SPEED for this swing (default 1, so the times read as meter values: the meter
// reaches 1 at t = 1 s); null = the current TUNE.METER_SPEED. Returns { result, events, meter }.
import { createMeter, pressMeterAt, tickMeterTo } from '../src/core/swing.js';
import { TUNE } from '../src/core/config.js';
export function scriptedSwing(clickTimes, { speed = 1, ...opts } = {}) {
  const was = TUNE.METER_SPEED;
  if (speed != null) TUNE.METER_SPEED = speed;
  try { return runSwing(clickTimes, opts); } finally { TUNE.METER_SPEED = was; }
}
function runSwing(clickTimes, { dt = 1 / 1000, maxT = 10, cap = 1, start = 0 } = {}) {
  const meter = createMeter(cap), events = [];
  const clicks = [0, ...clickTimes].map(c => c + start);
  let i = 0, result = null;
  for (let k = 0; k * dt <= maxT + start && !result; k++) {
    const t = k * dt; // this frame's time
    // the clicks since the last frame, each at its own time (the browser delivers them before the frame)
    while (!result && i < clicks.length && clicks[i] <= t + 1e-9) { result = pressMeterAt(meter, clicks[i]); i++; }
    if (result) break;
    if (i === 0) continue; // the swing hasn't started yet
    const r = tickMeterTo(meter, t);
    if (meter.event) events.push({ t: t - start, event: meter.event });
    result = r;
  }
  return { result, events, meter };
}
