// The scripted shots for baseline v2 and how to play one through the core (shared by the
// recorder in tools/ and by tests/baseline-v2.test.js). Not a test file itself.
import { readFileSync } from 'node:fs';
import { createHolePlay } from '../src/core/play.js';
import { getHole } from '../src/holes/sets.js';

const v1 = JSON.parse(readFileSync(new URL('./fixtures/baseline.json', import.meta.url), 'utf8'));

// Every v1 shot (same start, same inputs, no wind) plus a few with a fixed seed so wind is covered.
export const SHOTS = [
  ...v1.shots.map(s => ({
    name: `${s.scenario} #${s.start.strokes + 1}`, hole: s.hole, seed: null,
    start: { x: s.start.x, z: s.start.z }, strokes: s.start.strokes, power: s.power, acc: s.acc, aimOff: s.aimOff,
  })),
  { name: 'h1 tee shot in seeded wind', hole: 'pl-01', seed: 11, start: { x: 0, z: 0 }, strokes: 0, power: 1, acc: 0, aimOff: 0 },
  { name: 'h2 drive in seeded wind', hole: 'pl-02', seed: 23, start: { x: 0, z: 0 }, strokes: 0, power: 0.95, acc: -0.03, aimOff: 0 },
  { name: 'h2 approach in seeded wind', hole: 'pl-02', seed: 37, start: { x: 18, z: -330 }, strokes: 1, power: 0.9, acc: 0.02, aimOff: 0 },
];

// Play one shot to the end. seed null = wind forced to 0.
export function playShot(s) {
  const play = createHolePlay(getHole(s.hole), { seed: s.seed ?? 1 });
  play.newWind();
  if (s.seed === null) play.wind.x = play.wind.z = 0;
  play.ball.pos.x = s.start.x; play.ball.pos.z = s.start.z;
  play.prepare();
  play.strokes = s.strokes;
  play.aim += s.aimOff;
  const club = play.club.id;
  play.hit(s.power, s.acc);
  const ev = play.simulate();
  if (ev.type === 'penalty') play.returnToLastPos();
  const { x, y, z } = play.ball.pos;
  return { x, y, z, event: ev.type, strokes: play.strokes, club, wind: { x: play.wind.x, z: play.wind.z } };
}
