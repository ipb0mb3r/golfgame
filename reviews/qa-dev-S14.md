# QA report: PR #61 "S14: 2-click putting" (LIGHT)

- SHA: cef5ecd (dev/S14-two-click-putt). Chromium headless (swiftshader), 390x844 touch context. Time: about 14 min (hard limit 15).
- Limitation: while menu-check was running in the background the headless page ran so slowly that the putt meter never advanced (value stayed 0), so no real timed putt could be driven. Real putting rolls were NOT TESTED.

| # | Item | Result |
|---|---|---|
| 1a | node --test | PASS (395/395) |
| 1b | tools/baseline.mjs check | PASS (all 19 shots match) |
| 1c | tools/session-check.mjs | PASS (12 cycles, no growth, input bound once, no stray timers) |
| 1d | tools/menu-check.mjs | NOT COMPLETE: started on cef5ecd, only printed "menu paths: 55" before the time limit. Dev reported 315/315 on c8aca4f; not re-confirmed on cef5ecd. |
| 2a | Putt on h1-green / mtn1-putt: hit on 2nd input, 1 stroke, rolls along aim, early vs late same line | NOT TESTED (meter did not advance, see above) |
| 2b | Putt bar HUD: no accuracy window, no edge lines, no "accuracy" label; flag and 4 sections show | PASS on h1-green at 390x844 (DOM check: #accLabel, #sweet, #sweetFrame hidden; #sections and #pinTick visible). Screenshot taken. mtn1-putt NOT TESTED |
| 2c | After click 1 the hint reads "Putt: click to start, click again to set power" | PASS (Space) |
| 2d | No "Nice shot!/Perfect!" on a putt; holed / lip-out flashes still show | NOT TESTED (no putt was hit; code path reads right: session.js flashes only if label non-empty) |
| 3 | Tee shot and chip still take 3 clicks with accuracy window | NOT TESTED |
| 4 | Missed clicks on a putt (start only cancels with no stroke; no power click gives "Topped!" mini putt) | NOT TESTED |
| 5 | 390x844 screenshot of the putting bar | PASS: reviews/qa-screenshots/qa-dev-S14-putt-bar-390x844.png |

## Bugs
None found. Note: strokes read 1 at scenario start on h1-green (probably the scenario's preset, not checked against the scenario definition).

## Feel notes for the game designer
1. Not playtested by feel (no real putt was driven). Please try a few putts on your phone from the PR's play links.
2. With no accuracy phase, the whole bar is power, so the 4 sections and the flag should be easier to read; check that the marker's speed still feels right for a 2-click rhythm.
3. A putt with no word at all after it (no "Nice shot!") may feel quiet; "Topped!" is the only putt word.

## Verdict: NOT READY (insufficient QA coverage, no defect found)
Automated checks pass and the putt bar HUD looks right, but the core behaviour (2nd click hits, straight line, missed clicks, 3-click full shots) was not exercised. A re-run on an idle machine is needed, or the owner's phone playtest can cover it.

— Agent: qa
