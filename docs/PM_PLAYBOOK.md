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
**Done:** Phase 0, Feel passes 1–3, Gate A + Fix passes 1–2, Phase K, Phase 6 (rounds), Phase 7 menus (#40). PM role moved to Claude Code (#41, 2026-11-17). On 2026-11-18/19 (first Claude Code PM session):
- **Phase T: AI rivals** (#44, QA #46). Owner's PM rules (#45).
- **Genre study** (#48, `docs/GENRE_NOTES.md`), **C0 plan** (#49), **Mountain 9 prototype** (#50 + rework after playtest 1, hole 5 island #55; QA #51, #54). Owner exception: all 9 holes in one PR.
- **S21 tee aim straight ahead + S22 power bar** (4 sections, landing marker, no ⚑ on full shots) (#53, QA #57). **X12 lazy hole loading + S23 water/OB warning** (#59, QA #60). **S14 2-click putting** (#61, QA #62).
- **Phase V: camera** (#63, QA #64): main's aiming camera (`CAM_AIM_HEIGHT` 1, owner pick), 🔍 Landing / 👁 Read buttons, flight-camera variety with a 1.2 s hold after the hit, side camera clear of trees, a slow smooth flyover (high start behind the tee, 1.4 s orbit at the hole, no pause), and a **small floating down-pointing landing marker** (owner pick).
- **X14 smooth aiming** (#65, QA #66): the K4 "at ⚑ power" warning on full shots was the stutter; dropped. Shift = fine aim.
- Docs: Phase U/V plans (#52, #56), 2-click putting decision (#58), this handoff.

**In flight:** nothing. Main is clean.

**Next (in order):**
1. **Phase BC: ball control** (owner chose it, 2026-11-19). The design is decided: **TASKS → Phase BC (BC0)**. Impact point on a ball icon; Shift + arrows on PC; left/right = start out then curve back (right-handed default, handedness switch); bottom/top = higher+less roll+more wind / lower+more roll+less wind; spin undecided (separate control if ever). Dev prompt below.
2. **Art style decision + Phase U: UI pass** for phones and desktop (scope U0 with the owner first; he'll bring screenshots of looks, HUDs and menus he likes).
3. **Gate B:** all 5 reviewers in parallel → owner marks APPROVED/SKIP (PM triages first) → dev fix pass → tech lead → PM turns proposals into tasks.
4. **Real courses** (a genre talk per theme first) and **Phase 5: rain** (rules in DESIGN §7).

**Lessons from the 2026-11-18/19 session (keep doing this):**
- **Fresh agent per task.** Don't keep resuming one dev for many tweaks: its history grows (one reached ~440k tokens) and every resume reloads it, which is slow and burns the 5-hour usage limit. My prompts stand alone; small follow-ups can go to a fresh dev too.
- **Pin owner links to the full commit SHA** (`https://raw.githack.com/ipb0mb3r/golfgame/<sha>/index.html?...`). Branch links are cached by raw.githack and showed old versions several times.
- **Show the owner images before asking him to play:** before/after minimaps, side-by-side screenshots of options. He decides faster from pictures.
- **Never run `tools/menu-check.mjs` in parallel with browser checks** (it starves the headless page; one QA run lost its putting tests that way). Run it alone, before or after.
- **When something is "undone", check the result against the version the owner liked** (hole 5's revert only undid the last change).
- **Docs PRs: push everything before the owner merges.** Commits pushed to a docs branch after its merge are lost (the first Phase BC notes were). Check `git log origin/main` after each docs merge.
- QA tends to overrun its budget: give a short MUST list, a hard stop, and run the slow menu-check yourself.
- If the usage limit hits, the agent's work is saved in its worktree; resume it after the reset (or schedule a reminder).

**Open owner decisions / backlog to remember:**
- **S20:** `CUP_CAPTURE_SPEED` (today 3.2). Compare `?scenario=h1-green&tune=CUP_CAPTURE_SPEED:2.4` / `2.8`.
- **CHIP_FLAG_SHORT** default 1.5 m (0 / 1.5 / 3 to compare).
- A word after a putt (none since S14; QA felt it quiet): owner's call if he wants one.
- **X13** (mountain scene build time), **X15** (obstacle grid), **X16** (quick touch tap may not nudge the aim; owner to try on the phone): TASKS "Backlog after the playtest 1 pass".
- **G4:** putt grid H-key toggle, unpainted grid (half done in Phase 7). Debug overlay small issues (low); the 320x568 debug overlay covers the minimap (low).
- From Phase 7 QA (low): `window.__golf` throws while the menu shows; "Menu" on a Practice result should go back to the Practice list; quitting from a seeded link keeps `?seed=`.
- From Phase T (low): 320 px "Next hole" wraps; 320 px scorecard personal-best line under the sticky buttons; rival lines during the round and best per difficulty (owner: not now).
- Engine wishlist D2–D7 (TASKS; D1 dropped, D3 done as V4, D4 → BC1). Drag aiming on touch → Phase U.
- **Before the real courses:** a genre talk per course theme. Real courses get more sloped and sometimes larger greens (GENRE_NOTES). Tree rules depend on the biome (forest/mountain: lots of trees).
- **Later:** save a round in progress; more settings (seaside, desert, tropical); the Three.js upgrade (X6); "stay on Three.js?" at Gate B (DESIGN §11).

### Phase BC prompt (ready: send to a fresh `dev`)
```
Assignment: "Phase BC: Ball control". Branch: dev/BC-ball-control, from main. Task IDs: BC1, BC2, BC4, BC5 (not BC3: spin is undecided).
Read docs/TASKS.md → Phase BC (the BC0 design is decided by the owner: follow it exactly) and DESIGN (swing, flight, wind, S21/S22 aim marker, K4/S23 warnings, S14 putting) first.
Context: the player picks where the club hits the ball on a small ball icon (bottom right; tap/drag on phones, Shift + arrows on PC; resets to the centre each shot; hidden on putts).
Left/right: the ball starts out to that side, then curves back the other way (right-handed default; keep a handedness switch). Bottom/top: higher flight, less roll, more wind / lower flight, more roll, less wind. The lie limits the effect.
Rules: a centre hit is exactly today's shot (v1 and v2 unchanged for every existing shot); new shaped shots get new v2 shots (rule 8) and, if any v1 shot moves, rule 9. The aim line and marker show the shaped flight; never a blind shot (test on every hole). Physics in core (pure, tested), Three.js only in src/game, tunables in config.js and ?tune=.
First: propose the per-club amounts (curve, launch offset, height, roll, wind factor) and the ball-icon UI in the PR's first comment with a screenshot, and wait for the PM before building past BC1+BC2 core.
PR: "Phase BC: Ball control". Owner links pinned to the full commit SHA. Phone screenshots of the ball icon and a shaped aim line. Run tools/menu-check.mjs alone.
Budget: check in after ~90 min. QA will be Full.
```
