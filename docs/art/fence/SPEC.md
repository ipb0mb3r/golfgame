# Fence: build spec (owner picks 2026-11-23)

A fence is a **line**, not one object. The course designer lays it out as a list of points, and the engine fills it with repeated posts and the rails (or ropes) between them. Each fence look is built **once** in the shared library and coloured by palette slots, so every biome can reuse it. Fences are **look only**: no physics, never in play.

The reference geometry is `docs/art/fence/pieces.js`. Each look has `post()` (one post, foot centre at the origin) and `span()` (what hangs between two posts, along +x from 0 to 1). `layFence(look, points, ground, scale)` is the placement reference: points → post spots → posts + spans. Parts use the big/small-props format (`{ positions, indices, w, lo, hi }`, colour = mix(slot lo, slot hi, w)). The mock-up page is `fence.html?opts=A,B,C` (or `A@alpine-day,I2`, `&scales=1,1.5,2`, `&biomes=…&opt=B`).

— Agent: artist

| Image | What |
|---|---|
| `01-split-rail-options.jpg` | split rail **A post & two rails (chosen)** · B three split rails · C zig-zag, Meadow |
| `02-island-options.jpg` | Island rope fence I one rope · **I2 two ropes (chosen)** |
| `03-sizes.jpg` | B at 1× / 1.5× / 2× beside a 1.8 m golfer, close-up + from the fairway (~45 m) |
| `04-split-rail-three-biomes.jpg` | B recoloured by Meadow / Alpine / Island palettes (no new colours) |
| `05-chosen-all-biomes.jpg` | **the picks at 1.5×**: A in Meadow and Alpine, I2 on Island |

## 1. The owner's picks
| Piece id | Look | Mock-up | Triangles per segment | Size at 1× | Biomes |
|---|---|---|---|---|---|
| `railFence` | A · square posts, two flat rails (owner: "I like A") | `FENCES.A` | **36** (post 12 + 2 rails 24) | 1.1 m tall (posts 1.2 m), one post every 3 m | Meadow, Alpine |
| `ropeFence` | I2 · crooked driftwood posts, two sagging ropes | `FENCES.I2` | **63** (post 15 + 2 ropes 48) | 0.95 m tall (posts 1.0 m), one post every 2.6 m | Island |

- **Owner decisions:** split-rail wood style; **look only** (no collider); Island gets its own rope + driftwood fence.
- **Size: open.** Recommended **1.5×** (`05-chosen-all-biomes.jpg`): at 1× the fence is a thin line from the fairway, the same problem the big props had. The spacing grows with the scale (posts every 4.5 m at 1.5×), so the triangle cost per metre goes *down*. Request 4 makes it a `FENCE_SCALE` tunable so the owner can compare 1 / 1.5 / 2 on his phone before it is fixed.
- B, C and I stay in `pieces.js` as alternatives for later biomes (e.g. B or C for a rustic Alpine pasture).

## 2. Shapes in words
- **railFence:** square posts 0.16 × 0.16 m, 1.2 m tall. Two flat rails (0.14 m high, 0.06 m thick) at 0.45 m and 0.95 m, fixed to the front face of the posts (offset 0.1 m) and running slightly past each post so the joints overlap. Dark at the foot of each post / underside of each rail, lighter on top.
- **ropeFence:** 5-sided driftwood posts tapering from r 0.09 to 0.06, 1.0 m tall, leaning a little, each turned at random. Two ropes (3-sided tubes, r 3 cm, 4 pieces each) hang between posts at 0.85 m and 0.45 m with a sag of 0.20 / 0.14 m at mid-span. The top of each rope is lighter.

Flat-shaded (crisp faces), the scene's 3-band toon ramp, fogged like the scenery. Double-sided is not needed (all parts are closed).

## 3. Material slots → palette keys (no new colours)
| Piece | Slot (lo → hi) | Palette keys |
|---|---|---|
| railFence | post, rail | trunk → wood |
| ropeFence | post | trunk → bank (sun-bleached driftwood) |
| | rope | lip → propSnow |

Every key exists in all three sets, so the same pieces work anywhere. In Alpine the rails come out dark chalet wood (`04`), which matches the chalets. A pick can swap a slot like the small props (X33), e.g. a white-painted paddock fence: `{ id: 'railFence', slots: { rail: 'propSnow', post: 'propSnow' } }`.

## 4. Placement (course designer)
A hole lists its fences in the scenery, like the big props:

```js
scenery: {
  fences: [
    { id: 'railFence', points: [[42, 20], [42, -140], [95, -165]] },   // along the right OB line, then away up the hill
    { id: 'railFence', points: [[-48, -60], [-48, -110]] },             // a second, separate run = a gap between them
  ],
}
```

- **points:** `[x, z]` pairs in hole metres. The fence runs from the first to the last; it turns at every point in between. At least 2 points.
- **Posts:** one on every point (so corners and both ends always have a post), plus evenly spaced posts along each leg, no further apart than the look's spacing × scale. No extra data is needed for an end post.
- **Gaps / gates:** start a new entry. One entry = one unbroken fence.
- **Slopes:** each post stands on the ground (`heightAt`), sunk 0.1 m; the rails / ropes follow the slope between the two posts. Keep legs on gentle ground; on steep slopes use more points so the rails don't cut through a bump.
- **Where (look only):** every leg stays **outside the OB line + 2 m**. A fence along the OB line just beyond the stakes is the classic look ("the edge of the course"); a fence around a pasture on a hill, near the windmill or a chalet, also works. Never in play, never across the line from the tee to the green.
- **How much:** up to ~600 m of fence per hole. At 1.5× that is ~4.8k triangles for `railFence` and ~9.7k for `ropeFence`; at 1× ~7.2k / ~14.5k. Fences are **optional**: on a hole close to the 300k budget, use less or none.
- **Only ids the hole's biome set lists** in a new `fences` list may be used (Meadow and Alpine `['railFence']`, Island `['ropeFence']`). The artist writes these lists after the dev builds the pieces.

## 5. Visibility and cost
- Drawn as far as the scenery (fog takes it); no separate draw distance. At 1.5× the rails read as a line up to ~150 m; past that the fog thins them out.
- **Draw calls:** all fences of one look on a hole merge into **one static mesh** (built once at hole load), so 1 draw call per look, 1–2 per hole. Instancing also works (an instance matrix can stretch a span and shear it for the slope) if the dev prefers.
- **Cost per 100 m:** railFence 1,200 tris at 1× / 800 at 1.5×; ropeFence 2,420 at 1× / 1,620 at 1.5×.

## 6. Done when
- `railFence` and `ropeFence` are in the library (e.g. `LIBRARY.fences`) with `tris` per segment, `spacing`, `slots` and `desc`; their shapes match `pieces.js` (the dev may tidy the code; the numbers stay).
- A dev test set (e.g. `test-fences`, like `test-big-props`) shows both on a mountain hole beyond OB, matching `05`.
- Then the artist adds `fences` lists to the three real sets, and the course designer places them on real holes (first Meadow course).

## 7. Requests for dev / QA
1. **Fence pieces in the library:** `railFence` and `ropeFence` from `pieces.js` (post part + span part, slots as §3, `spacing` 3 / 2.6 m). A test checks each segment ≤ 100 triangles.
2. **Line placement in hole data:** `scenery.fences: [{ id, points: [[x, z], …] }]`, laid out as `layFence()` does (a post on every point, legs cut into equal spans ≤ spacing × scale, spans stretched and sheared to the two posts' ground heights, posts sunk 0.1 m). `validateHole` should fail if:
   - the id isn't in the hole's biome set `fences` list (a new optional list in `validateBiomeSet`, like `bigProps`);
   - fewer than 2 points, or a leg shorter than 1 m;
   - any part of any leg comes inside the OB box + 2 m;
   - the total fence length on the hole is over 600 m.
3. **No collider** (owner: look only). The ball can't reach a fence (beyond OB, OB ends the shot); a ball rolling through one after going OB is acceptable, as with big props.
4. **Size tunable:** `FENCE_SCALE` (default **1.5**, owner to confirm on his phone with a `?tune=` compare of 1 / 1.5 / 2), applied to the pieces' size *and* spacing. The OB + 2 m check uses the scaled thickness.
5. **Drawing:** flat-shaded toon, fogged, one merged mesh (or one instanced mesh per part) per look per hole. Scenery trees within 1.5 m of a fence leg are cleared (like big-prop footprints). Small props may stay.
6. **Minimap:** not needed.
7. **QA Light:** the test set at the tee and close-up; fences on a slope (no floating posts, rails meeting both posts); perf-check stays ≤ 300k with a 600 m fence on mtn-07.

## 8. Requests for course designer (after the dev build + the artist's lists)
- On the first Meadow course, try a fence along one OB side or around a small pasture near the windmill (Meadow's notes already mention "cows behind a wooden fence"). Check the hole stays ≤ 300k (`tools/perf-check.mjs`).
