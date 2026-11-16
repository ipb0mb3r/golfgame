// S13: the club auto-pick rules (designer, DESIGN §3 "Club auto-pick").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testHole } from './helpers.js';
import { createHolePlay } from '../src/core/play.js';
import { CLUBS, makeBag, pickClub } from '../src/core/clubs.js';
import { FRINGE_PUTT_DIST } from '../src/core/config.js';

// A flat hole: the ball sits on `lie` at the tee spot, the cup is `dist` meters straight ahead.
function pickOn(lie, dist, bag) {
  const play = createHolePlay(testHole({ surfaceAt: (x, z) => (z > -5 ? lie : 'fairway'), cup: { x: 0, z: -dist }, bag }), { seed: 1 });
  play.reset();
  assert.equal(play.lie, lie);
  return play;
}
const picked = (lie, dist, bag) => pickOn(lie, dist, bag).club.id;

test('tee, long hole: the Driver', () => {
  assert.equal(picked('tee', 210), 'driver');
  assert.equal(picked('tee', 400), 'driver', 'nothing reaches: the longest club, and on the tee that is the Driver');
});

test('tee, short hole: the Driver only when the distance makes sense', () => {
  assert.equal(picked('tee', 140), '7i');
  assert.equal(picked('tee', 180), '3w', '3 Wood reaches, so no Driver');
  assert.equal(picked('tee', 70), 'sw');
});

test('a hole without a Driver in the bag picks the 3 Wood from a long tee', () => {
  assert.equal(picked('tee', 250, ['3w', '5i', '7i', '9i', 'pw', 'sw', 'putter']), '3w');
});

test('fairway: never the Driver, even when nothing else reaches', () => {
  assert.equal(picked('fairway', 210), '3w');
  assert.equal(picked('fairway', 320), '3w');
  assert.equal(picked('fairway', 140), '7i');
  assert.equal(picked('fairway', 95), 'pw');
});

test('rough: the club that reaches within the rough cap (85%)', () => {
  // 7 Iron: 150 m full, 127.5 m from the rough; 133 m is needed for a 140 m shot
  assert.equal(picked('fairway', 140), '7i');
  assert.equal(picked('rough', 140), '5i');
  assert.equal(picked('rough', 240), '3w', 'never the Driver');
});

test('bunker: the sand wedge, near or far', () => {
  assert.equal(picked('sand', 20), 'sw');
  assert.equal(picked('sand', 150), 'sw');
  // no sand wedge in the bag: the normal rule, inside the bunker cap (60%)
  assert.equal(picked('sand', 70, ['3w', '5i', '7i', '9i', 'pw', 'putter']), '9i');
});

test('fringe: the putter when close, otherwise a club', () => {
  assert.equal(picked('fringe', FRINGE_PUTT_DIST - 2), 'putter');
  assert.equal(picked('fringe', 40), 'sw');
});

test('green: the putter', () => {
  assert.equal(picked('green', 3), 'putter');
  assert.equal(picked('green', 30), 'putter');
});

test('manual choice stays free: any club can be chosen after the auto-pick', () => {
  const play = pickOn('fairway', 140);
  play.clubIdx = play.bag.findIndex(c => c.id === 'driver');
  assert.equal(play.club.id, 'driver');
  const from = { ...play.ball.pos };
  play.hit(1, 0);
  play.simulate();
  assert.ok(from.z - play.ball.pos.z > 200, 'a full Driver from the fairway goes Driver distance');
});

test('pickClub on its own (pure): reach comes from the caller', () => {
  const bag = makeBag();
  const reach = i => bag[i].carry; // flat ground, no cap
  const id = (lie, dist) => bag[pickClub(bag, { lie, dist, reach })].id;
  assert.equal(id('tee', 210), 'driver');
  assert.equal(id('fairway', 210), '3w');
  assert.equal(id('sand', 200), 'sw');
  assert.equal(id('green', 200), 'putter');
  assert.equal(CLUBS[id('rough', 100)].carry, 105);
});
