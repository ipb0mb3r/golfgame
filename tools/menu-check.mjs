// Menu check (Phase 7, M6), dev/QA only, needs Playwright (like tools/session-check.mjs).
//
//   node tools/menu-check.mjs
//
// Opens the game with no address-bar options (so it lands on the main menu) in headless Chromium and
// clicks through the menus like a player:
//   1. every menu path (each Solo course, each Practice hole, each test spot) reaches a playable hole
//      (Tee off with Space or Enter → aiming, QA R-1), then quits back to the menu,
//   2. the wind on the first card is the wind you play (no re-roll on Tee off),
//   3. menu → play → quit → play again, 6 times: no leftover state (no hole, no round, no timers,
//      strokes back to 0, no open card, renderer memory back to the same numbers),
//   4. the pause menu: Esc and the button pause, a swing in progress is cancelled, Restart hole gives
//      the same hole and wind, quitting a round asks first,
//   5. a whole round from the menu (Prototype 3): summary cards, the compact hole card starts with
//      Space, the scorecard, its Menu button,
//   6. settings are saved (and a page without storage still starts).
// Exit code 1 on a problem.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const { chromium } = require('playwright');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
await ctx.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.host !== 'golf.test') return route.abort();
  const file = join(ROOT, decodeURIComponent(url.pathname));
  if (!existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
  return route.fulfill({ body: readFileSync(file), contentType: TYPES[extname(file)] || 'text/plain' });
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

let bad = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { bad++; console.log(`BAD  ${msg}`); } };
const ev = (fn, arg) => page.evaluate(fn, arg);
const frames = n => ev(k => new Promise(res => { const f = () => (--k <= 0 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const click = sel => page.click(sel);
const app = () => ev(() => { const a = window.__golf.app; return { menu: a.menu, playing: a.playing, paused: a.paused, timers: a.timers, game: a.game }; });
const visible = id => ev(i => { const e = document.getElementById(i); return !!e && !e.classList.contains('hidden') && !e.hidden && getComputedStyle(e).display !== 'none'; }, id);
const wind = () => ev(() => { const w = window.__golf.wind; return [w.x, w.z].map(v => +v.toFixed(6)).join(','); });

await page.goto('http://golf.test/index.html');
await page.waitForFunction(() => window.__golfStarted && window.__golf?.app);

// --- The landing page is the main menu ---
let a = await app();
ok(a.menu === 'main' && !a.playing, `lands on the main menu (menu=${a.menu}, playing=${a.playing})`);
ok(!(await visible('intro')), 'no intro card behind the main menu');

// Every item a screen lists: [data-launch] buttons
async function items(path) {
  await ev(() => window.__golf.app.toMenu('main'));
  for (const go of path) await click(`#menu [data-screen]:not([hidden]) [data-go="${go}"]`);
  return ev(() => [...document.querySelectorAll('#menu [data-screen]:not([hidden]) [data-launch]')].map(b => b.dataset.id));
}
async function openItem(path, id) {
  await items(path);
  await click(`#menu [data-screen]:not([hidden]) [data-id="${id}"]`);
}
// From an intro card (full or compact) to aiming, with the keyboard (QA R-1). Returns the wind seen on the card.
async function teeOff(key = 'Space') {
  await page.waitForFunction(() => window.__golf.state === 'intro');
  await frames(2);
  const before = await wind();
  await ev(() => document.activeElement?.blur());
  await page.keyboard.press(key);
  await page.waitForFunction(() => window.__golf.state === 'aim', null, { timeout: 5000 }).catch(() => {});
  const st = await ev(() => window.__golf.state);
  return { before, after: await wind(), st };
}

// --- 1 + 2: every menu path reaches a playable hole ---
const solo = await items(['play', 'solo']);
const practice = await items(['play', 'practice']);
ok(solo.includes('prototype3') && solo.includes('test9'), `Solo lists the prototype courses (${solo.join(', ')})`);
ok(!solo.includes('practice'), 'the practice set is not a Solo course');
ok(await ev(() => document.getElementById('mode-ai')?.disabled === true), 'vs AI is shown but disabled');
const paths = [...solo.map(id => [['play', 'solo'], id]), ...practice.map(id => [['play', 'practice'], id])];
let n = 0;
for (const [path, id] of paths) {
  await openItem(path, id);
  const r = await teeOff(n++ % 2 ? 'Enter' : 'Space');
  ok(r.st === 'aim', `${id}: reaches a playable hole (state ${r.st})`);
  ok(r.before === r.after, `${id}: the wind on the card is the wind you play (${r.before} → ${r.after})`);
  const shot = await ev(() => !!window.__golf.testHit(0.4, 0));
  ok(shot, `${id}: a shot can be hit`);
  await ev(() => window.__golf.app.quit(true));
  a = await app();
  ok(a.menu === 'main' && !a.playing, `${id}: quit leads back to the main menu`);
}
console.log(`menu paths: ${paths.length} (${solo.length} courses, ${practice.length} practice items)`);

// --- 3: menu → play → quit → play again leaves nothing behind ---
const mem = [];
for (let i = 0; i < 6; i++) {
  const round = i % 2 === 0;
  await openItem(round ? ['play', 'solo'] : ['play', 'practice'], round ? 'prototype3' : 'pl-02');
  await teeOff();
  const g = await ev(() => ({ strokes: window.__golf.strokes, round: window.__golf.round && { index: window.__golf.round.index, cards: window.__golf.round.cards.length } }));
  ok(g.strokes === 0, `cycle ${i + 1}: strokes start at 0 (${g.strokes})`);
  if (round) ok(g.round && g.round.index === 0 && g.round.cards === 0, `cycle ${i + 1}: a fresh round (${JSON.stringify(g.round)})`);
  else ok(g.round === null, `cycle ${i + 1}: practice has no round`);
  // Leave a shot in the air: its timers must die with the hole
  await ev(() => window.__golf.testHit(0.5, 0));
  await frames(5);
  await click('#pauseBtn');
  await click('#quitBtn');
  if (round) {
    ok(await visible('quitConfirm'), `cycle ${i + 1}: quitting a round asks first`);
    await click('#quitYesBtn');
  }
  await frames(3);
  a = await app();
  const leftovers = await ev(() => ['intro', 'result', 'holeCard', 'summary', 'scorecard', 'pause'].filter(id => !document.getElementById(id).classList.contains('hidden')));
  ok(a.menu === 'main' && !a.playing && !a.paused && a.timers === 0 && !a.game, `cycle ${i + 1}: back on the menu with nothing running (${JSON.stringify(a)})`);
  ok(leftovers.length === 0, `cycle ${i + 1}: no card left open (${leftovers.join(', ')})`);
  ok(await ev(() => !window.__golf.round), `cycle ${i + 1}: no round left`);
  ok(await ev(() => !new URL(location.href).searchParams.has('set')), `cycle ${i + 1}: the address has no ?set=`);
  mem.push(await ev(() => window.__golf.renderInfo()));
}
const m0 = mem[1];
for (const [i, m] of mem.entries()) if (i > 1) ok(m.geometries === m0.geometries && m.textures === m0.textures && m.programs <= m0.programs + 2, `cycle ${i + 1}: renderer memory back to ${JSON.stringify(m0)} (${JSON.stringify(m)})`);
console.log('renderer memory after each quit:', mem.map(m => `${m.geometries}g/${m.textures}t/${m.programs}p`).join(' '));

// --- 4: the pause menu ---
await openItem(['play', 'practice'], 'pl-01');
await teeOff();
const w0 = await wind();
await ev(() => window.__golf.swing());               // start a swing…
ok(await ev(() => window.__golf.state === 'power'), 'a swing started');
await page.keyboard.press('Escape');                 // …and pause: it is cancelled, no stroke
a = await app();
ok(a.paused && (await visible('pause')), 'Esc pauses');
ok(await ev(() => window.__golf.state === 'aim' && window.__golf.strokes === 0), 'pausing mid-swing cancels it with no stroke');
await page.keyboard.press('Space');                  // Space presses the focused Resume button, never swings
await frames(2);
ok(!(await app()).paused, 'Space on Resume resumes');
ok(await ev(() => window.__golf.state === 'aim'), 'resuming does not swing');
await ev(() => window.__golf.testHit(0.6, 0));
await ev(() => window.__golf.app.pause());
const posPaused = await ev(() => ({ ...window.__golf.ball }));
await frames(20);
const posLater = await ev(() => ({ ...window.__golf.ball }));
ok(posPaused.x === posLater.x && posPaused.z === posLater.z, 'the ball does not move while paused');
await click('#restartBtn');
await page.waitForFunction(() => window.__golf.state === 'intro');
await teeOff();
ok(await ev(() => window.__golf.strokes === 0), 'Restart hole: back to 0 strokes');
ok((await wind()) === w0, 'Restart hole: the same wind');
await click('#pauseBtn');
await click('#quitBtn');
ok((await app()).menu === 'main', 'quitting practice needs no confirmation');

// --- 5: a whole round from the menu, to the scorecard and its Menu button ---
await openItem(['play', 'solo'], 'prototype3');
for (let hole = 1; hole <= 3; hole++) {
  // Hole 1: Space on the intro card. Hole 3: Space on the compact card, sent in the same task as the
  // card appears (the card also closes by itself after 2.5 s, and frames are slow in a headless
  // browser, so this is how we know Space is what started it). Hole 2's card checks the countdown.
  if (hole !== 2) {
    const r = await ev(() => {
      if (window.__golf.state !== 'intro') document.getElementById('summaryBtn').click();
      document.activeElement?.blur();
      const before = window.__golf.state;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
      return { before, st: window.__golf.state };
    });
    ok(r.before === 'intro' && r.st === 'aim', `round hole ${hole}: Space starts it from its ${hole === 1 ? 'intro' : 'compact'} card (${r.before} → ${r.st})`);
  } else await page.waitForFunction(() => window.__golf.state === 'aim', null, { timeout: 10000 });
  // Put the ball next to the cup and putt until it's over (holed or picked up)
  await ev(() => { const c = window.__golf.HOLE; window.__golf.place(c.x, c.z + 0.6); });
  for (let k = 0; k < 20; k++) {
    const st = await ev(() => window.__golf.state);
    if (st === 'result') break;
    if (st === 'aim') await ev(() => window.__golf.testHit(Math.max(0.05, window.__golf.play.pinPower()), 0));
    await ev(() => window.__golf.skip());
    await page.waitForTimeout(250);
  }
  await page.waitForFunction(() => !document.getElementById('summary').classList.contains('hidden'), null, { timeout: 10000 });
  ok(!(await visible('pauseBtn')), `round hole ${hole}: no pause button on the summary card`);
  if (hole === 1) {
    // Owner on PR #40: the compact card's 2.5 s countdown starts only once the next hole is on screen
    const t0 = await ev(() => { document.getElementById('summaryBtn').click(); return window.__golf.app.timers; });
    await frames(3);
    const t1 = await ev(() => window.__golf.app.timers);
    ok(t0 === 0 && t1 === 1, `round hole 2: the compact card's countdown starts after the hole is drawn (timers ${t0} → ${t1})`);
  } else if (hole === 3) await page.keyboard.press('Enter'); // the focused See the scorecard button
  // (after hole 2 the summary stays up: hole 3's Space check above presses Next hole itself)
}
await page.waitForFunction(() => !document.getElementById('scorecard').classList.contains('hidden'), null, { timeout: 5000 }).catch(() => {});
ok(await visible('scorecard'), 'the scorecard shows after the last hole');
ok(await ev(() => document.querySelector('#scoreGroups caption')?.textContent === 'Holes 1–3'), 'a 3-hole round: one group "Holes 1–3"');
await click('#cardMenuBtn');
a = await app();
ok(a.menu === 'main' && !a.playing, 'the scorecard Menu button goes to the main menu (no reload)');
await items(['play', 'solo']);
ok(await ev(() => /best/.test(document.querySelector('#menuCourses [data-id="prototype3"] small').textContent)), 'the course shows its personal best');

// --- 6: settings are saved ---
await items(['settings']);
await click('#setDebug');
await click('#setGrid [data-value="on"]');
const stored = await ev(() => localStorage.getItem('pocketlinks.settings.v1'));
ok(stored === JSON.stringify({ debug: true, puttGrid: 'on' }), `settings saved (${stored})`);
await page.reload();
await page.waitForFunction(() => window.__golf?.app);
ok(await ev(() => window.__golf.app.settings.debug === true && window.__golf.app.settings.puttGrid === 'on'), 'settings survive a reload');
await openItem(['play', 'practice'], 'pl-01');
await teeOff();
ok(await ev(() => window.__golf.app.debugOpen), 'debug overlay setting opens it when a game starts');
const z = await ev(() => [getComputedStyle(document.getElementById('debug')).zIndex, getComputedStyle(document.getElementById('pause')).zIndex, getComputedStyle(document.getElementById('menu')).zIndex].map(Number));
ok(z[0] < z[1] && z[0] < z[2], `debug overlay stays below cards and menus (z ${z.join(' / ')})`);
await ev(() => window.__golf.app.quit(true));
ok(!(await ev(() => window.__golf.app.debugOpen)), 'the debug overlay closes in the menu');
await items(['settings']);
await click('#setDebug');
await click('#setGrid [data-value="hole"]');
// Owner on PR #40: hole 2's intro mentions the grid only when its green has one
const gridText = async v => {
  await items(['settings']);
  await click(`#setGrid [data-value="${v}"]`);
  await openItem(['play', 'practice'], 'pl-02');
  await page.waitForFunction(() => window.__golf.state === 'intro');
  const has = await ev(() => /grid/i.test(document.getElementById('introSteps').textContent));
  await ev(() => window.__golf.app.toMenu());
  return has;
};
ok(!(await gridText('off')), 'putt grid Off: hole 2\'s intro says nothing about a grid');
ok(await gridText('hole'), 'putt grid Hole default: hole 2\'s intro mentions its grid');

// A page where storage throws still starts on the menu
const p2 = await ctx.newPage();
await p2.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
await p2.goto('http://golf.test/index.html');
await p2.waitForFunction(() => window.__golf?.app, null, { timeout: 10000 }).catch(() => {});
ok(await p2.evaluate(() => window.__golf?.app?.menu === 'main'), 'with storage blocked the game still opens the menu');

// --- Dev links still skip the menu ---
for (const q of ['?hole=pl-02', '?scenario=h1-bunker', '?set=test9', '?seed=4', '?tune=SWEET:0.06', '?debug=1']) {
  await page.goto(`http://golf.test/index.html${q}`);
  await page.waitForFunction(() => window.__golf?.app);
  a = await app();
  ok(a.menu === null && a.playing, `${q} skips the menu`);
}

ok(errors.length === 0, `no page errors (${errors.join(' | ')})`);
await browser.close();
console.log(bad ? `\n${bad} of ${checks} checks failed` : `\nAll ${checks} checks passed`);
process.exit(bad ? 1 : 0);
