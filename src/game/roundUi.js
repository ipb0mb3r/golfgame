// The round's cards (Phase 6, R4): the summary card between holes and the final scorecard.
// DOM only: it shows what core/round.js says. Works for a round of any length (owner rule, DESIGN §8):
// the scorecard lists the holes in groups of SCORECARD_GROUP (Front 9 / Back 9 / …), each with a
// subtotal, then the total. Every group is a small fixed-width table, so it fits a phone in portrait
// whatever the length; a long round just scrolls (the overlay card scrolls, H1).
import { SCORECARD_GROUP } from '../core/config.js';
import { resultText } from '../core/scoring.js';
import { toParText } from '../core/round.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// on = { next(), again(), menu() }
export function createRoundUi(on) {
  $('summaryBtn').addEventListener('click', () => on.next());
  $('cardAgainBtn').addEventListener('click', () => on.again());
  $('cardMenuBtn').addEventListener('click', () => on.menu());

  // Between holes: this hole's result, the running total, and the button to the next hole
  function showSummary(row, round) {
    const t = round.totals, last = row.number === round.length;
    $('summaryTitle').textContent = row.result;
    $('summaryText').textContent = row.pickedUp
      ? `You reached the ${row.strokes}-stroke limit on this par ${row.par}, so you picked up. It counts as ${row.strokes}.`
      : resultText(row.strokes, row.par);
    $('summaryPen').textContent = row.penalties ? `Includes ${row.penalties} penalty stroke${row.penalties > 1 ? 's' : ''}.` : '';
    $('summaryPen').hidden = !row.penalties;
    $('summaryRound').innerHTML = `<b>${esc(round.set.name)}</b>: ${toParText(t.toPar)} after ${t.played} of ${round.length} hole${round.length > 1 ? 's' : ''} · ${t.strokes} stroke${t.strokes === 1 ? '' : 's'}`;
    const next = last ? null : round.holeAt(row.number);
    $('summaryBtn').textContent = last ? 'See the scorecard' : `Next hole: Hole ${row.number + 1} · par ${next.par}`;
    $('summary').classList.remove('hidden');
    $('summaryBtn').focus({ preventScroll: true });
  }

  // The end of the round: every hole, in groups with subtotals, the total, and the personal best
  function showScorecard(round, best) {
    const t = round.totals, groups = round.groups(SCORECARD_GROUP), many = groups.length > 1;
    $('scoreSet').textContent = `${round.set.name} · ${round.length} hole${round.length > 1 ? 's' : ''}`;
    $('scoreGroups').innerHTML = groups.map(g => groupTable(g, many ? SCORECARD_GROUP : g.rows.length, many)).join('');
    $('scoreTotal').innerHTML = `Total <b>${t.strokes}</b> · par ${t.par} · <b>${toParText(t.toPar)}</b>`;
    const notes = [];
    if (t.pickedUp) notes.push(`<span class="pu">n</span> = picked up (${t.pickedUp} hole${t.pickedUp > 1 ? 's' : ''})`);
    if (t.penalties) notes.push(`${t.penalties} penalty stroke${t.penalties > 1 ? 's' : ''}`);
    $('scoreNotes').innerHTML = notes.join(' · ');
    $('scoreNotes').hidden = !notes.length;
    $('scoreBest').textContent = best.isNew
      ? (best.prev ? `New personal best! (was ${toParText(best.prev.toPar)})` : 'First round on this course: that\'s your personal best.')
      : `Personal best: ${toParText(best.prev.toPar)} (${best.prev.strokes} strokes)`;
    $('scoreBest').classList.toggle('new', !!best.isNew);
    $('scorecard').classList.remove('hidden');
    $('scorecard').scrollTop = 0;
    $('cardAgainBtn').focus({ preventScroll: true });
  }

  function hide() { $('summary').classList.add('hidden'); $('scorecard').classList.add('hidden'); }

  return { showSummary, showScorecard, hide };
}

// One group: hole numbers, par and score rows, and a subtotal column (or the total for a one-group
// round). `cols` = how many hole columns to draw: always a full group in a multi-group round, so
// every table lines up, with blank cells after the last hole.
function groupTable(g, cols, many) {
  const cells = [];
  for (let k = 0; k < cols; k++) cells.push(g.rows[k] ?? null);
  const td = (r, f) => (r ? f(r) : '<td class="blank"></td>');
  const score = r => {
    if (r.strokes == null) return '<td>–</td>';
    const cls = r.pickedUp ? 'pu' : r.toPar <= -2 ? 'eagle' : r.toPar === -1 ? 'birdie' : r.toPar === 0 ? 'par' : r.toPar === 1 ? 'bogey' : 'worse';
    return `<td><span class="${cls}" title="${esc(r.result)}">${r.strokes}</span></td>`;
  };
  return `<table class="sc"><caption>${esc(g.label)}</caption>
    <tr class="num"><th>Hole</th>${cells.map(r => td(r, r => `<td>${r.number}</td>`)).join('')}<th>${many ? 'Sub' : 'Tot'}</th></tr>
    <tr class="parRow"><th>Par</th>${cells.map(r => td(r, r => `<td>${r.par}</td>`)).join('')}<td class="sum">${g.par}</td></tr>
    <tr class="scoreRow"><th>Score</th>${cells.map(r => td(r, score)).join('')}<td class="sum">${g.played ? g.strokes : '–'}</td></tr>
    <tr class="toParRow"><th>±</th>${cells.map(r => td(r, r => `<td>${r.strokes == null ? '' : toParText(r.toPar)}</td>`)).join('')}<td class="sum">${g.played ? toParText(g.toPar) : ''}</td></tr>
  </table>`;
}

// R6: personal best per course in localStorage. Storage can be missing or throw (private mode,
// blocked site data), so every read and write is wrapped and the round works without it.
const bestKey = setId => `pocketlinks.best.v1.${setId}`;
export function readBest(setId) {
  try { const v = JSON.parse(localStorage.getItem(bestKey(setId)) ?? 'null'); return v && Number.isFinite(v.toPar) ? v : null; } catch { return null; }
}
export function writeBest(setId, best) {
  try { localStorage.setItem(bestKey(setId), JSON.stringify(best)); return true; } catch { return false; }
}
