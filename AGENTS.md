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
| QA / playtester | Independent agent, after each dev PR | No. Plays the PR build in a headless browser and writes a report in `reviews/` |
| Reviewers (Security, Scalability, Maintainability, Compatibility, Testing) | Independent agents | No. They write reports in `reviews/` |
| Tech lead | Independent agent, runs last | No. Writes a report in `reviews/` |

## Tech stack
- **Language:** plain JavaScript (ES modules). **No build step, no bundler, no framework.**
- **3D:** Three.js 0.160.0, loaded from unpkg through an import map in the HTML.
- **Hosting:** GitHub Pages serves the `main` branch root → https://ipb0mb3r.github.io/golfgame/
- **Tests:** Node's built-in test runner (`node --test`). No npm install is needed. *(Set up in task F2.)*
- **Units:** meters and seconds internally. Yards are only for display (`M2Y = 1.09361`).
- **Axes:** x = right, y = up, z = toward the tee (holes play toward −z).

## Commands
| What | Command |
|---|---|
| Run locally | `python3 -m http.server 8000`, then open http://localhost:8000 (ES modules don't load from `file://`) |
| Run tests | `node --test tests/` *(available once F2 is done)* |

## Current state (Nov 2026)
- `index.html`: Hole 1, a flat par 3. The whole engine is inside this one file.
- `hole2.html`: Hole 2, a hilly par 5 with slope physics. It's **a copy of the engine with changes**.
- No tests yet. **Phase 0 in docs/TASKS.md fixes this.**

## Branch and PR rules
- `main` must always be playable, because GitHub Pages serves it. **Nobody pushes directly to `main`.**
- Branch names:
  - `dev/<task-ids>-<slug>` for the dev agent (e.g. `dev/F-engine-refactor`, `dev/W1-W4-rain`)
  - `docs/<slug>` for the PM
  - `review/<gate>-<role>` for reviewers (reports only)
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
