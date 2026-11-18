# QA (LIGHT): PR #59 "X12 + S23", branch dev/X12-S23

SHA ef46005. Headless Chromium (software WebGL), 390x844, local static server. Time spent: about 15 min (hard limit hit; two long runs were lost to software-render slowness, see NOT TESTED).

| # | Item | Result |
|---|------|--------|
| 1a | node --test | PASS (386/386) |
| 1b | tools/baseline.mjs check | PASS (all 19 shots match) |
| 1c | tools/session-check.mjs | PASS (12 cycles, no growth, input bound once, no stray timers) |
| 2a | X12: every hole (pl-01..03, mtn-01..09) loads via ?hole= and takes a shot | NOT TESTED (two scripted runs timed out under software rendering; only pl-01, mtn-09 loaded, no errors; mtn-03, mtn-05, mtn-06 loaded and ran with no console errors in the S23 runs) |
| 2b | Menu lists every course/hole with name/par | NOT TESTED (dev reports menu-check 315 pass; not re-run by instruction) |
| 2c | ?set=mountain9 starts; vs AI round starts | NOT TESTED (run was cut off by the time limit) |
| 2d | Load time, 390x844, one run each | PASS, see below |
| 3a | Blue marker "... Water" on mtn6-feeder-bank with 3 Wood | PASS: "215 yd · Water", class hazard, bg rgb(70,180,255). Driver/5i/7i stay yellow |
| 3b | Blue on mtn5-carry-pond with 5 or 7 Iron | PASS: 5i "194 yd · Water", 7i "167 yd · Water" (blue). Driver and 9i stay yellow |
| 3c | Red tree/OB warning wins over blue (mtn-03, Driver) | PASS: "293 yd · OB" is red (warn); 3 Wood "255 yd · OB" also red |
| 3d | Putts never warn | PASS: label hidden with the putter on mtn6 and mtn5 and mtn-03 |
| 3e | Blue wins over grey on a capped lie | NOT TESTED |
| 3f | Phone screenshot of the blue marker | DONE: reviews/qa-screenshots/qa-dev-X12-S23-blue-390x844.png |

## Time to Tee off (390x844, one run each, ms)

| Page | origin/main | PR |
|------|-------------|----|
| main menu (shown) | 3069 | 166 |
| ?hole=pl-01 | 3893 | 1065 |
| ?hole=mtn-09 | 8128 | 4804 |

Mountain holes are still slow in headless software rendering (the dev's X13 backlog item covers this).

## Bugs
None found in what was tested.

Note: the OB label on mtn-03 is shown with the red warn style because a tree/obstacle warning is active at that spot, as designed (PM comment). I could not tell from the label alone whether the tree or the OB triggered the red.

## Feel notes for the game designer
1. The blue marker with "Water" is easy to read and calm; it clearly separates "you will get wet" from the yellow default.
2. The warning only looks at where the ball lands, so a dry landing that rolls into the creek is not flagged. That matches the PM decision, but players may feel a bit surprised the first time.
3. Menu and Tee off now feel instant on a plain hole; mountain holes still take noticeably longer to become playable.

## Verdict
READY TO MERGE, with the caveat that the full 12-hole shot sweep, mountain9 / vs AI start and capped-lie priority were NOT TESTED by me (the dev's tests and menu-check cover these in part; the PM may want a follow-up check).

— Agent: qa
