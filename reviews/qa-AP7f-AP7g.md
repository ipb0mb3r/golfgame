# QA: AP7f + AP7g (Light)

- PR #137, branch `dev/AP7f-AP7g-fences-event-props`, SHA `997566d49602aa88ffd5bba4f60a7e65bad70c03`
- Environment: headless Chromium (Playwright), software GL, phone portrait 390x844 (main), landscape 844x390. Local files served, seed 7.
- Level: LIGHT, about 20 min. Only the MUST list the PM gave was run (no physics change, so baseline.mjs was not run; menu-check not run, as told).

## Result table

| # | Item | Result |
|---|---|---|
| 1 | `node --test` | PASS: 659 pass, 0 fail |
| 2 | Fences on the slope (mtn-07, test-fences, FENCE_SCALE 1 / 1.5 / 2) | PASS: posts sit on the ground (also on the 11 % bank), rails meet both posts, fences stay beyond OB, nothing in play. Rope fence on the right looks right. No console errors at any scale. |
| 3a | pl-01 dressed tee, portrait | PASS |
| 3b | pl-01 dressed tee, landscape | PASS (tall flags stand large at the screen edges and partly sit under the HUD, see feel notes) |
| 3c | Aim fully left / right never looks through a tent or flag | PASS up to about 105 degrees off the line; **FAIL (Low) when aiming backwards**, see B1 |
| 3d | Green flags vs hole flag and ball (approach and putting) | PASS: at 35 and 60 yd they frame the green and the hole flag; putting from 5 and 9 yd the back flag stays out of the way and never covers the ball or the hole |
| 4 | Real shots on both holes (one real Space-key swing + scripted shots; mtn-07 included a water drop) | PASS: strokes, surface, OB label, result and drop behave as before; no collider felt; no console errors |
| 5 | perf-check | REPORTED (no new bug), see below |

### Perf-check (`--hole <id> --biome <set>`)

| hole + set | draw calls (tee) | triangles (tee) | flyover peak draws / tris |
|---|---|---|---|
| pl-01 test-event-props | 37 | 40k | 31 / 40k |
| mtn-07 test-fences | 38 | 309k (over 300k, flagged "!") | 27 / 307k (flagged "!") |

mtn-07: the 309k matches the dev's number and is meadow-day's own 303k (backlog X47), not new. Fences alone: 2 draw calls, 6,840 tris at 1.5 (10,197 at 1; 5,148 at 2), 144 / 214 / 109 posts at 1.5 / 1 / 2. pl-01 event props: 7 props, 2 draw calls, 433 tris. Headless fps (18 and 3) is software rendering, not meaningful.

## Bugs

**B1 (Low): aiming backwards past about 110 degrees toward the tent fills the screen with the tent roof.**
- Steps: `index.html?hole=pl-01&biome=test-event-props`, 390x844, start, then set the aim to +2.08 rad (about 119 degrees to the right of the tee line; holding the right aim button turns all the way round, the aim is not limited). In landscape the same aim shows a red wall over the right half.
- Expected: the aim view never looks through a prop. Actual: the camera ends up next to the tent behind the tee (tent at x -10.5, z 5), so the red roof covers the screen (HUD stays readable). At 1.85 rad (106 degrees) and below it is fine; on the other side (-2.08) the tent roof is seen from a distance, fine.
- Only reachable by aiming away from the hole (the label reads OB there), so unlikely in play. Screenshot: `reviews/qa-screenshots/AP7g-bug-tent-roof-fills-view-aim-119deg.png`.
- The spec's clear zone covers the tee camera's forward sight, not a full turn. PM to decide whether it is acceptable.

No other bugs. No console errors on any run.

## Feel notes for the game designer

1. Fences read well at 1.5: you notice a wooden rail line behind the trees along the left bank and a thin rope line on the right. They never pull your eye from the fairway. At 1 they are fine and busy (more posts); at 2 they are bolder and quieter. 1.5 looks like the sweet spot on a phone.
2. The rail fence follows the steep slope nicely, the rails tilt with the ground. It reads as a proper boundary.
3. The tee dressing in portrait is subtle: from the tee you mostly see two red feather flags far down at the sides, a tournament feel that does not distract. In landscape they are much bigger at the screen edges, tall banners partly under the HUD card. Fun, but large next to the tee marker.
4. At the green the two flags behind frame the hole flag like a finish gate. In the putting view the red banner of the back flag peeks above the horizon next to the hole flag; both are red, so at a glance it can read as a second hole flag (the real one has the ring and the line).
5. A tent seen from a distance (aiming to the OB side) looks cute and clear: yellow frame, red roof.

## Verdict

READY TO MERGE (only a Low aim-backwards edge, B1, for the PM/owner to accept or ticket).

— Agent: qa
