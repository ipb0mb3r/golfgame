// Hole session check (Gate A A2), dev/QA only, needs Playwright (like tools/baseline.mjs).
//
//   node tools/session-check.mjs
//
// Loads the game in headless Chromium (real WebGL through the software renderer), then unloads and
// loads holes 10 times in place (window.__golf.loadHole) and checks that:
//   1. renderer.info.memory (geometries, textures) and the shader program count don't grow,
//   2. one click still moves the meter one step (input is bound once, not once per hole),
//   3. a timer from the old hole (a shot in progress) never fires on the new one,
//   4. the model loaders (AP2) work: the test models in tests/fixtures/models/ load through the import
//      map (three/addons/ GLTFLoader, the Meshopt decoder for cube-meshopt.glb), draw, and are freed,
//   5. the asset loader (AP3): a round dressed in the test-models set (?biome=test-models) shows the loading
//      bar, loads the model file once, plays on to hole 2 without fetching it again (cache hit), and after
//      quitting to the menu renderer memory is back where it was; a missing file shows the notice and the
//      procedural fallback, never a crash; a hole without model files never shows the loading bar.
// Exit code 1 on a problem.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const CYCLES = 12;
const ORDER = ['pl-02', 'pl-01', 'pl-03']; // K: hole 3 adds tree, leaf and boulder meshes and collider outlines

const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 664 } })).newPage();
await page.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.host !== 'golf.test') return route.abort();
  const file = join(ROOT, decodeURIComponent(url.pathname));
  if (!existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
  return route.fulfill({ body: readFileSync(file), contentType: TYPES[extname(file)] || 'text/plain' });
});
const errors = [];
page.on('pageerror', e => errors.push(e.message));
// AP3: count the fetches of the test model, and let step 5 slow it down or make it fail
const MODEL = 'assets/models/test-cube.glb';
let modelFetches = 0, modelMode = 'ok';
await page.route(`**/${MODEL}`, async route => {
  modelFetches++;
  if (modelMode === 'missing') return route.fulfill({ status: 404, body: 'not found' });
  await new Promise(r => setTimeout(r, 400)); // long enough to see the loading bar
  return route.fallback();
});

const frames = n => page.evaluate(k => new Promise(res => { const f = () => (--k <= 0 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const startHole = async () => {
  await page.waitForFunction(() => window.__golf?.state === 'intro');
  await page.evaluate(() => document.getElementById('startBtn').click());
  await page.waitForFunction(() => { const g = window.__golf; if (g.state === 'flyover') g.skip(); return g.state === 'aim'; });
};

await page.goto('http://golf.test/index.html?hole=pl-01&seed=7&tune=ANTIALIAS:0,DPR_CAP:1');
await startHole();
await frames(3);

const rows = [];
for (let i = 1; i <= CYCLES; i++) {
  const id = ORDER[(i - 1) % ORDER.length];
  // Leave a shot in flight on the old hole: its "next shot" timer must die with the session
  await page.evaluate(() => window.__golf.testHit(0.3, 0));
  await page.evaluate(h => window.__golf.loadHole(h), id);
  await startHole();
  await frames(3);
  rows.push({ cycle: i, hole: id, ...(await page.evaluate(() => window.__golf.renderInfo())) });
}

let bad = 0;
const fail = msg => { bad++; console.log(`BAD  ${msg}`); };
console.log('cycle | hole  | geometries | textures | programs');
for (const r of rows) console.log(`${String(r.cycle).padStart(5)} | ${r.hole} | ${String(r.geometries).padStart(10)} | ${String(r.textures).padStart(8)} | ${r.programs}`);
for (const id of ORDER) {
  const mine = rows.filter(r => r.hole === id), first = mine[0], last = mine.at(-1);
  for (const k of ['geometries', 'textures', 'programs']) {
    if (last[k] > first[k]) fail(`${id}: ${k} grew from ${first[k]} to ${last[k]} over ${mine.length} loads`);
  }
}

// One click = one meter step
const phase = await page.evaluate(() => { window.__golf.swing(); return window.__golf.meter.phase; });
if (phase !== 'power') fail(`one click moved the meter to "${phase}" (expected "power"): input bound more than once?`);

// The old hole's timers: after a full stop delay the new hole must still be aiming (no stray prepare/result)
await page.evaluate(() => window.__golf.loadHole('pl-01'));
await startHole();
await page.waitForTimeout(2500);
const st = await page.evaluate(() => [window.__golf.state, window.__golf.strokes]);
if (st[0] !== 'aim' || st[1] !== 0) fail(`a timer from the old hole changed the new one (state ${st[0]}, strokes ${st[1]})`);

// 3b. AP5: a hole dressed in another biome set (?biome=meadow-day) draws with that set's colours and
// frees like any other: pl-01 dressed (its level), mtn-07 three times (no growth), then pl-01 must be back
// to its own dressed level. X34: like with like (pl-01 meadow-day vs pl-01 meadow-day): plain pl-01
// legitimately holds other pieces since #107 (meadow-day picks gradient trees).
// AP7c: the same for the dev set test-small-props (its small props drawn on mtn-07, then freed with the hole).
for (const biomeId of ['meadow-day', 'test-small-props', 'test-big-props']) {
  await page.goto(`http://golf.test/index.html?hole=mtn-07&biome=${biomeId}&seed=7&tune=ANTIALIAS:0,DPR_CAP:1`);
  await startHole(); await frames(3);
  const { BIOMES } = await import('../src/biomes/index.js');
  const got = await page.evaluate(() => ({ biome: window.__golf.biome, ground: window.__golf.groundColour, badge: document.getElementById('biomeBadge').textContent }));
  if (got.biome !== biomeId || got.ground !== BIOMES[biomeId].palette.farGround || got.badge !== `BIOME: ${biomeId}`) fail(`?biome=${biomeId}: drawn with ${JSON.stringify(got)}`);
  // AP7c: the small props are drawn (since #124 meadow-day has them too; they are freed with the hole, see the memory checks below)
  const props = await page.evaluate(() => window.__golf.smallProps());
  if (biomeId !== 'test-big-props' && !props?.drawn) fail(`?biome=${biomeId} mtn-07: no small props drawn ${JSON.stringify(props)}`);
  // AP7e: the big props of test-big-props are drawn on mtn-07 (and freed with the hole, same memory checks)
  const big = await page.evaluate(() => window.__golf.bigProps());
  if (biomeId === 'test-big-props' && !big?.drawn) fail(`?biome=${biomeId} mtn-07: no big props drawn ${JSON.stringify(big)}`);
  await page.evaluate(() => window.__golf.loadHole('pl-01')); await startHole(); await frames(3);
  const ref = await page.evaluate(() => window.__golf.renderInfo());
  const seen = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__golf.loadHole('mtn-07')); await startHole(); await frames(3);
    seen.push(await page.evaluate(() => window.__golf.renderInfo()));
  }
  for (const k of ['geometries', 'textures']) if (seen[2][k] > seen[0][k]) fail(`?biome=${biomeId} mtn-07: ${k} grew from ${seen[0][k]} to ${seen[2][k]}`);
  await page.evaluate(() => window.__golf.loadHole('pl-01')); await startHole(); await frames(3);
  const back = await page.evaluate(() => window.__golf.renderInfo());
  if (back.geometries !== ref.geometries || back.textures !== ref.textures) fail(`?biome=${biomeId}: after mtn-07, pl-01 holds ${back.geometries} geometries / ${back.textures} textures (${ref.geometries} / ${ref.textures} before it, same set): mtn-07 not freed`);
  console.log(`biome: mtn-07 ?biome=${biomeId} drawn with ${got.biome} (far ground ${got.ground}), 3 loads ${seen.map(s => s.geometries).join('/')} geometries, then pl-01 ${back.geometries} (same as pl-01 ${biomeId} before mtn-07: ${ref.geometries})${props ? `; small props ${props.drawn} of ${props.scattered} drawn, ${props.drawCalls} draw calls` : ''}${biomeId === 'test-big-props' ? `; big props ${big?.drawn} drawn, ${big?.drawCalls} draw calls` : ''}`);
}

// 4. The loaders (AP2): no game feature loads models yet (AP3 / AP7), so this is the only place they run.
// Each model is drawn once by its own small renderer, then freed: its geometries must go back to 0.
const models = await page.evaluate(async () => {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js');
  const renderer = new THREE.WebGLRenderer({ canvas: document.createElement('canvas') });
  renderer.setSize(64, 64);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const out = { revision: THREE.REVISION, models: [] };
  for (const name of ['cube.glb', 'cube-meshopt.glb']) {
    const gltf = await loader.loadAsync(`tests/fixtures/models/${name}`);
    const meshes = [];
    gltf.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
    cam.position.set(1.5, 1.5, 1.5); cam.lookAt(0, 0, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 1), gltf.scene);
    renderer.render(scene, cam);
    const drawn = { geometries: renderer.info.memory.geometries, calls: renderer.info.render.calls };
    for (const m of meshes) { m.geometry.dispose(); m.material.dispose(); }
    renderer.renderLists.dispose();
    out.models.push({ name, meshes: meshes.length, vertices: meshes[0]?.geometry.attributes.position.count,
      indices: Array.from(meshes[0]?.geometry.index.array ?? []).join(','), drawn, freed: renderer.info.memory.geometries });
  }
  renderer.dispose();
  renderer.forceContextLoss();
  return out;
});
const [plain, packed] = models.models;
console.log(`loaders: three r${models.revision}; ${models.models.map(m => `${m.name}: ${m.meshes} mesh, ${m.vertices} vertices, ${m.indices.split(',').length / 3} triangles, drawn (${m.drawn.calls} draw call, ${m.drawn.geometries} geometry), ${m.freed} geometries after freeing`).join('; ')}`);
for (const m of models.models) {
  if (m.meshes !== 1 || m.vertices !== 24 || m.drawn.calls !== 1) fail(`loaders: ${m.name} did not load as one 24-vertex mesh drawn in one call`);
  if (m.freed !== 0) fail(`loaders: ${m.name} left ${m.freed} geometries after freeing`);
}
if (packed.indices !== plain.indices) fail('loaders: cube-meshopt.glb decoded to other indices than cube.glb (Meshopt decoder)');

// 5. The asset loader (AP3)
{
  const ev = fn => page.evaluate(fn);
  // a hole whose set has no model files: built at once, no loading bar, nothing in the cache
  await page.goto('http://golf.test/index.html?hole=pl-01&seed=7&tune=ANTIALIAS:0,DPR_CAP:1');
  await page.waitForFunction(() => window.__golf?.state === 'intro');
  const plain = await ev(() => ({ bar: !document.getElementById('introLoad').hidden, files: window.__golf.assets.files }));
  if (plain.bar || plain.files) fail(`AP3: pl-01 without models showed the loading bar or cached files (${JSON.stringify(plain)})`);
  // the menu's memory with no hole: the level a quit must come back to
  await ev(() => window.__golf.app.toMenu());
  await frames(2);
  const menuMem = await ev(() => window.__golf.renderInfo());
  // a 3-hole round in the test set: the loading bar shows, then the hole with the model markers
  modelFetches = 0;
  await page.goto('http://golf.test/index.html?set=prototype3&biome=test-models&seed=7&tune=ANTIALIAS:0,DPR_CAP:1');
  await page.waitForFunction(() => window.__golf?.state === 'loading');
  const bar = await ev(() => ({ bar: !document.getElementById('introLoad').hidden, text: document.querySelector('#introLoad span').textContent, disabled: document.getElementById('startBtn').disabled }));
  if (!bar.bar || !bar.disabled || !/Loading… \d+%/.test(bar.text)) fail(`AP3: no loading bar while the model loads (${JSON.stringify(bar)})`);
  await startHole(); await frames(3);
  const h1 = await ev(() => ({ names: window.__golf.objectNames(), files: window.__golf.assets.files, mem: window.__golf.renderInfo(), notice: document.getElementById('introAssetNotice').hidden, bar: !document.getElementById('introLoad').hidden }));
  if (!h1.names.includes('tee markers (instanced, model)')) fail(`AP3: hole 1 tee markers not drawn from the model (${h1.names.filter(n => n.startsWith('tee')).join(', ')})`);
  if (h1.files !== 1 || !h1.notice || h1.bar) fail(`AP3: hole 1 cache ${h1.files} files, notice hidden ${h1.notice}, bar ${h1.bar}`);
  // play hole 1 out (ball next to the cup, putt until it is over) and go on to hole 2
  await ev(() => { const c = window.__golf.HOLE; window.__golf.place(c.x, c.z + 0.6); });
  for (let k = 0; k < 20 && !(await ev(() => window.__golf.round.cards.length)); k++) {
    if (await ev(() => window.__golf.state) === 'aim') await ev(() => window.__golf.testHit(Math.max(0.05, window.__golf.play.pinPower()), 0));
    await ev(() => window.__golf.skip());
    await page.waitForTimeout(250);
  }
  await ev(() => window.__golf.nextHole());
  const atOnce = await ev(() => window.__golf.state); // a cache hit: built at once, never 'loading'
  await startHole(); await frames(3);
  const h2 = await ev(() => ({ hole: window.__golf.hole, index: window.__golf.round.index, names: window.__golf.objectNames(), files: window.__golf.assets.files }));
  if (h2.index !== 1 || atOnce === 'loading' || !h2.names.includes('tee markers (instanced, model)')) fail(`AP3: hole 2 (${h2.hole}) was not a cache hit (state ${atOnce}, ${JSON.stringify(h2.names.filter(n => n.startsWith('tee')))})`);
  if (modelFetches !== 1) fail(`AP3: the model was fetched ${modelFetches} times over 2 holes of a round (expected once)`);
  // quit to the menu: the cache is freed, memory is back to the menu's level
  await ev(() => window.__golf.app.toMenu());
  await frames(2);
  const quit = await ev(() => ({ mem: window.__golf.renderInfo(), files: window.__golf.assets.files }));
  if (quit.files !== 0 || quit.mem.geometries !== menuMem.geometries || quit.mem.textures !== menuMem.textures) fail(`AP3: after quitting, ${quit.files} cached files, ${quit.mem.geometries} geometries / ${quit.mem.textures} textures (menu: ${menuMem.geometries} / ${menuMem.textures})`);
  console.log(`assets: ?set=prototype3&biome=test-models: loading bar "${bar.text}", hole 1 ${h1.mem.geometries} geometries with the model markers, hole 2 (${h2.hole}) a cache hit (${modelFetches} fetch in the round), after quit ${quit.mem.geometries} geometries / ${quit.files} cached files (menu ${menuMem.geometries})`);
  // a missing file: the notice names it, the procedural markers are drawn, the hole plays
  modelMode = 'missing';
  await page.goto('http://golf.test/index.html?hole=pl-01&biome=test-models&seed=7&tune=ANTIALIAS:0,DPR_CAP:1');
  await page.waitForFunction(() => window.__golf?.state === 'intro');
  const missing = await ev(() => { const n = document.getElementById('introAssetNotice'); return { names: window.__golf.objectNames(), shown: !n.hidden, text: n.textContent, bar: !document.getElementById('introLoad').hidden }; });
  if (!missing.names.includes('tee markers (instanced)') || !missing.shown || !missing.text.includes(MODEL) || missing.bar) fail(`AP3: missing file: ${JSON.stringify({ ...missing, names: missing.names.filter(n => n.startsWith('tee')) })}`);
  await startHole();
  const playable = await ev(() => { window.__golf.testHit(0.3, 0); return window.__golf.strokes; });
  if (playable !== 1) fail(`AP3: the hole with a missing model did not play (strokes ${playable})`);
  console.log(`assets: missing file → "${missing.text}" and the procedural tee markers; the hole plays`);
  modelMode = 'ok';
}

if (errors.length) fail(`page errors: ${errors.join(' | ')}`);
await browser.close();
console.log(bad ? `${bad} problem(s)` : `ok: ${CYCLES} load/dispose cycles, no growth in renderer memory, input bound once, no stray timers, model loaders ok, asset loader ok (load, cache hit, freed on quit, fallback)`);
process.exitCode = bad ? 1 : 0;
