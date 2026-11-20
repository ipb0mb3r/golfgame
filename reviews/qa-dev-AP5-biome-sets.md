# QA report: AP5 biome sets (PR #86)

- SHA tested: 4d715e5a803ac44d5e2eef455c91e03eb5328a4f (dev/AP5-biome-sets), compared with main 391e0e4. Served on 8130 / 8131, then stopped.
- Level: FULL. Headless Chromium (Playwright), serial, phone portrait 390x844 as the main viewport. About 35 min over two sessions.
- Method for item 2: the same hole, seed 7 and tune ANTIALIAS:0,DPR_CAP:1 on both builds, same scripted view, screenshots compared pixel by pixel (max channel difference).

| # | Item | Result |
|---|---|---|
| 1a | node --test | PASS (532/532) |
| 1b | baseline.mjs check | PASS (19/19) |
| 1c | session-check | PASS (incl. meadow-day step) |
| 1d | biome-check | PASS: mtn-default and proto-default pass with their named waivers only (fairwayB/rough, green/fairway, greenB/fairwayA, accent/warn, + subAccent/skyHorizon for mtn); meadow-day passes every rule, no waivers |
| 1e | perf-check identical to main | PASS: draws, triangles, geometries, textures, memory identical on all 12 holes; only tee-off time (machine load) differs |
| 2 | Visual sameness at 390x844 vs main | PASS (see detail) |
| 3 | pl-02 / pl-03 flag and tee markers | PASS |
| 4 | ?biome=meadow-day (mtn-07, round, bad id) | PASS with one observation (N1) |
| 5 | Full hole, real keyboard, 1920x1080, pl-01 and mtn-03 | PARTIAL: pl-01 finished (result card, no errors); mtn-03 reached stroke 3 in 95 s, no errors, not finished (headless is slow at 1920x1080 and my keyboard script is crude) |
| 6 | 320x568 and 844x390, mtn-07 meadow-day | PASS (badge and layout fine, no errors) |

## Item 2 detail (pixel diff vs main)
Views identical (max difference 1/255, 0 pixels above 1): mtn-03 putting read view with the grid on the green (only the waving flag cloth moved, 12 px, it is animated by time), mtn-03 putting view from low camera, flight camera mid-flight (mtn-07), the Landing view (mtn-07), ball-control icon off-centre (mtn-07), creek (mtn-03, two spots), boulder (mtn-03, close; the boulder shot shows trees and the green, the rock itself is small in frame), pond (pl-01, the pond fills the view), OB stakes (pl-01 and pl-03; stakes are thin and far, not truly close up).
On pl-03 the only differences are the flag, the minimap flag dot and drifting clouds/wind arrow (animated). Nothing else changed.
Limit: I did not get a truly tight close-up of the OB stakes or a boulder, because the camera follows the ball and I had no free camera.

## Item 3
pl-02 and pl-03 now have the red flag (pl-01's), seen at 13 yd on the green: clearly visible against the sky and the dark hill behind (before, pl-03 was a cyan flag that blended with the sky). The minimap flag dot is red too. Blue tee markers on the tee (screenshot pl03-tee-ap5.png). Screenshots: reviews/qa-screenshots/AP5/pl02-flag-ap5.png, pl03-flag-ap5.png.

## Item 4
- mtn-07 `?biome=meadow-day`: badge "BIOME: meadow-day", `__golf.biome` = meadow-day, far ground #3a942e (mtn-default #3d7a30). Colours change on course, trees, sky, hills, minimap. No console errors. Without the param no badge.
- `?set=mountain9&biome=meadow-day`: set of 9 (it has no 2-hole variant), I played hole 1 and advanced with `nextHole()`: badge and set stay on hole 2, no errors.
- Quit: in a round the pause menu asks "Quit this round?"; on Yes the menu opens and the URL keeps `?biome=meadow-day&seed=3` (like ?tune=, as designed). Starting a hole from the menu afterwards is drawn with meadow-day (badge on). 
- `?biome=nope`: notice "There is no biome set "nope", so the hole keeps its own look." and the hole is drawn mtn-default. No errors.

## Bugs
None found.

## Notes
- N1: the `?biome=` link sticks for the whole visit after quitting (the URL keeps it), so a tester must reload without it to see normal sets. This matches the PR description (same as ?tune=), only mentioning it.
- N2: item 5 on mtn-03 is incomplete (see table); the same code path (keyboard input) is unchanged by this PR.
- N3: on 320x568 the stats panel covers the top-left of the view and the tee marker looks orange there (meadow-day subAccent); same layout on main, not a regression.

## Feel notes for the game designer
- Meadow-day does read as a different place: brighter, greener and more saturated, a warmer light sky, softer hills. It is a day-to-day change more than a new world: same tree shapes, same flat sky, same hills.
- Fairway, rough and green are still easy to tell apart on a phone. The fairway stripes are a little softer than the Mountain look; the green is a lighter, fresher shade than the fairway. The bunker and water stand out clearly.
- The flag: the new red flag on pl-02 and pl-03 is easy to spot against sky and green, better than the old cyan one. On mtn-07 I did not see the flag from the tee (far away), so I cannot rate it there.
- The putting read view and flight camera look exactly as before, so the owner should feel no change in the Mountain 9 and pl-01.

Verdict: READY TO MERGE (no bugs; item 5 on mtn-03 and close-ups of the stakes and boulder are partial, listed above).

— Agent: qa
