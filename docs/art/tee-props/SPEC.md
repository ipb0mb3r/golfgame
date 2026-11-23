# Tee props: feather flag + pop-up tent, build spec (owner picks 2026-11-23)

Two reusable pieces that make a tee feel like **tournament day**, from the owner's photos (an event tent with a feather flag on a golf course; a feather flag on a beach). Each is built **once** in the shared library and coloured from the **biome's accent colours** (owner), so every course gets its own colours. Look only: no physics.

The reference geometry is `docs/art/tee-props/pieces.js` (`PIECES.flag.F1`, `PIECES.tent.T1`; the other looks stay as alternatives). Parts use the big-props format (`{ positions, indices, w, lo, hi }`, colour = mix(slot lo, slot hi, w)), metres, foot centre at the origin, the front facing +z. The mock-up page is `tee.html?kind=flag|tent&opts=…` and `tee.html?dress=F1,T1&scale=1.3&biomes=meadow-day,alpine-day,island-day`.

No real brands or logos. The fabric is plain accent colours with a stripe.

— Agent: artist

| Image | What |
|---|---|
| `01-flag-options.jpg` | **F1 feather (chosen)** · F2 teardrop · F3 tall, three bands; close-up + the tee seen from ahead |
| `02-tent-options.jpg` | **T1 open (chosen)** · T2 back wall + table · T3 striped roof + wall + table |
| `03-tournament-tee-all-biomes.jpg` | **the picks at 1.3×** on a tee in Meadow, Alpine and Island, + the aim view (see §4, "aim view") |

## 1. The owner's picks
| Piece id | Look | Mock-up | Triangles | Size at 1× (× 1.3 in game) |
|---|---|---|---|---|
| `featherFlag` | F1 · tall blade with a rounded top, on a thin pole with a small weighted base | `PIECES.flag.F1` | **45** | 0.75 × 3.4 m (→ 1.0 × 4.4 m) |
| `popupTent` | T1 · open 3 × 3 m canopy on 4 legs, pyramid roof + valance | `PIECES.tent.T1` | **104** | 3.1 × 3.1 m, 3.2 m tall (→ 4 × 4 m, 4.2 m) |

- **Size 1.3×** (owner): only a little bigger than real, because they stand right next to the golfer.
- **Flag still** for now (no wind motion). It is a separate piece so a gentle sway with the hole's wind could be added later (a nice wind hint).
- T2 / T3 (back wall, table, striped roof) stay in `pieces.js` for later "event" holes.

## 2. Shapes in words
- **featherFlag:** a 5-sided pole (r 2.5 cm) 3.42 m tall in a small square base (0.36 m, 12 cm high). The banner is a single sheet hung on the pole side: 0.5 m wide at the bottom (0.45 m up), 0.75 m at the widest, its top rounding over to the pole tip. It bows 10 cm in a soft curve so it catches the light. Three bands bottom → top: body, a thin stripe, the top cap. Draw double-sided.
- **popupTent:** 4 thin legs (6 cm square, 2.2 m), a 4-sided pyramid roof (base 3.1 m, rise 0.95 m, each side cut in 2 = 8 triangles so a striped roof is possible) and a 0.3 m valance box on all four sides under the roof edge. The roof sheet is double-sided.

Flat-shaded toon (3-band ramp), fogged like the scenery.

## 3. Material slots → palette keys (owner: "their colour follows the accents of the biome palette")
| Piece | Slot | Palette key | Meadow / Alpine / Island |
|---|---|---|---|
| featherFlag | body | `accent` | brick red / Swiss red / tropical orange |
| | top | `subAccent` | buttercup / alpine gold / magenta |
| | stripe, pole | `propSnow` | cream / white / white |
| | base | `rock` | |
| popupTent | roof | `accent` | |
| | valance | `subAccent` | |
| | leg | `propSnow` | |

`accent` is the hole flag's colour and `subAccent` the tee markers', so the dressing always matches the course. A pick can swap slots (X33), e.g. a white tent with an accent valance: `{ id: 'popupTent', slots: { roof: 'propSnow', valance: 'accent' } }`.

## 4. Placement (course designer)
Hand-placed, like the big props, but **near the tee**:

```js
scenery: {
  teeProps: [
    { id: 'popupTent',   x: -9,  z: 25, turn: 1.2 },     // beside and behind the tee, front toward the tee box
    { id: 'featherFlag', x: 5.2, z: 15.5, turn: -0.35 },  // at the tee box's side
    { id: 'featherFlag', x: 6,   z: 27,   turn: -0.6 },   // behind
  ],
}
```
(x, z relative to the hole like other scenery; the example's tee is at (0, 20) and the hole plays toward −z.)

- **Where (owner):** behind the tee and at its sides. Never in front of the tee box toward the fairway.
  - **Keep the camera's spot clear:** nothing within 4 m either side of the aim line from the tee to 12 m behind it, because the aim camera sits 7 m behind the ball and turns as the player aims.
  - Not on the tee box itself (≥ 1.5 m from its edge).
  - Flags 4–8 m to the side of the tee centre, up to 4 m ahead of the tee line (at the tee box's front corners) or behind it. The tent 6–12 m to the side, level with or behind the tee. Turn the fronts toward the tee box.
- **Which holes (owner):** not every hole. **Most important on the first and last hole of a course** (holes 1 and 9 of a 9-hole round; a course can have any length, so "first and last"). Others are optional.
- **Which courses (owner):** flags close to the tee belong to **"tournament" courses**, not every course. The biome set says whether it uses them (see request 2); a set without them can still be given a tent on hole 1.
- **How many:** 1 tent + 2–4 flags on a dressed tee. Triangle cost ~ 1 × 104 + 4 × 45 ≈ 300: nothing against the 300k budget.
- **The aim view (finding, `03`):** in phone portrait, the aim camera's view is narrow, so props *beside* the tee don't show while aiming. They show in the hole intro / flyover, in landscape and as the ball flies. If the owner wants one in the aim view, a flag pair at the tee box's front corners (±5 m, 4 m ahead) is the only spot that comes close. Check it on the phone once built.

## 5. Done when
- `featherFlag` and `popupTent` are in the library (e.g. `LIBRARY.teeProps`) with `tris`, `slots` and `desc`; their shapes match `pieces.js`.
- A dev test set (e.g. `test-tee-props`) dresses pl-01's tee as in `03`.
- Then the artist adds the `teeProps` lists to the sets that use them, and the course designer dresses hole 1 and the last hole of the first course.

## 6. Requests for dev / QA
1. **Pieces in the library:** `featherFlag` (F1) and `popupTent` (T1) from `pieces.js`, slots as §3, drawn at `TEE_PROP_SCALE` 1.3 (a tunable, like the big props' per-piece size). A test checks each ≤ 300 triangles.
2. **Allowed ids per biome set:** a new optional `teeProps: ['featherFlag', 'popupTent']` list in the biome set (`validateBiomeSet`), like `bigProps`. The artist writes the lists. If a set doesn't list them, a hole in that set can't use them.
3. **Placement in hole data:** `scenery.teeProps: [{ id, x, z, turn, scale? }]`, dropped on the ground like big props (lowest ground under the footprint). `validateHole` should fail if:
   - the id isn't in the set's `teeProps` list;
   - the footprint (scaled) is closer than 1.5 m to the tee box;
   - it is inside the camera's clear zone (±4 m from the tee's aim line, from 12 m behind the tee to the tee) or in front of the tee box beyond 4 m ahead.
4. **No collider** (look only). A tee shot starts beside them and leaves upward; nothing needs to hit them.
5. **Drawing:** flat-shaded toon, fogged, banner and roof double-sided; instanced per piece (1–2 draw calls per hole). The flag stays still; keep the banner a separate part so a wind sway could be added later.
6. **Scenery trees** are cleared off their footprints, as for big props.
7. **QA Light:** the test tee in portrait and landscape; the aim view never looks through a tent or flag while aiming left / right; perf-check unchanged.
