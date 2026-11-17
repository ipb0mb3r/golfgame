// S12: the ⚑ mark is honest on flat ground, uphill and downhill. It uses the same landing simulation
// as the aim ring (hills and the lie cap included), so at the ⚑ power with no wind and a straight
// shot, the ball finishes near the pin. Since S18 the ⚑ is for the default aim point (the green
// centre for an approach on a real hole, the pin on these test slopes), so "near the pin" here is
// "near the default aim point": `play.target`.
// S15: the ⚑ simulates the whole shot to where the ball comes to rest (play.restPoint), so long clubs'
// run-out is included (before, it aimed the landing at 95% and a 3 Wood ran 7–11 m past, QA G2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testHole } from './helpers.js';
import { createHolePlay } from '../src/core/play.js';
import { getHole } from '../src/holes/sets.js';
import { SCENARIOS } from '../src/holes/scenarios.js';
import { dist2D } from '../src/core/vec.js';

const NEAR_PIN = 2; // m

function fromScenario(id, clubId) {
  const s = SCENARIOS[id];
  const play = createHolePlay(getHole(s.hole), { seed: s.seed });
  play.reset({ ...s, wind: { x: 0, z: 0 } });
  if (clubId) play.clubIdx = play.bag.findIndex(c => c.id === clubId);
  return play;
}
// A straight fairway 100 m long with a constant slope (rise per meter toward the cup)
function onSlope(rise, dist = 100) {
  const play = createHolePlay(testHole({ heightAt: (x, z) => -z * rise, surfaceAt: () => 'fairway', cup: { x: 0, z: -dist } }), { seed: 1 });
  play.reset();
  return play;
}
// Hit at the ⚑ power, straight, and say where the ball finished
function atPin(play) {
  const power = play.pinPower(), cap = play.lieOf().maxPower;
  assert.ok(power <= cap, `the ⚑ (${power.toFixed(3)}) is within the cap (${cap})`);
  const land = play.landingPoint(play.clubIdx, play.aim, power);
  const shot = play.hit(power, 0);
  assert.equal(shot.err, 0, 'straight');
  const ev = play.simulate();
  return { power, ev, miss: dist2D(play.ball.pos, play.target), land };
}

test('flat: at the ⚑ power the ball finishes near the pin', () => {
  for (const [name, play] of [['100 m fairway', onSlope(0)], ['hole 1 tee', fromScenarioless('pl-01')]]) {
    const r = atPin(play);
    assert.ok(r.miss <= NEAR_PIN, `${name}: ${r.miss.toFixed(2)} m from the pin`);
  }
});

test('uphill: hole 2 cross bunker up to the raised green (QA F3)', () => {
  // S15: the 9 Iron needs a little over the 50% bunker cap to FINISH on the raised green
  // (it stops quickly up there), so this uses the 7 Iron
  const play = fromScenario('h2-cross-bunker', '7i');
  assert.ok(play.cup.y - play.ball.pos.y > 3, 'the green is more than 3 m higher');
  const r = atPin(play);
  assert.ok(r.miss <= NEAR_PIN, `${r.miss.toFixed(2)} m from the pin (was 9.7 m short)`);
  // a steady 8% climb too
  const up = atPin(onSlope(0.08));
  assert.ok(up.miss <= NEAR_PIN, `8% uphill: ${up.miss.toFixed(2)} m`);
});

test('downhill: an 8% slope down to the pin', () => {
  const r = atPin(onSlope(-0.08));
  assert.ok(r.miss <= NEAR_PIN, `${r.miss.toFixed(2)} m from the pin`);
  // with the same club, downhill needs less power than flat, and uphill more
  const pw = rise => { const p = onSlope(rise); p.clubIdx = p.bag.findIndex(c => c.id === '9i'); return p.pinPower(); };
  assert.ok(pw(-0.08) < pw(0) && pw(0) < pw(0.08), `${pw(-0.08).toFixed(3)} < ${pw(0).toFixed(3)} < ${pw(0.08).toFixed(3)}`);
});

test('S15: the ⚑ is where the predicted roll finishes at the target, and the ball lands short of it', () => {
  // the hole 2 cross bunker: the bank below the raised green rolls a short ball back, so no power
  // finishes exactly at the centre; the ⚑ takes the closest finish (within 2 m)
  for (const [play, tol] of [[onSlope(0), 0.3], [onSlope(0.08), 0.3], [onSlope(-0.08), 0.3], [fromScenario('h2-cross-bunker', '7i'), NEAR_PIN]]) {
    const d = play.targetDist(), p = play.pinPower();
    const rest = dist2D(play.ball.pos, play.restPoint(play.clubIdx, play.aim, p));
    const carry = dist2D(play.ball.pos, play.landingPoint(play.clubIdx, play.aim, p));
    assert.ok(Math.abs(rest - d) < tol, `finishes at ${rest.toFixed(2)} m of ${d.toFixed(2)}`);
    assert.ok(carry < d, `lands at ${carry.toFixed(2)} m, then runs out`);
  }
});

// S15 acceptance (owner): at the ⚑ power, no wind, straight, every club that can reach (within its
// cap) finishes within ~2 m of the target at 100–180 m, on flat ground and on ±8% slopes.
test('S15: every club 100–180 m finishes within 2 m at the ⚑, flat and ±8%', () => {
  let tried = 0;
  const longClubs = new Set();
  for (const rise of [0, 0.08, -0.08]) {
    for (const dist of [100, 120, 140, 160, 180]) {
      const probe = onSlope(rise, dist);
      for (let i = 0; i < probe.PUTTER; i++) {
        const play = onSlope(rise, dist);
        play.setClub(i);
        if (play.pinPower() > play.lieOf().maxPower) continue; // out of reach with this club
        const r = atPin(play);
        tried++;
        if (['driver', '3w', '5i'].includes(play.club.id)) longClubs.add(play.club.id);
        assert.ok(r.miss <= NEAR_PIN, `${play.club.id} ${dist} m, slope ${rise * 100}%: ${r.miss.toFixed(2)} m from the target (${r.ev.type})`);
      }
    }
  }
  assert.ok(tried >= 40, `${tried} shots checked`);
  assert.deepEqual([...longClubs].sort(), ['3w', '5i', 'driver'], 'the long clubs are all covered');
});

test('S15: the roll prediction leaves the real ball, the wind and the random numbers alone', () => {
  const a = onSlope(0, 150), b = onSlope(0, 150);
  a.wind.x = 3; b.wind.x = 3;
  const pos = { ...a.ball.pos };
  a.pinPower(); a.restPoint(a.clubIdx, a.aim, 0.9);
  assert.deepEqual({ ...a.ball.pos }, pos);
  assert.equal(a.wind.x, 3);
  assert.equal(a.ball.phase, 'rest');
  // the same shot afterwards ends exactly where it does without the prediction
  a.hit(0.8, 0.02); b.hit(0.8, 0.02);
  a.simulate(); b.simulate();
  assert.deepEqual({ ...a.ball.pos }, { ...b.ball.pos });
});

test('out of reach within the cap: the ⚑ sits in the grayed-out part', () => {
  // the P Wedge from the rough, 100 m out: it needs about 90% power, the rough caps it at 85%
  // (S18 moved this from the hole 2 cross bunker: the sand wedge now aims at the nearer green centre)
  const rough = createHolePlay(testHole({ surfaceAt: () => 'rough', cup: { x: 0, z: -100 } }), { seed: 1 });
  rough.reset(); rough.setClub(rough.bag.findIndex(c => c.id === 'pw'));
  const need = rough.pinPower();
  assert.ok(need > rough.lieOf().maxPower && need < 1, `⚑ ${need.toFixed(3)} is above the cap ${rough.lieOf().maxPower}, below 1`);
  // and far away the search gives up at its top (the HUD hides the mark)
  assert.ok(onSlope(0, 400).pinPower() > 1);
});

function fromScenarioless(holeId) {
  const play = createHolePlay(getHole(holeId), { seed: 1 });
  play.reset({ wind: { x: 0, z: 0 } });
  return play;
}
