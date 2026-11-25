# Course designer handbook

> What the first real course (Buttercup Meadows, holes 1–6, 2026-11-24/25) taught us, for the next course designer.
> **Read in this order:** this file → `docs/course/MAP_STUDY.md` (how good holes are shaped) → `docs/GENRE_NOTES.md`
> (the owner's rules, **L1–L21** in §6d) → `docs/HOLE_GUIDELINES.md` (lengths, fairness MUSTs) → the course's plan
> (`docs/COURSE_PLAN_MEADOW.md`). Where they disagree, the newest owner rule wins (GENRE_NOTES §6d, then MAP_STUDY).

## 1. Working with Alexis (owner)
- **Ask for his ideas first**, then give options **A / B / C with a recommendation**. Short, plain messages; he has a
  BI/data background, not a programming one.
- **Keep it cheap** (owner token rules, 2026-11-24): plans in text; **1–2 pictures per PR** (the minimap is usually
  enough); never re-open an image to look at it again; short PR text.
- **He merges hole PRs himself.** Open the PR and stop; **don't message the PM**. No QA per hole: one QA pass on the
  whole course at the end. Your own checks stay (§4).
- **He sketches on minimap screenshots** (a red/orange/blue/yellow shape on our map). Turn the sketch into hole
  coordinates (§5) and follow it closely: his sketches are the brief.
- He often batches comments ("don't change yet, I'll drop comments"): wait for "go", then list what you will do.
- Rules he gives are **for every hole from then on**: write each one into GENRE_NOTES §6d (next free L-number) in
  the same commit, and add a test when it can be checked (tests/meadow.test.js has examples).
- Several holes per PR is fine when he asks (holes 1–3, then 4–6); give him a link **per hole** and a round link.

## 2. The hole kit (`src/holes/mtn-course.js`, `makeMtnHole`; Meadow wraps it in `mdw-course.js`)
Everything is hole data: no engine change. A field left out keeps the old behaviour, so Mountain 9 stays bit-exact
(`tests/terrain-exact.test.js`). Copy any Buttercup hole (`src/holes/mdw-0N.js`) as a starting point.

| Field | What it does | Notes |
|---|---|---|
| `land: { pts }` | The playable **clearing** (closed outline, Chaikin-rounded). Outside it is OB, painted dark, filled with scenery forest. | Keep the OB box (`ob`) around it: props and fences are checked against the box, and the stakes stand on it. |
| `land.deepBand: { w, wob, seed }` | **Deep rough layer** just inside the clearing's edge (owner L20), width `w`·(1 ± `wob`). | `w: 7–8, wob: 0.75` gives 2–14 m. |
| `land.deepJoin` | How round (m) the join between the layer and a `deepRoughs` blob is (default 18; L21). | |
| `land.open: [blob]` | **No trees** (edge clumps or scenery forest) inside: keeps a view open (mdw-04's pasture). | |
| `land.forest` | Scenery-forest density factor outside the clearing (default 1.6). | |
| `fairwayShapes: [{ pts }]` | Fairways drawn as **outlines** (closed, rounded): pinch, swell, lean, split. Several shapes = separate fairways with rough between (mdw-04). | Use these, not `fairways` (centre line + width: tube-like). |
| `deepRoughs: [blob]` | A dangerous deep-rough **area**; merges into the layer with a rounded fillet. | Keep ≥ 13 m from the fairway; never on the green. |
| `green.lobes / wob / rot / blend` | **Blob greens** (beans, kidneys). | Cup in the middle of a lobe (L18) or dead centre sometimes. |
| `blend` on any blob | Lobes melt into **one smooth shape** (L17, L21). | 0.5 for bunkers/greens; 0.8–1.0 for big ponds. |
| `forest: { edgeGap, inset, clump, back: false }` | With `land`: trees in **clumps of 1–3 along the clearing's edge**. | `clear: [{ pts, w }]` keeps a corridor (the brave line) free. |
| `oak(x, z, s)` (`mdw-course.js`) | A round tree in play. | Must stand on rough / deep rough, ≥ 2 m from water (a test checks). |
| `TEE_DRESS` (`mdw-course.js`) | Validated tournament-tee spots (tent, flags, bench) for a tee at (0, 0). | |

## 3. Design lessons in one place (details: MAP_STUDY, GENRE_NOTES L12–L21)
- A hole is a **place**: a clearing with an irregular edge, rough, a blobby deep-rough layer, then OB forest.
- **Fairways have character**: narrow off the tee, a fat landing zone, pinches, leans, splits; they flow into the green.
- **Every hazard asks a question.** Combos (a bunker plus a tree where you'd dodge it, map 6); "hit it shorter" is a
  real safe line; the inside of a dogleg is hazard (trees, bunkers, water), never empty grass; close the free
  bail-outs (mdw-05's deep rough right of the lake).
- **Bunkers:** big, deep bowls (L12), touching play (L13), never on the green (L19); one feature bunker by the green,
  even on easy holes. **Greens:** big blobs (L16). **Everything round** (L21).
- **Make neighbouring holes different** (owner: mdw-03 and mdw-06 were too alike): a different drop, green shape and
  bunker places.
- **Show the showpieces**: open views to pastures and windmills (`land.open`); trees on water's edge stand on grass.

## 4. Checks before every PR (and their traps)
1. `node --test` (all must pass). After a hole's terrain changes: `RECORD_TERRAIN=1 node --test tests/terrain-exact.test.js`
   (check only your holes changed) and `node tools/record-baseline-v2.mjs` (check only your shots moved).
2. `node tools/perf-check.mjs --hole <id>` ≤ 300k triangles (Meadow holes 1–6: 137k–251k).
3. A headless look: the minimap, and one game view when the hole has a view or a drop worth checking.
4. Shot sims with `tests/mtn.test.js` helpers (`startAt`, `shot`, `layup`): the safe line (≈ par), the brave line
   (≈ birdie), the price of a missed brave shot, and the default tee shot (never a penalty).

**Traps we hit (and the fix):**
- **"No real hole uses X yet" tests** (big props, fences, event props, meadow-day, deep rough): the first real use
  breaks them. Change them to "every real hole passes the check" and say so in the PR.
- **Par 3s: the default tee aim is the club's FLAT carry** (engine S21). On a big drop (mdw-06, ~23 m) the auto club
  is a 7 Iron aimed at 150 m: it lands short (the ⚑ power is right). `aimTarget` does nothing on a par 3. Reported
  to dev in PR #151; tests allow a non-penalty default there.
- **Mixed surfaces in front of a green** (rough, then fairway, then a raised bank) make "more power" not always
  "further": the ⚑ search falls back to "land 75% of the way". Keep one surface along the line into the green.
- **BC4 shaped-landing test** (`tests/shape-preview.test.js`): on downhill tee shots the left/right shaped landings
  can cross near the landing (< 1 m apart). Change the valley depth or the hill behind the green a little.
- **BC4 preview tolerance** at some bunker test spots (a Driver from sand): move the scenario spot a few metres.
- **AP1b terrain-mesh test** near a steep pond far from any fairway: bring the fairway to the water (better design
  anyway) or make the bowl shallower.
- **Pond lobes** can show as separate ponds or with a V notch: add a connecting lobe and raise `blend`.
- `validateHole` does not reject a hand-placed tree in water: `tests/meadow.test.js` does for Meadow.

## 5. Helpers (`docs/course/scripts/`, not part of the game)
- `surface-text.mjs <hole> x0 x1 z0 z1`: the hole's surfaces as text plus the closest deep rough to the fairway.
- `top-down.mjs <hole> '#hex' out.rgb`: a top-down picture with a chosen deep-rough tint (a colour mockup).
- The minimap screenshot and the shot sims are small Playwright / Node scripts; the pattern is in
  `tools/perf-check.mjs` (serving the repo to Playwright) and `tests/mtn.test.js` (`startAt`, `shot`, `layup`).

## 6. Sketch → coordinates
The minimap keeps the map's proportions. Find the scale from two known points (the tee at (0, 0) and the aim marker
or the cup), then x = (px − tee_px) / scale, z = −(tee_py − py) / scale. Print the result as text (one character per
surface every few metres) to check it before rendering a picture.

— Agent: course-designer
