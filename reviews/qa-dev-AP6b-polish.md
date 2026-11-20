# QA report: AP6b polish sky and backdrops (PR #101)

- **SHA tested:** e445aa484ffd9abeb310e894d9f1577b412972c2 (dev/AP6b-polish), served on :8138; origin/main on :8139 for comparison
- **Environment:** headless Chromium (Playwright, software GL), Linux; 390x844 main viewport, 1920x1080 desktop
- **Level:** LIGHT (15 min). `seed=1` on every shot. Screenshots: `reviews/qa-screenshots/AP6b/` (`main-*` = before, `pr-*` = after, `cmp-*` = main left / PR right, `crop*` = zoomed side by side)

## Results

| # | Item | Result | Notes |
|---|---|---|---|
| 1a | `node --test` | PASS | 554 pass / 0 fail |
| 1b | `tools/baseline.mjs check` | PASS | all 19 shots match |
| 2.1 | AP6a B1: ragged cloud edge / white specks over hills (pl-01 + mtn-07 `test-island-look`) | PASS | Main shows the jagged white specks at the cloud/hill overlap (mtn-07 phone left edge, pl-01 desktop left hill). PR: clean hill, smooth cloud. `crop1-cloud-mtn07-tee.png`, `cmp-pl01-island-desk.png` |
| 2.2 | `test-meadow-look` hills soft, not streaky slabs | PASS | Main has visible vertical bands/steps in the left hill; PR is one smooth hill fading into haze. `crop2-meadow-hills.png` |
| 2.3 | Minimap shows sea beyond OB on `test-island-look` (pl-01, mtn-07); trees and boulders still visible | PASS | pl-01: cyan strip on the left (sea) edge of the minimap. mtn-07: cyan strip along the top edge. Tree dots, pond, bunkers and green all still visible. Only the sea side is cyan, as intended. `crop3-minimap-pl01.png`, `crop3-minimap-mtn07.png` |
| 2.4 | No dark ridge sliver on far-left horizon of pl-01 island | PASS | Thin dark line at the far-left horizon on main (desktop view); gone in PR. At 390x844 I could not see it on either build, so the desktop crop is the evidence. `cmp-pl01-island-desk.png` |
| 3 | Real sets unchanged: mtn-07 `alpine-day` and `island-day` tee, 390x844 vs main | PASS | Pixel diff 0 differing pixels in both |
| 4 | Real keyboard on pl-01 `test-island-look` (Enter, Space, ArrowLeft, Space x3) | PASS | Flyover skipped with Space, ArrowLeft aimed toward the sea, shot went OB and the ball came back to the tee at stroke 3 (shot + penalty), game back in aim state. Zero console errors / page errors. `pr-keyboard-after-shot.png` |
| - | Console errors on all 16 screenshot loads | PASS | none |

Not tested (LIGHT): full hole play-through, perf-check, flyover frames, other viewports, real phone GPU.

## Bugs

None found.

## Feel notes for the game designer

- The sky now feels clean: clouds sit softly in front of the hills with no sparkle or crunchy edge, so the backdrop stops drawing the eye to the wrong place. The meadow hills now read as distant, hazy hills, a nice calm background.
- The minimap sea is a thin cyan edge. It tells you "water is that way" at a glance, which is useful when aiming at the sea side, but it is subtle: on a tiny phone minimap it is about 2-3 pixels wide.

## Verdict

**READY TO MERGE.** All four AP6a findings are fixed, the real sets are pixel-identical to main, tests and baseline pass, no console errors.

— Agent: qa
