# Bench: build spec (owner picks 2026-11-24)

A wooden park bench, built **once** in the shared library and coloured by palette slots, so every biome can use it. It stands **beside or behind the tee**, like a real tee-box bench. Look only, no collider.

It reuses the **event props** system (`LIBRARY.eventProps`, `scenery.eventProps`, the set's `eventProps` list, `EVENT_PROP_SCALE`, every placement check from `docs/art/tee-props/SPEC.md` §4 / §6.3). There is no new placement system.

The reference geometry is `docs/art/bench/pieces.js` (`PIECES.bench.B1`). It uses the big-props part format (`{ positions, indices, w, lo, hi }`, colour = mix(slot lo, slot hi, w)), in metres, with the foot centre at the origin, the seat along x and the front (where you sit) facing +z. The mock-up page is `bench.html?opts=B1,B2,B3&scale=1.3` or `bench.html?biomes=meadow-day,alpine-day,island-day&opt=B1&scale=1.3`.

— Agent: artist

| Image | What |
|---|---|
| `01-bench-options.jpg` | park bench **B1 wooden legs (chosen)** · B2 dark ends + armrests · B3 chunky planks, Meadow, at 1.3× |
| `02-b1-three-biomes.jpg` | **B1** in Meadow / Alpine / Island at 1.3× |

## 1. The owner's pick
| Piece id | Look | Mock-up | Triangles | Size at 1× (× 1.3 in game) |
|---|---|---|---|---|
| `parkBench` | B1 · slatted park bench on square wooden legs | `PIECES.bench.B1` | **132** | 1.8 × 0.55 m, seat 0.45 m, back 0.85 m (→ 2.3 m wide, back 1.1 m) |

- **Owner decisions:** a slatted park bench, B1. **Island uses the same bench** recoloured (no driftwood piece). Placement is at the tee. It is look only.
- **Size:** at the event props' 1.3× (`EVENT_PROP_SCALE`), it sits beside the flags and tent. It is still bench-sized next to the 1.8 m golfer.
- B2 and B3 stay in `pieces.js` as alternatives.

## 2. Shape in words
- 3 seat slats (1.8 m long, 4 cm thick) at 0.45 m.
- 2 back slats (11 cm high) at 0.62 m and 0.78 m, leaning back 0.2 rad.
- Each end has a square front leg (7 cm, 0.43 m tall), a back leg that rises into the backrest (0.84 m, tipped 0.1 rad) and a side rail under the seat.
- Every part is dark at the foot (`trunk`) and light on top (`wood`).
- 11 boxes in all. Flat-shaded toon, fogged, all parts closed (no double-sided faces needed).

## 3. Material slots → palette keys (no new colours)
| Slot (lo → hi) | Palette keys | Meadow / Alpine / Island |
|---|---|---|
| `slat` → `slatTop` | trunk → wood | warm honey / dark chalet wood / light beach wood |
| `frame` → `frameTop` | trunk → wood | |

The same keys as the fence, so a bench next to a rail fence always matches. A pick can repaint it (X33). For example, a white bench needs all four slots: `{ id: 'parkBench', slots: { slat: 'propSnow', slatTop: 'propSnow', frame: 'propSnow', frameTop: 'propSnow' } }`.

## 4. Placement (course designer)
In `scenery.eventProps`, like a flag or a tent:

```js
scenery: {
  eventProps: [
    { id: 'parkBench', x: 7,    z: 22.5, turn: -1.57 },   // beside the tee box, facing it
    { id: 'parkBench', x: -6.5, z: 26.5, turn: 2.32 },    // behind and to the side, facing the tee
  ],
}
```
(The example's tee is at (0, 20) with a 7 × 9 m tee box, and the hole plays toward −z.)

- **Where (owner): beside or behind the tee.** This is zone 1 of tee-props SPEC §4, so all its checks apply:
  - not on the tee box, and the scaled footprint (~2.3 m wide) at least 1.5 m from its edge;
  - outside the tee camera's clear zone;
  - no part more than 4 m ahead of the tee.
- Turn the seat toward the tee box, so it looks like players wait there.
- **How many:** 1–2 per tee, on any hole (it is not only for tournament courses). At 132 triangles each, the cost is nothing against the budget.
- The other event-prop zones (along the course, near the green) would pass the checks, but the owner only asked for the tee. Keep benches at the tee unless he asks.

## 5. Requests for dev
1. **Add `parkBench` to `LIBRARY.eventProps`.** Use the shape of `PIECES.bench.B1` in `pieces.js`, the slots in §3, `tris` 132, its footprint (1.8 × 0.55 m before scale) and a `desc`. Add it to the existing test that keeps each event prop ≤ 300 triangles.
2. **Nothing else.** The placement, the checks, the scale, the instancing (one draw call), the tree clearing and the no-collider rule are already in place for event props (AP7f / AP7g, #137).
3. **Artist, after the build:** add `parkBench` to the sets' `eventProps` lists:
   - Meadow and Island: `featherFlag`, `popupTent` and `parkBench`.
   - Alpine (not a tournament course): `parkBench` only.
