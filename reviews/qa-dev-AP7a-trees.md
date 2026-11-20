# QA report: AP7a, gradient trees (PR #105), LIGHT

Commit tested: `0f3ec52325d6fe3283b4aeb5b8a805499ac3e181` (dev/AP7a-trees), compared with origin/main `5c8439c`. Phone portrait 390x844.

| # | Check | Result |
|---|-------|--------|
| 1a | `node --test` | PASS (562 pass, 0 fail) |
| 1b | `node tools/baseline.mjs check` | PASS (19/19 match) |
| 2 | Existing sets unchanged: mtn-07 default and mtn-07 `alpine-day` vs main, tee view | PASS (screenshots byte-identical to main) |
| 3a | `test-trees` (mtn-07) and `test-island-trees` (pl-01): whole trees, no missing faces, z-fighting or floating trunks, neighbours vary | PASS at tee and in the aim view into the forest (round, spruce, birch mix; palms and round trees on the island) |
| 3b | In-play trees still stop the ball; same rest point as main | PASS: full-power shot into a tree (aim 0.6 left) on mtn-07 `alpine-day` rests at (-42.98, -57.59), Rough, on both main and PR; same point on `test-trees` |
| 4 | Red tree warning marker appears when aiming into the new trees | PASS: "At full power this shot hits the trees (96 yd)" plus red marker (`pr-test-trees-warning.png`) |
| 5 | One shot with real keyboard (Enter, arrows, Space x3), no console errors | PASS, ball moved, 0 console errors (also 0 in all screenshot runs) |
| - | Close-up of trees from the ground, other holes, desktop, perf | NOT TESTED (LIGHT, time) |

Note: the 14 ArrowLeft presses in the keyboard run did not aim at a tree (no warning), so the warning was checked by setting the aim in code; the shot itself was real keyboard input.

## Bugs
None found.

## Feel notes for the game designer
1. The mixed forest reads well: birch, round and spruce give a varied tree line and the soft gradient looks friendly on the phone. Up close the trunks are long, so the canopy floats high; this matches the artist's "lollipop" note.
2. Trees at the tee are small, far-off silhouettes, so a tree in play is hard to judge by eye; the red warning marker is what tells you it is there. Worth keeping that warning prominent.

## Verdict
READY TO MERGE (LIGHT level; the PM/artist note about spruce and palm colour slots is a data follow-up, not tested here).

Screenshots: `reviews/qa-screenshots/AP7a/` (main-/pr- pairs for mtn07-default and mtn07-alpine, pr-mtn07-test-trees, pr-pl01-test-island-trees, pr-test-trees-warning).

— Agent: qa
