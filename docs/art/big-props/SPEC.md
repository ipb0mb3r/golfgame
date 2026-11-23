# Big props: build spec (owner-approved 2026-11-23)

There is one signature big prop per biome, built once in the shared library and coloured by palette slots. Each is placed by hand by the course designer, **beyond OB only**. Big props are optional, have **no physics** and are never in play.

The reference geometry is `docs/art/big-props/pieces.js`. Each look's `build()` returns parts in the small-props format (`{ positions, indices, w, lo, hi }`; vertex colour = mix(slot lo, slot hi, w)), in metres, with the foot centre at the origin and the front facing +z. The mock-up page is `props.html?piece=windmill|chalet|hut&opts=…`.

— Agent: artist

| Image | What |
|---|---|
| `01-windmill-options.jpg` | windmill A wooden tower mill · B post mill · **C white smock mill (chosen)**, Meadow |
| `02-chalet-options.jpg` | chalet **A classic (chosen)** · **B tall (kept for later)** · C long low, Alpine |
| `03-hut-options.jpg` | beach hut **A thatched stilt hut (chosen)** · B painted hut · C open shack, Island |

Each picture shows a close-up on top and the view from the fairway (~100 m) below.

## 1. The owner's picks
| Piece id | Look | Mock-up | Triangles | Size | Biome |
|---|---|---|---|---|---|
| `windmill` | C white smock mill, **sails still** (owner: no turning) | `PIECES.windmill.C` | **328** | 13 m tall (cap 12.2 m), sails reach 6.8 m from the hub | Meadow |
| `chalet` | A classic chalet | `PIECES.chalet.A` | **404** | 12 × 9 m, 8.5 m tall (+ chimney) | Alpine |
| `chaletTall` | B tall chalet: second priority, "if we have some time" | `PIECES.chalet.B` | **404** | 10 × 9 m, 11 m tall | Alpine |
| `beachHut` | A thatched stilt hut | `PIECES.hut.A` | **114** | 3.6 × 3.6 m (+ deck), 4.7 m tall | Island |

Every piece is well under the 1,500 big-prop budget (ART_STYLE §5) and under the PM's targets (~400 / ~700 / ~200). There is room to add detail later, such as window frames or a door canopy.

## 2. Shapes in words
- **windmill:** an 8-sided grey stone base (r 3.0, 2.6 m high) under a tall 8-sided white tower that tapers from r 2.7 to 1.7 up to 10 m. A wooden gallery ring (r 3.6) runs around it at 3.6 m.
  - The brick-red cap is a rounded 8-sided onion that rises from r 2.0 at 10 m to its tip at 12.2 m.
  - The hub sits on the front at 10.7 m. 4 sails are each a wooden spar 6.8 m long with a cream cloth board made of 2 slightly cupped slabs, turned 0.35 rad.
  - There is a wooden door and one window on the front.
- **chalet:** a white stone ground floor (12 × 3 × 9 m) under a dark wood upper floor (11.6 × 3.2 × 8.6).
  - A **wide, low** gable roof of two thick grey slabs (rise 2.3 m, 1.1 m overhang) sits over a wood gable end.
  - A wooden **balcony** runs the length of the front (floor slab + rail), with **3 window boxes of red geraniums** (a green box with an accent top).
  - 3 upper and 2 lower windows each have **red shutters**; there is a wooden door and a small white chimney.
- **chaletTall:** the same parts with three floors (stone + 2 wood), two balconies with 2 geranium boxes each, and a steeper roof (rise 3.0 m).
- **beachHut:** 4 short stilts (0.8 m) under a wooden floor deck, a 3.2 m wooden box room and a step.
  - A steep **thatch pyramid roof** (1.7 m high, 0.7 m overhang).
  - A **turquoise** door and a side window shutter.

All are flat-shaded (crisp faces) with the scene's 3-band toon ramp, fogged like the scenery.

## 3. Material slots → palette keys
| Piece | Slot → key |
|---|---|
| windmill | `wall` → propSnow (tower), `base` → rock, `cap` → roof (brick red in Meadow), `spar` → wood (sails, gallery, door), `sail` → propSnow, `glass` → glass |
| chalet, chaletTall | `stone` → propSnow, `wood` → wood, `roof` → roof (grey in Alpine), `shut` → accent (Swiss red), `flower` → accent, `leaf` → leaf, `glass` → glass |
| beachHut | `wall` → wood, `post` → trunk, `roof` → roof (thatch brown on Island), `door` → water (turquoise), `trim` → propSnow |

Because these are slots, another biome can reuse a piece with its own colours. Examples: a windmill in Alpine gets a grey cap from `roof`; X33 can repaint any slot per pick.

## 4. Placement (course designer)
- **Hand-placed** in the hole data: `{ id, x, z, turn, scale? }` (see request 1). Only pieces the biome set lists in its `bigProps` may be used.
  - Meadow: `['windmill']`. Alpine: `['chalet', 'chaletTall']`. Island: `['beachHut']`. The artist writes these lists once the pieces exist.
- **Where:** beyond OB only, at least 10 m outside the OB line and away from the tee shot's line of sight. They belong on the hills, the slopes behind the green, or the beach. Turn the front toward the course.
- **How many per hole:** windmill 1–2 (a pair on a far hill looks good), chalet 1–3 (a small group at different turns), beach hut 1–4 along the beach.
  - At 114–404 triangles each, 3 props add ~1.2k triangles at most. The props are **optional**: on a hole near the 300k line (mtn-07 ~291k), leave them out or use one.
- **Scale:** 0.9–1.15 for variety. Don't scale the beach hut below 0.9: its door must read as door-sized next to the golfer.

## 5. Done when
- The four pieces are in `LIBRARY.bigProps` with `tris`, `slots` and `desc`, and their shapes match `pieces.js` (the dev may tidy the code; the numbers stay).
- A test checks each piece is ≤ 1,500 triangles.
- A dev test set (e.g. `test-big-props`) shows one of each on a mountain hole beyond OB, matching the close-ups in 01–03.
- The artist then adds `bigProps` lists to the three real sets, and the course designer places them on holes.

## 6. Requests for dev
1. **Placement in hole data:** `scenery.bigProps: [{ id, x, z, turn, scale }]`. Drop each prop onto the terrain height at (x, z), using the lowest ground under its footprint so it never floats; a sunk foot is fine. `validateHole` should fail if:
   - the id isn't in the set's `bigProps`, or
   - the footprint (piece radius × scale) reaches inside the OB box plus a 5 m margin.
2. **No collider:** big props are never in play (owner), so physics is unchanged. The ball can't reach them (beyond OB, with OB ending the shot), so no shared collider is needed. If a ball rolls through one after going OB, that's acceptable.
3. **Drawing:** flat-shaded toon, fogged, one draw call per piece per hole, instanced when there are several copies. A scenery LOD isn't needed at these counts. They are never hidden by the small-props rule; only the camera can be inside one, so keep them ≥ 10 m from OB.
4. **The windmill sails stay still** (owner: "No, still"), so there's no moving part. Keep them a separate part in the library so turning could be added later.
5. **Minimap:** optional. A small dot in `roof` colour would help orientation, but none is required.

## 7. Requests for course designer
- On the next Meadow, Alpine and Island holes, place 1–3 props as in §4, and check each hole stays ≤ 300k triangles (`tools/perf-check.mjs`).

## 8. Size in the game (owner 2026-11-23)
`BIG_PROP_SCALE` 2.5 (#128) draws every big prop at 2.5× the sizes above, so it is easy to notice from the tee. Close up, the beach hut's door then stands about twice a golfer's height and the chalet's about three times (`04-hut-sizes.jpg`, `05-chalet-sizes.jpg`: 2.5 / 1.8 / 1.5× beside a 1.8 m golfer). **Owner's pick:** the **beach hut and both chalets at 1.8×**, the **windmill at 2.5×**. This needs a per-piece cap or factor; see the dev request on the "Art: big props in Meadow, Alpine, Island" PR.
