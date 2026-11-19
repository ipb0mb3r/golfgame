// Gate A C1: Three.js is committed in the repo and the page loads it from there, never from a CDN.
// AP2 (X6): upgraded to r187, with the model loader add-ons under addons/ (the npm package's examples/jsm/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const VERSION = '0.187.0';
const DIR = `vendor/three-${VERSION}/`;
// Every vendored file, unmodified from the npm package three@0.187.0 (path in the package after the
// arrow), with its sha256. vendor/three-<version>/README.md lists the same hashes.
const FILES = {
  'three.module.js': '104f56145899722094556490d787aae0617cc2fc3382f31df02d724ea1aee341', // build/three.module.js
  'three.core.js': '613e370f76638fdef83926642bf256dc9615684922de1ce1f63a8583e5d78578', // build/three.core.js
  'LICENSE': '8b378ebe60e2fe500158cb0ac71cb5e8b7d92953c2abcc63a0eb90499653b5bc', // LICENSE
  'addons/loaders/GLTFLoader.js': '532ac726e120039acbcd6cf54328c57acbf7b438176afaa6951257126d11bff1', // examples/jsm/loaders/
  'addons/utils/BufferGeometryUtils.js': '7bda2a8ba836b2bcf67cb938d4b9e1bb5d1b1bc616817103ed858c0b58296ce7', // examples/jsm/utils/
  'addons/utils/SkeletonUtils.js': 'b1632a703206c3d830de9fcbe515696770d04b71a15ee6b50afa6d2c3298c86f', // examples/jsm/utils/
  'addons/libs/meshopt_decoder.module.js': 'd428e73a000057c6c94bfcedc3412d0c2dc14ca8800e88553aab05113ad2bf19', // examples/jsm/libs/
};
const listDir = (d, pre = '') => readdirSync(new URL(d, root), { withFileTypes: true })
  .flatMap(e => (e.isDirectory() ? listDir(`${d}${e.name}/`, `${pre}${e.name}/`) : [`${pre}${e.name}`]));

test('the import map points at the vendored Three.js and its add-ons, not a CDN', () => {
  const html = read('index.html');
  const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(map.imports, { three: `./${DIR}three.module.js`, 'three/addons/': `./${DIR}addons/` });
  assert.doesNotMatch(html, /https?:\/\/(unpkg|cdn|esm\.sh|jsdelivr)/i, 'no CDN anywhere in the page');
});

test(`only one Three.js is vendored: three@${VERSION}`, () => {
  assert.deepEqual(readdirSync(new URL('vendor/', root)), [`three-${VERSION}`]);
});

test(`the vendored files are the unmodified three@${VERSION} files, with its license, and nothing else`, () => {
  assert.deepEqual(listDir(DIR).filter(f => f !== 'README.md').sort(), Object.keys(FILES).sort(), 'every file is listed with its hash');
  for (const [f, sha] of Object.entries(FILES)) {
    assert.equal(createHash('sha256').update(readFileSync(new URL(DIR + f, root))).digest('hex'), sha, f);
  }
  for (const f of ['three.module.js', 'three.core.js']) assert.match(read(DIR + f).slice(0, 200), /@license[\s\S]*MIT/, f);
  assert.match(read(`${DIR}three.core.js`), /const REVISION = '187';/);
  const readme = read(`${DIR}README.md`);
  for (const sha of Object.values(FILES)) assert.ok(readme.includes(sha), `README lists ${sha}`);
});

test('the add-ons import only "three" and files that are vendored with them', () => {
  for (const f of Object.keys(FILES).filter(f => f.startsWith('addons/'))) {
    for (const [, spec] of read(DIR + f).matchAll(/^\s*(?:import|export)\b[^'";]*?from\s+['"]([^'"]+)['"]/gm)) {
      if (spec === 'three') continue;
      assert.ok(spec.startsWith('.'), `${f} imports ${spec}`);
      const target = new URL(spec, new URL(DIR + f, root)).pathname.split(`/${DIR}`)[1];
      assert.ok(target in FILES, `${f} imports ${spec}, which is not vendored`);
    }
  }
});

test('no game module imports from a URL', () => {
  for (const sub of ['src/core/', 'src/game/', 'src/holes/']) {
    for (const f of readdirSync(new URL(sub, root)).filter(f => f.endsWith('.js'))) {
      assert.doesNotMatch(read(sub + f), /from\s+['"]https?:/, `${sub}${f}`);
    }
  }
});

test('the loader test models are the ones tools/make-test-glb.mjs writes (GLB 2.0)', () => {
  for (const f of ['cube.glb', 'cube-meshopt.glb']) {
    const b = readFileSync(new URL(`tests/fixtures/models/${f}`, root));
    assert.equal(b.toString('latin1', 0, 4), 'glTF', f);
    assert.equal(b.readUInt32LE(4), 2, f);
    assert.equal(b.readUInt32LE(8), b.length, f);
  }
});
