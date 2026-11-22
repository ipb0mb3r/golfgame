# QA report: AP7b palm (PR #112), LIGHT

- SHA tested: `b446b054efb2725c25d04c395810de9ffe3045c4` (dev/AP7b-palm); compared against origin/main `ea43351f5734905f3e648f9a7d06359e7a746c44`
- Environment: headless Chromium (Playwright, software GL), 390x844 touch/mobile viewport, `?seed=7`, ports 8145 (PR) / 8146 (main). Level LIGHT, about 15 min.
- Note: fps in headless software rendering (4-25) is not meaningful; fps NOT TESTED.

## Results
| # | Item | Result |
|---|---|---|
| 1a | `node --test` | PASS (571 pass / 0 fail) |
| 1b | `node tools/baseline.mjs check` | PASS (19/19) |
| 1c | `node tools/session-check.mjs` (X34) | PASS, fully ok ("pl-01 26, same as pl-01 meadow-day before mtn-07: 26", 12 load/dispose cycles, no growth) |
| 2 | mtn-07 (mtn-default) and pl-01 (proto-default) tee views vs main, 390x844, seed 7 | PASS: both PNGs byte-identical to main |
| 3a | `?hole=pl-01&biome=test-island-trees` (new palms) | PASS: palms whole, no towers/broken fronds/z-fighting visible. Caveat: at the tee view the palms are small and far (two thin palms, left and right of the fairway), so close-up frond detail was not judged |
| 3b | `?hole=mtn-07&biome=alpine-day` (birch) | PASS: backdrop trees whole and dense, nothing odd. Birches are tiny at tee distance, so lobe shape not judged |
| 3c | `?hole=mtn-07&biome=meadow-day` (round canopy) | PASS: round trees whole, no towers, no z-fighting |
| 3d | In-play tree still stops the ball (mtn-07 alpine-day, aim 0.64, power 0.4, wind 0) | PASS: rest (25.74, -32.22) on both PR and main (identical); tree at (28.1, -37.8). Three other aims also matched main exactly: (57.82,-66.02), (-20.52,-105.15) and (0.00,0.00) |
| 4 | One shot with real keyboard (Space x3) on pl-01, console | PASS: stroke 1 recorded, ball at (-47.2, 0, -152.7), 0 console errors, 0 page errors across all runs |
| 5 | fps | NOT TESTED (headless software GL) |

## Bugs
None found.

## Feel notes for the game designer
1. Palms: from the tee they read as clean, simple island palms. They are quite small and thin at that distance, so the round dome only shows up close. Worth a look on the phone when you walk up to one.
2. Birch: in the alpine view the birches blend into the pine line at the horizon. You cannot tell them from the other trees until you are near, so the new two-row lobes are mostly a close-up change.

## Screenshots (bugs: none; one per viewport and view)
`reviews/qa-screenshots/AP7b-palm/`: `palm-pl01-island-trees-390x844.png`, `birch-mtn07-alpine-day-390x844.png`, `round-mtn07-meadow-day-390x844.png`, `tee-mtn07-default-390x844.png`, `tee-pl01-default-390x844.png`.

## Verdict: READY TO MERGE
(The desktop 1920x1080 check is outside the PM's LIGHT scope for this PR and was not run.)

— Agent: qa
