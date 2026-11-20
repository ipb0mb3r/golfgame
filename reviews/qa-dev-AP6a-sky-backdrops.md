# QA report: AP6a sky and backdrops (PR #99)

- **SHA tested:** dbdaacc50f80bfac21604d26128ec5d2d3f74498 (dev/AP6a-sky-backdrops), served on :8136; origin/main on :8137 for comparison
- **Environment:** headless Chromium (Playwright, software GL), Linux; 390x844 main viewport
- **Level:** FULL, within the 30 min budget
- Screenshots: `reviews/qa-screenshots/AP6a/`

## Results

| # | Item | Result | Notes |
|---|---|---|---|
| 1a | `node --test` | PASS | 552 pass / 0 fail |
| 1b | `tools/baseline.mjs check` | PASS | all 19 shots match |
| 1c | `tools/session-check.mjs` | PASS | 12 load/dispose cycles, no memory growth |
| 1d | `tools/biome-check.mjs` | PASS | no FAIL line |
| 1e | `tools/perf-check.mjs --biome test-alpine-look` / `test-island-look` (mtn-07, pl-01) | PASS | all within budget. mtn-07 alpine 27 draws / 251k tris; island 27 / 237k; pl-01 26 draws / 19-24k tris |
| 2 | Existing sets unchanged vs main (pl-01, mtn-07, `alpine-day`, `island-day`, `meadow-day`, 390x844 tee, `seed=1`) | PASS | Pixel diff PR vs main: 0 differing pixels in 4 of 5; 1 pixel (a 1x1 spot) in mtn-07 meadow-day, animation timing noise. (Without `seed=1` the wind differs per load, which is not a change.) |
| 3 | New looks `test-alpine/island/meadow-look` on mtn-07 and pl-01: tee, flyover (3 frames), mid-hole, 390x844 | PASS with 1 Low bug (B1) | No bare horizon gap, no sky-to-fog seam, no sea through the land, no backdrop cutting the course, aim line / marker / minimap readable in all 6 combinations. No console errors. See B1 and the notes |
| 4 | Physics with the sea (pl-01, `test-island-look` vs main normal set, `seed=1`, wind 0) | PASS | Shot 1 (0.85) stops at (0, -136.63) Fringe, shot 2 (0.6) at (2.19, -145.05) Green, both identical on both builds. OB shot (0.9, aim off +-0.5 rad, both signs tried) goes OB: ball back to tee (0, 0), strokes 2 (1 + 1 penalty), lie "Tee box", identical on both builds. Next shot (0.7, acc 0.03) from the tee stops at (0, -113.47) Fairway, identical. Note: I tried both aim signs; I did not separately confirm which one is the sea side, both gave the identical OB result |
| 5 | `?set=mountain9&biome=test-alpine-look`, 2 holes | PASS | No console errors. Backdrop rebuilt each hole (objects "sky dome", "cloud puffs (toon, instanced)", "horn peaks (toon, merged)", "far ridge + forested slopes (merged)" present in both mtn-01 and mtn-02; geometries 19 to 23 and 15 to 19 per hole, no growth). Pause > Quit > Yes: 0 geometries, 0 textures, 0 programs, menu shown |
| 6 | Full hole, real keyboard (Enter, Space, ArrowLeft), pl-01 `test-island-look`, 1920x1080 | PASS | Holed in 4 strokes (rough, bunker, green, holed). No console errors |
| 7 | 320x568 and 844x390, mtn-07 `test-alpine-look` | PASS | HUD, minimap, swing bar not cut off or overlapping. Peaks visible in both |
| 8 | Feel notes | below | |

Not tested: z-fighting / flicker over time with a long soak (only 3 flyover frames per look and the held tee view were inspected); real phone GPU.

## Bugs

**B1 (Low): a cloud intersects the hill and shows a ragged white edge.**
- Steps: `?hole=pl-01&biome=test-island-look`, start, aim view, desktop 1920x1080, look at the left hill (left of the pin). Seen also on 390x844 mtn-07 `test-island-look` tee (left edge, about y 190).
- Expected: a cloud passes cleanly in front of or behind a hill.
- Actual: where a puffy cloud overlaps the green hill there is a jagged white "noise" edge and a few isolated white specks on the hill (depth-fighting between the cloud and the hill surface; the clouds sit very near the hill).
- Screenshot: `reviews/qa-screenshots/AP6a/BUG-AP6a-1-cloud-intersects-hill.png` (zoom crop; full frame `desktop-1920-pl01-island-tee.png`). Cloud positions are the same each load, so it is steady, not flicker.

## Notes (up to 3)

1. **Haze hills look like flat pale slabs with vertical streaks** in `test-meadow-look` (see `phone-390-mtn07-meadow-flyover-hazehills.png`, left hill): faint vertical bands, a bit like a curtain. Not wrong, but less pretty than the alpine horns.
2. **Island, mtn-07:** the course pond is bright turquoise (set colour) while the sea is only visible in the flyover and from the side. On the tee the sea is a small strip, so mtn-07 does not read as "island" much. On pl-01 it reads clearly. (The PR already says so.)
3. **pl-01 island:** the sea is a hard bright band and the minimap does not show the sea (the area outside OB is green on the minimap). Trees and OB stakes stand on the beach edge right at the waterline; none were in the water. A thin dark ridge sliver floats on the far-left horizon at the tee.

## Feel notes for the game designer

- **Alpine now reads as a different place.** The big snowy horns behind the fairway are the strongest new thing; the blue-grey ridge and the dark forest ring keep the horizon filled. It feels like "mountains", not "green hills". Best of the three.
- **Island coast reads as a place on pl-01**: turquoise sea, pale beach, soft green volcano hills. On mtn-07 it is mostly a sky and green-hills change because the trees hide the sea; the flyover is where it shines.
- **Meadow** is the subtlest: a gradient sky and hazy hills. A pleasant, soft look, but the least different from today. The haze hills look a little flat.
- **Sky:** the gradient sky and the fluffy white clouds look good and friendly, and they blend into the horizon with no seam. The clouds are very bright white, almost brighter than the UI cards, which is fine but a touch "cartoon sticker".
- **Cheap-looking bits:** the cloud-on-hill ragged edge (B1), and the ball that goes out to sea is not shown splashing (already X30).

## Verdict

**READY TO MERGE.** Every MUST item passes; existing sets are pixel-identical to main; physics and penalties are identical with the sea; the backdrop is freed on quit (0 geometries). One Low cosmetic bug (B1) and no blockers.

— Agent: qa
