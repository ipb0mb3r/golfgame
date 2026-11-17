# Gate A review: Maintainability

**Reviewer:** Maintainability (independent, read-only) · **Date:** 2026-11-17 · **Commit:** `main` @ `a217b61` (after Phase 0, Feel passes 1–2)
**Tests at this commit:** `node --test` → 133 pass, 0 fail.

## Summary

The Phase 0 split worked. `src/core/` has no Three.js, DOM, `window` or `Math.random()` (checked with grep). Holes really are data, and the core modules are small, commented and well tested. Adding a third hole today means one new file plus one line in `sets.js`, as promised.

The risk has moved into the **game layer**. `main.js` is a single-hole boot script that also owns some of the hole's rules (stroke limit, penalty flow, when the next shot starts). Several "which state are we in" lists are copied across files, and one copy is already out of date. These are the places where the next three phases (Rain, Rounds, Menus) will break things that work today. None of them is hard to fix now. All of them get harder after R1–R5 and M1–M6 are built on top.

Severity is about **future development cost** for this prototype, not about production quality.

---

## Findings

### A1 · High · Hole flow rules live in the game layer, outside the tests
**Where:** `src/game/main.js:133-161` (`stopped`, `penalty`, `holed`, `showResult`), `main.js:72` (`later` / `setTimeout`)
**Problem:** What happens after the ball stops is decided in `main.js`. That covers the stroke-limit "picked up" check, the penalty then return-to-last-position sequence, holed then result, and the order of those checks. It is driven by `setTimeout`. `play.js` only reports events, and `main.js` turns them into rules.
**Why it matters:** R1/R2 (`round.js`, scorecard) need exactly this logic: whether a hole is finished, whether it was picked up, and what to do next. Today it can't be run in Node, so DESIGN §8's "a simulated 2-hole round gives the correct total" can't be tested without a browser. A round dev will either duplicate it in core or test it only by hand. DESIGN §9 also says the game layer "never owns rules".
**Suggested fix:** Add a small hole-flow step to core, e.g. `play.afterEvent(ev)` → `{ next: 'aim' | 'returnToLast' | 'holed' | 'pickedUp' }`, and test it. `main.js` then only maps `next` to a delay and visuals. `round.js` consumes the same `holed` / `pickedUp` result.

### A2 · High · The game layer is built once per page load, so there is no way to unload a hole
**Where:** `src/game/main.js:36-65` (module-level `const play`, `scene`, `props`, `hud`, `minimap`), `src/game/input.js:8-31` and `src/game/debug.js:19` (listeners on `window` and buttons, never removed), with no `dispose()` anywhere in `src/game/`
**Problem:** Everything is created at the top level of `main.js` for one hole. Changing hole today means reloading the page. The renderer, scene, terrain mesh, course texture, props and listeners have no teardown.
**Why it matters:** R3 ("hole loading/unloading with no leftovers") and M3/M6 (quit to menu, play again, no leftover state) depend on this. If it's done late, the usual result is duplicated input handlers (a click fires twice on hole 2), leaked GPU textures, or timers from the previous hole firing on the next one.
**Suggested fix:** Split `main.js` into a long-lived **app** (renderer, input binding, HUD shell, loop) and a per-hole **`createHoleSession(hole, opts)`** that returns `{ frame(dt), onSwingInput(), dispose() }`. Input calls whichever session is current. Do this as its own task before R3.

### A3 · High · State and phase lists are copied in four places, and one copy is already wrong
**Where:** `src/core/swing.js:28` (`isSwinging`), `src/game/hud.js:17` (`isAiming`), `src/game/main.js:73` (`aiming`), `src/game/camera.js:13`
**Problem:** "Is the player aiming or swinging?" is written out four times. `camera.js:13` lists `intro|aim|power|accuracy` and **misses `grace` and `nopower`**, which S8 added. In those phases the camera falls through to the "drift" branch (`return 1.5`), so it eases at a different rate than while aiming. The visible effect is small today, but it shows how this goes wrong: S8 updated the core and missed a copy in the game layer.
**Why it matters:** Menus add `paused` and `menu`, rounds add `between-holes`, and S9 (overpower) may add a meter phase. Each one needs edits in four files, and nothing tells you if you miss one.
**Suggested fix:** Export the predicates from one place (`isSwinging(phase)`, `isAimingState(state)`) and use them everywhere, including `camera.js`. Add a test that every meter phase in `swing.js` is either swinging or `aim`/`done`.

### A4 · High · Rain (W2) can't go only through `getEffectiveSurface()` as the code stands
**Where:** `src/core/clubs.js:28-31` (`lieFor`), `src/core/surfaces.js:20-26`, `src/core/play.js:16-18`, `docs/DESIGN.md` §7
**Problem:** Three things block the "one function for all weather" rule:
1. The lie (`maxPower`, `sweetScale`) is decided in `clubs.lieFor()`, and a club's `lieOverrides` **replace** the surface values. A wet-bunker bonus applied in `getEffectiveSurface()` would reach the 9 Iron in a bunker but **not the sand wedge**, which is the club actually used from bunkers.
2. DESIGN §7's bunker rule says `lie +0.1 × wetness`, but the `lie` field was removed in S11. The spec points at something that no longer exists.
3. `createHolePlay(hole, { seed })` reads weather only from `hole.weather`. W1/W5 ("a hole set can override the weather") would have to mutate the shared hole object or change this signature.

**Why it matters:** The W2 dev has to make design decisions the spec doesn't cover (does rain change the cap, the timing window, or both, and does it apply on top of the sand wedge?). The obvious fix also scatters a weather `if` into `clubs.js`, which is exactly what DESIGN §7 forbids.
**Suggested fix:** PM: rewrite the §7 bunker rule in `maxPower` / `sweetScale` terms and say whether it applies on top of club overrides. Code: give `lieFor` the weather (or have it read an already-weathered table), and add `weather` to the `createHolePlay` options, defaulting to `hole.weather`.

### A5 · Medium · The tunables design works today but gets fragile as it grows
**Where:** `src/core/config.js:83-113`, `src/core/tune.js:13-18`, `src/core/play.js:18`
**Problem:**
- Adding one `?tune=` name takes **four edits** in `config.js`: `export let`, a `TUNABLES` entry, a `SETTERS` entry and a `DEFAULTS` entry. Missing one gives a silent no-op or a reset that doesn't reset.
- Lie tunes (`rough.maxPower`) work by **mutating the shared `BASE_SURFACES` and `CLUBS` objects** in place. They only take effect because `applyTune` runs before `createHolePlay` copies the table (`main.js:25` vs `:36`). Nothing enforces that order.
- A hole's `surfaceOverrides` win over a tune without saying so. If a hole overrides `green.maxPower`, then `?tune=green.maxPower:0.8` shows as TUNED but does nothing on that hole.
- `export let` live bindings mean any module can read a value that changed mid-test. Tests rely on `resetTunables()` / `resetAllTunables()` being called by hand (`tests/lie.test.js:12`, `tests/swing.test.js:81-86`).

**Why it matters:** Rain adds about 5 `WET_*` tunables, and a Settings menu (M4) will want to change values at runtime, after the hole is built. A mid-round change won't reach the snapshotted surface table, and that will be hard to debug.
**Suggested fix:** Generate `SETTERS` and `DEFAULTS` from one table (`{ SWEET: { def: 0.05, min, max } }`) so a tunable is one line. Keep base tables frozen, and apply lie and surface tunes as an extra override layer inside `getEffectiveSurface` / `lieFor` instead of mutating them. Write down the rule "tunes are read when a hole starts".

### A6 · Medium · Hole files contain round navigation and shared help text
**Where:** `src/holes/hole1.js:20,64-75` (`number`, `intro.steps`, `intro.link`, `intro.resultLink`), `src/holes/hole2.js` (same), `src/game/hud.js:22-39`
**Problem:** Each hole hard-codes its own number, a "next hole" link and a copy of the how-to-play controls as HTML. The order of holes is therefore written twice, in `hole.number` / `resultLink` and in `sets.js`. The controls text is duplicated per hole.
**Why it matters:** Once R1/R4 play holes in set order, a hole's "Next: Hole 2" link and its number will disagree with the set (hole 2 is hole 1 of "Slope Test"). M1's "How to Play" needs the controls text in one place. Every new hole copies a growing intro block, and a controls change (S14 2-click putting) means editing every hole.
**Suggested fix:** Hole number and next hole come from the round and set. How to play moves to one shared module, which the menu and the first intro both use. A hole keeps only its own `subtitle` and `blurb`. Remove `link` / `resultLink` in R4.

### A7 · Medium · DESIGN.md and TASKS.md have drifted from the code
**Where:** `docs/DESIGN.md`, `docs/TASKS.md`
**Problem:** Agents treat DESIGN as the source of truth, so these mismatches will mislead them:
- §4 surface table still has a `lie` column (`.85`, `.6` …) and the §10 glossary defines `lie` as a "power multiplier". Both were removed in S11.
- §4 "Ball states" lists `aim → power → accuracy → flight …` without the S8 phases `grace` and `nopower`.
- §7 rain rule uses `lie` (see A4).
- §9 tree lists `meter.js`, `minimap.js`, `menus.js`, `weatherFx.js`, which don't exist (meter and minimap are in `hud.js`). It leaves out files that do exist: `core/tune.js`, `holes/scenarios.js`, `tools/record-baseline-v2.mjs`, `tests/fixtures/baseline-v2.json`. Planned and existing files aren't marked differently.
- §9 hole contract leaves out `number`, `scenery` and `intro`, which `tests/core.test.js:93` requires.
- Acceptance boxes in §3 (determinism, hook/slice sign, power 0/1), §5 (uphill vs downhill, green step) and §6 (putt ±5%) are unticked, but `tests/swing.test.js` and `tests/ball.test.js` cover them.
- TASKS roadmap still says Phase 0 is "in review" and "⭐ NEXT".

**Why it matters:** AGENTS rule 7 tells devs to stop and ask when code and DESIGN disagree, so every stale line costs a round-trip. Or a dev "fixes" the code back to the doc.
**Suggested fix:** A PM docs pass: fix the items above and mark the §9 tree entries as ✅ exists or (planned).

### A8 · Medium · Two ways to hit the ball, and play's state is written from outside
**Where:** `src/core/play.js:117-120` (`swing`, unused), `src/game/main.js:108-123` (`endSwing` / `hit`), `main.js:165`, `main.js:280-281`
**Problem:** `play.swing(result)` was added to handle `cancel` in core, but `main.js` doesn't call it. It has its own `endSwing` with its own cancel check, then calls `play.hit()`. The club and aim are set by assigning `play.clubIdx` / `play.aim` directly: `changeClub` clamps, `window.__golf.clubIdx = 99` doesn't, and nothing re-prepares the lie or cap after a change.
**Why it matters:** The S8 cancel rule now exists twice. A change to how a swing ends (S9 overpower, S14 2-click putts) has to be made in both, and tests only cover the core one. Direct field writes mean a future rule like "changing club updates the cap and the ⚑" has no single place to go.
**Suggested fix:** `main.js` calls `play.swing(result)` and reacts to `null` for cancel. Add `play.setClub(i)` and `play.setAim(a)` (clamped) and use them from `main.js` and `__golf`.

### A9 · Low · Feel numbers in the game layer are outside config
**Where:** `src/game/camera.js:14-33` (distances 3.5 / 7 / 11 / 30 m, heights 1.6 / 2.6 / 3.5, ease rates 5 / 3 / 2.2 / 1.5), `src/game/main.js:221-223` (cup-drop animation 10, 0.3, 1.2), `src/game/coursePainter.js:4-17` (surface colours)
**Problem:** Coding rule 2 (no magic numbers in logic) is followed in core but not here. The camera numbers are game-feel values the designer will want to tune, and they can't go through `?tune=`. The painter colours are fixed in code.
**Why it matters:** W3 needs a "wet ground tint" and a darker sky, and future courses need their own palettes. Today that means editing `coursePainter.js` for each look. Camera feel changes can't be tried by the designer from a link.
**Suggested fix:** Add a `CAMERA` block to `config.js` (or a `src/game/view-config.js`). Move surface colours into a palette that `hole.scenery` or the weather can override, ready for W3.

### A10 · Low · DOM ids are scattered string literals, and `main.js` writes to the HUD directly
**Where:** `src/game/main.js:55-56,173,216` (`$('notice')`, `$('tuned')`, `$('intro')`, `$('distTxt')`), `hud.js`, `input.js:9-31`, `debug.js:11-12`; markup in `index.html`
**Problem:** About 30 element ids are referenced as strings across five modules. `main.js` bypasses `hud` to set `distTxt` every frame and to show the notice and TUNED badge. Menus (M1–M4) will add a lot more markup.
**Why it matters:** Renaming or restructuring the HUD for menus breaks things with no error: `$()` returns `null` and the first property write throws only when that code path runs.
**Suggested fix:** Keep all DOM reads and writes in `hud.js` (and a future `menus.js`). `main.js` calls `hud.setDistance()`, `hud.showNotices()` and so on. Optionally, `hud.js` can check its required ids once at start-up and log any that are missing.

---

## Is the structure ready for what's next?

| Next work | Ready? | Blocking findings |
|---|---|---|
| More holes | ✅ Yes: one file plus one line in `sets.js`. Surface ids are validated by a test | A6 (copy-pasted intro block) |
| Rain W1–W5 | 🟡 Mostly. `getEffectiveSurface` and `makeSurfaceTable` are in the right place | A4 (lie and club overrides, the `lie` field in the spec, weather option), A5 (tunables), A9 (tint) |
| Rounds R1–R5 | ❌ Not yet. No hole teardown, and the hole-flow rules are in `main.js` | A1, A2, A6 |
| Menus M1–M6 | ❌ Not yet. Same teardown issue, plus state lists that new states will miss | A2, A3, A10 |

## Top 3 recommendations

1. **Before R1: move hole flow into core and make a hole session disposable (A1 + A2).** One refactor task, e.g. `F12`, that leaves gameplay unchanged (baseline-v2 must pass untouched). It turns rounds and menus into "create session, dispose session" instead of a rewrite of `main.js`.
2. **Before W2: settle the rain-and-lie rules in DESIGN (A4) and make tunables one line each (A5).** The PM fixes §7 so it no longer uses `lie`, decides whether rain changes the sand wedge's lie, and makes `lieFor` weather-aware. Then the rain dev doesn't have to guess.
3. **Now, cheaply: one source of truth for states (A3) and a docs sync (A7).** A3 is a small fix for a live inconsistency, and it stops each new state from silently breaking the camera, HUD or input. A7 keeps "DESIGN is the source of truth" true, which the whole agent workflow depends on.
