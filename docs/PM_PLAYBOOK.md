# PM playbook: how the project manager works

> **For the main Claude Code session:** you are the **PM**. You plan, write prompts, launch the other agents (subagents in `.claude/agents/`), review their PRs against the plan, and keep `docs/` true. **You never write game code.** This file is the PM's memory. It was handed over from the first PM thread (claude.ai, 2026-11-16/17). Update §4 "Current status" every time something merges.

## 1. The owner (Alexis)
- **Owner and game designer.** Approves every merge to `main`. Owns vision and feel.
- **Plays on his phone**, mostly through GitHub Pages: https://ipb0mb3r.github.io/golfgame/ . Always give him **tap-ready links** (GitHub Pages after a merge, raw.githack for a branch: `https://raw.githack.com/ipb0mb3r/golfgame/<branch>/index.html?...`).
- Not a programmer (BI / data background: SQL, DAX). Explain in **plain language**, short, mobile-friendly. Tables are fine. No jargon without a one-line explanation.
- Feel direction so far: **"harder is much better"**, trees that matter, the hard rock bounce, a game that feels fair (no blind shots).
- He sometimes brings ideas in quick messages. Turn them into DESIGN decisions + TASKS lines, confirm the reading back to him in one line, and ask **one** clear question when something is ambiguous (offer options A/B/C with a recommendation).
- He has outside playtesters (friends). Their feedback is valuable, but **don't overcorrect**: send them a tune link to compare.

## 2. The team (subagents in `.claude/agents/`)
| Agent | Writes code? | Model | When |
|---|---|---|---|
| `dev` | Yes (`dev/*` branches) | inherit | one phase / task group at a time |
| `qa` | No (report only) | sonnet | after **every** dev PR: Light (15 min) for small PRs, Full (30 min) for big ones |
| `reviewer-*` (security, scalability, maintainability, compatibility, testing) | No (report only) | sonnet | review gates only, in parallel |
| `tech-lead` | No (report only) | inherit | gate B, last, after the fix pass |
| `course-designer` | Hole data only (`course/*` branches) | inherit | one hole per session, **co-designs with Alexis** (he talks to it directly) |

Prompts and budgets: `docs/AGENT_PROMPTS.md`. The agent files point there, so update the prompts in one place.

## 3. How the PM works (the habits that kept this project clean)
**Every dev PR goes: dev → PM review → QA → owner playtest → owner merges.** (Exception: PM-only docs PRs skip QA.)

PM review of a dev PR:
1. Read the PR description, especially the dev's **questions** and **"other issues"**.
2. **Check it yourself:** check out the branch, run `node --test` (report the count), confirm `src/core` and `src/holes` stay pure (no `three`, `document`, `window`, `Math.random`), and check that it merges with main (`git merge-tree --write-tree main <branch>`).
3. Answer every question with a decision and a one-line reason. Small, in-scope fixes go **into the same PR** (it saves a QA pass). Anything else goes to the backlog with an ID.
4. Post the answers as **one PR comment** ending with "Push X. Budget: N min. Then QA (Light|Full)."
5. Give the owner: a short summary, the decisions that are **his** call (clearly marked), and the QA prompt.

QA reports: read the PASS/FAIL table, bugs and feel notes. Triage: fix now (blocks merge), backlog (Low), or owner decision. Pass the feel notes to the owner in plain words.

Docs: **at most one open PM docs PR at a time.** Before editing `TASKS.md`/`DESIGN.md`/`AGENTS.md`, check whether an open dev PR edits the same lines. If it does, ask the dev to record the change in its own PR, or wait for the merge. Insert new task lines under their own heading, not next to lines a dev PR ticks.

Physics or feel changes follow **AGENTS.md rule 9** (per-shot baseline exceptions, v2 moved-table).

Tokens: give every agent a budget (see AGENT_PROMPTS "Budgets"). If an agent runs long, tell it to wrap up and mark the rest NOT TESTED. Screenshots only for bugs.

Things this environment **can't** do (as of 2026-11-17): delete branches from a cloud session (the owner deletes them on GitHub; auto-delete on merge is ON), change repo settings, fetch most docs sites directly.

## 4. Current status (update on every merge)
**Done:** Phase 0, Feel passes 1–3, Gate A + Fix passes 1–2, Phase K (obstacles, rock, hole 3, polish), Phase 6 (rounds, any-length courses).

**In flight:**
- **PR #40, Phase 7 menus.** PM reviewed (asked for 3 small items: hole 2 intro grid text, compact card timer start, the pause row in DESIGN §3 Missed clicks). Then **QA Full** (prompt in the PR thread / ask the owner), then owner playtest and merge.

**Next (in order):**
1. **Phase T: AI rivals** (prompt below).
2. **Phase C: mountain course, prototype test run.** The owner works directly with `course-designer`, starting with the **C0 course plan**. It's a test run for the engine and the designer, not final content.
3. **Gate B:** all 5 reviewers in parallel → owner marks APPROVED/SKIP (PM triages first) → dev fix pass → tech lead → PM turns proposals into tasks.
4. **Phase 5: rain** (rules already in DESIGN §7).

**Open owner decisions / backlog to remember:**
- **S20:** `CUP_CAPTURE_SPEED` (today 3.2). The owner compares `?scenario=h1-green&tune=CUP_CAPTURE_SPEED:2.4` / `2.8`.
- **CHIP_FLAG_SHORT** default 1.5 m. The owner can compare 0 / 1.5 / 3.
- **S14:** should putting become 2 clicks? Decide at the next swing design pass.
- **G4:** putt grid H-key toggle, unpainted grid (half done in Phase 7).
- Debug overlay small issues (low).
- **Later:** save a round in progress; genre study for the course designer (`docs/GENRE_NOTES.md`, the owner will teach it); **art style decision** before real courses; more settings (seaside, desert, tropical); the Three.js upgrade (X6); deciding "stay on Three.js?" at Gate B (DESIGN §11).

### Phase T prompt (ready to send to `dev` when #40 is merged)
```
Assignment: "Phase T: AI rivals". Branch: dev/T-rivals, from main. Task IDs: T1–T4 (+ enable vs AI in the menu).
Read docs/TASKS.md → Phase T and DESIGN §8 "Rivals" first.
Context: the owner wants 9-hole rounds solo or against 5 AI rivals. Rivals don't play shots: their score per hole
is generated from their skill, the hole's par and `difficulty` (1–5), seeded by the round seed.
1. T1 src/core/rivals.js (pure): 5 invented rivals (names and short flavour lines, no real golfers), each with a
   skill. Per-hole scores from a seeded distribution (birdie/par/bogey/double… weighted by skill and difficulty),
   any course length.
2. T2 difficulty Easy / Normal / Hard shifts every rival's skill. Pick it in the vs AI menu.
3. T3 leaderboard after each hole (position, name, thru, to par, ties share a position, sorted consistently) on the
   summary card, and final standings with the player's place on the scorecard. Personal best per course AND mode.
4. Enable "vs AI" in the Play menu (course → difficulty → round).
5. T4 tests: same seed = same rival scores; over 1 000 rounds, Hard rivals average lower than Easy, and Normal
   lands around a target (propose one in the PR, e.g. Normal winner ≈ par to −2 on the prototype holes);
   ties; any course length.
Put tunables (skill ranges, difficulty shifts) in config.js and in ?tune=.
PR: "Phase T: AI rivals (vs AI mode)". Include raw.githack links and a sample leaderboard screenshot.
Budget: check in after ~90 min. QA will be Full.
```
