// AI rivals (Phase T, DESIGN §8 "Rivals"): 5 invented golfers who "play" a round alongside you.
// They don't hit shots: their score on each hole is drawn from their skill, the hole's par and its
// `difficulty` (1–5), seeded by the hole's seed (which comes from the round seed, round.js holeSeed),
// so the same round seed always gives the same rival scores, whatever you do on the course.
//
//   rivalSkill(rival, difficulty)          a rival's skill (strokes per hole) at Easy / Normal / Hard
//   holeOdds(skill, hole)                  [{ toPar, p }] the chance of each score on that hole
//   rivalScores(holes, seeds, difficulty)  every rival's strokes on every hole (any course length)
//   leaderboard(entries, pars, played)     positions after `played` holes (ties share a position)
//
// Pure: no DOM, no Three.js. The tunables (skill range, difficulty shifts, the score curve) are in
// config.js TUNABLES (RIVAL_*), so ?tune= can change them for a visit.
import { createRng } from './rng.js';
import { TUNE } from './config.js';

// The roster. `rank` places a rival in the skill range: 1 = the best (RIVAL_SKILL_MAX), 0 = the
// weakest (RIVAL_SKILL_MIN). Invented people only: no real golfers.
export const RIVALS = Object.freeze([
  { id: 'bea', name: 'Bea Marlowe', line: 'Fires at every pin. Usually hits it.', rank: 1 },
  { id: 'hank', name: 'Hank Fairweather', line: 'Plays the percentages, and the breeze.', rank: 0.75 },
  { id: 'otto', name: 'Ottoline Pike', line: 'Huge off the tee. Huge in the bunkers too.', rank: 0.5 },
  { id: 'rusty', name: 'Rusty Dunmore', line: 'Forty years of golf, three practice swings a shot.', rank: 0.25 },
  { id: 'pip', name: 'Pip Larkin', line: 'The club\'s newest member, and its loudest.', rank: 0 },
].map(r => Object.freeze(r)));

// The difficulty choice (T2). `shift` names the tunable added to every rival's skill (Normal: none).
export const DIFFICULTIES = Object.freeze([
  { id: 'easy', name: 'Easy', line: 'The rivals have an off day.', shift: 'RIVAL_EASY_SHIFT' },
  { id: 'normal', name: 'Normal', line: 'A fair fight for a steady round.', shift: null },
  { id: 'hard', name: 'Hard', line: 'They rarely drop a shot. Bring your best.', shift: 'RIVAL_HARD_SHIFT' },
].map(d => Object.freeze(d)));
export const DEFAULT_DIFFICULTY = 'normal';

// ?ai= / a stored value → a difficulty id, or null when it isn't one (case-insensitive)
export function resolveDifficulty(text) {
  const key = String(text ?? '').trim().toLowerCase();
  return DIFFICULTIES.find(d => d.id === key)?.id ?? null;
}
const difficultyOf = id => {
  const d = DIFFICULTIES.find(x => x.id === id);
  if (!d) throw new Error(`rivals: unknown difficulty "${id}"`);
  return d;
};

export function rivalSkill(rival, difficulty = DEFAULT_DIFFICULTY) {
  const d = difficultyOf(difficulty);
  const base = TUNE.RIVAL_SKILL_MIN + rival.rank * (TUNE.RIVAL_SKILL_MAX - TUNE.RIVAL_SKILL_MIN);
  return base + (d.shift ? TUNE[d.shift] : 0);
}

// The chance of each score on a hole, from a hole in one to the stroke limit (maxStrokes): a normal
// curve around the expected score, cut into whole strokes. Higher skill and easier holes move it
// toward birdies; harder holes toward bogeys and doubles.
export function holeOdds(skill, hole) {
  const mean = TUNE.RIVAL_BASE + TUNE.RIVAL_DIFF_K * (hole.difficulty - 1) - skill;
  const s2 = 2 * TUNE.RIVAL_SPREAD * TUNE.RIVAL_SPREAD;
  const odds = [];
  for (let toPar = 1 - hole.par; toPar <= hole.maxStrokes - hole.par; toPar++) odds.push({ toPar, p: Math.exp(-((toPar - mean) ** 2) / s2) });
  const sum = odds.reduce((s, o) => s + o.p, 0);
  for (const o of odds) o.p /= sum;
  return odds;
}

// u in [0, 1) → strokes. A higher skill never gives more strokes for the same u, so with the same
// seed a Hard rival always scores the same as or better than the same rival on Easy.
export function rivalHoleScore(skill, hole, u) {
  const odds = holeOdds(skill, hole);
  let acc = 0;
  for (const o of odds) { acc += o.p; if (u < acc) return hole.par + o.toPar; }
  return hole.par + odds.at(-1).toPar;
}

// Each hole's rival numbers come from its own stream (the hole's seed mixed with this salt), so they
// never share numbers with the hole's wind and never depend on how the player plays.
const RIVAL_STREAM = 0x52495641; // "RIVA"

// holes = the round's holes in order, seeds = each hole's seed (round.js holeSeed). Returns one entry
// per rival: { id, name, line, rank, skill, strokes: [one number per hole] }.
export function rivalScores(holes, seeds, difficulty = DEFAULT_DIFFICULTY) {
  const out = RIVALS.map(r => ({ ...r, skill: rivalSkill(r, difficulty), strokes: [] }));
  holes.forEach((hole, i) => {
    const rng = createRng((seeds[i] | 0) ^ RIVAL_STREAM);
    rng(); // the first number of mulberry32 is weakly mixed (as in holeSeed)
    for (const r of out) r.strokes.push(rivalHoleScore(r.skill, hole, rng()));
  });
  return out;
}

// The leaderboard after `played` holes (T3). entries = [{ id, name, you?, strokes: [per hole] }] in
// roster order (the player first), pars = the par of every hole. Sorted by to-par; ties share a
// position ("T2") and stay in a fixed order: the player first, then the roster order.
// Returns [{ pos, tied, posText, id, name, you, thru, strokes, toPar, last }] (last = this hole's strokes).
export function leaderboard(entries, pars, played) {
  const rows = entries.map((e, order) => {
    let strokes = 0, par = 0;
    for (let i = 0; i < played; i++) { strokes += e.strokes[i]; par += pars[i]; }
    return { id: e.id, name: e.name, you: !!e.you, thru: played, strokes, toPar: strokes - par, last: played ? e.strokes[played - 1] : null, order };
  });
  rows.sort((a, b) => a.toPar - b.toPar || (b.you - a.you) || a.order - b.order);
  rows.forEach((r, i) => {
    r.pos = i > 0 && rows[i - 1].toPar === r.toPar ? rows[i - 1].pos : i + 1;
  });
  for (const r of rows) {
    r.tied = rows.filter(x => x.pos === r.pos).length > 1;
    r.posText = `${r.tied ? 'T' : ''}${r.pos}`;
    delete r.order;
  }
  return rows;
}

// 1 → "1st", 2 → "2nd", 11 → "11th", 23 → "23rd"
export function ordinal(n) {
  const t = n % 100, s = t >= 11 && t <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${s}`;
}

// The player's place at the end: "You won!", "You finished 2nd of 6", "You tied for 1st of 6"
export function placeText(row, field) {
  if (row.pos === 1 && !row.tied) return 'You won!';
  return `You ${row.tied ? 'tied for' : 'finished'} ${ordinal(row.pos)} of ${field}`;
}
