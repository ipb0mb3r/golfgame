// Boot and game loop. Loads the hole from ?hole=<id> (default pl-01), wires the pure core
// (src/core) to the Three.js / DOM layer. Rules live in core; this file only reacts to them.
// Designer links (X8): ?scenario=<id> starts at a named spot, ?tune=NAME:value overrides tunables.
import * as THREE from 'three';
import { applyTune, tuneSummary } from '../core/tune.js';
import { MAX_FRAME_DT, MAX_METER_DT, AIM_SPEED, AIM_SPEED_PUTT, TIMING, MPS_TO_MPH } from '../core/config.js';
import { createHolePlay } from '../core/play.js';
import { createMeter, resetMeter, pressMeter, tickMeter, isSwinging } from '../core/swing.js';
import { resultName, resultText } from '../core/scoring.js';
import { dist2D, dirFromAim } from '../core/vec.js';
import { resolveHole, getHole } from '../holes/sets.js';
import { resolveScenario } from '../holes/scenarios.js';
import { parseSeed } from '../core/rng.js';
import { paintCourse } from './coursePainter.js';
import { createRenderer, buildScene } from './scene.js';
import { createProps } from './props.js';
import { createCameraRig } from './camera.js';
import { createHud, createMinimap, setupHolePage, yd } from './hud.js';
import { bindInput } from './input.js';
import { createDebug } from './debug.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
// ?tune= first, before anything reads the tunables (only whitelisted names, numbers, clamped)
const tune = applyTune(params.get('tune'));
const requestedScenario = params.get('scenario');
const { scenario, unknown: unknownScenario } = resolveScenario(requestedScenario);
const requestedHole = params.get('hole');
const { hole, unknown: unknownHole } = scenario ? { hole: getHole(scenario.hole), unknown: false } : resolveHole(requestedHole);
// The seed drives wind and lip-outs. ?seed=<n> (0 included) replays the same wind; a scenario has its
// own fixed seed; otherwise it changes each visit.
const seed = parseSeed(params.get('seed')) ?? scenario?.seed ?? (Date.now() >>> 0);

const play = createHolePlay(hole, { seed });
const { terrain, cup, tee, ball, wind } = play;
const meter = createMeter();

setupHolePage(hole, tee, cup);
const notices = [];
if (unknownHole) {
  console.warn(`Pocket Links: unknown hole "${requestedHole}", playing ${hole.id} instead.`);
  notices.push(`There is no hole "${requestedHole}", so you're playing Hole ${hole.number}.`);
}
if (unknownScenario) {
  console.warn(`Pocket Links: unknown scenario "${requestedScenario}".`);
  notices.push(`There is no scenario "${requestedScenario}", so you're starting from the tee.`);
}
if (scenario) notices.push(`Test spot: ${scenario.name}. ${scenario.text}`);
if (tune.rejected.length) {
  console.warn('Pocket Links: ignored tune values', tune.rejected);
  notices.push(`Ignored in ?tune=: ${tune.rejected.map(r => `"${r.text}" (${r.why})`).join(', ')}.`);
}
if (notices.length) { const n = $('notice'); n.textContent = notices.join(' '); n.hidden = false; }
if (tune.set.length) { const b = $('tuned'); b.textContent = `TUNED · ${tuneSummary(tune)}`; b.hidden = false; }
const courseCanvas = paintCourse(hole, terrain.surfaceAt);
const canvas = $('game');
const renderer = createRenderer(canvas);
const { scene, camera } = buildScene(renderer, hole, terrain, courseCanvas);
const props = createProps(scene, hole, terrain, cup);
const rig = createCameraRig(camera, terrain.heightAt);
const hud = createHud(play);
const drawMinimap = createMinimap(hole, courseCanvas, cup);
const debug = createDebug($('debug'));

// =====================================================================
// Game state: intro | aim | power | accuracy | flight | roll | wait | holed | result
// =====================================================================
let state = 'intro';
let timers = [];
const later = (fn, ms) => timers.push(setTimeout(fn, ms));
const aiming = () => state === 'aim' || isSwinging(state);
const shown = { x: 0, y: 0, z: 0 }; // where the ball is drawn (differs from the ball only while it drops in the cup)
let holedT = 0;

const updateHud = () => hud.update(state, meter.power);
const camView = () => ({ state, ball: ball.pos, dir: dirFromAim(play.aim), putter: play.club.putter, isPutt: play.isPutt, shotDir: play.shotDir });

function resetGame() {
  timers.forEach(clearTimeout); timers = [];
  play.reset(scenario);
  hud.hideResult();
  prepareShot(true);
}

function prepareShot(snapCamera = false) {
  play.prepare();
  state = 'aim';
  resetMeter(meter);
  props.resetTrail();
  updateHud();
  if (snapCamera) rig.snap(camView());
}

// The three-click swing
function onSwingInput() {
  if (!aiming()) return;
  if (state === 'aim') input.releaseAim();
  const result = pressMeter(meter);
  if (result) endSwing(result);
  else state = meter.phase;
  updateHud();
}

// The meter finished a swing (DESIGN §3 "Missed clicks"): hit, or a cancelled swing goes back to aim with no stroke.
function endSwing(result) {
  if (result.outcome === 'cancel') {
    hud.flash('Swing cancelled', 'No stroke counted');
    state = 'aim'; resetMeter(meter); updateHud();
    return;
  }
  hit(result.power, result.acc, result.outcome);
}

function hit(power, acc, outcome = 'normal') {
  meter.power = power;
  const shot = play.hit(power, acc, outcome);
  hud.flash(shot.label);
  state = shot.kind === 'putt' ? 'roll' : 'flight';
  updateHud();
}

// Core events → what the player sees
function onEvent(ev) {
  if (ev.type === 'lippedOut') hud.flash('Lipped out!');
  else if (ev.type === 'holed') holed();
  else if (ev.type === 'stopped') stopped(ev.surface);
  else if (ev.type === 'penalty') penalty(ev.surface);
}

function stopped(surface) {
  state = 'wait';
  if (play.pickedUp) { later(() => showResult(true), TIMING.afterPickUp); return; }
  hud.flash(play.surfaces[surface].name, `${yd(play.distToCup())} yd to the pin`);
  later(() => prepareShot(), TIMING.afterStop);
}

function penalty(surface) {
  state = 'wait';
  hud.flash(surface === 'water' ? 'Splash!' : 'Out of bounds!', '+1 penalty stroke');
  later(() => {
    if (play.pickedUp) return showResult(true);
    play.returnToLastPos(); prepareShot(true);
  }, TIMING.afterPenalty);
}

function holed() {
  state = 'holed'; holedT = 0;
  Object.assign(shown, ball.pos);
  hud.flash(play.strokes === 1 ? 'HOLE IN ONE!' : 'In the hole!');
  later(() => showResult(false), TIMING.afterHoled);
}

function showResult(pickedUp) {
  state = 'result';
  hud.showResult(
    pickedUp ? 'Picked up' : resultName(play.strokes, hole.par),
    pickedUp ? `You reached the ${hole.maxStrokes}-stroke limit. Shake it off and try again!` : resultText(play.strokes, hole.par));
}

function changeClub(step) {
  if (state !== 'aim') return;
  play.clubIdx = Math.min(Math.max(play.clubIdx + step, 0), play.PUTTER);
  updateHud();
}

const input = bindInput(canvas, {
  swing: onSwingInput,
  club: changeClub,
  canAim: () => state === 'aim',
  start: () => { $('intro').classList.add('hidden'); resetGame(); },
  again: resetGame,
  toggleDebug: () => debug.toggle(),
});

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// =====================================================================
// Main loop: physics in fixed 1/240 s steps (core/play.js advance), drawing every frame
// =====================================================================
const clock = new THREE.Clock();
let t = 0, lastAimKey = '';
const target = { x: 0, y: 0, z: 0 };

function frame() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, MAX_FRAME_DT);        // game time (capped so a hiccup can't teleport the ball)
  const meterDt = Math.min(rawDt, MAX_METER_DT);   // the meter follows real time so slow devices don't make it easier
  t += dt;

  // Aiming
  if (state === 'aim') {
    const dir = input.aimDir();
    if (dir) play.aim += dir * dt * (play.club.putter ? AIM_SPEED_PUTT : AIM_SPEED);
  }
  // Swing meter
  if (isSwinging(state)) {
    const result = tickMeter(meter, meterDt);
    if (meter.event === 'max') hud.flash('MAX!', 'Click now for full power');
    if (meter.event) { state = meter.phase; updateHud(); }
    if (result) endSwing(result);
  }
  // Ball physics
  if (state === 'flight' || state === 'roll') {
    for (const ev of play.advance(dt)) onEvent(ev);
    if (state === 'flight' && ball.phase === 'roll') state = 'roll';
    if (state === 'flight') props.addTrail(ball.pos);
    $('distTxt').textContent = hud.distText(state);
  }
  // Holed: the ball drops into the cup
  if (state === 'holed' || state === 'result') {
    holedT += dt;
    shown.x += (cup.x - shown.x) * Math.min(1, dt * 10);
    shown.z += (cup.z - shown.z) * Math.min(1, dt * 10);
    shown.y = cup.y - Math.min(0.3, holedT * 1.2);
    props.setBall(shown, true);
  } else props.setBall(ball.pos, false);

  // Aim guide
  const isAim = aiming();
  if (isAim) {
    const d = dirFromAim(play.aim);
    let len;
    if (play.club.putter) { len = Math.min(play.distToCup(), play.puttMax); Object.assign(target, { x: ball.pos.x + d.x * len, y: 0, z: ball.pos.z + d.z * len }); }
    else { Object.assign(target, play.landingPoint(play.clubIdx)); len = dist2D(ball.pos, target); }
    props.setAimGuide(true, ball.pos, d, len, target, play.club.putter);
    // Keep the slope readout and club distance in step with the aim
    const key = play.aim.toFixed(3) + play.clubIdx;
    if (key !== lastAimKey) { lastAimKey = key; updateHud(); }
  } else props.setAimGuide(false);

  props.animateFlag(t, wind);
  hud.updateMeter(state, meter.value, meter.power);
  rig.update(camView(), dt);
  drawMinimap(ball.pos, isAim ? target : null);
  debug.frame(rawDt, debugText);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function debugText(fps) {
  const p = ball.pos, v = ball.vel, g = terrain.gradAt(p.x, p.z), s = play.slope();
  const f = (n, k = 2) => n.toFixed(k);
  return [
    `hole   ${hole.id}  seed ${seed}${scenario ? `  scenario ${scenario.id}` : ''}`,
    `state  ${state}  (ball ${ball.phase})`,
    `stroke ${play.strokes}  club ${play.club.name}`,
    `pos    ${f(p.x)} ${f(p.y)} ${f(p.z)}`,
    `speed  ${f(Math.hypot(v.x, v.y, v.z))} m/s`,
    `surf   ${terrain.surfaceAt(p.x, p.z)}  (lie ${play.lie})`,
    `slope  ${f(Math.hypot(g.x, g.z) * 100, 1)}%  along ${f(s.along, 1)}%  side ${f(s.side, 1)}%`,
    `wind   ${f(wind.x)} ${f(wind.z)} m/s (${f(Math.hypot(wind.x, wind.z) * MPS_TO_MPH, 0)} mph)`,
    `wet    ${hole.weather?.wetness ?? 0} (${hole.weather?.type ?? 'clear'})`,
    `meter  ${meter.phase}  value ${f(meter.value, 3)}  power ${f(meter.power, 3)}`,
    ...(tune.set.length ? [`tuned  ${tuneSummary(tune)}`] : []),
    `fps    ${f(fps, 0)}`,
  ].join('\n');
}

// Start behind the tee looking down the hole, with the intro card on top
play.reset(scenario); prepareShot(true); state = 'intro'; updateHud();
requestAnimationFrame(frame);

// Handy for testing in the browser console and for tools/baseline.mjs
const windHandle = {
  get x() { return wind.x; }, get y() { return wind.y; }, get z() { return wind.z; },
  set(x, y, z) { wind.x = x; wind.y = y; wind.z = z; updateHud(); return windHandle; },
};
window.__golf = {
  hole: hole.id, play, meter, scenario: scenario?.id ?? null, tune: tune.set,
  get state() { return state; }, get ball() { return ball.pos; }, get strokes() { return play.strokes; },
  get clubIdx() { return play.clubIdx; }, set clubIdx(v) { play.clubIdx = v; },
  get aim() { return play.aim; }, set aim(v) { play.aim = v; },
  wind: windHandle, swing: onSwingInput,
  surfaceAt: terrain.surfaceAt, heightAt: terrain.heightAt, gradAt: terrain.gradAt,
  HOLE: cup, WATER_Y: hole.features.waterY, slopeText: hud.slopeText,
  place(x, z) { ball.pos.x = x; ball.pos.z = z; prepareShot(true); },
  testHit(pw, acc = 0, outcome = 'normal') { if (state !== 'aim') return; hit(pw, acc, outcome); },
};
