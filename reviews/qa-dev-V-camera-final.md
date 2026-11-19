# QA LIGHT (final pass): dev/V-camera, PR #63

SHA 3469fb6 (diff since 15a6650). Run 02:07-02:30. Over the 15 min budget: menu-check alone took about 9 min. Marker visuals and the side view were only spot-checked.

| # | Check | Result |
|---|---|---|
| 1 | node --test | PASS 413/413 |
| 1 | tools/session-check.mjs | PASS (12 cycles, no growth) |
| 1 | tools/menu-check.mjs alone | PASS 316 checks, 0g/0t/0p after quits |
| 2 | Aim camera CAM_AIM_HEIGHT 1 (y = 2.6 on pl-01, = main), 3 holes x portrait/landscape | PARTIAL: camera y/z verified on all 6; ball visually confirmed only pl-01 portrait + mtn-03 portrait (ball visible bottom centre). Other 4 screenshots not inspected: NOT TESTED visually |
| 3 | Marker: down cone + ground dot + label above, in tee view | PASS on pl-01, mtn-03, mtn6-feeder-bank (portrait); no flat triangle seen |
| 3 | Marker in Landing view | PASS on mtn6-feeder-bank (cone + label visible); others not inspected |
| 3 | Colours: blue on feeder-bank 3 Wood | NOT CONFIRMED (club was 5 Iron, label yellow; did not select 3 Wood) |
| 3 | Colours: red on tree in the way (mtn-03 Driver) | PASS (red "293 yd - OB" label + trees warning) |
| 3 | Colour: grey on capped lie (rough/bunker) | NOT TESTED |
| 4 | mtn-04 forced side view | PASS that flight.kind = "side" is used. Ball in view: UNCLEAR, the screenshot at 3 s after hit shows only a thin white vertical line over the fairway (see shots), no ball clearly visible |
| 5 | Flight hold ~1.2 s | PASS: camera stayed at (0,2.6,7) for samples up to ~1.12 s, jumped to the flight view by ~1.29 s |
| 6 | Flyover mtn-04: high behind tee (0,21,7), then runs the hole, ends near green, aim; Space skip works; no console errors | PASS. 11.5 s long, no stalls. Not checked: "short orbit" and "no still pause" by eye, no frames reviewed |

Console errors: none in any run.

## Bugs
- QA-V1 (minor, needs a look): in the forced side view on mtn-04 (portrait, 3 s into a 0.9 power Driver shot) I could not find the ball in the frame. Could be the ball is far/small or the shot was a weird one. Steps: ?hole=mtn-04&seed=7&tune=CAM_W_BEHIND:0,CAM_W_LANDING:0,CAM_MAX_RUN:10, testHit(0.9,0), screenshot at 3 s. Expected ball in view; actual only a vertical line.
- Note: canSkip was false 1.5 s into the flyover, yet Space skipped it fine.

## Feel notes for the game designer
1. The aiming camera at main's height feels the same as before, which is what the owner asked for.
2. The pause at address before the camera follows the ball feels like a deliberate beat, not lag.
3. The red label with an OB/tree warning is very clear; the plain yellow label on a safe shot is calm.

Verdict: READY TO MERGE conditional on QA-V1 being a non-issue (owner eyeball of the side view on mtn-04). Not NOT READY, because nothing in the MUST list failed, but 3 items are NOT TESTED (grey colour, blue 3 Wood, landscape visuals).

— Agent: qa
