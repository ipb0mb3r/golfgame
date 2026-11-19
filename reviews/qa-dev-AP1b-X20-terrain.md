# QA report: AP1b + X20 (PR #80, branch dev/AP1b-X20-terrain)

- **SHA tested:** 38e195d04299ae501009019bfdb65b614eab23cc (compared against main 29ebbf3, served side by side)
- **Environment:** headless Chromium (Playwright, software GL), Linux. PR on :8126, main on :8127. Viewports 390x844 (main), 320x568, 844x390, 1920x1080.
- **Level:** FULL. About 30 min. Screenshots only for viewports and the putt view (no bugs found, so no bug shots).

## Results

| # | Item | Result | Notes |
|---|---|---|---|
| 1a | `node --test` | PASS | 517 pass / 0 fail |
| 1b | `tools/baseline.mjs check` | PASS | all 19 shots match |
| 1c | `record-baseline-v2.mjs --dry` | PASS | all 83 shots replay exactly, nothing to write |
| 1d | `tools/perf-check.mjs` | PASS | "Every hole is within budget"; mtn-07 262k, mtn-09 251k, mtn-04 242k tee tris (same as the PR table) |
| 2 | Visual sameness vs main, 390x844: tee mtn-04/07/09, mid-hole (ball at z=-180), green close-up on mtn-04/07/09 | PASS | Pixel diff PR vs main, share of pixels differing by more than 8/255: 0.003% to 0.39%. The biggest (mtn-07 mid, 0.39%) is the animated accuracy meter and aim marks; I looked at both images side by side and the ground, river bank, far hills and tree line are identical. No seams, cracks, holes in the ground, changed far silhouette or blocky shading seen. |
| 3 | Ball sits on the drawn ground (fairway, rough at play-area edge, bunker, creek/pond bank, green) on mtn-07 and mtn-09 | PASS | Ball placed with `place()` and looked at close up (aim camera). Fairway, rough edge, bunker (both holes), water bank (mtn-07) and green (both holes) all look seated: no floating, no visible sinking. mtn-09 "bank" probe landed on rough away from the water (not on the creek bank); the mtn-07 creek bank, the steepest spot, looks right. The green spot on mtn-09/mtn-07 is the same as in item 2. |
| 4 | 5 scripted shots on mtn-09 vs main (within 0.01 m) | PASS | All 5 end points identical to the last digit (x, y, z, strokes). Shots 2 and 3 were water/penalty drops back to the placed spot on both builds, so 3 of 5 are real flights (0 m difference on all). |
| 5 | `?set=mountain9`, 2 holes, transition, quit to menu | PASS | Holed hole 1, "Next hole", holed hole 2, "Next hole", tee off hole 3, Esc, Quit, confirm. Menu shown, renderer memory 0/0/0, no console errors. |
| 6 | One full hole, real keyboard, 1920x1080 | PASS | mtn-03: holed in 6 strokes with Space (3-click meter) + Enter skip. mtn-07: played to the 10-stroke pick-up (several bad swings from my crude timing). No console or page errors in either. |
| 7 | 320x568 and 844x390 tee views of mtn-09 | PASS | Terrain fine in both. At 320x568 the hole info panel and the wind badge touch/overlap slightly at the top right; same HUD code as main, not caused by this PR, mentioned only for the designer. |
| 8 | Putting on a mountain green (0.5 m cells) | PASS | mtn-09, 4 m putt: read view shows a smooth green, aim line and cup right; the putt rolled and the ball stayed on `heightAt` (y matches). Contours show only gentle shading, no 0.5 m blockiness. |

## Bugs

None found.

## Notes

1. The terrain looks the same as main to the eye on every view I compared. The only differences are in the meter and aim marks (animated), not the ground.
2. Shots 2 and 3 of my item-4 script were water penalties on both builds. They still match exactly, but a future check should place them on dry land to cover more flight paths.
3. At 320x568 the top-left info panel and the wind badge touch. It is pre-existing HUD layout, not an AP1b effect.

## Feel notes for the game designer

- Nothing feels different: ball rolls, lies and putts behave as before (shots are bit-identical to main).
- Terrain far away still looks like the same hills; flat fairways look just as smooth, no new faceting.
- Aiming should feel the same or a bit snappier on phones; I could not measure on a real phone.

## Verdict: **READY TO MERGE**

Screenshots: `reviews/qa-screenshots/AP1b/` (one per viewport plus the putt read view).

— Agent: qa
