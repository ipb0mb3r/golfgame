// The scripted shots for baseline v2 and how to play one through the core (shared by the
// recorder in tools/ and by tests/baseline-v2.test.js). Not a test file itself.
import { readFileSync } from 'node:fs';
import { createHolePlay } from '../src/core/play.js';
import { getHole } from '../src/holes/sets.js';
import { aimAt } from '../src/core/vec.js';

const v1 = JSON.parse(readFileSync(new URL('./fixtures/baseline.json', import.meta.url), 'utf8'));

// v1 shots whose v2 name says more than the old scenario name. Fix pass 2 (PM on PR #24): the two
// "h1 hook/slice" tee shots at acc ±0.06 sat exactly on the tee window edge (0.05 × 1.2) and flew
// straight; with S17's SWEET 0.045 the window is ±0.054, so they are slight curves again.
const RENAME = { 'h1 hook': 'h1 slight hook, tee', 'h1 slice': 'h1 slight slice, tee' };

// Every v1 shot (same start, same inputs, no wind) plus a few with a fixed seed so wind is covered.
export const SHOTS = [
  ...v1.shots.map(s => ({
    name: `${RENAME[s.scenario] ?? s.scenario} #${s.start.strokes + 1}`, hole: s.hole, seed: null,
    start: { x: s.start.x, z: s.start.z }, strokes: s.start.strokes, power: s.power, acc: s.acc, aimOff: s.aimOff,
  })),
  { name: 'h1 tee shot in seeded wind', hole: 'pl-01', seed: 11, start: { x: 0, z: 0 }, strokes: 0, power: 1, acc: 0, aimOff: 0 },
  { name: 'h2 drive in seeded wind', hole: 'pl-02', seed: 23, start: { x: 0, z: 0 }, strokes: 0, power: 0.95, acc: -0.03, aimOff: 0 },
  { name: 'h2 approach in seeded wind', hole: 'pl-02', seed: 37, start: { x: 18, z: -330 }, strokes: 1, power: 0.9, acc: 0.02, aimOff: 0 },
  // Gate A T2 (Fix pass 1): the swing feel itself. Lies with a cap below 1, curves off the window
  // edge, every meter outcome, a lip-out and a sloped bunker. Optional fields: `club` (club id,
  // instead of the auto-pick) and `outcome` (from the meter: 'shank', 'topped'; default 'normal').
  // `power: 'pin'` (S21) hits at the ⚑ power for the default aim (at most the lie's cap); `aimFrom`
  // { x, z } (S21): aimOff is from the line to this point instead of from the default aim.
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
  // Fix pass 2: the 12 m putt that lipped out no longer can on the faster green (S17: a full putt
  // reaches the cup below CUP_CAPTURE_SPEED), so the lip-out shot is now a firm 15 m putt.
  { name: 'T2 h1 putt lips out (seed 5)', hole: 'pl-01', seed: 5, start: { x: -11, z: -153 }, strokes: 1, power: 1, acc: 0, aimOff: 0, windless: true },
  // Fix pass 2: the faster greens (S17), a roll that used to creep for 40 s (P10) and the default aim (S18)
  { name: 'FP2 h2 long putt across the faster green (two tiers)', hole: 'pl-02', seed: null, start: { x: 8, z: -440 }, strokes: 2, power: 0.6, acc: 0, aimOff: 0 },
  { name: 'FP2 h1 approach runs out on the faster green', hole: 'pl-01', seed: null, start: { x: 2, z: -60 }, strokes: 1, power: 0.9, acc: 0, aimOff: 0 },
  { name: 'FP2 h2 3 wood into the hollow (used to creep 40 s)', hole: 'pl-02', seed: null, start: { x: -58, z: -256 }, strokes: 1, power: 1, acc: 0, aimOff: 0, club: '3w' },
  { name: 'FP2 h2 approach from the right rough (aims at the green centre)', hole: 'pl-02', seed: null, start: { x: 40, z: -380 }, strokes: 2, power: 0.7, acc: 0, aimOff: 0 },
  { name: 'T2 h2 approach lands in the sloped cross bunker (10%)', hole: 'pl-02', seed: null, start: { x: 18, z: -330 }, strokes: 1, power: 0.45, acc: 0, aimOff: -0.1 },
  // Phase K (K7): hole 3, trees, boulders and rock. aimOff 0.2637 = the cut line over the corner trees
  // (toward (65, −207)), −0.0572 = straight through the corner onto the rock (toward (−4, −240)).
  // S21: those offsets were from the old tee aim at (9, −222); `aimFrom` keeps that base, so the lines stay.
  { name: 'K h3 default drive in seeded wind', hole: 'pl-03', seed: 31, start: { x: 0, z: 0 }, strokes: 0, power: 0.95, acc: 0, aimOff: 0 },
  { name: 'K h3 cut the corner, full Driver clears the trees', hole: 'pl-03', seed: null, start: { x: 0, z: 0 }, strokes: 0, power: 1, acc: 0, aimFrom: { x: 9, z: -222 }, aimOff: 0.2637 },
  { name: 'K h3 cut the corner too weak: into the leaves', hole: 'pl-03', seed: 3, start: { x: 0, z: 0 }, strokes: 0, power: 0.85, acc: 0, aimFrom: { x: 9, z: -222 }, aimOff: 0.2637, windless: true },
  { name: 'K h3 cut the corner sliced: into the leaves', hole: 'pl-03', seed: 4, start: { x: 0, z: 0 }, strokes: 0, power: 1, acc: -0.15, aimFrom: { x: 9, z: -222 }, aimOff: 0.2637, windless: true },
  { name: 'K h3 behind the lone tree: into its leaves', hole: 'pl-03', seed: 5, start: { x: -26, z: -203 }, strokes: 1, power: 1, acc: 0, aimOff: 0, windless: true },
  { name: 'K h3 drive through the corner onto the rock', hole: 'pl-03', seed: null, start: { x: 0, z: 0 }, strokes: 0, power: 1, acc: 0, aimFrom: { x: 9, z: -222 }, aimOff: -0.0572 },
  { name: 'K h3 from the rock (cap 90%)', hole: 'pl-03', seed: null, start: { x: -4, z: -254 }, strokes: 1, power: 0.9, acc: 0.03, aimOff: 0 },
  { name: 'K h3 putt off the rock into a boulder', hole: 'pl-03', seed: null, start: { x: -2, z: -260 }, strokes: 1, power: 0.6, acc: 0, aimOff: -1.1779, club: 'putter' },
  // S21: the default tee shot as the game offers it (straight along the tee's facing, auto club, at
  // the ⚑ power: `power: 'pin'`), so a change to the tee aim or its ⚑ shows up here
  { name: 'S21 h1 default tee shot at the ⚑', hole: 'pl-01', seed: null, start: { x: 0, z: 0 }, strokes: 0, power: 'pin', acc: 0, aimOff: 0 },
  { name: 'S21 h2 default tee shot at the ⚑', hole: 'pl-02', seed: null, start: { x: 0, z: 0 }, strokes: 0, power: 'pin', acc: 0, aimOff: 0 },
  { name: 'S21 h3 default tee shot at the ⚑', hole: 'pl-03', seed: null, start: { x: 0, z: 0 }, strokes: 0, power: 'pin', acc: 0, aimOff: 0 },
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
  if (s.aimFrom) play.setAim(aimAt(play.ball.pos, s.aimFrom)); // S21: offsets from a fixed point, not the default aim
  play.aim += s.aimOff;
  if (s.club) play.setClub(play.bag.findIndex(c => c.id === s.club));
  const club = play.club.id;
  const power = s.power === 'pin' ? Math.min(play.pinPower(), play.lieOf().maxPower) : s.power; // S21: 'pin' = the ⚑ power
  play.hit(power, s.acc, s.outcome ?? 'normal');
  let ev = null, lippedOut = false;
  for (let i = 0; i < 1e6 && play.ball.moving; i++) {
    const e = play.step();
    if (e?.type === 'lippedOut') lippedOut = true;
    if (e && ['holed', 'stopped', 'penalty'].includes(e.type)) ev = e;
  }
  if (ev.type === 'penalty') play.returnToLastPos();
  const { x, y, z } = play.ball.pos;
  return { x, y, z, event: ev.type, ...(ev.reason ? { reason: ev.reason } : {}), strokes: play.strokes, club, wind: { x: play.wind.x, z: play.wind.z }, ...(lippedOut ? { lippedOut } : {}) };
}
