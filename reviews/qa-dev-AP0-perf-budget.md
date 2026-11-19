# QA report: AP0 phone budget and measuring (PR #75)

- SHA: 15b2213158eef0df76a58c96d3dacfcb1fb1b065 (branch dev/AP0-perf-budget)
- Environment: headless Chromium (Playwright, software GL), served with `python3 -m http.server 8124`, 390x844
- Level: LIGHT. Time spent: about 12 min.

| # | Item | Result |
|---|------|--------|
| 1a | `node --test` | PASS (467 pass, 0 fail) |
| 1b | `node tools/baseline.mjs check` | PASS (all 19 shots match) |
| 1c | `node tools/perf-check.mjs` | PASS (exit 0; table sane; exactly 9 holes over budget: pl-02, pl-03, mtn-01, 02, 04, 05, 07, 08, 09; pl-01, mtn-03, mtn-06 ok; the numbers match the PR description) |
| 2a | `?hole=mtn-07&debug=perf`, 390x844: overlay shows fps, draws, tris, textures, memory, coloured vs budget, no collider outlines | PASS (209 / 150 draws red, 365.6k / 300k tris red, 2044 px red, fps red; gpu ~15.8 / 64 MB; "obst ... warn none", no outline line) |
| 2b | `?debug=1` still has the outlines | PASS (357 draws "incl. <= 265 debug outlines", "outlines on"; yellow outline boxes visible on the horizon) |
| 2c | `window.__golf.perf()` equals the overlay | PASS (drawCalls 202-209, triangles 365091, geometries 36-44, textures 1, gpuMB 15.78, geo 9.2, tex 6.6; `outlineCalls` 0 with debug=perf, 265 with debug=1) |
| 3a | `?hole=pl-01` with no debug link: no overlay | PASS |
| 3b | No console errors (all three runs, incl. tee-off flyover) | PASS (none) |
| 3c | One shot with real keyboard (Space) | PASS (stroke 1 to 2, ball to fairway, 140 yd to pin) |
| 3d | Looks and plays as on main | PASS (no visible difference seen; baseline 19/19 also passes) |
| 4 | Overlay vs HUD at 390x844 | PASS (it sits between the minimap and the "Landing" button / hint, covers no HUD panel; it does cover part of the course view, as designed). 320x568 NOT TESTED (known low issue) |

## Bugs
None found.

## Notes
1. The overlay is not visible while the intro card is open (it only shows after Tee off), so a phone tester who opens a `debug=perf` link sees nothing until they tap Tee off. Worth one line in the PM's link message.
2. The headless fps (2 to 3 on mtn-07) is software rendering and says nothing about a phone, as the PR says. My "Swing cancelled" toast in the screenshot came from my own second Space press during the slow flyover, not from the PR.

Screenshots: `reviews/qa-screenshots/ap0-perf-mtn07-390.png` (overlay, 390x844), `reviews/qa-screenshots/ap0-pl01-390.png` (no debug, after one shot).

## Verdict: READY TO MERGE

— Agent: qa
