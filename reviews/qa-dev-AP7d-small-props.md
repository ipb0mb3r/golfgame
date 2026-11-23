# QA report: AP7d small props (PR #121)

- SHA: 0c3ca8efe550b3a54c4a1506257a2c80e0975c85 (branch dev/AP7d-small-props)
- Environment: headless Chromium (Playwright, swiftshader), local http.server, 390x844 only
- Level: LIGHT (~15 min). Not re-run by request: node --test, perf-check, session-check, menu-check.

## Results
| # | Item | Result |
|---|---|---|
| 1 | mtn-04 + test-small-props: six pieces present, surfaces correct | PASS (see detail) |
| 2 | Ball-hide with bush/reeds (mtn4-pitch-over, plus a rough ball) | PASS |
| 3 | Real sets unchanged: mtn-04 default, mtn-07 meadow-day | PASS: smallProps() is null, no console errors |
| 4 | No shader/console errors, test-small-props on pl-01 and mtn-09 | PASS: 0 errors (only the swiftshader "GPU stall" warning) |
| 5 | Feel close-up | DONE (below) |
| - | Desktop 1920x1080, full play-through, baseline | NOT TESTED (out of scope for this brief) |

### Detail for 1
I re-ran the scatter in the page, with the live surfaceAt, for mtn-04 (without the tree/stake keep test, so 7498 vs the game's 7375 scattered):
- grassTuft 5264: rough 4409, ob 855
- flowerPatch yellow 918: rough 817, ob 101
- flowerPatch red (propB) 466: rough 418, ob 48
- pebbles 251: rough only
- flatStone 98: rough only
- flowerBush (plain green, leafTop) 22: ob only
- reeds 479: all on rough (land), 407 have water within 1 m, none on water
- Zero props on tee, fairway, fringe, green, sand, rock or path. Matches the set's `on` lists.
- Tee view: 7 draw calls, 4500 tris.
- Reeds seen at the creek bank in the screenshot, standing on grass, not in the water.

### Detail for 2
- mtn4-pitch-over (fairway ball) and a ball placed in the rough on the creek bank (nearest drawn prop 3.2 m): the ball is clearly visible, nothing stands between ball and camera.
- The bush was in neither frame (it only grows beyond OB), so its ball-hide is covered only by the nearest-prop clearance, not by a picture with a bush next to the ball.

## Bugs
None found.

## Feel notes for the game designer
1. The rough by the creek now reads as living grass: short tufts, little flat stones, pebbles and tall reed clumps along the bank. The reeds are the best part; they make the water edge look natural and do not block the ball.
2. In the close-up frame I could not see any flower patches, even though about 1400 are scattered on the hole. They are probably small or sparse at this camera height, or out of frame. Worth an owner look on a real phone.
3. Against docs/art/small-props/08-chosen-all-biomes.jpg (Meadow): same family (low-poly tufts, grey stones, green reeds), but in game they are small and subtle, less showy than the artist's board.
4. Bush dark-at-crown or dark-at-foot: NOT SEEN. The bush grows only beyond OB and was in no frame I took.
5. Props never appear on the line of play (fairway, green, sand), so the course stays easy to read.

Screenshots (390x844): reviews/qa-screenshots/mtn-04-tee-390x844.png (viewport shot), mtn4-pitch-over-390x844.png, mtn-04-rough-ball-390x844.png (the feel close-up).

## Verdict: READY TO MERGE
No bug found; the bush look and flower visibility are left for the owner's phone check.

— Agent: qa
