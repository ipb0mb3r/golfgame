# PM playbook: how the project manager works

> **For the main Claude Code session:** you are the **PM**. You plan, write prompts, launch the other agents (subagents in `.claude/agents/`), review their PRs against the plan, and keep `docs/` true. **You never edit game code** (`src/`, `tests/`, `tools/`, `index.html`); see the owner's rules in §3. This file is the PM's memory. It was handed over from the first PM thread (claude.ai, 2026-11-16/17). Update §4 "Current status" every time something merges.

## 1. The owner (Alexis)
- **Owner and game designer.** Approves every merge to `main`. Owns vision and feel.
- **Plays on his phone**, mostly through GitHub Pages: https://ipb0mb3r.github.io/golfgame/ . Always give him **tap-ready links** (GitHub Pages after a merge, raw.githack for a branch: `https://raw.githack.com/ipb0mb3r/golfgame/<branch>/index.html?...`).
- Not a programmer (BI / data background: SQL, DAX). Explain in **plain language**, short, mobile-friendly. Tables are fine. No jargon without a one-line explanation.
- Feel direction: a game that feels fair, **no blind shots, ever**. Holes **"not particularly hard"**: the safe line ≈ par or birdie, the hero line = birdie or better (owner, 2026-11-18, genre study). The earlier "harder is much better" / trees that matter / hard rock bounce taste was for testing the engine. His design doc: "Arcade Golf Course Design Principles" (claude.ai artifact).
- Course workflow: the 9-hole mountain prototype tests the level-design workflow; an art / assets pass comes after it, then the real courses. He gives hole ideas himself and keeps talking with the course designer, who sometimes designs holes alone. HOLE_GUIDELINES lengths stay in metres until the prototype is played.
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
**Owner's PM rules (2026-11-18, always apply):**
1. **The PM never edits game code** (`src/`, `tests/`, `tools/`, `index.html`). All of that goes to the `dev` agent, even a one-line fix.
2. **Before launching any agent, tell the owner in one line:** "Launching <agent> on <task> (budget N min)".
3. **Every agent signs its work.** Each PR description, report and PR comment ends with a signature line: "— Agent: <name>" (`dev`, `qa`, `reviewer-testing`, `course-designer`…). The PM signs "— PM". (On GitHub the signature goes just above the Claude Code footer.) The rule is in the shared header of `docs/AGENT_PROMPTS.md`, so every prompt carries it.

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
**Done:** Phase 0, Feel passes 1–3, Gate A + Fix passes 1–2, Phase K (obstacles, rock, hole 3, polish), Phase 6 (rounds, any-length courses), Phase 7 menus (#40, QA #42). **PM role moved to Claude Code** (#41), 2026-11-17. **Phase T: AI rivals** (#44, QA Full #46: ready, no bugs), 2026-11-18. Owner's PM rules (#45).

**In flight:** **Genre study done:** PR #48 `docs/GENRE_NOTES.md` (course designer session with the owner, 2026-11-18). This PR aligns HOLE_GUIDELINES and TASKS Phase C with it.

**Next (in order):**
1. **Phase C: mountain course, prototype test run.** After #48 and this PR merge: the `course-designer` designs **all 9 new holes** (owner plays and comments on each), starting with the **C0 course plan** (designer proposes, owner approves, PM checks). It's a test run for the engine and the designer, not final content.
2. **Gate B:** all 5 reviewers in parallel → owner marks APPROVED/SKIP (PM triages first) → dev fix pass → tech lead → PM turns proposals into tasks.
3. **Phase 5: rain** (rules already in DESIGN §7).

**Open owner decisions / backlog to remember:**
- **S20:** `CUP_CAPTURE_SPEED` (today 3.2). The owner compares `?scenario=h1-green&tune=CUP_CAPTURE_SPEED:2.4` / `2.8`.
- **CHIP_FLAG_SHORT** default 1.5 m. The owner can compare 0 / 1.5 / 3.
- **S14:** should putting become 2 clicks? Decide at the next swing design pass.
- **G4:** putt grid H-key toggle, unpainted grid (half done in Phase 7).
- Debug overlay small issues (low).
- From Phase 7 QA (low): `window.__golf` throws while the menu shows (test tools); "Menu" on a Practice result should go back to the Practice list; quitting from a seeded link keeps `?seed=` so the next round reuses it.
- From Phase T (low): 320 px "Next hole" button wraps (on main before T); 320 px scorecard personal-best line sits under the sticky buttons until you scroll; rival flavour lines during the round (owner: not now); best per difficulty (owner: not now).
- Engine wishlist D2–D7 (TASKS, from the genre study; D1 tee sets dropped): owner orders it later.
- **Before the real courses:** a genre talk per course theme (owner, 2026-11-18), after the prototype and the art pass.
- **Later:** save a round in progress; **art style decision** before real courses; more settings (seaside, desert, tropical); the Three.js upgrade (X6); deciding "stay on Three.js?" at Gate B (DESIGN §11).
