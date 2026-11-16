# Prototype Task Checklist

> **For agents:** Work only on the task IDs you were given. A task is done when its acceptance criteria pass **and** it has tests (for anything in `src/core/`). Tick `[x]` in the same PR and add a short note.
>
> `[ ]` todo · `[~]` in progress · `[x]` done · 🅿️ = owner/PM task

## Roadmap at a glance
| # | Phase | Status | Branch |
|---|---|---|---|
| 0 | Foundation and engine refactor | in review | `dev/F-engine-refactor` |
| A | Review gate A (after Phase 0) | todo | `review/A-<role>` |
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

## Phase 5: Rain
- [ ] **W1** `weather` field on holes. A hole set can also override it (same holes, rainy day)
- [ ] **W2** `getEffectiveSurface()` applies the wetness rules from DESIGN §7. It's the only place weather touches physics
- [ ] **W3** Rain visuals: particles, darker sky and light, wet ground tint, HUD weather icon
- [ ] **W4** Tests: wetness 0 matches today, wetness 1 rolls 30–50% less, wet greens are slower
- [ ] **W5** "Rainy Day" hole set (holes 1 and 2 with wetness 1)

## Phase 6: Multi-hole rounds and scoring
- [ ] **R1** `round.js`: start a round from a hole set, current hole, advance, finish
- [ ] **R2** Scorecard model (strokes, par, result per hole, total vs par, picked-up flag)
- [ ] **R3** Hole loading/unloading in the game layer (scene, terrain, texture, flag) with no leftovers
- [ ] **R4** Between-hole summary card + final scorecard screen
- [ ] **R5** Tests: a 2-hole simulated round gives correct totals, a picked-up hole is counted correctly, restart resets everything

## Phase 7: Menus
- [ ] **M1** Main menu (Play, How to Play, Settings)
- [ ] **M2** Hole set select built from `sets.js` (no hardcoded list). Replaces the F8 `?hole=` switcher, but keep `?hole=` as a dev shortcut
- [ ] **M3** Pause menu (Esc / button): Resume, Restart Hole, Quit to Menu
- [ ] **M4** Settings: debug overlay, putt grid, saved in localStorage (try/catch)
- [ ] **M5** Works on mobile (touch-sized buttons, portrait and landscape). Known (QA B7): in phone landscape (844x390) the intro card is taller than the screen and cuts off the title and Tee off button. Cards must fit or scroll; also X7 (debug overlay vs HUD)
- [ ] **M6** Tests: the menu → play → quit → play cycle leaves no leftover state

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
- [ ] **QA1** Maintainability review
- [ ] **QA2** Testing review
- [ ] **QA3** Compatibility review (frame rates, browsers, mobile, `file://` vs server)
- [ ] **QA4** 🅿️ The owner marks findings APPROVED or SKIP → the dev fixes them on `dev/QA-fixes`

**Gate B: after Phase 7** (full set)
- [ ] **QB1** Security · **QB2** Scalability · **QB3** Maintainability · **QB4** Compatibility · **QB5** Testing
- [ ] **QB6** 🅿️ Owner approval → dev fix pass
- [ ] **QB7** Tech Lead final review ("could this be better?") → PM turns its proposals into new tasks
