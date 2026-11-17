# Gate A: Testing review (QA2)

Reviewer: independent Testing agent · Code: `main` @ `a217b61` (after Phase 0, Feel pass 1 and Feel pass 2) · 2026-11-17
Scope: `src/core/`, `src/holes/`, `tests/`, the two baselines and `tools/record-baseline-v2.mjs`. No code was changed. The browser was not run.

## 1. Test run

```
node --test        (Node 22.23)
# tests 133 · pass 133 · fail 0 · skipped 0 · ~0.8 s
```

Everything passes, and it's fast enough to run on every change.

### How I judged the tests
Besides reading them, I ran a quick **mutation probe**: I copied the repo to a scratch folder, made 32 small changes to the
code one at a time (a tunable nudged ~20%, a `<=` changed to `<`, one rule switched off), and ran `node --test` after each.
A good test suite should fail on most of them.

- **18 of 32 were caught.** Several were caught **only** by baseline v2 (for example sand `decel`, `WIND_K`, `ROLL_TIMEOUT`, `FRINGE_PUTT_DIST`). So v2 does real work.
- **14 of 32 passed every test** (nothing noticed the change):
  sand `rest` .02→.10 · `LIP_OUT.keep` .6→.4 · `LIP_OUT.rearm` 1.5→1.05 · `BOUNCE_TO_ROLL` 1.2→1.5 · `CUP_FLY_IN` 1.4→1.0 ·
  `MIN_POWER` .02→.1 · `MISSED_POWER_FRACTION` .15→.25 · `POWER_GRACE` .15→.08 · `PUTT.aimErrorK` .25→.5 ·
  `PERFECT_POWER` · `SLIGHT_ERROR` · removing "a ball at rest over the cup drops" (`ball.js:89`) ·
  grace edge `<=`→`<` (`swing.js:54`) · removing the "falling" check in `landingPoint` (`play.js:73`, that's P9).

Those 14 are the main input for the findings below.

## 2. Module table

Quality: 1 = no real tests, 3 = main behaviour checked but clear gaps, 5 = behaviour and edges checked.

| Module | Tests? | Quality 1–5 | Missing cases |
|---|---|---|---|
| `core/ball.js` | ball.test (12), baselines v1/v2 | **3** | How a roll ends (friction or the 40 s `ROLL_TIMEOUT`, see T1). Fly-in radius (`CUP_FLY_IN`). Lip-out re-arm and drop on the way back. Ball at rest over the cup drops. Ball exactly on the cup edge (`dist == CUP_R` doesn't drop, strict `<`, not written down anywhere). `BOUNCE_TO_ROLL`. Landing in sand (`rest` .02). Bunker on a slope. Bowl or hollow at rest. |
| `core/swing.js` | swing.test (8), missed-clicks.test (8), lie.test | **4** | Meter rows S8 are well covered. Missing: **putt** accuracy (direction and size of a mistimed or shanked putt, T5). `MIN_POWER` value (power-0 test only checks "moves"). Grace window exactly at the edge (only ±0.01 s tested). A frame longer than the whole meter in the accuracy phase. Label thresholds. |
| `core/play.js` | core, ball, lie, pin-mark, autopick, scenarios, baselines | **4** | Frame-rate independence is tested well (24–240 fps). Missing: `landingPoint` when the ground rises above a climbing ball (P9). ⚑ exactly at the cap. `puttMax` clamp at 6 and 36 m. Penalty on the 2nd+ shot goes back to the *last* spot, not the tee. `pickedUp` at `maxStrokes`. `advance()` with 0, negative or huge `realDt`. |
| `core/clubs.js` | core, autopick (12), lie | **4** | Auto-pick rules are well tested per lie. Missing: `makeBag` with an unknown id (silently dropped, T7). A bag that is only the putter. Reach exactly at the 95% boundary. |
| `core/surfaces.js` | core, lie | **3** | Overrides that name an unknown surface or field are silently ignored or added (T7). `weather` is a no-op today, so W4 must add "wetness 0 = today" against baseline v2. |
| `core/config.js` | tune.test | **4** | Ranges and defaults checked. `setTunable(name, NaN)` stores NaN (`parseTune` blocks it, so only code can do it). |
| `core/tune.js` | tune.test (8), lie.test | **4** | **Bad `?tune=` values are well covered** (unknown names, `__proto__`, `Infinity`, `1e3`, clamping, empty, last-wins). Missing: the 20-pair cap. A lie tune on a surface a hole overrides (the hole's override wins over the tune, silently). |
| `core/terrain.js` | terrain.test (4) | **4** | Gradient vs analytic, plane, flat. Fine for now. |
| `core/rng.js` | core, scenarios | **4** | Seeds, reseed, `?seed=` junk. Fine. |
| `core/scoring.js` | core (1 test) | **3** | Albatross/condor, "1 stroke" singular, strokes 0. Small module, low risk. |
| `core/vec.js` | only indirectly | **3** | Fine as it is; it's used by every other test. |
| `holes/hole1.js`, `hole2.js` | core (registry), ball, pin-mark, baselines | **3** | Registry test samples 400 points for valid surfaces and finite heights, and checks tee/cup surfaces. Missing: bag ids valid, override keys valid, the pond water sits below its rim, no spot where the ball can't come to rest (T1). |
| `holes/scenarios.js` | scenarios.test (11) | **5** | Every scenario lands on the promised lie, retries are identical. Only gap: a NaN or off-map `ball` gives a quiet "green" lie instead of an error. |
| `holes/sets.js` | core | **5** | Case, unknown ids, `__proto__`. |

**Not tested at all (by design, but note it):** `src/game/` (848 lines). The hole flow in `main.js` (stopped → wait → prepare, penalty → pick up, cancel → aim, `maxStrokes`) has no tests. Phase 6 needs it in core (T10).

## 3. The baseline system

**v1** (`tests/fixtures/baseline.json`, 19 shots from the old pages, 0.5 m, physics only, replayed with the old swing mapping):
it did its job in Phase 0. Today it is mostly a subset of v2. In the mutation probe, every change v1 caught was also caught by v2.
The 0.5 m tolerance would miss a real regression on its own (sand decel 18→14, STATIC .4→.3 both stayed inside it), but v2 is there for that.

**v2** (`tests/fixtures/baseline-v2.json`, 22 shots from the engine, 0.01 m): the right idea, and the tolerance is right for a
deterministic engine (tight enough to catch anything, loose enough for tiny `Math.sin`/`exp` differences between Node versions).
The problems are *what it covers* and *how re-recording works*:

- **It barely checks the swing feel it is meant to guard.** 20 of 22 shots are straight; no shot starts from rough, sand or
  any lie with a cap below 1; no shank, topped or mistimed putt. Details in T2.
- **When to re-record is clear for "feel" changes, but not for physics changes** (T4), and the recorder overwrites
  everything without showing what moved (T3).

## 4. Findings (most important first)

### T1 · High · `src/core/ball.js:87-101` · many rolls on hole 2 only end through the 40 s safety net
**Problem.** A ball that comes to rest where the slope pull is just above `decel × STATIC` never meets the rest rule
(`sp < STOP_SPEED && pull <= hold`): friction and slope cancel, so it slows down forever and only stops when
`ROLL_TIMEOUT` (40 s of game time) fires. I measured on hole 2 (no wind, straight):
- 29 of 171 half-power putts from a grid on the green (17%) end by the timeout; the median roll is 11 s, the 90th percentile is 40 s.
- 58 of 342 full shots from the fairway and rough (17%) end by the timeout.
- QA's own case from Phase 0 (a tiny putt off the green step at 24.5, −442) is still crawling at 7 mm/s after 20 s and at 2 mm/s after 30 s, and stops at 40 s. QA reported it "settles, no endless creep" because it *looks* still.

Putts run at 1× real time, so the player may wait up to **~40 s** before they can hit again (full shots ~30 s at ×1.35).
**Why it matters.** It's a real gameplay hitch, and the tests can't see it: `ball.test.js:59-65` runs the step ball for
only 20 s and never checks how the roll ended; the `stopped` event looks the same for "came to rest" and "gave up".
**Suggested fix.** Let `stopped` say why (e.g. `reason: 'timeout'`) and add a sweep test that no shot on a real hole ends by timeout.
Then fix the rest rule (e.g. also rest once the ball has stayed below `STOP_SPEED` for a short time). The dev and PM should decide the rule (it's a physics change, see T4).

### T2 · High · `tests/baseline-v2.shots.js:10-18` · baseline v2 doesn't cover most of the swing feel
**Problem.** Of the 22 v2 shots, only 2 curve at all (`h1 forced max slice`, `h2 hook off the tee`). Since S10/S11,
**"h1 hook" and "h1 slice" (acc ±0.06 off the tee) are dead straight**: the tee window is `0.05 × 1.2 = 0.06`, exactly their
acc, so they sit right on the edge of the sweet spot. Every shot starts from tee, fairway, fringe or green with cap 1.
No shot is a shank, topped, mistimed putt, lip-out, sand or rough shot.
**Why it matters.** v2 is the only guard for "this PR must not change the feel". Today a change to the rough/bunker
roll, the curve of a small miss, the putt aim error, lip-outs or missed clicks can pass v2 untouched (see the 14 changes
nobody noticed in §1). And the two boundary shots flip from straight to curved on a one-in-a-billion rounding change.
**Suggested fix.** Add ~8 shots in `SHOTS` (re-record once, explained): rough and bunker (with and without the SW), a fringe chip,
hooks/slices at acc ±0.1 and ±0.15, a shank, a topped shot, a mistimed putt, a lip-out at a fixed seed, a landing in a sloped
bunker. Move "h1 hook/slice" off the boundary (or rename them "straight at the edge" and keep them on purpose).

### T3 · Med · `tools/record-baseline-v2.mjs:11-18` · re-recording overwrites everything without showing what moved
**Problem.** The recorder rewrites all 22 shots and prints only "wrote 22 shots". It doesn't say which shots moved, by
how much, or whether a club or end event changed.
**Why it matters.** Rule 8 asks the dev to explain the feel change in the PR, but nothing shows the reviewer or Alexis
whether *only* the expected shots moved. An unintended change can ride along with an intended one (S13 re-recorded v2
and the PR had to describe shot #19 by hand).
**Suggested fix.** Before writing, load the old file and print a table per shot: moved (m), old → new club, old → new
event, strokes. Paste that table in the PR. Optionally refuse to write if nothing changed.

### T4 · Med · `AGENTS.md` rule 8 · no rule for an intentional *physics* change
**Problem.** v1 is "frozen" and "checks physics only". v2 is re-recorded "for an intentional feel change". But coming
tasks change the physics on purpose: T6 (slope lie launch angle), W2 (rain) for wet holes, and the fix for T1. Any of
these can break v1, and the rules give no allowed path, so a dev must either break a rule or quietly loosen a test.
**Why it matters.** Unclear rules are exactly where baselines get "fixed" by bumping a tolerance.
**Suggested fix.** One line in rule 8: "An intentional physics change may retire v1 (delete the file and test in the
same PR, with the PM's approval); after that v2 is the only baseline." And define a feel change as "any change to v2 output".

### T5 · Med · `src/core/swing.js:107-108` · putt accuracy is untested
**Problem.** Nothing checks which way a mistimed putt goes or how far. Doubling `PUTT.aimErrorK` passes every test.
A shanked putt (no 3rd click) is pushed 8.6° right; DESIGN §3/S14 says a missed 3rd click on a putt "stays mild", but
nothing pins what "mild" is.
**Why it matters.** Putting is half the strokes, and S14 (2-click putting) will rework this code.
**Suggested fix.** Test: early putt goes left, late goes right, same size; shank push stays under an agreed angle (e.g. ≤ 10°).

### T6 · Med · `src/core/ball.js:58, 89, 103-115` · cup rules only half tested
**Problem.** The tests check "slow drops, fast lips out" and G8. Not checked: the fly-in radius (`CUP_R × 1.4`; changing it to
1.0 passes), the lip-out speed kept (`LIP_OUT.keep`), the re-arm distance and that a ball that left the cup can drop on the way back,
and "a ball that comes to rest over the cup drops" (removing that line passes). The exact cup edge (`dist == CUP_R`)
doesn't drop; that's fine but undocumented.
**Why it matters.** These are the "feels unfair" rules players notice most, and G8 already showed a bug can hide here.
**Suggested fix.** Four small tests: landing at 1.3 × `CUP_R` drops and at 1.5 × doesn't; a lipped ball rolling back down a slope
into the cup drops; a ball placed at rest over the cup drops; a ball at exactly `CUP_R` stays out.

### T7 · Med · `src/core/clubs.js:20-24`, `src/core/surfaces.js:20-25` · bad hole data fails silently or deep inside
**Problem.** Adding a hole is meant to be "just a data file", but:
- `makeBag(['drvier', '7i', 'putter'])` silently returns `['7i', 'putter']`.
- `surfaceOverrides: { grean: { decel: 0.1 } }` is ignored; `{ fairway: { decell: 9 } }` is quietly added.
- A `surfaceAt` that returns an unknown id (e.g. `'lava'`) crashes in `prepare()` with "Cannot read properties of undefined (reading 'maxPower')".
- A scenario with a NaN `ball` gives lie `green` instead of an error.

**Why it matters.** Phase 6 and later will add holes and sets. A typo should fail the tests with a clear message, not
make a hole quietly play differently.
**Suggested fix.** A small `validateHole(hole)` in core (known bag ids, override keys and fields, finite tee/cup) called
by the registry test, plus tests that feed it bad data.

### T8 · Low · `tests/missed-clicks.test.js`, `tests/swing.test.js` · tests read design values back from config
**Problem.** Most S8 tests compute their expectation from the constant itself (`POWER_GRACE`, `MISSED_POWER_FRACTION`,
`MIN_POWER`), so changing the value in `config.js` passes, even though DESIGN §3 lists 0.15 / 0.15 / ….
`SWEET`, `CURVE_SHAPE` and the lie table *are* pinned (good).
**Why it matters.** Small: these are tunables. But then the doc and the code can drift without anyone noticing.
**Suggested fix.** One "design values" test that pins every default listed in DESIGN (like `lie.test.js` "starting values").
Changing a default then means touching the doc, the test and the code together.

### T9 · Low · `tests/baseline.test.js:15` · a test file changes global settings at import
**Problem.** `applyTune(...)` runs when the file is loaded and never resets, changing `BASE_SURFACES` and `CURVE_SHAPE`
for that whole process. The file also exports `replay()`, so any test that imports it inherits the tune.
It's only safe because `node --test` runs each file in its own process. Also, `tune.test.js` resets with
`config.resetTunables()`, which doesn't reset lie values (`resetAllTunables()` does). And two tests still pass a stale
`lieFactor: 1` that the code no longer reads (`swing.test.js:7`, `missed-clicks.test.js:13`).
**Why it matters.** It makes for confusing failures as soon as someone imports from a test file or changes how tests run.
**Suggested fix.** Apply the tune in `before()` and call `resetAllTunables()` in `after()`. Use `resetAllTunables` everywhere. Drop `lieFactor`.

### T10 · Low · `src/game/main.js:107-160` · the hole flow lives only in the game layer
**Problem.** "Stopped → next shot", "penalty → back or pick up", "cancel → aim, no stroke" and the `maxStrokes` pick-up
are in `main.js`, so no test covers them (only `play.swing()` for cancel and the `pickedUp` getter).
**Why it matters.** Phase 6 (rounds, R1–R5) builds on exactly this flow, and R5 asks for "a picked-up hole is counted correctly".
**Suggested fix.** When R1 adds `round.js`, move the per-hole flow into core next to it and test a full hole headless (tee → holed, tee → picked up).

## 5. Top 3 recommendations

1. **Fix T1 and make it testable.** Have `stopped` say whether the roll ended by the safety net, and add a sweep test over
   both holes that no shot ends that way. It's the only finding that a player feels today.
2. **Make baseline v2 cover the feel it guards (T2), and make re-recording show its diff (T3).** About 8 more shots and a
   printed old → new table turn v2 from "a few straight shots" into a real feel check, and make each re-record easy to review.
3. **Write down the physics-change path in rule 8 (T4)**, before T6, rain or the T1 fix need it. Then add the small cup,
   putt and hole-data tests (T5–T7) in the next dev pass; together they're under an hour of work.
