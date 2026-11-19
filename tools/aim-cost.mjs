// Aim-step cost (AP1 / X15), dev/QA only, plain Node (no browser).
//
//   node tools/aim-cost.mjs                    mtn-07, mtn-04, pl-01
//   node tools/aim-cost.mjs --hole mtn-09      one hole (repeatable)
//
// While the player holds ▶/◀ the aim changes every frame, so every frame misses the core memos and
// pays for the aim guide's work: the tree warning (play.shotWarning, a fine-stepped flight tested
// against the obstacles), the aim marks (play.aimMarks: the marker and the ticks) and the landing
// point. This times exactly those calls from the tee, with the auto-picked club, for a sweep of
// fresh aim values: straight (centre impact) and shaped (an impact off the centre, BC4: the shaped
// preview also plays the shot out). JS time in Node is close to a desktop browser's; a phone's CPU
// is ~2–4× slower. Rendering is not measured here (headless WebGL is software).
import { HOLES } from '../src/holes/sets.js';
import { createHolePlay } from '../src/core/play.js';

const args = process.argv.slice(2);
const only = args.flatMap((a, i) => (a === '--hole' ? [args[i + 1]] : []));
const ids = only.length ? only : ['mtn-07', 'mtn-04', 'pl-01'];
const STEPS = 200, SPAN = 0.4, WARMUP = 40; // fresh aims over ±SPAN/2 rad around the default aim

const stats = ms => {
  const s = [...ms].sort((a, b) => a - b), mean = s.reduce((a, b) => a + b, 0) / s.length;
  return `${mean.toFixed(2).padStart(6)} ${s[Math.floor(s.length * 0.95)].toFixed(2).padStart(6)} ${s[s.length - 1].toFixed(2).padStart(6)}`;
};

console.log('JS ms per aim step (fresh aim each step, memos missed): mean / p95 / max');
console.log('hole    | obst | impact   | warning (shotWarning)  | marks (aimMarks)       | landing               | total');
for (const id of ids) {
  const hole = HOLES[id];
  void hole.obstacles; // build the lazy hole outside the timing (X12)
  for (const [label, impact] of [['centre', null], ['shaped', { x: 0.6, y: 0 }]]) {
    const play = createHolePlay(hole, { seed: 7 });
    play.reset();
    if (impact) play.setImpact(impact);
    const a0 = play.aim, i = play.clubIdx;
    const w = [], m = [], l = [], tot = [];
    for (let k = -WARMUP; k < STEPS; k++) {
      const a = a0 - SPAN / 2 + SPAN * ((k + WARMUP) / (STEPS + WARMUP)) + 1e-7 * k;
      play.setAim(a);
      const t0 = performance.now(); play.shotWarning();
      const t1 = performance.now(); play.aimMarks();
      const t2 = performance.now(); play.landingPoint(i);
      const t3 = performance.now();
      if (k >= 0) { w.push(t1 - t0); m.push(t2 - t1); l.push(t3 - t2); tot.push(t3 - t0); }
    }
    console.log([id.padEnd(7), String(play.obstacles.length).padStart(4), label.padEnd(8), stats(w).padEnd(22), stats(m).padEnd(22), stats(l).padEnd(21), stats(tot)].join(' | '));
  }
}
