# Small props: build spec (owner-approved 2026-11-23)

Six small pieces, each made **once** in the shared library and recoloured by each biome's palette, so Meadow, Alpine, Island and later biomes all use them. The owner asked for a **light sprinkle**: a few clumps and patches here and there. The rough stays clean and the ball stays easy to read.

The reference geometry is `docs/art/small-props/pieces.js`. Each piece's `build(seed)` returns parts in the trees.js format (`{ positions, indices, w }`) plus a slot pair `lo` / `hi`. A vertex colour = mix(slot lo, slot hi, w), mixed in sRGB like `gradientHex`. The mock-up page is `props.html`: `?piece=…&opts=…` shows the options and `?mix=…` shows the chosen set in all three biomes.

— Agent: artist

| Image | What |
|---|---|
| `01-tuft-options.jpg` | grass tufts A · B · C, Meadow (close-up + from the fairway) |
| `02-flowers-options.jpg` | flower patches A · B · C, Meadow |
| `03-bush-options.jpg` | bushes A · B · C, Island |
| `04-pebbles-options.jpg` | pebbles A · B · C, Meadow |
| `05-reeds-options.jpg` | reeds A · B · C at a pond edge, Meadow |
| `06-bush-c-colour-split.jpg` | bush C with a clean / wavy flower edge (not chosen: the owner wanted spots instead) |
| `07-bush-spots.jpg` | a green bush with flower spots D1 · **D2 (chosen)** · D3 |
| `08-chosen-all-biomes.jpg` | **the chosen set** in Meadow · Alpine · Island |

## 1. The owner's picks
| Piece id | Look | Mock-up | Triangles | Size (scale 1) |
|---|---|---|---|---|
| `grassTuft` | A · thin fan | `PIECES.tuft.A` | **21** | 0.3–0.45 m tall |
| `flowerPatch` | C · flat carpet | `PIECES.flowers.C` | **45** | ~0.8 m across, 3 cm high |
| `flowerBush` | D2 · green dome, raised flower clumps | `PIECES.bush.D2` | **46** | 1.36 m across, 0.92 m tall |
| `pebbles` | A · three stones | `PIECES.pebbles.A` | **30** | ~0.45 m across |
| `flatStone` | B · one flat stone | `PIECES.pebbles.B` | **24** | 0.64 × 0.52 m, 0.12 m tall |
| `reeds` | B · tall blades | `PIECES.reeds.B` | **30** | 0.7–1.15 m tall |

The owner wanted both pebble looks, so they are two pieces. All six are ≤ 50 triangles (ART_STYLE §5). Each is instanced: one draw call per piece, so 6 draw calls in a biome that uses them all.

## 2. Shapes in words
- **grassTuft:** 7 slim pointed blades fan out from a tiny base ring (r 3 cm). Each blade has 3 triangles (base quad + tip), leans out 45–65 % of its height, and its top droops a little (`curl` 0.3). Drawn double-sided. Dark at the foot, light at the tips.
- **flowerPatch:** 9 flat 5-point flower heads (r 7.5 cm) lying 3 cm above the grass, spread over an oval ~0.8 × 0.65 m. There are no stems and no leaves: it's a splash of colour that never hides the ball. Each head has a slightly raised centre (`head()`, 5 triangles).
- **flowerBush:** one **green round dome** (an ellipsoid: r 0.68, centre 0.42, half-height 0.5; 6 sides × 3 bands, 30 triangles) with **4 raised flower clumps** (4-point fans, r 0.19, their centre puffed 55 % out along the normal, set 12 % off the surface, 4 triangles each). The clumps sit in the upper two thirds, spread around. The dome is leafLow at the foot and leafTop at the crown.
- **pebbles:** 3 squashed 5-sided stones (r 0.16 / 0.10 / 0.08), set close together. Their rings wobble a little, so they look round, not machined.
- **flatStone:** one bigger, flat, 6-sided stepping stone (`PIECES.pebbles.B`).
- **reeds:** 10 tall blades (0.7–1.15 m) from a small ring, bending gently outward (`curl` 0.45). Dark foot, light tips. Double-sided.

## 3. Material slots → palette keys
The colours come from slots, so every biome recolours the same piece. A pick can swap a slot with X33 (`slots: { … }`).

| Piece | Slots (lo → hi along `w`) | Default palette keys |
|---|---|---|
| grassTuft | `base` → `tip` | deepRough → leafTop |
| flowerPatch | `petal` (flat, the centre a touch lighter is optional) | propA |
| flowerBush | dome `low` → `top`; clumps `flower` | leafLow → leafTop; propA |
| pebbles, flatStone | `stone` | boulder |
| reeds | `base` → `tip` | deepRough → leafTop |

- **Shading:** toon (AP6a's 3-band ramp), like the trees.
- **Per-copy variation:** a random turn about y, scale 0.8–1.3 (bush 0.8–1.25, stones 0.8–1.4), and a light `tint` (as TREE_TINT, but half the spread) on the green slots only. Petals and flowers keep their exact colour: the owner likes colours that pop.
- **X33 overrides used below:** `{ id: 'flowerPatch', slots: { petal: 'propB' } }` for the second flower colour, and `{ id: 'flowerBush', slots: { flower: 'leafTop' } }` for a plain green bush.

## 4. Scatter per biome (light sprinkle)
Densities are copies per hectare of the listed surface. A cluster = how many copies per patch, and spread = the patch radius in metres.

| Biome | Piece (pick) | per ha | cluster / spread | Surfaces |
|---|---|---|---|---|
| **Meadow** | grassTuft | 700 | 1–3 / 1.2 m | rough, ob |
| | flowerPatch (propA, buttercups) | 120 | 3–6 / 2 m | rough, ob |
| | flowerPatch + `petal: propB` (red) | 60 | 3–5 / 2 m | rough, ob |
| | pebbles | 40 | 1–3 / 1 m | rough |
| | flatStone | 15 | 1–2 / 1 m | rough |
| | flowerBush + `flower: leafTop` (plain green) | 30 | 1–3 / 2.5 m | ob |
| | reeds | — | 2–4 / 0.8 m | water edge (request 3) |
| **Alpine** | grassTuft | 600 | 1–3 / 1.2 m | rough, ob |
| | flowerPatch (propA, white) | 100 | 3–6 / 2 m | rough, ob |
| | flowerPatch + `petal: propB` (blue) | 60 | 3–5 / 2 m | rough, ob |
| | pebbles | 70 | 1–3 / 1 m | rough, ob |
| | flatStone | 30 | 1–2 / 1 m | rough, ob |
| | flowerBush + `flower: leafTop` (plain green) | 20 | 1–2 / 2.5 m | ob |
| | reeds | — | 2–4 / 0.8 m | water edge |
| **Island** | grassTuft | 600 | 1–3 / 1.2 m | rough, ob |
| | flowerPatch (propA, bougainvillea pink) | 90 | 3–6 / 2 m | rough, ob |
| | flowerPatch + `petal: propB` (orange) | 60 | 3–5 / 2 m | rough, ob |
| | pebbles (dark lava, `boulder`) | 40 | 1–3 / 1 m | rough |
| | flatStone | 10 | 1–2 / 1 m | rough |
| | **flowerBush (pink)** | 40 | 1–3 / 2.5 m | ob |
| | reeds | — | 2–4 / 0.8 m | water edge |

- In weights, a biome's rough total is about 1,000 copies per hectare. Meadow, for example: tuft 0.75, buttercups 0.13, red 0.06, pebbles 0.04, flat stone 0.02 (pieces on other surfaces get their own entry). The owner chose "light sprinkle"; `08-chosen-all-biomes.jpg` shows about this density.
- The bush is 0.9 m tall, so it is **ob only** (scenery outside the out-of-bounds stakes). It must never stand between the ball and the camera in play.
- Not on tee, fairway, fringe, green, sand, path, or within 1 m of a tree trunk or OB stake.
- The near-ball rule from the scatter system applies to all pieces. The flat carpet and the pebbles are low, so they may sit closer than the tufts.
- Performance: at these numbers a typical hole has ~4 ha of rough, so about 4,000 copies × ~25 triangles = **~100k triangles** if every copy is drawn. That is too much next to the trees, so see request 2.

## 5. Done when
- The six pieces are in `LIBRARY.smallProps` with `tris`, `slots` and `desc`. Their shapes match `pieces.js` (the dev may tidy the code, but the numbers above stay).
- `?biome=test-small-props` on a mountain hole, in a close-up next to the ball, matches `08-chosen-all-biomes.jpg` close-up for each biome palette.
- The tests check each piece is ≤ 50 triangles.
- The artist then writes the real sets' `smallProps` (Meadow, Alpine, Island) in an art PR, measured with `tools/perf-check.mjs` (≤ 300k).

## 6. Requests for dev
1. **Build the six pieces** above in the shared library (replaces the placeholders `grassTuft` and `flowerPatch` from the AP7c test set; keep those ids).
2. **Draw distance for small props:** draw a piece only within about 60 m of the camera, with a fade or thin-out over the last 10 m. Beyond that they are invisible on a phone anyway (see the fairway views). This keeps them well under the budget.
3. **A "water edge" scatter surface** for the reeds: patches on a ring 0–1 m outside a pond's or water hazard's edge, on its land side, with N patches per 10 m of shoreline (reeds: ~2 per 10 m).
4. **Per-pick density in the scatter** (if AP7c has only one perHa per set): the table above sets per-piece densities. Weights + one total also work, and then I'll convert.

## 7. In the real sets (2026-11-23, after AP7d)
Since AP7d every small prop is drawn at **2× size** (`PROP_SCALE` 2, the owner's pick: "too subtle"), seen out to 60 m and thinned to half beyond 30 m. A prop now covers about 4× the ground, so `meadow-day`, `alpine-day` and `island-day` use about **half the §4 densities**, with the cluster radii about 1.6× wider. The pieces, colours and surfaces are as in §4. perf-check results: mtn-07 291k / 292k / 265k, mtn-04 267k / 268k / 243k (Meadow / Alpine / Island). The 10k-triangle prop cap per frame keeps any hole within budget. Pictures: `09`–`11` (before | after, `?scenario=h1-pond-carry`).
