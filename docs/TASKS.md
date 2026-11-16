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
- [ ] **M5** Works on mobile (touch-sized buttons, portrait and landscape)
- [ ] **M6** Tests: the menu → play → quit → play cycle leaves no leftover state

## Phase 8: Small polish (only if useful for testing)
- [x] **X1** Camera follows the ball, plus a green view
- [x] **X2** Shot trail
- [ ] **X3** Dev hotkeys: R = reset to tee, T = teleport the ball to the clicked point (debug only)
- [x] **X4** Wind
- [ ] **X5** Shot result line (carry and total distance in yards)

---

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
