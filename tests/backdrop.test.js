// AP6a: the gradient sky, horn peaks, haze hills and ocean pieces (core/backdrop.js, DESIGN §8b).
import test from 'node:test';
import assert from 'node:assert/strict';
import { skyMix, skyColour, skyFogMix, cloudPuffs, hornPeak, hornRange, ridgeLayer, parseSeaSide, oceanShore, shoreMapColour, backdropScale, mixHex } from '../src/core/backdrop.js';
import { SKY_LOOK, HORN_PEAKS_LOOK, HAZE_HILLS_LOOK, OCEAN_LOOK, BACKDROP_FIT, RIDGE } from '../src/core/config.js';
import { validateBiomeSet, PICKS } from '../src/core/biome.js';
import { LIBRARY } from '../src/biomes/library.js';
import { BIOMES } from '../src/biomes/index.js';
import { HOLES } from '../src/holes/sets.js';
import { validateHole } from '../src/core/validate.js';
import { makeTerrain } from '../src/core/terrain.js';

const P = BIOMES['alpine-day'].palette;

test('AP6a gradient sky: the artist\'s formula, skyHorizon at the horizon, skyTop from ~30° up, the fog just under the horizon', () => {
  assert.equal(skyMix(0), 0);
  assert.equal(skyMix(-0.3), 0);
  assert.equal(skyMix(Math.sin(32 * Math.PI / 180)), 1); // full skyTop from ~32° (dir.y × 1.9 ≥ 1)
  assert.ok(Math.abs(skyMix(0.2) - Math.pow(0.38, 0.62)) < 1e-12);
  assert.ok(skyMix(Math.sin(12 * Math.PI / 180)) < 0.75); // a pale band over the lowest ~10–15°
  assert.equal(skyColour(P, 0.8), P.skyTop);
  assert.equal(skyColour(P, SKY_LOOK.fogBand[1]).length, 7);
  assert.equal(skyColour(P, -0.2), P.fog); // fogged ground meets the fog colour: no seam
  assert.equal(skyFogMix(0.5), 1);
});

test('AP6a clouds: 7–9 groups of 4–6 puffs, high (y 400–900 m) and far (2.3–2.9 km) in the mock-up\'s frame', () => {
  const puffs = cloudPuffs();
  const L = SKY_LOOK.clouds;
  assert.ok(L.groups >= 7 && L.groups <= 9);
  assert.ok(puffs.length >= L.groups * 4 && puffs.length <= L.groups * 6);
  for (const p of puffs) {
    const d = Math.hypot(p.x, p.z);
    assert.ok(d > 2200 && d < 3000, `puff at ${d.toFixed(0)} m`);
    assert.ok(p.y > 370 && p.y < 1000, `puff at y ${p.y.toFixed(0)}`);
    assert.ok(p.z < 0, 'in front (−z)');
  }
  assert.deepEqual(cloudPuffs(), puffs, 'seeded: always the same');
});

test('AP6a horn peaks: ~80 triangles per horn, the hero WIDE and tall, snow on top, rock below, a handful of draw calls', () => {
  const hero = hornPeak(HORN_PEAKS_LOOK.hero, P);
  assert.ok(hero.triangles >= 60 && hero.triangles <= 90, `${hero.triangles} triangles`);
  const ys = hero.positions.filter((_, i) => i % 3 === 1);
  assert.equal(Math.max(...ys), HORN_PEAKS_LOOK.hero.h);
  const range = hornRange(P);
  assert.equal(range.horns.length, 1 + HORN_PEAKS_LOOK.others.length);
  assert.ok(range.horns.length >= 6 && range.horns.length <= 7);
  for (const t of range.horns) assert.ok(t >= 60 && t <= 90);
  assert.equal(range.colours.length * 3, range.positions.length);
  // the summit is snow, the lowest faces rock (backFar mixed toward #34465e, hazed): never the snow colour
  const snow = mixHex(P.backCap, P.fog, HORN_PEAKS_LOOK.haze);
  const top = ys.indexOf(Math.max(...ys)), low = ys.indexOf(Math.min(...ys));
  assert.equal(hero.colours[top], snow);
  assert.notEqual(hero.colours[low], snow);
  // the artist's sizes: hero h 1150 / r 780, the others h 600–820, r 820–920
  for (const [, , h, r] of HORN_PEAKS_LOOK.others) { assert.ok(h >= 600 && h <= 820); assert.ok(r >= 820 && r <= 920); }
});

test('AP6a ridge layers (far ridge, forested slopes, haze hills, volcanic ridge): base fades into the fog, the haze baked in', () => {
  for (const layer of [HORN_PEAKS_LOOK.farRidge, HORN_PEAKS_LOOK.slopes, HAZE_HILLS_LOOK.far, HAZE_HILLS_LOOK.near, OCEAN_LOOK.ridge, OCEAN_LOOK.island]) {
    const r = ridgeLayer(layer, P);
    assert.ok(r.triangles >= layer.n * 2 && r.triangles <= layer.n * 4, `${layer.key} ${r.triangles}`);
    assert.equal(r.colours.length * 3, r.positions.length);
  }
  // haze hills: the near ring is backNear mixed 10 % toward the fog, the far ring backFar 22 %, bases +45 %
  const near = ridgeLayer(HAZE_HILLS_LOOK.near, P), far = ridgeLayer(HAZE_HILLS_LOOK.far, P);
  assert.ok(near.colours.includes(mixHex(P.backNear, P.fog, 0.1)));
  assert.ok(far.colours.includes(mixHex(P.backFar, P.fog, 0.22)));
  assert.ok(near.colours.includes(mixHex(P.backNear, P.fog, 0.55)));
  // the forested slopes are a full ring: something in every direction
  const ring = ridgeLayer(HORN_PEAKS_LOOK.slopes, P), dirs = new Set();
  for (let i = 0; i < ring.positions.length; i += 3) dirs.add(Math.round(Math.atan2(ring.positions[i], -ring.positions[i + 2]) * 2));
  assert.ok(dirs.size >= 12);
});

test('AP6a backdrop fit: the farthest layer sits inside the camera\'s far plane on every hole', () => {
  for (const id of Object.keys(HOLES)) {
    const sc = HOLES[id].scenery, k = backdropScale(sc.cameraFar);
    assert.ok(k > 0 && k <= 1);
    assert.ok(BACKDROP_FIT.ref * k + Math.abs(sc.hills.cz) < sc.cameraFar * 1.0, `${id}: ${BACKDROP_FIT.ref * k} m`);
    assert.ok(SKY_LOOK.dome < 1);
  }
});

test('AP6a seaSide: one side or several joined by +; anything else fails, and a hole with a bad one fails', () => {
  assert.deepEqual(parseSeaSide('left'), ['left']);
  assert.deepEqual(parseSeaSide('left+far'), ['left', 'far']);
  assert.deepEqual(parseSeaSide('right+far+near'), ['right', 'far', 'near']);
  for (const bad of ['', 'west', 'left+left', 'left+right+far+near', 3, undefined]) assert.throws(() => parseSeaSide(bad), /seaSide/);
  assert.doesNotThrow(() => parseSeaSide(LIBRARY.backdrops.ocean.seaSide));
  const hole = { ...HOLES['pl-01'], scenery: { ...HOLES['pl-01'].scenery, seaSide: 'west' } };
  assert.throws(() => validateHole(hole), /scenery\.seaSide/);
});

test('AP6a ocean: the DRAWN shore only. heightAt is read, never changed; land stays as today; the beach slopes under the sea', () => {
  const hole = HOLES['mtn-07'], terrain = makeTerrain(hole), sc = hole.scenery;
  const calls = [];
  const heightAt = (x, z) => { calls.push([x, z]); return terrain.heightAt(x, z); };
  const ob = { x0: sc.stakes.xs[0], x1: sc.stakes.xs[1], z0: sc.stakes.z1, z1: sc.stakes.z0 };
  const ends = parts => [parts[0][0], parts[parts.length - 1][1]];
  const [x0, x1] = ends(sc.mesh.xs), [z0, z1] = ends(sc.mesh.zs);
  const shore = oceanShore({ ob, heightAt, extent: { x0, x1, z0, z1 }, groundY: sc.ground.y, reach: sc.cameraFar, sides: ['left', 'far'], cz: sc.hills.cz });
  // inside OB (and up to the beach top) the drawn ground IS heightAt, and there is no tint
  for (let x = ob.x0; x <= ob.x1; x += 7) for (let z = ob.z0; z <= ob.z1; z += 13) {
    assert.equal(shore.drawnY(x, z), terrain.heightAt(x, z));
    assert.equal(shore.tint(x, z), null);
  }
  // beyond the slope it is under the sea; the sea is under every beach top; the far ground under the sea bed
  const bx = ob.x0 - OCEAN_LOOK.gap - OCEAN_LOOK.slope - 5;
  for (let z = ob.z0; z <= ob.z1; z += 20) assert.ok(shore.drawnY(bx, z) < shore.seaY, `z ${z}`);
  for (let z = z0; z <= z1; z += 25) assert.ok(terrain.heightAt(ob.x0 - OCEAN_LOOK.gap, z) > shore.seaY);
  assert.ok(shore.groundY < shore.bedY);
  // the beach: sand, with lava rock patches only near the waterline
  const tints = [];
  for (let z = ob.z0; z <= ob.z1; z += 3) for (let d = 1; d < OCEAN_LOOK.slope; d += 2) tints.push([d / OCEAN_LOOK.slope, shore.tint(ob.x0 - OCEAN_LOOK.gap - d, z)]);
  assert.ok(tints.some(([, t]) => t.colour === 'rock') && tints.some(([, t]) => t.colour === 'sand'));
  for (const [u, t] of tints) if (t.colour === 'rock') assert.ok(u >= OCEAN_LOOK.rockAt[0]);
  // bands: shallow (water) on top, then mid, then deep; on both sides
  const keys = new Set(shore.bands.map(b => b.key));
  assert.deepEqual([...keys].sort(), ['mid', 'water', 'waterDeep']);
  assert.equal(shore.bands.length, 6);
  const y = k => shore.bands.find(b => b.key === k).y;
  assert.ok(y('water') > y('mid') && y('mid') > y('waterDeep'));
  // the shallow band starts at the beach top (under the land), out to slope + shallow m
  const left = shore.bands.find(b => b.key === 'water' && b.x1 <= ob.x0);
  assert.equal(left.x1, ob.x0 - OCEAN_LOOK.gap);
  assert.equal(left.x1 - left.x0, OCEAN_LOOK.slope + OCEAN_LOOK.shallow);
  assert.ok(calls.length > 0);
});

test('AP6a library: the new pieces are registered, each slot a palette key, and validateBiomeSet accepts sets that pick them', () => {
  for (const [group, id] of [['skies', 'gradientSky'], ['backdrops', 'hornPeaks'], ['backdrops', 'ocean'], ['backdrops', 'hazeHills']]) {
    assert.ok(LIBRARY[group][id], `${group}.${id}`);
    assert.ok(LIBRARY[group][id].desc && LIBRARY[group][id].tris > 0);
  }
  for (const id of ['test-alpine-look', 'test-island-look', 'test-meadow-look']) assert.doesNotThrow(() => validateBiomeSet(BIOMES[id], LIBRARY), id);
  // a bad default sea side in the library is a library error
  const lib = { ...LIBRARY, backdrops: { ...LIBRARY.backdrops, ocean: { ...LIBRARY.backdrops.ocean, seaSide: 'up' } } };
  assert.throws(() => validateBiomeSet(BIOMES['test-island-look'], lib), /seaSide.*library error/);
  assert.ok(PICKS.sky && PICKS.backdrop);
});

test('AP6a: the artist\'s sets keep their picks (the artist picks the new pieces), and no hole or menu uses a test set', () => {
  for (const id of ['alpine-day', 'island-day', 'meadow-day', 'mtn-default', 'proto-default']) {
    assert.equal(BIOMES[id].sky, 'flatSky', id);
    assert.equal(BIOMES[id].backdrop, 'roundHills', id);
  }
  for (const h of Object.values(HOLES)) assert.ok(!h.biome.startsWith('test-'), h.id);
  // the test sets differ from their source only by sky and backdrop
  for (const [t, src] of [['test-alpine-look', 'alpine-day'], ['test-island-look', 'island-day'], ['test-meadow-look', 'meadow-day']]) {
    assert.equal(BIOMES[t].palette, BIOMES[src].palette);
    assert.deepEqual(BIOMES[t].onTrees, BIOMES[src].onTrees);
  }
});

test('AP6b round ridge layers: smooth light across each hill (no streaks from the jag noise), fading to the base at the foot; trimmed layers have no low tail', () => {
  const P = BIOMES['meadow-day'].palette;
  for (const layer of [HAZE_HILLS_LOOK.near, HAZE_HILLS_LOOK.far]) {
    const r = ridgeLayer(layer, P), base = mixHex(P[layer.key], P.fog, layer.haze + RIDGE.baseFade);
    const lit = mixHex(P[layer.key], P.fog, layer.haze), shd = mixHex(mixHex(P[layer.key], P.shadow, RIDGE.shade), P.fog, layer.haze);
    assert.ok(r.colours.includes(lit) && r.colours.includes(shd));
    // per segment: the lower quad (baseY to the foot) is the base colour; the upper quad goes base → top
    const tops = [];
    for (let q = 0; q < r.positions.length / 18; q++) {
      const ys = [1, 4, 7, 10, 13, 16].map(i => r.positions[q * 18 + i]), cs = r.colours.slice(q * 6, q * 6 + 6);
      if (q % 2 === 0) { assert.ok(ys.every(y => y <= 0)); assert.ok(cs.every(c => c === base)); }
      else { assert.equal(cs[0], base); assert.equal(cs[1], base); tops.push(cs[5], cs[2]); }
    }
    // the light changes smoothly along the ring: neighbouring tops never jump from lit to shade
    const lum = c => { const n = parseInt(c.slice(1), 16); return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255); };
    const jump = Math.abs(lum(lit) - lum(shd));
    for (let i = 2; i < tops.length; i += 2) assert.ok(Math.abs(lum(tops[i]) - lum(tops[i - 1])) < jump * 0.5, `${layer.key} step ${i}`);
  }
  // the volcanic ridge is trimmed: no strip at the arc's left end, where no peak is
  const ridge = ridgeLayer(OCEAN_LOOK.ridge, BIOMES['island-day'].palette);
  const angles = [];
  for (let i = 0; i < ridge.positions.length; i += 3) angles.push(Math.atan2(ridge.positions[i], -ridge.positions[i + 2]));
  assert.ok(Math.min(...angles) > OCEAN_LOOK.ridge.a[0] + 0.1, `starts at ${Math.min(...angles).toFixed(2)}`);
  assert.ok(ridge.triangles < OCEAN_LOOK.ridge.n * 4);
});

test('AP6b minimap sea: beyond the OB line on a sea side the sea colours (shallow, mid, deep); land sides and inside OB unchanged', () => {
  const hole = HOLES['mtn-07'], terrain = makeTerrain(hole), sc = hole.scenery, P = BIOMES['island-day'].palette;
  const ob = { x0: sc.stakes.xs[0], x1: sc.stakes.xs[1], z0: sc.stakes.z1, z1: sc.stakes.z0 };
  const ends = parts => [parts[0][0], parts[parts.length - 1][1]];
  const [x0, x1] = ends(sc.mesh.xs), [z0, z1] = ends(sc.mesh.zs);
  const shore = oceanShore({ ob, heightAt: terrain.heightAt, extent: { x0, x1, z0, z1 }, groundY: sc.ground.y, reach: sc.cameraFar, sides: ['left'], cz: sc.hills.cz });
  const z = (ob.z0 + ob.z1) / 2, L = OCEAN_LOOK;
  assert.equal(shoreMapColour(shore, P, ob.x0 + 1, z), null); // inside OB
  assert.equal(shoreMapColour(shore, P, ob.x1 + 50, z), null); // the land side
  assert.equal(shoreMapColour(shore, P, ob.x0 - 1, z), P.water); // just beyond the OB line: the sea
  assert.equal(shoreMapColour(shore, P, ob.x0 - L.gap - L.slope - L.shallow - 10, z), mixHex(P.water, P.waterDeep, 0.5));
  assert.equal(shoreMapColour(shore, P, ob.x0 - L.gap - L.slope - L.shallow - L.mid - 10, z), P.waterDeep);
});
