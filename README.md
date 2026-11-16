# Pocket Links

An original, simple 3D arcade golf game that runs in the browser, with a three-click swing. Built with [Three.js](https://threejs.org/) and plain JavaScript modules: no build step and nothing to install.

## Play

Once GitHub Pages is switched on, the game is at **https://ipb0mb3r.github.io/golfgame/**.

| Hole | Link | What it is |
| --- | --- | --- |
| 1 | [`index.html?hole=pl-01`](https://ipb0mb3r.github.io/golfgame/?hole=pl-01) (also the default) | Flat par 3, 166 yards, over a pond to a green with three bunkers |
| 2 | [`index.html?hole=pl-02`](https://ipb0mb3r.github.io/golfgame/?hole=pl-02) | Hilly par 5, about 490 yards, with a two-level green (prototype) |

The intro and score cards link from one hole to the other. Old links to `hole2.html` still work: that page now forwards to `index.html?hole=pl-02`.

## How to play

| Action | Keyboard | Mouse / touch |
| --- | --- | --- |
| Aim | ◀ ▶ arrow keys (or A / D) | Hold the ◀ ▶ buttons |
| Change club | ▲ ▼ arrow keys (or W / S) | ‹ › buttons |
| Swing | Space (three presses) | Click the course or the SWING button (three times) |
| Debug overlay | ` (backtick) | |

**The three-click swing**

1. First click starts the meter moving right.
2. Second click sets **power**. The ⚑ mark on the meter is roughly the power needed to reach the pin.
3. The marker swings back. Third click sets **accuracy**: stop it on the green line for a straight shot. Too early curves the ball left (hook), too late curves it right (slice).

Wind (top right) pushes the ball while it is in the air. The rough and bunkers cost you power. Water and out of bounds cost a penalty stroke. On hole 2 the ball follows the hills, and the **Slope** readout (top left) tells you if you are hitting uphill or downhill and which way a putt breaks.

## Run it on your own computer

The game is made of JavaScript modules, and browsers only load those from a web server (opening `index.html` straight from the folder will not work). Any small local server is fine. With Python:

```
python3 -m http.server 8000
```

Then open http://localhost:8000 (hole 1) or http://localhost:8000/?hole=pl-02 (hole 2). It needs an internet connection to load Three.js.

Useful extras in the address bar: `?hole=pl-02&seed=42` replays the same wind every time.

## Run the tests

You need [Node.js](https://nodejs.org/) 20 or newer. Nothing to install:

```
node --test
```

This runs the unit tests for the game rules in `src/core/` and replays the recorded baseline shots (`tests/fixtures/baseline.json`) to check that both holes still play the same.

`tools/baseline.mjs` re-records or re-checks those shots in a real (headless) browser. It is only for developers and needs [Playwright](https://playwright.dev/): `node tools/baseline.mjs check`.

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
  play.js             one hole's rules: strokes, lie, club pick, the fixed-step clock
  rng.js, vec.js, scoring.js
src/holes/            one file per hole (layout, hills, surfaces, scenery) and sets.js
src/game/             the Three.js scene, camera, HUD, input and debug overlay
tests/                node --test files and the baseline shots
tools/baseline.mjs    records / checks the baseline shots in a browser
```

**Adding a hole** means adding a file in `src/holes/` (copy the shape of `hole1.js` or `hole2.js`) and one line in `src/holes/sets.js`. The engine itself is never copied. See `docs/DESIGN.md` for the full plan.
