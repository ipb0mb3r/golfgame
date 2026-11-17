// The app: what lives for the whole visit (renderer, input listeners, debug overlay, frame loop).
// Each hole is a disposable session (session.js, Gate A A2); the app forwards input and frames to it.
// ?set=<id> plays a round (Phase 6: the holes of that set in order, summary card between holes, final
// scorecard); otherwise one hole from ?hole=<id> (default pl-01). Rules live in core; the game layer only shows them.
// Designer links (X8): ?scenario=<id> starts at a named spot, ?tune=NAME:value overrides tunables,
// ?debug=1 opens the debug overlay (Gate A C5, for phones).
import * as THREE from 'three';
import { applyTune, tuneSummary } from '../core/tune.js';
import { MAX_FRAME_DT } from '../core/config.js';
import { resolveHole, getHole, resolveSet } from '../holes/sets.js';
import { createRound, isNewBest, toParText } from '../core/round.js';
import { resolveScenario } from '../holes/scenarios.js';
import { parseSeed } from '../core/rng.js';
import { createRenderer } from './scene.js';
import { bindInput, nowSeconds } from './input.js';
import { createDebug } from './debug.js';
import { createHoleSession } from './session.js';
import { createRoundUi, readBest, writeBest } from './roundUi.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
// ?tune= first, before anything reads the tunables (only whitelisted names, numbers, clamped)
const tune = applyTune(params.get('tune'));
const requestedScenario = params.get('scenario');
const { scenario, unknown: unknownScenario } = resolveScenario(requestedScenario);
const requestedHole = params.get('hole');
const { hole, unknown: unknownHole } = scenario ? { hole: getHole(scenario.hole), unknown: false } : resolveHole(requestedHole);
// A round (Phase 6) from ?set=<id>, only when no single hole or scenario is asked for (those stay single-hole)
const requestedSet = params.get('set');
const set = scenario || requestedHole ? null : resolveSet(requestedSet);
const unknownSet = !!requestedSet && !set && !scenario && !requestedHole;
// The seed drives wind and lip-outs. ?seed=<n> (0 included) replays the same wind; a scenario has its
// own fixed seed; otherwise it changes each visit. In a round this is the round seed (R7): each hole's
// seed comes from it (core/round.js holeSeed), so the same ?seed= replays the same winds.
const seed = parseSeed(params.get('seed')) ?? scenario?.seed ?? (Date.now() >>> 0);
// A scenario restarts from this seed on every try: first load, intro card and "Play again" (F1)
const start = scenario ? { ...scenario, seed } : null;

const notices = [];
if (unknownHole) {
  console.warn(`Pocket Links: unknown hole "${requestedHole}", playing ${hole.id} instead.`);
  notices.push(`There is no hole "${requestedHole}", so you're playing Hole ${hole.number}.`);
}
if (unknownScenario) {
  console.warn(`Pocket Links: unknown scenario "${requestedScenario}".`);
  notices.push(`There is no scenario "${requestedScenario}", so you're starting from the tee.`);
}
if (unknownSet) {
  console.warn(`Pocket Links: unknown hole set "${requestedSet}".`);
  notices.push(`There is no course "${requestedSet}", so you're playing Hole ${hole.number} on its own.`);
}
if (scenario) notices.push(`Test spot: ${scenario.name}. ${scenario.text}`);
if (tune.rejected.length) {
  console.warn('Pocket Links: ignored tune values', tune.rejected);
  notices.push(`Ignored in ?tune=: ${tune.rejected.map(r => `"${r.text}" (${r.why})`).join(', ')}.`);
}
if (notices.length) { const n = $('notice'); n.textContent = notices.join(' '); n.hidden = false; }
if (tune.set.length) { const b = $('tuned'); b.textContent = `TUNED · ${tuneSummary(tune)}`; b.hidden = false; }

// Gate A C2: no WebGL → a plain message on the intro card instead of a dead Tee off button
const canvas = $('game');
let renderer;
try { renderer = createRenderer(canvas); } catch (e) {
  window.__golfFail?.("Your browser can't show 3D graphics (WebGL is off or not supported), so the game can't start. Try another browser, or turn on hardware acceleration in the browser settings.", e);
  throw e;
}
const debug = createDebug($('debug'));
if (params.get('debug') === '1') debug.toggle(); // the collider outlines (K5) follow it, see loadHole

// The current hole. Input and frames always go to whichever session is current.
let session = null;
const extraInfo = () => [
  ...(round ? [`round  ${round.set.id}  hole ${Math.min(round.index + 1, round.length)}/${round.length}  round seed ${round.seed}  ${toParText(round.totals.toPar)} (${round.totals.strokes})`] : []),
  ...(tune.set.length ? [`tuned  ${tuneSummary(tune)}`] : []),
];
function loadHole(h, opts = {}) {
  session?.dispose();
  session = createHoleSession(h, { renderer, input, seed: opts.seed ?? seed, start: opts.start ?? null, info: extraInfo, round: opts.round ?? null });
  session.showColliders(debug.visible); // K5: collider outlines show while the debug overlay is open
  resize();
  return session;
}

const input = bindInput(canvas, {
  swing: t => session.onSwingInput(t),
  skip: () => session.skip(),
  club: step => session.changeClub(step),
  canAim: () => session.canAim(),
  start: () => session.start(),
  again: () => session.again(),
  toggleDebug: () => { debug.toggle(); session.showColliders(debug.visible); },
});

// Gate A C6: on iOS Safari the visible area changes with the browser bars and after a rotation
// without a window resize, so listen to the visual viewport too.
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  session?.resize(w, h);
}
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);

// =====================================================================
// Rounds (Phase 6, DESIGN §8). A course of any length; each hole is a fresh session in this page (A2).
// =====================================================================
let round = null;
const roundUi = createRoundUi({ next: nextHole, again: playAgain, menu: () => location.reload() });
// ?seed= fixes the round seed (the same winds every time); otherwise each new round gets a new one
const newRoundSeed = () => parseSeed(params.get('seed')) ?? (Date.now() >>> 0);

function startRound(roundSeed) {
  round = createRound(set, { seed: roundSeed, getHole });
  loadRoundHole();
}
function loadRoundHole() {
  const c = round.current;
  roundUi.hide();
  if (c.index > 0) $('notice').hidden = true; // start-up notices belong to the first hole
  loadHole(c.hole, { seed: c.seed, round: { number: c.number, of: c.of, onDone: holeDone } });
}
// The hole is over (play.finished): score it and show the summary card
function holeDone(finished) {
  const row = round.record(finished);
  roundUi.showSummary(row, round);
}
// The summary card's button: the next hole, or the final scorecard after the last one
function nextHole() {
  if (!round || round.cards.length <= round.index) return;
  if (round.advance()) { loadRoundHole(); return; }
  $('summary').classList.add('hidden');
  const t = round.totals, prev = readBest(set.id), isNew = isNewBest(prev, t);
  if (isNew) writeBest(set.id, { strokes: t.strokes, toPar: t.toPar, seed: round.seed, date: new Date().toISOString().slice(0, 10) });
  roundUi.showScorecard(round, { prev, isNew });
}
// Play again: a brand-new round from hole 1 (nothing carries over: scorecard, strokes, timers, wind, ball)
function playAgain() { startRound(newRoundSeed()); }

if (set) startRound(seed);
else loadHole(hole, { start });

// =====================================================================
// Main loop: physics in fixed 1/240 s steps (core/play.js advance), drawing every frame
// =====================================================================
const clock = new THREE.Clock();
function frame() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, MAX_FRAME_DT);        // game time (capped so a hiccup can't teleport the ball)
  // The meter runs on real time (S16): this frame's time, on the same clock as the input events' timeStamp
  session.frame(dt, nowSeconds());
  debug.frame(rawDt, session.debugText);
  renderSession();
  requestAnimationFrame(frame);
}
// (tools/baseline.mjs replaces this one line to skip drawing)
const renderSession = () => { renderer.render(session.scene, session.camera); };
requestAnimationFrame(frame);
window.__golfStarted = true; // the boot check in index.html stays quiet from here on (Gate A C2)

// Handy for testing in the browser console and for tools/. Forwards to the current hole session.
const api = () => session.test;
window.__golf = {
  get hole() { return api().hole; }, get play() { return api().play; }, get meter() { return api().meter; },
  scenario: scenario?.id ?? null, tune: tune.set,
  get state() { return api().state; }, get ball() { return api().play.ball.pos; }, get strokes() { return api().play.strokes; },
  get clubIdx() { return api().play.clubIdx; }, set clubIdx(v) { api().play.setClub(v); },
  get aim() { return api().play.aim; }, set aim(v) { api().play.setAim(v); },
  get wind() { return api().wind; }, swing: () => session.onSwingInput(),
  surfaceAt: (x, z) => api().surfaceAt(x, z), heightAt: (x, z) => api().heightAt(x, z), gradAt: (x, z) => api().gradAt(x, z),
  get HOLE() { return api().HOLE; }, get WATER_Y() { return api().WATER_Y; }, slopeText: () => api().slopeText(),
  place: (x, z) => api().place(x, z),
  testHit: (pw, acc = 0, outcome = 'normal') => api().testHit(pw, acc, outcome),
  skip: () => api().skip(), get canSkip() { return api().canSkip; },
  get warn() { return api().warn; }, get collidersShown() { return api().collidersShown; },
  // A2: unload the current hole and load another one in place (tools/session-check.mjs); renderer
  // memory as Three.js counts it (geometries, textures, shader programs)
  loadHole: (id, seedOverride) => { loadHole(getHole(id), { seed: seedOverride }); return session.hole.id; },
  // Phase 6: the round (null when playing a single hole)
  get round() { return round && { set: round.set.id, seed: round.seed, index: round.index, length: round.length, done: round.done, cards: round.cards.map(r => ({ ...r })), totals: round.totals, holeSeed: round.current?.seed ?? null }; },
  nextHole: () => nextHole(),
  playAgain: () => playAgain(),
  renderInfo: () => ({ ...renderer.info.memory, programs: renderer.info.programs?.length ?? 0 }),
};
