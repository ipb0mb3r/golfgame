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

**Also done 2026-11-20/22:** **AP6b** polish (#101, QA #102); the artist's three sets use the new sky and backdrops (#104: Meadow hazeHills, Alpine hornPeaks, Island ocean); **AP7a trees** (#105, QA #106): the leafLow → mid → leafTop gradient, pineTree / spruceTree / palmTree / roundCanopy / birchTree (spruce and palm mid = `leafAlt`); the artist's tree picks (#107); **AP7b parts 2–3** (#110, QA #111): fuller pine and round canopy (no "lollipop"), cheap far trees beyond 35 m outside OB, all three sets under 300k; **palm redesign spec** (#109, the owner's "C + a little B" dome crown, `docs/art/palm/SPEC.md`). Owner: "don't skimp on trees".

**Also done 2026-11-22:** **AP7b part 1 + X34** (#112, QA Light #113, no bugs): the palm from the spec, the palm collider rule, 2-row birch, round-canopy cap, lighter round scenery tree. Artist handoff (#115), PM handoff (#114).

**Third Claude Code PM session (2026-11-22/23), handoff:** everything below is merged unless it says otherwise; no PR is open at the end except this docs PR. Owner picked "A + X33" (small props), then AP6 textured ground, big props and the water surface (X43).
- **Dev: AP7c + X33** (branch `dev/AP7c-X33-small-props`, budget 90 min): the smallProps format (weights, clusters, perHa, `on`), a deterministic scatter (listed surfaces only, clear radii, a prop never hides the ball), instancing, X33 per-pick slot override `{ id, slots: {...} }`, two placeholder pieces (`grassTuft`, `flowerPatch`) in the dev-only set `test-small-props`. The real sets stay untouched. Then PM review → QA Light.
- **Fresh artist session** `session_01Rv6NgBhDn3JiGCnqrtYQhJ` ("Pocket Links: Artist (small props)"): designs the real small props with the owner → `docs/art/small-props/SPEC.md` (PR "Art: small props spec"); optionally the Meadow round scenery trees and palms on Island (handoff open work). After both merge: a small dev job builds the spec's pieces (sonnet), then the artist sets each biome's smallProps.
- **Merged 2026-11-23 (owner):** #116 AP7c + X33 (+ `PROP_DRAW_DIST` tunable), QA #117, artist #118 small props spec (`docs/art/small-props/SPEC.md`: grassTuft, flowerPatch, flowerBush, pebbles, flatStone, reeds), #119 Meadow round scenery trees, #120 Island palms in play. Main: 583 tests pass. Real sets list their trees; their smallProps are still empty.
- **Dev: AP7d** (branch `dev/AP7d-small-props`, sonnet, 90 min): the six pieces, per-pick density, water-edge reeds, `test-small-props` with Meadow's numbers. Draw distance stays 45 m. Then PM review → QA Light → owner → the artist writes the real sets' smallProps (art PR, perf-check ≤ 300k).
- **AP7d (#121) status:** QA Light passed (#123, no bugs); bush flipped to leafLow foot → leafTop crown (artist confirmed; mock-up fix #122). **Owner: props too subtle → picked "C but 2×"** from compare links: `PROP_SCALE` 2, `PROP_DRAW_DIST` 60, `PROP_THIN_FROM` 30, `PROP_FAR_KEEP` 0.5 (`PROP_MAX_TRIS` 10k; ball clearance grows with the scale). Set on #121 (faa094c). **Merged 2026-11-23: #121, #123, #122** (main: 593 tests). Next: the artist writes the real sets' smallProps (told about the 2× size). X39 (view-distance setting) now = Near/Far around the new 60 m default.
- **Artist #124** "small props in Meadow, Alpine, Island" (densities ~½ of SPEC §4, radii ~1.6×; mtn-07 ≤ 292k) + dev test fix a2c6a6f: 594 pass, biome-check ok. PM-checked, waiting for the owner's merge. The real holes still use mtn-default / proto-default (no props) until real courses use the new sets.
- **Owner order (2026-11-23): AP6 textured ground next, then big props.** Dev AP6 in flight (branch `dev/AP6-ground-texture`, strong model, 90 min; recipe `docs/art/style-r2/paint.js`, `GROUND_DETAIL` compare switch).
- **Merged 2026-11-23: #124** (small props in Meadow / Alpine / Island), **#125 AP6 textured ground** (+ smooth anti-aliased edges, `GROUND_EDGE_AA`, owner: "perfect"; remove that switch in the next dev job) and **QA #126**. raw.githack failed to serve coursePainter.js to the owner's phone once (the build itself loaded fine headless): when a githack link fails, offer the merge + GitHub Pages compare via `?tune=`.
- **Big props (2026-11-23):** artist spec **#127** (windmill 328, chalet 404, chaletTall 404, beachHut 114; sails still), dev **#128 AP7e** (LIBRARY.bigProps, `scenery.bigProps` hand placement, no collider, scenery trees cleared off footprints + a corridor to the tee, dev set `test-big-props` + overlay `src/holes/dev-big-props.js`, GROUND_EDGE_AA removed, session-check fixed for #124 + big props), **QA Light #129** passed, no bugs. Owner: props hard to notice → picked **`BIG_PROP_SCALE` 2.5** from compare links (sonnet dev sets the default on #128; static OB check at 2.5) + "don't hide them behind trees, put them higher on a hill" (HOLE_GUIDELINES biome notes). **Merged 2026-11-23: #127, #128 (690ed43), #129** (main: 617 tests). Artist pinged for the sets' bigProps lists (may propose a per-piece size cap: hut / chalet look giant close up at 2.5×); then the artist writes the sets' `bigProps` lists and the course designer places them on real holes.
- **X43 (backlog, owner 2026-11-23): water with a surface.** A simple **semi-transparent water surface** over every water hazard / pond / creek, so water reads as water and "not just a blue hole": the painted bed (AP6 `water` → `waterDeep` gradient, bank) shows through a slightly lighter, see-through layer at water level (a little sheen or soft ripple, recoloured by the palette). Look only, no physics change; mind the phone budget (one transparent draw per hole) and the readability of the ball near water. Artist picks the colours / opacity; dev builds it (relates to X42 pond gradient and the existing `flatPond` / `pondSurface` piece).
- **Merged 2026-11-23: #130** (artist: bigProps lists in Meadow / Alpine / Island + dev per-piece size: windmill 2.5, chalets and hut 1.8; `BIG_PROP_SCALE` is now a multiplier, default 1).
- **X43 water surface #131** (+ X42): owner picked opacity 0.5 but "the edge is too pixelated against rock: blend it, even a little over the rock". Dev follow-up in flight: soft alpha fade at the shore, default 0.5, clean-up (WATER_SURFACE switch, flatPond, scenery.water, pondSurface), #130 conflict in config.js. Then QA Light. Backlog X44 (scalloped far edge on steep banks), X45 (water look numbers per biome set).
- **Merged 2026-11-23: #131 X43 + X42** (see-through water: soft shore fade, caustic "light web" surface after the owner's pool photo, lines fade around the ball; tunables WATER_LINES / WATER_CELL / WATER_SPEED) **+ QA #132**. Problem: the web was only drawn within 35–75 m of the camera, so the owner saw none in play. Dev **X43b** in flight on a new branch `dev/X43b-water-web-distance` (screen-space anti-aliased lines, coarser cells far away, checked by eye in 3 screenshots). Lesson: raw.githack fails often on these many-file builds → show the owner screenshots, then merge and compare on Pages.
- **Merged 2026-11-23: #133 X43b + X43c**: the water web is drawn in screen space (visible at play distance, coarser cells far away) and made subtle after the owner's "less prominent, more stylized: the bottom texture + a transparent layer" → option **B** from a picture of A/B/C (WATER_LINES 0.35, WATER_WIDTH 0.45, WATER_LINE_PX 1.2, WATER_CELL 3.6, WATER_TINT 0.05). No QA run (looks only; tests + session-check by the dev).
- **Big props rule (owner, 2026-11-23):** big props are **optional per hole**: not every course or hole needs them; on a hole close to the budget the course designer simply leaves them out. The owner is open to **raising the triangle budget slightly** (300k) "and see what it does": test it at the big-props step (a `?tune=`-style compare on his phone + perf numbers). Remember the budget targets a mid-range phone, and his S25 Ultra is high-end, so also ask QA / the tech lead before raising it for good.
- **Owner decisions on #116 (2026-11-23):** small props stay at 45 m (`PROP_DRAW_DIST`; on mtn-07 the 10k triangle cap stops them at ~48 m anyway). **X39 (backlog):** a player **view-distance setting** in the Settings menu that changes **only the small props' draw distance** (e.g. Near 45 m / Far 60 m, with thinning beyond ~30 m + a 12k cap so Far fits 300k; dev numbers on #116). Also backlog from #116: X36 the prop cap as a `PERF_BUDGET` line, X37 model-rock fallback ignores slot overrides, X38 perf-check has no rough view. X35–X46 are in TASKS "Backlog from the art passes" (docs PR, 2026-11-23).
- **Backlog from #110/#112:** X35 a minimum for the palm collider rule, widen the tall roundCanopy's base row ~10 % (artist), birch / round-canopy fine-tuning by the artist.

**Fourth Claude Code PM session (2026-11-23):**
- **Owner order:** one more reusable prop first, **a fence** (owner picked fence only from fence / cow / hay hut / tall palm), then **the first real course: Meadow**.
- **Artist session** `session_01Rv6NgC9PsRba6RezCHMPb1` ("Pocket Links: Artist (fence prop)", 60 min): the owner co-designs the fence with it → PR "Art: fence spec" (`docs/art/fence/SPEC.md`: look, line placement format, look-only vs collider = owner's call, PM recommends look-only, triangle cost). Then a dev builds it (library piece + line placement), then the Meadow course with the course designer (genre talk first).
- **Merged 2026-11-24: #137 AP7f + AP7g, #138 QA.** Owner's tournament sets: Meadow + Island get `eventProps`, Alpine doesn't; all three get `fences`. Artist writing the lists on `art/fences-event-props-lists`.
- **2026-11-24:** artist **#139 bench spec** (`parkBench` B1, 132 tris, reuses eventProps, tee only; PM-approved, waiting for the owner's merge) and **#140 sets' lists** (fences in all three, eventProps in Meadow + Island, flags swapped; **7 tests fail**, do not merge yet; new owner request: palette keys `propWood` / `propWoodDark`, fence SPEC §3b). One sonnet dev in flight: **AP7h bench + X50 prop wood keys (optional, fallback wood / trunk) + X51 tests vs real-set lists** (`dev/AP7h-bench-prop-wood`, 60 min). After it merges: the artist updates #140 (merge main, add parkBench), then the owner merges #140.
- **#139 merged (owner). Dev PR #141** AP7h + X50 + X51 (2ff8d3e): 660 pass; a scratch merge with #140 also gives 660 pass, 0 fail. PM-reviewed; **QA Light #142 passed, no bugs** (bench reads well, only seen when aiming right at the tee). Waiting for the owner's merge of #141 + #142. After the merge: the artist updates #140 (merge main, add parkBench, wood values), then the owner merges #140.
- **Merged 2026-11-24: #141 AP7h + X50 + X51, #142 QA, #140 sets' lists** (main 938962a: 660 pass, biome-check ok). #140 went in before parkBench was added → artist follow-up `art/bench-in-sets` (add parkBench, optional propWood values). Then: the Meadow course.
- **Merged 2026-11-24: #143** (parkBench in the lists: Meadow + Island flag, tent, bench; Alpine bench only; propWood on the fallback). Props work done.
- **Meadow course started (2026-11-24):** course-designer session `session_01Rv6Ng9PW7184S78dK5S125` ("Pocket Links: Course designer (Meadow course)"), the owner chats with it directly. Step 1: theme talk → `docs/COURSE_PLAN_MEADOW.md` (PR "Course: Meadow plan", branch `course/meadow-plan`). Step 2: holes, one per PR unless the owner prefers batches. Watch X47 (meadow-day near 300k on long holes).
- **#144 Meadow plan** (PM-approved, waiting for the owner's merge): "Buttercup Meadows", front nine of 18 (`mdw-01..09`, par 36: 4-4-3-5-4-3-4-4-5, diff 1→3, flat-ish 1–3 then hills / water, tournament props on 1–3 + 18, windmills, fenced pastures on 4 and 7 waiting for a **cow** piece (owner to decide when the artist makes it). Back nine harder, its own plan later.
- **#145 holes mdw-01..03** (owner asked for 1–3 together; one per PR from hole 4): 704 pass, perf 189k / 176k / 107k, PM-reviewed (course PRs may touch tests only for v2 shots, fixtures and asserts a new hole makes outdated; `meadows` first on Solo; backlog **X52** BC4 preview from sand off by up to 0.9 m). QA Light was started then **stopped by the owner**.
- **Owner rule (2026-11-24): no QA on course holes while the course is being designed.** Hole work is back and forth with the owner; he plays and merges hole PRs himself. **One QA pass on the whole course at the end** (Full, all holes), before calling it done. Dev PRs still get QA as usual.
- **Owner request (2026-11-24): a wooden bench prop** → same artist session, after the lists job: `art/bench-spec` (reuse the eventProps or bigProps placement, look only, ≤ ~150 tris), then a small (sonnet) dev job.
- **Merged 2026-11-23: #135 + #136** (owner). **AP7f + AP7g PR #137** (997566d, 659 pass, PM-reviewed: footprint rules, four colour slots kept, backlog X47 meadow-day mtn-07 303k on main, X48 far-ground cells vs prop height). QA Light #138 passed (B1 Low → backlog X49: tent roof fills the view when aiming ~119° backwards). Owner (2026-11-24): **`FENCE_SCALE` 1.5** (default, no change) and **event flags swap colours** (body `subAccent`, top `accent`, so they never read as a hole flag; set by the artist per set as a slot override). Next: owner merges #137 + #138 → the artist writes the sets' `fences` + `eventProps` lists (`art/fences-event-props-lists`, also fixes the spec examples) → the Meadow course. (Dev was: strong model, 120 min; tent rule 69ea56e: side tents ≥ 5 m outside the rough or beyond OB). Was: **#135 fence spec** (`docs/art/fence/SPEC.md`: `railFence` for Meadow / Alpine, `ropeFence` for Island, look only, `scenery.fences [{ id, points }]`, `FENCE_SCALE` default 1.5 to compare 1 / 1.5 / 2) and **#136 tee props spec** (owner's own request in the artist session: `featherFlag` + `popupTent` at `TEE_PROP_SCALE` 1.3, accent colours, behind / beside the tee only, first and last hole, "tournament" sets opt in with `teeProps`). Update a2330e7 (owner): renamed **event props** (`eventProps`, `EVENT_PROP_SCALE` 1.3), also allowed along the course (outer rough edge or beyond OB) and 1–2 flags beside / behind the green (≥ 8 m, no tent within 25 m of the green); no collider, so a wild ball can pass through one in the rough (owner informed, collider = small follow-up if needed). One dev builds both as **AP7f fences + AP7g event props**, then QA Light. Owner check after the build: in portrait the aim view doesn't show props beside the tee (a flag pair at the tee box's front corners?). Backlog: flag sway with the wind.

- **Owner backlog idea (2026-11-24): X53 a ball that visibly rolls** (pattern + mesh rotation; artist picks the look, dev builds; look only). X47–X49, X52 also written into TASKS.

**Next (owner's choice, ask him):**
0. **Recommended next (PM, 2026-11-23): the first real course** (Meadow, Alpine or Island) with the course designer: all the art (ground, small / big props, water) only shows on real holes; follow HOLE_GUIDELINES incl. the big-prop placement rules. Other open picks: AP8 pixel setting, Phase MP menus.
1. **Phase MP: main menu pass** (`ui-designer` designs MP0 with the owner in its own session, like the artist → dev builds MP1–MP5), then Phase U for the HUD (X18, X19, X24, X28; keep the red tree warning prominent: QA on #106).
2. More art: ~~AP7 small / big props~~ ✅, ~~AP6 ground~~ ✅ (2026-11-23) → AP8 pixel setting; later big props (fence, cow, hay hut, very tall palm), Alpine sunset biome.
3. **Gate B:** all 5 reviewers in parallel → owner marks APPROVED/SKIP (PM triages first) → dev fix pass → tech lead → PM turns proposals into tasks.
4. **Real courses** (a genre talk per theme first, dressed with biome sets; island holes need flat palm colliders and a wide `hole.map`, HOLE_GUIDELINES) and **Phase 5: rain**.
5. Small, whenever: X17 (pin chip spot text).

**The owner's sessions:**
- **Artist session:** `session_01Rv6Ng9ELhLTGiLwq6qRntd` ("Pocket Links: Artist (style talk ART0b)"). The owner chats with it directly. The PM reaches it with the claude-code-remote `send_message` tool (session_id above); it replies by `send_message` too (read them with ReadNotifications). Its PRs are data / docs only: PM review → merge (no QA unless it changes pieces).
- **Current artist session (2026-11-22):** `session_01Rv6NgBhDn3JiGCnqrtYQhJ` ("Pocket Links: Artist (small props)"), opened by the PM with `create_session` (role override in `append_system_prompt`). The old artist session above wrote its handoff (#115) and stopped. Reach the new one with `send_message`.

**Token budget (owner, 2026-11-22: "we are rapidly maxing our 5 hr windows"):**
- **Start a fresh PM session when this one gets long** (the playbook is the handoff). A long PM conversation costs more on every reply, even "merged".
- **Cheaper model for small dev jobs** (fixes, data, tests): `model: "sonnet"` on the Agent call. Keep the strong model for real engine work.
- **Fold small follow-ups into the next dev step** instead of a separate dev each time (e.g. the birch notes went into the palm PR).
- **QA Light by default**; Full only for big systems. QA is already on the cheaper model.
- **Fewer screenshots in PM reviews:** look at one key before/after, not every image.
- Agent costs seen: dev 150k–260k tokens per task, QA 40k–80k.

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
- **Later:** save a round in progress; "stay on Three.js?" at Gate B (DESIGN §11; the tech lead said yes, #70). The Three.js upgrade (X6) is done (AP2).

### Prompts that worked
The Phase BC dev prompts (core first with a stop for PM review, then a fresh dev for the UI, then small fresh devs for fixes and tuning) are on PR #68 and in this file's git history. Reuse that shape for new systems: **build the core, stop, PM answers, then the rest.**
