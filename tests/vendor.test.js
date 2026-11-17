// Gate A C1: Three.js is committed in the repo and the page loads it from there, never from a CDN.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const VERSION = '0.160.0';
const SHA256 = '76dea8151bc9352aef3528b4262e249b2604f62543828328db978d060d61a495'; // build/three.module.js of three@0.160.0

test('the import map points at the vendored Three.js, not a CDN', () => {
  const html = read('index.html');
  const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
  assert.equal(map.imports.three, `./vendor/three-${VERSION}/three.module.js`);
  assert.doesNotMatch(html, /https?:\/\/(unpkg|cdn|esm\.sh|jsdelivr)/i, 'no CDN anywhere in the page');
});

test('the vendored file is the unmodified three@0.160.0 build, with its license', () => {
  const dir = `vendor/three-${VERSION}/`;
  const src = readFileSync(new URL(`${dir}three.module.js`, root));
  assert.equal(createHash('sha256').update(src).digest('hex'), SHA256);
  assert.match(src.subarray(0, 200).toString(), /@license[\s\S]*MIT/);
  assert.ok(existsSync(new URL(`${dir}LICENSE`, root)), 'LICENSE kept');
});

test('no game module imports from a URL', () => {
  for (const sub of ['src/core/', 'src/game/', 'src/holes/']) {
    for (const f of readdirSync(new URL(sub, root)).filter(f => f.endsWith('.js'))) {
      assert.doesNotMatch(read(sub + f), /from\s+['"]https?:/, `${sub}${f}`);
    }
  }
});
