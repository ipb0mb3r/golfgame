# QA report: PR #24 "Fix pass 1 (Gate A): vendored Three.js, hole session, tests" (`dev/QA-fixes-1`)

| | |
|---|---|
| **Commit tested** | `2f781190586625118e9561f02b6a815ca8427366` (branch head; PM: "no changes needed") |
| **Compared against** | `main` at `80c8276` |
| **Level** | FULL (budget 30 min). Time spent: about 20 min |
| **Main viewport** | Phone portrait 390x844 (touch, DPR 3). Phone landscape 844x390 checked for the debug overlay |
| **Environment** | Headless Chromium 153 (Playwright 1.63), SwiftShader WebGL, Node v22.23.4, `python3 -m http.server`. **No unpkg workaround on the branch**: the vendored file is served as-is. Main still needs it, so for main I served the same r160 file. |
| **Tasks** | Focus: no gameplay change, C1, C2, A2, C5, C4, C7 |

## PASS / FAIL / NOT TESTED

| # | Item | Result | Notes |
|---|---|---|---|
| 1 | `node --test` | **PASS** | 179 pass, 0 fail |
| 1 | `node tools/baseline.mjs check` | **PASS** | All 19 v1 shots match at 30, 60 and 144 fps, with no `THREE_MODULE` |
| 1 | `node tools/session-check.mjs` | **PASS** | 10 load/dispose cycles: pl-01 23 geometries / 1 texture / 11 programs and pl-02 40 / 1 / 12 every time. "input bound once, no stray timers" |
| 2 | **No gameplay change**: same scripted round on main and the branch | **PASS** | 4 rounds (both holes × seeds 42 and 7) at the ⚑ power, phone portrait, fixed 1/60 s clock. **0 differences** in ball position (to the mm), strokes, club, max yd, HUD text, wind, ⚑ position, window width, cap or result card. Results: h1 birdie / birdie, h2 birdie / par, identical on both |
| 2 | Normal play-through with the real keyboard (portrait) | **PASS** | Hole 1: birdie (2). Hole 2: birdie (4: 3 Wood, SW from a greenside bunker, 2 putts). Same shots and results as the feel-pass-2 run on main. No console errors |
| 3 | **C1** no request to unpkg | **PASS** | 9 page loads (plain, `?debug=1`, five `?tune=` variants, `?debug=0`, `?debug=yes`): all 28 requests each go to `localhost:8000`, **0 to unpkg** or any other host. Three.js comes from `/vendor/three-0.160.0/three.module.js`, and its sha256 matches the official r160 build byte for byte |
| 4 | **C2** `file://` | **PASS** | "The game has to be opened from a web server, not straight from the folder. Run "python3 -m http.server 8000" …". The button reads **Can't start**, is disabled, and clicking it does nothing |
| 4 | **C2** WebGL off | **PASS** | Tested with `--disable-webgl` and with `--disable-3d-apis`: "Your browser can't show 3D graphics (WebGL is off or not supported), so the game can't start. Try another browser, or turn on hardware acceleration…". Button disabled |
| 4 | **C2** a missing file | **PASS (with note)** | `three.module.js` (404 or network failure), `main.js`, `session.js` or `hole2.js` missing: "Part of the game did not load (src/game/main.js). Check your connection and reload the page." Button disabled. The message **always names `main.js`**, whichever file failed (Q3) |
| 4 | **C2** other start-up cases | **PASS** | Old browser without import maps (simulated) → "This browser is too old for the game. It needs Safari or iOS 16.4+…". A start-up error (simulated: `sets.js` replaced) → "The game hit an error while starting: …", button disabled. A normal load shows no notice and Tee off works |
| 5 | **A2** `__golf.loadHole()` swaps | **PASS** | 5 swap moments, each compared with a fresh load of the same hole and seed (HUD text, meter classes and widths, ⚑, cap, minimap canvas, cards, title, ball, state), plus a screenshot diff after Tee off: **no leftovers**. Details below |
| 5 | **A2** no doubled inputs after 12 swaps | **PASS** | Aim speed while holding ← is 0.0075 rad/frame before and 0.0070 after (not ×2). The 1st Space starts the meter (`power`), the 2nd sets power (`accuracy`, 0.600), the 3rd fires one shot. A tap on SWING moves the meter one step, and waiting cancels it with no stroke |
| 6 | **C5** `?debug=1` (portrait) | **PASS (with note)** | Overlay open from the intro, with the new line "render dpr 2.00 (cap 2)  aa on". The backtick closes it. On its own it's clear of the HUD in portrait. `?debug=0` and `?debug=yes` leave it closed. With `?tune=` it overlaps the TUNED badge (Q1). In landscape `?debug=1` covers the right end of the scorecard (Q2) |
| 6 | **C4** `?tune=DPR_CAP:1,ANTIALIAS:0` (portrait) | **PASS** | Canvas 390x844 (×1) instead of the default 780x1688 (cap 2 on a DPR-3 phone). WebGL `antialias: false`. Badge "TUNED · DPR_CAP 1 · ANTIALIAS 0", and debug shows "render dpr 1.00 (cap 1)  aa off". `DPR_CAP:3` → 1170x2532. `DPR_CAP:0,ANTIALIAS:2` → clamped to 0.5 / 1, marked "(clamped)". `DPR_CAP:abc,ANTIALIAS:x` → ignored and listed on the intro card |
| 6 | **C7** right click does nothing | **PASS** | Right click on the course: meter stays at `aim`, and the context menu is blocked (`defaultPrevented`). Middle click: nothing. Right click on SWING: nothing. Ctrl/Alt/Meta+Space: nothing. Left click starts the meter. Two fingers (hold ◀ Aim, tap SWING with a second touch) → aim moves and the meter starts |
| 7 | Console | **PASS** | No errors in normal play, swaps or tune runs. The only messages are the intended "ignored tune values" warning, plus the expected errors in the C2 failure cases |
| 8 | fps | **NOT TESTED** | Software WebGL in this sandbox. `DPR_CAP` / `ANTIALIAS` were checked through the canvas size and the context settings |

### A2: hole swaps in detail
| Moment of `loadHole()` | Then | Result |
|---|---|---|
| Ball in flight toward the hole 1 pond (penalty timer pending) → `pl-02` | waited 3.5 s, then Tee off | No "Splash", no penalty, strokes 0, state `intro` → `aim`. Same as a fresh pl-02 load. **0.0%** pixel difference after Tee off (no old trail or flags) |
| Meter in the power phase → `pl-01` | waited 4 s | Meter idle, no forced shot, no stroke |
| Meter in `nopower` (red) → `pl-01` | waited 3 s | `nopower` class gone, no cancel/topped flash, no stroke |
| Just holed (holed flash + result timer pending) → `pl-02` | waited 4 s | No result card, intro shown, strokes 0 |
| Result card open → `pl-01` | | Card hidden, intro for hole 1 |

The only difference from a fresh load is the hidden `#msg` element: it still holds the previous flash text (e.g. "Nice shot!") but isn't shown, so the player can't see it.

## Bugs

**Q1. Portrait: with `?tune=` the debug overlay covers the TUNED badge, and a long tune list makes it wider than the screen.** Low.
- Steps: 390x844, `index.html?hole=pl-02&debug=1&tune=DPR_CAP:1,ANTIALIAS:0` (or `?tune=…` and the backtick key).
- Expected: the debug overlay clear of the HUD (as with `?debug=1` alone, where it ends at y 694 above the hint).
- Actual: the new "render" and "tuned" lines make the overlay taller (y 452–694), and it covers the TUNED badge (y 679–699), which shows through as a faded pink strip. With 4 tunes (`…,SWEET:0.04,rough.maxPower:0.8`) the "tuned" line widens the overlay to **494 px on a 390 px screen**: the line is cut off at the right edge, and the overlay covers the badge.
- Screenshots: `fix-pass-1/portrait-390x844-debug-tune.png`, `fix-pass-1/bug-portrait-debug-long-tune.png`

**Q2. Landscape: `?debug=1` opens the overlay over the right end of the scorecard.** Low. New with C5: opening it with the backtick key gives x 229–709, clear, the same as main.
- Steps: 844x390, `index.html?hole=pl-02&debug=1`, then Tee off.
- Expected: the same placement as the backtick (between the scorecard and the minimap).
- Actual: the overlay spans x 190–709, and the scorecard ends at x 221, so "Lie: Tee box · easier timing" is cut off at "easier timi…".
- Screenshot: `fix-pass-1/bug-landscape-debug-covers-scorecard.png`

**Q3. The "a file didn't load" message always names `src/game/main.js`.** Low.
- Steps: block `vendor/three-0.160.0/three.module.js` (or `src/game/session.js`, `src/holes/hole2.js`) and load the page.
- Expected (PR: "a file that didn't load"): the message names the file that failed, or names none.
- Actual: "Part of the game did not load (src/game/main.js)…" every time. The browser reports a failed import on the entry `<script>`. The sentence is still clear and the button is disabled, so a player can follow it; only the file name is misleading for debugging.

## Feel notes for the game designer
1. **Nothing plays differently.** Same shots, same numbers, same HUD, down to the millimetre, against main on both holes.
2. **The start-up messages read well on a phone** and say what to do. Only the "error while starting" one is technical, e.g. "…does not provide an export named 'HOLES'". It does ask the player to report it.
3. **`?tune=DPR_CAP:1` looks visibly softer on a 3× phone** (390x844 pixels drawn instead of 780x1688). That's expected; it's the setting to try if a phone runs slowly.
4. **Two-thumb play works:** hold Aim with one thumb and tap SWING with the other.

## Verdict
**READY TO MERGE**: no gameplay change (scripted rounds identical to main, baselines and session check pass), C1, C2, A2, C5, C4 and C7 all pass on phone portrait, there are no High or Med bugs and no console errors. Q1–Q3 are small debug-overlay and message issues for a follow-up.
