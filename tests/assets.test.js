// AP3: the asset loader's pure part (core/assets.js) and model pieces in the library (DESIGN §8b).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { MODEL_PATH, MODEL_PICKS, modelPieceError, modelFiles, libraryModelFiles, pickedPieces, toLoad, loadingProgress, missingNotice } from '../src/core/assets.js';
import { validateBiomeSet } from '../src/core/biome.js';
import { LIBRARY } from '../src/biomes/library.js';
import { BIOMES } from '../src/biomes/index.js';
import { HOLES } from '../src/holes/sets.js';

const root = new URL('../', import.meta.url);

test('AP3: every model path in the library is a .glb under assets/ that exists on disk (a real glTF binary)', () => {
  const files = libraryModelFiles(LIBRARY);
  assert.ok(files.length >= 1, 'the test cube at least');
  for (const f of files) {
    assert.match(f, MODEL_PATH, f);
    const url = new URL(f, root);
    assert.ok(existsSync(url), `${f} is missing`);
    assert.ok(statSync(url).size > 20, f);
    assert.equal(readFileSync(url).subarray(0, 4).toString(), 'glTF', `${f} is not a glTF binary`);
  }
  // every model piece of the library passes the check (path + procedural fallback of its group)
  for (const [group, pieces] of Object.entries(LIBRARY)) for (const id of Object.keys(pieces)) assert.equal(modelPieceError(LIBRARY, group, id), null, `${group}.${id}`);
});

test('AP3: the test cube piece is the AP2 fixture, credited in assets/CREDITS.md', () => {
  assert.deepEqual(readFileSync(new URL('assets/models/test-cube.glb', root)), readFileSync(new URL('tests/fixtures/models/cube.glb', root)));
  assert.match(readFileSync(new URL('assets/CREDITS.md', root), 'utf8'), /assets\/models\/test-cube\.glb/);
});

test('AP3: which files a hole needs: only the test-models set names one; today\'s sets need nothing (no loading card)', () => {
  for (const [id, set] of Object.entries(BIOMES)) {
    assert.deepEqual(modelFiles(set, LIBRARY), id === 'test-models' ? ['assets/models/test-cube.glb'] : [], id);
  }
  // no hole uses the dev-only set
  for (const h of Object.values(HOLES)) assert.notEqual(h.biome, 'test-models', h.id);
  // each file once, sorted, whatever picks it
  const lib = { ...LIBRARY, rocks: { ...LIBRARY.rocks, cubeRock: { desc: 'x', slots: { body: 'boulder' }, model: 'assets/models/test-cube.glb', fallback: 'roundBoulder', tris: 12 } } };
  assert.deepEqual(modelFiles({ ...BIOMES['test-models'], rocks: ['cubeRock'] }, lib), ['assets/models/test-cube.glb']);
  assert.deepEqual(pickedPieces(BIOMES['test-models']).filter(([g]) => g === 'furniture').map(([, id]) => id), ['clothFlag', 'testCubeMarkers', 'whiteStakes', 'flatPond']);
});

test('AP3: a model piece must name a .glb path under assets/ and a procedural fallback of its group', () => {
  const lib = model => ({ ...LIBRARY, rocks: { ...LIBRARY.rocks, m: { desc: 'x', slots: { body: 'boulder' }, fallback: 'roundBoulder', tris: 12, ...model } } });
  const err = model => modelPieceError(lib(model), 'rocks', 'm');
  assert.equal(err({ model: 'assets/models/rock-a.glb' }), null);
  assert.equal(err({ model: 'assets/rock.glb' }), null);
  for (const bad of ['models/rock.glb', 'assets/models/rock.gltf', 'assets/models/Rock.glb', 'assets/../rock.glb', '/assets/rock.glb', 'https://x.test/assets/rock.glb', 'assets/models/rock.GLB', 42, '']) {
    assert.match(err({ model: bad }), /must be a \.glb file path under assets\//, String(bad));
  }
  assert.match(err({ model: 'assets/r.glb', fallback: undefined }), /needs a fallback/);
  assert.match(err({ model: 'assets/r.glb', fallback: 'coneTree' }), /needs a fallback/); // not a rocks piece
  const twoModels = { ...lib({ model: 'assets/r.glb', fallback: 'n' }), rocks: { ...lib({ model: 'assets/r.glb', fallback: 'n' }).rocks, n: { desc: 'x', slots: {}, model: 'assets/n.glb', fallback: 'roundBoulder' } } };
  assert.match(modelPieceError(twoModels, 'rocks', 'm'), /must be a procedural piece/);
  // validateBiomeSet runs it on the pieces a set picks, and only the picks that can draw a model may use one
  const set = { ...BIOMES['meadow-day'], id: 'x-models', rocks: ['m'] };
  assert.ok(validateBiomeSet(set, lib({ model: 'assets/r.glb' })));
  assert.throws(() => validateBiomeSet(set, lib({ model: 'assets/r.png' })), /biome set "x-models": rocks: piece "m" model must be a \.glb/);
  const treeLib = { ...LIBRARY, onTrees: { ...LIBRARY.onTrees, t: { ...LIBRARY.onTrees.roundTree, model: 'assets/t.glb', fallback: 'roundTree' } } };
  assert.throws(() => validateBiomeSet({ ...set, rocks: ['roundBoulder'], onTrees: ['t'] }, treeLib), /onTrees: piece "t" is a model, and onTrees can't draw a model yet/);
  const flagLib = { ...LIBRARY, furniture: { ...LIBRARY.furniture, f: { ...LIBRARY.furniture.clothFlag, model: 'assets/f.glb', fallback: 'clothFlag' } } };
  assert.throws(() => validateBiomeSet({ ...set, rocks: ['roundBoulder'], furniture: { ...set.furniture, flag: 'f' } }, flagLib), /furniture\.flag can't draw a model yet/);
  assert.deepEqual(MODEL_PICKS, ['rocks', 'furniture.teeMarkers']);
});

test('AP3: what to fetch, the loading text and the missing-file notice', () => {
  const known = new Set(['assets/a.glb']);
  assert.deepEqual(toLoad(['assets/a.glb', 'assets/b.glb'], p => known.has(p)), ['assets/b.glb']);
  assert.deepEqual(toLoad([], () => false), []);
  assert.deepEqual(loadingProgress(0, 3), { pct: 0, text: 'Loading… 0%' });
  assert.deepEqual(loadingProgress(1, 3), { pct: 33, text: 'Loading… 33%' });
  assert.deepEqual(loadingProgress(3, 3), { pct: 100, text: 'Loading… 100%' });
  assert.equal(loadingProgress(0, 0).pct, 100);
  assert.equal(missingNotice([]), '');
  assert.match(missingNotice(['assets/models/x.glb']), /Couldn't load a model \(assets\/models\/x\.glb\), so simple stand-ins are drawn instead\./);
  assert.match(missingNotice(['assets/a.glb', 'assets/b.glb']), /2 models \(assets\/a\.glb, assets\/b\.glb\)/);
});

test('AP3: core/assets.js stays pure (no Three.js, no DOM)', () => {
  const src = readFileSync(new URL('src/core/assets.js', root), 'utf8');
  assert.doesNotMatch(src, /from ['"]three|document\.|window\.|fetch\(/);
});
