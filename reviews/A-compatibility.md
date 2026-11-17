# Gate A review: Compatibility

Reviewer: Compatibility (independent agent). Reviewed `main` at `a217b61` (after PR #17), 2026-11-17. No code was changed.

## What I ran

| Check | How | Result |
|---|---|---|
| Same physics at 30 / 60 / 144 fps | `node tools/baseline.mjs check --fps 30\|60\|144` (Three.js 0.160.0 from `npm pack`, `THREE_MODULE=`) | All 19 shots pass at every rate, and the engine's end positions are **identical** across the three runs |
| Physics with uneven frame times | Node script: same shot on both holes through `play.advance()` with 1/30, 1/60, 1/144 and random 4–50 ms frames | Bit-identical end positions in all four cases. The fixed 1/240 s accumulator works |
| Unit tests | `node --test` | 133/133 pass |
| Phone, touch | Playwright Chromium, iPhone 13 profile (390x664, DPR 3, touch), served under `/golfgame/` like GitHub Pages | Tap on Tee off, tap on the course and taps on SWING all arrive as `pointerType: touch` and drive the swing. Canvas backing store is capped at DPR 2 (780x1328) |
| GitHub Pages sub-path | Same server, everything under `/golfgame/` | All paths are relative, hole links (`?hole=`) and `hole2.html` → `index.html?seed=3&hole=pl-02` work |
| unpkg unreachable | Abort the `three.module.js` request | Empty intro card, dead Tee off button, no message (C1) |
| WebGL unavailable | Chromium with `--disable-webgl --disable-3d-apis` | Intro card shows, Tee off does nothing, error only in the console (C2) |
| `file://` | Open `index.html` from disk | Blocked by CORS, blank card (expected, README says so; see C2) |

Safari, iOS Safari and Firefox were judged by reading the code (no WebKit or Gecko in this container).

## Findings

### C1 · High · `index.html:136-138`: the whole game depends on unpkg, with no fallback
**Problem.** Three.js comes only from `https://unpkg.com/three@0.160.0/...` through the import map. If that request fails (unpkg outage, school or work network filter, content blocker, flaky mobile data), the module graph never runs: the intro card is empty and Tee off does nothing. Verified headless. The version is pinned exactly (good), but there is no Subresource Integrity, so a changed file on the CDN would run unchecked.
**Why it matters.** It is the single point of failure for every player, and it already costs every dev, QA and reviewer agent a workaround (`npm pack` + `THREE_MODULE`, request routing in Playwright), because the cloud containers can't reach unpkg.
**Fix.** Commit `three.module.js` 0.160.0 into the repo (e.g. `vendor/three-0.160.0/three.module.js`, ~1.2 MB, license header kept) and point the import map at that relative path. That gives offline play, removes the agent workaround and makes SRI unnecessary for that file. Fold into X6 (or a small task before it) so the upgrade is "replace one file".

### C2 · Med · `src/game/main.js:57-65`, `src/game/scene.js:6`: a failed start is silent
**Problem.** Nothing catches a failure while the game boots. With WebGL off, `new THREE.WebGLRenderer` throws, `bindInput` is never reached and the intro card's Tee off button is dead with no explanation (verified). The same happens with no import map support (iOS Safari before 16.4, Firefox before 108), with C1, and on `file://`.
**Why it matters.** A tester on an old phone, in a WebGL-blocking browser or offline reports "the button does nothing", which is hard to diagnose remotely.
**Fix.** Add a few lines of classic (non-module) script in `index.html` that listens for `error` / `unhandledrejection` and checks `HTMLScriptElement.supports?.('importmap')`, WebGL and `location.protocol === 'file:'`, and writes a plain sentence into the existing `#notice` box. Wrap `createRenderer` in try/catch with the same message.

### C3 · Med · `src/core/swing.js:31-37`, `src/game/main.js:205-206`: the meter reading depends on the frame rate
**Problem.** A click reads `meter.value` as it was at the last frame tick, so the reading moves in steps of one frame (0.033 meter units at 30 fps, 0.007 at 144 fps; the perfect zone is ±0.05). With the existing `scriptedSwing` test helper, the *same* click times (0, 0.9 s, 1.84 s) give accuracy −0.067 at 30 fps (a slice), −0.050 at 60 fps and −0.035 at 144 fps (perfect). Power steps by up to 0.033 too (~5 yd on a 160 yd shot).
**Why it matters.** Phones on battery saver, older phones and hole 2 on weak GPUs run at 30 fps or less, while 120 Hz phones and desktops run much finer. The same timing skill gives different results per device, and neither the baseline tool nor `testHit` touches the meter, so nothing would catch it. DESIGN §3 already mentions a possible tap-delay offset; this needs fixing first or the offset can't be tuned consistently.
**Fix.** Let `pressMeter` take the time since the last tick (from `event.timeStamp` vs the frame's `performance.now()`) and advance the meter by that before reading. Add a `node --test` case that clicks at fixed times with `dt` 1/30 and 1/144 and expects the same result within a small tolerance.

### C4 · Med · `src/game/scene.js:6-7`, `src/holes/hole2.js:111-112`, `src/core/config.js:18`: no performance headroom for low-end phones
**Problem.** The renderer always uses MSAA (`antialias: true`) and up to DPR 2, and hole 2's terrain grid is about 228 x 615 vertices (~140k, ~280k triangles). There is no quality setting. Below 20 fps `MAX_FRAME_DT = 0.05` makes the game run in slow motion (physics stays correct, it just slows down). Headless software rendering ran hole 1 at ~11 fps and hole 2 at ~2 fps at iPhone 13 size. That is not a real phone GPU, so treat it as a warning sign, not a measurement.
**Why it matters.** More holes, characters and weather will add load; without a lever and a number to watch, slow phones will be found late by playtesters.
**Fix.** Add a quality tunable (DPR cap, antialias on/off) to `config.js` and the `?tune=` whitelist, and ask the designer to read the fps on their phone once per hole (needs C5). Consider fewer grid rows on the flat parts of hole 2.

### C5 · Med · `src/game/input.js:310`, `src/game/debug.js`: the debug overlay and fps counter can't be opened on a phone
**Problem.** The overlay only toggles with the backtick key. Phones, the main platform, have no way to show it.
**Why it matters.** Fps, state and seed are exactly what a designer needs to report a phone problem (C3, C4), and X8 promised designer tools that "work on a phone, no keyboard needed".
**Fix.** Add `?debug=1` next to `?tune=` / `?scenario=` (and later the M4 setting).

### C6 · Low · `index.html:133`, `src/game/main.js:178-183`: iOS Safari viewport units
**Problem.** The short-screen minimap rule uses `calc(100vh - 240px)`. On iOS Safari `100vh` is the screen height with the browser bars hidden, so when the bars are showing the minimap can be taller than the space and run into the meter. `resize()` uses `innerWidth/innerHeight` only, which is usually fine but can be stale right after rotation on iOS. `user-scalable=no` is ignored by iOS (harmless here, because `touch-action: none` on `body` already stops pinch and double-tap zoom).
**Why it matters.** Phone landscape is a supported layout (H1) and was only checked in Chromium.
**Fix.** Use `100dvh` with the `100vh` line before it as fallback; also call `resize()` on `visualViewport` `resize` if rotation glitches show up in a playtest.

### C7 · Low · `src/game/input.js:295-296`: any pointer and any button starts a swing
**Problem.** `pointerdown` on the canvas and SWING doesn't check `e.isPrimary` or `e.button`, so a right click, middle click or a second finger counts as a swing click. Taps on the scorecard and minimap panels (a large part of a portrait screen) do nothing, while the README says "click the course".
**Why it matters.** Stray swing clicks feel like the meter "jumped". With two-thumb play (hold Aim with one, tap with the other) this is intended, so decide it on purpose.
**Fix.** Ignore `e.button !== 0` for mouse; decide whether a second simultaneous finger may swing. Optionally let taps on the HUD panels pass through to the swing (`pointer-events: none` on non-interactive panels).

### C8 · Low · `src/game/hud.js:35`, `index.html:156`: blurry minimap on high-DPI screens
**Problem.** The minimap canvas is sized in CSS pixels (e.g. 60x220) and not multiplied by `devicePixelRatio`, so on a DPR 3 phone it is drawn at a third of the screen's resolution. The 3D canvas is fine (DPR capped at 2).
**Why it matters.** Cosmetic, but the minimap is the main read of the hole on a small screen.
**Fix.** Set the canvas width/height to CSS size × `min(devicePixelRatio, 2)` and `ctx.scale` once.

### C9 · Low · `index.html` (whole file), `docs/DESIGN.md`: the browser floor is not written down
**Problem.** The code implicitly needs: import maps (Chrome/Edge 89, Firefox 108, Safari and iOS 16.4), `Object.hasOwn` (Safari 15.4), Pointer Events, `inset`. `text-wrap: balance` (Safari 17.5) degrades gracefully. `backdrop-filter` without the `-webkit-` prefix only works from Safari 18, so on iOS 16–17 the panels lose their blur (cosmetic). I found no feature beyond that floor.
**Why it matters.** Without a stated floor, each dev PR can raise it by accident (e.g. CSS nesting, `:has()`), and nobody checks iOS, where most play happens.
**Fix.** Add one line to DESIGN.md: "supported: last 2 versions of Chrome, Firefox, Safari; iOS 16.4+". Add `-webkit-backdrop-filter` next to `backdrop-filter` in `.panel`.

### C10 · Low · `tools/baseline.mjs:75`, `tests/`: frame-rate coverage only uses perfectly even frames
**Problem.** The browser baseline replaces `Clock.getDelta` with an exact 1/fps, and nothing in `node --test` covers uneven frames. Real phones deliver jittery frames, dropped frames and variable refresh (ProMotion). It works today (my uneven-frame run was bit-identical), but nothing would catch a regression, for example a future dt-dependent effect added outside `play.advance`.
**Why it matters.** Determinism is a core rule (AGENTS.md rule 3) and cheap to guard.
**Fix.** Add one `node --test` case: play one shot per hole with fixed 1/60 and with seeded random 4–50 ms frames through `play.advance`, and expect identical end positions.

## What is already fine
- Physics is frame-rate independent: identical results at 30/60/144 fps in the browser and with uneven frames in Node.
- Relative URLs throughout, so the `/golfgame/` sub-path and `hole2.html` forwarding work.
- Touch works through Pointer Events; `touch-action: none` prevents zoom and scroll on the course, cards still scroll (`pan-y`).
- Canvas DPR capped at 2; meter and game time are capped after a tab switch (`MAX_METER_DT`, `MAX_FRAME_DT`), so a background tab can't skip the swing.
- Three.js version is pinned exactly; X6 already plans the upgrade.

## Top 3 recommendations
1. **Vendor Three.js into the repo** (C1). It removes the biggest outage risk for players and the daily workaround for every agent, and makes X6 a one-file swap.
2. **Show a readable message when the game can't start** (C2), and add `?debug=1` (C5) so phone problems can be reported with fps and seed.
3. **Make the meter read real click time, not frame time** (C3), with a test at 30 vs 144 fps, before any tap-delay offset or further SWEET tuning.
