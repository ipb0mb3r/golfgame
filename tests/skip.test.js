// X9: ⏩ Skip runs the rest of the shot at once. A skipped shot must end exactly like a watched one
// (same seed): same spot, strokes, events, p.next and p.finished.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHolePlay } from '../src/core/play.js';
import { getHole } from '../src/holes/sets.js';
import { testHole } from './helpers.js';

const FRAME = 1 / 60;

// Set up the same shot twice (same seed), then watch one frame by frame and skip the other after
// `skipAfter` seconds of watching (the game shows the button ~1 s after the hit).
function both(makePlay, setup, { skipAfter = 1, frame = FRAME } = {}) {
  const run = mode => {
    const play = makePlay();
    setup(play);
    const events = [];
    let t = 0;
    while (play.ball.moving) {
      if (mode === 'skip' && t >= skipAfter) { events.push(...play.skip()); break; }
      events.push(...play.advance(frame)); t += frame;
    }
    const { x, y, z } = play.ball.pos;
    return { x, y, z, strokes: play.strokes, next: play.next, finished: play.finished, events: events.map(e => e.type + (e.reason ? `:${e.reason}` : '')) };
  };
  return { watched: run('watch'), skipped: run('skip') };
}

function sameEnd({ watched, skipped }) {
  assert.deepEqual(skipped, watched); // exact: no tolerance
}

const fromSpot = (x, z, { power, acc = 0, club, seed, aimOff = 0, strokes = 0 }) => [
  () => createHolePlay(getHole(seed?.hole ?? 'pl-02'), { seed: seed?.n ?? 1 }),
  play => {
    play.reset();
    if (!seed) play.wind.x = play.wind.z = 0;
    play.ball.pos.x = x; play.ball.pos.z = z; play.prepare();
    play.strokes = strokes;
    play.setAim(play.aim + aimOff);
    if (club) play.setClub(play.bag.findIndex(c => c.id === club));
    assert.ok(play.hit(power, acc));
  },
];

test('X9: a skipped drive ends exactly like a watched one (hole 2, seeded wind)', () => {
  sameEnd(both(...fromSpot(0, 0, { power: 0.95, acc: -0.03, seed: { hole: 'pl-02', n: 23 } })));
});

test('X9: skipping at different moments (in flight, in the roll, at 60 or 30 fps) never changes the end', () => {
  const [make, setup] = fromSpot(0, 0, { power: 1, acc: 0.08, seed: { hole: 'pl-02', n: 7 } });
  const watched = both(make, setup).watched;
  for (const skipAfter of [0, 1, 2.5, 4, 7]) for (const frame of [1 / 30, 1 / 60, 1 / 144]) {
    assert.deepEqual(both(make, setup, { skipAfter, frame }).skipped, watched, `skip after ${skipAfter} s at ${Math.round(1 / frame)} fps`);
  }
});

test('X9: a putt that lips out (random deflection) ends the same when skipped', () => {
  // T2's lip-out putt on hole 1: seed 5, no wind
  const r = both(
    () => createHolePlay(getHole('pl-01'), { seed: 5 }),
    play => { play.reset(); play.wind.x = play.wind.z = 0; play.ball.pos.x = -6; play.ball.pos.z = -146; play.prepare(); play.strokes = 1; play.hit(0.95, 0); },
    { skipAfter: 0.2 });
  assert.ok(r.watched.events.includes('lippedOut'), 'the putt lips out');
  sameEnd(r);
});

test('X9: penalty, holed and picked-up flows end the same when skipped', () => {
  // water: a flat hole with a penalty strip, then the ball goes back (p.next = returnToLast)
  const strip = testHole({ cup: { x: 0, z: -60 }, maxStrokes: 6, surfaceAt: (x, z) => (z < -30 && z > -40 ? 'water' : 'fairway') });
  const water = both(() => createHolePlay(strip, { seed: 1 }), p => { p.reset(); p.setClub(p.bag.findIndex(c => c.id === 'sw')); p.hit(0.47, 0); }, { skipAfter: 0.5 });
  assert.equal(water.watched.next, 'returnToLast');
  sameEnd(water);
  // picked up: the same shot on the last allowed stroke
  const last = both(() => createHolePlay(strip, { seed: 1 }), p => { p.reset(); p.strokes = 5; p.setClub(p.bag.findIndex(c => c.id === 'sw')); p.hit(0.47, 0); }, { skipAfter: 0.5 });
  assert.equal(last.watched.next, 'pickedUp');
  sameEnd(last);
  // holed: a straight putt on a flat green
  const green = testHole({ cup: { x: 0, z: -8 } });
  const holed = both(() => createHolePlay(green, { seed: 1 }), p => { p.reset(); p.hit(0.85, 0); }, { skipAfter: 0.3 });
  assert.equal(holed.watched.next, 'holed');
  sameEnd(holed);
});

test('X9: skip does nothing when the ball is not moving, and the next shot plays normally after it', () => {
  const play = createHolePlay(getHole('pl-01'), { seed: 3 });
  play.reset();
  assert.deepEqual(play.skip(), []);
  play.hit(0.9, 0);
  play.advance(0.5);
  const evs = play.skip();
  assert.ok(['stopped', 'holed', 'penalty'].includes(evs.at(-1).type));
  assert.equal(play.ball.moving, false);
  assert.deepEqual(play.skip(), []);
  if (play.next === 'aim' || play.next === 'returnToLast') {
    play.proceed();
    assert.ok(play.canSwing);
    assert.ok(play.hit(0.5, 0));
    assert.ok(play.advance(FRAME).length >= 0 && play.ball.moving);
  }
});
