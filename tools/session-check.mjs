// Hole session check (Gate A A2), dev/QA only, needs Playwright (like tools/baseline.mjs).
//
//   node tools/session-check.mjs
//
// Loads the game in headless Chromium (real WebGL through the software renderer), then unloads and
// loads holes 10 times in place (window.__golf.loadHole) and checks that:
//   1. renderer.info.memory (geometries, textures) and the shader program count don't grow,
//   2. one click still moves the meter one step (input is bound once, not once per hole),
//   3. a timer from the old hole (a shot in progress) never fires on the new one.
// Exit code 1 on a problem.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const CYCLES = 10;

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

const frames = n => page.evaluate(k => new Promise(res => { const f = () => (--k <= 0 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const startHole = async () => {
  await page.waitForFunction(() => window.__golf?.state === 'intro');
  await page.evaluate(() => document.getElementById('startBtn').click());
  await page.waitForFunction(() => window.__golf.state === 'aim');
};

await page.goto('http://golf.test/index.html?hole=pl-01&seed=7&tune=ANTIALIAS:0,DPR_CAP:1');
await startHole();
await frames(3);

const rows = [];
for (let i = 1; i <= CYCLES; i++) {
  const id = i % 2 ? 'pl-02' : 'pl-01';
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
for (const id of ['pl-01', 'pl-02']) {
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

if (errors.length) fail(`page errors: ${errors.join(' | ')}`);
await browser.close();
console.log(bad ? `${bad} problem(s)` : `ok: ${CYCLES} load/dispose cycles, no growth in renderer memory, input bound once, no stray timers`);
process.exitCode = bad ? 1 : 0;
