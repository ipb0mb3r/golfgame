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
| QA / playtester | Independent agent, after each dev PR | No. Plays the PR build in a headless browser and writes a report in `reviews/` |
| Reviewers (Security, Scalability, Maintainability, Compatibility, Testing) | Independent agents | No. They write reports in `reviews/` |
| Tech lead | Independent agent, runs last | No. Writes a report in `reviews/` |

## Tech stack
- **Language:** plain JavaScript (ES modules). **No build step, no bundler, no framework.**
- **3D:** Three.js 0.160.0, committed in the repo at `vendor/three-0.160.0/three.module.js` and loaded through the import map in `index.html` (no CDN, works offline). Never edit that file; an upgrade swaps the folder (X6).
- **Hosting:** GitHub Pages serves the `main` branch root → https://ipb0mb3r.github.io/golfgame/
- **Tests:** Node's built-in test runner (`node --test`, Node 20+). No npm install is needed. Test files are `tests/*.test.js`.
- **Units:** meters and seconds internally. Yards are only for display (`M2Y = 1.09361`).
- **Axes:** x = right, y = up, z = toward the tee (holes play toward −z).

## Commands
| What | Command |
|---|---|
| Run locally | `python3 -m http.server 8000`, then open http://localhost:8000 (hole 1), http://localhost:8000/?hole=pl-02 (one hole) or http://localhost:8000/?set=test9 (a round, Phase 6) (ES modules don't load from `file://`) |
| Run tests | `node --test` (from the repo root; finds every `tests/*.test.js`) |
| Check the old-pages baseline in a browser | `node tools/baseline.mjs check` (dev/QA only, needs Playwright, see Tools) |
| Re-record baseline v2 | `node tools/record-baseline-v2.mjs` (only for an intentional feel change, see coding rule 8; `--dry` shows what would move) |
| Check hole load/unload | `node tools/session-check.mjs` (dev/QA only, needs Playwright) |

## Current state (Nov 2026)
- One engine (Phase 0 done): `index.html` loads `src/game/main.js`, which plays the hole named by `?hole=pl-01` (default) or `?hole=pl-02`. Since Gate A Fix pass 1, `main.js` is the long-lived app and each hole is a disposable session (`src/game/session.js`); the hole flow (what happens after each shot) is decided in core (`play.swing` / `play.next` / `play.proceed`).
- Rules in `src/core/` (pure, tested), holes as data in `src/holes/`, Three.js and the page in `src/game/`.
- `hole2.html` only forwards old links to `index.html?hole=pl-02`.
- Since Fix pass 2: the meter reads the real click time (`pressMeterAt`), rolls always end (`stopped.reason`), ⏩ Skip (`play.skip()`), default aim (`play.target`, hole `aimTarget`), designer tuning S17. v1 exceptions for intentional physics changes live in `tests/baseline-exceptions.js`.
- Since Phase 6: `?set=<id>` plays a round (`src/core/round.js` + `src/game/roundUi.js`): a course is a playlist of hole ids of **any length**, never assume 9. Test sets `prototype3`, `test9`.
- Tests: `node --test`. Baselines: `tests/fixtures/baseline.json` (vs the old pages) and `baseline-v2.json` (vs the engine itself).

## Tools (dev and QA only, never part of the game)
- **`tools/baseline.mjs`** plays scripted shots in a headless Chromium through `window.__golf.testHit` and compares where each ball stops. `record` captured `tests/fixtures/baseline.json` from the pre-refactor pages (F0); `check` replays those shots against today's `index.html` and prints a table (`--fps 30|60|144`, `--pages old|new`). The page clock is replaced by a fixed frame time, so results don't depend on machine speed.
- **Install Playwright** (once, outside the repo or with `--no-save`): `npm install --no-save playwright && npx playwright install chromium`. Three.js is already in the repo, so nothing else is needed (the cloud containers have Playwright and Chromium pre-installed).
- **The QA agent uses it** to check a PR build in a real browser. The game and `node --test` never need Playwright; keep it out of `package.json` dependencies and out of `src/`.
- **`tools/record-baseline-v2.mjs`** (plain Node) writes `tests/fixtures/baseline-v2.json` from the current engine. See coding rule 8. It first prints a table of every shot that moved, is new or was removed (paste it in the PR); `--dry` only prints, and nothing is written when nothing changed.
- **`tools/session-check.mjs`** (Playwright) loads and unloads holes 10 times in place and fails if `renderer.info.memory` grows, input is bound twice or a timer from the old hole fires. Run it after any change to `src/game/`.

## Branch and PR rules
- `main` must always be playable, because GitHub Pages serves it. **Nobody pushes directly to `main`.**
- **Branches are short-lived.** One branch per task group, deleted automatically when its PR is merged. There are no long-lived branches except `main` (no permanent `dev` or `docs` branch). The PM keeps **at most one** open docs PR at a time, so docs PRs never conflict with each other.
- Branch names:
  - `dev/<task-ids>-<slug>` for the dev agent (e.g. `dev/F-engine-refactor`, `dev/W1-W4-rain`)
  - `docs/<slug>` for the PM
  - `course/<hole-id>` for the course designer (one hole per PR)
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

