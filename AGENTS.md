# AGENTS.md: start here

You are working on **Pocket Links**, a browser-based 3-click arcade golf game (in the style of Hot Shots Golf / Mario Golf), built with Three.js.

## Read before you work
1. `docs/DESIGN.md`: how the game must behave, plus the target architecture. **This is the source of truth.**
2. `docs/TASKS.md`: the task list with IDs. Work only on the task IDs you were given.
3. `docs/AGENT_PROMPTS.md`: the roles and workflow. Check which role you are.

## Team roles
| Role | Who | Writes code? |
|---|---|---|
| Owner / Game designer | Alexis | No. Owns the game vision and feel, playtests before each merge, approves every merge to `main` |
| Project manager | Claude (PM thread) | No. Maintains `docs/`, plans tasks, writes prompts, reviews PRs against the plan |
| Engine developer | Dev agent | Yes. Works on `dev/*` branches |
| Course designer | Agent, one hole at a time, co-designs with the owner | Hole data only (`src/holes/`, scenarios, sets), never engine code. Works on `course/<hole-id>` branches |
| Artist | Agent, co-designs with the owner | No game code. Art style, palettes, biome kits: `docs/ART_STYLE.md`, `docs/art/`, `assets/` (+ biome-kit data once its format exists). Works on `art/<slug>` branches |
| UI designer | Agent, co-designs with the owner | No game code. Menus and HUD (function and look) as specs and clickable mock-ups: `docs/UI.md`, `docs/ui/`. The dev builds them. Works on `ui/<slug>` branches |
| QA / playtester | Independent agent, after each dev PR | No. Plays the PR build in a headless browser and writes a report in `reviews/` |
| Reviewers (Security, Scalability, Maintainability, Compatibility, Testing) | Independent agents | No. They write reports in `reviews/` |
| Tech lead | Independent agent, runs last | No. Writes a report in `reviews/` |

## Tech stack
- **Language:** plain JavaScript (ES modules). **No build step, no bundler, no framework.**
- **3D:** Three.js 0.187.0 (r187, since AP2), committed in the repo in `vendor/three-0.187.0/` (`three.module.js`, which imports `three.core.js`) and loaded through the import map in `index.html` (no CDN, works offline). **Add-ons** (from the same release, `examples/jsm/` in the npm package) are in `vendor/three-0.187.0/addons/` and imported as `three/addons/...`: `loaders/GLTFLoader.js` (+ `utils/BufferGeometryUtils.js`, `utils/SkeletonUtils.js`) and `libs/meshopt_decoder.module.js`. Nothing in the game imports them yet (AP3 / AP7). Never edit these files: an upgrade swaps the folder (steps in its README), and `tests/vendor.test.js` checks every file's sha256. The frame clock is `THREE.Timer` (Clock is deprecated since r183).
- **Hosting:** GitHub Pages serves the `main` branch root → https://ipb0mb3r.github.io/golfgame/
- **Tests:** Node's built-in test runner (`node --test`, Node 20+). No npm install is needed. Test files are `tests/*.test.js`.
- **Units:** meters and seconds internally. Yards are only for display (`M2Y = 1.09361`).
- **Axes:** x = right, y = up, z = toward the tee (holes play toward −z).

## Commands
| What | Command |
|---|---|
| Run locally | `python3 -m http.server 8000`, then open http://localhost:8000 (the main menu, Phase 7), http://localhost:8000/?hole=pl-02 (one hole) or http://localhost:8000/?set=test9 (a round, Phase 6) (ES modules don't load from `file://`) |
| Run tests | `node --test` (from the repo root; finds every `tests/*.test.js`) |
| Check the old-pages baseline in a browser | `node tools/baseline.mjs check` (dev/QA only, needs Playwright, see Tools) |
| Re-record baseline v2 | `node tools/record-baseline-v2.mjs` (only for an intentional feel change, see coding rule 8; `--dry` shows what would move) |
| Check hole load/unload | `node tools/session-check.mjs` (dev/QA only, needs Playwright) |
| Check the menus (every path, pause, quit, play again) | `node tools/menu-check.mjs` (dev/QA only, needs Playwright) |
| Check every hole against the phone budget | `node tools/perf-check.mjs` (reports, exit 0; `--strict` exits 1 over budget; `--hole mtn-07`, `--breakdown`; dev/QA only, needs Playwright) |
| Time one aim step per hole (JS only) | `node tools/aim-cost.mjs` (plain Node; `--hole mtn-09`, repeatable) |

## Current state (Nov 2026)
- One engine (Phase 0 done): `index.html` loads `src/game/main.js`, which plays the hole named by `?hole=pl-01` (default) or `?hole=pl-02`. Since Gate A Fix pass 1, `main.js` is the long-lived app and each hole is a disposable session (`src/game/session.js`); the hole flow (what happens after each shot) is decided in core (`play.swing` / `play.next` / `play.proceed`).
- Rules in `src/core/` (pure, tested), holes as data in `src/holes/`, Three.js and the page in `src/game/`.
- `hole2.html` only forwards old links to `index.html?hole=pl-02`.
- Since Fix pass 2: the meter reads the real click time (`pressMeterAt`), rolls always end (`stopped.reason`), ⏩ Skip (`play.skip()`), default aim (`play.target`, hole `aimTarget`), designer tuning S17. v1 exceptions for intentional physics changes live in `tests/baseline-exceptions.js`.
- Since Phase 6: `?set=<id>` plays a round (`src/core/round.js` + `src/game/roundUi.js`): a course is a playlist of hole ids of **any length**, never assume 9. Test sets `prototype3`, `test9`.
- Since Phase 7: `index.html` opens on the main menu (`src/game/menus.js`, lists from `src/core/menu.js`): Solo (courses from `sets.js`), Practice (holes and test spots), pause menu, settings. Any dev link (`?hole=`, `?scenario=`, `?set=`, `?ai=`, `?seed=`, `?tune=`, `?debug=`) skips the menu.
- Since Phase T: vs AI (`src/core/rivals.js`): a round against 5 AI rivals whose scores are generated from the round seed. `?ai=easy|normal|hard` plays the `?set=` round vs AI (alone: the first Solo course), e.g. `?set=test9&ai=normal`.
- Tests: `node --test`. Baselines: `tests/fixtures/baseline.json` (vs the old pages) and `baseline-v2.json` (vs the engine itself).

## Tools (dev and QA only, never part of the game)
- **`tools/baseline.mjs`** plays scripted shots in a headless Chromium through `window.__golf.testHit` and compares where each ball stops. `record` captured `tests/fixtures/baseline.json` from the pre-refactor pages (F0); `check` replays those shots against today's `index.html` and prints a table (`--fps 30|60|144`, `--pages old|new`). The page clock is replaced by a fixed frame time, so results don't depend on machine speed.
- **Install Playwright** (once, outside the repo or with `--no-save`): `npm install --no-save playwright && npx playwright install chromium`. Three.js is already in the repo, so nothing else is needed (the cloud containers have Playwright and Chromium pre-installed).
- **The QA agent uses it** to check a PR build in a real browser. The game and `node --test` never need Playwright; keep it out of `package.json` dependencies and out of `src/`.
- **`tools/record-baseline-v2.mjs`** (plain Node) writes `tests/fixtures/baseline-v2.json` from the current engine. See coding rule 8. It first prints a table of every shot that moved, is new or was removed (paste it in the PR); `--dry` only prints, and nothing is written when nothing changed.
- **`tools/session-check.mjs`** (Playwright) loads and unloads holes 10 times in place and fails if `renderer.info.memory` grows, input is bound twice or a timer from the old hole fires; then (AP2) it loads the test models `tests/fixtures/models/cube.glb` and `cube-meshopt.glb` through the import map (GLTFLoader, Meshopt decoder), draws them and checks they are freed. Run it after any change to `src/game/`.
- **`tools/make-test-glb.mjs`** (plain Node, AP2) writes those two test models (a 1 m cube made in code; the second has its index buffer Meshopt-compressed by hand).
- **`tools/perf-check.mjs`** (Playwright, AP0) opens every hole fresh at 390x844 and prints a table against `PERF_BUDGET` (`src/core/config.js`, DESIGN §8b "Phone performance budget"): draw calls and triangles in the tee view and the highest frame of the flyover, geometries, textures, estimated graphics memory, and the time until Tee off. It only reports by default (exit 0); `--strict` exits 1 when a hole is over budget. `--breakdown` lists the draw calls by kind of object (`window.__golf.perfBreakdown()`). Headless fps and today's painted course map are printed but not rated. The same numbers are in `window.__golf.perf()` and the debug overlay (green ok / red over).
- **`tools/aim-cost.mjs`** (plain Node, AP1) times the JS work of one aim step from the tee (the tree warning, the aim marks and the landing point, with a fresh aim each step as when ◀/▶ is held), for a centre and an off-centre impact, per hole: mean / p95 / max ms. A phone's CPU is about 2–4× slower. Rendering is not measured.

## Branch and PR rules
- `main` must always be playable, because GitHub Pages serves it. **Nobody pushes directly to `main`.**
- **Branches are short-lived.** One branch per task group, deleted automatically when its PR is merged. There are no long-lived branches except `main` (no permanent `dev` or `docs` branch). The PM keeps **at most one** open docs PR at a time, so docs PRs never conflict with each other.
- Branch names:
  - `dev/<task-ids>-<slug>` for the dev agent (e.g. `dev/F-engine-refactor`, `dev/W1-W4-rain`)
  - `docs/<slug>` for the PM
  - `course/<hole-id>` for the course designer (one hole per PR)
  - `art/<slug>` for the artist, `ui/<slug>` for the UI designer
  - `review/<gate>-<role>` for reviewers, `review/qa-<branch>` for QA (reports only)
- One PR per task group. In the same PR: tick the boxes in `docs/TASKS.md` and update `docs/DESIGN.md` if any behaviour changed.
- The PR description lists the task IDs, what changed, how to test it, and any open questions for the PM or owner.

## Coding rules
1. **`src/core/` must never import Three.js or touch the DOM.** It has to run in Node tests.
2. **No magic numbers in logic.** Tunables go in `src/core/config.js`, clubs in `clubs.js`, surfaces in `surfaces.js`, and hole layout in `src/holes/`.
3. **Deterministic physics:** fixed timestep, and randomness only through the seeded RNG (`src/core/rng.js`).
4. **Adding a hole = adding a file in `src/holes/`.** It must never require copying engine code.
5. Run all tests before and after your change. Don't open a PR with failing tests.
6. Stay within your task. List any unrelated problems you find at the end of the PR instead of fixing them.
7. If the code and `docs/DESIGN.md` disagree, ask in the PR. Don't silently change either one.
8. **Baselines.** `tests/fixtures/baseline.json` (old pages → engine, 0.5 m tolerance) is frozen. **v1 checks physics only** (flight, bounce, roll, slopes): it replays with the old swing mapping (`tee/fairway/green.sweetScale:1,CURVE_SHAPE:1` via the tune system), and **v2 checks swing feel**. `tests/fixtures/baseline-v2.json` is recorded from the engine itself and must replay within **0.01 m**. A PR that intentionally changes the feel re-records v2 (`node tools/record-baseline-v2.mjs`) and explains in the PR description what changed and why. A PR that isn't meant to change the feel must pass v2 untouched.
9. **Changing physics on purpose** (Gate A T4). Physics means flight, bounce, roll, rest, cup or slopes. v1 is frozen and can't be re-recorded, so: (a) say in the PR which v1 shots move and why, (b) add the exception to `tests/baseline.test.js` **per shot, with a comment** naming the task ID and the expected new result, never a wider tolerance for all shots, (c) re-record v2 and explain it, (d) the PM approves the exceptions in the PR review.

