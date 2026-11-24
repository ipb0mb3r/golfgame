# Course plan: Buttercup Meadows, front nine (holes 1–9 of 18)

> Proposed by the course designer, **approved by Alexis (owner) on 2026-11-24** (text-only talk, kept cheap on purpose). Biome set: `meadow-day`. Built from `docs/HOLE_GUIDELINES.md` and `docs/GENRE_NOTES.md`. Hole ids `mdw-01` … `mdw-09`. Details (exact shapes, hazards, green slopes) are settled in each hole's PR; Alexis plays and comments on each one. The back nine (holes 10–18) gets its own plan later.

## The course (owner)
- **Name:** "Buttercup Meadows" (working name, owner likes it "for now").
- **18 holes**; this plan covers the **front nine**. The back nine will be **harder**.
- **No big idea or gimmick** (owner): "this is a field course with some windmills". Unlike the mountain prototype (the creek), there is no signature hazard; variety comes from the hole shapes, the hills and a few ponds.
- **Ramp:** holes 1–3 are **relatively flat, without being literally flat** (gentle rolls, shaped surroundings). From hole 4 on, **bigger hills and water** come in. Not too hard: the front nine peaks at difficulty 3.
- **Trees:** the Meadow set's trees as they are (round trees and conifers along the fairways, a few in play).
- **Fences** along the OB side are OK. **Pastures** beside some holes (4 and 7), fenced, beyond OB, for **cows later** (the cow piece doesn't exist yet: the set's `bigProps` is only `windmill`; the pasture is built now, cows added when the artist makes them).
- **Tournament props** (tent, feather flags, bench) on **holes 1, 2 and 3**, then light. Hole 18 gets the full dressing as the course's last hole.
- **Windmills** high on hills beyond OB, seen from the tee or the approach, never hiding a shot.

## The plan

| # | Id | Par | Length | Shape | Diff. | Green |
|---|---|---|---|---|---|---|
| 1 | mdw-01 | 4 | ~350 m | Straight, gentle rolls, N | 1 | Big, gentle tilt |
| 2 | mdw-02 | 4 | ~340 m | Curves **left** around a group of trees, E | 1 | One clear slope |
| 3 | mdw-03 | 3 | ~150 m | Simple, slightly raised green, S | 1 | Wide, gentle |
| 4 | mdw-04 | 5 | ~480 m | First real hill: down into a valley, up to the green, W | 2 | Raised |
| 5 | mdw-05 | 4 | ~370 m | Dogleg **right** around a pond, N | 2 | Two-tier |
| 6 | mdw-06 | 3 | ~175 m | Downhill from a raised tee over a dip, E | 2 | Water short-right |
| 7 | mdw-07 | 4 | ~400 m | Along the side of a big slope, S | 3 | Tilts hard (first tricky green) |
| 8 | mdw-08 | 4 | ~300 m | Short, uphill to a hilltop green, W (breather) | 2 | On the hilltop |
| 9 | mdw-09 | 5 | ~520 m | Curves **left** around the lake, N | 3 | By the water, a little raised |

| # | Safe line | Hero line | Props (outside play) |
|---|---|---|---|
| 1 | Centre/left of the wide fairway | Right side near the tree line, better angle in | Full tournament tee (tent, flags, bench); 2 flags behind the green; a windmill on the far hill behind the green |
| 2 | Out to the right, mid-iron in | Cut close to the trees inside the bend, wedge in | Lighter tournament tee (tent + 2 flags); fence along the OB side |
| 3 | Middle of the wide green | At the pin near a bunker (front-left, right) | Bench + 2 flags at the tee; flags beside the green |
| 4 | Lay up left of the pond on shot 2 | Long 2nd shot past the pond, reach in two | Fenced **pasture** on the left hillside beyond OB (cows later); a windmill above it |
| 5 | Around the pond, longer approach | Carry the pond's corner, short iron in | Trees and fences only |
| 6 | Wide bail-out left (bank, a bunker) | At the pin, water short and right | **Two windmills** on the hill behind the green (the postcard view) |
| 7 | Middle/right: the slope feeds right toward rough and bunkers | Up the high left side: flat lie, clear look | Second fenced **pasture** on the right beyond OB |
| 8 | Iron to the flat at the foot of the hill, wedge up | Driver up the slope near the green; deep bunkers cut into the hill if short | A windmill right behind the green (aim point) |
| 9 | Three shots up the right | Carry part of the lake on shot 2, reach in two | 2 flags beside the green; a windmill across the lake |

## Checks against the guidelines
- **Par 36:** 2 par 3s (3, 6), 5 par 4s (1, 2, 5, 7, 8), 2 par 5s (4, 9). No par 3 at hole 1 or 9.
- **Lengths** inside the ranges (par 3 120–210 m, par 4 285–440 m, par 5 460–550 m). Par 5s are reachable in two only on the hero line.
- **Pacing:** 1–3 gentle and fairly flat (diff. 1), 4–6 introduce hills and water (2), 7 the first test (3), 8 a breather (2), 9 the front-nine finale (3). No two jumps in a row.
- **Shapes:** straight (1), curve left (2, 9), dogleg right (5), uphill short par 4 (8), side-slope hole (7). Directions rotate N, E, S, W.
- **Water** only from hole 4, always on the hero side with a dry way around (4, 5, 6, 9). No forced carries.
- **Greens:** a mix: gentle (1, 3), one slope (2), raised (4, 8, 9), two-tier (5), hard tilt (7).
- **No blind shots:** the uphill holes (4, 8) keep the green in view from the landing areas; the raised tee on 6 shows the whole hole; windmills and props stay out of every shot's line.
- **Engine features only:** no new mechanic or piece is needed (cows are art, waiting on the artist; the pastures are fences).

## Building notes
- **Phone budget ≤ 300k triangles per hole** (`node tools/perf-check.mjs`); X47: `meadow-day` is heavy on long holes, so check every hole, and on a heavy one (likely 4, 7, 9) use fewer trees, props or fence.
- Props follow `docs/art/big-props/SPEC.md` §4, `docs/art/fence/SPEC.md` §4, `docs/art/tee-props/SPEC.md` §4 and `docs/art/bench/SPEC.md` §4.
- A course playlist `meadow` / "Buttercup Meadows" goes in `sets.js` once the first holes exist (front nine first, 18 later).

— Agent: course-designer
