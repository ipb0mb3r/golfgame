# QA report: PR #36 "Phase K polish: ground plane bug, trunk tops, warning accuracy" (`dev/K-polish`)

| | |
|---|---|
| **Commit tested** | `a045fce45ca9e089e445a243e48a58ba39671c3b` (branch head) |
| **Level** | FULL (budget 30 min). Time spent: about 15 min |
| **Main viewport** | Phone portrait 390x844 (touch, DPR 3) |
| **Environment** | Headless Chromium 153 (Playwright 1.63), SwiftShader WebGL, Node v22.23.4, `python3 -m http.server`, vendored Three.js |
| **Tasks** | K13, K10, K11, K12. No PM comment on the PR yet |

## PASS / FAIL / NOT TESTED

| # | Item | Result | Notes |
|---|---|---|---|
| 1 | `node --test` | **PASS** | 266 pass, 0 fail |
| 1 | `node tools/baseline.mjs check` | **PASS** | All 19 match. v2 `--dry`: all 48 replay. No shot moved, no rule-9 exceptions. `session-check`: 12 cycles ok |
| 2 | **K13** ground plane below every hole's terrain | **PASS** | Checked **every** mesh vertex (no thinning): hole 2's lowest is −3.707 m at (−22, −296), 0.19 m above the plane at −3.9. Hole 3: −0.597 m at (10, −190), 0.15 m above −0.75. Hole 1 is flat at 0, 0.10 m above −0.1 |
| 2 | **K13** owner's spots in the browser | **PASS** | `h2-hollow-tee` (ball at y −1.8) and `h2-hollow-bunker` (y −1.5): fairway, ball and aim dots all visible, nothing covering them (screenshot). I also looked left and right from the hole 2 tee, back from the hole 2 green and right from the hole 3 tee: no step at the mesh edge in view (the edge is 3.9 m above the plane on hole 2) |
| 3 | **K10** trunks are solid at the top, never passed through | **PASS (with note)** | Re-ran the PR #34 sweep: **18 222 shots** aimed at every trunk and boulder on holes 1–3. 0 ended inside, 0 stuck, 0 timeouts. Trunk contacts went from 7 622 to 7 712. The old L1 case (hole 2 tree #55): **0 of 400 seeds** pass into the trunk (it was 3 of 3). Biggest overlap left: **0.18 m for one 1/240 s step**, which the trunk then bounces back (see note) |
| 3 | **K3** leaves unchanged | **PASS** | 4 452 leaf hits: speed kept 0.299–0.302, turn 0–15° (median 7.4°). Same seed = same end (1 464 replays) |
| 4 | **K11** the warning matches the ball | **PASS** | Same random sweep as in PR #34 (seed 4242), now 361 spots: full power 101 warned/hit, 260 clear/clear. ⚑ power 67 warned/hit, 158 clear/clear. **0 misses** (was 2 in 292, both now caught) and **0 false alarms**. Labels: `both` 72, `full` 29, `pin` 16, all matching |
| 5 | **K12** hole 3 length | **PASS** | Intro: "Hole 3 · Par 4 · **408 yards** · prototype". Holes 1 and 2 unchanged (166 / 491 yd). "To pin" at the hole 3 tee is still 310 yd (the straight line), as the PR describes |
| 5 | **K12** hint text | **PASS** | `h3-behind-tree`: "⚠ At ⚑ and full power this shot hits the trees (18 yd): aim around it or change your power" |
| 6 | Play-through, real keyboard, portrait | **PASS** | Hole 1 birdie (2), hole 2 par (5), hole 3 par (4). Same results as before this PR. No console errors |
| 7 | fps | **NOT TESTED** | Software WebGL. No rendering change other than the plane's height |

Screenshot (one, portrait): `K-polish/portrait-390x844-h2-hollows.png` (`h2-hollow-tee` and `h2-hollow-bunker`).

No bugs.

### Note on K10 (not filed)
When the ball enters the leaves and reaches the trunk **in the same physics step**, the leaves are handled in that step and the trunk in the next one. The ball overlaps the trunk by up to 0.18 m for one 1/240 s step, then hits it and bounces back (hole 2, tree #29, from (32.1, −65.6), 3 Wood at 0.7: `49:hitLeaves`, `50:hitObstacle:trunk`, ends 6.5 m back toward the player). It never passes through and it's invisible at 60 fps. I'm only noting it in case the "never inside" test is tightened later.

## Feel notes for the game designer
1. **The hollows look right now.** You can see the ball and the aim dots sitting in the dip.
2. **Hole 3's tee card says 408 yards, but "To pin" says 310 yd.** That's correct (straight-line to the pin), but some players may read it as a mismatch. A short "plays 408" hint at the tee might help.
3. **The new hint wording, "aim around it or change your power", fits the corner cut better** than "pick a higher club" did.

## Verdict
**READY TO MERGE**: K13, K10, K11 and K12 all pass. The ground plane is below every terrain vertex, and the hollows are visible. No ball ends inside or passes through a trunk in 18 222 aimed shots. The warning now has 0 misses and 0 false alarms in 586 checks. Hole 3 shows 408 yards. All tests and baselines pass, gameplay is unchanged otherwise, and there are no console errors.
