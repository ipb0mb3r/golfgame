# QA report: AP7e big props (PR #128)

- SHA: 77436c58e24bcdf3e7cc20d8c55190c3a32e644c (branch dev/AP7e-big-props)
- Environment: headless Chromium (Playwright, software GL), viewport 390x844 @2x, local http.server. Level: LIGHT, 1 viewport.
- Not re-run (as instructed): node --test, session-check, perf-check, menu-check.
- The artist's images (`docs/art/big-props/01-03`) were not opened side by side (out of time), so the feel notes are from the PR build only.

| # | Item | Result |
|---|---|---|
| 1 | `?hole=mtn-07&biome=test-big-props`: no console/shader errors, 4 props beyond OB, grounded, visible aiming right | PASS (partly eyeballed). `bigProps()` = drawn 4, skipped 0, 5 draw calls, 1250 tris; props at x 82..124, z -50..-160 (right of the tee, beyond OB), y 2.0..3.3 (on terrain). No console errors or warnings (GPU-stall driver notes ignored). Screenshot `reviews/qa-screenshots/ap7e-test-big-props-390.png`: windmill and beach hut stand on the ground, not floating. The two chalets were not in that frame (aim too far, or a tree hid them). |
| 2 | Same seeded shot, same stop point | PASS. `seed=5`, testHit(0.8, 0.1): test-big-props and meadow-day both stop at x -45.0654, z -193.5859, identical. |
| 3 | Override safety | PASS. `mtn-07&biome=meadow-day`: loads, drawn 0 / skipped 0, no errors. `pl-01&biome=test-big-props`: loads, 0 props, no errors. |
| 4 | Real holes unchanged | PASS. `?hole=mtn-07` (biome mtn-default): 0 big props, no errors. `?set=test9` round start: reaches aim, 0 big props, no errors. |
| 5 | `tune=GROUND_EDGE_AA:0` | PASS for no crash: the game notes it (console warning "ignored tune values" plus an on-screen notice). Ground-edge smoothness NOT VERIFIED: my screenshot (`reviews/qa-screenshots/ap7e-ground-edge-tune-390.png`) caught the camera mid-transition, so no edge is visible. |
| 6 | Feel | see below |

## Bugs
None found.

## Feel notes for the game designer
- At tee distance the windmill and the little red-roofed beach hut read clearly as landmarks: a pale tower with sails and a tiny hut with a bright roof, sitting naturally in the tree line. They give the right side of the hole a "something is out there" pull.
- They are small and far, so the colour of roof and sails carries them. In my aimed shot a big scenery tree near the tee half covered the windmill.
- I could not tell the cleared spot in the scenery forest from an ordinary gap, so it is not noticeable (which is fine).
- Not compared with art images 01-03.

## Verdict: READY TO MERGE
Everything tested passes. Gaps for the owner's phone playtest: ground-edge smoothness without the removed switch (item 5) and the two chalets in view were not visually confirmed.

— Agent: qa
