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
  // Gate A T2 (Fix pass 1): the swing feel itself. Lies with a cap below 1, curves off the window
  // edge, every meter outcome, a lip-out and a sloped bunker. Optional fields: `club` (club id,
  // instead of the auto-pick) and `outcome` (from the meter: 'shank', 'topped'; default 'normal').
  // Note: "h1 hook" / "h1 slice" above (acc ±0.06 off the tee) sit exactly on the tee's window edge
  // (0.05 × 1.2) and fly straight: they stay as they are (v1 shots, frozen), and the curves are below.
  { name: 'T2 h1 from the rough (cap 85%, narrow window)', hole: 'pl-01', seed: null, start: { x: -28, z: -50 }, strokes: 1, power: 0.85, acc: -0.06, aimOff: 0 },
  { name: 'T2 h1 greenside bunker, sand wedge', hole: 'pl-01', seed: null, start: { x: -15, z: -147 }, strokes: 1, power: 0.4, acc: 0, aimOff: 0 },
  { name: 'T2 h1 greenside bunker, 9 iron (no SW)', hole: 'pl-01', seed: null, start: { x: -15, z: -147 }, strokes: 1, power: 0.3, acc: 0, aimOff: 0, club: '9i' },
  { name: 'T2 h2 fairway bunker (auto-pick, cap 60%)', hole: 'pl-02', seed: null, start: { x: 16, z: -237 }, strokes: 1, power: 0.6, acc: 0, aimOff: 0 },
  { name: 'T2 h2 fringe chip (21 m)', hole: 'pl-02', seed: null, start: { x: 5, z: -446 }, strokes: 2, power: 0.3, acc: 0, aimOff: 0 },
  { name: 'T2 h1 hook acc +0.10', hole: 'pl-01', seed: null, start: { x: 0, z: 0 }, strokes: 0, power: 0.95, acc: 0.1, aimOff: 0 },
  { name: 'T2 h1 slice acc -0.10', hole: 'pl-01', seed: null, start: { x: 0, z: 0 }, strokes: 0, power: 0.95, acc: -0.1, aimOff: 0 },
  { name: 'T2 h1 hook acc +0.15', hole: 'pl-01', seed: null, start: { x: 0, z: 0 }, strokes: 0, power: 0.95, acc: 0.15, aimOff: 0 },
  { name: 'T2 h1 slice acc -0.15', hole: 'pl-01', seed: null, start: { x: 0, z: 0 }, strokes: 0, power: 0.95, acc: -0.15, aimOff: 0 },
  { name: 'T2 h1 shank (no 3rd click)', hole: 'pl-01', seed: null, start: { x: 0, z: 0 }, strokes: 0, power: 0.5, acc: -0.2, aimOff: 0, outcome: 'shank' },
  { name: 'T2 h2 topped (no power click)', hole: 'pl-02', seed: null, start: { x: 0, z: 0 }, strokes: 0, power: 0.15, acc: 0.03, aimOff: 0, outcome: 'topped' },
  { name: 'T2 h1 mistimed putt (late, acc -0.15)', hole: 'pl-01', seed: null, start: { x: -6, z: -146 }, strokes: 1, power: 0.7, acc: -0.15, aimOff: 0 },
  { name: 'T2 h1 putt lips out (seed 5)', hole: 'pl-01', seed: 5, start: { x: -6, z: -146 }, strokes: 1, power: 0.95, acc: 0, aimOff: 0, windless: true },
  { name: 'T2 h2 approach lands in the sloped cross bunker (10%)', hole: 'pl-02', seed: null, start: { x: 18, z: -330 }, strokes: 1, power: 0.45, acc: 0, aimOff: -0.1 },
];

// Play one shot to the end. seed null = wind forced to 0 (and the seed is 1, for lip-outs);
// windless = a seed for the lip-out dice but no wind. `lippedOut: true` is recorded only when it happened.
export function playShot(s) {
  const play = createHolePlay(getHole(s.hole), { seed: s.seed ?? 1 });
  play.newWind();
  if (s.seed === null || s.windless) play.wind.x = play.wind.z = 0;
  play.ball.pos.x = s.start.x; play.ball.pos.z = s.start.z;
  play.prepare();
  play.strokes = s.strokes;
  play.aim += s.aimOff;
  if (s.club) play.setClub(play.bag.findIndex(c => c.id === s.club));
  const club = play.club.id;
  play.hit(s.power, s.acc, s.outcome ?? 'normal');
  let ev = null, lippedOut = false;
  for (let i = 0; i < 1e6 && play.ball.moving; i++) {
    const e = play.step();
    if (e?.type === 'lippedOut') lippedOut = true;
    if (e && ['holed', 'stopped', 'penalty'].includes(e.type)) ev = e;
  }
  if (ev.type === 'penalty') play.returnToLastPos();
  const { x, y, z } = play.ball.pos;
  return { x, y, z, event: ev.type, strokes: play.strokes, club, wind: { x: play.wind.x, z: play.wind.z }, ...(lippedOut ? { lippedOut } : {}) };
}
