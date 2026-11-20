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
| `tech-lead` | No (report only) | inherit | gate B, last, after the fix pass; also one-off consults (e.g. the art feasibility report, 2026-11-19) |
| `course-designer` | Hole data only (`course/*` branches) | inherit | one hole per session, **co-designs with Alexis** (he talks to it directly) |
| `artist` | No game code: `docs/ART_STYLE.md`, `docs/art/`, `assets/` (`art/*` branches) | inherit | art style, palettes, **modular biome kits**; co-designs with Alexis (added 2026-11-19) |
| `ui-designer` | No game code: `docs/UI.md`, `docs/ui/` specs + clickable mock-ups (`ui/*` branches) | inherit | menus and HUD, function **and** look; co-designs with Alexis; **never writes game code, the dev builds it** (owner decision A, 2026-11-19) |

Prompts and budgets: `docs/AGENT_PROMPTS.md`. The agent files point there, so update the prompts in one place.

**Requests between agents.** Subagents can't launch each other. The artist and UI designer list what they need under "Requests for …" in their PR (art from the artist, building from the dev, checks from QA). The PM reads those, turns them into task IDs, tells the owner in one line, and launches the agent. Assets flow artist → UI designer through `assets/` + a request line, never by editing each other's files.

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
- **Phase BC: ball control** (#68, QA #69; 2026-11-19, second Claude Code PM session). Built by 4 fresh devs: core (BC1–2) → aim line + icon (BC4–5) → flight camera on the shaped landing → owner tune. Owner picks: `BC_BACK` 1 (option A, lands on the aim line), high/low as proposed ("perfect"), **curve +15%** (`start` Driver 11.5 … SW 4.6; full left Driver 10.7 m off the line). Shift + arrows = impact dot, fine aim = Shift + A / D, double tap = centre. QA Full passed with no bugs; the Light re-check of the +15% was partial (script trouble), covered by the BC4 every-hole test.

**Also done 2026-11-19:**
- **FL1 flagpole** (#72, QA #74): the pole is an obstacle, a hit drops almost dead (`FLAG_REST` 0.15 kept: owner wanted "drops dead"), normal cup rules decide a drop-in, putts ignore it, the aim line / warnings ignore it, the flag shows on putts except within `FLAG_PUTT_HIDE` 3 m, "Off the pin!" + wobble, practice spots `h1-pin-chip` / `h1-pin-approach`. Backlog X17 (chip spot text), X18 (320 px flash).
- **Tech lead art feasibility** (#70) + follow-up (`reviews/art-tech-lead-followup.md`, #71). **Art decided:** 3D cartoony, flat colours with stylised texture, light, low-poly; chibi 3D golfers later; pixel / PS1 effect = a setting; mid-range phone target. Phase A (AP0–AP10) in TASKS.
- **New agents** `artist` + `ui-designer` (#70/#71). Owner decision A: the ui-designer never writes game code.
- **Biome sets** (DESIGN §8b, #71) + artist round 1 (#73, ART0a): a biome set = a pick list from a shared library, applied per hole; time of day = its own biome set (alpine vs alpine sunset); tint-only backdrops; big props by hand, small props by rule. First biomes: Meadow, Alpine, Island coast (internal names).

**Also done 2026-11-19 (evening):** **AP0** perf budget + measuring (#75, QA #76), **AP1** fewer draw calls 83–222 → 20–25 (#77, QA #79), **AP1b + X20** terrain detail by distance (every hole within budget, terrain 54k–189k) + a 2× faster mountain `heightAt`, bit-identical (#80, QA #82). **Art:** ART0a biome concept (#73), ART0b style "Sunny postcard" (#78, in the owner's own artist session), accent colours (#81). Owner phone (S25 Ultra): 60 fps; mountain aiming "a bit less smooth" before #80.

**Also done 2026-11-19/20:** **AP2** Three.js r160 → r187 + glTF / Meshopt loaders, pixel-identical (#84, QA #85); PM docs #83.

**Also done 2026-11-20:** **AP5 biome set format** (#86, QA #87): every colour and piece comes from the hole's biome set (`src/biomes/`, `validateBiomeSet` with the artist's readability rules incl. per-stripe and putting-grid), `mtn-default` + `proto-default` (named waivers until ART1), `meadow-day` proof via `?biome=`; the pl-02/03 flag is now red. The artist confirmed meadow-day and its engine keys.

**Also done 2026-11-20:** **X26 + X25** minimap in the biome's colours (trees and rocks darkened one fixed step, minimap readability rules; HUD colours from `UI_COLORS`) (#89, QA #92). **ART1 Meadow** (#90), **Alpine** (#91), **Island coast** (#93, open): the three first biome sets, approved by the owner in his artist session. The artist may register a new set in `src/biomes/index.js`.

**Also done 2026-11-20:** **AP6a** gradient sky, horn peaks, ocean, haze hills (#99, QA #100), with dev-only looks `test-alpine-look` / `test-island-look` / `test-meadow-look`; QA: "Alpine clearly reads as a different place". Island dark-lava boulders (#98).

**In flight:**
- **AP6b polish** (#101: cloud depth, smooth haze hills, sea on the minimap, ridge trim), QA Light running.
- **Next:** the artist switches alpine-day / island-day / meadow-day to the new pieces (data only), with the owner in his artist session. Then the owner sees the real biomes. Then AP7 (models) from the "Art requests from ART1" list.
- Owner phone check pending: the minimap tree shade (one more darkening step = `MINIMAP_DARKEN`).

**Next (owner order, 2026-11-19: A → B → C):**
1. ~~A: finish performance~~ ✅ (#80).
2. **B: ready for the art:** ~~AP2~~ ✅ → ~~AP5~~ ✅ (biome sets; flag = `accent`) → ~~X26~~ ✅ → ~~AP3~~ ✅ → ~~AP6a~~ ✅ → **AP6b** polish → artist picks the new pieces → AP7 (models; artist's gradient slots + per-pick slot override) → AP6 (ground material). In parallel, the **artist per-biome pass ART1** (✅ Meadow, Alpine, Island coast) (ART_STYLE §6.2: mood board → library check → proposals → owner approves → build), Meadow first. **AP8 pixel effect after the art exists.**
3. **C: Phase MP main menu pass** (`ui-designer` designs with the owner → dev builds), then Phase U for the HUD (X18, X19).
4. **Gate B:** all 5 reviewers in parallel → owner marks APPROVED/SKIP (PM triages first) → dev fix pass → tech lead → PM turns proposals into tasks.
5. **Real courses** (a genre talk per theme first, dressed with biome sets) and **Phase 5: rain** (DESIGN §7; then a weather option in MP).
6. Small, whenever: X17 (pin chip spot text).

**Lessons from the 2026-11-18/19 session (keep doing this):**
- **Fresh agent per task.** Don't keep resuming one dev for many tweaks: its history grows (one reached ~440k tokens) and every resume reloads it, which is slow and burns the 5-hour usage limit. My prompts stand alone; small follow-ups can go to a fresh dev too.
- **Pin owner links to the full commit SHA** (`https://raw.githack.com/ipb0mb3r/golfgame/<sha>/index.html?...`). Branch links are cached by raw.githack and showed old versions several times.
- **Show the owner images before asking him to play:** before/after minimaps, side-by-side screenshots of options. He decides faster from pictures.
- **Never run `tools/menu-check.mjs` in parallel with browser checks** (it starves the headless page; one QA run lost its putting tests that way). Run it alone, before or after.
- **When something is "undone", check the result against the version the owner liked** (hole 5's revert only undid the last change).
- **Docs PRs: push everything before the owner merges.** Commits pushed to a docs branch after its merge are lost (the first Phase BC notes were). Check `git log origin/main` after each docs merge.
- QA tends to overrun its budget: give a short MUST list, a hard stop, and run the slow menu-check yourself.
- **Container restarts and usage limits stop agents mid-task:** tell devs and QA to commit and push early and often. Uncommitted work usually survives in the agent's worktree: resume the same agent with SendMessage. If the usage limit hits, the agent's work is saved in its worktree; resume it after the reset (or schedule a reminder).
- **Feel choices go to the owner as compare links**, never as code changes first: `?tune=` links for each option (e.g. curve today / +20% / +35%). He picked +15%, between the links, which then cost one 5-minute dev.
- **Give every agent `isolation: worktree`, including read-only ones.** The tech lead ran in the PM's folder, switched its branch, and the PM's docs commit landed on the report branch (#70 carried both; fixing it would have needed a force push).
- **The owner can chat with an agent directly** in its own session: `create_session` with `append_system_prompt` = a role override ("you are NOT the PM, you are the artist…") and a standalone first prompt. Its output comes back as a PR.
- Agent worktrees live in `.claude/worktrees/` (excluded locally in `.git/info/exclude`, never committed).

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

### Prompts that worked
The Phase BC dev prompts (core first with a stop for PM review, then a fresh dev for the UI, then small fresh devs for fixes and tuning) are on PR #68 and in this file's git history. Reuse that shape for new systems: **build the core, stop, PM answers, then the rest.**
