# QA report: PR #34 "Phase K follow-up: ⚑ warning, trees in play on holes 1–2, rock bounce (K8, K9)" (`dev/K8-K9-followup`)
Covers **all of Phase K (K1–K9 + K4b)**: #33 was merged without a QA pass.

| | |
|---|---|
| **Commit tested** | `44762f451ad6a1fd6155247b0ca39aeac85bb0df` (branch head) |
| **Level** | FULL (budget 30 min). Time spent: about 30 min |
| **Main viewport** | Phone portrait 390x844 (touch, DPR 3). Landscape 844x390 checked for the warning hint |
| **Environment** | Headless Chromium 153 (Playwright 1.63), SwiftShader WebGL, Node v22.23.4, `python3 -m http.server`, vendored Three.js |

## PASS / FAIL / NOT TESTED

| # | Item | Result | Notes |
|---|---|---|---|
| 1 | `node --test` | **PASS** | 258 pass, 0 fail |
| 1 | `node tools/baseline.mjs check` | **PASS** | All 19 match. #9 (h1 forced max slice) passes through its K8 exception. v2 `--dry`: all 48 replay. `session-check`: 12 cycles ok |
| 2 | **K2** bounce off trunks and boulders: flight and roll, no pass-through | **PASS (with note)** | Core sweep of **18 222 shots** aimed straight at every trunk and boulder on holes 1–3: 8 directions × 3/10/40/110 m × power 0.35/0.7/1.0 × auto club and putter. Contacts: 7 622 trunk, 4 452 leaves, 125 boulder. **No ball ended inside a collider, 0 stuck, 0 timeouts** (longest shot 14.4 s). **One gap:** a ball that drops onto the **top of a trunk** passes through the top few cm (L1) |
| 2 | **K3** leaves slow it massively and turn it a little | **PASS** | 4 452 leaf hits: speed kept 0.299–0.301 (`CANOPY_SLOW` 0.3). Turn 0.0–15.0°, median 7.3° (`CANOPY_DEFLECT` 15°) |
| 2 | **K2/K3** same seed = same result | **PASS** | 1 464 leaf shots replayed twice with the same seed: 0 differences. Browser: the h1 forced max slice with `seed=1` twice → (37.69, −118.63) both times |
| 3 | **K4** warning on a blocked line, with the right label | **PASS** | `h3-behind-tree` (5 Iron): "⚠ At ⚑ and full power this shot hits the trees (18 yd)", and every swing on that line goes into the leaves. `h3-cut-corner` at +12.6° and +17.2°: "⚠ **At ⚑ power** this shot hits the trees (191 / 181 yd)" (the full shot clears), and the ⚑ shot really goes "Into the trees!". At +9°: "At ⚑ and full power". The hint turns red (class `warn`), with the red marker in the leaves and red dots past it (screenshot) |
| 3 | **K4** no warning on a clear line | **PASS** | `h3-cut-corner` default aim and the clean cut (65, −207): no warning, and ⚑, full and 0.85 straight shots all clear. Default tee shot on holes 1, 2 and 3: no warning |
| 3 | **K4** the warning matches what the ball does | **PASS (with note)** | 176 random spots on holes 1–3 aimed near a tree, straight shot, no wind. Full power: 54 warned/hit, 121 clear/clear, **1 clear but hit**. ⚑ power: 40/40 warned/hit, 75 clear/clear, **1 clear but hit**. Labels (`both` 41, `full` 13, `pin` 8) always match. 0 false alarms. The 2 misses are grazing hits on the edge of the leaves (L2) |
| 4 | **K8** every tree inside OB is real | **PASS** | Hole 1: 25 trees, hole 2: 79, all obstacles. Wild shots in the browser (8 per spot, acc ±0.12/±0.2): a hook from the hole 2 tee → "Into the trees!", and a slice from (4, −250) → "Into the trees!" then OB. 2 of 32 wild shots found a tree; the rest stayed in rough short of the trees |
| 4 | **K8** no tree on the tee, fairway, fringe or green; default tee shot clear | **PASS** | 0 trees on those surfaces (hole 3's `onFairway` lone tree excepted), and 0 in water or OB. Nearest tree to a tee/fairway/fringe/green: hole 1 18.5 m, hole 2 13.5 m, hole 3 3.5 m (corner trees). Default tee shot on every hole: no warning |
| 4 | **K8** same positions on every reload | **PASS** | Identical obstacle lists with different seeds. They're fixed in hole data |
| 5 | **K6** hole 3 start to finish (safe route) | **PASS** | Real keyboard, portrait: Driver to the fairway (162 yd left), 7 Iron onto the green, 2 putts → **par 4**. No console errors. Result card: "← Back to Hole 1" |
| 5 | **K6** corner cut | **PASS** | `h3-cut-corner` aimed at (65, −207): ⚑ Driver (0.974) → (66.5, −212.0) and full Driver → (69.7, −222.2), both clear onto the second leg about 80 yd out. Fails at power 0.85 (leaves → (45.2, −155.9)), with a hook at acc +0.08 (leaves) and with a slice at −0.08 (leaves). The safe default line with a hook (+0.08) also finds the lone tree's leaves |
| 5 | **K4b** hole 2's result card says "Next: Hole 3" | **PASS** | "Next: Hole 3 (prototype par 4 with trees) →" → `?hole=pl-03`, and tapping it loads hole 3's intro. Hole 1 still says "Next: Hole 2" |
| 6 | **K1** `?scenario=h3-rock` | **PASS** | "Rock · max 90% · harder timing". Window 6% (0.045 × 0.8 × 2 / 1.2), cap 0.9. 5 Iron at the ⚑ → on the green |
| 6 | **K9** `?scenario=h3-rock-bounce` | **PASS** | "Aim: test spot target", 9 Iron. The ⚑ shot (0.834) lands **on the rock** at (4.2, −259.6), takes a big bounce and runs off into the rough at (8.4, −261), 111.8 m from the start. No boulder hit |
| 6 | **K9** tune `rock.rest:0.4,rock.keep:0.7` | **PASS** | Badge "TUNED · rock.rest 0.4 · rock.keep 0.7". Lands on the rock at (−2.0, −257.2), with 3 low bounces that all stay on the rock, and stops on the rock at (0.8, −259.9). Shorter bounces and a shorter run, as expected |
| 7 | fps | **NOT TESTED** (relative only) | SwiftShader, portrait: hole 1 4.7, hole 2 1.1, hole 3 1.4 fps. Hole 2 with 79 trees is now the heaviest scene (35 geometries vs 22 on hole 1). It needs a real phone check |
| 8 | Phone landscape 844x390 | **PASS** | The warning hint fits on one line (y 250–268) above the meter, clear of the scorecard and minimap (screenshot) |
| 9 | Console | **PASS** | No errors in any run |

Screenshots (one per viewport): `K-obstacles/portrait-390x844-h3-pin-warning.png` ("At ⚑ power" warning, red marker in the corner trees), `K-obstacles/landscape-844x390-h3-warning.png`.

## Bugs

**L1. A ball that comes down onto the top of a trunk passes through it.** Low.
- Steps (core): hole 2, ball at (33.58, −476.50) in the rough, aim at tree #55 (43.5, −477.8; trunk r 0.43, top y 8.75), auto club (S Wedge), full power, no wind. The ball goes into the leaves (step 99), is slowed and turned, then comes down at 5 m/s over the trunk.
- Expected (K2): it bounces off the trunk.
- Actual: at step 228 the ball's lowest point is at y 8.65, **10 cm below the trunk top**, 0.02 m from the trunk axis (0.46 m inside). There's no `hitObstacle`, and it carries on. Seeds 1, 2 and 3 all do this (0.20–0.46 m inside).
- Why: the side-on contact test only fires while the ball moves **toward** the axis. A ball that drops in from **above** the top starts "inside" and is never hit (`segCircle`: `c <= 0`, moving out → `null`). The trunk has no top cap. The trunk top is buried inside the leaves, so the player can't see it, but it breaks "never passes through".

**L2. The warning can miss a grazing hit on the edge of the leaves.** Low.
- Steps (core, no wind, straight hit):
  - (a) Hole 1 at (−0.1, −81.4), S Wedge at the ⚑ (0.916), aimed past tree #15 (−44.9, −111.2): `aimWarning` returns null, but the real ball hits #15's leaves at y 11.6 (canopy top 11.8) and stops 7.6 m short of where the ring lands.
  - (b) Hole 3 at (156.3, −143.7), rough, 9 Iron at full power (0.85): clear, but the ball clips tree #12's leaves at 3.4 m from its centre (canopy radius 3.42).
- Expected (K4, PM): the ⚑ shot never leads into the leaves without a warning.
- Actual: 2 misses in 292 checks (176 full + 116 ⚑), both grazes, never a false alarm. The warning flight takes about 4.6× bigger steps than the real ball (221 vs 1 014 steps for the same flight), so a step can jump over a thin edge of the leaves.

**L3. Hole 3's intro says "310 yards", but the dogleg plays about 408 yd.** Low.
- The intro (and "To pin" at the tee) use the straight tee-to-cup distance (283 m = 310 yd). The PR describes hole 3 as **373 m (408 yd) along the playing line**, so a par 4 "310 yards" undersells the hole.

## Feel notes for the game designer
1. **The corner cut is a real gamble.** Only a full, straight Driver clears. 0.85 power or a small hook or slice (±0.08) ends in the trees. The safe route is an easy par.
2. **Trees on holes 1–2 rarely come into play.** 2 of my 32 wild hooks and slices reached them, because the nearest are 13–18 m off the fairway. They punish big misses only.
3. **The "At ⚑ power" warning switches on and off in narrow bands** as you aim across the corner (12.6°, 17.2°, 21.2°, 23.5°), as the arc threads gaps between trees. Small aim changes can flip it.
4. **The hint says "pick a higher club"**, but the cut is about power or a different line, so "aim around" is the useful half.
5. **Default rock bounce vs the tune example:** default bounces off the rock into the rough. `0.4 / 0.7` keeps it on the rock with small hops.
6. **Hole 2 is now the slowest scene** (79 trees). Worth checking on your phone.

## Verdict
**READY TO MERGE**: every Phase K MUST item passes:
- Collisions: 18 222 aimed shots, with no ball stuck or ending inside a collider, and the leaves slow and deflect as specified.
- Determinism: same seed, same result.
- The warning is correctly labelled and matches the ball, with 0 false alarms.
- K8 fairness holds.
- Hole 3 plays start to finish, and the corner cut behaves as designed.
- The rock scenarios and tune work, and "Next: Hole 3" is in.

L1–L3 are Low: a trunk-top gap hidden inside the leaves, a rare grazing miss in the warning, and the yardage label.
