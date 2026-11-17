# QA report: PR #31 "Feel pass 3: honest flag for long clubs, chip-range aim, debug overlay" (`dev/feel-pass-3`)

| | |
|---|---|
| **Commit tested** | `b151d06ef7e1c398176f3464b68dfc6ea6d1d106` (branch head, push 1 adds `CHIP_FLAG_SHORT`) |
| **Level** | LIGHT (budget 15 min). Time spent: about 17 min |
| **Viewport** | Phone portrait 390x844 (touch, DPR 3), plus 667x375 for X11 as asked. Desktop 1920x1080 was **not tested**: this run was phone-portrait only, as requested |
| **Environment** | Headless Chromium 153 (Playwright 1.63), SwiftShader WebGL, Node v22.23.4, `python3 -m http.server`, vendored Three.js |
| **Tasks** | S15, S19 (+ `CHIP_FLAG_SHORT`), X11 |

## PASS / FAIL / NOT TESTED

| # | Item | Result | Notes |
|---|---|---|---|
| 1 | `node --test` | **PASS** | 217 pass, 0 fail |
| 1 | `node tools/baseline.mjs check` | **PASS** | All 19 v1 shots match (no exceptions needed) |
| 1 | `node tools/record-baseline-v2.mjs --dry` | **PASS** | All 40 shots replay exactly |
| 2 | **S15** long club at the ⚑, calm air: flat and sloped ground | **PASS** | Straight all-fairway test hole, auto club, wind 0: 3 Wood 180 m → **0.00 m**, 3 Wood 220 m downhill 8% → 0.19 m, 7 Iron 140 m → 0.14 m, 5 Iron 140 m uphill 8% → 0.07 m, 9 Iron 140 m downhill → 0.15 m. Before (PR #15 QA): 3.7–11.5 m long |
| 2 | **S15** on hole 1 (`?tune=WIND_K:0`, browser) | **PASS** | 5 Iron from the tee (150 m) → 1.34 m from the green centre. 3 Wood from the rough at (−30, −10) (144 m) → 0.78 m. Core sweep of 43 spots per club: 5 Iron median 0.00 m, max 1.50 m. 3 Wood median 0.13 m, max 2.79 m |
| 2 | **S15** on hole 2 approaches | **PASS (with note)** | **Never 7–11 m past.** But no finish lands within 2 m of the target: the green centre (22, −440) sits on the tier ridge, and the ⚑ picks the closest finish on the lower tier. Browser: 5 Iron from (4, −300) → 4.97 m short, 3 Wood from (4, −280) → 6.69 m short. Core sweep for shots of 100 m or more: 3 Wood median 4.8 m short (max 6.5), 5 Iron 3.8 m short (max 6.1). All but one ended **short**. See the note below |
| 2 | **S19** `?scenario=h1-bunker` aim line at the flag | **PASS** | `targetKind` is `chip`, and the aim line is 0.000° off the cup. The scorecard reads **"Aim: the cup (within 33 yd)"**. With the 9 Iron forced it stays a chip aim at the cup |
| 2 | **CHIP_FLAG_SHORT** ⚑ chip finishes ~1.5 m short | **PASS** | Default: SW ⚑ chip → **1.53 m** from the cup, short side. 9 Iron → 1.47 m. Same with `WIND_K:0`. No chip-in |
| 2 | **CHIP_FLAG_SHORT:0** finishes at the cup | **PASS** | SW → 0.03 m, **holed** (result card). 9 Iron → 0.05 m, holed |
| 2 | **CHIP_FLAG_SHORT:3** (the designer's 3rd comparison link) | **PASS** | SW → 2.98 m short, 9 Iron → 3.03 m short |
| 2 | **X11** `?debug=1` during a shot, 390x844 | **PASS** | Plain, short tune list and 6-value tune list: the overlay ends 8 px above ⏩ Skip (e.g. y 428–653, Skip 661–699). It overlaps nothing (scorecard, minimap, TUNED, hint, meter, controls, Skip), doesn't move when the shot starts, and isn't cut off (12 px font) |
| 2 | **X11** 667x375 | **PASS** | The overlay sits at x 229–524, left of Skip (x 561–654), for all three tune lists. The font shrinks to 10 px, and to 9 px with the long list. Nothing overlaps or is cut off |
| 3 | Full play-through with the real keyboard (portrait) | **PASS** | Hole 1: birdie (2). Hole 2: birdie (4: 3 Wood, chip from the fringe with a putter, 2 putts). No console errors |
| 4 | Desktop 1920x1080 | **NOT TESTED** | Phone-portrait-only run, as requested |

No bugs and no screenshots.

### Note on S15 at hole 2 (not filed as a bug)
For approaches into hole 2, the ⚑ can't mean "finish at the target", because the default target, the green centre, is on the ridge between the tiers, where no ball comes to rest. The ⚑ chooses the closest finish, which is on the lower tier 4–7 m short, about 14–16 yd from the pin. This matches the PR's "closest finish" rule and the accepted tier roll-back. It means a perfect ⚑ long iron into hole 2 leaves a long uphill putt, not a 2 m one.

## Feel notes for the game designer
1. **A ⚑ chip leaves a short putt.** With 1.5 m the putt is about 2 yd. With 0 the SW and the 9 Iron both holed from the bunker, so 0 would make greenside bunkers very easy for a perfect hit. With 3 it's a 3 m putt.
2. **Long clubs at the ⚑ now stop where they should** on flat and sloped ground, so you can trust the ⚑ with woods.
3. **Into hole 2's tiered green, the ⚑ stops you on the lower tier** (4–7 m short). Expect a long putt even after a perfect approach.

## Verdict
**READY TO MERGE**: S15, S19 with `CHIP_FLAG_SHORT` (1.5 / 0 / 3) and X11 pass on phone portrait, there are no bugs and no console errors. The hole 2 ⚑ landing on the lower tier is a design note, not a defect.
