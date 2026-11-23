# QA report: AP6 textured ground (PR #125)

- SHA: 9e47eded8f320a332f4dbd6798ea71ef524b23c7 (branch dev/AP6-ground-texture)
- Level: LIGHT, one viewport 390x844 (Playwright Chromium, software GL, so headless fps is meaningless)
- Main compared at origin/main (archive copy, run in a scratch folder)
- Not run (as instructed): menu-check, node --test (PM ran 602 pass), baseline, session-check

## Results

| # | Item | Result | Notes |
|---|---|---|---|
| 1 | mtn-04 on meadow-day, alpine-day, island-day load with the new ground, no console/shader errors | PASS | No shader or page errors on any of the three. Only message: Chromium "GPU stall due to ReadPixels" driver notice (software GL, harmless). Fairway stripes, rough speckle and the creek bank are visible in the tee/flyover view (meadow and alpine looked at; island loaded clean but was not looked at by eye). Bunker lip and tree shadows not checked at close range (NOT TESTED in detail). |
| 1b | &tune=GROUND_DETAIL:0 looks like main | PASS | Flat painted look, the "TUNED" badge shows; only the old mowing bands. |
| 2a | Putting h1-green, new vs GROUND_DETAIL:0 | PASS | Aim dots, hole, flag and "Slope: Flat" readout identical in both; stripes are low contrast and do not fight the yellow dots. |
| 2b | Putting on a mountain green (mtn3-tilted-putt), new vs 0 | PASS | Slope line "Downhill 3% breaks left", aim dots and hole equally readable. New ground adds stripes across the green; the tree shadow and creek bank look better. The "Read" button was not opened (NOT TESTED), so the slope-grid overlay was not compared. |
| 3 | Minimap still reads | PASS | Fairway, green, bunkers, water distinct on h1, mtn-03 and mtn-04. Fairway stripes are gone from the minimap at the default level (PM accepted this). |
| 4 | perf-check, all holes, within budget | PASS | Output below |
| 5 | Feel | see below | |

### perf-check summary (this branch, default biomes)
```
Budget (PERF_BUDGET): draw calls <= 150, triangles <= 300k, graphics memory <= 64 MB, textures <= 512 px.
hole   | tee off | tee draws | tee tris | peak draws | peak tris | geo | tex | gpu MB (geo+tex) | over budget
pl-01  | 1.7 s | 24 |  28k | 21 |  27k | 21 | 3 | 10.3 | ok
pl-02  | 3.5 s | 25 | 173k | 17 | 172k | 22 | 3 | 23.2 | ok
pl-03  | 3.2 s | 21 | 117k | 15 | 116k | 22 | 3 | 17.4 | ok
mtn-01 | 3.5 s | 24 | 187k | 17 | 186k | 21 | 3 | 13.3 | ok
mtn-02 | 3.3 s | 20 | 157k | 17 | 156k | 21 | 3 | 14.1 | ok
mtn-03 | 2.5 s | 24 | 107k | 21 | 106k | 21 | 3 |  7.5 | ok
mtn-04 | 4.2 s | 24 | 238k | 17 | 238k | 21 | 3 | 19.2 | ok
mtn-05 | 4.5 s | 20 | 185k | 17 | 184k | 21 | 3 | 17.0 | ok
mtn-06 | 2.5 s | 25 |  96k | 21 |  95k | 22 | 3 |  7.1 | ok
mtn-07 | 4.4 s | 25 | 258k | 17 | 257k | 22 | 3 | 17.1 | ok
mtn-08 | 3.2 s | 24 | 147k | 17 | 146k | 21 | 3 | 10.5 | ok
mtn-09 | 5.1 s | 21 | 247k | 17 | 246k | 22 | 3 | 24.1 | ok
Every hole is within budget.
```
Tee-off time vs main (same machine, run separately, one run each): mtn-04 3.0 s on main, 4.2 s here (+1.2 s); mtn-09 3.8 s on main, 5.1 s here (+1.3 s). Draw calls and triangles are unchanged. Graphics memory is higher (mtn-09 24.1 MB; textures 1 on main, 3 here; painted map 232 px on main, 2320 px here). Consistent with PM's X40. Software-GL timing, so a real phone will differ; the owner should note the wait on his phone.

## Bugs
None found. Observation (Low): tee-off wait grows by about 1.2 s on the big mountain holes; already backlog X40.

## Feel notes for the game designer
1. Against the style-r2 approach picture: the fairway now has wide light and dark mowing bands and a darker rough edge, much closer to the reference than the flat look on main. The creek has a visible bank and the trees sit on the ground with soft shadows.
2. On a phone-size screen the stripes are the strongest new thing. In stills they are calm. I could not judge shimmer or moire while the camera moves (screenshots only), so the owner should watch the stripes during the flyover and while aiming.
3. The bands run across the putting green too. They stay faint enough that the aim dots and the pin remain easy to follow, but a strongly sloped green plus stripes is the case to watch.
4. The minimap is simpler (no stripes) and clearer for layout.

## Verdict
READY TO MERGE (for the owner's playtest). Open points for the owner: tee-off wait on a real phone, and stripe shimmer in motion.

Screenshots: reviews/qa-screenshots/AP6-phone-mtn04-meadow.png, AP6-phone-mtn3-putt-new.png, AP6-phone-mtn3-putt-g0.png

— Agent: qa
