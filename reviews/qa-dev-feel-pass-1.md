# QA report: PR #12 "Feel pass 1" (`dev/feel-pass-1`)

| | |
|---|---|
| **Commit tested** | `0d76494350cfaee0f457771ef53bfabdec2d3a44` (branch head, includes the PM follow-ups) |
| **Level** | FULL (budget 30 min). Time spent: about 25 min |
| **Main viewport** | Phone portrait 390x844 (touch, DPR 3). Desktop 1920x1080 also checked |
| **Environment** | Headless Chromium 153 (Playwright 1.63), SwiftShader WebGL, Node v22.23.4, `python3 -m http.server`. Three.js r160 served locally because unpkg is blocked in this sandbox. Scripted runs use a fixed clock step of 1/60 s. |
| **Tasks** | X8, S8, S10, S11, G8 |

Scripted clicks go through `window.__golf.swing()`, the same handler as Space, a tap or the SWING button, and are timed on the real meter state (`__golf.meter.phase` / `.value`). Real keyboard and real taps were also used (see items 3 and S8).

## PASS / FAIL / NOT TESTED

| # | Item | Result | Notes |
|---|---|---|---|
| 1 | `node --test` | **PASS** | 113 pass, 0 fail |
| 1 | `node tools/baseline.mjs check` | **PASS** | All 19 v1 shots match, worst difference 0.048 m |
| 2 | **S8** missed clicks: each row of DESIGN §3 | **PASS** | See the S8 table below. Every row was tested on the fairway and in the rough (cap 0.85), and topped, shank and cancel also with the putter |
| 2 | **S10** wider window (`SWEET` 0.05) and `CURVE_SHAPE` 2 | **PASS** | An accuracy click at −0.017 gives "Nice shot!". The window width on the meter matches `SWEET × sweetScale` on every surface (S11 table) |
| 2 | **S11** window width and gray cap on the meter, per surface | **PASS** | All 7 lies match the DESIGN table. The marker turns at the cap. See the S11 table |
| 2 | **S11** ⚑ mark matches the real distance | **PASS (with note)** | On flat and gently sloped ground, a shot at the ⚑ power carries within 0.4–2.3 m of the pin and stops ≤ 1.7 m away. Uphill to hole 2's raised green it stops 9.7 m short (F3). The flag icon is clipped near the top of the meter (F2) |
| 2 | **S11** putter not capped on the fringe | **PASS** | Fringe putter: cap 1, no gray stripes, window ×1.0. The putt range shows "max 26 yd" with no cap, and a full-power putt from 15.7 m went 17.3 m (it lipped out on the way) |
| 2 | **G8** a fast ball over the cup lips out and **stays out** | **PASS** | In a core sweep of 89 130 putts and chips around both cups, 499 lip-outs: **499 stayed out, 0 dropped**. On `main` the same sweep had 498 of 499 dropping straight in. Also seen in the browser on the `h1-green` and fringe putts ("Lipped out!", ball stops 2 yd past) |
| 2 | **X8** every `?scenario=` link: right spot and lie | **PASS (with note)** | All 7 load the right hole, spot, lie, club and stroke count. "Play again" returns to the same spot. In 4 of the 7, the wind changes on every retry (F1) |
| 2 | **X8** `?tune=`: TUNED badge, bad values ignored | **PASS** | All 9 example links from the PR show the badge and change the meter as expected. 13 bad inputs are handled. See the X8 table |
| 3 | Full play-through of both holes with the real keyboard (portrait) | **PASS** | Hole 1: birdie (2). Hole 2: birdie (4), including a sand wedge from a greenside bunker. W/S and arrow keys work. No console errors |
| 4 | Desktop 1920x1080 | **PASS** | Nothing overlaps or is cut off on either hole. Screenshots: `desktop-pl-0{1,2}-aim.png` |
| 5 | Phone portrait 390x844 layout | **PASS (with note)** | Meter, cap stripes, TUNED badge, hint and buttons fit. The meter labels are hard to read over sand (F4). The intro card height is a known issue (B7 / M5), not re-tested |
| 6 | Edge cases | **PASS** | Cancel at stroke 9 → still 9, no pick-up. Topped at stroke 9 → 10, then the "Picked up" card. A shank → OB penalty works (+1, ball back). Real taps on SWING: cancel (no stroke), red NO POWER meter, then topped (1 stroke) |
| 7 | fps | **NOT TESTED** | Software WebGL in this sandbox (about 1–12 fps for both main and the branch), so it can't be measured. This PR doesn't touch rendering |

Console: no errors or page errors in any run. The only warnings are the intended ones: `unknown scenario "nope"` and `ignored tune values`.

### S8: missed clicks (phone portrait)
| DESIGN §3 row | What I did | Result | Stroke | Feedback |
|---|---|---|---|---|
| All 3 clicks | power at 0.517, accuracy at −0.017 | Normal shot, 133.5 m (fairway) | +1 | "Nice shot!" |
| Power click in the grace window | click during `grace` | Power = cap (1.0 fairway, 0.85 rough), then a normal accuracy click | +1 | "MAX! Click now for full power", hint changes |
| No 3rd click | power at 0.517, then wait | Huge slice: fairway → **OB** (+1 penalty); rough → 79 m, curving far right | +1 | "Shanked!" |
| No power click, then a click on the way back | wait past grace, click at 0.3 | Mini shot at power 0.15: 41 m (Driver, fairway), 19.5 m (9 Iron, rough), 2.6 m (putter) | +1 | Red meter + "No power! Click for a mini shot, or wait to cancel", then "Topped!" |
| Start only | 1 click, then wait | Back to aim, ball didn't move | **0** | "Swing cancelled · No stroke counted" |

The HUD hint always said what the next click does: "Click again to set POWER" → "MAX! Click now…" → "No power! Click for a mini shot, or wait to cancel" / "Click on the green line…". The marker never went above the cap (highest value 0.85 in the rough, 0.60 in sand).

### S11: lie on the meter (phone portrait, meter close-ups `meter-<surface>.png`)
| Lie (club) | HUD lie line | Cap (gray from) | Window (expected / measured) | ⚑ power |
|---|---|---|---|---|
| Tee (7 Iron) | "Tee box · easier timing" | none | ×1.2 → 10.0% / 10.0% | 0.966 |
| Fairway (Driver, hole 2) | "Fairway" | none | ×1.0 → 8.33% / 8.33% | 0.983 |
| Rough (9 Iron, `h1-pond-carry`) | "Rough · max 85% · harder timing" | 0.85 (87.5%) | ×0.7 → 5.83% / 5.83% | 0.814 (just below the cap) |
| Bunker (9 Iron) | "Bunker · max 60% · harder timing" | 0.60 (66.7%) | ×0.5 → 4.17% / 4.17% | 0.150 |
| Bunker + sand wedge | "Bunker · max 85% · harder timing" | 0.85 (87.5%) | ×0.7 → 5.83% / 5.83% | 0.250 |
| Green (putter) | "Green · easier timing" | none | ×1.5 → 12.5% / 12.5% | 0.704 |
| Fringe (putter) | "Fringe" | **none** (putter override) | ×1.0 → 8.33% / 8.33% | 0.667 |
| Rough with `?tune=rough.maxPower:0.8` | as for rough + TUNED badge | 0.80 (83.3%) | 5.83% | auto club changes to 7 Iron |

A shot at the ⚑ power with no wind and acc 0 (core, the same code the page runs):

| Spot | Club | Distance | Carry | Stops from cup |
|---|---|---|---|---|
| Hole 1 tee | 7 Iron | 152.1 | 150.5 | 0.2 m |
| Hole 2 fairway (4, −300) | 7 Iron | 149.6 | 148.3 | 0.2 m |
| Hole 1 rough (−28, −50) | 9 Iron | 106.9 | 104.6 | 1.7 m |
| Hole 1 bunker, SW / PW / 9i | | 19.6 | 19.1–19.2 | 0.3–0.5 m |
| Hole 1 green 12 m / 5 m, hole 2 step 16.5 m | Putter | | | 0.2 m |
| Hole 1 fringe 14.5 m | Putter | | | 0.7 m |
| **Hole 2 cross bunker (12, −385)** | 9 Iron | 64.5 | **58.7** | **9.7 m short** (F3) |

### X8: designer links
| Scenario | Hole / spot / lie / club / strokes | Wind (tee-off, 2nd visit, after "Play again") |
|---|---|---|
| h1-bunker | pl-01, (−15, −147), sand, S Wedge, 1 | calm, calm, calm |
| h1-green | pl-01, (−6, −146), green, Putter, 1 | calm, calm, calm |
| h1-pond-carry | pl-01, (−28, −50), rough, 9 Iron, 1 | 11 mph, same, **3 mph** |
| h2-fairway-bunker | pl-02, (16, −237), sand, Driver, 1 | 10 mph, same, **2 mph** |
| h2-cross-bunker | pl-02, (12, −385), sand, 9 Iron, 2 | 6 mph, same, **4 mph** |
| h2-green-step | pl-02, (22, −432), green, Putter, 3 | calm, calm, calm |
| h2-side-slope | pl-02, (14, −300), fairway, 7 Iron, 2 | 3 mph, same, **10 mph** |

- `?scenario=nope` shows "There is no scenario "nope", so you're starting from the tee." `?scenario=H1-GREEN` works. `?scenario=…&hole=pl-02` ignores `hole`. `?scenario=…&seed=7` uses seed 7.
- `?tune=`: `SWEET:0.04` → badge "TUNED · SWEET 0.04", window 8%. `SWEET:0.04,SWEET:0.06` → the last one wins. `sweet:0.06` is accepted (names aren't case-sensitive). Club overrides (`sw.sand.maxPower:0.95,sw.sand.sweetScale:0.9`) show on the meter (cap 95.8%, window 7.5%). Every tuned value also shows in the debug overlay.
- Ignored, and listed on the intro card as "Ignored in ?tune=: …", with no badge and nothing applied: `SWEET:abc`, `SWEET:`, `SWEET`, `SWEET:1e2`, `SWEET:NaN`, `FOO:1`, `G:20`, `__proto__:1,constructor:1`, and an `<img onerror>` name. The notice shows these as plain text.
- Out-of-range numbers are **clamped, not ignored**, which is what the PR says: `SWEET:99` → 0.2, `SWEET:-1` → 0.005, `rough.maxPower:0` → 0.1. The badge says "(clamped)".

## Bugs

**F1. In 4 of 7 scenarios the wind changes on every "Play again".** Med.
- Steps: open `?scenario=h1-pond-carry`, tap Tee off, finish the hole, tap "Play again".
- Expected: the same test conditions each retry, so the designer can compare shots and `?tune=` values from the same spot.
- Actual: same spot, lie and strokes, but a new wind each time: 11 mph → 3 mph (pond-carry), 10 → 2 (fairway-bunker), 6 → 4 (cross-bunker), 3 → 10 (side-slope). The intro card also shows a different wind from the one at tee-off (12 mph vs 11 mph). The tee-off wind is the same on every new visit to the link, so only the first try is repeatable. The 3 scenarios with a calm wind are not affected.

**F2. The ⚑ icon is cut off near the top of the meter.** Low.
- Steps: hole 1 tee (⚑ at 97%) or hole 2 at (4, −250) with the Driver (98.6%).
- Expected: the ⚑ icon visible next to its line.
- Actual: the line shows, but the flag icon is cut off by the meter's rounded right end.
- Screenshots: `feel-pass-1/meter-tee.png`, `feel-pass-1/meter-fairway.png`, `feel-pass-1/desktop-pl-01-aim.png`

**F3. The ⚑ mark is about 9% short when hitting up to hole 2's raised green.** Low.
- Steps: `?scenario=h2-cross-bunker`, wind 0, 9 Iron, power = the ⚑ power (0.491), accuracy 0.
- Expected (DESIGN §3, "roughly the power needed to reach the pin, adjusted for elevation"): finishes near the pin, like on flat ground (≤ 1.7 m).
- Actual: carries 58.7 m for a 64.5 m distance and stops 9.7 m short. Flat and gently sloped spots are fine (table above).

**F4. "◀ accuracy / power ▶" labels are almost unreadable over sand.** Low.
- Steps: `?scenario=h1-bunker` on a phone in portrait.
- Actual: the light gray label text is lost on the light sand behind it. The hint line above is readable because of its shadow.
- Screenshot: `feel-pass-1/meter-bunker.png`

## Feel notes for the game designer
1. **Hard putts at the hole now always lip out.** A full-power 12 m putt on `h1-green` lips out and stops 2 yd past. Before this PR almost every lip-out dropped in, so ramming putts will feel very different.
2. **The Driver is the auto-pick from the hole 2 fairway bunker** (`h2-fairway-bunker`, cap 60%). It carries about 132 m from the sand.
3. **A shanked putt is mild.** No 3rd click on the `h1-green` putt still finished 4 yd from the pin. A shanked full shot goes out of bounds.
4. **"MAX! Click now for full power" also shows on putts,** whenever the meter reaches the top.
5. **The topped mini shot depends a lot on the club:** 41 m with the Driver, 19.5 m with a 9 Iron from the rough, 2.6 m with the putter. It is a fixed 15% of each club.

## Verdict
**READY TO MERGE**: every MUST item passes (S8, S10, S11 caps and windows, G8 stays out, X8 links and tune checks), there are no High bugs and no console errors. Fixing F1 (Med, the wind changes on every retry in 4 scenario links) before the designer's tuning session would make those links repeatable.
