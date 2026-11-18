# QA report: PR #63 "Phase V: Camera" (dev/V-camera)

- SHA: 15a6650e9f25d551e23f76b50cbe692f12ef5df6 (the PM's pending CAM_AIM_HEIGHT 1 change is NOT in this SHA; checked via ?tune=CAM_AIM_HEIGHT:1)
- Environment: headless Chromium + Playwright, software GL (about 2-3 fps), Linux. Level FULL. Time spent: about 17 min.
- Scripted through window.__golf (testHit, skip, viewTap, flight, flightHistory, app.*). Screenshots: `reviews/qa-screenshots/V-camera/`.

## Results
| # | Item | Result | Notes |
|---|---|---|---|
| 1 | node --test | PASS | 410/410 |
| 1 | tools/baseline.mjs check | PASS | all 19 shots match |
| 1 | tools/session-check.mjs | PASS | 12 cycles, no memory growth, input bound once, no stray timers |
| 2 | V1 ball visible while aiming, portrait 390x844 and landscape 844x390 | PASS (partly by tests) | Loaded pl-01/02/03, mtn-01/04/06/09 at both sizes, default and CAM_AIM_HEIGHT:1, no errors. Looked at screenshots on mtn-04 (portrait; landscape at 1.25 and at 1.0): ball is visible above the hint line in all. The other holes were not eyeballed, they rely on tests/views.test.js (ball on screen, every hole, both orientations). |
| 2 | Landscape: ball not behind hint line | PASS | mtn-04 landscape: ball sits above "Aim and pick a club" line, also with height 1 |
| 3 | V2 button only while aiming | PASS | hidden at intro, during the flyover, during swing; shown in aim |
| 3 | Landing on full shots shows the aim marker; tap toggles; hold returns on release; V = tap | PASS | tap: landing, label becomes "Back"; tap: back; hold 700 ms: landing, release: back; V key: landing |
| 3 | Read on putts: above, low, back; swing returns to aim view | PASS | h2-green-step: above > low > off; V then Space: view null, state power |
| 3 | No yellow "C" ring around full-shot marker | PASS | none in the screenshots |
| 4 | V3 variety over about 15 long shots | PASS with note | See bug QA-1 (Low). mtn-01: landing/behind alternate, 10 shots; pl-01: side seen; mtn-04: behind/landing only, 19 shots. Never more than 2 in a row, landing never twice in a row. |
| 4 | Putts / chips under 60 m stay behind | PARTLY | Not scripted by me (unit tests cover). Not seen in the shots I ran. |
| 4 | Ball in view in side/landing flight (3 spot-checks) | PASS | side (pl-01), landing (mtn-01, mtn-04): ball and trail visible. Landing view early in flight shows the ball as a tiny streak far away |
| 4 | Settings Classic = behind only | PASS | CAM_VARIETY:0, 5 shots, all behind. The Settings button itself was not clicked (setting value flightCam checked in app.settings default 'varied') |
| 5 | Flyover on first tee start: ?set=mountain9, ?hole=mtn-04 | PASS | state flyover after Start, 4.5 s path |
| 5 | Not on ?scenario=, not on restart | PASS | scenario goes straight to aim, restart goes straight to aim |
| 5 | Play again | NOT TESTED | Only the restart path was scripted |
| 5 | Tap / Space / Enter skip, never swing | PASS | all go to aim with 0 strokes |
| 5 | Bottom panel hidden, "tap to skip" hint | PASS | meter, controls, view button, skip button all display:none; hint "Tap to skip the flyover" at the bottom |
| 5 | Settings "Hole flyover: Off" | PASS | via app.settings.flyover=false then start of another hole: straight to aim. Back to true: flyover plays. The settings screen button was not clicked |
| 6 | No console/page errors | PASS | zero in every run |
| 7 | 320x568 layout of the view button | PASS | button at x12, y370, 92x32, clear of the hint and the meter |
| 8 | vs AI round start on mountain9 | PASS | flyover, 5 rivals, one shot played, no errors |
| 9 | fps | NOT TESTED | software GL |
| - | CAM_AIM_HEIGHT:1 (PM heads-up) | PASS | ball visible on mtn-04 landscape (screenshot), no errors on 7 holes at both sizes |

## Bugs
- QA-1 (Low, observation): on mtn-04 (narrow, tree-lined par 5) the side view never appeared in 19 long driver shots (only behind and landing), probably because the line-of-sight/tree rule rejects every side spot. On pl-01 and mtn-01 it was seen/not seen (mtn-01 14 shots: none either). Side may be rarer than the 25% weight suggests. Steps: ?hole=mtn-04, driver full power, repeat. Expected: some side shots. Actual: none. No screenshot.
- No other bugs found.

## Feel notes for the game designer
1. The 25% higher aiming view looks good on the phone: the tee, the ball and the fairway ahead all read clearly. Landscape is clean now.
2. Landing view from the far side makes the ball a tiny speck at the start of the flight; it is dramatic but you lose the ball for the first second.
3. The side view looked best: you see the arc and the target together. It seems rarer than landing in my runs, so you may not notice it.
4. The flyover is short (about 4.5 s) and the "Tap to skip" hint is quiet and clear. Hiding the panel makes it feel like a cinematic.
5. The Landing button is easy to find and the "Back" label is helpful; the marker is easy to read on the par 3.

## Verdict: READY TO MERGE
No blocking issues. Caveats: side view frequency (QA-1) and the not-tested rows above; the CAM_AIM_HEIGHT default change to 1 is not covered by this SHA.

— Agent: qa
