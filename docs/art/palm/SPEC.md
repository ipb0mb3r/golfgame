# Palm redesign: build spec for AP7b (owner-approved 2026-11-22)

The owner was unhappy with the AP7a palm, "especially the top part". He chose **"C + a little B"**: option C's **round dome crown** with leaves about a third wider than C's, still pointed (from B, "big broad leaves").

The trunk, the gradient and the toon shading stay as in AP7a. Only the **crown** (and its collider fit) changes.

| Image | What |
|---|---|
| `01-crown-options.jpg` | today · A fuller starburst · B big broad leaves · C round dome |
| `02-c-plus-b.jpg` | C · **C + a little B (chosen)** · C + more B |
| `03-chosen-vs-today.jpg` | today vs the chosen crown, with the flatter collider shown as a faint wireframe |

The reference geometry is `docs/art/palm/palms.html?opt=D`: the `OPTIONS.D` entry and its `frond()` / `crown()` functions. It uses the same part format as `src/core/trees.js` (unit canopy space: radius 1 across, y −1 … 1).

— Agent: artist

## 1. Shape in words
- A **rounded dome** of fronds over the trunk top. Every frond **arches up high first**, then **curls down** at its outer part, so the crown reads round from afar, not flat or spiky.
- The leaves are **wide and pointed**, with a clear **V fold**: the edges hang below the spine. They're wider than AP7a's, but not paddles.
- A small **round tuft** pokes up in the centre, over a small cap where the fronds meet.
- It must stay **soft and cartoony** (ART_STYLE §1.1): no thin, spiky or realistic fronds.

## 2. Numbers (unit canopy space, as in `TREE_LOOK.palmTree`)
| | Upper layer | Lower layer |
|---|---|---|
| fronds `n` | 4 | 7 |
| `turn` (rad) | 0.6 | 0.15 |
| `reach` (× radius) | 0.78 | 1.0 |
| start `y0` | 0.14 | 0.06 |
| `peak` height | 0.75 | 0.58 |
| peak position `tp` (0–1 along) | 0.5 | 0.5 |
| `end` height | 0.2 | −0.25 |
| droop power `bend` | 1.0 | 1.0 |
| **`curl`** (new) | 0.8 | 0.9 |
| **`width`** (× radius) | 0.33 | 0.36 |
| V fold `droop` (× width) | 0.55 | 0.6 |
| stations `steps` | 5 | 5 |

- **`curl` (new parameter):** over the frond's outer part, the spine is pulled in and down.
  - reach `d = t·reach·(1 − curl·t²·0.25)`
  - height `y = yAt(t) − curl·t³·0.35`
  - `yAt` is AP7a's arch then droop.
- **Width profile:** as in AP7a, `width·sin(π(0.15 + 0.85t))·(1 − 0.2t)`. The leaves end in a point.
- **Tuft:** a small lathe, `[[0, 0.32], [0.16, 0.1], [0.13, 0], [0, −0.1]]` × 6 sides, gradient near the top.
- **Cap:** as in AP7a, r 0.13, 6 sides.
- **Gradient:** over the crown's own height, as in AP7a: drooping tips `leafLow`, mid **`leafAlt`** (palm slot), top `leafTop`.
- **Triangles:** the crown is about **234** and the whole tree about **330** in play, so it's cheaper than AP7a's 372 (budget ≤ 400).
  - Scenery LOD: steps 3, tuft 4 sides, trunk as AP7a's `lod`, about 150.

## 3. Fit to the collider (AP7b palm rule: no "hitting air")
- As built, the crown spans **rMax ≈ 0.78** across and **y −0.57 … +0.70**, because `curl` pulls the tips in.
- **Scale the whole crown so it reaches about 0.95 of the canopy radius** (multiply x and z by about 1.22, or `reach` by about 1.22) before fitting. That way the drawn leaves reach the collider's edge.
- **The palm canopy collider should be wide and flat:** horizontal radius R and half-height about **0.65 R**, centred about 0.07 R above the trunk top (the crown spans −0.57 … +0.70).
  - This is flatter than today's collider, which is about 1.5× taller than wide. The course designer (or a palm default in the obstacle data) uses this ratio for palms.
- The trunk is unchanged (bowed, ringed). Keep its top on the collider axis, as in AP7a.

## 4. Done when
- `palmTree` in play and as scenery uses this crown, and the tests check that it stays ≤ 400 triangles.
- On `pl-01` with `test-island-trees`, a close-up matches `03-chosen-vs-today.jpg` (right side), and the crown fills its collider with no visible gap.
- The artist reviews the look on the AP7b PR. After that, the artist puts `palmTree` back into `island-day.js` as `onTrees`.
