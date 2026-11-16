// Small synthetic holes for unit tests.
export function testHole({ heightAt = () => 0, surfaceAt = () => 'green', cup = { x: 0, z: -1000 }, ...rest } = {}) {
  return {
    id: 'test', number: 0, name: 'Test', par: 4, maxStrokes: 10,
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
// at t = 0). The meter is ticked in steps of `dt`, like frames. Returns { result, events, meter }.
import { createMeter, pressMeter, tickMeter } from '../src/core/swing.js';
export function scriptedSwing(clickTimes, { dt = 1 / 1000, maxT = 10 } = {}) {
  const meter = createMeter(), events = [];
  const clicks = [0, ...clickTimes];
  let i = 0, result = null;
  for (let k = 0; k * dt <= maxT && !result; k++) {
    const t = k * dt;
    while (!result && i < clicks.length && clicks[i] <= t + 1e-9) { result = pressMeter(meter); i++; }
    if (result) break;
    const r = tickMeter(meter, dt);
    if (meter.event) events.push({ t: t + dt, event: meter.event });
    result = r;
  }
  return { result, events, meter };
}
