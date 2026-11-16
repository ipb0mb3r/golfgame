# QA report: PR #6 "Phase 0: shared engine, holes as data, tests" (`dev/F-engine-refactor`)

**Commit tested:** `927f1940a9da115a89a83f6146aa67c1d49f208b` ("PM review: slope row on every hole, baseline v2, docs follow-ups"). This is the branch head after the PM follow-ups; nothing newer was on the remote when I finished.
> **Screenshots** were removed from this branch to keep the repo small. They're still viewable in commit `72d906f` of PR #8.

**Compared against:** `main` at `a5dcc00` (old `index.html` + `hole2.html`).
**Date:** 2026-11-16 · **Role:** QA / playtester (no game code changed)

## Environment
| Item | Value |
|---|---|
| OS | Linux container, 2 CPUs, no GPU |
| Browser | Headless Chromium 153.0.8010.12 (Playwright 1.63.0, Python and Node drivers), WebGL through SwiftShader (software) |
| Node | v22.23.4 |
| Server | `python3 -m http.server 8000` (branch) and `:8001` (main), both from Python 3.13 |
| Three.js | unpkg is blocked in this sandbox. I served Three.js r160 (`build/three.module.js` from the `r160` tag of mrdoob/three.js) in place of the unpkg URL by intercepting the request, and used `THREE_MODULE=` for `tools/baseline.mjs`. Same file as the import map's `three@0.160.0`. |
| Timing | Scripted runs replace `THREE.Clock.getDelta` with a fixed 1/fps step (same method as `tools/baseline.mjs`). Keyboard and touch runs use real key and tap events. |

Software rendering is very slow here (about 12 fps at 844x390 and 1–3 fps at 1920x1080). Real frame rates **could not be measured** in this sandbox. See section 7.

## 1. Results per acceptance point

| # | Check | Result | Notes |
|---|---|---|---|
| 1 | `node --test` | **PASS** | 74 tests, 74 pass, 0 fail (1.6 s) |
| 2 | `index.html` loads hole 1 by default | **PASS** | `__golf.hole = pl-01`, title "Pocket Links: Hole 1", 166 yd |
| 3 | `?hole=pl-02` loads hole 2 | **PASS** | pl-02, par 5, 491 yd |
| 4 | Unknown `?hole=` fails gracefully | **PASS (with note)** | `?hole=pl-99`, `?hole=<b>x` and `?hole=PL-02` all load hole 1 silently with no error. The URL still says the unknown id and the player is not told (B4). |
| 5 | `hole2.html` redirects to `index.html?hole=pl-02` | **PASS (with note)** | Lands on `index.html?hole=pl-02` and keeps `#hash`, but **drops other query parameters** such as `?seed=42` (B3) |
| 6 | `&seed=42` gives the same wind every visit | **PASS** | Two visits each on hole 1 and hole 2: wind at tee-off identical (x −2.9461, z −2.2110, 8 mph). See B5 and B6 for side notes. |
| 7 | Without a seed the wind changes | **PASS** | 3 unseeded visits: 6, 5, 5 mph with different vectors |
| 8 | Same scripted shot = same result at 30, 60, 144 fps | **PASS** | 10 shots across both holes, **with seeded wind (seed 42)**, gave identical positions and strokes at all three rates (Δ = 0.000 m). `baseline.mjs check` results are also identical at 30/60/144. |
| 9 | `node tools/baseline.mjs check` passes | **FAIL** | Exits with code 1, "worst difference 2.386 m, 2 problem(s)", at 30, 60 and 144 fps (B1). Not a gameplay change, but the tool doesn't pass the way the PR describes. |
| 10 | Debug overlay toggles with backtick, sensible values | **PASS** | Toggles on and off on both holes. Shows hole, seed, state, stroke, club, pos, speed, surface/lie, slope, wind, wet, meter, fps. Values match the HUD: e.g. hole 2 green at (20, −430) shows "slope 2.9% along 2.9%" and the HUD shows "Uphill 3%"; a rolling putt shows 7.15 m/s. Overlaps the HUD in phone landscape (known X7). |
| 11 | "Slope:" row on both holes | **PASS** | Hole 1 shows "Flat" at the tee and on the flat green, and "-" on the intro card and during flight. Hole 2 shows values like "Uphill 16% · breaks right". |
| 12 | Gameplay unchanged vs main (screenshots) | **PASS (with note)** | Same scripted shots on main and branch: same clubs, same stroke counts, end positions within 0.6 m, HUD/meter/minimap/cards look the same apart from the new Slope row. One new visible difference on hole 1: the elevation arrow during flight (B2). |
| 13 | Edge cases (section 3) | **PASS (with note)** | Penalties, bunker, pick-up, restart, green step and putts behave correctly. Lip-outs almost never stay out, but main does the same (B6). |
| 14 | Viewports (section 5) | **PASS (with note)** | No branch-only layout problems. Phone landscape has problems that main has too (B7), plus X7. |
| 15 | Console errors / warnings | **PASS** | No errors, no page errors and no failed requests in any run on either branch. The only warnings are SwiftShader "GPU stall due to ReadPixels" messages caused by taking screenshots. |

## 2. Full play-throughs

| Hole | Input | Result | Screenshots |
|---|---|---|---|
| 1 (seed 42) | Keyboard: ←/→ held to aim (aim changed −0.45 / +1.02 rad), W → 5 Iron, S, ↓ → 9 Iron, ↑ → 7 Iron, then **Space ×3** per shot | 7 Iron tee shot ("Slight slice") onto the green, two putts: **Par**. "Play again" resets to stroke 1, tee, 7 Iron, new wind. | `h1-kb-01-intro` … `h1-kb-09-after-restart` |
| 2 (seed 42) | Keyboard, Space ×3 per shot | Driver into the fairway bunker (229 yd to go), 9 Iron into the cross bunker (70 yd), out of the bunker onto the green, two putts: **Par** (5). Restart OK. | `h2-kb-01-intro` … `h2-kb-05-after-restart` |
| 1 and 2 | Touch (phone portrait and landscape): tap SWING ×3, hold ◀ Aim, tap › | States go power → accuracy → flight. Aim and club change work. | `vp-portrait-*`, `vp-landscape-*` |
| 1 and 2 | Scripted `__golf.testHit` | Used for everything in sections 3 and 4 | |

Club auto-pick, the "Nice shot / Slight slice / Hook" labels, surface flash text ("Bunker · 229 yd to the pin"), the yellow aim ring and the minimap aim line all worked on both holes.

## 3. Edge cases

| Case | Result | Evidence |
|---|---|---|
| Water, hole 1 (pulled tee shot, aim −0.22, p 0.6) | "Splash! +1 penalty stroke", strokes 1 → 2, ball back on the tee, 7 Iron re-picked | `edge-h1-water-splash`, `edge-h1-water-after` |
| OB, hole 1 (3 Wood, aim +0.6) | "Out of bounds! +1 penalty stroke", +1, ball back to its last spot | `edge-h1-ob` |
| Water, hole 2 (from (−16, −262) into the pond) | Splash, +1, back to (−16, −262) | `edge-h2-water` |
| OB, hole 2 (Driver aimed right from (40, −200)) | OB flash, +1, ball back to (40, −200) | `edge-h2-ob` |
| Bunker lie, hole 1 (−15, −147) | Auto-pick S Wedge, lie "Bunker (−15% power)". One club up (P Wedge) shows "−40% power". The shot plays normally. | `edge-h1-bunker-lie`, `edge-h1-bunker-sw` |
| Lip-out | Works, but rarely stays out (B6). Seen in the browser on hole 2 (seed 1, putter p 0.95 from (22.57, −438.61)): the ball lipped and stopped 2 yd past. | `edge-h2-lipout` |
| Max-stroke pick-up, hole 1 | Stroke counter 2…10. After the 10th shot stops: "Picked up · You reached the 10-stroke limit". | `edge-h1-pickup` |
| Pick-up reached through a penalty, hole 1 | 9th shot into the pond, strokes 9 → 10, "Picked up" card | `edge-h1-pickup-via-penalty` |
| Max-stroke pick-up, hole 2 | Pick-up card at 12 | `edge-h2-pickup` |
| Restart after the result card (par, hole in one, picked up) | Strokes 0, ball on the tee, auto club, state `aim`, card hidden | `h1-kb-09-after-restart`, `h2-kb-05-after-restart` |
| Ball resting on hole 2's green step | Placed on the steepest green point (24.5, −442), a 16% slope: the ball stays put until hit. A p 0.02 nudge sends it down the step to (23.88, −438.47), where it settles ("Uphill 5%"). Three other putts across the step all settle on the lower tier near z −438.3…−438.5, with no endless creep. | `edge-h2-green-step-placed`, `edge-h2-green-step-after-tiny-putt`, `edge-h2-after-step-putts` |
| Very short putt (power 0.02) | Hole 1: 0.149 m. Hole 2: p 0.05 moved 0.27 m. Both count a stroke. | |
| Very long putt | Hole 1 from 12 m at p 1: holed. Hole 2 from 23 yd at p 1: 26 m, ran through to the back fringe. | `edge-h1-long-putt`, `edge-h2-long-putt` |

## 4. Regression vs main
Both sides use the same scripted shots (wind forced to 0; `Math.random` seeded on main). Side-by-side images, main on the left: `regression-h{1,2}-*.png`.

| Hole | Shot | Main end | Branch end | Strokes / club |
|---|---|---|---|---|
| 1 | 7 Iron p 1 | 4.15, −157.76 | 4.15, −157.78 | same |
| 1 | Putt p 0.5 | 4.04, −153.27 | 4.03, −153.26 | same |
| 1 | Putt p 0.8 | holed (3, **Par**) | holed (3, **Par**) | same |
| 2 | Driver p 1 | 12.75, −285.00 | 12.69, −285.57 | same (main itself varies 0.54 m by frame rate here) |
| 2 | 5 Iron p 1 | 26.66, −456.90 | 26.67, −457.00 | same |
| 2 | 3 more shots + putt | holed in 5 (**Par**) | holed in 5 (**Par**) | same |

- HUD, meter, minimap, intro and result cards: identical apart from the new **Slope** row on hole 1. Hole 1 shows "-" on the intro card, which also makes the panel one line taller. 0.0–1.9% of pixels differ, mostly ball position and wind text.
- Hole 1's ⚑ pin tick moves slightly (96.92% → 97.17% of the meter at the tee). This comes from the documented change in the reach estimate.
- Displayed yardages can be 1 yd off where the ball ends a few cm away (hole 2 after the drive: 179 → 178 yd).
- **New on hole 1:** during flight, "To pin" shows an elevation arrow, e.g. "15 yd (↓1)". Old hole 1 never showed an arrow (B2).

`node tools/baseline.mjs check` (browser, new `index.html`) at 30/60/144 fps (identical at all three):

| Shot | Old end | New end | Δ | Tool says |
|---|---|---|---|---|
| h1 three-quarter tee shot (p 0.85) | 3.61, −137.19 | 3.60, −136.71 | 0.479 | ok |
| … then putt (p 0.7) | 3.97, −150.97 | 3.96, −150.29 | **0.677** | **BAD** |
| h1 hook (p 0.95, acc 0.06) | −9.23, −148.21 | −9.98, −150.47 | **2.386** | **BAD** |
| other 16 shots | | | ≤ 0.071 | ok |

## 5. Viewports
Screenshots: `vp-{desktop,portrait,landscape}-{main,branch}-h{1,2}-{intro,aim,debug,result}.png`.

| Viewport | Branch | Compared with main |
|---|---|---|
| Desktop 1920x1080 | Nothing overlaps or is cut off. Debug overlay is clear of the HUD. | Same |
| Phone portrait 390x844 (touch, DPR 3) | Nothing overlaps or is cut off, including the debug overlay. All buttons reachable, tap swing works. | Same |
| Phone landscape 844x390 (touch) | The intro card (528 px tall) is cut off: the "Pocket Links" title and subtitle sit above the screen (card top at −69 px) and **Tee off** is partly below it (bottom at 401 px). The page cannot scroll. The debug overlay covers the HUD panel (X7). On hole 2 the tall minimap's box reaches into the bottom controls' box. | Intro card and minimap the same on main (B7). Debug overlay is new (X7, known). |

## 6. Bugs

| ID | Sev. | Title | Regression? |
|---|---|---|---|
| B1 | Med | `tools/baseline.mjs check` exits with code 1 (2 problems), though the PR says it passes | n/a (tool) |
| B2 | Low | Hole 1 now shows an elevation arrow "(↓N)" in "To pin" during flight | **Yes** (new on hole 1) |
| B3 | Low | `hole2.html` redirect drops query parameters (`?seed=`) | New page |
| B4 | Low | Unknown or mis-cased `?hole=` silently plays hole 1 | New |
| B5 | Low | `?seed=0` is treated as "no seed" | New |
| B6 | Med | A lip-out almost always drops in on the next physics step | No (same on main) |
| B7 | Low | Phone landscape: intro card taller than the screen, title and Tee off cut off | No (same on main) |

**B1. `node tools/baseline.mjs check` does not pass.** Med.
- Steps: `NODE_PATH=<playwright> THREE_MODULE=<three r160> node tools/baseline.mjs check --fps 60` (also `--fps 30` and `--fps 144`).
- Expected (PR description): passes in a real headless browser at 30, 60 and 144 fps.
- Actual: `worst difference 2.386 m, 2 problem(s)`, exit code 1, at every frame rate. (1) The hook shot (2.39 m): this is the old frame-rate case that `tests/baseline.test.js` accepts, but the browser tool has no such exception. (2) The putt after the three-quarter tee shot (0.68 m): the tool chains shots, so the putt starts from the new tee-shot spot, which is 0.48 m back. The node test replays from the recorded start, which is why the PR table shows 0.03 m. Neither is a gameplay change, and `node --test` passes.
- Evidence: tool output reproduced in section 4.

**B2. Elevation arrow in "To pin" during flight on hole 1.** Low.
- Steps: hole 1, hit any full shot, look at the top-left panel while the ball is in the air.
- Expected: same as old hole 1, plain "15 yd".
- Actual: "15 yd (↓1)" and similar. The arrow reflects the **ball's height in the air**, not the ground. It goes away once the ball stops. Hole 2 on main did this already.
- Screenshot: `h1-kb-05-flight.png`

**B3. `hole2.html` drops query parameters.** Low.
- Steps: open `hole2.html?seed=42`.
- Expected: `index.html?hole=pl-02&seed=42` (the same wind every visit).
- Actual: `index.html?hole=pl-02`. The seed is lost and the wind is random (11 mph instead of seed 42's 8 mph). The `#hash` is kept.

**B4. Unknown `?hole=` id gives no feedback.** Low.
- Steps: open `index.html?hole=pl-99` (also `?hole=PL-02`).
- Expected: "fails gracefully". It does, with no crash and no console errors.
- Actual: hole 1 loads with no message, and the address bar still shows `hole=pl-99`. `PL-02` (upper case) also loads hole 1, so a mistyped link silently plays the wrong hole.
- Screenshot: `acc-unknown-hole.png`

**B5. `?seed=0` behaves like no seed.** Low.
- Steps: open `index.html?seed=0` twice.
- Expected: the same wind both times.
- Actual: the wind is taken from the clock, because `Number('0') || Date.now()` treats 0 as missing. Debug overlay shows a clock-based seed.

**B6. Lip-outs almost never stay out.** Med. **Not a regression**: main has the same logic (old `index.html` lines 543–551).
- Steps: hole 1, wind 0, putt from (4, −139) straight at the cup with power 1 (12.8 m, putt range 20 m).
- Expected (DESIGN §4): a ball faster than 3.2 m/s over the cup lips out, being deflected and slowed.
- Actual: `lippedOut` fires, the speed drops to 60%, the ball is still inside `CUP_R` on the next 1/240 s step, and it is captured. Both events land in the same frame, so the "Lipped out!" flash is immediately replaced by "In the hole!" / "HOLE IN ONE!". A lip-out only stays out when the ball arrives faster than about 5.3 m/s (3.2 / 0.6).
- Measured with the core (`createHolePlay`, 89 130 scripted putts and chips around both cups): 499 lip-outs, of which **498 were holed straight away** and 1 stayed out. The unit test uses 8 m/s, so it passes.
- Screenshot of the one in-game lip-out that stayed out: `edge-h2-lipout.png`

**B7. Phone landscape (844x390): intro card does not fit.** Low. **Same on main.**
- Steps: open either hole at 844x390.
- Actual: card top at −69 px, so the "Pocket Links" heading and hole line are off-screen. Tee off spans 354–401 px, so it is partly off-screen but still tappable. The overlay cannot scroll.
- Screenshots: `vp-landscape-branch-h1-intro.png`, `vp-landscape-main-h1-intro.png`

Known, not re-filed: X7, the debug overlay covering the HUD panel in landscape (`vp-landscape-branch-h1-debug.png`).

## 7. Frame rate
Measured with requestAnimationFrame over 4 s, real time, SwiftShader:

| Viewport | main h1 | branch h1 | main h2 | branch h2 |
|---|---|---|---|---|
| 844x390 | 12.2 | 12.0 | 1.5 | 1.4 |
| 1920x1080 | 2.9 | 2.9 | 0.7 | 0.7 |

All runs are below 50 fps, but this is the software renderer on 2 CPUs, not the game. **Main and branch are the same** (within 0.2 fps), so the refactor adds no render cost here. A real-GPU check is still needed (Alexis's playtest). Physics is unaffected: scripted results are identical from 30 to 144 fps.

## 8. Feel notes for the game designer (not bugs)
- **Wind on the intro card is not the wind you play.** The card shows one wind (seed 42: 6 mph). Pressing Tee off rolls a new one (8 mph), and "Play again" rolls another (6 mph again with seed 42). The same happens on main. With `?seed=` only the first tee shot's wind is replayable.
- **Stroke counter after a penalty.** During the 1.7 s penalty pause the HUD still shows the old stroke number, and if the penalty triggers the pick-up, the panel behind the card stays one stroke behind (e.g. "Stroke: 9" behind a 10-stroke "Picked up" card). Same on main.
- **Debug "stroke 0" vs HUD "Stroke: 1"** at the tee: the overlay counts strokes taken, the HUD counts the stroke you are about to play.
- **Putts say "Nice shot!" / "Perfect!"** the same way full shots do.
- **"0 yd to the pin"** appears when the ball stops 10–20 cm from the cup without dropping (hole 1, second putt). It reads like it should be in.
- **Meter top auto-lock.** If you don't click a second time, power locks at 100% and the marker comes back. Clicking late can then set *accuracy* instead of power and give a big hook. Same on main, but it is easy to do on purpose or by accident.
- **Hole 2 green step.** Balls never rest on the step itself. Anything that stops near it slides down to the lower tier around z −438.5, which feels intentional and predictable.
- **Hole 2 rough beside the green** reads "Uphill 34–36%" on the bank right of the green after a full 5 Iron. That is a very steep lie for a chip (same on main).

## Verdict
**NOT READY TO MERGE**: gameplay matches main, all 74 unit tests pass, and I found no High bugs and no console errors. But the "`node tools/baseline.mjs check` passes" acceptance point fails (B1, exit code 1 with 2 problems), and hole 1 shows a new elevation arrow during flight (B2). Fix B1, or record an owner/PM decision to accept it as is. B6 and B7 are older than this PR and should not block it.
