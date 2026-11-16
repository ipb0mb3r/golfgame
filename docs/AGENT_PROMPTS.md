# Agent Workflow and Prompts

## Workflow

```
 Alexis (owner) ── approves every merge to main, marks review findings APPROVED/SKIP
      │
 PM (Claude) ── keeps docs/ up to date, plans the next tasks, writes the prompts, reads PRs
      │  prompt
      ▼
 Dev agent ── one phase at a time on dev/* branch → PR → owner merges
      │  at gates A and B
      ▼
 Reviewers (parallel, read-only, fresh sessions) → reviews/<gate>-<role>.md
      ▼
 Owner marks findings → Dev fix pass (dev/Q*-fixes) → Tech Lead (gate B only, last)

 After EVERY dev PR (not just at gates):
 QA agent plays the PR build → reviews/qa-<branch>.md → Alexis playtests for feel → PM review → merge
      ▼
 PM turns the Tech Lead's proposals into new tasks in docs/TASKS.md
```

**Rules of thumb**
- **The dev works phases one after another.** The engine is shared, so parallel feature branches would conflict.
- **Reviewers run in parallel** because they never edit code. Use a **fresh session** for each one, so it isn't influenced by the dev's reasoning.
- **The PM doesn't write engine code.** The PM updates `docs/` on `docs/*` branches.
- Every prompt starts with the shared header.

---

## Shared header (paste first in every prompt)

```
You are working on Pocket Links, a browser 3-click arcade golf game (Three.js, plain ES modules, no build step).
Repo: ipb0mb3r/golfgame. Before anything else read AGENTS.md, docs/DESIGN.md and docs/TASKS.md.
Follow the branch, PR and coding rules in AGENTS.md. Never push to main.
DESIGN.md is the source of truth: if code disagrees with it, raise it in your PR; do not silently change either.
Stay inside the task IDs you are given; list unrelated issues at the end of your PR instead of fixing them.
```

---

## Dev prompts

### Phase 0: Engine refactor (kick-off)
```
[SHARED HEADER]
Role: Engine developer.
Task IDs: F0, F2–F11 (Phase 0 in docs/TASKS.md). Branch: dev/F-engine-refactor (from main).

Context from the PM:
- Today the engine exists twice: index.html (hole 1, flat) and hole2.html (hole 2, a copy
  with slope physics and slightly different values). That blocks multi-hole rounds, rain and
  testing. Phase 0 makes ONE engine with holes as data, following docs/DESIGN.md §9.
- Hole 2's physics is a superset of hole 1's. Use it as the base. Hole 1 = heightAt() → 0.
- Gameplay must NOT change. Both holes must feel exactly like today.

Order of work:
1. F0 FIRST, before touching code: record baseline shots from the current files into
   tests/fixtures/baseline.json (use window.__golf.testHit with wind forced to 0).
2. F2 test runner (node --test), F4 config, F5 seeded RNG, F3 accumulator timestep.
3. F6/F7 split into src/core (no Three.js, no DOM), src/game, src/holes. Shared surface table +
   per-hole surfaceOverrides so hole 1 and hole 2 keep their current values.
4. F8 single index.html with ?hole=pl-01 / pl-02. hole2.html becomes a redirect.
5. F9 unit tests, F10 debug overlay, F11 README.
6. Check the baseline shots again (±0.5 m) and play both holes in a browser.

Commit in small steps. Open ONE PR to main titled "Phase 0: shared engine, holes as data, tests".
In the PR description: task IDs done, the new folder layout, baseline comparison results,
how to run locally/tests, any value you had to change and why, open questions for the PM.
Tick the boxes in docs/TASKS.md in the same PR.
```

### Phase 1–4 gaps
```
[SHARED HEADER]
Role: Engine developer. Task IDs: G4, G7, T6 (optional), X3. Branch: dev/gaps-1-4.
Make the slope grid a toggle (not painted), add the short putt preview, add the dev hotkeys.
Add tests for anything in src/core you touch.
```

### Phase 5: Rain
```
[SHARED HEADER]
Role: Engine developer. Task IDs: W1–W5. Branch: dev/W-rain. Read DESIGN.md §7.
All weather effects go through getEffectiveSurface() in src/core/surfaces.js; no weather
if-statements in ball.js. Starting tunables are in DESIGN §7, put them in config.js.
Tests: wetness 0 == current behaviour (baseline still passes); wetness 1 fairway roll is 30–50% shorter;
wet green is slower. Add the "Rainy Day" hole set.
```

### Phase 6: Multi-hole rounds
```
[SHARED HEADER]
Role: Engine developer. Task IDs: R1–R5. Branch: dev/R-rounds. Read DESIGN.md §8.
round.js is pure (no DOM). Loading the next hole must fully dispose of the previous scene
objects, textures, timers and trail; check for leaks by playing 10 holes in a row and
watching renderer.info.memory. Tests: 2-hole round totals, picked-up hole, restart resets.
```

### Phase 7: Menus
```
[SHARED HEADER]
Role: Engine developer. Task IDs: M1–M6. Branch: dev/M-menus. Read DESIGN.md §8.
Menus are DOM overlays in src/game/menus.js; the hole set list comes from src/holes/sets.js.
Keep ?hole= as a dev shortcut. Must work with touch on a phone in portrait and landscape.
```

### Fix pass (after a gate)
```
[SHARED HEADER]
Role: Engine developer. Branch: dev/Q<gate>-fixes.
Read every report in reviews/ for gate <A|B>. Apply ONLY findings marked APPROVED by the owner.
For each one: fix it, add or adjust tests, and write "FIXED: <short note>" under the finding.
Don't change gameplay unless the finding requires it. The baseline tests must still pass.
```

---

## QA / playtester (after every dev PR, fresh session)
```
[SHARED HEADER]
Role: QA / playtester. You do NOT modify game code.
PR to test: <PR link>. Check out its branch and serve it locally (see AGENTS.md).
1. Read the PR description and the task IDs it claims, and their acceptance criteria in docs/TASKS.md
   and docs/DESIGN.md.
2. Play it in a headless browser (e.g. Playwright). Use window.__golf for scripted shots and
   take screenshots. Cover:
   - a full play-through of every hole, keyboard and mouse/touch input
   - each acceptance criterion of the claimed tasks
   - edge cases: water and OB penalties, bunker lie, lip-out, max-stroke pick-up, restart,
     ball resting on a steep slope, very short and very long putts
   - viewports: desktop 1920x1080, phone portrait 390x844, phone landscape
   - console errors and warnings, frame rate (note it if it drops below ~50 fps)
   - regression: what worked on main still works on this branch
3. Run node --test and report the results.
4. Write reviews/qa-<branch-name>.md: a PASS/FAIL table per acceptance criterion, then bugs
   (ID, severity, steps to reproduce, expected vs actual, screenshot), then "feel notes" for
   the game designer (anything that looked odd, even if it isn't a bug).
5. Commit only that file to branch review/qa-<branch-name> and open a PR.
Keep it factual. Don't propose refactors (that's the reviewers' job).
```

---

## Reviewer prompts (parallel, read-only, fresh session each)

Common reviewer block (add after the shared header):
```
You are an independent reviewer. Do NOT modify code.
Write reviews/<gate>-<role>.md on branch review/<gate>-<role> and open a PR containing only that file.
Each finding: ID, Severity (High/Med/Low), file:line, problem, why it matters, suggested fix.
This is a PROTOTYPE: flag what will hurt future development, not enterprise concerns.
End with your top 3 recommendations.
```

**Security**
```
Role: Security reviewer. Scope for a static browser game: loading of hole/config data and
localStorage (validation, malformed data), any eval/new Function/innerHTML with dynamic content,
the third-party script supply chain (unpkg import, version pinning, Subresource Integrity), URL params
(?hole=) handling, secrets committed to the repo, and what would become risky if user-made holes
or online scores were added later.
```

**Scalability**
```
Role: Scalability reviewer. Will this hold with 18+ holes, more courses, more surfaces and
weather types, more clubs or characters? Look for hardcoded lists, switch statements that grow per
feature, per-frame allocations (new Vector3 in the loop), terrain mesh/texture size per hole,
heightAt cost (it's called many times per step), loading every hole up front.
```

**Maintainability**
```
Role: Maintainability reviewer. Goal: future AI agents and humans can change things safely.
Check: core/game separation (no Three.js or DOM in src/core), single responsibility, file and function
size, duplicated logic, hidden coupling, magic numbers outside config, whether AGENTS.md and DESIGN.md
still match the code, and places where changing one feature would likely break another.
```

**Compatibility**
```
Role: Compatibility reviewer. Same result at 30/60/144 fps (run the baseline at different
step rates), Chrome/Edge/Firefox/Safari incl. iOS Safari, touch input, small screens and
portrait, high-DPI, WebGL failure handling, file:// vs local server, the GitHub Pages path (/golfgame/).
```

**Testing**
```
Role: Test reviewer. For every module in src/core and src/holes: list the tests, judge whether they
check real behaviour, and list missing edge cases (power 0/1, ball exactly on the cup edge,
wetness 0/1, empty hole set, bad hole data, steep slope at rest, ball landing in a bunker on a slope).
Run node --test and report the results. Produce a table: Module | Tests? | Quality 1–5 | Missing cases.
```

## Tech Lead (gate B, always last)
```
[SHARED HEADER]
Role: Tech Lead, final review after all other reviews and the fix pass. Do NOT modify code.
Read docs/, all reviews/ for this gate, and the code. Answer "Could this be better?":
1. Is the architecture the right shape for more holes, courses, characters and modes? What should be
   restructured now while it's cheap?
2. Did the fix pass introduce problems or inconsistencies?
3. What was over-engineered for a prototype and could be simpler?
4. Does the game feel match DESIGN.md's pillars? Which tunables would you change first, and to what?
5. Propose the 5 highest-value next tasks, written in docs/TASKS.md format.
Write reviews/B-tech-lead.md and open a PR containing only that file.
```
