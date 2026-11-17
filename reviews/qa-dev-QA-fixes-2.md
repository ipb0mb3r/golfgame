# QA report: PR #27 "Fix pass 2: fair meter, rolls that end, skip, smarter aim, harder tuning" (`dev/QA-fixes-2`)

| | |
|---|---|
| **Commit tested** | `54a5ff9d8ca0695b036fa71854f4bfc992d94e95` (branch head, after the PM review: fringe aims at the cup, "Aim:" line) |
| **Level** | FULL (budget 30 min). Time spent: about 25 min |
| **Main viewport** | Phone portrait 390x844 (touch, DPR 3). Also landscape 844x390, 667x375, 568x320 and desktop 1920x1080 for X10 |
| **Environment** | Headless Chromium 153 (Playwright 1.63), SwiftShader WebGL, Node v22.23.4, `python3 -m http.server`, vendored Three.js |
| **Tasks** | S16, P10, X9, S18, S17, X10. Feel and physics change **on purpose**, so main is not a reference for shot results |

## PASS / FAIL / NOT TESTED

| # | Item | Result | Notes |
|---|---|---|---|
| 1 | `node --test` | **PASS** | 212 pass, 0 fail |
| 1 | `node tools/baseline.mjs check` (v1 with the 5 exceptions) | **PASS** | All 19 shots match at 30, 60 **and 144** fps (the PR only lists 30) |
| 1 | `node tools/record-baseline-v2.mjs --dry` | **PASS** | "all 40 shots replay exactly as recorded. Nothing to write." |
| 1 | `node tools/session-check.mjs` | **PASS** | 10 cycles, no growth, input bound once, no stray timers |
| 2 | **S16** same click timing = same shot at 30 and 144 fps | **PASS** | In the browser, with frames throttled to **30, 60, 144** and **random 5–80 ms gaps**, and real Space key events at fixed times. Power and accuracy depend **only on the click times**: across 24 swings, the game's power/acc match `1.15 × time between clicks` to **5e-5**, whatever the frame rate or the frame phase. The grace edge holds to 0.03 ms: 0.065 ms before the edge → full power, 0.035 ms after → topped, at any frame rate. Same click times give the same end spot |
| 3 | **P10** no roll lasts ~40 s | **PASS** | Core sweep of **36 936 shots**: 26 001 random shots on both holes (random spot, club, power, accuracy, aim and wind; half of the hole 2 shots in the hollow / side-slope / green area), 7 695 from `?scenario=h2-side-slope` (power × accuracy × aim × 5 clubs) and 3 240 short shots on a 2 m grid in the hollow. **0 timeouts.** Longest shot (flight + roll) 27.5 s: a hole 2 putt across the tiers. Longest from `h2-side-slope`: 27.3 s (5 Iron, p 0.85). 99.8% of the random shots end under 20 s. Stop reasons: `still` 31 459, `settled` 2 512. In the browser the worst side-slope case took 20.2 s to stop |
| 4 | **X9** ⏩ Skip appears ~1 s after the hit | **PASS** | 15 shots: it appeared 986–1013 ms after the hit. Space or Enter at 0.3 s does nothing |
| 4 | **X9** Skip / Space / Enter give the same end as watching | **PASS** | 5 shots × 4 ways (watch, button, Space, Enter): seeded-wind Driver, a hook into the rough, the hole 1 pond (penalty: strokes 2, back to the tee), a putt and an approach to the hole 2 green. **The same spot (to 0.1 mm), strokes, state and flash** every time. The button hides after the skip, the meter stays at `aim`, and pressing Space twice at the skip doesn't start a swing |
| 4 | **X9** a course tap doesn't skip | **PASS** | A course tap during the flight: no skip. A SWING tap: no skip |
| 5 | **S18** default aim per case, and the "Aim:" line | **PASS** | 12 spots. Aim line within 0° of the target (0.3–0.5° on 2 spots where my own aim keys nudged it). See the S18 table |
| 6 | **S17** new values active | **PASS** | `SWEET` 0.045, `CURVE_SHAPE` 1, `METER_SPEED` 1.15 (meter reaches the top in 0.89 s), `WIND_K` 0.3, `POWER_GRACE` 0.15, `CUP_CAPTURE_SPEED` 3.2. Greens: hole 1 decel 0.7, hole 2 0.6. The debug overlay shows the aim, render and **tuned** values, but not the default swing values (they aren't tunes); I checked those through the meter and the live config |
| 6 | **S17** harder bunker (`?scenario=h1-bunker`) | **PASS** | SW: "Bunker · max 75% · harder timing", cap stripes from 79.2%, window 4.5% (was 5.83%: SW 0.85 / ×0.7 with SWEET 0.05). 9 Iron in the same sand: max 50%, window 3.0% |
| 6 | **S17** faster green | **PASS** | Flat 50% putt on hole 1 still goes 50% of the range (8.54 m of 17 m). The window on the green is 11.25% (×1.5) |
| 7 | **X10** debug overlay, phone portrait | **PASS (with note)** | Clear of the scorecard (now 5 lines with "Aim:") and of the TUNED badge, even with a 6-value tune list (it wraps inside the screen, x 12–378). During a shot it covers the **⏩ Skip** button (R1) |
| 7 | **X10** debug overlay, phone landscape 844x390 | **PASS (with note)** | Clear of the scorecard and the TUNED badge for every tune list. Covers ⏩ Skip during a shot when a tune is on (R1) |
| 7 | **X10** smaller landscape phones | **FAIL** | 667x375: with a long tune list the overlay covers the TUNED badge and the bottom panel. 568x320: it covers the hint and the meter even with no tune (R2) |
| 8 | Full play-through with the real keyboard (portrait) | **PASS** | Hole 1: birdie (2). Hole 2: par (5: 3 Wood, SW from the rough, **3 putts** on the faster green). No console errors |
| 9 | Console | **PASS** | No errors or failed requests in any browser run |
| 10 | fps | **NOT TESTED** | Software WebGL in this sandbox |

### S18: default aim (phone portrait, `?debug=1`)
| Spot | Lie, club | Target (kind) | "Aim:" line | Debug |
|---|---|---|---|---|
| Hole 2 tee (par 5) | tee, Driver | (9, −270) **fairway** | fairway target | aim fairway 270 m. The ⚑ is hidden (1.11 > 1), as the PM noted in question 4 |
| Hole 1 tee (par 3) | tee, 7 Iron | (3, −150) **green** centre | green centre | aim green 150 m |
| Hole 2 fairway after a drive (4, −300) | fairway, 7 Iron | (22, −440) green | green centre | aim green 141 m |
| `h2-side-slope` | fairway, 7 Iron | (22, −440) green | green centre | ⚑ 0.927 for 140 m (pin 149 m) |
| `h1-pond-carry` | rough, 9 Iron | (3, −150) green | green centre | |
| `h1-bunker` (greenside) | sand, S Wedge | (3, −150) green | green centre | 18 m to centre, 19.6 m to the pin |
| `h2-cross-bunker` | sand, S Wedge | (22, −440) green | green centre | |
| Hole 1 fringe 15.7 m | fringe, Putter | **cup** | the cup | |
| Hole 2 fringe 20 m | fringe, **S Wedge** (chip) | **cup** | the cup | |
| `h1-green`, `h2-green-step` | green, Putter | **cup** | the cup | |

## Bugs

**R1. The debug overlay covers the ⏩ Skip button during a shot.** Low (debug only).
- Steps: 390x844, `index.html?hole=pl-02&debug=1` (or 844x390 with any `&tune=`), hit a shot, wait 1 s.
- Expected: X9's Skip button readable next to the overlay, as the TUNED badge is.
- Actual: the overlay is drawn over Skip, so it shows dimmed through the overlay. Tapping it still works (the overlay has `pointer-events: none`, and `elementFromPoint` returns `skipBtn`).
- Screenshots (also the one per viewport): `fix-pass-2/portrait-390x844-debug-tune-flight.png`, `fix-pass-2/landscape-844x390-debug-tune-flight.png`

**R2. On smaller landscape phones the debug overlay covers the TUNED badge and the meter.** Low (debug only).
- Steps: 667x375 (iPhone SE / 8 in landscape), `index.html?hole=pl-02&debug=1&tune=DPR_CAP:1,ANTIALIAS:0,SWEET:0.04,rough.maxPower:0.8,green.decel:0.5,WIND_K:0.2`. Or 568x320 with just `?debug=1`.
- Expected (X10): never over the TUNED badge or the HUD panels.
- Actual: at 667x375 the overlay spans y 12–219, over the TUNED badge and the top of the bottom panel. At 568x320 it spans y 12–219 even with no tune (271 with a long tune list), over the hint, the meter, the TUNED badge and the controls. Portrait, 844x390 and desktop are fine.
- Screenshots: `fix-pass-2/bug-667x375-debug-covers-tuned.png`, `fix-pass-2/bug-568x320-debug-covers-meter.png`

## Feel notes for the game designer
1. **The meter is now exactly fair.** Power is simply "time between clicks × 1.15", on any phone. The perfect zone is about ±39 ms on the fairway, ±47 ms on the tee, ±59 ms on the green, ±23 ms in a bunker with the SW and ±16 ms with an iron from sand.
2. **The faster greens cost strokes.** My keyboard bot, which putts at the ⚑, 3-putted hole 2 (par) where it 2-putted before this PR. Long putts across hole 2's tiers can roll for 20–27 s, so ⏩ Skip earns its place there.
3. **Greenside bunkers aim at the green centre, not the pin** (`h1-bunker`: 18 m to the centre, 19.6 m to the pin). From close to the green you'll often want to move the aim to the flag yourself.
4. **On hole 2's tee the ⚑ is gone** (the dogleg target is out of the Driver's carry), so the drive is "swing full". The "Aim: fairway target" line explains why the line doesn't point at the flag.
5. **Skip feels instant:** the camera jumps to the resting ball and the trail stops where it was when you skipped.

## Verdict
**READY TO MERGE**: every MUST item for S16, P10, X9, S18 and S17 passes (S16 checked against the exact click times at 30/60/144 fps and with uneven frames, 0 roll timeouts in 36 936 shots). X10 passes on phone portrait and on 844x390 landscape. R1 and R2 are Low, debug-only overlap problems (Skip button, small landscape phones) for a follow-up.
