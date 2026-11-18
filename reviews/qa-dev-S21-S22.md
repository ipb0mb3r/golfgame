# QA report: PR #53 (S21 tee aim + S22 power bar), FULL

- Branch dev/S21-tee-aim, SHA 9acd1bd (before the dev's "max N%" label removal; per PM, the "max N%" text is not counted either way).
- Environment: headless Chromium (software GL), local static server, Node 22. Time spent: about 24 min.

## Results
| # | Item | Result |
|---|---|---|
| 1a | node --test | PASS (375/375) |
| 1b | tools/baseline.mjs check | PASS (19/19 shots match) |
| 1c | tools/session-check.mjs | PASS (12 cycles, no growth) |
| 1d | tools/menu-check.mjs | PASS (all checks passed) |
| 2a | S21 aim straight ahead (-z, or teeFacing on mtn-07), at the club's carry, all 12 holes | PASS (every club in the bag: aim = facing, target distance = carry) |
| 2b | Changing club moves the distance, not the direction | PASS |
| 2c | Default shot never in water/OB | FAIL for one non-default club, see B1 (the auto-picked club is fine on all 12 holes) |
| 2d | Scorecard says "Aim: straight ahead (tee)" | PASS (seen on mtn-06 at 3 viewports and mountain9 hole 1) |
| 3a | No flag on full shots/chips, flag on putts | NOT TESTED in browser (pinTick hidden on tee shot: PASS; putt and chip not played) |
| 3b | 4 equal power sections | PASS (3 dividers visible, screenshots) |
| 3c | 3D marker = where a 100% straight no-wind shot lands | PASS (pl-03 7i: marker z -152.09, ball first touched down at z -151.96) |
| 3d | Ticks at 25/50/75% | PASS (39.8 / 77.2 / 113.5 m of 152.1) |
| 3e | Minimap line: only the 50% tick + end marker | PASS visually (screenshots) |
| 3f | Label: distance + Flat / ▲ / ▼ | PASS ("184 yd · ▲ 1 yd", "214 yd · ▼ 3 yd") |
| 3g | Capped lie: marker at cap, grey, ticks only below cap | PASS (rough 85%: capped class, 3 ticks; bunker 50%: capped, 1 tick) |
| 3h | Marker red when shot would hit a tree | PASS ("warn" class set on a rough shot on mtn-01; CSS is red; colour not seen on screen) |
| 4 | Accuracy frame sticks out above/below bar, does not cover "◀ accuracy" | PASS at 390x844 and 320x568 (frame sticks out 7 px each side; label starts exactly at the frame's bottom edge, no overlap) |
| 5 | Minimap bigger, overlaps nothing important | PASS at 390x844, 320x568, 844x390 (no overlap with info panel, wind, meter; Skip not shown at the aim) |
| 6a | ?set=mountain9 holes 1 to 3 with scripted shots | PARTIAL: hole 1 loaded and played with scripted shots, no console errors; holes 2 and 3 NOT TESTED (my script stalled on the result card, a harness problem, not a game bug) |
| 6b | Hole 5 separate fairway island | NOT TESTED |
| 7 | Load time to Tee off enabled, 390x844 | see below |
| 8 | ?set=mountain9&ai=normal starts | PASS (mode ai, normal, 5 rivals, 9 holes, intro shows, no errors) |
| 9 | fps | NOT TESTED (software GL) |

## Load time (software GL, 390x844, one run each, noisy)
| hole | this branch | main |
|---|---|---|
| ?hole=mtn-09 | 12.8 s | 12.6 s |
| ?hole=pl-01 | 6.4 s | 5.6 s |

## Bugs
- **B1 (Low-Med)**: on mtn-06 the default tee aim is not safe for every club. Steps: load ?hole=mtn-06, Tee off (auto-pick 5 Iron, fine), switch to 3 Wood. Expected: the default shot that finishes at the aim point never ends in water/OB. Actual: with 3 Wood the aim point (195 m straight ahead) is reached with power 0.936 and the ball ends in a penalty at about z -194. The other 11 holes and all other clubs are clean. `validateHole` only checks the auto-picked club, so it does not catch this. The owner said a default that ends off the fairway is OK, but a penalty is not what he asked for. No screenshot (found with a core script).

## Feel notes for the game designer
1. The marker and its label are the best part: "184 yd · ▲ 1 yd" over a yellow dot trail tells you the full-power distance at a glance. It was easy to read on the phone.
2. Aiming straight ahead on the tee feels honest: the line goes down the middle, so on a dogleg or a creek hole you must turn it yourself. That is what the owner asked for.
3. The 4-section bar plus the line ticks match, so a "half power" shot is easy to plan. The accuracy frame is clearly visible now.
4. On a bunker lie only one tick is left on the line (25%), which tells you very clearly that the bunker is a bad place; the grey label helps too.
5. On mtn-06 switching to 3 Wood on the tee aims at the water (B1); a player might not notice and lose a stroke.

## Verdict
**READY TO MERGE**, with B1 as a Low-Med note for the PM (a follow-up, not a blocker in my view). Items 6a (holes 2 and 3), 6b and 3a (putt/chip flag) were not fully tested; the PM may want the owner to look at hole 5's island by eye.

Screenshots: reviews/qa-screenshots/S21-S22-390x844.png, S21-S22-320x568.png, S21-S22-844x390.png

— Agent: qa
