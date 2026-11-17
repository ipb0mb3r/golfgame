# QA report: PR #15 "Feel pass 2: auto-pick rules, honest ⚑, mobile HUD" (`dev/feel-pass-2`)

| | |
|---|---|
| **Commit tested** | `419c25538f9db5f08b0df8ff9960a87dafb0a638` (branch head, includes the PM follow-up push: bunker rule, ⚑ tier line, landscape minimap) |
| **Level** | FULL (budget 30 min). Time spent: about 25 min |
| **Main viewports** | Phone portrait 390x844 and phone landscape 844x390 (touch, DPR 3). Also 667x375, 568x320 and a live rotation; desktop 1920x1080 checked by measuring element positions |
| **Environment** | Headless Chromium 153 (Playwright 1.63), SwiftShader WebGL, Node v22.23.4, `python3 -m http.server`. Three.js r160 served locally because unpkg is blocked in this sandbox. Scripted runs use a fixed clock step of 1/60 s. |
| **Tasks** | S13, S12, H1 |

Layout checks compare the on-screen boxes of the HUD elements (`getBoundingClientRect`), and I confirmed them on the screenshots. Auto-pick and ⚑ sweeps run the page's own core (`createHolePlay`) in Node, with no wind and the ⚑ power at accuracy 0.

## PASS / FAIL / NOT TESTED

| # | Item | Result | Notes |
|---|---|---|---|
| 1 | `node --test` | **PASS** | 133 pass, 0 fail |
| 1 | `node tools/baseline.mjs check` | **PASS** | All 19 v1 shots match, worst difference 0.048 m |
| 2 | **S13** Driver only on the tee, and only when the distance needs it | **PASS** | 8 318 spots on both holes (3 m grid): **0 Driver picks off the tee**. Hole 1 tee (151 m) → 7 Iron. Hole 2 tee (448 m, 3 Wood ⚑ at 1.50, out of reach) → Driver. After the drive on hole 2, the fairway picks the 3 Wood (seen in the keyboard play-through too) |
| 2 | **S13** greenside bunker → sand wedge | **PASS** | `h1-bunker` (19.6 m) → S Wedge. Every bunker spot where the SW reaches within its 85% cap gets the SW (0 exceptions), and no bunker spot gets the SW when it can't reach (0 exceptions) |
| 2 | **S13** far fairway bunker → long club, not SW or Driver | **PASS** | `h2-fairway-bunker` (211 m) → **3 Wood**. Hole 2 bunkers overall: SW 23 spots, 9 Iron 6, 3 Wood 21, Driver 0. `h2-cross-bunker` (64.5 m) → **9 Iron**, because the SW's ⚑ is 0.857, just above its 0.85 cap. The PR's "Try it" step 2 still says the SW is picked there; the dev already flagged that line as outdated |
| 2 | **S13** other lies | **PASS** | Green → putter. Fringe < 18 m → putter, farther → SW. Rough and fairway → the shortest club that reaches, never the Driver |
| 3 | **S12** ⚑ at wind 0 finishes within ~2 m: **flat** | **PASS (with note)** | Hole 1, 5 336 spots: median **1.24 m**, 90th percentile 2.23 m, 83% within 2 m. Wedges are within about 1 m. Long clubs run long: worst 7.6 m (3 Wood, 167 m, from the left rough). See G2 |
| 3 | **S12** **uphill** | **PASS** | Hole 2 approaches (the cup is higher than every approach spot), 5 305 spots: median **1.74 m**. `h2-cross-bunker` 9 Iron at the ⚑ → **1.15 m** (was 9.7 m). `h2-side-slope` 7 Iron → 0.22 m. `h1-pond-carry` 9 Iron → 1.92 m. Every miss over 3 m that I traced is the accepted tier roll-back (lands about −445 on the top tier, rolls back to about −438), apart from G1 |
| 3 | **S12** **downhill** | **PASS (with note)** | Neither hole has a downhill approach to the cup, so I tested a synthetic constant-slope fairway (the same helper as `tests/pin-mark.test.js`): −4/−8/−12/−15% at 30–100 m all finish ≤ 2.1 m. At 140–180 m (9 Iron / 7 Iron) the ball runs long: 2.3–10.2 m (G2) |
| 4 | **H1** intro card fits or scrolls | **PASS** | Portrait: card 113–731 of 844, fits. Landscape: card 21–369 of 390, title and Tee off visible (it was cut off before). At 568x320 the overlay scrolls, with the title at the top and Tee off reachable. A live rotation (portrait → landscape → 667x375 → 568x320) re-lays the card each time |
| 4 | **H1** result card fits | **PASS** | Portrait 294–551, landscape 111–279. Play again is fully visible |
| 4 | **H1** debug overlay doesn't cover the HUD | **PASS** | Portrait: above the meter (y 487–694), clear of the scorecard, minimap, hint, meter and controls. Landscape: top centre (x 229–709, y 12–167), between the scorecard and the minimap. It does cover the centre flash in landscape, which the PM accepted (dev-only) |
| 4 | **H1** flash text wraps | **PASS** | "Swing cancelled · No stroke counted": 3 lines in a 157 px box in portrait, 2 lines in 280 px in landscape. Clear of the minimap, scorecard and wind box. Same for "Out of bounds! +1 penalty stroke" |
| 4 | **H1** ⚑ icon not clipped | **PASS** | Hole 1 tee (⚑ at 97%): class `flip`, and the icon draws to the **left** of its line in both orientations and on desktop |
| 4 | **H1** meter labels readable over sand | **PASS** | White (#eef5ea) with a two-layer black text shadow. Clearly readable over the `h1-bunker` sand in both orientations |
| 4 | **H1** hole 2 minimap clear of the bottom controls | **PASS** | Landscape 844x390: minimap 44x150, ends at y 224, and the bottom bar starts at y 250, so no overlap with the bottom area, meter or controls. Also clear at 667x375 and 568x320 (25x80) and in portrait (46x168) |
| 5 | Full play-through of both holes with the real keyboard | **PASS** | Portrait and landscape: hole 1 birdie (2), hole 2 birdie (4: 3 Wood off the fairway, then SW from a greenside bunker). No console errors |
| 6 | Desktop 1920x1080 | **PASS** | No overlaps or cut-off elements on either hole. Cards fit, and the ⚑ icon flips. Measured only: the screenshot timed out under the software renderer |
| 7 | fps | **NOT TESTED** | Software WebGL in this sandbox. This PR doesn't touch rendering |

Console: no errors, page errors or failed requests in any run.

Screenshots (one per viewport, each a strip of intro / HUD with debug on hole 2 / bunker meter / result card):
- `reviews/qa-screenshots/feel-pass-2/portrait-390x844.png`
- `reviews/qa-screenshots/feel-pass-2/landscape-844x390.png`

## Bugs

**G1. The aim ring and ⚑ can promise a full carry when the ball actually hits a bank right in front.** Low. Not a regression: `main` uses the same "only check the ground while falling" condition.
- Steps (core, the same code the page runs): hole 2, place the ball at (−9, −313) in the left rough (a hollow by the pond, with the ground rising 0.3 m in the first metre), wind 0. Auto-pick: 3 Wood. Swing at the ⚑ (0.770) or at full power.
- Expected: the aim ring and ⚑ match where the ball comes down.
- Actual: `landingPoint` predicts a 144 m carry onto the green, because it ignores the ground while the ball is still rising. The real ball lands **0.2 m** away and finishes **133.9 m** from the pin.
- How often: 2 of 6 430 hole 2 spots at full power (−9, −312 and −9, −313). I found no others.

**G2. The ⚑ runs long with long clubs (140 m and more).** Low.
- The ⚑ lands the ball 95% of the way to the pin and expects it to run out the rest. Wedges do (≤ 1 m). Long irons and woods run out more than 5%, so they finish past the pin.
- Real holes: hole 1 (−52, 5) rough, 3 Wood, 167 m → **7.6 m long**. Hole 1 tee 7 Iron 152 m → 0.2 m (it lands on the green, which stops it faster).
- Synthetic all-fairway ground, at the ⚑:

| Slope | 100 m | 140 m | 180 m |
|---|---|---|---|
| −8% (downhill) | P Wedge 0.08 m | 9 Iron 2.30 m long | 7 Iron 6.79 m long |
| 0% (flat) | P Wedge 0.96 m | 7 Iron 3.69 m long | 3 Wood 11.49 m long |
| +8% (uphill) | 9 Iron 0.37 m | 5 Iron 5.53 m long | out of reach |

## Feel notes for the game designer
1. **Long approaches over-shoot the ⚑** (G2). A wedge at the ⚑ stops at the pin, but a 3 Wood at the ⚑ ends up 7–11 m past it on fairway. Players will learn to swing a little under the ⚑ with woods.
2. **The cross-bunker shot is a 9 Iron now, not a sand wedge.** The SW comes up 0.007 short of reaching within its cap, so the 9 Iron (60% cap) is picked. It still finishes 1.1 m from the pin at the ⚑.
3. **The hole 2 minimap gets very small on short phones:** 44x150 at 844x390 and 25x80 at 568x320. It's still readable as a shape, but the ball dot is tiny.
4. **The debug overlay in landscape covers the middle of the sky,** including the flash text. That's fine for a dev tool, but expect to toggle it off to read flashes.
5. **Hole 2 with a 3 Wood off the fairway:** my scripted run put the second shot into the greenside bunker (14 yd), and a sand wedge at the ⚑ then left a 2 yd putt. That play felt fair.

## Verdict
**READY TO MERGE**: S13, S12 and H1 all pass in both phone orientations, there are no High or Med bugs and no console errors. G1 is older than this PR and very rare. G2 is a tuning note on the ⚑ for long clubs.
