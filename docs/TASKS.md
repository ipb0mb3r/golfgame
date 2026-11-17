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
| 6 | Rounds and scoring (9-hole round, solo) | after K | `dev/R-rounds` |
| C | **Mountain course** (9 holes, co-designed with the owner, one hole per PR) | runs alongside 6, 7, T | `course/<hole-id>` |
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
- [ ] **K1** **Rock / hard surface** (`rock`; also usable as a cart path): high bounce and long roll, a "thin" lie (cap ~0.90, window ×0.8). Shown on the course texture and minimap, named on the lie line
- [ ] **K2** **Solid obstacles** in hole data (`obstacles`): tree **trunks** (vertical cylinders) and **boulders** (spheres). The ball bounces off them (`OBSTACLE_REST`, `OBSTACLE_KEEP`). Works in flight and in roll. Event `hitObstacle`
- [ ] **K3** **Leaves (canopy)** per tree (ellipsoid around the top): a ball flying through **loses most of its speed** (`CANOPY_SLOW` ≈ 0.25–0.4 kept) and is **deflected a little** (`CANOPY_DEFLECT` ≈ 10–20°, from the seeded RNG so replays match), then drops. Once per canopy per shot. Event `hitLeaves` + flash text ("Into the trees!")
- [ ] **K4** **No blind shots:** the aim preview (landing ring / line) is height-aware and turns a warning colour when the predicted flight hits a trunk or canopy, showing where. The ⚑ and auto-pick ignore obstacles (the warning is the information)
- [ ] **K5** Trees and rocks rendered from the same hole data (trunk + canopy meshes, rocks), so what you see is exactly what the physics uses. Debug overlay can outline colliders
- [ ] **K6** **Prototype hole 3** (`pl-03`, owner design): a **par 4 dogleg**. A **wide** landing area off the tee with a **single tree in the middle of the fairway**. The corner is lined with trees, and a brave player can **cut over the trees** at the corner to shorten the hole: possible with a well-struck, high enough shot, caught by the leaves if too low or mishit. Add `?scenario=` spots (behind the lone tree, the cut-over shot, a ball on rock) and add the hole to the practice set
- [ ] **K7** Tests: trunk bounce, boulder bounce, canopy slow + seeded deflection (same seed = same result), ball rolling into a trunk, aim warning on/off, rock lie, skip = watch with obstacles. Baseline: holes 1–2 unchanged (no obstacles there), new v2 shots for hole 3

## Phase 5: Rain *(moved after Gate B, owner 2026-11-17)*
- [ ] **W1** `weather` field on holes. A hole set can also override it (same holes, rainy day)
- [ ] **W2** `getEffectiveSurface()` applies the wetness rules from DESIGN §7. It's the only place weather touches physics
- [ ] **W3** Rain visuals: particles, darker sky and light, wet ground tint, HUD weather icon
- [ ] **W4** Tests: wetness 0 matches today, wetness 1 rolls 30–50% less, wet greens are slower
- [ ] **W5** "Rainy Day" hole set (holes 1 and 2 with wetness 1)

## Phase 6: Multi-hole rounds and scoring (9-hole round, solo)
- [ ] **R1** `round.js`: start a round from a hole set, current hole, advance, finish
- [ ] **R2** Scorecard model (strokes, par, result per hole, total vs par, picked-up flag)
- [ ] **R3** Hole loading/unloading in the game layer (scene, terrain, texture, flag) with no leftovers
- [ ] **R4** Between-hole summary card + final scorecard screen
- [ ] **R5** Tests: a 2-hole simulated round gives correct totals, a picked-up hole is counted correctly, restart resets everything

- [ ] **R6** A 9-hole round works with the 3 prototype holes repeated or any hole set (the mountain course arrives hole by hole in Phase C). Personal best per mode and per course in localStorage (try/catch)
- [ ] **R7** Round seed: one seed per round, each hole's wind derived from it, shown in debug (as planned in Phase 0)

## Phase C: Mountain course (co-designed with the owner, one hole per PR)
See `docs/HOLE_GUIDELINES.md`. Branch `course/<hole-id>`, one hole at a time (no parallel course PRs, so `sets.js` never conflicts). Each PR: hole file, scenarios, the hole in the "Mountain 9" set, a test that it validates, v2 shots, a tap-ready link.
- [ ] **C0** 🅿️ Owner + course designer: the 9-hole plan (par per hole, length, signature hazard, difficulty 1–5), checked against the guidelines by the PM
- [ ] **C1–C9** Holes 1–9 of the mountain course (`mtn-01` … `mtn-09`)
- [ ] **C10** Mountain look: sky, light, fog, rock and pine colours, distant peaks (shared scenery for the course)

## Phase 7: Menus
- [ ] **M1** Main menu (Play, How to Play, Settings)
- [ ] **M0** Play menu modes: **Solo 9 holes**, **vs AI 9 holes** (difficulty choice), **Practice** (one hole or a scenario)
- [ ] **M2** Hole set select built from `sets.js` (no hardcoded list). Replaces the F8 `?hole=` switcher, but keep `?hole=` as a dev shortcut
- [ ] **M3** Pause menu (Esc / button): Resume, Restart Hole, Quit to Menu
- [ ] **M4** Settings: debug overlay, putt grid, saved in localStorage (try/catch)
- [ ] **M5** Works on mobile (touch-sized buttons, portrait and landscape). Known (QA B7): in phone landscape (844x390) the intro card is taller than the screen and cuts off the title and Tee off button. Cards must fit or scroll; also X7 (debug overlay vs HUD)
- [ ] **M6** Tests: the menu → play → quit → play cycle leaves no leftover state

## Phase T: AI rivals (owner, 2026-11-17)
See DESIGN §8 "Rivals".
- [ ] **T1** `rivals.js` (core, pure): 5 invented rivals, each with a skill; per-hole score generated from skill, hole par and hole `difficulty` (1–5), seeded by the round seed (same seed = same scores)
- [ ] **T2** Difficulty Easy / Normal / Hard shifts the rivals' skill
- [ ] **T3** Leaderboard after each hole (position, name, thru, to par) + final standings with the player's place
- [ ] **T4** Tests: same seed = same rival scores, Hard rivals average lower than Easy over many rounds, ties sorted consistently

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
