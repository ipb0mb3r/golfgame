# QA report: dev/X43-water-surface (PR #131, X43 + X42)

- **SHA:** 6db332d477c4d9e922c14e431df0a4717017cc03
- **Level:** LIGHT, ~15 min. Environment: headless Google Chrome (SwiftShader software GL) through Playwright, viewport 390x844 @2x touch, served locally with `python3 -m http.server`. Main build (origin/main) served alongside for the seed comparison.
- Not run on purpose (per the task): node --test, baseline, menu-check, session-check, perf-check.

## Results

| # | Item | Result | Notes |
|---|---|---|---|
| 1a | mtn-04 + meadow-day (creek): see-through, soft edge, no errors | PASS | Grass, painted bank and the water all show through the surface, and the edge fades into the bank with no cut line. |
| 1b | pl-02 (pond): see-through, soft edge, no errors | PASS | Pond reads as water. The edge is soft against the grass and the brown bank ring. |
| 1c | mtn-07 (rock banks): soft edge against rock, close-up | PASS | The rock bank fades softly into the water. No jagged line or stair-stepping, even at ball height. See `X43-mtn-07-rock-bank-closeup.png`. |
| 1d | Console and shader errors | PASS | The only console error on all 4 holes is a 404 on `/favicon.ico` (the local server has none). It is not from the PR. The only warnings are the SwiftShader "GPU stall due to ReadPixels" messages. No shader or WebGL errors. |
| 2a | Ball resting next to and in water | PASS | On mtn-04 the ball sits on the bank with the creek beside it. On mtn-07 the ball lies in the water (Lie: Water, y -2.36) and is still clear. A ball shadow is visible. |
| 2b | Aim dots over water | PASS | The yellow dots are fully visible across the creek (mtn-04, mtn-07) and are not tinted by the surface. |
| 2c | Landing marker / distance label | PASS | The red and blue landing pin and the "188 yd · OB" label draw cleanly. |
| 2d | S23 tree warning text | PASS | The warning text is readable over the water view. |
| 2e | S23 "Water" landing label and splash | NOT TESTED | I could not get a shot that lands in water with the label on screen, and the splash is a fraction of a second under a headless clock. The dev reports checking "222 yd · Water" on mtn-07. Two real shots into the mtn-04 creek (50,-120 and 56,-125) drowned and dropped as expected, with no visual glitch in the flight frame I captured. |
| 3 | Same seeded shot gives the same result as main | PASS | `?hole=mtn-04&biome=meadow-day&seed=7`, three testHits (two into the creek, one from the tee). The PR and main match exactly: ball at (50,0.526,-120) / (56,-0.447,-125) / (52.960,0.209,-41.805), strokes 2 / 4 / 5. |
| 4 | mtn-05 + island-day | PASS | Loads fine. The turquoise water reads as water, with soft sheen streaks and an edge that blends into the sand and grass. See `X43-mtn-05-island.png`. |
| 5 | Feel | See below | |

Screenshots (`reviews/qa-screenshots/`): `X43-mtn-04-creek.png`, `X43-mtn-07-rock-bank-closeup.png`, `X43-pl-02-pond.png`, `X43-mtn-05-island.png` (all 390x844).

## Bugs
None found.

## Feel notes for the game designer
1. It reads as water, not a blue hole. You can see the bank colour and rock shapes through it, and the soft sheen streaks and slow ripples give it a surface. The mtn-07 rock banks look much better than a hard cut.
2. The ripples are slow and gentle. In the stills I checked I saw no flicker or shimmer near the camera, even with the ball in the water. A headless software renderer can't judge real-time motion on a phone, so the owner should watch it moving.
3. The creek looks a little "glassy blue" in meadow-day at 0.5 opacity. That is the owner's pick and is fine. It keeps the creek bed and bank visible, which helps you see how deep the bank is.
4. Far away, the water edge stays crisp and thin (the pond on pl-02 is a clean lens shape). The fade only shows up close, which is what you want.
5. Ball in the water (Lie: Water) is still easy to find. The white ball and its dark shadow stand out against the blue.

## Verdict
**READY TO MERGE.** The remaining NOT TESTED item (the S23 "Water" label and the splash) is low risk. The water draws before those elements, and the dev reports checking them.

— Agent: qa
