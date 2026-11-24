# Cow: build spec (owner picks 2026-11-24)

A chunky, round, toy-like black-and-white cow for the fenced pastures beyond OB (Meadow course plan: holes 4 and 7). It is built **once** in the shared library and coloured by palette slots. Cows are **look only**: no collider, never in play. They stand or graze, bob their heads and swish their tails.

It reuses the **big props** system (`LIBRARY.bigProps`, `scenery.bigProps`, the set's `bigProps` list, the per-piece `size`, the OB + 5 m check from `docs/art/big-props/SPEC.md` §4 / §6). There are two small additions: a `pose` and a `pattern` per cow (§4), and the animation (§5).

The reference geometry is `docs/art/cow/pieces.js` (`COWS.C`). It uses the big-props part format (`{ positions, indices, w, lo, hi }`, colour = mix(slot lo, slot hi, w)), plus a `group` on each part: `body`, `head` (turns about the neck) or `tail` (turns about the tail root). Units are metres, with the feet centre at the origin and the nose facing +z. The mock-up page is `cow.html?opts=A,B,C&far=0&scale=1.5`, `cow.html?opt=C&poses=1`, `cow.html?opt=A&scales=1,1.5,2&far=only` or `cow.html?opts=C&scale=2&cols=1`.

The owner's reference was a round, smiling cartoon cow (classic black and white, chunky, toy-like). The design here is our own: a low-poly ball body with face-painted patches, a red strap and a yellow bell in the biome's own accent colours. It has no nose ring and no blue collar.

— Agent: artist

| Image | What |
|---|---|
| `01-cow-options.jpg` | A round toy cow · B barrel cow · **C big-head cow with a bell (chosen)**, at 1.5×, standing + grazing, next to a 1.8 m golfer |
| `02-poses-and-bob.jpg` | A at 1×: standing, grazing, a head-bob frame, and grazing with the head up and the tail swished. The 3 patch layouts. |
| `03-herd-sizes.jpg` | a herd of 4 in a 1.5× rail-fence pasture at 1× / 1.5× / 2×, seen from the rough (~35 m) |
| `04-chosen-c-2x.jpg` | **the pick: C at 2×**, a close-up and the herd in its pasture |

## 1. The owner's pick
| Piece id | Look | Mock-up | Triangles | Size at 1× (× 2 in game) |
|---|---|---|---|---|
| `cow` | C · big-head cow with a red strap and a yellow bell | `COWS.C` | **624** (body 240, head 352, tail 32) | 1.4 × 2.2 m, 1.75 m tall (→ 2.8 × 4.5 m, 3.5 m tall) |

- **Owner decisions:** C, the classic black and white. "Chunky and toy-like", **fairly big: 2×**. **3–4 cows per pasture**, standing or grazing. A **head bob and a tail swish**. Look only.
- A and B stay in `pieces.js` as alternatives (A = C without the bell, with a smaller head).

## 2. Shape in words
- **Body:** a near-ball (radii 0.64 × 0.58 × 0.74 m, centre 0.9 m up), 12 around × 6 bands = 120 faces.
- **Patches:** the black patches are **painted on the body's own faces**: each face has its own 3 vertices and is either all coat or all patch. They cost no extra triangles and read as crisp low-poly patches. There are **3 patch layouts** (`PATCHES` in `pieces.js`), each with a black patch over one eye or the crown of the head.
- **Legs:** 4 short 5-sided legs (r 0.14 m) with a dark hoof (0.13 m).
- **Head** (group `head`, pivot = the neck at (0, 1.1, 0.6)):
  - a neck blob joining it to the body in every pose;
  - a big round head (0.48 × 0.42 × 0.42);
  - a **wide pink muzzle** with two small dark nostrils;
  - two dark oval eyes high on the face;
  - flat ears, pink in front and black behind;
  - two short cream horns turned outward;
  - a **red strap** round the neck with a **yellow bell** under the chin.
- **Tail** (group `tail`, pivot = the top of the rump): a thin 4-sided tail, 0.62 m long, with a dark tuft.
- **Grazing pose:** the neck pivot drops 0.42 m and moves 0.12 m forward, and the head tips down 1.15 rad until the muzzle is just above the grass.
- Flat-shaded toon (crisp faces), the scene's 3-band ramp, fogged like the scenery. Double-sided, like the other props (small ear and muzzle blobs overlap).

## 3. Material slots → palette keys
| Slot | Palette key | Meadow value | Notes |
|---|---|---|---|
| `coat` | **`cowCoat`** (new) | `#f6f1e4` | warm white, a touch brighter than `propSnow` |
| `patch` | **`cowPatch`** (new) | `#2f3134` | soft charcoal (not pure black), also eyes, nostrils, hooves, the tail tuft, the back of the ears |
| `nose` | **`cowNose`** (new) | `#f1a39b` | the pink muzzle and the front of the ears |
| `horn` → `hornTip` | `lip` → `propSnow` | | cream horns, lighter at the tip |
| `strap` | `accent` | brick red | the flag colour |
| `bell` | `subAccent` | buttercup yellow | the tee-marker colour |

The three new keys are **optional palette keys** like `propWood` (X50, `OPTIONAL_PALETTE_KEYS`). A set without them uses the fixed defaults above, so no other set has to change. Only Meadow lists the cow for now. On a later biome, the strap and bell take that set's `accent` / `subAccent`, and the coat could be repainted per pick (X33), e.g. an all-brown Alpine cow: `{ id: 'cow', slots: { coat: 'trunk', patch: 'trunkAlt' } }`.

## 4. Placement (course designer)
In `scenery.bigProps`, like a windmill, with two optional fields:

```js
scenery: {
  bigProps: [
    { id: 'cow', x: 52, z: -10, turn: -2.2, pose: 'stand', pattern: 0 },
    { id: 'cow', x: 60, z: -22, turn: -1.1, pose: 'graze', pattern: 1 },
    { id: 'cow', x: 54, z: -36, turn: -0.6, pose: 'graze', pattern: 2 },
    { id: 'cow', x: 68, z: -14, turn: 2.6 },   // pose 'stand', pattern 0 by default
  ],
}
```

- **pose:** `'stand'` (default) or `'graze'`. **pattern:** `0`, `1` or `2` (the patch layout, default 0). Mix both in a herd so no two neighbours look alike.
- **Where:** **inside a fenced pasture** beyond OB (the fence SPEC §4). Every cow is at least **5 m outside the OB line** (the big-props rule) and **at least 3 m (scaled footprint) from any fence leg**, so no cow pokes through a rail. Turn them different ways, mostly side-on or facing the course.
- **How many:** **3–4 per pasture** (owner), up to **6 per hole**.
- **Size:** `size: 2` in the library (owner: 2×). `scale` per cow between 0.9 and 1.1, for a little variety.
- **Cost:** 624 triangles each. A herd of 4 is ~2.5k, 6 cows ~3.7k (≈ 1 % of the 300k phone budget). On a heavy hole (X47: `meadow-day` is near 300k on long holes; plan holes 4, 7, 9), run `tools/perf-check.mjs`. If needed, use 3 cows or drop some fence or trees.
- **Recommended:** keep hand placement (above) rather than a new "herd" format. The course designer already places big props this way, it is easy to read, and a herd is only 3–4 lines. A later "scatter N cows inside this fence" helper is possible, but it isn't needed now.

## 5. Animation (owner: head bob + tail swish)
| Motion | What | Suggested values | Cost |
|---|---|---|---|
| **Head bob** | the `head` group pitches about the neck pivot | standing: a slow nod ±0.10 rad every ~4 s; grazing: a "munch" dip ±0.18 rad every ~2.5 s, with the head lifting fully (−0.6 rad) now and then for ~1.5 s | 1 matrix per cow per frame |
| **Tail swish** | the `tail` group swings sideways (about z at the tail root) | ±0.45 rad, a quick swish of ~0.8 s, then a 2–5 s pause | 1 matrix per cow per frame |

- Every cow gets its **own phase** (from its index or position), so the herd never moves in step.
- The motion is gentle, with eased curves (sine), never jerky.
- Only animate while the cow is on screen and closer than ~200 m. Far away, the motion can't be seen.
- **Cost:** with ≤ 6 cows that is ≤ 12 small matrix updates per frame: nothing on a phone. A vertex-shader version (a uniform time plus a per-instance phase) is also fine if the dev prefers.
- `pieces.js` shows the same moves as inputs: `build({ bob, swish })` (`02-poses-and-bob.jpg`).
- If a reduced-motion setting is added later, cows hold still when it is on. There is none today.

## 6. Visibility and draw calls
- Drawn as far as the scenery (fog takes it).
- **Draw calls:** instanced by part group and patch layout: body, head and tail × the patch layouts used on the hole. That is at most 9, typically 4–6 for a herd. To save calls, the dev may put the 3 layouts in one geometry with a per-instance offset, or give the patch colour to the instance. The look must stay the same.
- **Minimap:** not needed.

## 7. Done when
- `cow` is in `LIBRARY.bigProps` with `tris` 624, `size` 2, `scale` [0.9, 1.1], `slots` as §3, a `desc`, and its shape matching `COWS.C` (the dev may tidy the code; the numbers stay). The existing big-prop test (≤ 1,500 triangles) covers it.
- The dev test set (`test-big-props`) shows a herd of 4 (2 standing, 2 grazing, 3 layouts) in a rail-fence pasture beyond OB, matching `04-chosen-c-2x.jpg`, with the head bob and the tail swish running.
- Then the artist adds `'cow'` to Meadow's `bigProps` list, and the course designer places herds on Meadow holes 4 and 7.

## 8. Requests for dev / QA
1. **The cow piece:** add `cow` to `LIBRARY.bigProps` from `COWS.C` in `pieces.js`: the 3 part groups (`body`, `head`, `tail`) with their pivots, the 3 patch layouts, the slots of §3, and `size` 2, `scale` [0.9, 1.1], `tris` 624.
2. **Three optional palette keys:** `cowCoat` `#f6f1e4`, `cowPatch` `#2f3134`, `cowNose` `#f1a39b`, added to `OPTIONAL_PALETTE_KEYS`. They need fixed default colours, not another key, because no palette key is near-black or pink.
3. **Placement fields:** `pose` (`'stand'` | `'graze'`) and `pattern` (0–2) on a big prop. `validateHole` should fail if:
   - either field is used on a piece other than `cow`;
   - a pose or pattern is unknown;
   - a cow's scaled footprint comes within 3 m of a fence leg;
   - a hole has more than 6 cows.
4. **Animation** as §5: the head bob and the tail swish, a per-cow phase, and off when far or off screen. Put the speed and size of each move in `?tune=` so the owner can adjust them on his phone.
5. **No collider** (look only), as for every big prop.
6. **QA Light:** check the test set close-up and from the fairway:
   - grazing heads reach the grass without sinking into it;
   - no cow pokes through the fence;
   - the motion looks smooth and out of step;
   - perf-check stays ≤ 300k with 6 cows + a 600 m fence on mtn-07.
