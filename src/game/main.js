// The app: what lives for the whole visit (renderer, input listeners, debug overlay, menus, frame loop).
// Each hole is a disposable session (session.js, Gate A A2); the app forwards input and frames to it.
// Phase 7: the page opens on the main menu (menus.js): Solo plays a course as a round (Phase 6:
// summary card between holes, final scorecard), Practice plays one hole or a test spot. The pause
// menu (button or Esc) resumes, restarts the hole or quits to the menu.
// Dev and designer links skip the menu (core/menu.js DEV_PARAMS): ?set=<id> plays a round, ?hole=<id>
// or ?scenario=<id> one hole (X8), ?tune=NAME:value overrides tunables, ?seed=<n> fixes the wind,
// ?debug=1 opens the debug overlay (Gate A C5, for phones; ?debug=perf without the collider outlines, AP0). Any of them alone plays hole 1 as before.
// Phase T: vs AI (Play → vs AI → course → difficulty) plays a round against 5 rivals; ?ai=easy|normal|hard
// plays the ?set= round (or the first Solo course) vs AI.
import * as THREE from 'three';
import { applyTune, tuneSummary } from '../core/tune.js';
import { MAX_FRAME_DT } from '../core/config.js';
import { HOLES, SETS, resolveHole, getHole, resolveSet, readyHole } from '../holes/sets.js';
import { createRound, isNewBest, toParText, bestId } from '../core/round.js';
import { resolveDifficulty, DEFAULT_DIFFICULTY } from '../core/rivals.js';
import { SCENARIOS, resolveScenario } from '../holes/scenarios.js';
import { parseSeed } from '../core/rng.js';
import { skipsMenu, PLAY_PARAMS, soloCourses } from '../core/menu.js';
import { createRenderer } from './scene.js';
import { bindInput, nowSeconds } from './input.js';
import { createDebug } from './debug.js';
import { createPerfMeter } from './perf.js';
import { createHoleSession } from './session.js';
import { createRoundUi, readBest, writeBest } from './roundUi.js';
import { createMenus } from './menus.js';
import { loadSettings, saveSettings } from './settings.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
// ?tune= first, before anything reads the tunables (only whitelisted names, numbers, clamped)
const tune = applyTune(params.get('tune'));
// ?seed=<n> (0 included) replays the same wind (a round: the same winds, R7); otherwise each game gets a new one
const paramSeed = () => parseSeed(params.get('seed'));
const freshSeed = () => paramSeed() ?? (Date.now() >>> 0);
const settings = loadSettings();

// What a dev link asks for (the pre-Phase 7 behaviour), and the notices it needs on the first card
function launchFromUrl() {
  const notices = [];
  const requestedScenario = params.get('scenario');
  const { scenario, unknown: unknownScenario } = resolveScenario(requestedScenario);
  const requestedHole = params.get('hole');
  const { hole, unknown: unknownHole } = scenario ? { hole: getHole(scenario.hole), unknown: false } : resolveHole(requestedHole);
  // A round (Phase 6) from ?set=<id>, only when no single hole or scenario is asked for (those stay single-hole)
  const requestedSet = params.get('set');
  // Phase T: ?ai=<difficulty> plays the round vs AI (the first Solo course when no ?set= is given)
  const requestedAi = params.get('ai');
  const single = !!(scenario || requestedHole);
  const aiDifficulty = requestedAi == null || single ? null : resolveDifficulty(requestedAi) ?? DEFAULT_DIFFICULTY;
  const set = single ? null : resolveSet(requestedSet) ?? (aiDifficulty && !requestedSet ? resolveSet(soloCourses(SETS, HOLES)[0].id) : null);
  const unknownSet = !!requestedSet && !set && !single;
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
  if (requestedAi != null && single) notices.push('?ai= plays a round, so it is ignored with ?hole= or ?scenario=.');
  else if (requestedAi != null && !resolveDifficulty(requestedAi) && set) notices.push(`There is no difficulty "${requestedAi}", so the rivals play on Normal.`);
  if (tune.rejected.length) {
    console.warn('Pocket Links: ignored tune values', tune.rejected);
    notices.push(`Ignored in ?tune=: ${tune.rejected.map(r => `"${r.text}" (${r.why})`).join(', ')}.`);
  }
  const launch = set ? { kind: 'round', setId: set.id, ...(aiDifficulty ? { mode: 'ai', difficulty: aiDifficulty } : {}) } : scenario ? { kind: 'scenario', scenarioId: scenario.id } : { kind: 'hole', holeId: hole.id };
  return { launch, notices };
}
if (tune.set.length) { const b = $('tuned'); b.textContent = `TUNED · ${tuneSummary(tune)}`; b.hidden = false; }

// Gate A C2: no WebGL → a plain message on the intro card instead of a dead Tee off button
const canvas = $('game');
let renderer;
try { renderer = createRenderer(canvas); } catch (e) {
  window.__golfFail?.("Your browser can't show 3D graphics (WebGL is off or not supported), so the game can't start. Try another browser, or turn on hardware acceleration in the browser settings.", e);
  throw e;
}
// AP0: fps, draw calls, triangles and memory against the phone budget (debug overlay, __golf.perf())
const perf = createPerfMeter(renderer, () => session && { scene: session.scene, camera: session.camera });
const debug = createDebug($('debug'), perf);
// AP0: ?debug=perf opens the overlay without the collider outlines (K5), so fps and draw calls are
// the game's own (the owner's phone check); ?debug=1 as before
const perfOnly = params.get('debug') === 'perf';
const debugParam = params.get('debug') === '1' || perfOnly;
const outlinesOn = () => debug.visible && !perfOnly;

// The game being played: null in the menus. `game` = { launch, hole, seed, start, fromMenu } for a
// single hole (restart replays it), and `round` for a round.
let session = null, round = null, game = null;
// V4: the holes whose flyover has played in this game (a round, or one hole and its restarts)
const flown = new Set();
// V3 (PM on #63): the flight views of this game, so "not too many in a row" counts across the round
const flightHistory = [];
let paused = false;
const extraInfo = () => [
  ...(round?.mode === 'ai' ? [`vs AI  ${round.difficulty}  ${round.leaderboard().map(r => `${r.posText} ${r.id} ${toParText(r.toPar)}`).join(' · ')}`] : []),
  ...(round ? [`round  ${round.set.id}  hole ${Math.min(round.index + 1, round.length)}/${round.length}  round seed ${round.seed}  ${toParText(round.totals.toPar)} (${round.totals.strokes})`] : []),
  ...(tune.set.length ? [`tuned  ${tuneSummary(tune)}`] : []),
];
function loadHole(h, opts = {}) {
  session?.dispose();
  // X12: holes are built and checked on first use, so only the holes played are paid for
  session = createHoleSession(readyHole(h), {
    renderer, input, seed: opts.seed, start: opts.start ?? null, info: extraInfo, round: opts.round ?? null,
    puttGrid: settings.puttGrid, links: !game?.fromMenu,
    // V4: the flyover plays the first time a hole starts from its tee in this game (not from a scenario's spot)
    flyover: settings.flyover && !opts.start && !flown.has(h.id), classicCam: settings.flightCam === 'classic', flightHistory,
  });
  if (!opts.start) flown.add(h.id);
  perf.resetPeak();
  session.showColliders(outlinesOn()); // K5: collider outlines show while the debug overlay is open
  resize();
  return session;
}

// While a menu or the pause menu is open, the game gets no input (the keys work the menu)
const active = () => !!session && !paused && !menus.visible;
const input = bindInput(canvas, {
  active,
  swing: t => session.onSwingInput(t),
  skip: () => session.skip(),
  view: (down, at) => session.onViewInput(down, at),
  impactPress: (dx, dy, r, at) => session.onImpactPress(dx, dy, r, at), // BC5: the ball icon
  impactDrag: (dx, dy, r) => session.onImpactDrag(dx, dy, r),
  impactStep: (dx, dy) => session.onImpactStep(dx, dy),
  club: step => session.changeClub(step),
  canAim: () => active() && session.canAim(),
  start: () => !!session && session.start(),
  again: () => session?.again(),
  toggleDebug: () => { debug.toggle(); session.showColliders(outlinesOn()); },
  pause: () => pauseGame(),
  escape,
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
// Starting and ending a game (Phase 7). Every start goes through endGame() first, so nothing from the
// last game (session, round, timers, cards, pause) is left over (M6).
// =====================================================================
// launch = core/menu.js: { kind: 'round', setId } | { kind: 'hole', holeId } | { kind: 'scenario', scenarioId }
// opts = { fromMenu, notices: [] (start-up notices for the first card) }
function startGame(launch, { fromMenu = true, notices = [] } = {}) {
  endGame();
  flown.clear(); // V4: a new game shows each hole's flyover again
  flightHistory.length = 0; // V3: and the flight-view rules start over
  menus.hide();
  game = { launch, fromMenu };
  debug.show(settings.debug || debugParam);
  const n = $('notice');
  if (launch.kind === 'scenario') {
    const sc = resolveScenario(launch.scenarioId).scenario;
    notices = [...notices, `Test spot: ${sc.name}. ${sc.text}`];
    // A scenario restarts from this seed on every try: first load, Restart and "Play again" (F1)
    const seed = paramSeed() ?? sc.seed;
    Object.assign(game, { hole: getHole(sc.hole), seed, start: { ...sc, seed } });
  } else if (launch.kind === 'hole') {
    Object.assign(game, { hole: getHole(launch.holeId), seed: freshSeed(), start: null });
  }
  n.textContent = notices.join(' '); n.hidden = !notices.length; n.className = 'notice';
  if (launch.kind === 'round') startRound(resolveSet(launch.setId), freshSeed(), launch);
  else loadHole(game.hole, { seed: game.seed, start: game.start });
}

// Back to a clean page: no hole, no round, no cards, no pause
function endGame() {
  session?.dispose();
  session = null; round = null; game = null;
  setPaused(false);
  roundUi.hide();
  for (const id of ['intro', 'result', 'holeCard']) $(id).classList.add('hidden');
  $('notice').hidden = true;
  $('pauseBtn').hidden = true;
}

function toMenu(screen = 'main') {
  endGame();
  debug.show(false);
  // A dev link that named what to play is dropped from the address, so a reload shows the menu too
  // (?tune=, ?seed=, ?debug= stay: they belong to the whole visit)
  if (PLAY_PARAMS.some(k => params.has(k))) {
    for (const k of PLAY_PARAMS) params.delete(k);
    const q = params.toString();
    history.replaceState(null, '', location.pathname + (q ? `?${q}` : '') + location.hash);
  }
  menus.show(screen);
}

// =====================================================================
// Pause menu (M3): Resume, Restart hole, Quit to menu (a round asks first)
// =====================================================================
const canPause = () => !!session && !paused && !menus.visible && session.state !== 'result';
function setPaused(on) {
  paused = on;
  $('pause').classList.toggle('hidden', !on);
  $('pauseMain').hidden = false; $('quitConfirm').hidden = true;
}
function pauseGame() {
  if (!canPause()) return;
  session.pause();
  setPaused(true);
  $('pauseSub').textContent = round ? `${round.set.name}${round.mode === 'ai' ? ' vs AI' : ''} · Hole ${round.current.number} of ${round.length}` : `Practice · Hole ${session.hole.number}`;
  $('resumeBtn').focus({ preventScroll: true });
}
function resumeGame() {
  if (!paused) return;
  setPaused(false);
  session?.resume();
}
// Restart hole: the same hole again from the tee (or the test spot), with the same wind. In a round
// the hole's score isn't recorded yet (pause is closed once the hole is over), so it just starts over.
function restartHole() {
  if (!session) return;
  setPaused(false);
  if (round) loadRoundHole();
  else loadHole(game.hole, { seed: game.seed, start: game.start });
}
function quitGame(confirmed = false) {
  if (round && !confirmed) {
    $('pauseMain').hidden = true; $('quitConfirm').hidden = false;
    $('quitText').textContent = `Quit this round? Your ${round.totals.played ? `score after ${round.totals.played} hole${round.totals.played > 1 ? 's' : ''}` : 'round'} will be lost.`;
    $('quitNoBtn').focus({ preventScroll: true });
    return;
  }
  toMenu();
}
$('resumeBtn').addEventListener('click', resumeGame);
$('restartBtn').addEventListener('click', restartHole);
$('quitBtn').addEventListener('click', () => quitGame());
$('quitYesBtn').addEventListener('click', () => quitGame(true));
$('quitNoBtn').addEventListener('click', () => { $('quitConfirm').hidden = true; $('pauseMain').hidden = false; $('resumeBtn').focus({ preventScroll: true }); });
$('introMenuBtn').addEventListener('click', () => (round ? (pauseGame(), quitGame()) : toMenu()));
$('resultMenuBtn').addEventListener('click', () => toMenu());

// Esc: back out of whatever is open (quit question → pause menu → game; menu → the screen before)
function escape() {
  if (paused) { if (!$('quitConfirm').hidden) $('quitNoBtn').click(); else resumeGame(); return; }
  if (menus.visible) { menus.back(); return; }
  pauseGame();
}

// =====================================================================
// Rounds (Phase 6, DESIGN §8). A course of any length; each hole is a fresh session in this page (A2).
// =====================================================================
const roundUi = createRoundUi({ next: nextHole, again: playAgain, menu: () => toMenu() });

// launch.mode 'ai' (Phase T): the same round against the rivals at launch.difficulty
function startRound(set, roundSeed, { mode = 'solo', difficulty = DEFAULT_DIFFICULTY } = {}) {
  round = createRound(set, { seed: roundSeed, getHole, mode, difficulty });
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
  // Personal best per course and mode (Phase T: vs AI has its own)
  const set = round.set, t = round.totals, id = bestId(set.id, round.mode), prev = readBest(id), isNew = isNewBest(prev, t);
  if (isNew) writeBest(id, { strokes: t.strokes, toPar: t.toPar, seed: round.seed, date: new Date().toISOString().slice(0, 10) });
  roundUi.showScorecard(round, { prev, isNew });
}
// Play again: a brand-new round from hole 1 (nothing carries over: scorecard, strokes, timers, wind, ball)
function playAgain() {
  if (!round) return;
  const set = round.set, g = game, opts = { mode: round.mode, difficulty: round.difficulty ?? DEFAULT_DIFFICULTY };
  endGame();
  flown.clear(); // V4: once per hole per round, and this is a new round
  flightHistory.length = 0;
  game = g;
  startRound(set, freshSeed(), opts);
}

const menus = createMenus({
  sets: SETS, holes: HOLES, scenarios: SCENARIOS, readBest: (setId, mode) => readBest(bestId(setId, mode)), settings,
  onLaunch: l => startGame(l, { fromMenu: true }),
  onSettings: s => saveSettings(s),
});

if (skipsMenu(params)) {
  const { launch, notices } = launchFromUrl();
  startGame(launch, { fromMenu: false, notices });
} else {
  $('intro').classList.add('hidden');
  menus.show('main');
}

// =====================================================================
// Main loop: physics in fixed 1/240 s steps (core/play.js advance), drawing every frame
// =====================================================================
const clock = new THREE.Clock();
function frame() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, MAX_FRAME_DT);        // game time (capped so a hiccup can't teleport the ball)
  // The meter runs on real time (S16): this frame's time, on the same clock as the input events' timeStamp.
  // Paused (M3): nothing moves, the hole is still drawn under the pause menu. In the menus: no hole at all.
  if (session) {
    if (!paused) session.frame(dt, nowSeconds());
    debug.frame(rawDt, session.debugText);
    const showPause = canPause() && session.state !== 'intro';
    if ($('pauseBtn').hidden === showPause) $('pauseBtn').hidden = !showPause;
    renderSession();
    perf.frame(rawDt);
  }
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
  get scenario() { return game?.launch.kind === 'scenario' ? game.launch.scenarioId : null; }, tune: tune.set,
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
  // Phase BC (BC5): the impact point (the ball icon shows it on the next frame)
  get impact() { return api().play.impact; }, setImpact: pt => api().play.setImpact(pt), get marks() { return api().play.aimMarks(); },
  // Phase V: the view button (V2) and the camera
  get flight() { return api().flight; }, get flightHistory() { return api().flightHistory; }, get flyover() { return api().flyover; },
  get view() { return api().view; }, viewTap: () => api().viewTap(), get camFrame() { return api().camFrame; }, cameraAt: () => api().cameraAt(),
  // A2: unload the current hole and load another one in place (tools/session-check.mjs); renderer
  // memory as Three.js counts it (geometries, textures, shader programs)
  loadHole: (id, seedOverride) => { loadHole(getHole(id), { seed: seedOverride ?? game?.seed }); return session.hole.id; },
  // Phase 6: the round (null when playing a single hole)
  get round() { return round && { set: round.set.id, seed: round.seed, index: round.index, length: round.length, done: round.done, cards: round.cards.map(r => ({ ...r })), totals: round.totals, holeSeed: round.current?.seed ?? null,
    // Phase T: vs AI (null in solo)
    mode: round.mode, difficulty: round.difficulty, rivals: round.rivals?.map(r => ({ id: r.id, name: r.name, skill: r.skill, strokes: [...r.strokes] })) ?? null,
    leaderboard: round.leaderboard() }; },
  nextHole: () => nextHole(),
  playAgain: () => playAgain(),
  renderInfo: () => ({ ...renderer.info.memory, programs: renderer.info.programs?.length ?? 0 }),
  // AP0 (tools/perf-check.mjs): fps, draw calls, triangles, memory and their rating against
  // PERF_BUDGET; perfBreakdown() = draw calls by kind of object in the current view (for AP1)
  perf: () => perf.numbers(), perfBreakdown: () => perf.breakdown(), perfResetPeak: () => perf.resetPeak(),
  // Phase 7 (M6, tools/menu-check.mjs): the menus and the pause menu
  app: {
    get menu() { return menus.visible ? menus.screen : null; },
    get playing() { return !!session; }, get paused() { return paused; },
    get timers() { return session?.timerCount ?? 0; }, get debugOpen() { return debug.visible; },
    get game() { return game && { ...game.launch }; },
    start: l => startGame(l), pause: pauseGame, resume: resumeGame, restart: restartHole, quit: quitGame, toMenu,
    settings,
  },
};
