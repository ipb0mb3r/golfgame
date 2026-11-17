# Pocket Links: Prototype Design Document

> **For agents:** This is the source of truth for gameplay and architecture. Each section has **Rules** (must be true), **Tunables** (numbers that live in config, with today's values) and **Acceptance** checks (testable). A ✅ / 🟡 / ❌ shows what the code does today. If the code and this document disagree, raise it in your PR. Don't silently change either one.

---

## 1. Vision

An original arcade golf game in the spirit of *Hot Shots Golf* and *Mario Golf*. It's easy to pick up thanks to the 3-click swing, and it has depth from terrain, slopes and weather. It runs in a browser on desktop and mobile.

**The prototype is about how the game feels, not how much content it has.** Two or three holes are enough. Success means a shot that feels good, a ball that behaves believably on hills and greens, rain that changes how you play, and a full round you can play from the menu to the scorecard.

### Design pillars
1. **Readable:** the player can always tell why the ball did what it did (slope readout, wind arrow, surface name after each shot).
2. **Skill-based timing:** the 3-click meter decides most of the outcome.
3. **Terrain matters:** slopes, surfaces and rain change the roll in ways you can predict.
4. **Tunable:** every feel parameter lives in config.
5. **One engine, many holes:** a new hole is a data file, never a copy of the engine.

### Out of scope for the prototype
Characters and stats, multiplayer, online features or accounts, a shop or unlocks, more than one course, full audio, a career mode, an advanced spin UI, and real-golf accuracy.

---

## 2. Core loop

```
Main Menu → Select Hole Set → [ Hole: Aim → 3-Click Swing → Flight → Bounce/Roll → … → Holed ] × N → Scorecard → Menu
```
Today ✅ one hole per page with an intro card and a result card. ❌ No menu, no hole sets, no multi-hole round.

---

## 3. The 3-click swing ✅

### Rules
| Click | Action | Result |
|---|---|---|
| 1 | Start the swing | The meter fills from 0 toward 1 |
| 2 | Set the power | Locks the power. The marker reverses toward the impact zone. See "Missed clicks" for what happens when the meter reaches 1 |
| 3 | Set the accuracy | The marker's distance from the impact zone at 0 sets the hook or slice |

- Inside `±SWEET`: straight shot. Early (acc > 0) gives a hook, curving left. Late (acc < 0) gives a slice, curving right. Outside the sweet spot the curve error is `sign(acc) × 0.2 × (|acc| / 0.2) ^ CURVE_SHAPE` (S10): `CURVE_SHAPE = 1` is linear (error = acc; the default again since S17, so near-misses hurt), `2` makes small misses curve gently. All shapes give the same error at |acc| = 0.2 (`CURVE_SHAPE_REF`).
- If the marker reaches `METER_MIN` without a third click, the shot is a huge slice (see "Missed clicks").
- Inputs: Space, a click or tap on the course, or the SWING button. Aim with ◀ ▶ / A D and change the club with ▲ ▼ / W S. ✅ Only a primary press swings (Gate A C7): a mouse needs its left button (right and middle clicks do nothing, and a right click on the course opens no menu); every finger counts on a touch screen, so two-thumb play works (hold Aim, tap SWING); Ctrl / Cmd / Alt + Space is a browser shortcut, not a swing.
- ✅ **The meter reads the real click time** (S16, Gate A C3): each click carries the time it happened (the input event's `timeStamp`), and core moves the marker to that moment before reading it (`pressMeterAt` / `tickMeterTo` in `swing.js`; each move is still capped at `MAX_METER_DT`). The same click times give the same swing at 30, 60 or 144 fps (tests/meter-clock.test.js); before, a click read the marker where it was at the last frame (up to 0.033 meter units off at 30 fps).
- ✅ **Default aim** (S18, designer: "the automatic aim is too strong"). Each shot starts aimed at a sensible point, not at the pin, so the player adjusts to the flag and reads the wind:
  - **putt** (green, or the fringe closer than `FRINGE_PUTT_DIST` to the cup): the cup
  - **tee shot on a par 4 or 5:** the hole's fairway target `aimTarget` (hole 2: the dogleg corner, (9, −270))
  - **everything else** (approaches, chips, bunker shots, a par 3 tee shot): the **centre of the green** (`features.green`)
  - The ⚑ mark and the auto-pick use the distance to this point (`play.targetDist()`), also after the player turns the aim. The aim ring and the HUD "To pin" are unchanged. `play.target` / `play.targetKind` say where it aims; the debug overlay shows it.
- A **⚑ mark** on the meter shows the power needed to reach the default aim point (S18; the pin for a putt), adjusted for elevation (S12): it is the power whose landing point, in the same simulation as the aim ring, comes down `AUTO_CLUB_REACH` (95%) of the way there, and the ball runs out the rest. With no wind and a straight shot, the ball finishes within about 2 m of the pin on flat ground, uphill and downhill. Above the lie's cap it sits in the grayed-out part (out of reach with this club). Near the right end of the meter the flag is drawn on the left of its line so it isn't cut off (H1). The ⚑ doesn't account for the ball rolling back off a tier: reading a ridge is the player's job (PM on PR #15; aiming the ⚑ at the pin's tier is a possible later idea).
- The club is picked automatically each shot (see "Club auto-pick") and the player can change to any club in the bag.

### Club auto-pick ✅ (task S13, decided 2026-11-16 by the game designer)
In this order (`clubs.pickClub`):
1. **Green**, or the fringe closer than `FRINGE_PUTT_DIST` (18 m): the putter.
2. **Bunker:** the sand wedge (if the hole's bag has one) when it reaches the default aim point within its own bunker cap (75% since S17, was 85%): it is the bunker club near the green. From a far bunker, rule 3 applies inside the 50% bunker cap (S17, was 60%) (never the Driver), so a fairway bunker is a real recovery choice (PM on PR #15).
Since S18 "reaches" means the distance to the default aim point (the green centre, or the tee target), not to the pin; rule 1 still uses the distance to the cup.
3. **Everywhere else:** the shortest club that reaches the pin within the lie's cap (its capped reach, hills included, is at least `AUTO_CLUB_REACH` × the distance). **The Driver only counts on the tee**, so it is picked only from the tee and only when the 3 Wood doesn't get there. When nothing reaches, the longest club that counts (the 3 Wood off the fairway).

The player can still pick any club with ▲ ▼ / W S, including the Driver from the fairway.
- The meter runs in real time (`meterDt` capped at 0.1s) so slow devices don't make it easier.

### Missed clicks ✅ (task S8, decided 2026-11-16 by the game designer)
**Principle:** every click has one clear meaning, and doing all 3 clicks is always the best outcome. The player must always be able to see what the next click will do.

| What the player does | Result | Stroke? | Feedback |
|---|---|---|---|
| All 3 clicks | Normal shot | Yes | As today |
| Power click within `POWER_GRACE` (≈0.15 s) after the meter reaches 1 | Counts as power = 1, then a normal accuracy click | Yes | "MAX!" flash when the meter reaches 1 |
| Start + power, **no 3rd click** (marker reaches `METER_MIN`) | **Huge slice**, curve error `NO_ACC_ERR` (≈3× today's forced slice) | Yes | "Shanked!" |
| Start, **no power click** (grace window passed), then a click on the way back | **Mini shot**: power = `MISSED_POWER_FRACTION` (≈0.15), accuracy taken from where the click lands | Yes | Meter turns red with "No power" after the grace window, then "Topped!" |
| **Start only**: no click after the first one, marker reaches `METER_MIN` | **Swing cancelled**, back to aim, nothing happens | **No** | "Swing cancelled" |

Tunables (config.js): `POWER_GRACE = 0.15` s, `NO_ACC_ERR = 0.6`, `MISSED_POWER_FRACTION = 0.15`.
The overpower zone (S9) is a separate, later idea and isn't part of S8.

How it's built (`core/swing.js`): the meter phases are `power → grace → nopower` and `power → accuracy`. When the meter reaches 1 the marker turns back right away (it doesn't pause at the top); for `POWER_GRACE` seconds a click is still the power click (power = 1, the marker keeps going, so the accuracy timing is unchanged). After that the meter turns red with "NO POWER" and the next click is the mini shot. A swing ends with an `outcome`: `normal`, `shank` (no 3rd click), `topped` (mini shot) or `cancel` (no shot, no stroke; `play.swing()` ignores it). The HUD hint always says what the next click does.

### Lie: power cap and accuracy window ✅ (task S11, decided 2026-11-16 by the game designer)
**Principle:** the lie changes the swing itself, and the player can **see** it on the meter before swinging. What you see on the meter is what you get.

- Each surface has `maxPower` (power cap, 0–1) and `sweetScale` (multiplies `SWEET`).
- **The cap is the top of the meter.** The part above the cap is **grayed out**. The marker turns around at the cap, and the S8 rules (grace window, "MAX!", missed clicks) apply at the cap instead of at 1.
- **This replaces the hidden `lie` power multiplier.** Power % maps directly to the club's distance, so the ⚑ mark stays honest.
- **The accuracy zone is drawn at its real width** (`SWEET × sweetScale`) on the meter.
- HUD lie line: e.g. "Rough · max 85% · harder timing".
- Clubs can override per surface (the sand wedge in a bunker).

| Surface | `maxPower` | `sweetScale` |
|---|---|---|
| Tee | 1.00 | 1.2 |
| Fairway | 1.00 | 1.0 |
| Fringe | 0.95 | 1.0 |
| Rough | 0.85 | 0.7 |
| Bunker | **0.50** (S17, was 0.60) | **0.4** (S17, was 0.5) |
| Bunker + sand wedge | **0.75** (S17, was 0.85) | **0.6** (S17, was 0.7) |
| Green (putter) | 1.00 | 1.5 |

**Putter:** the putter ignores `maxPower` on the fringe and the green (a club override, like the sand wedge), so a full putt always uses the whole putt range. It keeps the surface's `sweetScale` (green ×1.5, fringe ×1.0). Decided by the PM on PR #12.

Starting values. The designer tunes them with `?tune=` (X8), e.g. `?tune=rough.maxPower:0.8,sand.sweetScale:0.6,sw.sand.maxPower:0.9` (each clamped: `maxPower` 0.1–1, `sweetScale` 0.2–3). Later hooks: rain (W2) and slope lie (T6) may reduce `sweetScale` through the same function.

How it's built: `maxPower` / `sweetScale` live on each surface in `surfaces.js` (a hole can override them in `surfaceOverrides`); a club can override them per surface with `lieOverrides` in `clubs.js`. `clubs.lieFor(club, surface, surfaces)` is the one function that decides the lie (`play.lieOf()` for the ball's lie and current club). The meter's top is `meter.cap`; `resolveShot` also clamps power to the cap. The aim ring and club reach show the capped full shot. `play.pinPower()` places the ⚑ mark on the full 0–1 scale (above the cap = out of reach, shown in the gray part): since S12 it searches (bisection) for the power whose `play.landingPoint()` carry is 95% of the distance, instead of scaling the full-power carry, which was ~9% short up to a raised green. `landingPoint()` integrates the arc exactly and stops where it crosses the ground, so the aim ring, reach and ⚑ agree with the real flight to a few cm. The putter's override is in `clubs.js` (`lieOverrides` for fringe and green).

### Tunables (today)
`METER_SPEED = 1.15`, `METER_MIN = -0.2`, `SWEET = 0.045`, `CURVE_SHAPE = 1`, `CURVE_K = 28`.
✅ **S17, designer tuning 1 (Alexis + playtesters, 2026-11-16: "harder is much better"):** `SWEET` 0.05 → 0.045, `CURVE_SHAPE` 2 → 1 (the old linear curve, near-misses hurt), `METER_SPEED` 1.0 → 1.15, `WIND_K` 0.2 → 0.3, harder bunkers (table above), faster greens (§4). At 1.15 the perfect window is ≈ 78 ms (±0.045 / 1.15 per second); on the tee (×1.2) ≈ 94 ms.
History: S10 widened `SWEET` from 0.024 to 0.05 and made `CURVE_SHAPE = 2` the default (PM, PR #12); S17 tightened it again. Compare with `?tune=SWEET:0.05,CURVE_SHAPE:2,METER_SPEED:1`. Tap delay on phones makes tight windows feel even harder; since S16 a later task can add an input offset that behaves the same at every frame rate.
Clubs: Driver 215 m / 12°, 3W 195/17, 5i 170/21, 7i 150/26, 9i 125/32, PW 105/38, SW 75/46 (sand), Putter. Each hole can limit the bag (hole 1 has no driver).

### Acceptance
- [x] The same (power, acc, club, lie) always gives the same launch parameters (unit test). *(tests)*
- [x] Early and late timings give opposite curve signs (unit test). *(tests)*
- [x] Power 0 and power 1 are both handled without errors. *(tests)*
- [x] S8: each row of the "Missed clicks" table gives its result (unit tests on the meter state machine with scripted click times), and a cancelled swing doesn't change the stroke count. *(tests/missed-clicks.test.js)*

---

## 4. Ball physics ✅ (one engine for both holes since Phase 0)

### Ball states
`aim → power → (grace | nopower) → accuracy → flight → roll → wait → (aim | holed → result)` plus `intro`. `grace` and `nopower` are the S8 missed-click phases (§3). Penalties go through `wait`. ✅ The lists and the predicates (`isSwinging`, `isAimingState`, `isAimView`, `isBallMoving`) live in one place, `src/core/states.js` (Gate A A3); core, HUD, camera and input use them, and a test checks every meter phase is covered.

**Hole flow** ✅ (Gate A A1/A8, decided in core, `play.js`): `play.swing(result)` is the only way to hit the ball (null for a cancelled swing, while the ball moves, or after the hole is over). When a shot ends, core sets `play.next`: `aim` (stopped), `returnToLast` (penalty), `holed`, or `pickedUp` (strokes incl. penalties reached `maxStrokes`; holed on the last allowed stroke still counts as holed). The game waits (`TIMING`), shows it, and calls `play.proceed()`. A finished hole sets `play.finished = { holed, pickedUp, strokes, par }` for rounds (Phase 6).

### Rules
- **Flight:** gravity `G`, wind (`wind × WIND_K`), and a sideways curve from accuracy. There's no air drag (the carry is solved analytically from the club's carry and loft).
- **Bounce:** when the ball touches the ground (`ball.y <= heightAt(x,z)`), the velocity is reflected around the **terrain normal**. Vertical bounce × `rest`, horizontal speed × `keep`. The first bounce is also scaled by the club's `spinFactor` (high lofts stop faster). When the bounce speed is under 1.2 m/s, the ball switches to roll.
- **Roll:** friction `decel` (m/s²) from the surface, plus slope gravity `ROLL_G = G·5/7` along the gradient.
- **Rest:** on a slope, a stopped ball stays put if the slope force is below `decel × STATIC`. Otherwise it creeps (below `CREEP` m/s, friction blends down so the ball trickles instead of stopping dead).
- ✅ **Rolls always end** (P10, Gate A T1). Two more rest rules, so no roll on a real hole reaches the 40 s `ROLL_TIMEOUT` safety net (before: about 1 roll in 6 on hole 2):
  - a ball slower than `STOP_SPEED` (0.06 m/s) for `STOP_TIME` (0.5 s) in a row is at rest, even if the slope still pulls a little (it used to slow down forever where the pull only just beat the grass);
  - a ball that has crawled (slower than `CREEP`) for `CRAWL_TIME` (8 s) gets full friction again: where the grass can hold it, it slows to a stop within a fraction of a second, then the rule above rests it. On a slope steeper than the grass can hold (pull > `decel`) it keeps rolling, as before.
  - The `stopped` event says why: `reason: 'still'` (the normal rule), `'settled'` (one of the two new rules) or `'timeout'` (the safety net). tests/rest.test.js plays a grid of putts and full shots on both holes and expects 0 timeouts; the longest roll is ≈ 24 s (a long putt down hole 2's ridge).
- **Cup:** the ball drops if it's within `CUP_R` (strictly: a ball exactly on the edge stays out) and slower than `CUP_CAPTURE_SPEED` (3.2 m/s). A faster ball **lips out** (it's deflected and slowed) and can't drop until it has left the cup (G8; before, it was captured on the next step almost every time). It can drop again once it has rolled more than `CUP_R × 1.5` away and comes back. A ball that comes to rest over the cup drops. A ball landing on the fly within `CUP_R × 1.4` goes straight in.
- **Penalties:** water or out of bounds gives +1 stroke and the ball goes back to the last position.
- **Lie:** the surface the ball rests on caps the next shot's power and scales its accuracy window (S11, see §3 "Lie"). There is no hidden power multiplier any more: power % is always the same share of the club's distance.
- ✅ **Skip (X9):** about 1 s after the hit (`TIMING.skipAfter`), a **⏩ Skip** button shows above the meter while the ball flies or rolls; **Space** or **Enter** do the same. `play.skip()` runs the remaining fixed steps at once with nothing drawn, so the end is identical to watching it (same spot, strokes, lip-outs, `play.next`; tests/skip.test.js compares them exactly at 30/60/144 fps and different skip moments). The events go through the usual flow, so the flash text, penalties, holed and picked-up play normally. A tap on the course or SWING never skips, so an extra swing tap can't skip a shot by accident.
- **Timestep:** a fixed-step accumulator: only whole 1/240 s steps, the remainder waits for the next frame, so a shot ends in the same place at any frame rate. The flight is sped up ×1.35 for game feel (`FLIGHT_SPEEDUP`).

### Known problems fixed in Phase 0
- ✅ The last sub-step used the leftover time, so results changed with frame rate (the F0 baseline measured up to 2.4 m between 30, 60 and 144 fps) → accumulator (F3).
- ✅ The lip-out and the wind used `Math.random()` → seeded RNG (F5). The game seeds it from `?seed=<n>` or, without it, from the clock.
- ✅ The physics constants and surface values were duplicated in two files → `src/core/config.js` and `surfaces.js` + `surfaceOverrides` (F6/F7).
- Since hole 1 now uses the slope-aware roll (stop speed 0.06 m/s and the `CREEP` friction blend instead of its old 0.03 m/s stop) and the hill-aware reach estimate, its rolls end a few centimetres differently. All baseline shots are within 0.5 m.

### Surface table (today's values: `rest` / `keep` / `decel`)
The power cap and accuracy window per surface (`maxPower`, `sweetScale`) are in §3 "Lie". There is no `lie` power multiplier any more (removed in S11).

| Surface | rest | keep | decel | Notes |
|---|---|---|---|---|
| Tee | .30 | .40 | 2.4 | |
| Fairway | .30 | .42 (h1) / .45 (h2) | 2.4 / 2.2 | |
| Fringe | .25 | .36 | 3.2 / 3.0 | |
| Green | .22 | .32 / .34 | **0.7 / 0.6** | faster since S17 (was 1.1 / 0.8); the green speed differs on purpose |
| Rough | .15 | .22 | 5.5 | |
| Bunker | .02 | .06 | 18 | |
| Water / OB | | | | penalty |

**Decision:** one shared base surface table in `surfaces.js`. A hole may override values in `surfaceOverrides` (e.g. a faster green). Hole 1 and hole 2 must keep their current feel through those overrides.
**Tunable (S17):** `?tune=<surface>.decel|keep|rest:<value>` (e.g. `green.decel:0.5`; ranges decel 0.2–30, keep and rest 0–1). Like the lie values, a tuned value wins over a hole's `surfaceOverrides`, so `green.decel` applies to both holes. Putt power stays calibrated to the tuned green (`v0 = √(2·decel·D)`).
**Note (S17):** on the faster greens a putt reaches the cup slower, so a full putt can only lip out from about 15 m on hole 1 (≈ 11 m before). See the PR for the open question about `CUP_CAPTURE_SPEED`.

---

## 5. Terrain and slopes ✅ (hole 2)

### Rules
- Each hole provides `heightAt(x, z)` (a smooth function in meters) and `surfaceAt(x, z)`.
- The engine derives `gradAt` / `normalAt` from `heightAt` by central differences (ε = 0.05 m). Holes never compute normals themselves.
- The rendered terrain mesh, the ball, the cup, the aim ring and the minimap all use the same `heightAt`.
- The HUD **Slope readout** shows things like "Uphill 4% · breaks left".
- Shared terrain helpers go in `core/terrain.js`: `ss` (smoothstep), `ell` (ellipse distance), `bump(x,z,{x,z,r,h})` (Gaussian hill or dip).

### Acceptance
- [x] From the same landing speed, an uphill roll is shorter than a downhill roll. *(tests)*
- [x] A ball at rest on the step between hole 2's green levels trickles down. A ball on the flat upper level stays put. *(tests)*
- [x] No roll on a real hole ends through the 40 s safety net (P10). *(tests/rest.test.js)*
- [x] Hole 1 (flat) stays within the baseline tolerance of its pre-refactor behaviour.

---

## 6. Putting ✅ / 🟡

### Rules
- On the green, the club switches to the putter: lower aim speed, short aim line, putt range `puttMax`.
- The putt power maps to distance using `v0 = √(2·decel·D)` on flat ground. The ⚑ mark adjusts for uphill or downhill.
- Putts break toward the low side (slope gravity).
- 🟡 A slope grid is **painted** on hole 2's green → it should become a **toggle** (G4).

### Acceptance
- [x] On a flat green, a putt with power p stops within ±5% of `p × puttMax`. *(tests)*
- [x] A mistimed putt changes only the line, by the curve error × `PUTT.aimErrorK` (0.25 rad): early goes left, late goes right, by the same amount (acc ±0.15 ≈ 2.1° with the linear curve of S17; 1.6° before). A shanked putt (no 3rd click) is pushed ≈ 8.6° right, under the agreed 10° ("mild"). *(tests/putt-cup.test.js, Gate A T5)*
- [x] A ball faster than the capture speed over the cup doesn't drop (tested at 3.5–5 m/s, G8). A slower one does.

---

## 7. Weather ❌ (wind ✅)

### Wind ✅
Random per hole, 0–5.5 m/s, shown with an arrow, and it only affects the ball in the air, as `wind × WIND_K` (0.3 since S17, was 0.2: the same wind pushes the ball 1.5× as far). It comes from the seeded RNG, and a hole can set `windMax` or a fixed wind (`wind: { x, z }`).

### Rain ❌ (Phase 5, rules decided by the game designer 2026-11-16, Gate A finding A4)
- Each hole has `weather: { type: 'clear' | 'rain', wetness: 0..1 }`. A hole set (or a scenario) can override it: `createHolePlay(hole, { seed, weather })`, where `weather` defaults to `hole.weather`. Never mutate the shared hole object.
- **All** weather effects go through **one place**: `getEffectiveSurface(surfaceId, hole, weather)` for the physics values, and the lie lookup (`lieFor`) receives the same weather so the cap and window use the weathered values. No weather `if`s anywhere else.
- **Physics** (all surfaces):
  - restitution `rest × (1 − WET_BOUNCE × wetness)`
  - bounce speed kept `keep × (1 − WET_KEEP × wetness)`
  - roll friction `decel × (1 + WET_DECEL × wetness)`
  - green: `decel × (1 + WET_GREEN × wetness)` (slower greens)
  - optional: carry × (1 − `RAIN_CARRY` × wetness)
- **Lie** (§3), applied **after** club overrides, so the sand wedge gets it too:
  - **wet bunker:** firmer sand → `maxPower + WET_SAND_CAP × wetness` (all clubs, incl. the sand wedge), capped at 1
  - **wet rough:** heavier grass → `sweetScale × (1 − WET_ROUGH_WINDOW × wetness)`
  - **wet fairway, tee, fringe, green:** cap and window unchanged
  - the meter shows the weathered cap and window, as always ("what you see is what you get")
- Visuals: rain particles, a darker and greyer sky and light, a darker ground tint, and a weather icon in the HUD.
- Starting tunables (all in `?tune=`): `WET_BOUNCE 0.5, WET_KEEP 0.3, WET_DECEL 0.6, WET_GREEN 0.35, RAIN_CARRY 0.05, WET_SAND_CAP 0.10, WET_ROUGH_WINDOW 0.15`.

### Acceptance
- [ ] The same shot on the fairway rolls 30–50% less with wetness = 1 than with 0.
- [ ] Wetness = 0 gives exactly today's behaviour (baseline v1 and v2 pass untouched).
- [ ] Wet bunker: the cap is +0.10 for a 9 Iron **and** for the sand wedge. Wet rough: the window is ×0.85. Wet fairway: cap and window unchanged.
- [ ] A hole set can make a hole rainy without changing the hole file.

---

## 8. Rounds, scoring and menus ❌

### Rules
- A **hole set** is an ordered list of hole ids plus a name (e.g. "Pocket Links 1–2", "Slope Test", "Rainy Day").
- A round plays its holes in order and keeps a scorecard: strokes, par, and the result per hole (eagle, birdie, par, bogey and so on).
- The stroke cap per hole (`maxStrokes`: 10 on hole 1, 12 on hole 2) means "picked up" and the round continues.
- Between holes: a summary card with a Next Hole button. At the end: a full scorecard and the total relative to par, with Play Again and Menu buttons.
- **Menus:**
  - Main menu (Play, How to Play, Settings)
  - Hole set select, built from `src/holes/sets.js`
  - Pause menu (Resume, Restart Hole, Quit to Menu)
  - Settings (debug overlay, putt grid, invert aim)
- Settings are saved to localStorage (wrapped in try/catch).
- Restarting or quitting must clear **all** round state, timers and the trail.

### Acceptance
- [ ] A simulated 2-hole round gives the correct total.
- [ ] Menu → play → quit → play again leaves no leftover state (strokes, timers, wind, ball).

---

## 9. Architecture (✅ = exists, ⏳ = planned)

```
index.html                 ✅ the only page: canvas + HUD + cards; loads src/game/main.js; a classic start-up check shows a plain message when the game can't start (Gate A C2)
hole2.html                 ✅ redirect to index.html?hole=pl-02 (keeps query + hash)
vendor/three-0.160.0/      ✅ Three.js committed in the repo (Gate A C1, unmodified build + LICENSE), the import map points here
src/
  core/                    ← PURE JS. No Three.js, no DOM. Tested in Node.
    config.js              ✅ every tunable; TUNABLES = one entry per ?tune= name { def, min, max }, live values in TUNE (Gate A A5)
    tune.js                ✅ parses and applies ?tune= overrides (lie values go to a layer, the tables stay frozen)
    states.js              ✅ meter phases, game states and the predicates everyone uses (Gate A A3)
    validate.js            ✅ validateHole / validateScenario, run when the data loads (Gate A T7)
    vec.js                 ✅ small vector helpers ({x,y,z} objects)
    rng.js                 ✅ seeded RNG (mulberry32) + parseSeed
    clubs.js               ✅ club table, bag, lieFor (cap + window), pickClub (auto-pick)
    surfaces.js            ✅ base surface table + getEffectiveSurface(id, hole, weather) + the lie-tune layer
    terrain.js             ✅ ss, ell, bump, makeTerrain(hole) → { heightAt, gradAt, normalAt, surfaceAt }
    swing.js               ✅ meter state machine (incl. S8 phases) + resolveShot
    ball.js                ✅ flight, bounce, roll, cup, penalties → events
    play.js                ✅ one hole's rules: strokes, lie, auto club, accumulator, and the hole flow
                              (swing is the only hit, next / proceed / finished; Gate A A1/A8)
    scoring.js             ✅ score names and result text
    round.js               ⏳ round state, scorecard, hole sequencing (Phase 6)
  holes/
    hole1.js, hole2.js     ✅ hole data
    sets.js                ✅ HOLES registry (validated at load), SETS, resolveHole
    scenarios.js           ✅ designer test spots for ?scenario= (validated at load)
  game/                    ← Three.js + DOM only. Reads core state, never owns rules.
    main.js                ✅ the app, for the whole visit: renderer, input, debug overlay, frame loop; loads hole sessions
    session.js             ✅ one disposable hole: scene, props, camera, HUD bindings, timers; dispose() frees them (Gate A A2)
    scene.js               ✅ renderer (DPR cap + antialias tunables, Gate A C4), lights, sky, terrain mesh from heightAt, disposeScene
    coursePainter.js       ✅ painted course texture + minimap image
    props.js               ✅ flag, cup, trees, ball mesh, trail, aim dots
    camera.js              ✅
    hud.js                 ✅ HUD panel, meter, minimap, cards, flash
    input.js               ✅ keyboard, mouse, touch (primary press only, Gate A C7)
    debug.js               ✅ debug overlay (backtick, or ?debug=1 on phones, Gate A C5)
    menus.js, weatherFx.js ⏳ Phase 7 / Phase 5
tests/
  *.test.js                ✅ node --test
  baseline-v2.shots.js     ✅ the v2 shot list
  fixtures/baseline.json   ✅ v1: golden shots from the pre-refactor pages (physics only, frozen)
  fixtures/baseline-v2.json ✅ v2: recorded from the engine (swing feel, 0.01 m; 36 shots since Gate A T2)
tools/
  baseline.mjs             ✅ v1 record/check in a headless browser (dev/QA only, needs Playwright)
  record-baseline-v2.mjs   ✅ re-records v2; prints what moved first (Gate A T3), --dry to only look
  session-check.mjs        ✅ 10 hole load/dispose cycles in a headless browser, renderer memory must not grow (Gate A A2)
```

### Hole module contract
```js
export default {
  id: 'pl-02', name: 'Pocket Links #2', par: 5, maxStrokes: 12,
  tee: { x: 0, z: 0 }, cup: { x: 26, z: -448 },
  aimTarget: { x: 9, z: -270 },                             // S18: tee-shot default aim, required on a par 4/5
  bag: ['driver','3w','5i','7i','9i','pw','sw','putter'],   // optional, defaults to all
  windMax: 5.5,                                             // or wind: { x, z } for a fixed wind
  weather: { type: 'clear', wetness: 0 },
  surfaceOverrides: { green: { decel: 0.8 } },
  map: { x0: -70, x1: 70, z0: -500, z1: 25 },               // texture/minimap bounds
  number: 2,                                                // shown as "Hole 2"
  scenery: { ... },                                         // lights, fog, mesh grid, trees, colours, minimap size
  intro: { subtitle, steps, ... },                          // intro card text
  features: { green, bunkers, pond, hills },                // used by the painter & surfaceAt; green { cx, cz } = approach default aim (S18)
  heightAt(x, z) { ... },                                   // may use helpers from core/terrain.js
  surfaceAt(x, z) { ... },
};
```
The physics never reads presentation fields (`scenery`, `intro`). Every hole shows the same HUD, including the Slope row ("Flat" on a flat hole).

### Architecture rules
- **Events, not hidden coupling:** `ball.js` emits `landed`, `stopped`, `holed`, `lippedOut`, `penalty`. The game layer turns these into flash text, camera moves and HUD updates.
- **Game loop:** physics runs on a fixed accumulator (1/240 s). Rendering interpolates or just draws the latest state. The same inputs give the same resting position at 30, 60 or 144 fps.
- **Debug overlay** (backtick key, or `?debug=1` on phones ✅): state, speed, surface, slope, wetness, meter values, default aim (S18), render quality, fps. ✅ X10: in portrait it sits above the bottom panel (never over the TUNED badge) and long lines wrap inside the screen; it is placed again on every refresh, so `?debug=1` in landscape lands between the scorecard and the minimap like the backtick. A file that fails to load is named in the start-up message only when the browser says which one (otherwise no name, instead of always `main.js`).
- **Test hooks:** keep `window.__golf` (state, ball, meter, testHit, surfaceAt, …) for browser-level tests.
- **Designer test links (X8):** `?scenario=<id>` starts at a named spot with a fixed seed (data in `src/holes/scenarios.js`, each with the surface it promises, checked by a test; "Play again" goes back to the spot). `?tune=NAME:value,…` overrides tunables for that visit only: only the names in `TUNABLES` (config.js), numbers only, clamped to each range, with a pink "TUNED" badge above the meter. Unknown names or values are ignored and listed on the intro card. Each tunable is one `TUNABLES` entry in config.js (`{ def, min, max }`); code reads the live value from `TUNE` and only `setTunable()` changes it. Lie values (`rough.maxPower`, `sw.sand.maxPower`, …) and, since S17, surface physics (`green.decel`, `green.keep`, `fairway.rest`, …) go into a tune layer: the surface and club tables stay frozen, and a tuned value wins over a hole's `surfaceOverrides`. **Tunes are read when a hole starts** (the link is applied before the first hole is created). Quality tunables (Gate A C4): `DPR_CAP` (default 2) and `ANTIALIAS` (1 on, 0 off), e.g. `?tune=DPR_CAP:1,ANTIALIAS:0` on a slow phone.
- **Local run:** ES modules need a local server (`python3 -m http.server`). The README must say so. No internet is needed (Three.js is in `vendor/`).
- **Hole sessions** (Gate A A2): the app (`main.js`) lives for the whole visit and owns the renderer, the input listeners and the loop; each hole is a session (`session.js`) that is created and disposed. Rounds and menus load the next hole by disposing the current session and creating a new one, never by reloading the page or binding input again.
- **Data is validated when it loads** (Gate A T7): `sets.js` runs `validateHole` on every hole and `scenarios.js` runs `validateScenario`; an error names the hole or scenario and the field, and the C2 start-up message shows it.

---

## 10. Glossary
- **Impact zone / SWEET:** the "perfect" window around 0 on the meter.
- **rest / keep / decel:** bounce height kept, speed kept on a bounce, rolling friction.
- **maxPower / sweetScale:** a surface's power cap and accuracy-window multiplier (the "lie", §3).
- **ROLL_G:** gravity felt by a rolling ball along a slope (5/7 G).
- **STATIC / CREEP:** how strongly a stopped ball holds on a slope / the speed below which a ball trickles.
- **Break:** how much a putt curves because of the green's slope.
- **Hole set:** an ordered list of holes you play as one round.
- **Gate:** a review checkpoint where the independent reviewer agents run.

---

## 11. Decisions log
| Date | Decision | Why | Revisit when |
|---|---|---|---|
| 2026-11-16 | **The target platform is the browser** (desktop and mobile), for now | The game is easy to share by link and doesn't need an app store | If Steam, console or app-store releases become a goal |
| 2026-11-16 | **Stay on Three.js** (not Babylon, not a full engine) | It's enough for browser graphics, characters (glTF) and sound. Agents know it best. It's lightweight on mobile. The golf physics is custom anyway | Review B: the Tech Lead assesses whether the art, character and sound goals need more. If the platform changes → run an engine test (one hole + character + sound) in Godot |
| 2026-11-16 | **Three.js stays in `src/game/` only** | Keeps the gameplay portable if the renderer or engine changes later | Never. This is a permanent rule |
| 2026-11-16 | **Menus and the HUD are DOM overlays**, not 3D UI | Simpler, accessible, good on mobile | If in-world 3D UI is needed |
| 2026-11-16 | **Ramming a putt too hard should fail** (lip-outs stay out) | Rewards speed control over aiming at the back of the cup | After playtesting rain (wet greens are slower) |
| 2026-11-16 | **Driver is auto-picked only on the tee; sand wedge from bunkers** (S13) | Matches player expectations; manual choice is still free | |
| 2026-11-16 | **Putting stays 3 clicks for now**; whether it becomes 2 clicks (no accuracy) is an open question (S14) | Decide together with the next 3-click system pass | Next swing design pass |
| 2026-11-16 | **Rain and lie:** a wet bunker raises the cap (+0.10, all clubs incl. sand wedge), wet rough shrinks the window (×0.85), other surfaces keep cap and window | Firm wet sand is easier, heavy wet rough is harder; readable on the meter | After the rain playtest |
| 2026-11-16 | **Three.js is committed in the repo** (`vendor/`) instead of loaded from unpkg | Works when the CDN is blocked or down, offline play, no agent workaround, upgrade = swap one file | |
| 2026-11-16 | **Swing tuning 1 ("harder is much better"):** `SWEET` 0.045, old linear curve (`CURVE_SHAPE` 1), meter speed 1.15, wind ×1.5 (`WIND_K` 0.3), harder bunkers, faster greens (S17) | Designer + outside playtesters: the game was too easy, near-misses must hurt, approaches should run out on the green | Next playtest |
| 2026-11-16 | **Default aim is a starting point, not the answer** (S18): approaches aim at the green centre, par 4/5 tee shots at a fairway target, putts at the cup. The landing ring and ⚑ stay but ignore wind | Gives the player a decision on every shot. Wind becomes a real read | After playtest |

### Future direction (not in the prototype)
The owner plans richer graphics, sound, more beautiful courses and characters. When those phases start, plan for: a glTF asset pipeline from Blender, `THREE.AnimationMixer` for characters, Web Audio / `THREE.PositionalAudio` for sound, and lighting and post-processing presets per course. Asset loading should be async with a loading screen.

---

## 12. Supported browsers (Gate A C9)
The game needs **ES modules, import maps and WebGL**. That sets the floor:
- Chrome / Edge **89+**, Firefox **108+**, Safari and iOS Safari **16.4+** (every browser on iOS uses Safari's engine)
- WebGL 1 or 2 must be available. If it isn't, the page says so in plain words ✅ (Gate A C2, also for a too-old browser, `file://` and a file that didn't load)
- Run from a web server (GitHub Pages or `python3 -m http.server`), not from `file://`

