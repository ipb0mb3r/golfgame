# AP6a: the artist's notes (2026-11-20)

Relayed by the PM from the artist's session, for the AP6a dev ("quick visual wins"). The mock-ups in `docs/art/{style-r2,alpine,island}/mockup.html` show all of these working.

## Gradient sky (palette keys `skyTop`, `skyHorizon`, `fog`, `cloud`)
- Dome: colour = mix(skyHorizon, skyTop, pow(clamp(dir.y × 1.9, 0, 1), 0.62)): a pale band over the lowest ~10–15° and full skyTop from ~30° up (see the style-r2 mock-up shader).
- Keep `fog` close to skyHorizon so there is no seam at the horizon.
- Clouds: flat-bottomed puffs of 4–6 low spheres, toon 3 bands, colour = `cloud` with emissive ~0.7 so they stay bright white (a sunset tints them through `cloud`). Unaffected by fog, high (y 400–900), far (2.3–2.9 km), 7–9 groups.

## Horn peaks (Alpine; reference: `hornPeak()` in `docs/art/alpine/mockup.html`)
- 1 hero horn + 5–6 smaller horns, a low far ridge behind, and dark forested slopes in front (`backNear`, no snow).
- Each horn: a 5–6 sided pyramid in 7 rows, radius r·(1−t)^1.25 with ±20 % jitter per vertex, summit leaning by hook·r·t², flat shaded (toon).
- The owner wants them WIDE: hero h 1150 / r 780 / hook 0.26 at ~3 km; others h 600–820, r 820–920.
- Snow (`backCap`) above snowLine (hero 0.55, others 0.36, ±0.08 wobble) and on flatter faces (|normal.y| > 0.58 and t > 0.22). Rock = `backFar` mixed 30–55 % toward #34465E for faceted variety. Everything mixed 12 % toward fog.
- ~80 triangles per horn, a handful of draw calls.

## Ocean (Island coast)
- A deep sea plane (`waterDeep`) to the horizon on the sea side(s), plus 2 shore bands: mid = mix(water, waterDeep) ~250 m wide, shallow = `water` ~110 m wide right at the beach.
- Terrain beyond OB on the sea side slopes down below sea level over ~30 m, so the beach meets the water naturally. The ground just beyond OB on that side is sand, with lava `rock` patches at the waterline.
- Which side is sea should be hole data (e.g. `scenery.seaSide: 'left' | 'far' | 'left+far'`). The owner wants "the course follows the ocean".
- Backdrop extras, tinted: one green volcanic ridge with soft round tops (`backFar`, haze ~0.18), and optionally a low far island (`backNear`). Resort towers later (6–10 fogged cream/glass boxes far across the bay).
- No lighthouse (owner: kept for a future Cape Cod set).

## Far hills tint (Meadow / mountain sets)
- `backNear` for the near ring and `backFar` for a far ring, mixed toward fog by distance (~10 % near, ~22 % far). The base of each layer fades further into fog (+45 %) so the hills sit in the haze.

## PM notes for the dev
- **Physics:** the "terrain beyond OB slopes below sea level" idea must not change where any ball stops (v1/v2 unchanged). Do it in the drawn mesh / backdrop only, or prove that `heightAt` beyond OB never affects a shot, and ask the PM in the PR if unsure.
- **`seaSide`:** it's hole data. For AP6a, a biome-level default (e.g. `backdrop: 'ocean'` puts the sea beyond the far end and one side) plus an optional hole override is enough; the course designer sets it per hole later.
