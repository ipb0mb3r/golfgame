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

- Inside `±SWEET`: straight shot. Early (acc > 0) gives a hook, curving left. Late (acc < 0) gives a slice, curving right. Outside the sweet spot the curve error is `sign(acc) × 0.2 × (|acc| / 0.2) ^ CURVE_SHAPE` (S10): `CURVE_SHAPE = 1` is linear (error = acc, as before), `2` makes small misses curve gently. All shapes give the same error at |acc| = 0.2 (`CURVE_SHAPE_REF`).
- If the marker reaches `METER_MIN` without a third click, the shot is a huge slice (see "Missed clicks").
- Inputs: Space, a click or tap on the course, or the SWING button. Aim with ◀ ▶ / A D and change the club with ▲ ▼ / W S.
- A **⚑ mark** on the meter shows the power needed to reach the pin, adjusted for elevation (S12): it is the power whose landing point, in the same simulation as the aim ring, comes down `AUTO_CLUB_REACH` (95%) of the way to the pin, and the ball runs out the rest. With no wind and a straight shot, the ball finishes within about 2 m of the pin on flat ground, uphill and downhill. Above the lie's cap it sits in the grayed-out part (out of reach with this club). Near the right end of the meter the flag is drawn on the left of its line so it isn't cut off (H1).
- The club is picked automatically each shot (see "Club auto-pick") and the player can change to any club in the bag.

### Club auto-pick ✅ (task S13, decided 2026-11-16 by the game designer)
In this order (`clubs.pickClub`):
1. **Green**, or the fringe closer than `FRINGE_PUTT_DIST` (18 m): the putter.
2. **Bunker:** the sand wedge (if the hole's bag has one), however far the pin is.
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
| Bunker | 0.60 | 0.5 |
| Bunker + sand wedge | 0.85 | 0.7 |
| Green (putter) | 1.00 | 1.5 |

**Putter:** the putter ignores `maxPower` on the fringe and the green (a club override, like the sand wedge), so a full putt always uses the whole putt range. It keeps the surface's `sweetScale` (green ×1.5, fringe ×1.0). Decided by the PM on PR #12.

Starting values. The designer tunes them with `?tune=` (X8), e.g. `?tune=rough.maxPower:0.8,sand.sweetScale:0.6,sw.sand.maxPower:0.9` (each clamped: `maxPower` 0.1–1, `sweetScale` 0.2–3). Later hooks: rain (W2) and slope lie (T6) may reduce `sweetScale` through the same function.

How it's built: `maxPower` / `sweetScale` live on each surface in `surfaces.js` (a hole can override them in `surfaceOverrides`); a club can override them per surface with `lieOverrides` in `clubs.js`. `clubs.lieFor(club, surface, surfaces)` is the one function that decides the lie (`play.lieOf()` for the ball's lie and current club). The meter's top is `meter.cap`; `resolveShot` also clamps power to the cap. The aim ring and club reach show the capped full shot. `play.pinPower()` places the ⚑ mark on the full 0–1 scale (above the cap = out of reach, shown in the gray part): since S12 it searches (bisection) for the power whose `play.landingPoint()` carry is 95% of the distance, instead of scaling the full-power carry, which was ~9% short up to a raised green. `landingPoint()` integrates the arc exactly and stops where it crosses the ground, so the aim ring, reach and ⚑ agree with the real flight to a few cm. The putter's override is in `clubs.js` (`lieOverrides` for fringe and green).

### Tunables (today)
`METER_SPEED = 1.0`, `METER_MIN = -0.2`, `SWEET = 0.05`, `CURVE_SHAPE = 2`, `CURVE_K = 28`.
✅ **S10 (designer playtest, 2026-11-16): the accuracy window was too hard.** `SWEET` went from 0.024 to 0.05 (≈100 ms perfect window instead of ≈48 ms). `CURVE_SHAPE = 2` (quadratic) is the default (PM decision on PR #12): far-end hooks and slices are unchanged, only small misses curve more gently. Compare with linear through `?tune=CURVE_SHAPE:1`. Tap delay on phones makes tight windows feel even harder; if needed, a later task can add an input offset.
Clubs: Driver 215 m / 12°, 3W 195/17, 5i 170/21, 7i 150/26, 9i 125/32, PW 105/38, SW 75/46 (sand), Putter. Each hole can limit the bag (hole 1 has no driver).

### Acceptance
- [ ] The same (power, acc, club, lie) always gives the same launch parameters (unit test).
- [ ] Early and late timings give opposite curve signs (unit test).
- [ ] Power 0 and power 1 are both handled without errors.
- [x] S8: each row of the "Missed clicks" table gives its result (unit tests on the meter state machine with scripted click times), and a cancelled swing doesn't change the stroke count. *(tests/missed-clicks.test.js)*

---

## 4. Ball physics ✅ (one engine for both holes since Phase 0)

### Ball states
`aim → power → accuracy → flight → roll → wait → (aim | holed → result)` plus `intro`. Penalties go through `wait`.

### Rules
- **Flight:** gravity `G`, wind (`wind × WIND_K`), and a sideways curve from accuracy. There's no air drag (the carry is solved analytically from the club's carry and loft).
- **Bounce:** when the ball touches the ground (`ball.y <= heightAt(x,z)`), the velocity is reflected around the **terrain normal**. Vertical bounce × `rest`, horizontal speed × `keep`. The first bounce is also scaled by the club's `spinFactor` (high lofts stop faster). When the bounce speed is under 1.2 m/s, the ball switches to roll.
- **Roll:** friction `decel` (m/s²) from the surface, plus slope gravity `ROLL_G = G·5/7` along the gradient.
- **Rest:** on a slope, a stopped ball stays put if the slope force is below `decel × STATIC`. Otherwise it creeps (below `CREEP` m/s, friction blends down so the ball trickles instead of stopping dead).
- **Cup:** the ball drops if it's within `CUP_R` and slower than `CUP_CAPTURE_SPEED` (3.2 m/s). A faster ball **lips out** (it's deflected and slowed) and can't drop until it has left the cup (G8; before, it was captured on the next step almost every time). It can drop again once it has rolled more than `CUP_R × 1.5` away and comes back. A ball that comes to rest over the cup drops. A ball landing on the fly within `CUP_R × 1.4` goes straight in.
- **Penalties:** water or out of bounds gives +1 stroke and the ball goes back to the last position.
- **Lie:** the surface the ball rests on caps the next shot's power and scales its accuracy window (S11, see §3 "Lie"). There is no hidden power multiplier any more: power % is always the same share of the club's distance.
- **Timestep:** a fixed-step accumulator: only whole 1/240 s steps, the remainder waits for the next frame, so a shot ends in the same place at any frame rate. The flight is sped up ×1.35 for game feel (`FLIGHT_SPEEDUP`).

### Known problems fixed in Phase 0
- ✅ The last sub-step used the leftover time, so results changed with frame rate (the F0 baseline measured up to 2.4 m between 30, 60 and 144 fps) → accumulator (F3).
- ✅ The lip-out and the wind used `Math.random()` → seeded RNG (F5). The game seeds it from `?seed=<n>` or, without it, from the clock.
- ✅ The physics constants and surface values were duplicated in two files → `src/core/config.js` and `surfaces.js` + `surfaceOverrides` (F6/F7).
- Since hole 1 now uses the slope-aware roll (stop speed 0.06 m/s and the `CREEP` friction blend instead of its old 0.03 m/s stop) and the hill-aware reach estimate, its rolls end a few centimetres differently. All baseline shots are within 0.5 m.

### Surface table (today's values: `rest` / `keep` / `decel` / `lie`)
| Surface | rest | keep | decel | lie | Notes |
|---|---|---|---|---|---|
| Tee | .30 | .40 | 2.4 | 1 | |
| Fairway | .30 | .42 (h1) / .45 (h2) | 2.4 / 2.2 | 1 | |
| Fringe | .25 | .36 | 3.2 / 3.0 | .97 | |
| Green | .22 | .32 / .34 | **1.1 / 0.8** | 1 | the green speed differs on purpose |
| Rough | .15 | .22 | 5.5 | .85 | |
| Bunker | .02 | .06 | 18 | .6 | |
| Water / OB | | | | | penalty |

**Decision:** one shared base surface table in `surfaces.js`. A hole may override values in `surfaceOverrides` (e.g. a faster green). Hole 1 and hole 2 must keep their current feel through those overrides.

---

## 5. Terrain and slopes ✅ (hole 2)

### Rules
- Each hole provides `heightAt(x, z)` (a smooth function in meters) and `surfaceAt(x, z)`.
- The engine derives `gradAt` / `normalAt` from `heightAt` by central differences (ε = 0.05 m). Holes never compute normals themselves.
- The rendered terrain mesh, the ball, the cup, the aim ring and the minimap all use the same `heightAt`.
- The HUD **Slope readout** shows things like "Uphill 4% · breaks left".
- Shared terrain helpers go in `core/terrain.js`: `ss` (smoothstep), `ell` (ellipse distance), `bump(x,z,{x,z,r,h})` (Gaussian hill or dip).

### Acceptance
- [ ] From the same landing speed, an uphill roll is shorter than a downhill roll.
- [ ] A ball at rest on the step between hole 2's green levels trickles down. A ball on the flat upper level stays put.
- [x] Hole 1 (flat) stays within the baseline tolerance of its pre-refactor behaviour.

---

## 6. Putting ✅ / 🟡

### Rules
- On the green, the club switches to the putter: lower aim speed, short aim line, putt range `puttMax`.
- The putt power maps to distance using `v0 = √(2·decel·D)` on flat ground. The ⚑ mark adjusts for uphill or downhill.
- Putts break toward the low side (slope gravity).
- 🟡 A slope grid is **painted** on hole 2's green → it should become a **toggle** (G4).

### Acceptance
- [ ] On a flat green, a putt with power p stops within ±5% of `p × puttMax`.
- [x] A ball faster than the capture speed over the cup doesn't drop (tested at 3.5–5 m/s, G8). A slower one does.

---

## 7. Weather ❌ (wind ✅)

### Wind ✅
Random per hole, 0–5.5 m/s, shown with an arrow, and it only affects the ball in the air. It comes from the seeded RNG, and a hole can set `windMax` or a fixed wind (`wind: { x, z }`).

### Rain ❌ (Phase 5)
- Each hole has `weather: { type: 'clear' | 'rain', wetness: 0..1 }`.
- **All** weather effects go through one function, `getEffectiveSurface(surfaceId, hole, weather)`, so there are no weather `if`s scattered through the physics:
  - restitution `rest × (1 − WET_BOUNCE × wetness)`
  - bounce speed kept `keep × (1 − WET_KEEP × wetness)`
  - roll friction `decel × (1 + WET_DECEL × wetness)`
  - green: `decel × (1 + WET_GREEN × wetness)` (slower greens)
  - bunker: wet sand is firmer, so a slightly better lie (`lie` +0.1 × wetness)
  - optional: carry × (1 − `RAIN_CARRY` × wetness)
- Visuals: rain particles, a darker and greyer sky and light, a darker ground tint, and a weather icon in the HUD.
- Starting tunables: `WET_BOUNCE 0.5, WET_KEEP 0.3, WET_DECEL 0.6, WET_GREEN 0.35, RAIN_CARRY 0.05`.

### Acceptance
- [ ] The same shot on the fairway rolls 30–50% less with wetness = 1 than with 0.
- [ ] Wetness = 0 gives exactly today's behaviour.

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

## 9. Target architecture (Phase 0)

```
index.html                 ← the only page: canvas + HUD + menus; loads src/game/main.js
src/
  core/                    ← PURE JS. No Three.js, no DOM. Tested in Node.
    config.js              G, ROLL_G, STATIC, CREEP, CUP_R, BALL_R, WIND_K, CURVE_K, SWEET, METER_*, timestep, M2Y
    vec.js                 small vector helpers ({x,y,z} objects)
    rng.js                 seeded RNG (mulberry32, as already in the code)
    clubs.js               club table + helpers (auto-pick, reach)
    surfaces.js            base surface table + getEffectiveSurface(id, hole, weather)
    terrain.js             ss, ell, bump, makeTerrain(hole) → { heightAt, gradAt, normalAt, surfaceAt }
    swing.js               meter state machine + resolveShot(...) → launch velocity / curve / spin
    ball.js                ball simulation: step(dt) for flight, bounce, roll, cup, penalties → emits events
    play.js                one hole's rules: strokes, lie, auto club, penalties, fixed-step accumulator (added in Phase 0)
    scoring.js             score names and result text (added in Phase 0)
    round.js               round state, scorecard, hole sequencing (Phase 6)
  holes/
    hole1.js               Pocket Links #1: flat par 3
    hole2.js               Pocket Links #2: hilly par 5
    sets.js                hole sets
  game/                    ← Three.js + DOM only. Reads core state, never owns rules.
    main.js                boot, game loop (fixed-timestep accumulator), state wiring
    scene.js               renderer, lights, sky, terrain mesh from heightAt
    coursePainter.js       the painted course texture + minimap image
    props.js               flag, cup, trees, ball mesh, trail, aim dots
    camera.js, hud.js, meter.js, minimap.js, input.js, menus.js, debug.js, weatherFx.js
tests/
  *.test.js                node --test
  fixtures/baseline.json   golden shots recorded from the pre-refactor code
tools/
  baseline.mjs             records / checks the baseline shots in a headless browser (dev only, needs Playwright)
```

### Hole module contract
```js
export default {
  id: 'pl-02', name: 'Pocket Links #2', par: 5, maxStrokes: 12,
  tee: { x: 0, z: 0 }, cup: { x: 26, z: -448 },
  bag: ['driver','3w','5i','7i','9i','pw','sw','putter'],   // optional, defaults to all
  windMax: 5.5,                                             // or wind: { x, z } for a fixed wind
  weather: { type: 'clear', wetness: 0 },
  surfaceOverrides: { green: { decel: 0.8 } },
  map: { x0: -70, x1: 70, z0: -500, z1: 25 },               // texture/minimap bounds
  features: { green, bunkers, pond, hills },                // used by the painter & surfaceAt
  heightAt(x, z) { ... },                                   // may use helpers from core/terrain.js
  surfaceAt(x, z) { ... },
};
```
The physics never reads presentation fields (`scenery`, `intro`). Every hole shows the same HUD, including the Slope row ("Flat" on a flat hole).

### Architecture rules
- **Events, not hidden coupling:** `ball.js` emits `landed`, `stopped`, `holed`, `lippedOut`, `penalty`. The game layer turns these into flash text, camera moves and HUD updates.
- **Game loop:** physics runs on a fixed accumulator (1/240 s). Rendering interpolates or just draws the latest state. The same inputs give the same resting position at 30, 60 or 144 fps.
- **Debug overlay** (backtick key): state, speed, surface, slope, wetness, meter values, fps.
- **Test hooks:** keep `window.__golf` (state, ball, meter, testHit, surfaceAt, …) for browser-level tests.
- **Designer test links (X8):** `?scenario=<id>` starts at a named spot with a fixed seed (data in `src/holes/scenarios.js`, each with the surface it promises, checked by a test; "Play again" goes back to the spot). `?tune=NAME:value,…` overrides tunables for that visit only: only the names in `TUNABLES` (config.js), numbers only, clamped to each range, with a pink "TUNED" badge above the meter. Unknown names or values are ignored and listed on the intro card. Tunables that a link can change are `export let` in config.js and only change through `setTunable()`.
- **Local run:** ES modules need a local server (`python3 -m http.server`). The README must say so.

---

## 10. Glossary
- **Impact zone / SWEET:** the "perfect" window around 0 on the meter.
- **rest / keep / decel / lie:** bounce height kept, speed kept on a bounce, rolling friction, power multiplier when hitting from that surface.
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

### Future direction (not in the prototype)
The owner plans richer graphics, sound, more beautiful courses and characters. When those phases start, plan for: a glTF asset pipeline from Blender, `THREE.AnimationMixer` for characters, Web Audio / `THREE.PositionalAudio` for sound, and lighting and post-processing presets per course. Asset loading should be async with a loading screen.
