# Prototype Task Checklist

> **For agents:** Work only on the task IDs you were given. A task is done when its acceptance criteria pass **and** it has tests (for anything in `src/core/`). Tick `[x]` in the same PR and add a short note.
>
> `[ ]` todo · `[~]` in progress · `[x]` done · 🅿️ = owner/PM task

## Roadmap at a glance
Re-planned 2026-11-17 (owner): **menus, scoring and a 9-hole round (solo or vs AI) before rain**, and a mountain course co-designed with the owner.

| # | Phase | Status | Branch |
|---|---|---|---|
| 0 | Foundation and engine refactor | ✅ done | `dev/F-engine-refactor` |
| — | Feel passes 1–2 (swing, lie, HUD) | ✅ done | `dev/feel-pass-1`, `dev/feel-pass-2` |
| A | Review gate A + Fix passes 1–2 | ✅ done (#18–#28) | |
| FP3 | **Feel pass 3** (small: S15, S19, X11) | **NEXT** | `dev/feel-pass-3` |
| K | **Obstacles and hard surface** (rock, trunks, leaves, aim warning) + prototype hole 3 | after FP3 | `dev/K-obstacles` |
| 6 | Rounds and scoring (any-length course, solo) | in review | `dev/R-rounds` |
| C | **Mountain course, prototype** (9 holes, a test run for the engine and the course designer, co-designed with the owner, one hole per PR) | runs alongside 6, 7, T | `course/<hole-id>` |
| — | Before real courses: genre study for the course designer (`docs/GENRE_NOTES.md`) + art style decision | owner, later | |
| 7 | Menus (Solo 9, vs AI 9, Practice) | after 6 | `dev/M-menus` |
| T | AI rivals (5 rivals, leaderboard) | after 7 | `dev/T-rivals` |
| B | Review gate B + fix + Tech Lead | after T | `review/B-<role>` |
| 5 | Rain | after B | `dev/W-rain` |
| — | Save a round in progress | later (owner: not a priority) | |

---|---|---|---|
| 0 | Foundation and engine refactor | ✅ done | `dev/F-engine-refactor` |
| — | Feel passes 1–2 (swing, lie, HUD) | ✅ done | `dev/feel-pass-1`, `dev/feel-pass-2` |
| A | Review gate A | ✅ reviewed (#18–#20), decisions in `reviews/A-decisions.md` | `review/A-<role>` |
| A1 | **Fix pass 1** (no gameplay change) | in review | `dev/QA-fixes-1` |
| A2 | Fix pass 2 (physics changes) | in review | `dev/QA-fixes-2` |
| 1–4 | Swing, physics, slopes, putting | mostly built, missing tests and small gaps | covered by Phase 0 + `dev/gaps-1-4` |
| 5 | Rain | todo | `dev/W-rain` |
| 6 | Multi-hole rounds | todo | `dev/R-rounds` |
| 7 | Menus | todo | `dev/M-menus` |
| B | Review gate B + fix + Tech Lead | todo | `review/B-<role>` |
| 8 | Small polish | todo | `dev/X-polish` |

---

## Phase 0: Foundation and engine refactor ⭐ NEXT
Goal: **one shared engine, holes as data, pure logic with tests, and both holes playing exactly like today.**

- [x] **F1** 🅿️ `AGENTS.md`, `CLAUDE.md` and `docs/` set up *(PM, Nov 16)*
- [x] **F0** **Record a baseline first, before changing any code.** Write a script that plays ~10 scripted shots per hole through `window.__golf.testHit(power, acc)` with wind forced to 0 and from known positions, and records the resting positions and strokes into `tests/fixtures/baseline.json`. After the refactor, the same shots must land within a 0.5 m tolerance. *(Dev, Nov 16: 19 shots via `tools/baseline.mjs`, recorded at 60 fps and also at 30/144 fps because the old code varied with frame rate; replayed by `tests/baseline.test.js`.)*
- [x] **F2** Test setup: `tests/` with `node --test`. No dependencies needed. Document the command in AGENTS.md. *(Command: `node --test`.)*
- [x] **F3** Fixed-timestep **accumulator** (constant 1/240 s steps, no leftover partial step). Keep the ×1.35 flight speed-up as a config value. *(`play.advance()`; a test checks identical results at 24–240 fps.)*
- [x] **F4** `src/core/config.js`: move every tunable out of the logic.
- [x] **F5** `src/core/rng.js`: seeded RNG used for wind and lip-outs (no `Math.random()` in core). *(Seed from `?seed=`, else from the clock in the game layer.)*
- [x] **F6** Split the engine into `src/core/` (pure) and `src/game/` (Three.js/DOM), following DESIGN §9. **Use hole 2's slope-aware physics as the base**, since it's a superset of hole 1's.
- [x] **F7** Holes as modules: `src/holes/hole1.js`, `hole2.js`, `sets.js`. Shared base surfaces plus `surfaceOverrides`. Hole 1's `heightAt` returns 0.
- [x] **F8** Single page: `index.html` loads a hole by `?hole=pl-01` / `?hole=pl-02` (a temporary hole switcher until Phase 7). Delete `hole2.html` after the switch works, and make `hole2.html` redirect to `index.html?hole=pl-02` so old links still work.
- [x] **F9** Unit tests for the core: swing (determinism, hook vs slice sign, power 0/1), ball (flat roll distance per surface, uphill shorter than downhill, steep slope creeps, cup capture vs lip-out, water/OB penalty), terrain (gradient of a known bump).
- [x] **F10** Debug overlay (backtick key): state, speed, surface, slope, wind, wetness, meter values, fps.
- [x] **F11** Update the README: how to play both holes, how to run locally with a server, how to run tests.

**Done when:** the baseline shots match, all tests pass, both holes play from one engine, and nothing in `src/core/` imports Three.js.

---

## Phase 1: 3-click swing
- [x] **S1** Meter state machine (aim → power → accuracy → hit)
- [x] **S2** Power lock (2nd click), accuracy vs `SWEET` (3rd click)
- [x] **S3** Hook or slice from early or late, forced slice when there's no 3rd click
- [x] **S4** Aim rotation (keys and on-screen buttons)
- [x] **S5** Club table, auto-pick plus manual change
- [x] **S6** Unit tests → done in F9
- [x] **S7** Per-hole bag (`bag` field) instead of separate club arrays → done in F7

**Phase 1 follow-ups (designer decisions)**
- [x] **S8** Missed clicks (DESIGN §3 "Missed clicks"): power grace window + "MAX!" flash, red "No power" meter, mini shot when power is missed, huge slice when accuracy is missed, cancel with no stroke when only the start click happens. Gameplay change → own branch `dev/S8-missed-clicks`, re-record baseline-v2 and explain *(Dev, Nov 16, in `dev/feel-pass-1`: `NO_ACC_ERR = 0.6`; every table row unit-tested in tests/missed-clicks.test.js)*
- [ ] **S9** *(later, design feature)* Overpower zone past 100%: more distance, smaller impact zone. Needs designer playtesting first
- [x] **S10** Wider accuracy window (designer playtest: "too hard"). Today `SWEET = 0.024` means a perfect window of ~48 ms. Start at `SWEET = 0.05` (~100 ms) and make small misses curve gently (`CURVE_SHAPE` tunable: 1 = linear as today, 2 = quadratic). Final values are set by the designer through X8 tune links *(Dev, Nov 16: `SWEET = 0.05`, `CURVE_SHAPE = 2` by default after PM review)*
- [x] **S11** Lie on the meter (DESIGN §3 "Lie"): per-surface `maxPower` + `sweetScale` (club override for sand wedge), replacing the hidden `lie` multiplier. Meter grays out above the cap and turns around at it (S8 rules apply at the cap), the accuracy zone is drawn at its real width, and the HUD lie line shows it. Tests: cap enforced, ⚑ mark matches the real distance, window width per surface, sand-wedge override *(Dev, Nov 16, in `dev/feel-pass-1`: tests/lie.test.js; lie values tunable as `<surface>.maxPower`, `<surface>.sweetScale`, `sw.sand.<value>`)*

**Next swing/HUD tasks (from Feel pass 1 QA + designer, 2026-11-16)**
- [x] **S12** ⚑ mark honest on elevation: the ⚑ is ~9% short when hitting up to hole 2's raised green (QA F3). Use the same landing simulation as the aim ring, including the cap. Test: ⚑ power finishes within ~2 m of the pin uphill, downhill and flat *(Dev, Nov 16, `dev/feel-pass-2`: bisection on `landingPoint()`, tests/pin-mark.test.js. Cross bunker with the 9 Iron: 9.7 m short → 1.1 m. Sweep of fairway/rough spots on hole 2: median finish 9.8 m → 2.0 m from the pin; hole 1 unchanged)*
- [x] **S13** Auto-pick rules (designer): the **Driver is auto-picked only on the tee**, and only when the distance makes sense. In a bunker, the **sand wedge** is auto-picked. Otherwise, the club that reaches the pin within its cap. The player can still choose any club manually. Tests per lie *(Dev, Nov 16, `dev/feel-pass-2`: `clubs.pickClub`, tests/autopick.test.js; baseline-v2 shot #19 re-recorded, Driver → 3 Wood. Bunker rule refined by the PM on PR #15: the sand wedge only when it reaches within its 85% cap, otherwise the club that gets there within the 60% bunker cap, never the Driver; `h2-fairway-bunker` → 3 Wood)*
- [ ] **S14** 🅿️ *(design question, decide before touching putting)* Should putting be **2 clicks** (start + power, no accuracy)? Until decided, putts keep 3 clicks, and a missed 3rd click on a putt stays mild (designer, 2026-11-16)
- [x] **H1** Mobile HUD pass (designer plays on a phone): intro card fits or scrolls in portrait and landscape (M5/B7), debug overlay doesn't cover the HUD (X7), the centre flash text wraps instead of running under the minimap, the ⚑ icon isn't clipped at the top of the meter (QA F2), meter labels readable over sand (QA F4) *(Dev, Nov 16, `dev/feel-pass-2`: checked at 390x844 and 844x390, plus 568x320 and 320x568 for the card scroll. Screenshots in reviews/dev-screenshots/feel-pass-2/)*

**Backlog from Feel pass 2 QA (2026-11-16)**
- [x] **S15** ⚑ for long clubs aims at the predicted **resting** point, not "land at 95% and run out". Today a 3 Wood at the ⚑ finishes 7–11 m past the pin on fairway (QA G2). Wedges are already fine. Test: ⚑ finishes within ~2 m for every club at 100–180 m, flat and ±8% *(Dev, Nov 17: done in Feel pass 3, see below)*
- [ ] **P9** *(low, rare)* `landingPoint` ignores the ground while the ball is rising, so the aim ring and ⚑ can promise a carry when the ball actually hits a bank right in front (QA G1, 2 of 6 430 spots on hole 2). Check the ground on the way up too

## Phase 2: Ball physics
- [x] **P1** Ball states
- [x] **P2** Flight: gravity, wind, curve
- [x] **P3** Bounce with rest/keep plus first-bounce spin factor
- [x] **P4** Roll and rest
- [x] **P5** Surface table *(but duplicated, see F7)*
- [x] **P6** Water/OB +1 penalty, ball replaced
- [x] **P7** Lie penalty (rough, bunker, sand wedge exception)
- [x] **P8** Deterministic tests → F0 + F9

## Phase 3: Hills and slopes
- [x] **T1** `heightAt` + `gradAt` + `normalAt` *(hole 2 only)*
- [x] **T2** Slope gravity on the roll (5/7 G)
- [x] **T3** STATIC/CREEP rest logic on slopes
- [x] **T4** Hilly test hole (hole 2)
- [x] **T5** Tests → F9
- [ ] **T6** *(optional)* Uphill or downhill lie changes the launch angle a little

## Phase 4: Putting and greens
- [x] **G1** Putter mode (putt range, short aim line, slow aim)
- [x] **G2** Green slopes and break *(hole 2)*
- [x] **G3** Cup capture plus lip-out
- [ ] **G4** Slope grid as a **toggle** (H key + setting) instead of painted on the texture
- [x] **G5** Test green with breaks (hole 2: two levels, ridge, hump)
- [x] **G6** Tests → F9
- [ ] **G7** *(nice)* Putt preview: show the first ~30% of the predicted line, with no break shown (keeps the skill)
- [x] **G8** Fix lip-outs (QA B6): after a lip-out the ball is still inside `CUP_R` on the next step and gets captured, so 498 of 499 lip-outs drop in. Push the ball outside the capture radius (or ignore capture for a short time after `lippedOut`). Changes gameplay → re-record baseline-v2 and explain why. Test: a ball faster than the capture speed over the cup stays out at realistic speeds (3.5–5 m/s), not just 8 m/s *(Dev, Nov 16: capture is ignored until the ball leaves the cup; 300 lip-outs at 3.5–5 m/s all stay out)*

## Feel pass 3 (small, next)
- [x] **S15** ⚑ for long clubs aims at the predicted **resting** point (moved up: tee targets depend on it since S18) *(Dev, Nov 17: `play.restPoint()` plays the whole shot on a hidden ball, no wind; the ⚑ bisects on it, for every club. 60 club/distance/slope cases all finish within 2 m (most drop). Below hole 2's raised green no power finishes at the centre (bank roll-back), so the ⚑ takes the closest finish)*
- [x] **S19** (owner, 2026-11-17) **Chip-range aim:** within ~30 m of the cup (`CHIP_AIM_RANGE`, tunable), the default aim is the cup on **any** surface (bunker, rough, fringe…), not the green centre. Test per surface *(Dev, Nov 17: `targetKind` 'chip', "Aim: the cup (within 33 yd)"; tested on bunker, rough, fairway on both holes, fringe stays 'cup'; the range is a `?tune=`. PM on PR #31: within chip range the ⚑ finishes `CHIP_FLAG_SHORT` = 1.5 m short of the cup, tunable; the owner compares 0 / 1.5 / 3)*
- [x] **X11** Debug overlay (Fix pass 2 QA, Low): R1 don't cover the ⏩ Skip button · R2 on small landscape phones (667x375, 568x320) don't cover the TUNED badge, hint or meter (shrink, or move to the top-left corner) *(Dev, Nov 17: keeps Skip's place free; on short screens it ends above the bottom panel and shrinks its font to fit, cutting the last lines only at 568x320 with a long tune list. Checked at 6 sizes during a shot: no overlap)*
- [ ] **S20** 🅿️ *(owner playtest, no code)* Pick `CUP_CAPTURE_SPEED` (today 3.2) by comparing `?scenario=h1-green&tune=CUP_CAPTURE_SPEED:2.4` / `2.8`. The value goes into the next tuning

## Phase K: Obstacles and hard surface (owner, 2026-11-17)
Goal: trees and rocks that matter. See DESIGN §4 "Obstacles" and the "Rock" surface.
- [x] **K1** **Rock / hard surface** (`rock`; also usable as a cart path): high bounce and long roll, a "thin" lie (cap ~0.90, window ×0.8). Shown on the course texture and minimap, named on the lie line *(Dev, Nov 17: rest .55, keep .75, decel 1.8, cap .9, window ×.8 in `surfaces.js`, all tunable as `rock.*`; grey on the texture)*
- [x] **K2** **Solid obstacles** in hole data (`obstacles`): tree **trunks** (vertical cylinders) and **boulders** (spheres). The ball bounces off them (`OBSTACLE_REST`, `OBSTACLE_KEEP`). Works in flight and in roll. Event `hitObstacle` *(Dev, Nov 17: `core/obstacles.js`, swept contact so fast balls can't pass through; REST 0.4, KEEP 0.7, both tunable)*
- [x] **K3** **Leaves (canopy)** per tree (ellipsoid around the top): a ball flying through **loses most of its speed** (`CANOPY_SLOW` ≈ 0.25–0.4 kept) and is **deflected a little** (`CANOPY_DEFLECT` ≈ 10–20°, from the seeded RNG so replays match), then drops. Once per canopy per shot. Event `hitLeaves` + flash text ("Into the trees!") *(Dev, Nov 17: CANOPY_SLOW 0.3, CANOPY_DEFLECT 15°, both tunable; the leaves are an ellipsoid centred on the top of the trunk)*
- [x] **K4** **No blind shots:** the aim preview (landing ring / line) is height-aware and turns a warning colour when the predicted flight hits a trunk or canopy, showing where. The ⚑ and auto-pick ignore obstacles (the warning is the information) *(Dev, Nov 17: `play.aimWarning()` checks the full-power arc the ring shows; red dots past the hit, red ring, red marker in the air, red × on the minimap, warning on the hint line)*
- [x] **K5** Trees and rocks rendered from the same hole data (trunk + canopy meshes, rocks), so what you see is exactly what the physics uses. Debug overlay can outline colliders *(Dev, Nov 17: outlines show while the debug overlay is open)*
- [x] **K6** **Prototype hole 3** (`pl-03`, owner design): a **par 4 dogleg**. A **wide** landing area off the tee with a **single tree in the middle of the fairway**. The corner is lined with trees, and a brave player can **cut over the trees** at the corner to shorten the hole: possible with a well-struck, high enough shot, caught by the leaves if too low or mishit. Add `?scenario=` spots (behind the lone tree, the cut-over shot, a ball on rock) and add the hole to the practice set *(Dev, Nov 17: dogleg right, 373 m along the line, lone tree + 22 corner trees + rock outcrop with 2 boulders; scenarios `h3-behind-tree`, `h3-cut-corner`, `h3-rock`; new set `practice` = holes 1–3)*
- [x] **K7** Tests: trunk bounce, boulder bounce, canopy slow + seeded deflection (same seed = same result), ball rolling into a trunk, aim warning on/off, rock lie, skip = watch with obstacles. Baseline: holes 1–2 unchanged (no obstacles there), new v2 shots for hole 3 *(Dev, Nov 17: tests/obstacles.test.js (22 tests), the P10 rest sweep now covers hole 3 and rock, 8 new v2 shots; the 40 old v2 and 19 v1 shots are unchanged)*
- [x] **K8** (owner, PR #33) **Every tree inside the OB line is a real tree** on holes 1–2 (outside OB stays decoration). Fixed positions in hole data (generated once from a seed and written out), fairness guards in `validateHole` (no tree on the tee, fairway, fringe or green; the default tee shot isn't blocked). Baselines per AGENTS rule 9 *(Dev, Nov 17: 25 trees on hole 1, 79 on hole 2, from the old decoration spots (`src/holes/trees.js`); none broke a guard, none moved. One baseline shot changes: the h1 forced max slice flies into a tree (v1 exception #9, v2 re-recorded). A tree meant to be on a fairway says `onFairway: true` (hole 3's lone tree))*
- [x] **K9** (owner, PR #33) **A rock bounce you can try on purpose:** scenario `h3-rock-bounce` (a normal shot lands on the rock surface, not a boulder) + a tune example for `rock.rest` / `rock.keep` *(Dev, Nov 17: scenarios can set `aimAt`; the ⚑ 9 Iron lands on the rock and bounces three times; compare `&tune=rock.rest:0.4,rock.keep:0.7`)*
- [x] **K4b** (PM on PR #33) The aim warning also checks the **⚑ shot** and says which ("At ⚑ power" / "At full power"); hole 2's result card links to hole 3

### Phase K polish (owner, 2026-11-17)
- [x] **K13** (owner bug, first) The flat background ground plane (`scenery.ground.y`) pokes through the course wherever the terrain is lower (hole 2: −0.6 vs hollows to −1.8 past the tee and −1.5 left of the bunker, ~11% of the hole and the ball hidden; hole 3: −0.3 vs −0.6, ~2%). Put it below each hole's lowest terrain and add a `validateHole` check (ground plane below the minimum `heightAt` over the map, with a margin) *(Dev, Nov 17: hole 1 −0.1, hole 2 −3.9 (lowest point −3.72 in the pond bowl), hole 3 −0.75. `validateHole` checks `heightAt` on the terrain mesh grid (thinned to 2 m) against `GROUND_PLANE_MARGIN` 0.1 m and names the lowest spot and a value that works. The mesh grid helper moved to `core/terrain.js` `meshAxis` so the scene and the check use the same points)*
- [x] **K10** (QA L1) A ball dropping onto the top of a trunk passes through it. Add a top cap to trunk collisions *(Dev, Nov 17: a flat top cap (normal straight up, the boulder nudge so it can't balance there), and the side contact now counts while the ball's lowest point is below the top (it was the centre, which let a ball skimming the top slip in). No baseline shot moved)*
- [x] **K11** (QA L2) The aim warning can miss grazing leaf hits. Use the same step size as the real ball. Test: 0 misses on the QA's sweep *(Dev, Nov 17: `aimWarning` flies the real ball's 1/240 s steps with the same update as `ball.js`; the ring and the ⚑ keep their own simulation. Fine aim sweeps across the leaf edges of QA L2's two trees and hole 3's lone tree: 0 misses, 0 false alarms (on L2 (a) the old warning missed 35 of 401 aims))*
- [x] **K12** (QA L3 + feel) Hole 3's intro shows the play-line distance (~408 yd), not the straight line. The warning hint says "aim around it or change your power" instead of "pick a higher club" *(Dev, Nov 17: optional hole field `playLine` (tee → … → cup, checked by `validateHole`), `vec.holeLength`; hole 3 = tee → corner → cup = 408 yd. "To pin" still shows the straight distance)*

## Phase 5: Rain *(moved after Gate B, owner 2026-11-17)*
- [ ] **W1** `weather` field on holes. A hole set can also override it (same holes, rainy day)
- [ ] **W2** `getEffectiveSurface()` applies the wetness rules from DESIGN §7. It's the only place weather touches physics
- [ ] **W3** Rain visuals: particles, darker sky and light, wet ground tint, HUD weather icon
- [ ] **W4** Tests: wetness 0 matches today, wetness 1 rolls 30–50% less, wet greens are slower
- [ ] **W5** "Rainy Day" hole set (holes 1 and 2 with wetness 1)

## Phase 6: Multi-hole rounds and scoring (any-length course, solo)
*Owner rule (2026-11-17): a course is a playlist of hole ids of **any length** (9, 18, 99…), and the same hole can appear in several courses. Nothing may assume 9 holes.*
- [x] **R1** `round.js`: start a round from a hole set, current hole, advance, finish *(Dev, Nov 17, `dev/R-rounds`: `src/core/round.js` `createRound(set, { seed, getHole })` → `current` { index, number, of, hole, seed }, `record(play.finished)`, `advance()`, `restart()`, `done`. Any length; holes are numbered by their place in the round. `?set=<id>` starts a round; `?hole=` / `?scenario=` stay single-hole)*
- [x] **R2** Scorecard model (strokes, par, result per hole, total vs par, picked-up flag) *(rows { number, holeId, par, strokes, penalties, pickedUp, toPar, result }; `totals` and `groups()` (groups of `SCORECARD_GROUP` 9 with subtotals). A picked-up hole counts its strokes (the stroke limit). `play.finished` now also has `penalties`)*
- [x] **R3** Hole loading/unloading in the game layer (scene, terrain, texture, flag) with no leftovers *(the next hole is a new A2 session in the same page, no reload; in a round the "Try Hole 2 / Back to Hole 1" links are hidden (A6 for rounds; single-hole links stay until the menus))*
- [x] **R4** Between-hole summary card + final scorecard screen *(`src/game/roundUi.js`: summary = result, penalties, running total, "Next hole: Hole N · par P" / "See the scorecard". Scorecard = one small table per group of 9 (Front 9 / Back 9 / Holes 19–20 …, or "Holes 1–3" for a short round; renamed Out / In in Phase 7) with Par, Score, ± rows and a Sub column, then the total, picked-up / penalty notes and the personal best, with Play again (new round, new seed unless `?seed=`) and Menu (reloads for now). Fits 320 px portrait; a long round scrolls. PM on PR #38: holes 2+ open with a compact hole card (Hole N of M, par, distance / plays N yd, `intro.tagline`) that closes after 2.5 s or on a tap; Play again = new seed and Menu = reload confirmed)*
- [x] **R5** Tests: a 2-hole simulated round gives correct totals, a picked-up hole is counted correctly, restart resets everything *(tests/round.test.js: 9-hole totals with a picked-up hole and a penalty, a 1-hole set, a 20-hole set (and 99), same seed = same winds, restart, real hole play into the round)*

- [x] **R6** A 9-hole round works with the 3 prototype holes repeated or any hole set (the mountain course arrives hole by hole in Phase C). Personal best per mode and per course in localStorage (try/catch) *(temporary sets `prototype3` "Prototype 3" and `test9` "Test 9" (holes 1–3 three times). Best per set: `pocketlinks.best.v1.<setId>` = lowest to-par; per mode comes with T (vs AI))*
- [x] **R7** Round seed: one seed per round, each hole's wind derived from it, shown in debug (as planned in Phase 0) *(`holeSeed(roundSeed, index)`: by place, so a hole played twice gets two winds; `?seed=` fixes the round seed. Debug: `hole pl-02 (5/9) seed …` and a `round` line with the round seed and running score)*
- [x] **R8** (PM, with Phase 6) `difficulty` 1–5 on holes 1–3 (h1 1, h2 3, h3 2), required by validateHole · at the tee, "To pin" adds "· plays N yd" when the play line is longer than the straight line (hole 3: plays 408 yd, QA feel note)

## Phase C: Mountain course prototype (9 new holes by the course designer, one hole per PR)
See `docs/HOLE_GUIDELINES.md` and `docs/GENRE_NOTES.md`. The course designer designs all 9; the owner plays and comments on each (owner, 2026-11-18). pl-01..03 are not part of it. Branch `course/<hole-id>`, one hole at a time (no parallel course PRs, so `sets.js` never conflicts). Each PR: hole file, scenarios, the hole in the "Mountain 9" set, a test that it validates, v2 shots, a tap-ready link.
- [x] **C0** 🅿️ Course designer proposes the 9-hole plan (par per hole, length, the course's signature idea and each hole's twist, safe and hero routes, difficulty 1–5); the owner approves; the PM checks it against the guidelines *(course designer, approved by the owner 2026-11-18: `docs/COURSE_PLAN_MTN.md`, signature idea "the creek")*
- [x] **C1–C9** Holes 1–9 of the mountain course (`mtn-01` … `mtn-09`) *(course designer, one PR by owner exception: `src/holes/mtn-course.js` (shared kit) + `mtn-01…09.js`, 27 scenarios, the `mountain9` set, `tests/mtn.test.js`, 21 v2 shots. mtn-06 is 160 m, not 175)*
- [ ] **C10** Mountain look: sky, light, fog, rock and pine colours, distant peaks (shared scenery for the course)

## Phase 7: Menus
*Dev, Nov 18, `dev/M-menus`: `index.html` opens on the main menu; any dev link (`?hole=`, `?scenario=`, `?set=`, `?seed=`, `?tune=`, `?debug=`) skips it as before. Menu model in `src/core/menu.js` (pure, tests/menu.test.js), screens in `src/game/menus.js`, settings in `src/game/settings.js`. Browser check: `node tools/menu-check.mjs` (154 checks).*
- [x] **M1** Main menu (Play, How to Play, Settings) *(the landing page of `index.html`; How to Play = the 3-click swing, wind/lie, a key table incl. Skip and Pause)*
- [x] **M0** Play menu modes: **Solo** (pick a course), **vs AI** (shown, disabled, "Coming soon" until Phase T), **Practice** (one hole, or a test spot from `scenarios.js`, grouped by hole) *(owner/PM Phase 7: any-length courses, not "9 holes"; difficulty choice comes with Phase T. Single holes started from the menu hide the old "Try Hole 2" links; the result card has Play again + Menu)*
- [x] **M2** Hole set select built from `sets.js` (no hardcoded list). Replaces the F8 `?hole=` switcher, but keep `?hole=` as a dev shortcut *(every set is a Solo course unless its `menu` is `'practice'` (its holes = the Practice holes) or `'hidden'` (`?set=` only: `pl-1-2`, `slope-test`); `tag: 'Prototype'` on `prototype3` and `test9`; each course shows holes, par and the personal best. Quitting to the menu drops `?hole/scenario/set` from the address so a reload shows the menu)*
- [x] **M3** Pause menu (Esc / button): Resume, Restart Hole, Quit to Menu *(the II button under the scorecard panel (beside it on short landscape screens). Pausing stops the ball and the hole's timers (they keep their time left); a swing in progress is cancelled with no stroke. Restart = the same hole and wind again from the tee or test spot; in a round it doesn't touch the scorecard. Quitting a round asks "Quit this round? …" first. Esc backs out of whatever is open; not available once the hole is over (the summary / result card is up))*
- [x] **M4** Settings: debug overlay, putt grid, saved in localStorage (try/catch) *(`pocketlinks.settings.v1`; debug = the overlay opens when a game starts (backtick still toggles it); putt grid = Hole default / Every green / Off, applied from the next hole. A page with storage blocked still starts and says settings only last for the visit)*
- [x] **M5** Works on mobile (touch-sized buttons, portrait and landscape). Known (QA B7): in phone landscape (844x390) the intro card is taller than the screen and cuts off the title and Tee off button. Cards must fit or scroll; also X7 (debug overlay vs HUD) *(menu buttons ≥ 44–56 px; menus scroll; checked at 390x844, 844x390, 568x320, 320x568 and 1280x800 (reviews/dev-screenshots/M-menus/). On 568x320 the scorecard's Play again / Menu bar is smaller. Also: at 320 px wide the SWING button was cut off on the right (on main too), the controls row now fits)*
- [x] **M6** Tests: the menu → play → quit → play cycle leaves no leftover state *(tests/menu.test.js: every menu item resolves to a hole you can hit (Node). `tools/menu-check.mjs` (Playwright): all 18 menu paths reach a playable hole; 6 menu → play → quit cycles leave no hole, round, timer, open card or renderer memory; pause, restart, quit confirmation; a full Prototype 3 round to the scorecard and its Menu button; settings saved and reloaded; storage blocked; dev links skip the menu)*

**Small fixes in the same PR (PM, Phase 7)**
- [x] **QA R-1** Space and Enter start the hole from the intro card and the compact hole card
- [x] The wind on a hole's first card is the wind you play (Tee off no longer re-rolls it: the hole is set up once behind the card)
- [x] Scorecard groups: a full first group of 9 is **"Out"**, the second **"In"**; after 18 they stay "Holes 19–27"; a short round stays "Holes 1–3"
- [x] The debug overlay stays below cards and menus (cards z 10, pause menu z 20, overlay z 5)
- [x] (Owner on PR #40) Hole 2's intro mentions the putt grid only when its green shows one (`intro.grid` / `{grid}`); the compact hole card's 2.5 s countdown starts once the hole is on screen, not when it starts loading
- Owner answers on PR #40: a 9-hole card shows one "Out" group ✓ · old test sets stay hidden from the menu ✓ · pausing mid-swing cancels the swing with no stroke ✓

## Phase T: AI rivals (owner, 2026-11-17)
See DESIGN §8 "Rivals".
- [x] **T1** `rivals.js` (core, pure): 5 invented rivals, each with a skill; per-hole score generated from skill, hole par and hole `difficulty` (1–5), seeded by the round seed (same seed = same scores) *(Dev, Nov 18, `dev/T-rivals`: Bea Marlowe, Hank Fairweather, Ottoline Pike, Rusty Dunmore, Pip Larkin, each with a flavour line; a normal curve around `RIVAL_BASE + RIVAL_DIFF_K × (difficulty − 1) − skill`, cut into whole strokes, best score par − 2 and never a hole in one (owner on PR #44, `RIVAL_BEST_TO_PAR`); one RNG stream per hole from its seed; `RIVAL_*` tunables in config.js and `?tune=`)*
- [x] **T2** Difficulty Easy / Normal / Hard shifts the rivals' skill *(`RIVAL_EASY_SHIFT` −0.35, `RIVAL_HARD_SHIFT` +0.3; Play → vs AI → course → difficulty, which also lists the rivals; `?ai=easy|normal|hard` dev link)*
- [x] **T3** Leaderboard after each hole (position, name, thru, to par) + final standings with the player's place *(summary card: Pos, Name, this hole, Thru, ±, your row highlighted; scorecard: "You finished 2nd of 6 (Normal)" + final standings; ties "T2", you first then roster order; personal best per course and mode)*
- [x] **T4** Tests: same seed = same rival scores, Hard rivals average lower than Easy over many rounds, ties sorted consistently *(tests/rivals.test.js, 1 000-round checks incl. the proposed Normal target "winner par to −2" on Test 9; any length 1–99; `tools/menu-check.mjs` plays every vs AI course × difficulty and a whole round vs AI)*
- [x] vs AI enabled on the Play menu

## Engine wishlist from the genre study (owner, 2026-11-18, not scheduled)
From the owner's design doc "Arcade Golf Course Design Principles", relayed by the course designer. Not planned yet: the owner orders these after the Phase C prototype / at Gate B. Course designers don't wait for them.
- ~~D1 Several tee sets per hole~~ Dropped by the owner (2026-11-18): one tee per hole is fine.
- [ ] D2 Several pin positions per green (4+). Today: 1 cup per hole.
- [ ] D3 Hole intro flyover camera. → **scheduled as V4** (Phase V): the regular route only.
- [ ] D4 Intentional draw / fade. → **moved to Phase B, ball control (B1)**.
- [ ] D5 More surfaces: deep rough, waste areas, gorse / heather. Today: fairway, rough, sand, rock, water, OB.
- [ ] D6 Wind shown in the landing zones (flags, trees moving). Today: the HUD arrow and speed, and the flag at the cup.
- [ ] D7 Built walls (stone wall, low wall) as in-play obstacles the ball bounces off. Today: trees and boulders only. Natural rock cliffs need no engine work (steep terrain + rock surface).
- Already there: elevation is shown in the distance readout (`↑`/`↓` yards to the cup, `hud.js`). Rain as a difficulty lever = Phase 5. Character stats for hero carries: out of scope (DESIGN §1).

## Load time (PM, 2026-11-18, before Phase V)
- [ ] X12 Startup builds and validates every hole: `sets.js` imports all holes, each mountain module builds its grids/forest at import, and `validateHole` runs its shot simulations on every hole at load (heavier since S21). So `?hole=pl-02` pays for all 9 mountain holes (Node: ~2.2 s to import all holes, was 1.76 s; headless page load +0.7–1.4 s). Build a hole's data on first use (lazy), and keep the full `validateHole` simulations in tests (or run them only for the hole being loaded). Measure phone-size load before/after.

## Phase V: Camera (owner, 2026-11-18, after the playtest 1 pass)
The camera matters more now that the player aims himself (S21/S22). Camera code is game layer (`src/game/camera.js`); any choice logic (which view, seeded variety) goes in core so it's tested. Never a blind shot; works on phones (portrait and landscape).
- [ ] V1 Aiming view: a better default view behind the ball while aiming, showing the landing area, the aim marker and the hazards in the way.
- [ ] V2 Optional view buttons while aiming (temporary: the view goes back when released / tapped again): on full shots, **zoom to the landing marker**; on putts, **a green-reading view** (from above or low down). Optional, never required to play.
- [ ] V3 Ball-flight camera with **variety**: sometimes the flight as today (behind), sometimes **at an angle** from the side, sometimes **from the landing spot, looking back at the ball coming in**. Chosen per shot by rules + the seeded RNG (no same view many times in a row; short shots and putts stay simple). A setting to turn variety off (classic camera).
- [ ] V4 Hole intro flyover (was D3): follows the hole's regular route from the tee to the green (owner: no need to show every route); tap to skip; once per hole per round.
- [ ] V5 Tests (view choice in core, seeded) and `tools/session-check.mjs` still passing; fps check on a phone-size viewport.

## Phase B: Ball control (owner, 2026-11-18, backlog, not scheduled)
Shape the shot on purpose, before the swing. Physics and swing feel change, so AGENTS.md rules 8–9 apply (v2 re-record, per-shot v1 exceptions). Design the controls with the owner first (B0).
- [ ] B0 🅿️ Owner + PM: how the player picks curve / height / spin (controls on phone and desktop, how it shows on the aim line and marker)
- [ ] B1 Curve the ball on purpose: draw / fade (was D4). Today it only curves on a mistimed 3rd click.
- [ ] B2 Trajectory: a high lob or a low, straighter punch (changes carry, roll and wind effect)
- [ ] B3 Spin: topspin (runs on after landing) or backspin (checks up, can spin back), changing how the ball reacts on landing
- [ ] B4 The aim line and marker show the chosen shape, so there are no blind surprises

## Small gameplay items (owner, 2026-11-18)
- [ ] S23 The aim marker warns when the full-power landing would be in water or OB (like it already turns red for trees), with a different colour or icon so the player can tell water from a tree

## Phase U: UI pass, phones and desktop (owner, 2026-11-18, not scheduled yet)
A big pass on the whole interface so it works well on both phones (portrait and landscape, touch) and desktop (large screens, mouse and keyboard). Scope to be set with the owner before it starts (likely together with the art style decision): HUD layout per screen size, menus, touch targets, readable text sizes, the minimap and power bar placement, settings. Small HUD fixes until then go in the backlog, not in a separate pass.
- [ ] U0 🅿️ Owner + PM: scope and priorities of the UI pass (what screens, what devices, reference screenshots)

## Phase 8: Small polish (only if useful for testing)
- [x] **X1** Camera follows the ball, plus a green view
- [x] **X2** Shot trail
- [ ] **X3** Dev hotkeys: R = reset to tee, T = teleport the ball to the clicked point (debug only)
- [x] **X4** Wind
- [ ] **X5** Shot result line (carry and total distance in yards)
- [ ] **X6** Upgrade Three.js from 0.160 to the current release (pinned version + Subresource Integrity). Do this after Phase 0, in its own PR, and check that the baseline tests still pass
- [x] **X7** *(low priority)* The debug overlay (backtick) can overlap the HUD panel on short screens: move or shrink it *(→ done in H1)*
- [x] **X8** Designer test links (work on a phone, no keyboard needed):
  - `?scenario=<id>` starts the ball at a named spot with a fixed seed: at least `h1-bunker`, `h1-green`, `h1-pond-carry`, `h2-fairway-bunker`, `h2-cross-bunker`, `h2-green-step`, `h2-side-slope`. Scenarios live in data (`src/holes/scenarios.js`), not code
  - `?tune=NAME:value,NAME:value` overrides tunables from `config.js` for that visit only (whitelisted names, numbers only, clamped to a sane range), shown in a small "TUNED" badge so a tuned build is never mistaken for the real one
  - A short list of scenario links in the README
  - *(Dev, Nov 16: 7 scenarios; 10 tunables whitelisted in `TUNABLES`; tests/tune.test.js and tests/scenarios.test.js)*

---

## Merge checklist (every dev PR)
1. QA agent report in `reviews/qa-<branch>.md`, with no High bugs open
2. 🅿️ Alexis playtests for feel
3. PM review against the plan
4. 🅿️ Alexis merges

## Review gates
Reviewers only read code and write reports in `reviews/`. You decide which findings get fixed.

**Gate A: after Phase 0** (it's a big refactor, so catch structural problems early)
- [x] **X10** Debug overlay small fixes (Fix pass 1 QA, all Low): Q1 in portrait the overlay covers the TUNED badge and a long tune list makes it wider than the screen · Q2 in landscape `?debug=1` opens it over the scorecard (the backtick position is fine) · Q3 the "a file didn't load" start-up message always names `src/game/main.js` instead of the file that failed *(Dev, Nov 17: Q1 overlay above the bottom panel, long lines wrap; Q2 re-placed every refresh; Q3 names the file only when resource timing reports its error status, else none. Screenshots in reviews/dev-screenshots/fix-pass-2/)*
- [x] **QA1** Maintainability review
- [x] **QA2** Testing review
- [x] **QA3** Compatibility review (frame rates, browsers, mobile, `file://` vs server)
- [x] **QA4** 🅿️ The owner marks findings APPROVED or SKIP → the dev fixes them on `dev/QA-fixes`

**Gate A fix passes** (approved findings, see `reviews/A-decisions.md`)

*Fix pass 1: `dev/QA-fixes-1`, no gameplay change: baseline v1 and v2 must pass **untouched** (except for the new v2 shots from T2, recorded once)*
- [x] **C1** Commit Three.js 0.160.0 to `vendor/three-0.160.0/three.module.js` (license kept), point the import map at it, and remove the unpkg / `THREE_MODULE` workaround from tools, tests and docs *(unmodified npm build + LICENSE + README with sha256; `tests/vendor.test.js` checks the import map, the hash and that no module imports a URL)*
- [x] **C2** Plain-language message in `#notice` when the game can't start (no import maps, no WebGL, `file://`, module load error) *(classic script in `index.html` + try/catch around the renderer; Tee off becomes a disabled "Can't start"; checked headless for WebGL off, a blocked file and `file://`)*
- [x] **C5** `?debug=1` opens the debug overlay (incl. fps and seed) on a phone *(also shows the render quality)*
- [x] **C4** (partial) Quality tunables: DPR cap + antialias on/off, in `?tune=` *(`DPR_CAP` 0.5–3, default 2; `ANTIALIAS` 0/1, default 1)*
- [x] **C6** iOS Safari viewport height (`dvh` / visualViewport) · **C7** only a primary tap/click/key starts a swing *(C7: a mouse needs the left button; every finger counts on touch so two-thumb play works; Ctrl/Cmd/Alt+Space doesn't swing)*
- [x] **A1 + A8** Hole flow in core: after each event, core decides what's next (aim, penalty return, holed, picked up) and is the only way to hit the ball. `main.js` maps it to delays and visuals. Tests in Node *(`play.swing` / `play.next` / `play.proceed()` / `play.finished`, `setClub` / `setAim`; `tests/flow.test.js` plays both holes tee → holed and tee → picked up)*
- [x] **A2** Disposable hole session: create/dispose scene objects, textures, listeners and timers for one hole, so rounds and menus can load holes. Test: 10 load/dispose cycles with no growth in `renderer.info.memory` *(`src/game/session.js`; `node tools/session-check.mjs` runs the 10 cycles in a real browser, plus "input bound once" and "no timer from the old hole")*
- [x] **A3** One source of truth for state/phase predicates, used by core, HUD, camera and input, plus a test that every meter phase is covered *(`src/core/states.js`; the camera now treats `grace` / `nopower` as aiming)*
- [x] **A5** Tunables: one entry each (value + range + setter) instead of three lists *(`TUNABLES` `{ def, min, max }`, live values in `TUNE`; lie tunes are a layer and the surface/club tables are frozen; a tune beats a hole's `surfaceOverrides`)*
- [x] **T2** ~8 more v2 shots: rough, bunker with and without SW, fringe chip, hook/slice at ±0.1 and ±0.15, shank, topped, mistimed putt, lip-out at a fixed seed, sloped bunker. Move "h1 hook/slice" off the window edge *(14 new shots, recorded once; the old "h1 hook/slice" stay as v1 copies and the new ±0.10 / ±0.15 shots are off the edge, see the PR)*
- [x] **T3** `record-baseline-v2.mjs` prints which shots moved and by how much before overwriting *(also `--dry`, and nothing is written when nothing changed)*
- [x] **T5** Putt accuracy tests · **T6** cup rule tests (edge of `CUP_R`, rest over the cup, landing on the fly) · **T9** no test changes global settings at import *(`tests/putt-cup.test.js`; T9: v1 tune in `before`/`after`, `resetAllTunables` everywhere, `lieFactor` dropped)*
- [x] **T7** Validate hole and scenario data when it loads, with a clear error naming the hole and field *(`src/core/validate.js`, called by `sets.js` / `scenarios.js`; `makeBag` throws on an unknown id)*

*Fix pass 2: `dev/QA-fixes-2`, physics/feel changes (after pass 1, so the new v2 shots guard it). Follows AGENTS rule 9*
- [x] **P10** (Gate A T1) Rest rule: a ball that stays below `STOP_SPEED` for a short time comes to rest, so no roll on a real hole ends through the 40 s `ROLL_TIMEOUT`. `stopped` reports the reason. Sweep test over both holes: 0 timeouts *(Dev, Nov 17, `dev/QA-fixes-2`: `STOP_TIME` 0.5 s below `STOP_SPEED`, plus `CRAWL_TIME` 8 s: a ball that has crawled that long gets full friction again (the STOP_TIME rule alone left ~1 in 400 hole 2 shots crawling at 0.1–0.3 m/s for 40 s in a hollow). `stopped.reason` = still / settled / timeout. tests/rest.test.js sweeps both holes: 0 timeouts, longest roll ≈ 24 s)*
- [x] **S16** (Gate A C3) The meter reads the real click time (event time vs the frame time), not the last frame. Test: the same click times give the same result at 30 and 144 fps *(Dev, Nov 17: `pressMeterAt(m, clickTime)` / `tickMeterTo(m, frameTime)` in swing.js, click time from `event.timeStamp`. tests/meter-clock.test.js: identical swings at 30/60/144 fps; POWER_GRACE 0.15, MISSED_POWER_FRACTION 0.15 and the inclusive grace edge pinned)*
- [x] **X9** (designer idea) **Skip to the end of the shot:** a "⏩ Skip" button (and Space/Enter) appears ~1 s after the hit, during flight and roll. It runs the remaining physics instantly, with no rendering, and shows the ball at rest with the usual flash text. Holed, penalty and picked-up flows still play normally. The result must be **identical** to watching the shot (test: skipped vs watched end position and strokes, same seed). Tapping the course does NOT skip, so an extra swing tap can't skip by accident. Builds on A1 (hole flow in core) *(Dev, Nov 17: `play.skip()`, `TIMING.skipAfter` 1000 ms, button above the meter on the right. tests/skip.test.js: skipped = watched exactly, incl. lip-out, water, picked up, holed, any frame rate and skip moment)*
- [x] **S17** Designer tuning 1 (Alexis + playtesters, 2026-11-16: "harder is much better"). Swing: **`SWEET` 0.05 → 0.045**, **`CURVE_SHAPE` 2 → 1** (old curve, near-misses hurt), **`METER_SPEED` 1.0 → 1.15**. Wind: **`WIND_K` 0.2 → 0.3**. Harder bunkers: other clubs **`maxPower` 0.60 → 0.50, `sweetScale` 0.5 → 0.4**; sand wedge in a bunker **0.85 → 0.75, 0.7 → 0.6**. Faster greens: **hole 1 green `decel` 1.1 → 0.7, hole 2 0.8 → 0.6** (putt power stays calibrated). Make the sand wedge's bunker override **and** surface physics values (at least `green.decel`, `green.keep`) tunable through `?tune=`. Re-record v2 with the other Fix pass 2 changes, list the moved shots, and rename the two "h1 hook/slice" edge shots ("h1 slight hook/slice, tee") *(Dev, Nov 17: all values in; `<surface>.decel/keep/rest` tunable (a tune wins over `surfaceOverrides`); `sw.sand.*` was already tunable. v1: 5 per-shot exceptions; v2 re-recorded once (table in the PR))*
- [x] **S18** Smarter default aim (designer: "the automatic aim is too strong"). **A:** approach shots aim at the **centre of the green**, not the pin, so the player adjusts to the flag. **B:** tee shots on par 4/5 aim at a **fairway target** from the hole data (`aimTarget` per hole, e.g. the dogleg corner on hole 2). Par 3 tee shots aim at the centre of the green. Putts still aim at the cup. The ⚑ mark and the auto-pick use the default aim's distance. Tests per case *(Dev, Nov 17: `play.target` / `targetKind` / `targetDist()`, hole 2 `aimTarget` (9, −270), green centre from `features.green`, both checked by validateHole; fringe chips aim at the cup and the scorecard shows "Aim: …" (PM on PR #27). tests/default-aim.test.js)*

*Skipped or moved:* A6, A10 → Phase 7 (menus) · A9, C8, C10, T8 → skipped · A4 → DESIGN §7 rewritten (PM), code in W2 · A7, T4, C9 → done by the PM

**Gate B: after Phase 7** (full set)
- [ ] **QB1** Security · **QB2** Scalability · **QB3** Maintainability · **QB4** Compatibility · **QB5** Testing
- [ ] **QB6** 🅿️ Owner approval → dev fix pass
- [ ] **QB7** Tech Lead final review ("could this be better?") → PM turns its proposals into new tasks
