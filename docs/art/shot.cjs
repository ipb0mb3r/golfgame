// Artist screenshot helper (not game code). Serves the repo through Playwright's request routing, so no local
// web server is needed (background servers are blocked in the cloud sessions). — Agent: artist
//   node docs/art/shot.cjs <page + query> <out.png|out.jpg> [dpr=2] [--game]
//   node docs/art/shot.cjs "docs/art/cow/cow.html?opts=A,B,C&far=0" /tmp/x.png 1          (a mock-up page: waits for title "ready")
//   node docs/art/shot.cjs "index.html?hole=dev-deep-rough&biome=meadow-day&scenario=dr-fairway" /tmp/g.png 1 --game
// --game: the real game; waits 3 s, presses "Tee off" on the hole card, waits 5 s. Phone size 390 × 844.
// Use dpr 1 for your own checks, 2 for pictures the owner sees. Run it from any folder (Playwright is preinstalled).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
(async () => {
  const args = process.argv.slice(2), game = args.includes('--game'), [page, out, dpr] = args.filter(a => a !== '--game');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: Number(dpr || 2) });
  await p.route('http://repo.local/**', r => {
    const f = path.join(ROOT, decodeURIComponent(new URL(r.request().url()).pathname));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  p.on('pageerror', e => console.log('page error:', e.message));
  await p.goto('http://repo.local/' + page);
  if (game) {
    await p.waitForTimeout(3000);
    await p.locator('button', { hasText: 'Tee off' }).click({ timeout: 15000, force: true }).catch(() => console.log('no "Tee off" button (the set may have failed to load: see page error)'));
    await p.waitForTimeout(5000);
  } else await p.waitForFunction(() => document.title === 'ready', null, { timeout: 60000 }).catch(() => console.log('timeout'));
  await p.screenshot({ path: out, type: out.endsWith('jpg') ? 'jpeg' : 'png', ...(out.endsWith('jpg') ? { quality: 88 } : {}) });
  await b.close();
})();
