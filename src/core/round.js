// A round (Phase 6, DESIGN §8): a course played hole after hole, with one seed and a scorecard.
//
// Owner rule (2026-11-17): a course is just a playlist of hole ids, of ANY length (1, 9, 18, 99…),
// and the same hole can appear several times or in several courses. Nothing here assumes 9 holes:
// every position in the playlist is its own scorecard row, numbered 1…N by its place in the round.
//
//   const round = createRound({ id, name, holes: ['pl-01', …] }, { seed, getHole })
//   round.current          { index, number, of, hole, seed } for the hole being played (null when done)
//   round.record(finished) the hole is over (play.finished): one scorecard row, returns it
//   round.advance()        on to the next hole; returns the new current, or null when the round is done
//   round.restart()        back to hole 1 with an empty scorecard (same seed, so the same winds)
//   round.totals           { played, strokes, par, toPar, penalties, pickedUp }
//   round.groups()         the scorecard in groups of SCORECARD_GROUP (Out / In / Holes 19–27 …) with subtotals
//
// Pure: no DOM, no Three.js. The game layer (main.js) loads a hole session for round.current.
import { createRng } from './rng.js';
import { resultName } from './scoring.js';
import { SCORECARD_GROUP } from './config.js';

// R7: each hole's seed comes from the round seed and its place in the round (not its id, so the same
// hole played twice in one round gets a different wind). Same round seed → same seeds → same winds.
export function holeSeed(roundSeed, index) {
  const rng = createRng((roundSeed | 0) ^ Math.imul(index + 1, 0x9E3779B1));
  rng(); // the first number of mulberry32 is weakly mixed; use the second
  return Math.floor(rng() * 4294967296) | 0;
}

// "+3", "-2", "E" (even par)
export const toParText = n => (n === 0 ? 'E' : n > 0 ? `+${n}` : `${n}`);

export function createRound(set, { seed = 1, getHole }) {
  if (!set || !Array.isArray(set.holes) || set.holes.length === 0) throw new Error(`round: hole set "${set?.id ?? '?'}" has no holes`);
  const holes = set.holes.map(id => {
    const h = getHole(id);
    if (!h) throw new Error(`round: hole set "${set.id}": unknown hole "${id}"`);
    return h;
  });
  const N = holes.length;
  const seeds = holes.map((_, i) => holeSeed(seed, i));
  let index = 0;
  let cards = []; // one row per finished hole, in order

  const round = {
    set, seed, length: N,
    get index() { return index; },
    get done() { return index >= N; },
    get cards() { return cards; },
    get current() { return index < N ? { index, number: index + 1, of: N, hole: holes[index], seed: seeds[index] } : null; },
    get totals() { return totalsOf(cards); },
    holeAt: i => holes[i], seedAt: i => seeds[i],
    record, advance, restart, groups,
  };

  // The current hole is over. `finished` = play.finished { strokes, penalties, pickedUp, par }.
  // A picked-up hole counts the strokes taken (the stroke limit, maxStrokes) and is flagged.
  function record(finished) {
    if (index >= N) throw new Error('round: the round is already over');
    if (cards.length > index) throw new Error(`round: hole ${index + 1} is already recorded`);
    const hole = holes[index];
    const strokes = finished.strokes, par = hole.par, pickedUp = !!finished.pickedUp;
    const row = {
      number: index + 1, holeId: hole.id, name: hole.name, par, strokes,
      penalties: finished.penalties ?? 0, pickedUp, toPar: strokes - par,
      result: pickedUp ? 'Picked up' : resultName(strokes, par),
    };
    cards.push(row);
    return row;
  }

  function advance() {
    if (cards.length <= index) throw new Error(`round: hole ${index + 1} has no score yet`);
    index++;
    return round.current;
  }

  function restart() { index = 0; cards = []; return round.current; }

  // The scorecard in groups of `size` holes. Every hole of the round is listed (holes not played yet
  // have strokes null). With the usual size 9, a full first group is "Out" and a full second group
  // "In" (golf's names for the front and back nine; a 9-hole round is one "Out" group, PM Phase 7);
  // every other group is named by its hole numbers ("Holes 1–3", "Holes 19–27").
  function groups(size = SCORECARD_GROUP) {
    const out = [];
    for (let from = 0; from < N; from += size) {
      const to = Math.min(from + size, N), g = out.length;
      const rows = [];
      for (let i = from; i < to; i++) rows.push(cards[i] ?? { number: i + 1, holeId: holes[i].id, name: holes[i].name, par: holes[i].par, strokes: null, toPar: null, pickedUp: false, penalties: 0, result: '' });
      const full = to - from === size;
      const label = size === 9 && full && g === 0 ? 'Out'
        : size === 9 && full && g === 1 ? 'In'
        : rangeLabel(from, to);
      out.push({ label, from: from + 1, to, rows, ...subtotal(rows) });
    }
    return out;
  }

  return round;
}

const rangeLabel = (from, to) => (to - from === 1 ? `Hole ${from + 1}` : `Holes ${from + 1}–${to}`);

// Par is for every hole in the group; strokes and to-par only count the holes played so far.
function subtotal(rows) {
  const played = rows.filter(r => r.strokes != null);
  const strokes = played.reduce((s, r) => s + r.strokes, 0);
  const parPlayed = played.reduce((s, r) => s + r.par, 0);
  return { par: rows.reduce((s, r) => s + r.par, 0), strokes, played: played.length, toPar: strokes - parPlayed };
}

function totalsOf(cards) {
  const strokes = cards.reduce((s, r) => s + r.strokes, 0), par = cards.reduce((s, r) => s + r.par, 0);
  return {
    played: cards.length, strokes, par, toPar: strokes - par,
    penalties: cards.reduce((s, r) => s + r.penalties, 0), pickedUp: cards.filter(r => r.pickedUp).length,
  };
}

// R6: personal best per course. A best is { strokes, toPar, seed, date }; lower to-par wins (the
// course is the same, so this is also fewer strokes). Only a finished round counts.
export function isNewBest(prev, totals) {
  if (!prev || !Number.isFinite(prev.toPar)) return true;
  return totals.toPar < prev.toPar;
}
