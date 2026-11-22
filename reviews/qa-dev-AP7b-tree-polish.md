# QA report: AP7b tree polish (PR #110)

- SHA tested: `bb9a59886586718a64fd2ba26e47ff55750fd17b` (dev/AP7b-tree-polish), served on :8143; main (origin/main archive) on :8144
- Environment: headless Chromium (SwiftShader), 390x844 phone portrait, Node 22
- Level: LIGHT (15 min)

| # | Item | Result |
|---|---|---|
| 1a | `node --test` | PASS: 565 pass / 0 fail (PR text says 571; PM already noted 565 is right) |
| 1b | `tools/baseline.mjs check` | PASS: all 19 shots match |
| 1c | `perf-check --biome meadow-day --hole mtn-07` | PASS: 294k tris, 30 draws, flyover peak 292k, under 300k |
| 2 | mtn-07 (mtn-default) and pl-01 (proto-default) tee views vs main, 390x844, same `seed=7` | PASS: pixel-identical (zero diff) |
| 3a | mtn-07 meadow-day and alpine-day: trees whole, fuller canopies, no egg shapes | PASS: round lobes stacked, pines have 4 full tiers, no lollipop or egg seen in the flyover or tee frames |
| 3b | Far trees switch not popping during the flyover (4 frames each) | PASS (limited): no jump or colour/size change seen; headless runs at about 3 fps so frames are sparse, owner should still check on the phone |
| 3c | In-play tree still stops the ball | PASS: pl-01 `testHit(0.9, -0.2)` (the baseline tree shot), seed 7, rest point (38.159, -138.250) on main, on the PR, and on the PR with meadow-day. Identical |
| 4 | One shot with real keyboard (Enter, Space x3), no console errors | PASS: shot taken (strokes 1), console and page errors: none |
| - | `tools/session-check.mjs` | Not run (known §3b false alarm, same on main; not counted) |

## Notes
- Screenshots: `reviews/qa-screenshots/AP7b/` (`sheet-meadow-day.png` and `sheet-alpine-day.png` are 4 flyover frames + tee view each; `tee-mtn-07-pr.png` is the phone tee view).
- Tee-view compare without `?seed=` differs only in the wind HUD (random wind); pinned seed gives zero diff. Not a bug.

## Bugs
None found.

## Feel notes for the game designer
1. The forest now reads as full trees close up: the stacked round canopies and the 4-tier pines look solid from the tee and the flyover, not like balls on sticks. Alpine birches stay thin and airy, which looks a bit sparse next to the heavy pines.
2. From the tee, the far tree line looks the same as before (no visible switch to a simpler tree in the distance). Worth a look on the phone while the camera swoops forward.

## Verdict: READY TO MERGE
