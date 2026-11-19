# QA report: Phase BC ball control (PR #68)

- **SHA tested:** 88754a217e8f951092144afe5d592b5edb31b933 (branch dev/BC-ball-control); compared with origin/main 73655dd (the merge base)
- **Environment:** headless Chromium (Playwright, software GL), Node, served with `python3 -m http.server`. Desktop 1920x1080 for the keyboard and mouse checks; 480x320 with `ANTIALIAS:0` for scripted shots; phone sizes with touch emulation.
- **Level:** FULL, 30 min budget (hard stop). The slow software renderer (about 14 s per shot) ate most of it, so the play-through and the SHOULD items 9 and 10 are NOT TESTED.
- `tools/menu-check.mjs` not run, as instructed.

## Results
| # | Item | Result | Notes |
|---|---|---|---|
| 1a | `node --test` | PASS | 447 pass, 0 fail |
| 1b | `node tools/baseline.mjs check` | PASS | all 19 shots match |
| 2 | Centre hit = main's shot | PASS | pl-02 seed 1, no wind, Driver: power 1, 0.8 and 1 (acc 0.04) end at the same spot on both builds: (0.35, -285.59), (-1.55, -237.13), (0.35, -285.59) |
| 3 | Shaped shots and the aim line | PASS (see notes) | Real shot, no wind, full power Driver unless noted. The white ring matched where the ball stopped to 0.00 m on 8 of 8 shots that finished cleanly (pl-02, pl-01 7i, mtn-02). Marker vs the real first landing: within 0.4 to 1.5 m (the landing was sampled per rendered frame, so that is the sampling error). Left starts left (path to x -9.3 m) and comes back; right is the mirror (to +7.6 m). Bottom: stop 3 m past the marker; top: 7 m. No warning on any of them. mtn-02 has tree lines; no tree-hit case was exercised in the browser (not tested: a shaped shot that really hits a tree). Three holes: pl-02, pl-01, mtn-02 (mountain9) |
| 4 | Ball icon | PASS | Hidden during the flyover, the putter, the meter and the flight. Shown with the Driver on the aim screen. Tap low-left gives (-0.70, -0.38), caption "High · starts ◀ curves ▶". Tap within the centre zone snaps to (0, 0). Drag works. Resets to the centre after every shot (checked after the shot and after reloading). Double tap: two presses 113 ms and 215 ms apart reset the dot; 314 ms reset; 502 ms did not (correct, limit is 320 ms). Headless touch taps are about 1 s apart, so a real finger double tap must be confirmed on a phone (the dev says the same) |
| 5 | Keys | PASS | Shift + arrows from (0.5, 0.5): Left Left Down Down Down gives (0, -0.25); Right Up Up gives (0.25, 0.25); aim and club unchanged. Shift + D for 0.4 s turned 0.0025 vs plain D 0.0101 (a quarter of the speed, no impact change). Plain Up/Down change the club and leave the dot alone |
| 6 | Flight camera on a shaped shot | PASS (partly) | Left Driver on pl-02 with `BC_BACK:0.88` and real Space presses: the ball is in the frame all through the flight and coming in (frame sampled near the landing). Right Driver and `BC_BACK` 1 were NOT TESTED by eye |
| 7 | One full play-through, real keyboard | NOT TESTED (partial) | Only the first shot of pl-02 was played with real Space presses (3 clicks), then the ball rolled out normally. No console or page errors in any session of this report |
| 8 | Phone layout | PASS | 390x844, 320x568, 844x390: icon and caption do not overlap the power bar, minimap, the 🔍 button, the Skip row, SWING or the club bar (bounding boxes checked in each). At 320x568 the caption sits just under the minimap (tight, no overlap). In landscape the icon is just left of the minimap with room around it |
| 9 | Lie limits (sand 0.3, rough 0.5) | NOT TESTED | the dev's v2 baseline rows 79 and 81 and the unit tests cover it |
| 10 | fps | NOT TESTED | software GL in this environment; the numbers would mean nothing |

## Bugs
None found.

Observations (not bugs):
- OBS-1 (Low): after the first shot with a top impact my script read the ball back at (0, 0). That was a race in my script (it read the state before the flight began), not the game.
- OBS-2 (Low): a double tap with a finger is untestable headless; the owner should confirm it on the phone.

## Screenshots
`reviews/qa-screenshots/BC/`: `desktop-1920-aim-left.png`, `phone-390x844-icon.png`, `phone-320x568-icon.png`, `landscape-844x390-icon.png`.

## Feel notes for the game designer
1. The icon is easy to find and the caption pill ("High · starts ◀ curves ▶") is short and readable even on a 320 px phone. The dot snaps to the centre well, so going back to a normal shot is never fiddly.
2. A full left or right Driver bends about 9 m out and comes back, and the white ring then shows a run-out about 12 m past the line on the curve's side. That size is readable on the aim line, and big enough to dodge a tree line.
3. Bottom (high) stops about 3 m beyond the marker and top (low) about 7 m on pl-02 with the Driver, against about 32 m of roll for a centre hit. The difference is clear, but Driver height is the weakest of the effects; the owner may want it stronger.
4. Shift + arrows for the dot feels natural next to the plain arrows. Fine aim on Shift + A / D is much slower than a plain tap (a quarter), which is what it should be, but it needs the How to Play line to be found.
5. `BC_BACK` 1 vs 0.88: I did not judge them by eye in the time. On paper 1 lands on the line (the marker is honest and easy to read) and 0.88 lands a little on the start side; the owner should try the two links.

## Verdict
**READY TO MERGE** for the parts tested: no bugs, 447/447 tests, 19/19 baseline, centre hit identical to main, aim line and white ring match the real ball, icon and keys behave as agreed, no overlap on three phone sizes. The full play-through (item 7), the lie limits (9), fps (10), and right-hand and `BC_BACK` 1 camera checks are NOT TESTED; the owner's phone playtest should cover the double tap and the feel.

— Agent: qa
