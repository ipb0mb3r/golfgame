# QA: PR #50 Mountain 9 rework (course/mtn-9)

- SHA: 53fd2c33ca20e3208d9c4ce314f68b2a7f8cabb2 (origin/course/mtn-9)
- Environment: headless Chromium (Playwright), 390x844 phone portrait (3D drawing skipped for speed, game logic and the 2D minimap are real), scripted shots via `window.__golf.testHit`, wind 0, seed 1.
- Level: LIGHT. Time spent: about 10 min.

## Results
| # | Item | Result |
|---|---|---|
| 1 | `node --test` | PASS (361 pass, 0 fail) |
| 1 | `tools/baseline.mjs check` | PASS (all 19 shots match) |

| Hole | Par / length | 2. Loads, no console errors, holed | 3. Fairness | 4. Minimap shape |
|---|---|---|---|---|
| 1 | 4 / 372 m | PASS (3 shots) | PASS: driver on fairway | OK |
| 2 | 4 / 333 m | PASS (3 shots) | PASS: driver on fairway, 126 m left | OK |
| 3 | 3 / 165 m | PASS (3 shots) | PASS: 7i on green | OK |
| 4 | 5 / 476 m | PASS (4 shots) | PASS: lay-up (driver, 3W at 70%) leaves 56 m (in 54-78); driver + 3W reaches the green in two | THIN: see below |
| 5 | 4 / 388 m | PASS (4 shots) | PASS: driver on fairway | Mostly OK, upper half narrow |
| 6 | 3 / 175 m | PASS (2 shots) | PASS: 5i on green 3 m | OK |
| 7 | 4 / 430 m | PASS (4 shots) | PASS: driver on fairway | THIN: see below |
| 8 | 4 / 298 m | PASS (3 shots) | PASS: full Driver ends on the green (2.8 m), still drivable | OK, a bit narrow |
| 9 | 5 / 533 m | PASS (4 shots on default aim) | PASS: driver on fairway; hero line (95% driver, 93% 3W) ends on the green 0.9 m, so reachable in two. Default-aim 2nd shot (3W full) ended in rough 55 m out, no water | THIN at the end: see below |

Pars and lengths match docs/COURSE_PLAN_MTN.md on all 9. No console or page errors on any hole. Nothing got stuck, no penalties, no water or OB on any default tee shot. I did not hit deliberately into the new tree lines or deep bunkers, and did not check the hole 8 "hard" side cases (NOT TESTED beyond the PM's unit tests).

## Minimap shape check (lesson L4), images in `reviews/qa-screenshots/mtn-9-rework/` (`minimaps-all.png` = all 9 side by side)
- Hole 1: OK. One long blob, wide in the middle, narrows into the green.
- Hole 2: OK. Big fairway with a smooth swell to the shortcut; no strip, no notch.
- Hole 3: OK. Approach widens into the green.
- Hole 4: reads as a thin ribbon, especially from the creek to the green; the width is about the same as the creek. Not an L or notch, but the "thin strip" look the owner disliked.
- Hole 5: diagonal dogleg is a real shape; the stretch toward the green is narrow-ish, and the island/left lobe by the pond looks like a separate blob. Acceptable.
- Hole 6: OK. Short and fat with the green.
- Hole 7: the shelf and the lower fairway read as two long narrow strips split by the creek (the plan says split fairway, but both halves are thin, the right shelf especially).
- Hole 8: OK. One blob into the green; a bit narrow in the lower half.
- Hole 9: the lower part is fine, but the last third (from the bend to the green at top right) squeezes into a ribbon along the lake, with a kink where it turns. Closest thing to the old notch/L complaint.

## Bugs
None blocking. Observations:
- OBS-1 (Low): holes 4, 7 and the end of hole 9 look like thin strips on the minimap (owner's lesson L4). Subjective; the owner should judge on his phone.
- OBS-2 (Low): hole 9's default-aim second shot (full 3W) ends in rough 55 m short and right; it does not find water in my run. The designer already notes this.

## 5. ?set=mountain9
NOT TESTED in the browser (budget). Each hole loads fine via `?hole=mtn-0N` and `sets.js` lists all 9 mtn holes under `mountain9`; the PM's unit tests cover the round. Holes 1 to 2 advance was not exercised.

## Feel notes for the game designer
1. The default aim plus the auto club makes every hole a quick par or birdie-range walk (3, 3, 3, 4, 4, 2, 4, 3, 4 strokes). Fine for an arcade game, but nothing on the default line really bites; the danger only appears when you stray.
2. Hole 6 became a 5 Iron to 3 m and holed in two, and hole 8 is a driver to 2.8 m: both are generous for par 3/4. That fits the "drivable" idea; just check the owner finds hole 6 too easy.
3. Hole 9's long walk (533 m) with the lake only on the final bend should feel great when you take the brave line (95% driver + 3W put me 0.9 m from the pin), but the thin ribbon at the end may feel tight.

## Verdict: READY TO MERGE
Everything MUST-test that I ran passed. The only caveats are subjective fairway-width impressions (OBS-1) for the owner to judge, plus `?set=mountain9` progression, which I did not run.

— Agent: qa
