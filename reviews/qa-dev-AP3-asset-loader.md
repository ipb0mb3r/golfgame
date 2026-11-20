# QA report: AP3 asset loader + loading screen (+ X27), PR #95

- **SHA:** a2649b178907a1ee8c1829ec565a3c6d4ca19b96 (branch `dev/AP3-asset-loader`), compared with `origin/main` on a second port.
- **Environment:** headless Chromium (Playwright, software WebGL), Node 22, two `python3 -m http.server` instances (8134 PR, 8135 main). Viewports 390x844 (main), 320x568, 844x390, 1920x1080.
- **Level:** FULL. Time: about 25 min.

## Results

| # | Item | Result | Notes |
|---|---|---|---|
| 1a | `node --test` | PASS | 540 pass / 0 fail |
| 1b | `tools/baseline.mjs check` | PASS | all 19 shots match |
| 1c | `tools/session-check.mjs` (incl. step 5) | PASS | bar, cache hit (1 fetch over 2 holes), 0 geometries after quit, 404 fallback all ok |
| 1d | `tools/biome-check.mjs` | PASS | 0 FAIL lines |
| 2a | pl-01, mtn-07, `?set=mountain9` hole 1 look the same as main (390x844) | PASS | intro and aim screenshots are **byte-identical** to main for all three (seed 7) |
| 2a' | mountain9 hole 2 vs main | NOT TESTED | only hole 1 compared by pixels. Hole 2 loading is covered by item 4 and by session-check |
| 2b | No loading bar on today's holes | PASS | bar never shown, Tee off enabled at once |
| 2c | Tee off works at once | PASS | |
| 2d | No console errors | PASS | |
| 2e | No GLTFLoader / meshopt / .glb request | PASS | zero such requests on all three links, and in the 1920x1080 keyboard run |
| 3 | `?hole=pl-01&biome=test-models` | PASS | bar "Loading… 0%" with Tee off disabled (a real click is refused) and state `loading`; then intro, cube markers, the hole plays out (10 strokes with scripted shots), no errors, 1 .glb request |
| 4 | `?set=prototype3&biome=test-models` into hole 2 | PASS | 1 .glb request in total; after `nextHole` hole 2 is in `intro` at once (compact-card bar hidden), no errors |
| 5 | Fallback: .glb 404 and .glb aborted | PASS | the notice "Couldn't load a model (assets/models/test-cube.glb), so simple stand-ins are drawn instead." shows on the intro card, markers are balls, hole plays out, no page error. Only the browser's own "Failed to load resource" console line appears (expected, comes from the blocked request) |
| 6 | Quit to menu after test-models | PASS | menu shows, renderer 0 geometries / 0 textures, 0 cached files, no errors |
| 6b | Then start pl-01 "normally": no cube, no bar | PASS with a caveat | pl-01 launched from the menu in the same page visit is still dressed in `test-models` and loads the cube again (bar shown). That is the documented rule: `?biome=` dresses every hole of the visit (same as on main with other sets). A fresh visit to `?hole=pl-01` has no cube and no bar (item 2). See note 2 |
| 7 | One full hole with real keyboard input, pl-01, 1920x1080 | PASS | Enter on the card, Space x3 per shot, ArrowLeft; holed in 5 strokes, no console errors, no model requests. fps not meaningful (about 4 fps in this software renderer at 1080p) |
| 8 | Loading bar on the intro card at 320x568 and 844x390 | PASS with a caveat | 844x390: bar and "Loading… 0%" are visible above the Tee off button. 320x568: the card scrolls (Tee off is sticky at the bottom) and the bar sits below the fold, so it is not seen without scrolling; the greyed-out Tee off is the only visible cue. See B1 |
| 9 | Island coast `?hole=mtn-07&biome=island-day` | PASS | loads, plays to aim, no errors, no model request |

Not tested: real network slowness beyond a fixed route delay, a corrupt (non-glTF) .glb, iOS Safari.

## Bugs

| ID | Severity | Steps | Expected | Actual | Screenshot |
|---|---|---|---|---|---|
| B1 | Low | Open `?hole=pl-01&biome=test-models` at 320x568 while the file is slow | The loading bar is visible on the card | The intro card is taller than the screen and scrolls, the bar is below the fold (y about 691 of 568). Only a disabled grey Tee off is visible. Not reachable by any real hole today (no real biome uses models) | `reviews/qa-screenshots/AP3/loading-320x568.png` |

No High or Med bugs.

## Notes (for the PM and designer)

1. **Feel:** on a fast connection the bar is on screen for a blink (the cube is 1 KB). When the first real models come (AP7), the grey disabled Tee off plus the percentage reads clearly at 390x844 and 844x390 (see `loading-390.png`, `loading-844x390.png`).
2. **Menu after `?biome=`:** quitting to the menu and starting another hole keeps the dev biome for the rest of the visit. Intended and unchanged, but a tester who expects a "normal" pl-01 after the menu has to reload the page.
3. **Look:** with test-models the markers are small cubes and the rest of the hole is the Meadow day palette, which matches the PR description (`cubes-aim-390.png`). The cubes are small enough that they are hard to pick out from the aim view; judge them on the tee card or flyover.

Other screenshots: `pl01-8134-aim.png` (pl-01, 390x844 viewport shot), `desktop-1920.png` (1920x1080), `fallback-missing-390.png` (the notice).

## Verdict

**READY TO MERGE.** Today's holes are pixel-identical to main with no model download, and the loader, cache, fallback and free behaviour all work. B1 is Low and only affects a hole that uses models on a very small phone.

— Agent: qa
