# QA report: AP1 "Fewer draw calls" (PR #77)

- **SHA tested:** `fca8bdb3aaaf41e4988a9025a9cb6a1eb00144a7` (branch `dev/AP1-draw-calls`), compared against main `ae014ef` (each served from its own worktree, ports 8125 and 8126)
- **Level:** FULL. **Environment:** headless Chromium (Playwright, software GL, so about 3 fps; physics and results do not depend on it), Node 22. Browser checks run one after the other.
- **Seed:** every comparison used `?seed=7` on both builds, tee view after Skip of the flyover and after the camera settled.

## Table

| # | Item | Result | Notes |
|---|---|---|---|
| 1a | `node --test` | PASS | 469 pass, 0 fail |
| 1b | `tools/baseline.mjs check` | PASS | 19/19 shots match |
| 1c | `tools/perf-check.mjs` | PASS | Tee draw calls 20 to 25 on all 12 holes (limit 150); flyover peak 15 to 21. Triangles stay over budget on 7 holes (pre-existing, AP1b). 0 over on draw calls, tex px or gpu MB. |
| 2 | Visual sameness 390x844, tee view of pl-01, pl-02, mtn-04, mtn-07, mtn-09, this build vs main | PASS | Pixel diff vs main: 0 to 2 pixels differ by more than 12/255 per image (cloud drift / one-pixel noise), so the images are identical to the eye. Tree shades, boulders, OB stakes, hills, clouds, tee markers and flag look the same. Side by side: `reviews/qa-screenshots/AP1/390x844-mtn-07-main-vs-ap1.png`. Only the tee view and one mid-course view were compared; boulders and stakes up close were not compared separately. |
| 2b | Extra: mid-course view (ball placed 180 m down mtn-07 and pl-02), main vs AP1 | PASS | 1 pixel and 0 pixels differ. |
| 3 | Trees still block the ball (mtn-07, `__golf` scripted) | PASS | 12 shots aimed at trees from 25 m (mtn-07) plus 8 long shots on mtn-07 and mtn-04: every rest point is identical to main to 0.01 m. The last tree gave "Into the trees!" on both builds, ball stopped at (-55.20, -45.60) on both. Core is untouched by the PR (only `src/core/perf.js`). |
| 4 | `?debug=1` draws the collider outlines | PASS | `collidersShown` true; red trunk, yellow leaf outlines visible on mtn-07 (`390x844-debug1-mtn-07-main-vs-ap1.png`). Draw calls on pl-03 debug: 24 (main 62). Overlay on mtn-07 shows "28 (incl. <= 3 debug outlines)". |
| 5 | Hole transitions in `?set=mountain9`, quit to menu | PASS | Played holes 1, 2, 3 to the cup (5, 5, 9 strokes), pressed Next hole each time. Each new hole card showed only its own hole (screenshots checked), geometries 13 to 24 (no growth, not accumulated). Pause, Quit round: main menu opens, `playing` false, renderer geometries 0 / textures 0. 0 console errors. |
| 6 | One full hole, real keyboard, pl-01, 1920x1080 | PASS | Space to tee off, Space for the three meter clicks, arrow keys, Space to skip the flight: holed in 9 strokes (my meter timing was rough). 0 console and page errors. |
| 7 | 320x568 and 844x390 tee views of mtn-07 | PASS | Nothing missing; both are pixel-identical to main (2 pixels differ). Screenshots in `reviews/qa-screenshots/AP1/`. |
| 8 | `debug=perf` overlay | PASS | fps shows red at 3 fps (below 30); "map (AP6) 2044 px" is a separate grey line, "max tex px" shows 0 in green; "screen ≈ 11.3 MB" line present, unrated. Amber (30 to 55 fps) could not be seen: headless software GL never lands in that band. NOT TESTED for amber. |

Screenshots (one per viewport): `390x844-mtn-07-main-vs-ap1.png` (left main, right AP1), `320x568-mtn-07-ap1.png`, `844x390-mtn-07-ap1.png`, `1920x1080-pl-01-ap1.png`, plus `390x844-mtn-07-mid-course-main-vs-ap1.png` and the debug side by side.

## Bugs

None found.

## Notes (up to 3)

1. For the game designer: nothing changed in how it looks or plays. I compared trees, hills, clouds and the tee marker pixel by pixel against main and they match; ball rest points on tree shots match to a centimetre.
2. Triangles went up 15 to 30k (as the dev said; the overlay will show it on the phone). Draw calls are now 20 to 25. Worth a look on the real phone: the owner's feel of the mountain holes, since the headless run cannot measure frame time.
3. The amber fps colour and the real phone frame time were not testable here (software rendering).

## Verdict: **READY TO MERGE**

— Agent: qa
