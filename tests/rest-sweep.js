// P10 sweep (shared by tests/rest.test.js and quick checks): putts and full shots from a grid over
// a real hole, no wind, straight. Returns every shot's end: { kind, x, z, ev, rollT }.
import { createHolePlay } from '../src/core/play.js';
import { getHole } from '../src/holes/sets.js';

export function sweep(holeId, { step = 4, puttPowers = [0.5], fullPowers = [0.6, 1] } = {}) {
  const hole = getHole(holeId), out = [];
  const play = createHolePlay(hole, { seed: 1 });
  const { x0, x1, z0, z1 } = hole.map;
  for (let x = x0; x <= x1; x += step) for (let z = z0; z <= z1; z += step) {
    const s = hole.surfaceAt(x, z);
    const putt = s === 'green', full = s === 'fairway' || s === 'rough' || s === 'rock';
    if (!putt && !full) continue;
    for (const pw of putt ? puttPowers : fullPowers) {
      play.reset();
      play.wind.x = play.wind.z = 0;
      play.ball.pos.x = x; play.ball.pos.z = z; play.prepare();
      if (!putt && play.club.putter) continue;
      if (!play.hit(pw, 0)) continue;
      let ev = play.simulate(), rollT = play.ball.rollT;
      out.push({ kind: putt ? 'putt' : 'full', x, z, power: pw, ev, rollT });
    }
  }
  return out;
}
