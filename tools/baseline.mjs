// Baseline recorder / checker (task F0).
//
// Plays scripted shots in a real browser through window.__golf.testHit and records where
// each ball comes to rest. Run it once against the old pages to make
// tests/fixtures/baseline.json, then again after a change to compare.
//
//   node tools/baseline.mjs record                      writes tests/fixtures/baseline.json
//   node tools/baseline.mjs check   [--fps 60]          replays each recorded shot in the new page from its
//                                                       recorded start, prints differences, exit code 1 on a problem
//
// `record` plays everything at 60 fps (the reference) and again at 30 and 144 fps. The old code
// took a leftover partial physics step each frame, so its results depend on the frame rate; the
// fixture keeps all three so the tests can tell a real change from that old frame-rate wobble.
//
// Needs Playwright with a Chromium browser (not needed for `node --test`).
// Three.js is loaded from node_modules or THREE_MODULE=/path/to/three.module.js, so it works
// offline. The page clock is replaced with a fixed frame time (1/fps) so the result does not
// depend on how fast the machine is, Math.random is seeded, and the wind is forced to 0.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = join(ROOT, 'tests/fixtures/baseline.json');
const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const mode = args[0] || 'check';
const fpsArg = Number(args[args.indexOf('--fps') + 1]) || 60;
const pagesArg = args.includes('--pages') ? args[args.indexOf('--pages') + 1] : (mode === 'record' ? 'old' : 'new');

const NEUTRAL_LIE = 'tee.sweetScale:1,fairway.sweetScale:1,green.sweetScale:1,CURVE_SHAPE:1';
// Which page plays which hole. "old" = the pre-refactor files, "new" = the single index.html.
const PAGES = {
  old: { 'pl-01': 'index.html', 'pl-02': 'hole2.html' },
  // v1 checks physics only: replay with the old swing mapping (neutral lie window, linear curve),
  // same as tests/baseline.test.js.
  new: { 'pl-01': `index.html?hole=pl-01&tune=${NEUTRAL_LIE}`, 'pl-02': `index.html?hole=pl-02&tune=${NEUTRAL_LIE}` },
};

// Scripted shots. Each scenario loads the hole fresh, optionally drops the ball somewhere
// (hole 2 only had `place` before the refactor), then plays its shots one after another, each
// from wherever the previous one stopped. aimOff = radians added to the auto aim at the pin.
const SCENARIOS = [
  { hole: 'pl-01', name: 'h1 full then chip and putts', shots: [{ power: 1 }, { power: 0.5 }, { power: 0.8 }, { power: 0.9 }] },
  { hole: 'pl-01', name: 'h1 three-quarter tee shot', shots: [{ power: 0.85 }, { power: 0.7 }] },
  { hole: 'pl-01', name: 'h1 hook', shots: [{ power: 0.95, acc: 0.06 }] },
  { hole: 'pl-01', name: 'h1 slice', shots: [{ power: 0.95, acc: -0.06 }] },
  { hole: 'pl-01', name: 'h1 pulled into the pond', shots: [{ power: 0.6, aimOff: -0.22 }] },
  { hole: 'pl-01', name: 'h1 forced max slice', shots: [{ power: 0.9, acc: -0.2 }] },
  { hole: 'pl-02', name: 'h2 driver, then 3 wood', shots: [{ power: 1 }, { power: 1 }] },
  { hole: 'pl-02', name: 'h2 short drive into the hill', shots: [{ power: 0.7 }] },
  { hole: 'pl-02', name: 'h2 hook off the tee', shots: [{ power: 0.95, acc: 0.07 }] },
  { hole: 'pl-02', name: 'h2 approach from the lay-up zone', place: { x: 18, z: -330 }, shots: [{ power: 0.9 }, { power: 0.8 }] },
  { hole: 'pl-02', name: 'h2 uphill putt to the top tier', place: { x: 20, z: -430 }, shots: [{ power: 0.9 }, { power: 0.6 }] },
  { hole: 'pl-02', name: 'h2 downhill putt', place: { x: 28, z: -452 }, shots: [{ power: 0.35 }] },
  { hole: 'pl-02', name: 'h2 side-hill putt (breaks)', place: { x: 14, z: -446 }, shots: [{ power: 0.7 }] },
  { hole: 'pl-02', name: 'h2 left toward the pond', place: { x: 4, z: -250 }, shots: [{ power: 0.5, aimOff: -0.5 }] },
];

function threeSource() {
  const cands = [process.env.THREE_MODULE, join(ROOT, 'node_modules/three/build/three.module.js')].filter(Boolean);
  for (const c of cands) if (existsSync(c)) return readFileSync(c, 'utf8');
  try { return readFileSync(require.resolve('three/build/three.module.js'), 'utf8'); } catch { /* fall through */ }
  throw new Error('Three.js not found: set THREE_MODULE=/path/to/three.module.js (e.g. from `npm pack three@0.160.0`)');
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };

async function openBrowser(fps) {
  const { chromium } = require('playwright');
  // Fixed frame time: every rendered frame advances the game by exactly 1/fps seconds.
  const three = threeSource() + `\nClock.prototype.getDelta = function () { this.elapsedTime += ${1 / fps}; return ${1 / fps}; };\n`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 480, height: 320 } });
  await ctx.addInitScript(() => {
    // Run frames as fast as the CPU allows (each frame is still exactly 1/fps of game time)
    window.__noRender = true;
    window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 0);
    // Seeded Math.random (old pages use it for wind and lip-outs)
    let s = 12345;
    Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  });
  await ctx.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/three.module.js')) return route.fulfill({ body: three, contentType: 'text/javascript' });
    if (url.host !== 'golf.test') return route.abort();
    const file = join(ROOT, decodeURIComponent(url.pathname));
    if (!existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
    let body = readFileSync(file, 'utf8');
    // MSAA makes the software renderer very slow; it has no effect on the game
    body = body.replace('antialias: true', 'antialias: false');
    // Skip drawing entirely: only the game logic matters here, and it runs the same either way
    body = body.replace('renderer.render(scene, camera);', 'if (!window.__noRender) renderer.render(scene, camera);');
    return route.fulfill({ body, contentType: TYPES[extname(file)] || 'text/plain' });
  });
  return { browser, ctx };
}

async function startHole(ctx, hole) {
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(`http://golf.test/${PAGES[pagesArg][hole]}`);
  await page.waitForFunction(() => window.__golf && window.__golf.state === 'intro');
  await page.evaluate(() => document.getElementById('startBtn').click());
  await page.waitForFunction(() => window.__golf.state === 'aim');
  await page.evaluate(() => window.__golf.wind.set(0, 0, 0));
  return page;
}

// record: play each scenario's shots in a row, each from where the previous one stopped
async function run(fps) {
  const { browser, ctx } = await openBrowser(fps);
  const results = [];
  for (const sc of SCENARIOS) {
    const page = await startHole(ctx, sc.hole);
    if (sc.place) {
      await page.evaluate(([x, z]) => window.__golf.place(x, z), [sc.place.x, sc.place.z]);
    }
    for (const shot of sc.shots) {
      const start = await page.evaluate(() => {
        const g = window.__golf;
        return { x: g.ball.x, y: g.ball.y, z: g.ball.z, club: document.getElementById('clubName').textContent, aim: g.aim, strokes: g.strokes };
      });
      await page.evaluate(([p, a, off]) => { const g = window.__golf; g.aim = g.aim + off; g.testHit(p, a); }, [shot.power, shot.acc || 0, shot.aimOff || 0]);
      await page.waitForFunction(() => ['aim', 'result', 'holed'].includes(window.__golf.state), null, { timeout: 600000 });
      const end = await page.evaluate(() => {
        const g = window.__golf;
        return { x: g.ball.x, y: g.ball.y, z: g.ball.z, state: g.state, strokes: g.strokes,
          lie: document.getElementById('lieTxt').textContent };
      });
      results.push({ scenario: sc.name, hole: sc.hole, shot: { power: shot.power, acc: shot.acc || 0, aimOff: shot.aimOff || 0 }, start, end });
      process.stdout.write('.');
      if (end.state !== 'aim') break;
    }
    await page.close();
  }
  await browser.close();
  process.stdout.write('\n');
  return results;
}

// check: replay every recorded shot on its own, from its recorded start position (like
// tests/baseline.test.js), so one shot's difference doesn't carry into the next. Needs __golf.place.
async function replay(fps, shots) {
  const { browser, ctx } = await openBrowser(fps);
  const results = [];
  const pages = {};
  for (const shot of shots) {
    let page = pages[shot.hole] || (pages[shot.hole] = await startHole(ctx, shot.hole));
    if (!(await page.evaluate(() => typeof window.__golf.place === 'function'))) throw new Error('check needs window.__golf.place (the new index.html)');
    // Back to aiming (after a holed shot the result card is up)
    await page.waitForFunction(() => ['aim', 'result'].includes(window.__golf.state), null, { timeout: 600000 });
    if (await page.evaluate(() => window.__golf.state) === 'result') {
      await page.evaluate(() => document.getElementById('againBtn').click());
      await page.waitForFunction(() => window.__golf.state === 'aim');
    }
    const start = await page.evaluate(([x, z]) => {
      const g = window.__golf;
      g.wind.set(0, 0, 0); g.place(x, z);
      return { club: document.getElementById('clubName').textContent, aim: g.aim, strokes: g.strokes };
    }, [shot.start.x, shot.start.z]);
    await page.evaluate(([p, a, off]) => { const g = window.__golf; g.aim = g.aim + off; g.testHit(p, a); }, [shot.power, shot.acc, shot.aimOff]);
    await page.waitForFunction(() => ['aim', 'result', 'holed'].includes(window.__golf.state), null, { timeout: 600000 });
    const end = await page.evaluate(() => { const g = window.__golf; return { x: g.ball.x, z: g.ball.z, state: g.state, strokes: g.strokes }; });
    results.push({ start, end });
    process.stdout.write('.');
  }
  await browser.close();
  process.stdout.write('\n');
  return results;
}

const r6 = v => Math.round(v * 1e4) / 1e4;
if (mode === 'record') {
  const fps = 60;
  const results = await run(fps);
  const other = { 30: await run(30), 144: await run(144) };
  const out = {
    note: 'Golden shots recorded from the pre-refactor pages (index.html = hole 1, hole2.html = hole 2) by tools/baseline.mjs. ' +
      `Fixed frame time 1/${fps} s, wind 0, Math.random seeded. Positions in meters. A refactor must land within 0.5 m. ` +
      'endAtFps = the same shot in the old pages at 30 and 144 fps (null when that run reached the shot from a different spot).',
    recordedWith: { fps, otherFps: [30, 144], pages: PAGES.old },
    tolerance: 0.5,
    shots: results.map(r => ({
      scenario: r.scenario, hole: r.hole, ...r.shot,
      start: { x: r6(r.start.x), y: r6(r.start.y), z: r6(r.start.z), club: r.start.club, aim: r6(r.start.aim), strokes: r.start.strokes },
      end: { x: r6(r.end.x), y: r6(r.end.y), z: r6(r.end.z), state: r.end.state, strokes: r.end.strokes, lie: r.end.lie },
      // The same shot in the old pages at other frame rates (same start position)
      endAtFps: Object.fromEntries(Object.entries(other).map(([f, rs]) => {
        const o = rs.find(q => q.scenario === r.scenario && q.start.strokes === r.start.strokes);
        // Only comparable when that run hit this shot from (almost) the same place
        const same = o && Math.hypot(o.start.x - r.start.x, o.start.z - r.start.z) < 0.01;
        return [f, same ? { x: r6(o.end.x), z: r6(o.end.z), strokes: o.end.strokes } : null];
      })),
    })),
  };
  writeFileSync(FIXTURE, JSON.stringify(out, null, 2) + '\n');
  console.log(`wrote ${out.shots.length} shots to ${FIXTURE}`);
} else {
  const base = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const results = await replay(fpsArg, base.shots);
  let worst = 0, bad = 0;
  console.log('ok? | shot | club (old/new) | end (old) | end (new) | Δ m | strokes taken (old/new) | note');
  results.forEach((r, i) => {
    const b = base.shots[i];
    const off = e => Math.hypot(r.end.x - e.x, r.end.z - e.z);
    const d = off(b.end);
    const took = r.end.strokes - r.start.strokes, tookOld = b.end.strokes - b.start.strokes;
    let note = '';
    let close = d <= base.tolerance;
    if (!close) {
      // Same exception as tests/baseline.test.js: the old page itself landed this shot in different
      // places at different frame rates (its leftover partial step). Accept a match with one of those.
      const alts = Object.entries(b.endAtFps || {}).filter(([, e]) => e);
      const spread = Math.max(0, ...alts.map(([, e]) => Math.hypot(e.x - b.end.x, e.z - b.end.z)));
      const match = alts.find(([, e]) => off(e) <= base.tolerance && e.strokes - b.start.strokes === took);
      if (spread > base.tolerance && match) {
        close = true;
        note = `old page spread ${spread.toFixed(2)} m across frame rates; matches its ${match[0]} fps result (${off(match[1]).toFixed(3)} m)`;
      }
    }
    const ok = close && took === tookOld && r.start.club === b.start.club;
    if (!ok) bad++;
    worst = Math.max(worst, close ? 0 : d);
    console.log(`${ok ? 'ok ' : 'BAD'} | #${i + 1} ${b.scenario} p${b.power} a${b.acc} | ${b.start.club}/${r.start.club} | ` +
      `(${b.end.x.toFixed(2)}, ${b.end.z.toFixed(2)}) | (${r.end.x.toFixed(2)}, ${r.end.z.toFixed(2)}) | ${d.toFixed(3)} | ${tookOld}/${took} | ${note}`);
  });
  console.log(bad ? `${bad} problem(s)` : `all ${results.length} shots match`);
  process.exitCode = bad ? 1 : 0;
}
