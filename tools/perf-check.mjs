// Phone budget check (AP0), dev/QA only, needs Playwright (like tools/session-check.mjs).
//
//   node tools/perf-check.mjs                 report every hole, exit 0
//   node tools/perf-check.mjs --strict        exit 1 if any hole is over budget
//   node tools/perf-check.mjs --hole mtn-07   one hole (repeatable)
//   node tools/perf-check.mjs --biome test-alpine-look   every hole dressed in that biome set (AP6a, ?biome=)
//   node tools/perf-check.mjs --breakdown     also list the draw calls by kind of object (for AP1)
//
// Loads each hole fresh at 390x844 (a phone in portrait) in headless Chromium and reads
// window.__golf.perf() (src/game/perf.js):
//   - "tee off": the time from opening the link until the hole card's Tee off button is up,
//   - "flyover": the highest draw calls / triangles of any frame while the hole flyover plays
//     (the whole hole in view: the "mid-hole" worst case),
//   - "tee": the aiming view from the tee.
// Every number is checked against PERF_BUDGET (src/core/config.js) by src/core/perf.js. Headless
// fps (software WebGL) says nothing about a phone, so fps is printed but never rated here. The painted
// course map (AP6 replaces it) and the screen buffers are printed apart, never rated (PM on #75).
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { HOLES } from '../src/holes/sets.js';
import { PERF_BUDGET } from '../src/core/config.js';
import { overBudget } from '../src/core/perf.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const args = process.argv.slice(2);
const strict = args.includes('--strict'), showBreakdown = args.includes('--breakdown');
const only = args.flatMap((a, i) => (a === '--hole' ? [args[i + 1]] : []));
const biomeArg = args.flatMap((a, i) => (a === '--biome' ? [args[i + 1]] : []))[0];
const biomeQuery = biomeArg ? `&biome=${encodeURIComponent(biomeArg)}` : '';
const ids = only.length ? only : Object.keys(HOLES);
// Not rated here: headless fps is not a phone's. (The painted course map, one big canvas per hole of
// ~1500-2048 px that AP6 replaces by small tiling textures, is not in "max tex px" any more: it has its
// own unrated "map (AP6)" column, AP1.)
const SKIP = ['fps'];
const FLYOVER_MAX_MS = 20000; // a flyover that hasn't ended by then is skipped

const { chromium } = require('playwright');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.host !== 'golf.test') return route.abort();
  const file = join(ROOT, decodeURIComponent(url.pathname));
  if (!existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
  return route.fulfill({ body: readFileSync(file), contentType: TYPES[extname(file)] || 'text/plain' });
});

const frames = (page, n) => page.evaluate(k => new Promise(res => { const f = () => (--k <= 0 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

async function measure(id) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const t0 = Date.now();
  // Antialias / DPR as on a phone don't change draw calls or triangles; the defaults are kept.
  await page.goto(`http://golf.test/index.html?hole=${id}&seed=7${biomeQuery}`);
  await page.waitForFunction(() => window.__golf?.state === 'intro' && !document.getElementById('startBtn')?.disabled, null, { timeout: 60000 });
  const teeOffMs = Date.now() - t0;
  await page.evaluate(() => { window.__golf.perfResetPeak(); document.getElementById('startBtn').click(); });
  // The flyover: let it play (it runs on the real clock) and keep the peak frame
  let flyover = null;
  if (await page.evaluate(() => window.__golf.state === 'flyover')) {
    await page.waitForFunction(() => window.__golf.state !== 'flyover', null, { timeout: FLYOVER_MAX_MS }).catch(() => page.evaluate(() => window.__golf.skip()));
    flyover = await page.evaluate(() => window.__golf.perf());
  }
  await page.waitForFunction(() => window.__golf.state === 'aim');
  // After a flyover the camera eases back to the tee (CAM.flyover.easeTime, real clock): wait until it is still
  await page.waitForFunction(() => {
    const p = window.__golf.cameraAt().pos, w = window.__perfCam ?? (window.__perfCam = { x: NaN });
    const still = Math.abs(p.x - w.x) + Math.abs(p.y - w.y) + Math.abs(p.z - w.z) < 1e-3;
    window.__perfCam = { x: p.x, y: p.y, z: p.z };
    return still;
  }, null, { polling: 250, timeout: 20000 });
  await page.evaluate(() => window.__golf.perfResetPeak());
  await frames(page, 5);
  const tee = await page.evaluate(() => window.__golf.perf());
  const breakdown = showBreakdown ? await page.evaluate(() => window.__golf.perfBreakdown()) : null;
  await page.close();
  return { id, teeOffMs, tee, flyover, breakdown, errors };
}

const rows = [];
for (const id of ids) rows.push(await measure(id));
await browser.close();

const B = PERF_BUDGET, mark = (v, lim) => (v > lim ? '!' : ' ');
const k = n => `${(n / 1000).toFixed(0)}k`;
console.log(`Budget (PERF_BUDGET): draw calls ≤ ${B.drawCalls}, triangles ≤ ${k(B.triangles)}, graphics memory ≤ ${B.gpuMB} MB, textures ≤ ${B.textureSize} px. "!" = over.`);
console.log('hole    | tee off | tee draws | tee tris | flyover peak draws | flyover peak tris | geo | tex | max tex px | map (AP6) px | gpu MB (geo+tex) | screen MB | headless fps | over budget');
console.log('--------|---------|-----------|----------|--------------------|-------------------|-----|-----|------------|--------------|------------------|-----------|--------------|------------');
let anyOver = false;
for (const r of rows) {
  const t = r.tee, f = r.flyover;
  const over = [...new Set([
    ...overBudget(t, B, SKIP).map(x => `tee ${x}`),
    ...(f ? overBudget({ drawCalls: f.peakDrawCalls, triangles: f.peakTriangles }, B).map(x => `flyover ${x}`) : []),
  ])];
  if (over.length || r.errors.length) anyOver = true;
  console.log([
    r.id.padEnd(7), `${(r.teeOffMs / 1000).toFixed(1)} s`.padStart(7),
    `${t.drawCalls}${mark(t.drawCalls, B.drawCalls)}`.padStart(9), `${k(t.triangles)}${mark(t.triangles, B.triangles)}`.padStart(8),
    (f ? `${f.peakDrawCalls}${mark(f.peakDrawCalls, B.drawCalls)}` : 'none').padStart(18), (f ? `${k(f.peakTriangles)}${mark(f.peakTriangles, B.triangles)}` : 'none').padStart(17),
    String(t.geometries).padStart(3), String(t.textures).padStart(3), `${t.textureSize}${mark(t.textureSize, B.textureSize)}`.padStart(10),
    String(t.mapSize).padStart(12),
    `${t.gpuMB.toFixed(1)} (${t.geoMB.toFixed(1)}+${t.texMB.toFixed(1)})${mark(t.gpuMB, B.gpuMB)}`.padStart(16),
    t.screenMB.toFixed(1).padStart(9),
    t.fps.toFixed(0).padStart(12), over.join(', ') || 'ok',
  ].join(' | '));
}
for (const r of rows) if (r.errors.length) console.log(`BAD  ${r.id}: page errors: ${r.errors.join(' | ')}`);

if (showBreakdown) {
  for (const r of rows) {
    console.log(`\n${r.id}: draw calls by kind, most objects first (in the tee view / in the whole scene = flyover worst case; triangles in the tee view; materials)`);
    for (const b of [...r.breakdown].sort((x, y) => y.objects - x.objects).slice(0, 10)) console.log(`  ${String(b.inView).padStart(4)} / ${String(b.objects).padEnd(4)} ${b.kind.padEnd(40)} ${k(b.triangles).padStart(6)} tris  ${b.materials} mat`);
  }
}
if (strict && anyOver) { console.log('\nOver budget (--strict): exit 1'); process.exit(1); }
console.log(anyOver ? '\nSome holes are over budget (report only; --strict fails on this).' : '\nEvery hole is within budget.');
