# QA report: dev/T-rivals (PR #44, Phase T: AI rivals)

- **SHA:** d545b26 (detached checkout), served with `python3 -m http.server`, Playwright Chromium (headless, software GL)
- **Level:** FULL. **Time:** about 30 min of budget, then over: the real-keyboard play-through alone took ~27 min because headless software rendering is slow (see item 3).
- **Env note:** `tools/menu-check.mjs` run in the background.

## Results
| # | Item | Result |
|---|---|---|
| 1 | `node --test` | PASS (302/302) |
| 1 | `tools/baseline.mjs check` | PASS (all 19 v1 shots match) |
| 1 | `tools/menu-check.mjs` | PASS (194 checks) |
| 1 | `tools/session-check.mjs` | PASS (12 load/dispose cycles, no growth) |
| 2 | Play > vs AI > course > difficulty > round (Easy/Normal/Hard) | PASS (menu-check covers all 6 course x difficulty paths; I also drove Easy, Normal, Hard by hand) |
| 2 | Play again keeps mode + difficulty (new round, 0 cards, new seed) | PASS (ai/easy kept) |
| 2 | Solo still works, Solo best untouched by vs AI | PASS (Solo key `...prototype3`, vs AI key `...prototype3.ai`, independent) |
| 2 | Same seed = same rivals on reload; difficulty changes them | PASS (seed 77: reload identical; Easy/Normal/Hard differ, Hard never worse) |
| 2 | Leaderboard per hole: pos, name, H#, thru, +/-, T2 ties, your row highlighted | PASS |
| 2 | Final standings + place text | PASS: "You won! (Easy)", "You tied for 1st of 6 (Easy)" (engineered tie with a rival), "You finished 6th of 6 (Easy)". "finished 2nd/3rd" wording not hit by hand (6th and tied-1st were) |
| 2 | Cap: no rival under par-2, never a hole in one | PASS (Node: 540 000 rival holes, 3 difficulties x 3000 seeds x par 3-6 x difficulty 1/3/5: min to par -2, 0 aces, deterministic; par 3 best = 2 strokes = birdie, also on Hard) |
| 2 | Best per course AND mode, one vs AI best regardless of difficulty | PASS (Easy -9 kept after a Hard round; a worse Hard round did not replace it; Solo has its own key) |
| 2 | `?ai=` dev link, `?tune=RIVAL_*` | PASS (`?ai=bogus` plays Normal and says so; `?hole=&ai=` ignored with notice; `?ai=hard` alone plays first Solo course; RIVAL_SKILL_MIN/MAX tune changes rivals and shows TUNED badge; RIVAL_BEST_TO_PAR works) |
| 3 | Full vs AI play-through, real keyboard, test9 Normal seed 77, 1920x1080 | PARTIAL: ~9 holes played with real Space presses, reached hole 9's summary at ~1644 s, then I stopped it at the time limit. No console or page errors in any run (scripted runs on prototype3/test9 plus slope-test). Final scorecard of that run not seen. |
| 4 | Desktop 1920x1080 | PARTIAL: play-through ran at 1920x1080, no desktop screenshot captured (run was stopped before the final screen) |
| 5 | Phone 390x844 and 320x568 layout | PASS: no horizontal scroll, leaderboard fits the card, final standings + scorecard fit (scroll inside the card at 320). Known "Next hole" wrap at 320 seen, not counted. Screenshots below. |
| 6 | Edge cases | PASS: 1-hole set vs AI (slope-test: summary says "See the scorecard", place shown); quit mid-round from pause (Quit round) then vs AI again = fresh round, no leftover; Restart hole keeps the same rivals; max-stroke pick-up (10 strokes per hole) completes and the round continues, place computed (6th of 6). Not checked: a "picked up" badge on the vs AI card. |
| 7 | fps | NOT TESTED meaningfully (headless software GL, 13 fps measured under load; not a game result) |

Screenshots: `reviews/qa-screenshots/T-rivals-summary-390x844.png`, `T-rivals-summary-320x568.png`, `T-rivals-scorecard-390x844.png`, `T-rivals-scorecard-320x568.png`, `T-rivals-final-390x844.png` (one per viewport, no bugs).

## Bugs
None found. No High, Med or Low bugs.

Observations (not bugs):
- At 320x568 the scorecard text "First round on this course: that's your personal best" is partly under the sticky buttons until you scroll (Low, cosmetic, same pattern as Solo; not new).
- The "Next hole" button wrapping at 320 px is the known one already on main.

## Feel notes for the game designer
1. A normal human is likely to land mid-pack on Normal; my scripted "putt from 60 cm" player wins by 10+ strokes, so the real feel needs your phone play.
2. The cap works well: on a par 3 the best a rival can do is a birdie, so a hole in one feels special for you only.
3. On Easy, rivals bunch together (ties at E, +3 in my round): lots of "T2"/"T4" rows, which reads fun.
4. The H# column makes it easy to see who just scored well; with ties you always sit first in the tie, which feels generous.
5. Each round starts with the same five rivals in a fixed skill order; with 3-hole courses the best rival (Bea) can be beaten or beaten you by luck alone, so short courses are quite swingy.

## Verdict: READY TO MERGE
All automated checks pass, every T1-T4 and vs AI menu criterion verified, cap verified over 540 000 rival holes, no bugs and no console errors. The two PARTIAL items (full 9-hole keyboard play-through not completed to the end screen, no desktop screenshot) are due to slow headless rendering, not game faults; the same flow was completed via scripted shots on prototype3 and test9 (9 holes, final standings "You won! (Hard)" at 320x568).

— Agent: qa
