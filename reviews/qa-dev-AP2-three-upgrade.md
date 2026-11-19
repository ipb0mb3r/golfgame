# QA report: AP2 (PR #84), Three.js r160 -> r187 + model loaders

- **SHA tested:** af78b6ea44c9d188f3f469f61ffac94661aa3051 (dev/AP2-three-upgrade), served on :8128. Comparison: main 46d60a5 on :8129.
- **Environment:** headless Chromium (Playwright, software GL), Node 22, Linux. Level: FULL. About 25 min.
- **Method for visual sameness:** same seed (`?seed=7`), same ball position, screenshots of both builds, pixel diff done in a canvas (count of differing pixels, max channel delta).

## Results

| # | Item | Result | Notes |
|---|---|---|---|
| 1a | `node --test` | PASS | 520 pass, 0 fail |
| 1b | `tools/baseline.mjs check` | PASS | all 19 shots match |
| 1c | `tools/session-check.mjs` | PASS | 12 load/dispose cycles, no growth; GLB step: cube.glb and cube-meshopt.glb load, draw, free (0 geometries after) |
| 1d | `tools/perf-check.mjs` | PASS | every hole within budget. Draw calls identical to main on all 12 holes (I ran main too). Triangles -1 to -4k |
| 2a | Visual: pl-02 tee, mid-hole, putt read | PASS | tee 0 px differ, mid 0 px, putt 210 px (flag wobble phase, see below) |
| 2b | Visual: mtn-07 tee, mid-hole, putt | PASS | tee 1 px (delta 20), mid 0 px, putt 71 px (flag) |
| 2c | Flight camera mid-flight (pl-02, mtn-07) | PASS | 0 px differ on both |
| 2d | Flyover, one frame (pl-02, mtn-07) | PASS (by eye) | the flyover runs on the real clock, so the frames are at slightly different points of the move and a pixel diff is not meaningful. Looked at them side by side: same sky, grass stripes, water, trees, shadows, minimap |
| 2e | Aim line, landing marker, minimap, putt grid (Read), impact-point ball icon, colours, lighting, shadows | PASS | putt grid view on pl-02: identical except the flag angle (8k px, mostly faint anti-aliasing on the dotted line and the flag angle; max delta 130, only 154 px over 16). Impact ball icon is shown bottom right (pl-03 debug shot, tee view; the putt-view tee shots of both builds are 0 px apart); not compared against main on an off-centre impact |
| 2f | Flag wobble (FL1) | PASS | flag still waves. Its angle differs between two screenshots only because of the real-time phase. Same in main between two runs |
| 3a | Console: menu | PASS | no errors or warnings |
| 3b | Console: `?set=mountain9` 2 holes | PASS | no errors or warnings |
| 3c | Console: `?hole=pl-03&debug=1` plus a shot | PASS | collider outlines on (`collidersShown` true), no errors or warnings |
| 3d | Console: `?debug=perf` | PASS | no errors or warnings |
| 4 | WebGL2 off shows friendly message | PASS | with `WebGL2RenderingContext` deleted before load: the intro card shows a red "Your browser can't show 3D graphics (WebGL), so the game can't start" box and a disabled "Can't start" button. With `getContext('webgl*')` returning null: the same card with the other wording ("WebGL is off or not supported"), the Three.js error is logged in the console (expected). Not a blank page either way |
| 5 | Full hole, real keyboard, pl-01, 1920x1080 | PASS | Space x3 per stroke, A to aim, V to change view. Holed in 3 strokes, no console errors or warnings |
| 6a | 320x568 mtn-07 tee | PASS | 0 px differ from main, HUD fits |
| 6b | 844x390 mtn-07 tee | PASS | 0 px differ from main |
| 7 | Pause, Resume, Restart hole, Quit to menu | PASS | pause menu shows Resume / Restart hole / Quit to menu / Quit round / Keep playing. Resume keeps the stroke count (1). Restart resets to stroke 0 at the intro. Quit goes back to the menu (Practice list shown) |

## Bugs

None found.

## Notes

1. **Headless console noise is not a bug:** Chromium prints "GL Driver Message ... GPU stall due to ReadPixels" on the first page of a browser process, in either build (I swapped the order to check; it follows the first page, not the build). I filtered it from the console checks above. Main shows it too.
2. **Flyover and flag cannot be pixel compared** because they run on the real clock. Everything on the fixed-clock views (tee, mid-hole, flight, 320 and landscape) is pixel-identical or within one pixel.
3. Headless fps is 3 to 26 (software GL) on every hole, as on main. Not a regression, and not a real-phone number.

## Feel notes for the game designer

- The game looks and plays the same as before. The grass stripes, the sky, the water, the shadows and the colours are unchanged. I could not tell the two builds apart by eye.
- The putt read view and the yellow dots to the hole are as before. The flag still waves.
- The shot keyboard flow (Space, Space, Space) feels the same. The hole was done in 3 strokes with no hitch.
- On a very small phone (320x568) the HUD card and the minimap still fit and do not overlap the aim line.

## Cleanup

The http servers on :8128 and :8129 were started by me and are killed at the end (see the PM message if a kill was blocked).

## Verdict

**READY TO MERGE.** No difference from main found, all MUST items pass.

— Agent: qa
