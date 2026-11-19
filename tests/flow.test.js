// Gate A A1 + A8: the hole flow is decided in core (play.next / play.proceed / play.finished), and
// play.swing() is the only way to hit the ball. A3: state predicates in one place.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testHole, scriptedSwing } from './helpers.js';
import { createHolePlay } from '../src/core/play.js';
import { getHole } from '../src/holes/sets.js';
import { METER_PHASES, SWING_PHASES, GAME_STATES, isSwinging, isAimingState, isAimView, isBallMoving, isFlyover } from '../src/core/states.js';
import { createMeter, pressMeter, tickMeter } from '../src/core/swing.js';

// Play until the shot ends; returns the events
function runShot(play, dt = 1 / 60) {
  const events = [];
  for (let i = 0; i < 1e6 && play.ball.moving; i++) events.push(...play.advance(dt));
  return events;
}

// A flat hole with a penalty strip at -30 > z > -40 (water), the cup at z = -60
const strip = (kind = 'water') => testHole({
  cup: { x: 0, z: -60 }, maxStrokes: 6,
  surfaceAt: (x, z) => (z < -30 && z > -40 ? kind : 'fairway'),
});

test('A1: stopped → next is "aim", proceed() prepares the next shot from where the ball stopped', () => {
  const play = createHolePlay(strip(), { seed: 1 });
  play.reset(); play.setClub(play.bag.findIndex(c => c.id === 'pw'));
  play.swing({ power: 0.1, acc: 0, outcome: 'normal' });
  const evs = runShot(play);
  assert.equal(evs.at(-1).type, 'stopped');
  assert.equal(play.next, 'aim');
  assert.equal(play.canSwing, false, 'no shot before proceed()');
  assert.equal(play.swing({ power: 1, acc: 0 }), null);
  const at = { ...play.ball.pos };
  assert.equal(play.proceed(), 'aim');
  assert.equal(play.next, null);
  assert.ok(play.canSwing);
  assert.deepEqual([play.ball.pos.x, play.ball.pos.z], [at.x, at.z]);
  assert.equal(play.finished, null);
});

test('A1: a penalty on the 2nd shot goes back to where the 2nd shot was hit, not the tee', () => {
  const play = createHolePlay(strip(), { seed: 1 });
  play.reset(); play.setAim(0);
  play.ball.pos.z = -10; play.prepare(); play.setAim(0); play.setClub(play.bag.findIndex(c => c.id === 'pw'));
  play.strokes = 1;
  const from = { x: play.ball.pos.x, z: play.ball.pos.z };
  play.swing({ power: 0.25, acc: 0, outcome: 'normal' }); // carries ~26 m: into the strip
  assert.equal(runShot(play).at(-1).type, 'penalty');
  assert.equal(play.strokes, 3, 'stroke + penalty');
  assert.equal(play.next, 'returnToLast');
  play.proceed();
  assert.deepEqual([play.ball.pos.x, play.ball.pos.z], [from.x, from.z]);
  assert.ok(play.canSwing);
});

test('A1: the stroke limit ends the hole as "picked up", after a stop and after a penalty', () => {
  for (const [kind, power] of [['fairway', 0.1], ['water', 0.25]]) {
    const play = createHolePlay(strip(kind === 'water' ? 'water' : 'fairway'), { seed: 1 });
    play.reset(); play.ball.pos.z = -10; play.prepare(); play.setAim(0); play.setClub(play.bag.findIndex(c => c.id === 'pw'));
    play.strokes = kind === 'water' ? 4 : 5; // the next shot (+ penalty) reaches maxStrokes = 6
    play.swing({ power, acc: 0, outcome: 'normal' });
    runShot(play);
    assert.equal(play.strokes, 6, kind);
    assert.equal(play.next, 'pickedUp', kind);
    assert.deepEqual(play.finished, { holed: false, pickedUp: true, strokes: 6, penalties: kind === 'water' ? 1 : 0, par: 4 }, kind);
    assert.equal(play.proceed(), 'pickedUp');
    assert.equal(play.canSwing, false, 'the hole is over');
    assert.equal(play.swing({ power: 1, acc: 0 }), null);
  }
});

test('A1: holed on the last allowed stroke counts as holed, not picked up', () => {
  const play = createHolePlay(testHole({ cup: { x: 0, z: -3 }, maxStrokes: 3 }), { seed: 1 });
  play.reset(); play.strokes = 2;
  assert.ok(play.club.putter);
  play.swing({ power: 0.6, acc: 0, outcome: 'normal' }); // 3.6 m putt range: rolls over the cup slowly
  assert.equal(runShot(play).at(-1).type, 'holed');
  assert.equal(play.next, 'holed');
  assert.deepEqual(play.finished, { holed: true, pickedUp: false, strokes: 3, penalties: 0, par: 4 });
  play.reset();
  assert.equal(play.finished, null, 'reset starts the hole again');
  assert.ok(play.canSwing);
});

test('A8: a cancelled swing costs no stroke and changes nothing; the shot can still be played', () => {
  const play = createHolePlay(strip(), { seed: 1 });
  play.reset();
  const { result } = scriptedSwing([]); // start click only
  assert.equal(result.outcome, 'cancel');
  assert.equal(play.swing(result), null);
  assert.equal(play.swing(null), null);
  assert.equal(play.strokes, 0);
  assert.ok(play.canSwing && !play.ball.moving);
});

test('A8: nothing hits the ball while it moves; setClub clamps, setAim ignores junk', () => {
  const play = createHolePlay(strip(), { seed: 1 });
  play.reset();
  assert.ok(play.swing({ power: 0.5, acc: 0, outcome: 'normal' }));
  assert.equal(play.swing({ power: 1, acc: 0 }), null, 'ball in the air');
  assert.equal(play.strokes, 1);
  assert.equal(play.setClub(99), play.PUTTER);
  assert.equal(play.setClub(-4), 0);
  const a = play.aim;
  assert.equal(play.setAim(NaN), a);
  assert.equal(play.setAim(0.3), 0.3);
});

// A full hole headless, with the same loop the game uses (swing → advance → proceed)
function playHole(hole, swingFor, seed = 5) {
  const play = createHolePlay(hole, { seed });
  play.reset(); play.wind.x = play.wind.z = 0;
  for (let n = 0; n < 40 && !play.finished; n++) {
    assert.ok(play.swing(swingFor(play)), `shot ${n + 1} was hit`);
    runShot(play);
    play.proceed();
  }
  return play;
}
// Aim at the pin with the ⚑ power: a straight shot every time
const perfect = play => ({ power: Math.min(play.pinPower(), play.lieOf().maxPower), acc: 0, outcome: 'normal' });

test('A1: tee → holed on both real holes, and a simulated 2-hole round adds up (DESIGN §8)', () => {
  let total = 0, par = 0;
  for (const id of ['pl-01', 'pl-02']) {
    const play = playHole(getHole(id), perfect);
    assert.ok(play.finished, `${id} finished`);
    assert.ok(play.finished.holed || play.finished.pickedUp, id);
    assert.ok(play.finished.strokes >= 1 && play.finished.strokes <= getHole(id).maxStrokes, id);
    total += play.finished.strokes; par += play.finished.par;
  }
  assert.equal(par, 8);
  assert.ok(total >= 2 && total <= 22);
});

test('A1: tee → picked up when every shot is a tiny topped dribble', () => {
  const hole = getHole('pl-01');
  const play = playHole(hole, () => ({ power: 0.02, acc: 0, outcome: 'topped' }));
  assert.deepEqual(play.finished, { holed: false, pickedUp: true, strokes: hole.maxStrokes, penalties: 0, par: hole.par });
});

// A3
test('A3: every meter phase the swing can reach is listed, and each is "swinging" or aim/done', () => {
  const seen = new Set();
  const scripts = [[0.5, 1.5], [1.05, 2], [1.4], [1.4, 1.8], [0.4], []];
  for (const clicks of scripts) {
    const m = createMeter(), times = [0, ...clicks];
    seen.add(m.phase);
    let k = 0;
    for (let t = 0; t <= 4 && m.phase !== 'done'; t += 1 / 240) {
      while (k < times.length && times[k] <= t) { pressMeter(m); k++; seen.add(m.phase); }
      if (m.phase === 'done') break;
      tickMeter(m, 1 / 240); seen.add(m.phase);
    }
  }
  assert.deepEqual([...seen].sort(), [...METER_PHASES].sort(), 'the scripts reach every listed phase');
  for (const ph of METER_PHASES) assert.ok(isSwinging(ph) !== (ph === 'aim' || ph === 'done'), ph);
  assert.deepEqual(METER_PHASES.filter(isSwinging), [...SWING_PHASES]);
});

// S14: a putt (2 clicks) reaches every listed phase except 'accuracy', and each script ends
test('A3 / S14: a 2-click putt meter reaches only listed phases, never accuracy', () => {
  const seen = new Set();
  const scripts = [[0.5], [1.05], [1.4], [0.5, 0.9], []];
  for (const clicks of scripts) {
    const m = createMeter(1, true), times = [0, ...clicks];
    seen.add(m.phase);
    let k = 0;
    for (let t = 0; t <= 4 && m.phase !== 'done'; t += 1 / 240) {
      while (k < times.length && times[k] <= t) { pressMeter(m); k++; seen.add(m.phase); }
      if (m.phase === 'done') break;
      tickMeter(m, 1 / 240); seen.add(m.phase);
    }
    assert.equal(m.phase, 'done', `script [${clicks}] ends`);
  }
  assert.deepEqual([...seen].sort(), METER_PHASES.filter(ph => ph !== 'accuracy').sort());
});

test('A3: game-state predicates (used by the HUD, camera and input) cover every state once', () => {
  for (const ph of SWING_PHASES) assert.ok(GAME_STATES.includes(ph), `${ph} is a game state`);
  for (const s of GAME_STATES) {
    // every state is exactly one of: aim view (intro/aim/swing), the flyover (Phase V), ball moving, or the after-shot states
    const kinds = [isAimView(s), isFlyover(s), isBallMoving(s), ['wait', 'holed', 'result'].includes(s)].filter(Boolean).length;
    assert.equal(kinds, 1, s);
  }
  assert.ok(isAimingState('grace') && isAimingState('nopower') && isAimView('nopower'), 'S8 phases are aiming (the camera missed them before)');
  assert.ok(!isAimingState('intro') && isAimView('intro'));
});
