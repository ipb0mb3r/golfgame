// AP5: biome sets (DESIGN §8b): the format, the library pick list and the readability rules (ART_STYLE §4.4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { validateBiomeSet, checkReadability, delta, parseColour, ALL_PALETTE_KEYS, OPTIONAL_PALETTE_KEYS, paletteColour, PALETTE_KEYS, READABILITY, sceneLight, treeLooks, pieceColours, flagColour, minimapColours, minimapShade, checkMinimap, MINIMAP_READABILITY, mixColour } from '../src/core/biome.js';
import { MINIMAP_DARKEN } from '../src/core/config.js';
import { checkHoleLooks } from '../src/holes/sets.js';
import { validateHole } from '../src/core/validate.js';
import { createRng } from '../src/core/rng.js';
import { LIBRARY } from '../src/biomes/library.js';
import { BIOMES, resolveBiome } from '../src/biomes/index.js';
import { HOLES } from '../src/holes/sets.js';
import { PALETTES as ARTIST_R2 } from '../docs/art/style-r2/palettes.js';

const base = BIOMES['mtn-default'];
const withChange = change => ({ ...base, ...change });
const withPalette = change => withChange({ palette: { ...base.palette, ...change } });

test('every registered biome set passes, and its id is its registry key', () => {
  for (const [id, set] of Object.entries(BIOMES)) {
    assert.equal(set.id, id);
    assert.equal(validateBiomeSet(set, LIBRARY), set);
  }
});

test('every hole names a biome set that exists', () => {
  for (const h of Object.values(HOLES)) assert.equal(resolveBiome(h.biome).id, h.biome, h.id);
  assert.throws(() => resolveBiome('mtn-defualt'), /unknown biome set "mtn-defualt" \(known: .*mtn-default/);
});

test('the palette: every key, each a #rrggbb colour, no unknown key', () => {
  const { accent, ...noAccent } = base.palette;
  assert.throws(() => validateBiomeSet(withChange({ palette: noAccent }), LIBRARY), /biome set "mtn-default": palette is missing "accent"/);
  assert.throws(() => validateBiomeSet(withPalette({ rough: '#12345' }), LIBRARY), /palette\.rough must be a colour '#rrggbb' \(got "#12345"\)/);
  assert.throws(() => validateBiomeSet(withPalette({ rough: 0x4a8c34 }), LIBRARY), /palette\.rough must be a colour/);
  assert.throws(() => validateBiomeSet(withPalette({ ruff: '#4a8c34' }), LIBRARY), /palette has an unknown key "ruff"/);
  // the artist's keys (ART_STYLE §4.1) are all required
  for (const k of ['tee', 'fairwayA', 'edge', 'lip', 'bank', 'backTrees', 'leafTop', 'leafLow', 'accent', 'subAccent', 'shadow']) assert.ok(ALL_PALETTE_KEYS.includes(k), k);
  assert.equal(new Set(ALL_PALETTE_KEYS).size, ALL_PALETTE_KEYS.length);
});

test('the pick list: every piece exists in the library', () => {
  assert.throws(() => validateBiomeSet(withChange({ onTrees: ['palm'] }), LIBRARY), /onTrees: unknown piece "palm" \(the library's onTrees: roundTree, /);
  assert.throws(() => validateBiomeSet(withChange({ onTrees: [] }), LIBRARY), /onTrees must list 1–3 pieces/);
  assert.throws(() => validateBiomeSet(withChange({ offTrees: ['coneTree', 'coneTree'] }), LIBRARY), /offTrees lists a piece twice/);
  assert.throws(() => validateBiomeSet(withChange({ sky: 'gradient' }), LIBRARY), /sky: unknown piece "gradient"/);
  assert.throws(() => validateBiomeSet(withChange({ backdrop: 'peaksSnow' }), LIBRARY), /backdrop: unknown piece "peaksSnow"/);
  // (AP7e: the windmill is a library piece now, so the unknown piece is a cow)
  assert.throws(() => validateBiomeSet(withChange({ bigProps: ['cow'] }), LIBRARY), /bigProps: unknown piece "cow" \(the library's bigProps: windmill, chalet, chaletTall, beachHut\)/);
  assert.doesNotThrow(() => validateBiomeSet(withChange({ bigProps: ['windmill', { id: 'chalet', slots: { roof: 'rock' } }] }), LIBRARY));
  assert.throws(() => validateBiomeSet(withChange({ textures: ['grassDabs'] }), LIBRARY), /textures: unknown piece "grassDabs"/);
  assert.throws(() => validateBiomeSet(withChange({ furniture: { ...base.furniture, flag: 'banner' } }), LIBRARY), /furniture\.flag: unknown piece "banner"/);
  // (AP7c: grassTuft is a library piece now, so the unknown piece is a buttercup)
  assert.throws(() => validateBiomeSet(withChange({ smallProps: { pieces: ['buttercup'] } }), LIBRARY), /smallProps: unknown piece "buttercup"/);
  // a piece added to the library can be picked; small props need their scatter rule
  const lib = { ...LIBRARY, smallProps: { buttercup: { slots: { blades: 'rough' } } } };
  assert.throws(() => validateBiomeSet(withChange({ smallProps: { pieces: ['buttercup'] } }), lib), /smallProps\.perHa must be a number/);
  assert.ok(validateBiomeSet(withChange({ smallProps: { pieces: ['buttercup'], perHa: 40, on: ['rough'] } }), lib));
  // a library piece whose slot names a missing palette key is a library error
  const badLib = { ...LIBRARY, skies: { flatSky: { slots: { sky: 'skyMiddle' } } } };
  assert.throws(() => validateBiomeSet(base, badLib), /sky: piece "flatSky" slot sky uses an unknown palette key "skyMiddle"/);
  // every slot of every library piece names a palette key
  for (const group of Object.values(LIBRARY)) for (const piece of Object.values(group)) for (const key of Object.values(piece.slots ?? {})) assert.ok(ALL_PALETTE_KEYS.includes(key), key);
});

test('the set fields: description, notes, no unknown field, no physics', () => {
  assert.throws(() => validateBiomeSet(withChange({ notes: '' }), LIBRARY), /notes must be a non-empty string/);
  assert.throws(() => validateBiomeSet(withChange({ surfaceOverrides: { green: { decel: 1 } } }), LIBRARY), /unknown field "surfaceOverrides"/);
  assert.throws(() => validateBiomeSet(withChange({ id: 'Mtn Default' }), LIBRARY), /id must be lower-case/);
});

test('readability (ART_STYLE §4.4): a failing pair fails the set unless waived by name with a reason', () => {
  // a flag the colour of the green
  assert.throws(() => validateBiomeSet(withPalette({ accent: base.palette.greenA }), LIBRARY), /readability \(ART_STYLE §4\.4\): accent\/greenA ΔE 0 \(≥ 30\)/);
  // sand the colour of the fairway: the ΔL part is named too
  assert.throws(() => validateBiomeSet(withPalette({ sand: base.palette.fairwayA }), LIBRARY), /sand\/fairway ΔE \d+ \(≥ 20\), ΔL \d+ \(≥ 10\)/);
  assert.throws(() => validateBiomeSet(withChange({ readabilityWaivers: { ...base.readabilityWaivers, 'flag/moon': 'x' } }), LIBRARY), /unknown rule "flag\/moon"/);
  assert.throws(() => validateBiomeSet(withChange({ readabilityWaivers: { ...base.readabilityWaivers, 'green/fairway': ' ' } }), LIBRARY), /readabilityWaivers\.green\/fairway needs a reason/);
  assert.throws(() => validateBiomeSet(withChange({ readabilityWaivers: { ...base.readabilityWaivers, 'sand/rough': 'no' } }), LIBRARY), /sand\/rough already pass, remove the waiver/);
  const { 'accent/warn': _, ...fewer } = base.readabilityWaivers;
  assert.throws(() => validateBiomeSet(withChange({ readabilityWaivers: fewer }), LIBRARY), /accent\/warn ΔE 8 \(≥ 15\)/);
});

test('the colour maths matches CIE76 (and the artist\'s round-2 palettes pass every rule, as ART_STYLE §4.5 says)', () => {
  assert.deepEqual(parseColour('#ff8000'), [255, 128, 0]);
  assert.equal(parseColour('ff8000'), null);
  assert.ok(Math.abs(delta('#ffffff', '#000000').dE - 100) < 0.01);
  assert.ok(Math.abs(delta('#ffffff', '#000000').dL - 100) < 0.01);
  assert.equal(delta('#3a80c4', '#3a80c4').dE, 0);
  // (the rules on the dev's engine keys, e.g. the putting grid's gridLine, are left out: the artist's sheets don't have them)
  const engine = new Set(PALETTE_KEYS.engine);
  for (const [id, p] of Object.entries(ARTIST_R2)) {
    const fails = checkReadability({ ...p, gridLine: '#000000' }).filter(r => !r.ok && !engine.has(r.a) && !engine.has(r.b)).map(r => r.id);
    assert.deepEqual(fails, [], id);
  }
  // the artist's palettes carry every artist key (only the engine group is the dev's)
  for (const p of Object.values(ARTIST_R2)) for (const k of Object.values(PALETTE_KEYS).slice(0, -1).flat()) assert.ok(parseColour(p[k]), k);
  assert.equal(READABILITY.length, new Set(READABILITY.map(r => r[0])).size);
});

test('step 2 rules (artist on #86): per stripe and the putting grid; today\'s looks waive them by name', () => {
  for (const id of ['fairwayB/rough', 'greenB/fairwayA', 'gridLine/greenA', 'gridLine/greenB']) assert.ok(READABILITY.some(r => r[0] === id), id);
  assert.throws(() => validateBiomeSet(withPalette({ gridLine: base.palette.greenA }), LIBRARY), /gridLine\/greenA ΔE 0 \(≥ 10\)/);
  const { 'greenB/fairwayA': _, ...fewer } = base.readabilityWaivers;
  assert.throws(() => validateBiomeSet(withChange({ readabilityWaivers: fewer }), LIBRARY), /greenB\/fairwayA ΔE 6 \(≥ 10\)/);
});

test('meadow-day (the AP5 proof): the artist\'s Meadow palette, today\'s pieces only, no waiver, no hole uses it', () => {
  const m = BIOMES['meadow-day'];
  assert.equal(validateBiomeSet(m, LIBRARY), m);
  assert.equal(m.readabilityWaivers, undefined);
  assert.deepEqual(checkReadability(m.palette).filter(r => !r.ok), []);
  // every artist key is the artist's Meadow value (only the engine keys are the dev's)
  for (const k of Object.values(PALETTE_KEYS).slice(0, -1).flat()) assert.equal(m.palette[k], ARTIST_R2.meadow[k].toLowerCase(), k);
  assert.ok(Object.values(HOLES).every(h => h.biome !== 'meadow-day'));
});

test('the optional light override: replaces the hole\'s scenery light when present', () => {
  const sc = { hemi: 1.2, sun: { intensity: 2, pos: [-90, 80, 30] } };
  assert.deepEqual(sceneLight(base, sc), { hemi: 1.2, sun: 2, sunPos: [-90, 80, 30] });
  const light = { sunIntensity: 1.4, hemiIntensity: 0.8, sunDir: [-1, 0.3, 0.2] };
  assert.deepEqual(sceneLight(withChange({ light }), sc), { hemi: 0.8, sun: 1.4, sunPos: [-1, 0.3, 0.2] });
  assert.ok(validateBiomeSet(withChange({ light }), LIBRARY));
  assert.throws(() => validateBiomeSet(withChange({ light: { ...light, sunDir: [0, -1, 0] } }), LIBRARY), /light\.sunDir must be \[x, y, z\] toward the sun/);
  assert.throws(() => validateBiomeSet(withChange({ light: { ...light, fog: [1, 2] } }), LIBRARY), /light has an unknown key "fog"/);
  assert.throws(() => validateBiomeSet(withChange({ light: { ...light, sunIntensity: -1 } }), LIBRARY), /light\.sunIntensity must be a number ≥ 0/);
});

test('tree looks: the obstacle\'s own look if the set has it, else a seeded pick from onTrees', () => {
  const trees = [{}, { look: 'b' }, { look: 'zz' }, {}];
  // one piece: always it, and nothing is drawn from the stream
  let draws = 0;
  assert.deepEqual(treeLooks(trees, ['a'], () => { draws++; return 0.5; }), ['a', 'a', 'a', 'a']);
  assert.equal(draws, 0);
  const picks = treeLooks(trees, ['a', 'b', 'c'], createRng(78));
  assert.equal(picks[1], 'b');
  assert.ok(picks.every(p => ['a', 'b', 'c'].includes(p)));
  assert.deepEqual(treeLooks(trees, ['a', 'b', 'c'], createRng(78)), picks); // seeded: the same every time
  // hole data: `look` on trees only, and it must be a library tree piece
  const h = HOLES['pl-03'], i = h.obstacles.findIndex(o => o.type === 'tree');
  const withLook = look => ({ ...h, obstacles: h.obstacles.map((o, k) => (k === i ? { ...o, look } : o)) });
  assert.ok(checkHoleLooks(withLook('roundTree')));
  assert.throws(() => checkHoleLooks(withLook('palm')), /obstacles\[\d+\]\.look "palm" is not a tree piece \(the library's onTrees: roundTree, /);
  assert.throws(() => validateHole(withLook(7), { shots: false }), /obstacles\[\d+\]\.look must be a tree piece id/);
});

test('the game reads colours through the library slots; no biome colour is hard-coded in src/game or src/holes', () => {
  assert.equal(flagColour(BIOMES['proto-default'], LIBRARY), BIOMES['proto-default'].palette.accent);
  assert.deepEqual(pieceColours(base, LIBRARY)('onTrees', 'roundTree'), { canopy: base.palette.leaf, trunk: base.palette.trunk });
  assert.throws(() => pieceColours(base, LIBRARY)('skies', 'gradient'), /no skies piece "gradient"/);
  // the colours left in code are not the biome's: white / black (ball, cup, stakes, pole, the canopy's
  // white base), the debug outlines and the red word in pl-03's intro. Since X25 the HUD aim colours are
  // read from UI_COLORS (config.js), and since X26 the minimap has no legend colours of its own.
  const allowed = new Set(['ffffff', '111111', '000000', '333333', 'ff4040', 'ffe040', '40e0ff', 'ff5a4a']);
  for (const dir of ['src/game', 'src/holes']) for (const f of readdirSync(dir).filter(n => n.endsWith('.js'))) {
    const code = readFileSync(`${dir}/${f}`, 'utf8').replace(/^\s*\/\/.*$/gm, '');
    const found = [...code.matchAll(/(?:0x|#)([0-9a-fA-F]{6})\b/g)].map(m => m[1].toLowerCase()).filter(c => !allowed.has(c));
    assert.deepEqual(found, [], `${dir}/${f}`);
  }
});

test('X26: the minimap takes the set\'s colours; a tree too close to fairway or rough is darkened one fixed step', () => {
  // the boulders and each onTrees look's canopy, from the library's slots
  for (const set of Object.values(BIOMES)) {
    const c = minimapColours(set, LIBRARY);
    assert.deepEqual(Object.keys(c.trees), set.onTrees, set.id);
    // every set passes the minimap rules (after the step), with no waiver
    assert.deepEqual(checkMinimap(set, LIBRARY).filter(r => !r.ok), [], set.id);
    assert.ok(!Object.keys(set.readabilityWaivers ?? {}).some(id => id.startsWith('minimap')), set.id); // no waiver
  }
  // the rules use the fairway / rough thresholds
  assert.deepEqual(MINIMAP_READABILITY.map(r => r.slice(1)), [['tree', 'fairway', 15, 8], ['tree', 'rough', 15, 8], ['rock', 'fairway', 15, 8], ['rock', 'rough', 15, 8]]);
  // the rocks too (PM on #89). X27 (artist on #93): the test checks the rule, not the darkening: a boulder
  // colour that already passes is drawn as it is, one that fails is drawn one step darker, and the colour
  // drawn passes either way
  const fairwayOf = pal => mixColour(pal.fairwayA, pal.fairwayB);
  const passesRaw = (pal, c) => [fairwayOf(pal), pal.rough].every(b => { const d = delta(c, b); return d.dE >= 15 && d.dL >= 8; });
  for (const set of Object.values(BIOMES)) {
    const r = minimapShade(set.palette, 'rock', set.palette.boulder);
    assert.equal(r.darkened, !passesRaw(set.palette, set.palette.boulder), set.id);
    assert.equal(r.colour, r.darkened ? '#' + parseColour(set.palette.boulder).map(v => Math.round(v * (1 - MINIMAP_DARKEN)).toString(16).padStart(2, '0')).join('') : set.palette.boulder, set.id);
    assert.equal(minimapColours(set, LIBRARY).rock, r.colour, set.id);
    assert.ok(r.rows.every(x => x.ok) && r.rows.length === 2, set.id);
  }
  // a dark boulder that already passes (Island coast's dark lava #3e3a40 on a bright course) is not darkened
  const lava = minimapShade(BIOMES['meadow-day'].palette, 'rock', '#3e3a40');
  assert.deepEqual([lava.darkened, lava.colour, lava.rows.every(x => x.ok)], [false, '#3e3a40', true]);
  // a canopy that passes is used as it is; one that fails is darkened by MINIMAP_DARKEN
  const p = base.palette;
  assert.deepEqual(minimapShade(p, 'tree', '#1c4a20').colour, '#1c4a20');
  const m = minimapShade(p, 'tree', p.leaf); // today's mountain leaf: ΔL 1 from the fairway
  assert.equal(m.darkened, true);
  assert.deepEqual(parseColour(m.colour), parseColour(p.leaf).map(v => Math.round(v * (1 - MINIMAP_DARKEN))));
  assert.ok(m.rows.every(r => r.ok));
  assert.equal(minimapShade(BIOMES['meadow-day'].palette, 'tree', BIOMES['meadow-day'].palette.leaf).darkened, true); // ΔE 8 from its rough
  // a tree the step cannot save fails the set, named by rule and look; a waiver by name lets it through
  // a canopy the colour of the fairway, with a rough exactly one step darker: darkened, it lands on the rough
  const fw = mixColour(p.fairwayA, p.fairwayB);
  const failing = withPalette({ leaf: fw, rough: '#' + parseColour(fw).map(v => Math.round(v * (1 - MINIMAP_DARKEN)).toString(16).padStart(2, '0')).join('') });
  assert.throws(() => validateBiomeSet(failing, LIBRARY), /minimapTree\/(fairway|rough) \(roundTree\) ΔE/);
  const ids = [...new Set([...checkReadability(failing.palette), ...checkMinimap(failing, LIBRARY)].filter(r => !r.ok).map(r => r.id))];
  assert.ok(ids.includes('minimapTree/rough'));
  assert.ok(validateBiomeSet({ ...failing, readabilityWaivers: Object.fromEntries(ids.map(id => [id, 'test'])) }, LIBRARY));
  assert.throws(() => validateBiomeSet(withChange({ readabilityWaivers: { ...base.readabilityWaivers, 'minimapTree/rough': 'x' } }), LIBRARY), /minimapTree\/rough already pass, remove the waiver/);
});

test('X50: propWood / propWoodDark are optional palette keys (fallback wood / trunk); a set may define them', () => {
  assert.deepEqual({ ...OPTIONAL_PALETTE_KEYS }, { propWood: 'wood', propWoodDark: 'trunk' });
  assert.ok(ALL_PALETTE_KEYS.includes('propWood') && ALL_PALETTE_KEYS.includes('propWoodDark'));
  const base = BIOMES['proto-default'];
  const bare = { ...base, palette: Object.fromEntries(Object.entries(base.palette).filter(([k]) => !(k in OPTIONAL_PALETTE_KEYS))) };
  assert.doesNotThrow(() => validateBiomeSet(bare, LIBRARY));
  assert.equal(paletteColour(bare.palette, 'propWood'), bare.palette.wood);
  assert.equal(paletteColour(bare.palette, 'propWoodDark'), bare.palette.trunk);
  // pieces read the fallback: the bench and the rail fence look as wood / trunk did
  assert.equal(pieceColours(bare, LIBRARY)('eventProps', 'parkBench').slatTop, bare.palette.wood);
  assert.equal(pieceColours(bare, LIBRARY)('fences', 'railFence').post, bare.palette.trunk);
  // defined: used as it is, and must be a colour
  const own = { ...bare, palette: { ...bare.palette, propWood: '#aa8855', propWoodDark: '#553311' } };
  assert.doesNotThrow(() => validateBiomeSet(own, LIBRARY));
  assert.equal(pieceColours(own, LIBRARY)('fences', 'railFence').postTop, '#aa8855');
  assert.equal(pieceColours(own, LIBRARY)('fences', 'ropeFence').post, '#553311');
  assert.throws(() => validateBiomeSet({ ...bare, palette: { ...bare.palette, propWood: 'brown' } }, LIBRARY), /palette\.propWood must be a colour/);
  // the big props keep `wood`
  for (const piece of Object.values(LIBRARY.bigProps)) for (const key of Object.values(piece.slots)) assert.ok(!(key in OPTIONAL_PALETTE_KEYS), key);
});
