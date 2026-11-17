// One hole, from load to dispose (Gate A A2). Everything that belongs to a hole lives here: the core
// play state, the meter, the Three.js scene, props, camera rig, HUD bindings, minimap and timers.
// dispose() frees all of it (GPU geometries, materials, textures, timers), so a round or a menu can
// load hole after hole without a page reload and nothing from the previous hole fires on the next.
//
// The app (main.js) owns what lives for the whole visit: the renderer, the input listeners, the
// debug overlay and the frame loop. It forwards input and frames to the current session.
//
// The rules are in core: play.swing() hits the ball, play.next says what happens after a shot,
// play.proceed() does it. This file only maps that to delays, flash text and the camera.
import { AIM_SPEED, AIM_SPEED_PUTT, TIMING, MPS_TO_MPH, TUNE } from '../core/config.js';
import { createHolePlay } from '../core/play.js';
import { createMeter, resetMeter, pressMeter, tickMeter } from '../core/swing.js';
import { isSwinging, isAimingState, isBallMoving } from '../core/states.js';
import { resultName, resultText } from '../core/scoring.js';
import { dist2D, dirFromAim } from '../core/vec.js';
import { paintCourse } from './coursePainter.js';
import { buildScene, disposeScene } from './scene.js';
import { createProps } from './props.js';
import { createCameraRig } from './camera.js';
import { createHud, createMinimap, setupHolePage, yd } from './hud.js';

// What the game waits before carrying out core's decision (play.next), in ms
const DELAY = { aim: TIMING.afterStop, returnToLast: TIMING.afterPenalty, holed: TIMING.afterHoled, pickedUp: TIMING.afterPickUp };

// opts = { renderer, input (from bindInput), seed, start (scenario start or null), info (extra debug lines) }
export function createHoleSession(hole, { renderer, input, seed, start = null, info = () => [] }) {
  const play = createHolePlay(hole, { seed });
  const { terrain, cup, tee, ball, wind } = play;
  const meter = createMeter();

  setupHolePage(hole, tee, cup);
  $intro().classList.remove('hidden'); // a new hole starts behind its intro card
  const courseCanvas = paintCourse(hole, terrain.surfaceAt);
  const { scene, camera } = buildScene(renderer, hole, terrain, courseCanvas);
  const props = createProps(scene, hole, terrain, cup);
  const rig = createCameraRig(camera, terrain.heightAt);
  const hud = createHud(play);
  const drawMinimap = createMinimap(hole, courseCanvas, cup);

  // Game state (core/states.js GAME_STATES): intro | aim | power | grace | nopower | accuracy | flight | roll | wait | holed | result
  let state = 'intro';
  let timers = [];
  let disposed = false;
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const shown = { x: 0, y: 0, z: 0 }; // where the ball is drawn (differs from the ball only while it drops in the cup)
  let holedT = 0, t = 0, lastAimKey = '';
  const target = { x: 0, y: 0, z: 0 };

  const updateHud = () => hud.update(state, meter.power);
  const camView = () => ({ state, ball: ball.pos, dir: dirFromAim(play.aim), putter: play.club.putter, isPutt: play.isPutt, shotDir: play.shotDir });

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function resetGame() {
    clearTimers();
    play.reset(start);
    hud.hideResult();
    readyForShot(true);
  }

  // The ball is ready (play.prepare() has run): back to aiming
  function readyForShot(snapCamera = false) {
    state = 'aim';
    resetMeter(meter);
    props.resetTrail();
    updateHud();
    if (snapCamera) rig.snap(camView());
  }

  // The three-click swing
  function onSwingInput() {
    if (!isAimingState(state)) return;
    // The top of the meter is the lie's power cap for this club (S11)
    if (state === 'aim') { input.releaseAim(); meter.cap = play.lieOf().maxPower; }
    const result = pressMeter(meter);
    if (result) endSwing(result);
    else state = meter.phase;
    updateHud();
  }

  // The meter finished a swing (DESIGN §3 "Missed clicks"). play.swing() hits it, or returns null for
  // a cancelled swing: back to aim, no stroke.
  function endSwing(result) {
    meter.power = result.power;
    const shot = play.swing(result);
    if (!shot) {
      if (result.outcome === 'cancel') hud.flash('Swing cancelled', 'No stroke counted');
      state = 'aim'; resetMeter(meter); updateHud();
      return null;
    }
    hud.flash(shot.label);
    state = shot.kind === 'putt' ? 'roll' : 'flight';
    updateHud();
    return shot;
  }

  // Core events → what the player sees. When a shot ends, core has decided what's next (play.next).
  function onEvent(ev) {
    if (ev.type === 'lippedOut') { hud.flash('Lipped out!'); return; }
    if (!play.next) return;
    const next = play.next;
    if (next === 'holed') {
      state = 'holed'; holedT = 0;
      Object.assign(shown, ball.pos);
      hud.flash(play.strokes === 1 ? 'HOLE IN ONE!' : 'In the hole!');
    } else {
      state = 'wait';
      if (ev.type === 'penalty') hud.flash(ev.surface === 'water' ? 'Splash!' : 'Out of bounds!', '+1 penalty stroke');
      else if (next === 'aim') hud.flash(play.surfaces[ev.surface].name, `${yd(play.distToCup())} yd to the pin`);
    }
    later(() => {
      const done = play.proceed();
      if (done === 'aim') readyForShot();
      else if (done === 'returnToLast') readyForShot(true);
      else showResult();
    }, ev.type === 'penalty' ? TIMING.afterPenalty : DELAY[next]);
  }

  function showResult() {
    const f = play.finished;
    state = 'result';
    hud.showResult(
      f.pickedUp ? 'Picked up' : resultName(f.strokes, hole.par),
      f.pickedUp ? `You reached the ${hole.maxStrokes}-stroke limit. Shake it off and try again!` : resultText(f.strokes, hole.par));
  }

  function changeClub(step) {
    if (state !== 'aim') return;
    play.setClub(play.clubIdx + step);
    updateHud();
  }

  // One drawn frame. dt = game time (capped), meterDt = real time for the meter (capped)
  function frame(dt, meterDt) {
    t += dt;
    // Aiming
    if (state === 'aim') {
      const dir = input.aimDir();
      if (dir) play.setAim(play.aim + dir * dt * (play.club.putter ? AIM_SPEED_PUTT : AIM_SPEED));
    }
    // Swing meter
    if (isSwinging(state)) {
      const result = tickMeter(meter, meterDt);
      if (meter.event === 'max') hud.flash('MAX!', 'Click now for full power');
      if (meter.event) { state = meter.phase; updateHud(); }
      if (result) endSwing(result);
    }
    // Ball physics
    if (isBallMoving(state)) {
      for (const ev of play.advance(dt)) onEvent(ev);
      if (state === 'flight' && ball.phase === 'roll') state = 'roll';
      if (state === 'flight') props.addTrail(ball.pos);
      hud.setDistance(state);
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
    const isAim = isAimingState(state);
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
  }

  function resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); }

  function debugText(fps) {
    const p = ball.pos, v = ball.vel, g = terrain.gradAt(p.x, p.z), s = play.slope();
    const f = (n, k = 2) => n.toFixed(k);
    return [
      `hole   ${hole.id}  seed ${seed}${start?.id ? `  scenario ${start.id}` : ''}`,
      `state  ${state}  (ball ${ball.phase}${play.next ? `, next ${play.next}` : ''})`,
      `stroke ${play.strokes}  club ${play.club.name}`,
      `pos    ${f(p.x)} ${f(p.y)} ${f(p.z)}`,
      `speed  ${f(Math.hypot(v.x, v.y, v.z))} m/s`,
      `surf   ${terrain.surfaceAt(p.x, p.z)}  (lie ${play.lie})`,
      `slope  ${f(Math.hypot(g.x, g.z) * 100, 1)}%  along ${f(s.along, 1)}%  side ${f(s.side, 1)}%`,
      `wind   ${f(wind.x)} ${f(wind.z)} m/s (${f(Math.hypot(wind.x, wind.z) * MPS_TO_MPH, 0)} mph)`,
      `wet    ${hole.weather?.wetness ?? 0} (${hole.weather?.type ?? 'clear'})`,
      `meter  ${meter.phase}  value ${f(meter.value, 3)}  power ${f(meter.power, 3)}`,
      `render dpr ${f(renderer.getPixelRatio(), 2)} (cap ${TUNE.DPR_CAP})  aa ${TUNE.ANTIALIAS >= 0.5 ? 'on' : 'off'}`,
      ...info(),
      `fps    ${f(fps, 0)}`,
    ].join('\n');
  }

  // Free everything this hole made. The session can't be used afterwards.
  function dispose() {
    if (disposed) return;
    disposed = true;
    clearTimers();
    hud.dispose();
    disposeScene(scene);
  }

  // Start behind the tee looking down the hole, with the intro card on top
  play.reset(start); readyForShot(true); state = 'intro'; updateHud();

  // Handy for testing in the browser console and for tools/ (window.__golf forwards to this)
  const windHandle = {
    get x() { return wind.x; }, get y() { return wind.y; }, get z() { return wind.z; },
    set(x, y, z) { wind.x = x; wind.y = y; wind.z = z; updateHud(); return windHandle; },
  };
  const test = {
    hole: hole.id, play, meter, wind: windHandle,
    get state() { return state; },
    surfaceAt: terrain.surfaceAt, heightAt: terrain.heightAt, gradAt: terrain.gradAt,
    HOLE: cup, WATER_Y: hole.features.waterY, slopeText: hud.slopeText,
    place(x, z) { clearTimers(); ball.pos.x = x; ball.pos.z = z; play.prepare(); readyForShot(true); },
    // Hit straight away as if the meter gave this result (skips the meter, same path as a real swing)
    testHit(power, acc = 0, outcome = 'normal') { if (state !== 'aim') return null; return endSwing({ power, acc, outcome }); },
  };

  return {
    hole, play, scene, camera, test,
    get state() { return state; },
    get disposed() { return disposed; },
    canAim: () => state === 'aim',
    onSwingInput, changeClub, frame, resize, debugText, dispose,
    start: () => { $intro().classList.add('hidden'); resetGame(); },
    again: resetGame,
  };
}

const $intro = () => document.getElementById('intro');
