// AP5: biome sets (DESIGN §8b): the format, the library pick list and the readability rules (ART_STYLE §4.4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBiomeSet, checkReadability, delta, parseColour, ALL_PALETTE_KEYS, PALETTE_KEYS, READABILITY } from '../src/core/biome.js';
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
  assert.throws(() => validateBiomeSet(withChange({ onTrees: ['palm'] }), LIBRARY), /onTrees: unknown piece "palm" \(the library's onTrees: roundTree\)/);
  assert.throws(() => validateBiomeSet(withChange({ onTrees: [] }), LIBRARY), /onTrees must list 1–3 pieces/);
  assert.throws(() => validateBiomeSet(withChange({ offTrees: ['coneTree', 'coneTree'] }), LIBRARY), /offTrees lists a piece twice/);
  assert.throws(() => validateBiomeSet(withChange({ sky: 'gradient' }), LIBRARY), /sky: unknown piece "gradient"/);
  assert.throws(() => validateBiomeSet(withChange({ backdrop: 'peaksSnow' }), LIBRARY), /backdrop: unknown piece "peaksSnow"/);
  assert.throws(() => validateBiomeSet(withChange({ bigProps: ['windmill'] }), LIBRARY), /bigProps: unknown piece "windmill" \(the library's bigProps: none yet\)/);
  assert.throws(() => validateBiomeSet(withChange({ textures: ['grassDabs'] }), LIBRARY), /textures: unknown piece "grassDabs"/);
  assert.throws(() => validateBiomeSet(withChange({ furniture: { ...base.furniture, flag: 'banner' } }), LIBRARY), /furniture\.flag: unknown piece "banner"/);
  assert.throws(() => validateBiomeSet(withChange({ smallProps: { pieces: ['grassTuft'] } }), LIBRARY), /smallProps: unknown piece "grassTuft"/);
  // a piece added to the library can be picked; small props need their scatter rule
  const lib = { ...LIBRARY, smallProps: { grassTuft: { slots: { blades: 'rough' } } } };
  assert.throws(() => validateBiomeSet(withChange({ smallProps: { pieces: ['grassTuft'] } }), lib), /smallProps\.perHa must be a number/);
  assert.ok(validateBiomeSet(withChange({ smallProps: { pieces: ['grassTuft'], perHa: 40, on: ['rough'] } }), lib));
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
  for (const [id, p] of Object.entries(ARTIST_R2)) {
    const fails = checkReadability(p).filter(r => !r.ok).map(r => r.id);
    assert.deepEqual(fails, [], id);
  }
  // the artist's palettes carry every artist key (only the engine group is the dev's)
  for (const p of Object.values(ARTIST_R2)) for (const k of Object.values(PALETTE_KEYS).slice(0, -1).flat()) assert.ok(parseColour(p[k]), k);
  assert.equal(READABILITY.length, new Set(READABILITY.map(r => r[0])).size);
});
