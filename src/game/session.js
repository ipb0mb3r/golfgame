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
import { AIM_SPEED, AIM_SPEED_PUTT, TIMING, MPS_TO_MPH, TUNE, CAM } from '../core/config.js';
import { createHolePlay, aimMarkLabel } from '../core/play.js';
import { createMeter, resetMeter, pressMeterAt, tickMeterTo, swingClicks } from '../core/swing.js';
import { isSwinging, isAimingState, isBallMoving, isShotEnd } from '../core/states.js';
import { resultName, resultText } from '../core/scoring.js';
import { dist2D, dirFromAim } from '../core/vec.js';
import { paintCourse } from './coursePainter.js';
import { buildScene, disposeScene } from './scene.js';
import { createProps } from './props.js';
import { createCameraRig } from './camera.js';
import { createHud, createMinimap, setupHolePage, fitMinimap, yd } from './hud.js';
import { greenStyle } from '../core/menu.js';
import { nextView } from '../core/views.js';

// What the game waits before carrying out core's decision (play.next), in ms
const DELAY = { aim: TIMING.afterStop, returnToLast: TIMING.afterPenalty, holed: TIMING.afterHoled, pickedUp: TIMING.afterPickUp };

// opts = { renderer, input (from bindInput), seed, start (scenario start or null), info (extra debug lines),
//          round (Phase 6, or null): { number, of, onDone(finished) } — the hole's place in the round, and
//          what to call when the hole is over instead of showing the single-hole result card,
//          puttGrid (Phase 7 setting, core/menu.js PUTT_GRID), links (false: hide the intro card's ?hole= links,
//          for a hole started from the menu) }
export function createHoleSession(hole, { renderer, input, seed, start = null, info = () => [], round = null, puttGrid = 'hole', links = true }) {
  const play = createHolePlay(hole, { seed });
  const { terrain, cup, tee, ball, wind } = play;
  const meter = createMeter();

  const green = greenStyle(hole.scenery.paint.green, puttGrid);
  setupHolePage(hole, round, { links, green });
  // A new hole starts behind its intro card. In a round, holes 2+ get the compact hole card instead
  // (PM on PR #38): it closes by itself after TIMING.holeCard ms, or on a tap, so the round keeps its rhythm.
  const compact = !!round && round.number > 1;
  $intro().classList.toggle('hidden', compact);
  $holeCard().classList.toggle('hidden', !compact);
  const courseCanvas = paintCourse(hole, terrain.surfaceAt, { green });
  const { scene, camera, colliderOutlines } = buildScene(renderer, hole, terrain, courseCanvas, play.obstacles);
  const props = createProps(scene, hole, terrain, cup);
  const rig = createCameraRig(camera, terrain.heightAt);
  const hud = createHud(play);
  const drawMinimap = createMinimap(hole, courseCanvas, cup, play.obstacles);

  // Game state (core/states.js GAME_STATES): intro | aim | power | grace | nopower | accuracy | flight | roll | wait | holed | result
  let state = 'intro';
  // The hole's timers (what happens after a shot, the compact card closing). They stop while the
  // game is paused (M3) and carry on with the time they had left.
  let timers = [];
  let disposed = false, paused = false;
  function later(fn, ms) {
    const tm = { fn, due: performance.now() + ms, left: ms, id: 0 };
    const run = () => { timers = timers.filter(x => x !== tm); fn(); };
    tm.run = run;
    if (!paused) tm.id = setTimeout(run, ms);
    timers.push(tm);
  }
  const shown = { x: 0, y: 0, z: 0 }; // where the ball is drawn (differs from the ball only while it drops in the cup)
  let holedT = 0, t = 0, lastAimKey = '';
  let shotT = 0, skipShown = false; // X9: game time since the hit, and whether ⏩ Skip is showing
  let warn = null;     // K4: where the aimed shot would hit an obstacle (play.aimWarning), or null
  let treeFlash = false; // one obstacle flash per shot is enough (a ball can rattle through branches)
  const target = { x: 0, y: 0, z: 0 };
  let marks = null; // S22: play.aimMarks() while aiming a full shot (the marker, ticks and label)
  const markPt = camera.position.clone(); // reused for the label's screen position

  const updateHud = () => { hud.update(state, meter.power); $view().hidden = state !== 'aim'; measureFrame(); };
  // V2: the view button while aiming (null = the aiming view, else core/views.js VIEW_STEPS)
  let view = null, viewPress = null; // viewPress = { at, opened } while the button is held
  // V1: the free band of the screen the aiming view must fit in (core/views.js `frame`), measured from the HUD
  let camFrame = null;
  const putEnd = { x: 0, y: 0, z: 0 };
  function camMark() {
    if (!play.club.putter) return play.aimMarks();
    const d = dirFromAim(play.aim), len = Math.min(play.distToCup(), play.puttMax);
    putEnd.x = ball.pos.x + d.x * len; putEnd.z = ball.pos.z + d.z * len; putEnd.y = terrain.heightAt(putEnd.x, putEnd.z);
    return putEnd;
  }
  const camView = () => ({ state, ball: ball.pos, dir: dirFromAim(play.aim), putter: play.club.putter, isPutt: play.isPutt, shotDir: play.shotDir,
    mark: isAimingState(state) || state === 'intro' ? camMark() : null, cup, view, frame: camFrame || measureFrame() });

  // The part of the screen the 3D view really has (V1): from the lowest top panel that covers the
  // screen's centre column (portrait: the scorecard) down to the top of the meter panel.
  function measureFrame() {
    const W = window.innerWidth || 1, H = window.innerHeight || 1, cx = W / 2;
    let top = 0;
    for (const id of ['info', 'windBox', 'minimap', 'pauseBtn']) {
      const el = document.getElementById(id);
      if (!el || el.hidden) continue;
      const r = el.getBoundingClientRect();
      if (r.height && r.left < cx + CAM.bandProbe && r.right > cx - CAM.bandProbe) top = Math.max(top, r.bottom);
    }
    const b = document.getElementById('bottom')?.getBoundingClientRect();
    const bottom = b && b.height ? b.top : H;
    camFrame = { aspect: W / H, fov: camera.fov, top: Math.min(top / H, 0.5), bottom: Math.max(bottom / H, 0.5) };
    return camFrame;
  }
  function setView(v) {
    view = v;
    const b = $view();
    b.classList.toggle('on', !!v);
    b.textContent = viewLabel();
  }
  // What the button does next: open the first view, step to the next, or go back
  function viewLabel() {
    const nxt = nextView(view, play.club.putter);
    if (!nxt) return '↩ Back';
    return nxt === 'landing' ? '🔍 Landing' : nxt === 'above' ? '👁 Read' : '👁 Low';
  }
  // pointer down / up on the view button (or the V key: a tap). A tap opens a view (and steps through
  // a putt's two); holding it shows the view only until it is released.
  function onViewInput(down, at = performance.now()) {
    if (state !== 'aim') { viewPress = null; return; }
    if (down) {
      const opened = view === null;
      setView(nextView(view, play.club.putter));
      viewPress = { at, opened };
    } else if (viewPress) {
      if (viewPress.opened && at - viewPress.at > CAM.holdMs) setView(null);
      viewPress = null;
    }
  }

  function clearTimers() { timers.forEach(tm => clearTimeout(tm.id)); timers = []; }

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
    setView(null);
    updateHud();
    if (snapCamera) rig.snap(camView());
  }

  // The three-click swing (two clicks with the putter, S14). `at` = when the click happened (s, performance.now() clock, S16)
  function onSwingInput(at = performance.now() / 1000) {
    if (!isAimingState(state)) return;
    // The top of the meter is the lie's power cap for this club (S11); the putter's meter has no accuracy click (S14)
    if (state === 'aim') { input.releaseAim(); setView(null); viewPress = null; resetMeter(meter, play.lieOf().maxPower, swingClicks(play.club) === 2); }
    const result = pressMeterAt(meter, at);
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
    if (shot.label) hud.flash(shot.label); // a putt has no label (S14)
    state = shot.kind === 'putt' ? 'roll' : 'flight';
    shotT = 0; treeFlash = false;
    updateHud();
    return shot;
  }

  // Core events → what the player sees. When a shot ends, core has decided what's next (play.next).
  function onEvent(ev) {
    if (ev.type === 'lippedOut') { hud.flash('Lipped out!'); return; }
    // K2/K3: the trees and rocks
    if (ev.type === 'hitLeaves' || ev.type === 'hitObstacle') {
      if (!treeFlash) hud.flash(ev.type === 'hitLeaves' ? 'Into the trees!' : ev.kind === 'boulder' ? 'Off the rock!' : 'Off the tree!');
      treeFlash = true;
      return;
    }
    if (!isShotEnd(ev)) return;
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
    if (round) { round.onDone(f); return; } // the round shows its summary card (main.js, roundUi.js)
    hud.showResult(
      f.pickedUp ? 'Picked up' : resultName(f.strokes, hole.par),
      f.pickedUp ? `You reached the ${hole.maxStrokes}-stroke limit. Shake it off and try again!` : resultText(f.strokes, hole.par));
  }

  // X9: ⏩ Skip (the button, Space or Enter) about a second after the hit, while the ball flies or
  // rolls. Core runs the rest of the shot at once (play.skip: the same fixed steps, nothing drawn), and
  // its events go through onEvent exactly as if they had happened frame by frame, so holed, penalty
  // and picked-up flows play normally. Returns true when it skipped.
  const canSkip = () => isBallMoving(state) && shotT * 1000 >= TIMING.skipAfter;
  function skip() {
    if (!canSkip()) return false;
    for (const ev of play.skip()) onEvent(ev);
    props.setBall(ball.pos, false);
    hud.setDistance(state);
    showSkip(false);
    return true;
  }
  function showSkip(on) { if (on !== skipShown) { skipShown = on; $skip().hidden = !on; } }

  function changeClub(step) {
    if (state !== 'aim') return;
    const wasPutter = play.club.putter;
    play.setClub(play.clubIdx + step);
    if (play.club.putter !== wasPutter) setView(null); // the putter's views aren't a full shot's
    updateHud();
  }

  // One drawn frame. dt = game time (capped), now = this frame's real time in seconds (the meter's clock, S16)
  function frame(dt, now) {
    t += dt;
    // Compact card: start its countdown on the 2nd frame, when the 1st drawn frame (the hole) is showing
    if (cardFrames >= 0 && ++cardFrames === 2) { cardFrames = -1; if (state === 'intro') later(teeOff, TIMING.holeCard); }
    // Aiming
    if (state === 'aim') {
      const dir = input.aimDir();
      if (dir) play.setAim(play.aim + dir * dt * (play.club.putter ? AIM_SPEED_PUTT : AIM_SPEED));
    }
    // Swing meter
    if (isSwinging(state)) {
      const result = tickMeterTo(meter, now);
      if (meter.event === 'max') hud.flash('MAX!', 'Click now for full power');
      if (meter.event) { state = meter.phase; updateHud(); }
      if (result) endSwing(result);
    }
    // Ball physics
    if (isBallMoving(state)) shotT += dt;
    showSkip(canSkip());
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
      warn = play.shotWarning(); // K4 (memoized in core: only works it out again when the aim or club changes)
      marks = play.aimMarks(); // S22 (memoized in core too); null for a putt
      if (marks) { Object.assign(target, { x: marks.x, y: marks.y, z: marks.z }); len = dist2D(ball.pos, target); }
      props.setAimGuide(true, ball.pos, d, len, target, play.club.putter, warn, marks);
      // Keep the slope readout and club distance in step with the aim
      const key = play.aim.toFixed(3) + play.clubIdx;
      if (key !== lastAimKey) { lastAimKey = key; updateHud(); }
    } else { warn = null; marks = null; props.setAimGuide(false); }

    props.animateFlag(t, wind);
    hud.updateMeter(state, meter.value, meter.power);
    rig.update(camView(), dt);
    drawMinimap(ball.pos, isAim ? target : null, warn, marks);
    aimLabel();
  }

  // S22: the label at the aim marker ("164 yd · Flat"), placed on the screen where the marker is drawn
  function aimLabel() {
    if (!marks) { hud.setAimLabel(null); return; }
    camera.updateMatrixWorld();
    const v = markPt.set(marks.x, terrain.heightAt(marks.x, marks.z) + 0.1, marks.z).project(camera);
    const onScreen = v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1;
    hud.setAimLabel(onScreen ? aimMarkLabel(marks) : null, (v.x + 1) / 2, (1 - v.y) / 2, marks.capped, !!warn, !!marks.hazard);
  }

  // K5: wireframe outlines of the colliders (the debug overlay turns them on)
  function showColliders(on) { colliderOutlines.visible = !!on; }

  function resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); fitMinimap(); measureFrame(); }

  function debugText(fps) {
    const p = ball.pos, v = ball.vel, g = terrain.gradAt(p.x, p.z), s = play.slope();
    const f = (n, k = 2) => n.toFixed(k);
    return [
      `hole   ${hole.id}${round ? ` (${round.number}/${round.of})` : ''}  seed ${seed}${start?.id ? `  scenario ${start.id}` : ''}`,
      `state  ${state}  (ball ${ball.phase}${play.next ? `, next ${play.next}` : ''})`,
      `stroke ${play.strokes}  club ${play.club.name}  aim ${play.targetKind} ${f(play.targetDist(), 0)} m`,
      `pos    ${f(p.x)} ${f(p.y)} ${f(p.z)}`,
      `speed  ${f(Math.hypot(v.x, v.y, v.z))} m/s`,
      `surf   ${terrain.surfaceAt(p.x, p.z)}  (lie ${play.lie})`,
      `slope  ${f(Math.hypot(g.x, g.z) * 100, 1)}%  along ${f(s.along, 1)}%  side ${f(s.side, 1)}%`,
      `wind   ${f(wind.x)} ${f(wind.z)} m/s (${f(Math.hypot(wind.x, wind.z) * MPS_TO_MPH, 0)} mph)`,
      `wet    ${hole.weather?.wetness ?? 0} (${hole.weather?.type ?? 'clear'})`,
      ...(play.obstacles.length ? [`obst   ${play.obstacles.length}  warn ${warn ? `${warn.kind} #${warn.index} at ${f(warn.dist, 0)} m` : 'none'}${colliderOutlines.visible ? '  (outlines on)' : ''}`] : []),
      `meter  ${meter.phase}  value ${f(meter.value, 3)}  power ${f(meter.power, 3)}`,
      `render dpr ${f(renderer.getPixelRatio(), 2)} (cap ${TUNE.DPR_CAP})  aa ${TUNE.ANTIALIAS >= 0.5 ? 'on' : 'off'}`,
      ...info(),
      `fps    ${f(fps, 0)}`,
    ].join('\n');
  }

  // Tee off: leave the intro (or compact hole card). Only once: a tap and the card's own timer can both ask.
  // The wind shown behind the card is the wind you play (PM Phase 7: hole 1's card showed one wind and
  // Tee off re-rolled it). The hole still resets here as before, so the seeded random numbers after
  // tee off (lip-outs, leaves) are the same as before this fix and the v1 baseline (shot #9, a slice
  // into the trees) doesn't move; only the wind is put back to the one on the card.
  function teeOff() {
    if (state !== 'intro' || disposed || paused) return false;
    $intro().classList.add('hidden'); $holeCard().classList.add('hidden');
    const cardWind = { x: wind.x, y: wind.y, z: wind.z };
    resetGame();
    Object.assign(wind, cardWind);
    updateHud();
    return true;
  }

  // Pause (M3). A swing in progress is cancelled with no stroke (the meter runs on real time, so it
  // can't be frozen fairly); the timers stop and keep the time they had left. main.js stops sending
  // frames and input while paused.
  function pause() {
    if (paused || disposed) return;
    paused = true;
    input.releaseAll();
    if (isSwinging(state)) { state = 'aim'; resetMeter(meter); updateHud(); }
    const now = performance.now();
    for (const tm of timers) { clearTimeout(tm.id); tm.left = Math.max(0, tm.due - now); }
  }
  function resume() {
    if (!paused || disposed) return;
    paused = false;
    const now = performance.now();
    for (const tm of timers) { tm.due = now + tm.left; tm.id = setTimeout(tm.run, tm.left); }
  }

  // Free everything this hole made. The session can't be used afterwards.
  function dispose() {
    if (disposed) return;
    disposed = true;
    clearTimers();
    $holeCard().classList.add('hidden');
    showSkip(false);
    $view().hidden = true; $view().classList.remove('on');
    hud.dispose();
    disposeScene(scene);
  }

  // Start behind the tee looking down the hole, with the intro card on top
  play.reset(start); readyForShot(true); state = 'intro'; updateHud();
  // The compact card's countdown starts only once the hole is on screen (owner, PR #40): building a hole
  // can take a moment on a phone, and that time must not eat into the 2.5 s. See frame().
  let cardFrames = compact ? 0 : -1;

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
    skip, get canSkip() { return canSkip(); },
    get view() { return view; }, viewTap() { onViewInput(true); onViewInput(false); return view; },
    get camFrame() { return camFrame; }, cameraAt() { return { pos: camera.position.clone(), fov: camera.fov, aspect: camera.aspect }; },
    get warn() { return warn; }, get collidersShown() { return colliderOutlines.visible; },
  };

  return {
    hole, play, scene, camera, test,
    get state() { return state; },
    get disposed() { return disposed; },
    canAim: () => state === 'aim',
    get paused() { return paused; },
    get timerCount() { return timers.length; },
    onSwingInput, onViewInput, changeClub, skip, frame, resize, debugText, dispose, showColliders, pause, resume,
    start: teeOff,
    again: () => { if (!round) resetGame(); }, // in a round a hole is never replayed (the result card isn't shown)
  };
}

const $intro = () => document.getElementById('intro');
const $holeCard = () => document.getElementById('holeCard');
const $skip = () => document.getElementById('skipBtn');
const $view = () => document.getElementById('viewBtn');
