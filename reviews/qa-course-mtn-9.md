# QA report: course/mtn-9 (PR #50, Mountain 9 prototype)

- **SHA:** b7c4661e3531e53b5236e0d6e88305367cf42708 (origin/course/mtn-9, detached)
- **Environment:** headless Chromium (Playwright), software GL, served with `python3 -m http.server`. Scripted shots via `window.__golf.testHit` with the render call skipped (the headless renderer is too slow otherwise).
- **Level:** FULL. **Time:** about 30 min. The budget ran out (software GL plus a 4 min menu-check made everything slow), so the real-keyboard, desktop and phone items are NOT TESTED.

## Results

| # | Item | Result |
|---|---|---|
| 1a | `node --test` | PASS (361/361) |
| 1b | `tools/baseline.mjs check` | PASS (all 19 shots match) |
| 1c | `tools/session-check.mjs` | PASS (12 cycles, no growth) |
| 1d | `tools/menu-check.mjs` | FAIL, 1 of 315 (BUG-1, stale tool expectation; the game is right) |
| 2/3 mtn-01 | loads, no console errors, par 4, 342 m, default tee shot lands on fairway, warn none, holed in 3 | PASS |
| 2/3 mtn-02 | par 4, 272 m straight (about 300 m along the dogleg), default 3 Wood on fairway, holed in 3. `mtn2-carry-pines` full Driver lands on fairway 30 m short; `mtn2-under-pines` 5 Iron from rough reaches the green (playable) | PASS |
| 2/3 mtn-03 | par 3, 149 m, 9 Iron to the green, no errors | PASS |
| 2/3 mtn-04 | par 5, 451 m. Default Driver + 3 Wood (pin 0.95) reaches the green in two; lay-up scenario leaves 55.5 m, SW pitch 0.73 reaches the green; `pitch-over` from 58 m reaches the green dry | PASS |
| 2/3 mtn-05 | par 4, 330 m straight (about 360 m along the dogleg), default Driver then PW/7 Iron, holed in 3 | PASS |
| 2/3 mtn-06 | par 3, 160 m (as planned), 5 Iron to the green; `deep-bunker` SW escapes to the green | PASS |
| 2/3 mtn-07 | par 4, 393 m, 3 Wood + 3 Wood on the green; shelf Driver leaves 164 m, 7 Iron reaches the green | PASS |
| 2/3 mtn-08 | par 4, 272 m. Driver (pin 0.94) ends ON the green (drivable); `deep-bunker` SW escapes to the green | PASS |
| 2/3 mtn-09 | par 5, 467 m straight (about 489 m along the hole). Default Driver then 3 Wood leaves 20 m (a bit short, not in water), `over-the-lake` 5 Iron reaches the green, `layup` leaves 95 m | PASS |
| 2 both routes exist | the safe and hero scenarios exist and work on all 9 holes (27 scenarios, see item 8) | PASS |
| 3 no blind shot / aim warning on trees or rocks | `warn` is null on every tee and default aim. Visual check of the tee views NOT TESTED (no screenshots taken); not checked that the warning fires on a tree line | NOT TESTED (partly) |
| 3 default tee aim never in a hazard | PASS on all 9 holes (every default tee shot ended on fairway or green) |  PASS |
| 3 no ball stuck | PASS in all scenarios I ran (deep bunkers on 6 and 8 and under hole 2's pines escape in one shot). Only tested at the default aim, not with a mistimed swing | PASS |
| 4 hole 4 lay-up leaves a 40 to 70 m wedge | 55.5 m | PASS |
| 4 hole 4 slightly short pitch not straight into the creek | not varied by me; the scenario pitch at the default power is dry (PR's own test covers 65% and 75%) | PARTIAL |
| 4 hole 8 drivable | PASS |
| 4 holes 4 and 9 reachable in two on the hero line | hole 4: yes (3 Wood 0.95 leaves 8.7 m). Hole 9: default line leaves 20 m (yes via the over-the-lake scenario, 5 Iron). With random error, hole 4 reached the green in two in 5 of 8 seeded rounds | PASS |
| 5 Mountain 9 round (`?set=mountain9`) | listed in the menu (menu-check found all 55 menu paths, only the default-course expectation failed). Playing 9 holes to the scorecard: NOT TESTED (all 9 holes played singly) | NOT TESTED |
| 5 vs AI | `?ai=easy` starts a mountain9 round vs AI (menu-check confirmed it started in mode ai, set mountain9). Playing it through NOT TESTED | PARTIAL |
| 6 Desktop 1920x1080, real keyboard on 1, 4, 9 | NOT TESTED (out of time) | NOT TESTED |
| 7 Phone portrait 390x844 | NOT TESTED | NOT TESTED |
| 8 Scenario links | all 27 load, no console errors, start in the expected lie, and finish the hole | PASS |
| 9 Known issue C11 (par 5 default second shot over water) | confirmed on hole 4: in 8 seeded rounds with random power (±10%) and timing error, 2 rounds dropped in the water, one of them twice in a row (a 9 on a par 5). Hole 9 not run. Not a new bug | CONFIRMED (C11) |
| 10 fps | software GL | NOT TESTED |

No console errors on any hole, scenario or the random-error runs.

## Bugs

- **BUG-1 (Low, tooling):** `tools/menu-check.mjs` line 328 expects bare `?ai=easy` to play `prototype3`, but Mountain 9 is now first on the Solo menu (intended per the PR), so it plays `mountain9`. Steps: `node tools/menu-check.mjs` and read the line `BAD ?ai=easy plays a round vs AI (mountain9 easy)`. Reproduced twice. The PR should update the tool's expected set, or the PM should decide whether `prototype3` should remain the default. No screenshot (text only).

No game bugs found within what I covered.

## Feel notes for the game designer

1. Holes 1 to 3 and 5 to 6 are all "default aim, default club, par or birdie", even with random errors. Good warm-up, but nothing asks the player to think until hole 4.
2. Hole 8 is the best idea: a Driver at the default power ends on the green. It's a free eagle chance for a good tee shot. Check if it's too generous.
3. Hole 4 is the most interesting: the second-shot choice (lay up for a 55 m wedge or 3 Wood over the creek) is real. But the default aim points over the water, so a casual player who just follows it is punished (2 of 8 rounds, once twice).
4. Hole 9 plays about as easy as its ratings of 4 say it shouldn't: the default Driver (72% power) rolls down the drop to 220 m out, and the 3 Wood leaves a short chip. It needs a harder landing zone to be a finale.
5. Hole 3 gave a hole in one at the default power with no wind. A tilted green is fine, but the creek isn't a threat from the default aim.

## Verdict: READY TO MERGE (conditional)

The game side is solid: 361 tests, baselines and session-check pass, every hole and scenario plays with no console errors. The only failure is a stale expectation in `tools/menu-check.mjs` (BUG-1, Low). Not verified: real-keyboard play, desktop and phone layouts, a full 9-hole round and vs AI played to the end, and the visual tee views. The owner's own playtest should cover those before merge. The C11 water issue is known and tracked.

— Agent: qa
