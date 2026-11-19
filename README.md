# Pocket Links

An original, simple 3D arcade golf game that runs in the browser, with a three-click swing. Built with [Three.js](https://threejs.org/) and plain JavaScript modules: no build step and nothing to install.

## Play

Once GitHub Pages is switched on, the game is at **https://ipb0mb3r.github.io/golfgame/**. It opens on the main menu:

- **Play** → **Solo** (pick a course and play it as a round, with a scorecard and your personal best), **vs AI** (coming soon) or **Practice** (one hole, or a test spot).
- **How to Play**: the swing, the wind and the keys.
- **Settings**: the debug overlay and the putt grid (saved on your device).
- While you play, the **II** button (or Esc) pauses: Resume, Restart hole, Quit to menu.

The links below are shortcuts for testing: they skip the menu and start a hole straight away.

| Hole | Link | What it is |
| --- | --- | --- |
| 1 | [`index.html?hole=pl-01`](https://ipb0mb3r.github.io/golfgame/?hole=pl-01) | Flat par 3, 166 yards, over a pond to a green with three bunkers |
| 2 | [`index.html?hole=pl-02`](https://ipb0mb3r.github.io/golfgame/?hole=pl-02) | Hilly par 5, about 490 yards, with a two-level green (prototype) |
| 3 | [`index.html?hole=pl-03`](https://ipb0mb3r.github.io/golfgame/?hole=pl-03) | Par 4 dogleg right with trees in play and a rock outcrop (prototype, Phase K) |

The intro and score cards link from one hole to the other. Old links to `hole2.html` still work: that page now forwards to `index.html?hole=pl-02`.

## How to play

| Action | Keyboard | Mouse / touch |
| --- | --- | --- |
| Aim | ◀ ▶ arrow keys (or A / D) | Hold the ◀ ▶ buttons |
| Change club | ▲ ▼ arrow keys (or W / S) | ‹ › buttons |
| Swing | Space (three presses) | Click the course or the SWING button (three times) |
| Pause | Esc | the II button |
| Debug overlay | ` (backtick) | Settings → Debug overlay, or add `?debug=1` to the address |

**The three-click swing**

1. First click starts the meter moving right.
2. Second click sets **power**. The bar is in quarters (25/50/75/100%), and the aim line has a tick where each quarter lands, ending in a marker at the full-power carry (S22). On the green the ⚑ mark is roughly the power needed to reach the pin.
3. The marker swings back. Third click sets **accuracy**: stop it on the green line for a straight shot. Too early curves the ball left (hook), too late curves it right (slice).

Missed a click? If the meter reaches the top, you still get full power by clicking within a moment ("MAX!"). Miss that and the meter turns red ("NO POWER"): a click then is only a mini shot, and no click cancels the swing without costing a stroke. Forgetting the third click is a big slice ("Shanked!").

Wind (top right) pushes the ball while it is in the air. The rough and bunkers cap your power (the gray part of the meter is out of reach) and make the green timing zone narrower; the Lie line says so, e.g. "Rough · max 85% · harder timing". Water and out of bounds cost a penalty stroke. On hole 2 the ball follows the hills. The **Slope** readout (top left) tells you if you are hitting uphill or downhill and which way a putt breaks.

## Run it on your own computer

The game is made of JavaScript modules, and browsers only load those from a web server (opening `index.html` straight from the folder will not work). Any small local server is fine. With Python:

```
python3 -m http.server 8000
```

Then open http://localhost:8000 (the menu) or http://localhost:8000/?hole=pl-02 (straight to hole 2). No internet connection is needed: Three.js is included in the repo (`vendor/three-0.187.0/`).

Useful extras in the address bar: `?hole=pl-02&seed=42` replays the same wind every time.

## Designer test links (no keyboard needed)

**Scenarios** start the ball at a named spot with a fixed wind, so you can replay one situation on a phone. "Play again" brings you back to the same spot. The spots are data in `src/holes/scenarios.js`.

| Link | Where you start |
| --- | --- |
| [`?scenario=h1-bunker`](https://ipb0mb3r.github.io/golfgame/?scenario=h1-bunker) | Hole 1, greenside bunker |
| [`?scenario=h1-green`](https://ipb0mb3r.github.io/golfgame/?scenario=h1-green) | Hole 1, 12 m flat putt |
| [`?scenario=h1-pond-carry`](https://ipb0mb3r.github.io/golfgame/?scenario=h1-pond-carry) | Hole 1, left rough with the pond in the way |
| [`?scenario=h2-fairway-bunker`](https://ipb0mb3r.github.io/golfgame/?scenario=h2-fairway-bunker) | Hole 2, fairway bunker in the drive zone |
| [`?scenario=h2-cross-bunker`](https://ipb0mb3r.github.io/golfgame/?scenario=h2-cross-bunker) | Hole 2, cross bunker short of the green |
| [`?scenario=h2-green-step`](https://ipb0mb3r.github.io/golfgame/?scenario=h2-green-step) | Hole 2, putt up the step between the green levels |
| [`?scenario=h2-side-slope`](https://ipb0mb3r.github.io/golfgame/?scenario=h2-side-slope) | Hole 2, fairway side slope toward the pond |
| [`?scenario=h3-behind-tree`](https://ipb0mb3r.github.io/golfgame/?scenario=h3-behind-tree) | Hole 3, behind the lone tree |
| [`?scenario=h3-cut-corner`](https://ipb0mb3r.github.io/golfgame/?scenario=h3-cut-corner) | Hole 3, tee shot: cut the corner over the trees? |
| [`?scenario=h3-rock`](https://ipb0mb3r.github.io/golfgame/?scenario=h3-rock) | Hole 3, on the rock outcrop next to the boulders |
| [`?scenario=h3-rock-bounce`](https://ipb0mb3r.github.io/golfgame/?scenario=h3-rock-bounce) | Hole 3, a shot aimed at the rock: watch it bounce (try [`&tune=rock.rest:0.4,rock.keep:0.7`](https://ipb0mb3r.github.io/golfgame/?scenario=h3-rock-bounce&tune=rock.rest:0.4,rock.keep:0.7) for a softer rock) |

**Tune links** change a feel setting for that visit only, e.g. [`?tune=SWEET:0.08`](https://ipb0mb3r.github.io/golfgame/?tune=SWEET:0.08) (a wider perfect zone) or [`?tune=SWEET:0.06,CURVE_SHAPE:2`](https://ipb0mb3r.github.io/golfgame/?tune=SWEET:0.06,CURVE_SHAPE:2) (small misses curve gently). A pink **TUNED** badge above the meter shows a tuned game is running. Only these names work, numbers only, and each is clamped to a safe range (see `TUNABLES` in `src/core/config.js`): `SWEET`, `CURVE_SHAPE`, `CURVE_K`, `METER_SPEED`, `POWER_GRACE`, `NO_ACC_ERR`, `MISSED_POWER_FRACTION`, `CUP_CAPTURE_SPEED`, `WIND_K`, `FLIGHT_SPEEDUP`, the tree and rock values `OBSTACLE_REST`, `OBSTACLE_KEEP`, `CANOPY_SLOW`, `CANOPY_DEFLECT` (Phase K), and for slow phones `DPR_CAP` (fewer pixels, e.g. `DPR_CAP:1`) and `ANTIALIAS` (`ANTIALIAS:0` turns smoothing off), the aim values `TEE_AIM_CARRY` (S21) and `AIM_FLAT_RISE` (S22), and `MINIMAP_SCALE` (S22). The lie values work too: `<surface>.maxPower` and `<surface>.sweetScale` for `tee`, `fairway`, `fringe`, `rough`, `sand`, `green`, `rock`, plus the sand wedge's bunker values `sw.sand.maxPower` and `sw.sand.sweetScale`, e.g. [`?tune=rough.maxPower:0.8,sand.sweetScale:0.6`](https://ipb0mb3r.github.io/golfgame/?scenario=h1-bunker&tune=rough.maxPower:0.8,sand.sweetScale:0.6). Scenarios and tunes combine: `?scenario=h2-green-step&tune=SWEET:0.04`.

## Run the tests

You need [Node.js](https://nodejs.org/) 20 or newer. Nothing to install:

```
node --test
```

This runs the unit tests for the game rules in `src/core/` and replays the recorded baseline shots: `tests/fixtures/baseline.json` (recorded from the old pages, must match within 0.5 m) and `tests/fixtures/baseline-v2.json` (recorded from the current engine, must match within 0.01 m).

`tools/baseline.mjs` re-records or re-checks those shots in a real (headless) browser, and `tools/session-check.mjs` loads and unloads holes 10 times to check nothing is left behind. They are only for developers and need [Playwright](https://playwright.dev/): `node tools/baseline.mjs check`, `node tools/session-check.mjs`.

If the game can't start (an old browser, WebGL switched off, opened from the folder instead of a server), the intro card says why in plain words.

## How the code is organised

```
index.html            the only page: HUD, cards, and it loads src/game/main.js
hole2.html            forwards old links to index.html?hole=pl-02
src/core/             the game rules in plain JavaScript (no Three.js, no page code), tested with node --test
  config.js           every tunable number (gravity, meter speed, cup size, ...)
  clubs.js            club table and the lie penalty
  surfaces.js         how each surface treats the ball, plus per-hole overrides
  terrain.js          slope helpers and makeTerrain(hole)
  swing.js            the 3-click meter and turning a swing into a launch
  ball.js             flight, bounce, roll, cup and penalties, one fixed step at a time
  play.js             one hole's rules: strokes, lie, club pick, the fixed-step clock, what happens after each shot
  states.js           which game states and meter phases are which (one list for everyone)
  validate.js         checks hole and scenario data when it loads
  rng.js, vec.js, scoring.js
src/holes/            one file per hole (layout, hills, surfaces, scenery) and sets.js
src/game/             the Three.js scene, camera, HUD, input and debug overlay; session.js = one hole, loaded and unloaded
vendor/three-0.187.0/ Three.js itself and its model loader add-ons (unmodified, MIT license)
tests/                node --test files and the baseline shots
tools/                baseline.mjs checks the old-pages baseline in a browser; record-baseline-v2.mjs re-records v2; session-check.mjs checks hole unloading
```

**Adding a hole** means adding a file in `src/holes/` (copy the shape of `hole1.js` or `hole2.js`) and one line in `src/holes/sets.js`. The engine itself is never copied. See `docs/DESIGN.md` for the full plan.
