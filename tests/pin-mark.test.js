// S12: the ⚑ mark is honest on flat ground, uphill and downhill. It uses the same landing simulation
// as the aim ring (hills and the lie cap included), so at the ⚑ power with no wind and a straight
// shot, the ball finishes near the pin. Since S18 the ⚑ is for the default aim point (the green
// centre for an approach on a real hole, the pin on these test slopes), so "near the pin" here is
// "near the default aim point": `play.target`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testHole } from './helpers.js';
import { createHolePlay } from '../src/core/play.js';
import { getHole } from '../src/holes/sets.js';
import { SCENARIOS } from '../src/holes/scenarios.js';
import { dist2D } from '../src/core/vec.js';
import { AUTO_CLUB_REACH } from '../src/core/config.js';

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
  const play = fromScenario('h2-cross-bunker', '9i');
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

test('the ⚑ uses the aim ring simulation: it lands AUTO_CLUB_REACH of the way to the pin', () => {
  for (const play of [onSlope(0), onSlope(0.08), onSlope(-0.08), fromScenario('h2-cross-bunker', '9i')]) {
    const d = play.targetDist(), p = play.pinPower();
    const carry = dist2D(play.ball.pos, play.landingPoint(play.clubIdx, play.aim, p));
    assert.ok(Math.abs(carry - d * AUTO_CLUB_REACH) < 0.01, `${carry.toFixed(3)} vs ${(d * AUTO_CLUB_REACH).toFixed(3)}`);
  }
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
