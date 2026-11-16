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
