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
- ✅ **Putting is 2 clicks** (S14, owner 2026-11-18: "remove the accuracy entirely when putting… slicing is not really a thing while putting"). With the **putter** the swing is click 1 start, click 2 set the power, and that click hits the putt: there is no accuracy phase. **A putt is always struck straight**: it rolls exactly along the aim, with no pull, push or curve from timing (`resolveShot` ignores `acc` and a `'shank'` outcome for the putter; `PUTT.aimErrorK` is gone). Every other club (full shots, and chips, also from the fringe or the green) keeps 3 clicks. `swingClicks(club)` (core) says which; the game arms the meter as a putt meter (`m.putt`) at click 1. **The bar for a putt** shows only the power side (0 to 1 across the whole bar), its 4 sections and the ⚑; the accuracy side, the accuracy window and its edge lines and the "◀ accuracy" label are hidden. The hints say "Putt: click to start, click again to set power". The lie line drops "easier timing" for a putt (there is no timing), e.g. "Green" or "Fringe". **No timing grade on a putt** (PM on PR #61): no "Nice shot!" / "Perfect!" flash after a putt (a mini putt still says "Topped!"; the holed, lip-out and result flashes are unchanged). On the putt bar the marker stays inside the rounded left end at 0 (`HUD.puttMarkerMinPx`, 8 px). Space, a click or a tap all work as for a full swing.
- Inputs: Space, a click or tap on the course, or the SWING button. Aim with ◀ ▶ / A D and change the club with ▲ ▼ / W S. ✅ **X14 (owner 2026-11-19: "aiming on PC stutters a lot")**: holding an aim key or an on-screen aim button turns the aim **every frame** by game time (never the OS key repeat), so it is the same speed at any frame rate. It starts at 0.4× (`AIM_START_K`; a tap is a fine nudge), reaches the aim speed (`AIM_SPEED`, `AIM_SPEED_PUTT` with the putter) after 0.3 s (`AIM_RAMP_S`) and, held past 1.2 s, speeds up gently to 1.6× (`AIM_FAST_K`) over 0.8 s; **Shift + A / D** turns at 0.25× (`AIM_FINE_K`) for fine adjusting (X14 had Shift + ◀ ▶; since Phase BC, PM on PR #68, Shift + the arrow keys move the impact dot instead, and plain arrows still aim). The four are `?tune=` tunables (PM on PR #65), e.g. `?tune=AIM_START_K:0.6,AIM_FINE_K:0.3` (`core/aim.js` `aimTurn`). The aiming view's free band (V1, `measureFrame`) is measured only when the state changes, a HUD panel changes size or the window resizes, not on every aim step. ✅ Only a primary press swings (Gate A C7): a mouse needs its left button (right and middle clicks do nothing, and a right click on the course opens no menu); every finger counts on a touch screen, so two-thumb play works (hold Aim, tap SWING); Ctrl / Cmd / Alt + Space is a browser shortcut, not a swing.
- ✅ **The meter reads the real click time** (S16, Gate A C3): each click carries the time it happened (the input event's `timeStamp`), and core moves the marker to that moment before reading it (`pressMeterAt` / `tickMeterTo` in `swing.js`; each move is still capped at `MAX_METER_DT`). The same click times give the same swing at 30, 60 or 144 fps (tests/meter-clock.test.js); before, a click read the marker where it was at the last frame (up to 0.033 meter units off at 30 fps).
- ✅ **Default aim** (S18, designer: "the automatic aim is too strong"). Each shot starts aimed at a sensible point, not at the pin, so the player adjusts to the flag and reads the wind:
  - **on the green or the fringe** (a putt, or a chip from the fringe with a club): the cup (PM on PR #27: a fringe chip aimed away from the flag felt broken)
  - ✅ **within `CHIP_AIM_RANGE` (30 m, tunable) of the cup, on any surface** (bunker, rough, fairway…): the cup (S19, owner: from close to the green the player always wants the flag). `play.targetKind` is `'chip'` and the scorecard says "Aim: the cup (within 33 yd)", so the player sees why. `?tune=CHIP_AIM_RANGE:0` turns it off
  - ✅ **every tee shot (par 3, 4 and 5): straight ahead along the tee's facing** (S21, owner playtest 2026-11-18: "the automatic aiming is still way too easy. On the tee box, the aiming should just be straight away instead of on the green. It's ok sometimes if the default aim ends not in the fairway, makes the player adjust it"). **The facing** (`play.teeFacing()`) is straight down the hole's −z axis (every tee box is drawn square to it), unless the hole's optional `teeFacing: { x, z }` names the point a turned tee box faces (the course designer sets it; PM on PR #53). The aim point is on that line at the selected club's **carry** × `TEE_AIM_CARRY` (1, tunable: `?tune=TEE_AIM_CARRY:0.9`), not a solved spot, so it may end in the rough, a bunker or under trees and the player adjusts. It moves with the club when the player changes club (the direction stays). `play.targetKind` is `'tee'`, the scorecard says "Aim: straight ahead (tee)". **The auto-pick on the tee** is the shortest club that reaches the landing area: a par 4/5's optional `aimTarget`, a par 3's green centre, else the cup (rule 3 below; the Driver on holes 2 and 3, the 7 Iron on hole 1). `aimTarget` no longer steers the aim. Before S21: par 4/5 tee shots aimed at `aimTarget` itself and par 3 tee shots at the green centre.
  - **everything else** (approaches, bunker shots): the **centre of the green** (`features.green`)
  - The ⚑ mark and the auto-pick use the distance to this point (`play.targetDist()`), also after the player turns the aim. The HUD "To pin" is unchanged; the aim line ends in the S22 marker. `play.target` / `play.targetKind` say where it aims; the scorecard shows it under the lie ("Aim: green centre / straight ahead (tee) / the cup / the cup (within 33 yd)", so a new player learns the rule) and the debug overlay too.
- ✅ **S22 (owner, playtest 1): the ⚑ is for putts only.** Full shots and chips show no ⚑; the player reads distance from the **power bar's 4 equal sections** (25/50/75/100%, `POWER_SECTIONS`) and the **aim marker**: the aim line (3D and minimap) ends in a triangle where a straight, no-wind shot at 100% **lands** (carry, hills included; the same point as "max N yd"), with a short bar across the line where 25%, 50% and 75% land, and a label at the marker: the carry in yards and the ground there, "164 yd · Flat", "152 yd · ▲ 5 yd" (the landing spot is above the ball) or "▼ 3 yd" ("Flat" within `AIM_FLAT_RISE`, 0.5 m, tunable). Carry is exactly linear in power (`launchVelocity`: carry = power × club carry, measured on the real ball within 0.003 of 25/50/75% on flat ground and ±5% slopes), so a section of the bar is a quarter of the carry along the line. **On a capped lie** (rough 85%, sand 50%) the marker sits at the cap, where the ball can actually go, greyed (owner on PR #53: no "max N%" in the label, the bar and the lie line already show it); only the ticks below the cap are drawn, so a tick means the same power everywhere (PM on PR #53). Wind stays the player's read. A putt keeps the small ring and the ⚑. **Owner on PR #53:** the **minimap's** aim line shows only the 50% tick (`MINIMAP_TICKS`) and the end triangle (the 3D line keeps all three ticks); the **minimap is 1.2× bigger** (`MINIMAP_SCALE`, +44% area, `?tune=`), and `hud.js` `fitMinimap()` shrinks it (same shape) only as far as needed to end above the bottom panel (meter and controls), or lets a narrow one run down beside the panel on a wide landscape screen (replaces the fixed CSS cap of 100vh − 240 px). ⏩ Skip may sit over the minimap's corner while the ball moves (PM on PR #53: it only shows then). The "◀ accuracy / power ▶" labels sit below the accuracy frame. **The accuracy window** (the third-click target) also has two thin, semi-transparent edge lines that show 6 px above and below the bar, so the window is easy to find without competing with the moving marker (owner on PR #53: a bold white frame was "way too bold" and hid the timing). They sit behind the bar, so inside it the marker stays the highest-contrast thing. Thickness, opacity and overhang: `HUD.accFrame` in config.js. `play.aimMarks()` / `aimMarkLabel()` (core) give the marker, ticks and label. The yellow ring of full shots is replaced by the marker. **Since PR #63** (owner: "the landing triangle is way too big") the 3D marker is a **small cone pointing down at the landing spot, hovering just above it**, with a small dot on the ground under it and the label just above it. Its size is `HUD.aimPin.screenK` × the camera distance, clamped to 0.6–4.5 m and × `AIM_PIN_SIZE` (1, `?tune=`), so it reads from the tee without covering the fairway and stays small in the 🔍 Landing view. Same colours and states (yellow, grey capped, red tree, blue water/OB); the 3D ticks and the minimap marker are unchanged. (The putt ring had also been drawn, oversized, around every full-shot marker since S22: `props.js` set `visible` to `undefined`; fixed in PR #63.)
- ✅ **S23 (owner): the aim marker warns when it lands in water or out of bounds.** When the marker's landing spot (full power, or the cap on a capped lie, the same point as S22) is on a penalty surface (water, OB, or a surface a hole makes a penalty), `play.aimMarks().hazard` is `{ id, name }` and the marker, its label and the minimap's aim line turn **blue** (`#46b4ff`; the obstacle warning stays red, and grey means capped), and the label names the penalty instead of the ground: "215 yd · Water", "293 yd · OB" (`aimMarkLabel`). Blue wins over the capped grey (the label stays the capped carry). An obstacle warning (K4, red) wins over blue: the ball would hit the tree first. It is where the ball **lands**, like the marker: a ball that lands on a creek's lip and runs in is not flagged (the player reads the roll, as with the ground label), and a putt never warns. No hint line (the HUD is busy, owner). Examples: `?scenario=mtn6-feeder-bank` with the 3 Wood (long into the creek), `?hole=mtn-03` with the Driver (OB; since X14 only the full-power flight is checked for trees, and it flies past them, so the default aim shows blue), `?scenario=mtn5-carry-pond` with the 5 or 7 Iron (short is wet). tests/aim-hazard.test.js.
- The **⚑ mark** (since S22 putts only; the core value `play.pinPower()` is still kept for every shot: validateHole and tests use it) shows the power needed to reach the default aim point (S18; the pin for a putt), adjusted for elevation (S12). ✅ Since S15 it is the power at which the ball **comes to rest** there: core plays the whole shot (flight, bounces, roll, slopes, cup) on a second, invisible ball with no wind and a straight hit (`play.restPoint()`), so a long club's run-out is included (before, every club landed 95% of the way and a 3 Wood finished 7–11 m past the pin, QA G2). With no wind and a straight shot, every club at 100–180 m finishes within 2 m of the target on flat ground and on ±8% slopes (tests/pin-mark.test.js; on a straight test hole it usually drops). Where no power finishes there, because a short ball lands on a bank and rolls back while a longer one carries onto the top and runs on (below hole 2's raised green), the ⚑ takes the power with the closest finish. ✅ **Chips stop short** (PM on PR #31, "harder is much better"): within `CHIP_AIM_RANGE` of the cup, with a club (not the putter), the ⚑ marks a finish `CHIP_FLAG_SHORT` (1.5 m, tunable) **short** of the cup, so a perfect ⚑ chip leaves a short putt and going for the hole means adding power on purpose. Compare with `?tune=CHIP_FLAG_SHORT:0` (finish at the cup) or `:3`. Above the lie's cap it sits in the grayed-out part (out of reach with this club). Near the right end of the meter the flag is drawn on the left of its line so it isn't cut off (H1). Rolling back off a tier is included since S15 only as far as the ⚑ picks the closest finish; reading a ridge stays the player's job (PM on PR #15).
- The club is picked automatically each shot (see "Club auto-pick") and the player can change to any club in the bag.

### Club auto-pick ✅ (task S13, decided 2026-11-16 by the game designer)
In this order (`clubs.pickClub`):
1. **Green**, or the fringe closer than `FRINGE_PUTT_DIST` (18 m): the putter.
2. **Bunker:** the sand wedge (if the hole's bag has one) when it reaches the default aim point within its own bunker cap (75% since S17, was 85%): it is the bunker club near the green. From a far bunker, rule 3 applies inside the 50% bunker cap (S17, was 60%) (never the Driver), so a fairway bunker is a real recovery choice (PM on PR #15).
Since S18 "reaches" means the distance to the default aim point (the green centre), not to the pin; on the tee (S21) it is the distance to the point the tee faces (`teeFacing`, `aimTarget` or the green centre); rule 1 still uses the distance to the cup.
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

✅ **On a putt** (S14, 2 clicks) the same rules apply at the power click, and the rows about the 3rd click go away:
| What the player does on a putt | Result | Stroke? |
|---|---|---|
| Both clicks | Normal putt, straight along the aim | Yes |
| Power click within `POWER_GRACE` after the meter reaches the top | Power = 1 ("MAX!"), the putt goes right away | Yes |
| Start, no power click (grace passed), then a click on the way back | **Mini putt**: power = `MISSED_POWER_FRACTION`, straight ("Topped!") | Yes |
| Start only, the marker comes back to **0** | **Putt cancelled**, back to aim | **No** |

A putt can't be shanked (there is no 3rd click). The putt meter's bottom is 0 instead of `METER_MIN` (the bar has no accuracy side), so a start-only putt cancels when the marker is back at 0 (≈ 1.74 s after the start click at `METER_SPEED` 1.15, instead of ≈ 1.91 s for a full swing).

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
| Rock (K1) | 0.90 | 0.8 |

**Putter:** the putter ignores `maxPower` on the fringe and the green (a club override, like the sand wedge), so a full putt always uses the whole putt range. It keeps the surface's `sweetScale` (green ×1.5, fringe ×1.0). Decided by the PM on PR #12.

Starting values. The designer tunes them with `?tune=` (X8), e.g. `?tune=rough.maxPower:0.8,sand.sweetScale:0.6,sw.sand.maxPower:0.9` (each clamped: `maxPower` 0.1–1, `sweetScale` 0.2–3). Later hooks: rain (W2) and slope lie (T6) may reduce `sweetScale` through the same function.

How it's built: `maxPower` / `sweetScale` live on each surface in `surfaces.js` (a hole can override them in `surfaceOverrides`); a club can override them per surface with `lieOverrides` in `clubs.js`. `clubs.lieFor(club, surface, surfaces)` is the one function that decides the lie (`play.lieOf()` for the ball's lie and current club). The meter's top is `meter.cap`; `resolveShot` also clamps power to the cap. The aim ring and club reach show the capped full shot. `play.pinPower()` places the ⚑ mark on the full 0–1 scale (above the cap = out of reach, shown in the gray part): since S12 it searches (bisection) instead of scaling the full-power carry, which was ~9% short up to a raised green. Since S15 it bisects on where `play.restPoint()` finishes (`LANDING_SIM.restIters` halvings, after a cheap bracket with the carry), keeps the answer until the club, aim, ball or target changes (the HUD asks on every aim change; ~1–3 ms on a laptop), and falls back to the closest finish (`LANDING_SIM.restTol`, 1 m) as described above. `restPoint()` uses its own ball and random numbers (restarted each time), so it never changes the real shot, the wind or the lip-outs. `landingPoint()` integrates the arc exactly and stops where it crosses the ground, so the aim ring and the club reach agree with the real flight to a few cm. The putter's override is in `clubs.js` (`lieOverrides` for fringe and green).

### Ball control: the impact point ✅ (Phase BC, owner 2026-11-19; BC1, BC2, BC4, BC5)
Design in TASKS.md Phase BC (BC0). How the core does it (`core/shape.js` `shapeOf`, `resolveShot({ impact, lieShape, handed })`, `play.setImpact()`):
- The impact point is `{ x, y }` in the unit disc as the player sees the ball (x < 0 left, y < 0 bottom); `play.impact` goes back to the centre in every `prepare()`. **A centre hit is exactly the shot before Phase BC** (same code path; baselines v1 and v2 unchanged). Putts ignore it (S14).
- **Curve (BC1):** the ball launches `x × start°` to that side (right-handed: left impact = starts left), and a constant push across the aim line brings it back by `BC_BACK` of the way at landing on flat ground with no wind (1 = it lands on the aim line at any power, `push = −BC_BACK·G·sin(start)/tan(loft)`; PM on #68: keep 1, the owner compares 1 / 0.88 later); it then rolls on toward the curve's side. Its carry is the club's along its own start line, so it comes down × cos(start) as far down the aim line (Driver full left: ≈ 1.5% shorter). Handedness: `createHolePlay(hole, { handed: 'left' })` or `?tune=BC_LEFTY:1` mirrors x.
- **Height (BC2):** loft − `y × height°` (bottom = higher), clamped to `BC.loftMin..loftMax`; the carry stays power × club carry on flat ground (PM on #68: top and bottom keep the same carry) (`launchVelocity` with the new loft), so the bar's sections and the marker's ticks keep their meaning. The higher ball comes down steeper (the first-bounce `spinFactor` uses the new loft) and in addition the first bounce keeps × (1 + y × `roll`) and the wind pushes it × (1 − y × `wind`).
- **Lie:** every effect × the surface's `shape` (tee, fairway, fringe 1; rock 0.7; rough 0.5; sand 0.3; `?tune=rough.shape:0.6`).
- **Per club** (`clubs.js` `shape`, proposal, `?tune=driver.start:8` etc.): start° Driver 11.5, 3W 10.35, 5i 9.2, 7i 8.05, 9i 6.9, PW 5.75, SW 4.6 (owner playtest: +15%); height° 2, 3.5, 4, 5, 6, 7, 8; roll 0.25 (Driver), 0.3 (others); wind 0.2. On flat ground at full power a full left impact bulges the Driver 10.7 m off the line (SW 1.5 m); bottom / top roll ≈ 0.53–0.72× / 1.3–1.9× of a centre hit (Driver 21 / 32 / 46 m); a 5 m/s crosswind drifts a bottom hit ≈ 1.4–1.6× and a top hit ≈ 0.6–0.65× as far.
- **Readability (BC4, "no surprises"):** with the dot off the centre, `play.aimMarks()` is the **shaped** shot (the real ball's flight steps, no wind, perfect timing): the marker and the 25/50/75% ticks sit where it lands, and `marks.shape` = `{ path, roll, rest }`, the ground track of the full-power shot. The yellow aim dots follow `path` (out, then back), smaller white dots follow the roll from the landing to `rest`, where a small white ring shows where it stops; the minimap draws the same curve and a white run-out line. The 🔍 Landing view and the label use the shaped marker. The K4 warning (`shotWarning` / `aimWarning`, red) flies the same shaped flight against the obstacles near it (the near-line band is widened by how far the curve strays), and the S23 hazard (blue) is checked where the shaped shot lands. A centre hit gives exactly the S22 value (no `shape`), so nothing changes for it. The roll is played on the second ball (no obstacles, its own random numbers), like the ⚑. tests/shape-preview.test.js: on every hole tee and scenario, every full club and six impact points, the real windless shot either lands exactly on the marker and stops at the shown end, or was warned; and the landing view shows the shaped marker.
- **The control (BC5):** a ~64 px ball icon at the bottom right, in ⏩ Skip's row above the meter (Skip only shows while the ball moves, the icon only while aiming a full shot before click 1; hidden on putts, in the flyover and after the hole). A red dot shows the impact point, with faint cross lines and a small inner ring (the centre snap zone). **Phone:** tap or drag anywhere on the ball (a press on it never swings); within `IMPACT_UI.snap` (12% of the radius) of the centre it is the centre; a **double tap** (two presses within `IMPACT_UI.doubleTapMs`, 320 ms) resets it to the centre. **PC:** **Shift + ◀ ▶ ▲ ▼** move the dot by `IMPACT_UI.keyStep` (0.25) on a grid (▲ = the top of the ball), so presses always come back to the exact centre; Shift + A / D is the fine aim (X14). A caption pill above the icon says what the dot does ("High · starts ◀ curves ▶"; hidden at the centre). The dot goes back to the centre every shot (`prepare()`). Rules in `core/shape.js` (`impactFromOffset`, `stepImpact`, `isDoubleTap`, `impactCaption`); on a 320 px phone the icon and its caption clear the 🔍 button, the meter and the minimap (checked in the browser on PR #68).

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
`aim → power → (grace | nopower) → accuracy → flight → roll → wait → (aim | holed → result)` plus `intro`. `grace` and `nopower` are the S8 missed-click phases (§3). A putt (S14, 2 clicks) skips `accuracy`: `aim → power → (grace | nopower) → roll → …`. Penalties go through `wait`. ✅ The lists and the predicates (`isSwinging`, `isAimingState`, `isAimView`, `isBallMoving`) live in one place, `src/core/states.js` (Gate A A3); core, HUD, camera and input use them, and a test checks every meter phase is covered.

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
- ✅ **Flagstick (FL1):** the pole standing in the cup is an obstacle for every shot except putts (putts keep the cup rules above: the stick counts as out). It is a thin vertical cylinder at the cup, `FLAG_R` (0.025 m) wide and `FLAG_H` (2.6 m) tall, the drawn pole; `?tune=FLAG_H:0` takes it out. A ball that touches it in the air or on the roll (swept, like a trunk) drops dead: the speed into the pole comes back × `FLAG_REST` (0.15), the speed along it (a glancing hit) is kept × `FLAG_KEEP` (0.2), and a falling ball keeps falling. Then the normal cup rules decide: a ball that lands within `CUP_R × 1.4` is in, otherwise it stops by the pole (a high hit drops further away). No auto-hole. Event `hitFlag` { rolling }. On the roll it can only happen after a lip-out (the pole is inside the cup radius). The pole is **not a tree**: the aim line, the marker, the K4 warning (never red), the shaped preview (BC4) and the ⚑ ignore it, like the ⚑ ignores trees. Rough rate (flat test green, the ⚑ power ±12% / ±3°): 1–5% of 15–25 m chips hit the pole, about half of those drop in; approaches hit it on the hop. Tests: tests/flagpole.test.js. **What the player sees** (src/game, FL1): the pole and the cloth are drawn from the same `FLAG_R` / `FLAG_H` (so `FLAG_H:0` removes both); a hit flashes **"Off the pin!"** (once per shot; "In the hole!" replaces it when it drops) and the stick rocks a little away from the ball and settles (about 1.5 s; looks in `config.js` `FLAG_FX`). **On putts the stick stays drawn** (the flag is the target on a long putt), and is hidden only while the ball is within `FLAG_PUTT_HIDE` (3 m, `?tune=`; 0 = never hide) of the cup, with the putter as the club or a putt rolling, so a short putt never seems to roll through it (`obstacles.pinShown`; looks only, putts still ignore the pole). Full shots and chips: always drawn. Practice test spots: `h1-pin-chip` (20 m: 27% hits the pole low and drops in, 30% stops by it) and `h1-pin-approach` (90 m P Wedge at the pin: ~85% hops in off the pole, ~88% stops by it).
- **Penalties:** water or out of bounds gives +1 stroke and the ball goes back to the last position.
- **Lie:** the surface the ball rests on caps the next shot's power and scales its accuracy window (S11, see §3 "Lie"). There is no hidden power multiplier any more: power % is always the same share of the club's distance.
- ✅ **Skip (X9):** about 1 s after the hit (`TIMING.skipAfter`), a **⏩ Skip** button shows above the meter while the ball flies or rolls; **Space** or **Enter** do the same. `play.skip()` runs the remaining fixed steps at once with nothing drawn, so the end is identical to watching it (same spot, strokes, lip-outs, `play.next`; tests/skip.test.js compares them exactly at 30/60/144 fps and different skip moments). The events go through the usual flow, so the flash text, penalties, holed and picked-up play normally. A tap on the course or SWING never skips, so an extra swing tap can't skip a shot by accident.
- **Timestep:** a fixed-step accumulator: only whole 1/240 s steps, the remainder waits for the next frame, so a shot ends in the same place at any frame rate. The flight is sped up ×1.35 for game feel (`FLIGHT_SPEEDUP`).

### Known problems fixed in Phase 0
- ✅ The last sub-step used the leftover time, so results changed with frame rate (the F0 baseline measured up to 2.4 m between 30, 60 and 144 fps) → accumulator (F3).
- ✅ The lip-out and the wind used `Math.random()` → seeded RNG (F5). The game seeds it from `?seed=<n>` or, without it, from the clock.
- ✅ The physics constants and surface values were duplicated in two files → `src/core/config.js` and `surfaces.js` + `surfaceOverrides` (F6/F7).
- Since hole 1 now uses the slope-aware roll (stop speed 0.06 m/s and the `CREEP` friction blend instead of its old 0.03 m/s stop) and the hill-aware reach estimate, its rolls end a few centimetres differently. All baseline shots are within 0.5 m.

### Camera ✅ (Phase V, owner 2026-11-18)
Where the camera stands is pure math in core (`src/core/views.js`, tests/views.test.js); `src/game/camera.js` only eases toward it. **Never a blind shot**, in phone portrait and landscape.
- ✅ **V1 aiming view** (owner on PR #63: "the aiming camera was fine before"; the 🔍 Landing button is how the player looks at the marker). **Main's camera**: 7 m behind the ball on the aim line, looking at the ground 30 m ahead (`CAM.aim`); putts 3.5 m back, 1.6 m up, looking 5 m ahead (`CAM.putt`, unchanged). The full-shot height is main's 2.6 m × **`CAM_AIM_HEIGHT`** (default 1 = main exactly, `?tune=`; the owner compared 1 / 1.25 / 1.5 on #63: "the today camera is the best"). One correction: when the ball would show below the **free band** (from the lowest top panel over the screen's centre down to the top of the meter panel, `session.js measureFrame`), the camera tilts down (same spot) so the ball sits at `CAM.ballMax` (97%) of the band. On main the ball hid behind the hint line in phone landscape and when facing a steep upslope. Wherever main showed the ball, the view is main's. The marker may be off screen (the landing button shows it). Test: on every hole, scenario and club, portrait and landscape, the ball is in the band.
- ✅ **V2 view button** (small, above the meter on the left, only while aiming before click 1; ⏩ Skip uses the right side of that row while the ball moves). Optional: nothing needs it. A **tap** opens a view until tapped again, **holding** it (> `CAM.holdMs`, 300 ms) shows the view until it is released; **V** on a keyboard is a tap. Full shots: **🔍 Landing**, from behind and above the marker looking at it (the marker in the free band). Putts: **👁 Read** steps through **from above** (ball and cup both in the band, the putt up the screen, the grid if the green has one), then **low** (crouched 3 m behind the ball at 0.45 m, looking at the cup), then back. The label says what the next tap does (↩ Back on the last view). Aiming and changing club still work in a view; starting the swing (click 1) or a new shot returns to the aiming view.
- ✅ **V3 flight camera variety** (`pickFlightView`): **behind** (the chase camera, as before), **side** (a spot 40% down the line and 17% of the carry to one side, at least 15 m up, above the canopy; it hands over to behind at the first bounce) and **landing** (25 m past the predicted landing, 9 m to one side, 7 m up, watching the ball come in and roll; behind once the ball runs 40 m past it). **The pause after the hit** (owner on #63: "one of the joys of golf is the pause after hitting the ball where you wonder where it is going"): after a full shot the camera stays at address for `CAM_FLIGHT_HOLD` (1.2 s) and only turns to watch the ball leave (`flightHolds`); then the chosen view starts (a standing camera is a cut and turns to keep the ball in view). `CAM_BEHIND_STAY` 1 keeps a behind shot at address until the ball first lands (only side and landing cut away). Putts don't hold. Rules: putts and shots carrying under `CAM_VARIETY_MIN` (60 m) are behind; otherwise a weighted draw `CAM_W_BEHIND` / `CAM_W_SIDE` / `CAM_W_LANDING` (0.5 / 0.25 / 0.25); no view more than `CAM_MAX_RUN` (2) shots in a row, landing never twice, counted **across the round** (PM on #63; it starts over with a new game or Play again). **Never blind:** a side or landing spot is used only if it is in bounds (the scenery forest stands outside OB) and sees the landing spot, the top of the flight and the start past the hills and the in-play trees and rocks. A side camera that can't first tries higher and further out (`CAM.side.tries`: +12 m, +12 m and 8% further, +25 m and 12%, +40 m and 18%; QA-1 on PR #64: full-power drives on the tree-lined mountain holes found no spot), then the same on the other side; a landing camera tries the other side; else behind. Side is possible from every Mountain 9 tee and landing area (test). **Seeded:** its own RNG stream (`createRng(hole seed ^ CAM.viewSalt)`, 2 numbers per shot), so the physics, lip-outs and leaves never change (baselines untouched). **Settings → Flight camera: Varied / Classic** (Classic = always behind; also `?tune=CAM_VARIETY:0`).
- ✅ **V4 hole flyover** (`flyoverRoute`, `flyoverPath`): the hole's regular route only, tee → `aimTarget` (else the default tee aim point) → green, never the `playLine` corner (PM on #63); par 3: tee → green. Owner on #63: slow, a high start behind the tee, no dive, smooth. It starts 14 m behind the tee box and 20 m above it (measured from the higher of the tee and the ground behind it; higher still if a bank hides the tee), looking down at the tee and ball, then turns ahead over the first 100 m and eases to 20 m over the smoothed ground (never under 8 m). The route is a centripetal Catmull-Rom spline, smoothed and resampled every 2 m; the height follows the ground smoothed over ±40 m; the look target leads 110 m along the path, damped, and slides onto the flag over the last 120 m (the tee part is blended as a direction, so the view never swings under the camera). It **stops 35 m short of the cup at 18 m**, above the green, looking at the flag. Travel = `length / CAM_FLYOVER_SPEED` (45 m/s), 5–16 s, speeding up over the first 25% and slowing over the last 30%, on the real clock. Then no still pause (`CAM_FLYOVER_PAUSE` 0, owner: "the pause at the hole could be shorter"), a slow 50° orbit round the cup in `CAM_FLYOVER_ORBIT` (1.4 s; the owner liked that speed, only the still pause went), and a 1.0 s ease (rising over the trees) into the tee's aiming view. Smoothness is tested on every hole (look ≤ 60°/s, look jerk ≤ 300°/s², heading ≤ 90°/s, climb ≤ 9 m/s at 30 Hz). A `flyover` game state (`states.js`) after the intro or hole card, then the tee's aiming view; meanwhile the bottom panel shows only the "Tap to skip the flyover" hint (PM on #63). **A tap, Space, Enter or ⏩ skips it**; it never swings. It plays the first time a hole starts from its tee in a game (each hole of a round, `?hole=` links, practice holes), not on `?scenario=` spots, a restart or Play again on one hole; a new round plays them again. **Settings → Hole flyover: On / Off** (default On). The tools (session-check, menu-check, baseline) skip it where they wait for aiming.

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
| Rock / path ✅ (K1) | .55 | .75 | 1.8 | hard surface: big bounce, long roll. Lie: cap 0.90, window ×0.8. Grey on the course texture and minimap, "Rock" on the lie line. Tunable like the others (`rock.rest`, `rock.keep`, `rock.decel`, `rock.maxPower`, `rock.sweetScale`) |
| Water / OB | | | | penalty |

**Decision:** one shared base surface table in `surfaces.js`. A hole may override values in `surfaceOverrides` (e.g. a faster green). Hole 1 and hole 2 must keep their current feel through those overrides.
**Tunable (S17):** `?tune=<surface>.decel|keep|rest:<value>` (e.g. `green.decel:0.5`; ranges decel 0.2–30, keep and rest 0–1). Like the lie values, a tuned value wins over a hole's `surfaceOverrides`, so `green.decel` applies to both holes. Putt power stays calibrated to the tuned green (`v0 = √(2·decel·D)`).
**Note (S17):** on the faster greens a putt reaches the cup slower, so a full putt can only lip out from about 15 m on hole 1 (≈ 11 m before). See the PR for the open question about `CUP_CAPTURE_SPEED`.

---

### Obstacles ✅ (Phase K, decided 2026-11-17 by the game designer)
**Principle:** trees and rocks are real hazards, but never a surprise.
- **Trunks** (vertical cylinders) and **boulders** (spheres) are solid. The ball bounces off them (`OBSTACLE_REST`, `OBSTACLE_KEEP`), in the air and when rolling.
- **Leaves** (a canopy ellipsoid on each tree): a ball flying through **massively slows down** (keeps ~25–40% of its speed, `CANOPY_SLOW`) and is **deflected a little** (~10–20°, `CANOPY_DEFLECT`, seeded so replays match), then drops. One canopy hit per tree per shot.
- **Flying over is allowed:** a high enough shot clears the canopy. That's what makes "cutting the corner" a real risk/reward choice.
- **No blind shots:** the aim preview is height-aware and turns a warning colour where the predicted flight would hit a trunk or the leaves.
- Obstacles come from hole data (`obstacles: [{ type: 'tree', x, z, trunkR, trunkH, canopyR, canopyH }, { type: 'boulder', x, z, r }]`). The renderer draws exactly what the physics uses.

**How it's built (K1–K7, Nov 17):**
- `core/obstacles.js` `makeColliders(hole, heightAt)` turns the data into the shapes used by the ball, the aim warning, the 3D scene and the minimap. A **trunk** is a vertical cylinder of radius `trunkR` from the ground up to `trunkH`. The **leaves** are an ellipsoid **centred on the top of the trunk**, `canopyR` across and `canopyH` tall (so they start `canopyH / 2` below the top of the trunk). A **boulder** is a sphere of radius `r`, sunk into the ground by `sink × r` (default `BOULDER_SINK` 0.35, optional `sink` per boulder). `validateHole` checks the fields, that each obstacle is on the map, and that none stands on the tee or the green.
- The ball is a sphere of `BALL_R` (its lowest point is `ball.pos`): solid shapes are grown by `BALL_R`, the leaves count when the ball's centre is inside. Contacts are found **along the whole step** (swept), so a 70 m/s drive can't pass through a 0.35 m trunk between two steps.
- **Bounce (K2):** like a bounce on the ground, off the obstacle's surface: the speed into it comes back × `OBSTACLE_REST` (0.4), the speed along it is kept × `OBSTACLE_KEEP` (0.7). A rolling ball bounces off trunks and boulders flat (it never climbs a boulder) and never touches the leaves. A ball that stops bouncing on top of a boulder is nudged off (`OBSTACLE_SLIDE`); it can't balance there. **K10:** a trunk has a flat **top cap**: a ball coming down onto it bounces up off it (and is nudged off like on a boulder), and the side counts while the ball's lowest point is below the top, so no ball passes through a trunk from any direction. Event `hitObstacle` { kind: 'trunk' | 'boulder', index } (only when it hits faster than `OBSTACLE_EVENT_SPEED`, so a ball resting against a trunk doesn't spam events).
- **Leaves (K3):** the ball keeps `CANOPY_SLOW` (0.3) of its speed and turns left or right by up to `CANOPY_DEFLECT` (15°), from the hole's seeded RNG (same seed = same deflection), then drops. Once per tree per shot. Event `hitLeaves` { index }, flash **"Into the trees!"** (a trunk says "Off the tree!", a boulder "Off the rock!"; one flash per shot).
- All four (`OBSTACLE_REST`, `OBSTACLE_KEEP`, `CANOPY_SLOW`, `CANOPY_DEFLECT`) are `?tune=` names.
- **Aim warning (K4):** `play.aimWarning(club, aim, power)` flies the same arc as the aim marker (S22; the yellow ring before) (the lie's full power, no wind, no curve) and checks it against the same colliders. ~~Since PM review of PR #33, `play.shotWarning()` checks **both** the full-power arc and the **⚑ arc**…~~ ✅ **Since X14 (PM on PR #65)** the warning the player sees is the **full-power arc only** (the aim marker's shot, the lie's cap on a capped lie), and the hint says "At full power this shot hits…". Since S22 the ⚑ only shows on putts, so a warning about the ⚑ power of a full shot named a power the player can't see; and its ⚑ search (about 17 whole rolled-out shots) ran on every aim frame, which was the owner's aiming stutter on the fairway (out of bounds the roll ends at once). The both-arcs check stays in core as `play.treeCheck()` ("pin" / "full" / "both"): the mountain course's tree thinning and the K8 "default tee shot is never blocked" test still use it, so no hole changes. The warning flight only tests the obstacles near its line seen from above (the same answer, tests/aim.test.js). When it hits a trunk, the leaves or a boulder: the aim dots past that point and the ring turn red, a red marker hangs where it hits (with a red ring on the ground under it), the minimap shows a red ×, and the hint line says "⚠ This shot hits the trees (N yd): aim around it or change your power" (K12). Since K11 the warning flies the real ball's own steps (`PHYSICS_DT`, the same update as `ball.js`), so a straight shot with no wind hits exactly what the warning says, grazes included. It is worked out again only when the club, aim or ball changes. Putts never warn. The **⚑ and the auto-pick ignore obstacles** (the warning is the information). Because it checks the full-power arc, a weaker swing on a "clear" line can still be caught: that is the cut-the-corner risk.
- **Drawing (K5):** `scene.js` draws each trunk, leaf ellipsoid and boulder from the colliders. With the debug overlay open (backtick or `?debug=1`), wireframe outlines of the colliders show on top (trunks red, leaves yellow, boulders cyan). The minimap draws the leaves and boulders.
- **K8 (owner): every tree inside the OB line is a real tree.** Holes 1–2's in-bounds trees (25 and 79, all in the rough) are obstacles with fixed positions in the hole data (`src/holes/trees.js` `inPlayTree`: round trees about the size of the old pines, so in-play trees look different from the pine decoration outside OB). `scene.js` draws decoration trees only out of bounds. **Fairness guards** in `validateHole`: an obstacle must be in bounds; never on the tee, fringe or green; never on the fairway unless the data says `onFairway: true` (hole 3's lone tree). ✅ **The default tee shot** (S21: straight along the tee's facing, default club, no wind, straight hit, at the power that finishes at the default aim point; a full swing may run long into trouble, e.g. mtn-06 where long is wet) may finish in the rough, a bunker or under trees, or run into a tree (the K4 warning shows it), but **never in a penalty** (water, OB): `validateHole` refuses the hole and names the power and the surface. Before S21 it had to be clean (no obstacle warning).
- **K9:** a scenario may set `aimAt: { x, z }`: the first shot aims there (target kind 'spot', "test spot target" on the HUD) and the ⚑ and auto-pick use it. `h3-rock-bounce` uses it to land a normal shot on the rock.

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
- ✅ A putt is **2 clicks** (start, power) and is always struck straight along the aim (S14, §3). The line is the player's read: aim and slope break, not timing.
- The putt power maps to distance using `v0 = √(2·decel·D)` on flat ground. The ⚑ mark adjusts for uphill or downhill.
- Putts break toward the low side (slope gravity).
- 🟡 A slope grid is **painted** on hole 2's green → it should become a **toggle** (G4).

### Acceptance
- [x] On a flat green, a putt with power p stops within ±5% of `p × puttMax`. *(tests)*
- [x] ✅ S14: a putt is 2 clicks and always goes exactly along the aim, whatever the click timing or the meter value (no pull, push or curve); full shots keep 3 clicks. *(tests/two-click-putt.test.js, tests/putt-cup.test.js T5)* Before S14 a mistimed putt was pushed by the curve error × `PUTT.aimErrorK` (0.25 rad, ≈ 2.1° at acc ±0.15) and a shanked putt ≈ 8.6° right.
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

## 8. Rounds, scoring, menus and rivals ✅ (re-planned 2026-11-17 by the owner; rounds ✅ Phase 6, menus ✅ Phase 7, rivals ✅ Phase T)

### Modes
- ✅ **Solo:** pick a course (any length), play it as a round with a scorecard, total vs par, and a personal best per course.
- ✅ **vs AI:** the same round against **5 AI rivals**, with a leaderboard after each hole and final standings (Phase T). Play → vs AI → course → difficulty → round.
- ✅ **Practice:** one hole or a test spot (`scenarios.js`), no scorecard.

### Rules
- A **hole set** (a course) is an ordered list of hole ids plus a name ("Mountain 9", "Prototype holes", "Rainy Day"…).
- ✅ **Owner rule (2026-11-17): a course is just a playlist of hole ids, of ANY length (1, 9, 18, 99…), and the same hole can appear in several courses (or several times in one).** Nothing may assume 9 holes: `round.js`, the summary card and the final scorecard work for any length. In a round a hole is numbered by its place in the round ("Hole 4 of 9"), not by its own `number`.
- ✅ A round has **one seed**. Each hole's seed comes from the round seed and the hole's place in the round (`holeSeed`), so its wind and the rivals' scores can be replayed, and the same hole played twice gets two winds. `?seed=` fixes it; the debug overlay shows the round seed and each hole's seed.
- ✅ A round plays its holes in order and keeps a scorecard: strokes (penalties included), par, result per hole (eagle, birdie, par, bogey…), total vs par.
- ✅ The stroke cap per hole (`maxStrokes`) means "picked up": the hole counts the strokes taken (the cap), is flagged on the card, and the round continues.
- ✅ Hole 1 of a round opens with the full intro card (how to play). **Holes 2+ open with a compact hole card** (PM on PR #38): "Hole 4 of 9", par, distance ("· plays N yd" when the play line is longer) and the hole's one-line `intro.tagline`; it closes by itself after `TIMING.holeCard` (2.5 s, counted from when the hole is on screen, owner on PR #40) or on a tap. Single-hole play (`?hole=`) keeps the full intro.
- ✅ Between holes: a summary card (result, penalty strokes, running total vs par) with a **Next hole** button (and later the leaderboard in vs AI). The next hole loads in the same page as a new hole session (no reload).
- ✅ At the end: the full scorecard with **Play again** (a new round, everything cleared) and **Menu** (back to the main menu, no reload, Phase 7). **The scorecard shows the holes in groups of 9** (`SCORECARD_GROUP`): a full first group is **"Out"**, a full second group **"In"** (PM Phase 7, golf's names), every other group by its numbers ("Holes 19–27", "Holes 10–12"); the last group may be shorter; a round shorter than 9 is one group named by its holes ("Holes 1–3"), a 9-hole round is one "Out" group. Each group has Par, Score and ± rows and a subtotal column, then the round total. It fits a phone in portrait (320 px) for any length; a long round scrolls. (vs AI adds the final place.)
- ✅ Personal best per course **and mode** (lowest to par) in localStorage (Solo keeps its key `pocketlinks.best.v1.<set>`; vs AI has `….<set>.ai`, one for all difficulties), read and written in try/catch (the game works without storage).
- ✅ Rounds start from the Solo menu (Phase 7). Dev links still work: `?set=<id>` starts a round; `?hole=` and `?scenario=` play one hole with no round. Temporary test sets: `prototype3` (holes 1–3) and `test9` (holes 1–3 three times), listed on the Solo menu with a "Prototype" tag.
- Saving a round in progress: **later** (owner: not a priority).

### Rivals (vs AI) ✅ (Phase T, `core/rivals.js`)
- ✅ 5 invented golfers (no real names), each with a **skill** and a one-line flavour text (shown on the difficulty screen). They don't play shots. Their score on each hole is **generated** from skill, par and the hole's `difficulty` (1–5), seeded by the hole's seed (so by the round seed): the same round seed always gives the same rival scores, whatever the player does, and Restart hole / quitting a hole never changes them. Play again is a new seed, so new scores.
- ✅ **The score model** (tunables `RIVAL_*` in `config.js`, all in `?tune=`): expected strokes over par = `RIVAL_BASE + RIVAL_DIFF_K × (difficulty − 1) − skill`; the score is drawn from a normal curve of width `RIVAL_SPREAD` around it, cut into whole strokes from the best score allowed to `maxStrokes`. **A rival's best score is par − 2 (eagle) and never a hole in one** (owner on PR #44; `RIVAL_BEST_TO_PAR`, def −2, so on a par 3 the best is a birdie). Skill is in strokes per hole: the roster spreads evenly from `RIVAL_SKILL_MIN` (weakest) to `RIVAL_SKILL_MAX` (best).
- ✅ **Difficulty Easy / Normal / Hard** shifts every rival's skill (`RIVAL_EASY_SHIFT`, Normal 0, `RIVAL_HARD_SHIFT`). With the same seed a rival never scores worse on Hard than on Normal, nor on Normal than on Easy.
- ✅ **Calibration target (Phase T, approved on PR #44):** on the prototype holes (Test 9, par 36), the Normal winner is about **par to 2 under** (median −1, mean ≈ −0.55; target approved by the owner on PR #44); Easy's winner is over par (≈ +2.5), Hard's at least 2 under (≈ −3.1). `tests/rivals.test.js` checks it over 1 000 rounds.
- ✅ Leaderboard: position, name, holes played (thru), to par; the summary card also shows each player's strokes on the hole just played. Ties share a position ("T2", the next position after a 3-way tie for 2nd is 5) and are sorted consistently: the player first, then the rivals in roster order. The player's row is highlighted.
- ✅ The final scorecard opens with your place ("You won!", "You finished 3rd of 6", "You tied for 1st of 6", plus the difficulty) and the final standings, then your own card as in Solo.
- ✅ Dev link: `?ai=easy|normal|hard` plays the `?set=` round vs AI (alone: the first Solo course; an unknown value plays Normal and says so; with `?hole=` / `?scenario=` it is ignored and says so).

### Menus ✅ (Phase 7)
- ✅ `index.html` opens on the **main menu**: Play, How to Play, Settings. **Play** → Solo (pick a course) / vs AI (pick a course, then Easy / Normal / Hard, Phase T) / Practice (a hole, or a test spot grouped by hole). Every screen has a Back button; Esc goes back too.
- ✅ **The lists come from the data, never a hardcoded list** (`core/menu.js`): every set in `sets.js` is a Solo course, in order, unless its `menu` is `'practice'` (its holes are the Practice holes) or `'hidden'` (only reachable with `?set=`). A set's `tag` ("Prototype") shows next to its name. A course shows its length, par and personal best. The test spots are every entry of `scenarios.js`.
- ✅ **Dev links skip the menu** and behave as before: `?hole=`, `?scenario=`, `?set=`, `?ai=` (Phase T), `?seed=`, `?tune=`, `?debug=` (any one of them; `?tune=` alone plays hole 1 tuned). Quitting to the menu removes `?hole/scenario/set/ai` from the address (a reload then shows the menu); `?tune/seed/debug` stay for the visit.
- ✅ A hole started from the menu hides the old "Try Hole 2 →" links; its intro card has "Back to menu" and the single-hole result card has Play again + Menu.
- ✅ **Pause menu** (the II button under the scorecard panel, beside it on short landscape screens, or Esc): Resume, Restart hole, Quit to menu. While paused the ball, the meter and the hole's timers stop (timers keep the time they had left). **A swing in progress is cancelled with no stroke** (the meter runs on real time, so it can't be frozen fairly). Restart = the same hole and wind again (from the test spot in Practice); in a round it doesn't touch the scorecard (the hole isn't recorded until it's over). **Quitting a round asks first** ("Quit this round? Your score after N holes will be lost."); Practice quits at once. Pause isn't offered once the hole is over (the summary or result card is up).
- ✅ **Settings** (saved in localStorage `pocketlinks.settings.v1`, read and written in try/catch; with storage blocked they last for the visit and the screen says so): **Debug overlay** (open when a game starts; the backtick still toggles it), **Putt grid** (Hole default = each hole's own green, hole 2 has a grid / Every green / Off). They apply from the next hole you start. A hole's intro mentions its grid only when the green shows one (`intro.grid` replaces `{grid}` in a step, owner on PR #40).
- ✅ Restarting or quitting clears **all** game state (hole session, round, timers, trail, cards, pause); the menus have no hole loaded behind them.
- ✅ Space and Enter start the hole from the intro card and the compact hole card (QA R-1). The wind on a hole's first card is the wind you play (Tee off doesn't re-roll it).

### Acceptance
- [x] A simulated 9-hole round gives the correct total, including a picked-up hole (and a 1-hole and a 20-hole set work, `tests/round.test.js`).
- [x] The same round seed gives the same winds and the same rival scores (`tests/rivals.test.js`, `tools/menu-check.mjs`).
- [x] Menu → play → quit → play again leaves no leftover state (strokes, timers, wind, ball, rivals) (`tools/menu-check.mjs`).

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
    validate.js            ✅ validateHole / validateScenario (Gate A T7): the page checks a hole when it first plays it, without the shot simulations (`shots: false`); node --test checks every hole and scenario in full (X12)
    vec.js                 ✅ small vector helpers ({x,y,z} objects)
    rng.js                 ✅ seeded RNG (mulberry32) + parseSeed
    clubs.js               ✅ club table, bag, lieFor (cap + window), pickClub (auto-pick)
    surfaces.js            ✅ base surface table + getEffectiveSurface(id, hole, weather) + the lie-tune layer
    terrain.js             ✅ ss, ell, bump, makeTerrain(hole) → { heightAt, gradAt, normalAt, surfaceAt }
    swing.js               ✅ meter state machine (incl. S8 phases) + resolveShot
    ball.js                ✅ flight, bounce, roll, cup, penalties, trunks / leaves / boulders → events
    obstacles.js           ✅ colliders from hole `obstacles` (trunk cylinder, leaf ellipsoid, boulder sphere) + swept hit test (Phase K)
    play.js                ✅ one hole's rules: strokes, lie, auto club, accumulator, and the hole flow
                              (swing is the only hit, next / proceed / finished; Gate A A1/A8)
    scoring.js             ✅ score names and result text
    round.js               ✅ a round of any length: hole order, per-hole seeds, scorecard rows, totals, groups of 9 (Phase 6); mode solo / ai, rivals, leaderboard, bestId (Phase T)
    rivals.js              ✅ the 5 rivals, difficulties, seeded per-hole scores, leaderboard with ties (Phase T)
    views.js               ✅ camera views (Phase V): aiming view (main's camera, kept above the meter panel), landing and green-reading views, flight view choice (seeded), hole flyover route and path (tests/views.test.js)
    menu.js                ✅ what the menus list (from SETS / HOLES / SCENARIOS passed in), launches, dev links that skip the menu, settings parsing (Phase 7)
  holes/
    hole1.js, hole2.js     ✅ hole data
    hole3.js               ✅ pl-03, par 4 dogleg with trees, boulders and rock (Phase K prototype)
    sets.js                ✅ HOLES registry (builds nothing at import, X12), SETS (playlists of any length), resolveHole, resolveSet, readyHole (build + check a hole about to be played)
    lazy.js                ✅ lazyHole(meta, heavy, build): a hole whose heavy fields (heightAt, surfaceAt, map, obstacles, …) are built on first read; menus, rounds and rivals read only the light ones (X12)
    mtn-course.js          ✅ the Mountain 9 course kit: makeMtnHole(spec) → a lazy hole (grids and forest built on first use, X12)
    scenarios.js           ✅ designer test spots for ?scenario= (each checked when it is first resolved, X12)
  game/                    ← Three.js + DOM only. Reads core state, never owns rules.
    main.js                ✅ the app, for the whole visit: renderer, input, debug overlay, menus, pause, frame loop; starts and ends games, loads hole sessions
    session.js             ✅ one disposable hole: scene, props, camera, HUD bindings, timers; dispose() frees them (Gate A A2)
    scene.js               ✅ renderer (DPR cap + antialias tunables, Gate A C4), lights, sky, terrain mesh from heightAt, obstacles + collider outlines (K5), disposeScene
    coursePainter.js       ✅ painted course texture + minimap image
    props.js               ✅ flag, cup, trees, ball mesh, trail, aim dots
    camera.js              ✅ eases the camera toward the view core/views.js gives (Phase V)
    hud.js                 ✅ HUD panel, meter, minimap, cards, flash
    input.js               ✅ keyboard, mouse, touch (primary press only, Gate A C7)
    roundUi.js             ✅ summary card between holes, final scorecard (groups of 9), personal best in localStorage (Phase 6); leaderboard and final standings (Phase T)
    debug.js               ✅ debug overlay (backtick, or ?debug=1 on phones, Gate A C5)
    menus.js               ✅ main menu, Play, Solo, vs AI (course, difficulty), Practice, How to Play, Settings screens (Phase 7, Phase T)
    settings.js            ✅ settings in localStorage, try/catch (Phase 7)
    weatherFx.js           ⏳ Phase 5
tests/
  *.test.js                ✅ node --test
  baseline-v2.shots.js     ✅ the v2 shot list
  fixtures/baseline.json   ✅ v1: golden shots from the pre-refactor pages (physics only, frozen)
  fixtures/baseline-v2.json ✅ v2: recorded from the engine (swing feel, 0.01 m; 48 shots since Phase K)
tools/
  baseline.mjs             ✅ v1 record/check in a headless browser (dev/QA only, needs Playwright)
  record-baseline-v2.mjs   ✅ re-records v2; prints what moved first (Gate A T3), --dry to only look
  session-check.mjs        ✅ 12 hole load/dispose cycles over holes 1–3 in a headless browser, renderer memory must not grow (Gate A A2)
  menu-check.mjs           ✅ clicks through every menu path, pause, quit and play again in a headless browser (Phase 7, M6)
```

### Hole module contract
```js
export default {
  id: 'pl-02', name: 'Pocket Links #2', par: 5, maxStrokes: 12,
  tee: { x: 0, z: 0 }, cup: { x: 26, z: -448 },
  aimTarget: { x: 9, z: -270 },                             // optional, par 4/5: the landing area; since S21 only the tee auto-pick's distance (it no longer steers the aim)
  teeFacing: { x, z },                                      // optional (S21): the point a turned tee box faces; the tee shot aims straight along it. Default: straight down −z
  bag: ['driver','3w','5i','7i','9i','pw','sw','putter'],   // optional, defaults to all
  windMax: 5.5,                                             // or wind: { x, z } for a fixed wind
  weather: { type: 'clear', wetness: 0 },
  surfaceOverrides: { green: { decel: 0.8 } },
  map: { x0: -70, x1: 70, z0: -500, z1: 25 },               // texture/minimap bounds
  number: 2,                                                // shown as "Hole 2"
  scenery: { ... },                                         // lights, fog, mesh grid, trees, colours, minimap size
  intro: { subtitle, tagline, steps, ... },                 // intro card text; {yards} in the subtitle = holeLength (K12); tagline = one line for the compact hole card (Phase 6); grid = a sentence put in place of {grid} in a step only when the green has a grid (Phase 7)
  playLine: [tee, { x, z }, ..., cup],                      // optional (K12): how a dogleg plays, for its yardage; default tee → cup
  features: { green, bunkers, pond, hills },                // used by the painter & surfaceAt; green { cx, cz } = approach default aim (S18)
  obstacles: [{ type: 'tree', x, z, trunkR, trunkH, canopyR, canopyH }, { type: 'boulder', x, z, r, sink }], // optional (Phase K, §4 "Obstacles")
  difficulty: 2,                                            // required (Phase 6), 1–5 (HOLE_GUIDELINES §2, rivals)
  heightAt(x, z) { ... },                                   // may use helpers from core/terrain.js
  surfaceAt(x, z) { ... },
};
```
The physics never reads presentation fields (`scenery`, `intro`, `playLine`). **K13:** `scenery.ground.y` (the flat background plane) must sit at least `GROUND_PLANE_MARGIN` (0.1 m) below the lowest point of the terrain mesh, or it pokes through the hollows and hides the course and the ball; `validateHole` checks it and suggests a value. Every hole shows the same HUD, including the Slope row ("Flat" on a flat hole).

### Architecture rules
- **Events, not hidden coupling:** `ball.js` emits `landed`, `stopped`, `holed`, `lippedOut`, `penalty`. The game layer turns these into flash text, camera moves and HUD updates.
- **Game loop:** physics runs on a fixed accumulator (1/240 s). Rendering interpolates or just draws the latest state. The same inputs give the same resting position at 30, 60 or 144 fps.
- **Debug overlay** (backtick key, `?debug=1` on phones ✅, or the Settings switch, Phase 7). It sits under every card and menu (z-order). On short screens it starts right of the pause button's place. Shows: state, speed, surface, slope, wetness, meter values, default aim (S18), render quality, fps. ✅ X10: in portrait it sits above the bottom panel (never over the TUNED badge) and long lines wrap inside the screen; it is placed again on every refresh, so `?debug=1` in landscape lands between the scorecard and the minimap like the backtick. ✅ X11: it also stays clear of the ⏩ Skip button (its place is kept free between shots, so the overlay doesn't jump), and on short landscape phones (667x375, 568x320) it ends above the bottom panel: it narrows to end left of Skip or stops above it, whichever keeps the bigger font, shrinks its font (10 → 7 px), and as a last resort cuts off its bottom lines (568x320 with a long `?tune=` list). Never over the scorecard, minimap, TUNED badge, hint, meter, controls or Skip. A file that fails to load is named in the start-up message only when the browser says which one (otherwise no name, instead of always `main.js`).
- **Test hooks:** keep `window.__golf` (state, ball, meter, testHit, surfaceAt, …) for browser-level tests.
- **Designer test links (X8):** `?scenario=<id>` starts at a named spot with a fixed seed (data in `src/holes/scenarios.js`, each with the surface it promises, checked by a test; "Play again" goes back to the spot). `?tune=NAME:value,…` overrides tunables for that visit only: only the names in `TUNABLES` (config.js), numbers only, clamped to each range, with a pink "TUNED" badge above the meter. Unknown names or values are ignored and listed on the intro card. Each tunable is one `TUNABLES` entry in config.js (`{ def, min, max }`); code reads the live value from `TUNE` and only `setTunable()` changes it. Lie values (`rough.maxPower`, `sw.sand.maxPower`, …) and, since S17, surface physics (`green.decel`, `green.keep`, `fairway.rest`, …) go into a tune layer: the surface and club tables stay frozen, and a tuned value wins over a hole's `surfaceOverrides`. **Tunes are read when a hole starts** (the link is applied before the first hole is created). Quality tunables (Gate A C4): `DPR_CAP` (default 2) and `ANTIALIAS` (1 on, 0 off), e.g. `?tune=DPR_CAP:1,ANTIALIAS:0` on a slow phone.
- **Local run:** ES modules need a local server (`python3 -m http.server`). The README must say so. No internet is needed (Three.js is in `vendor/`).
- **Hole sessions** (Gate A A2): the app (`main.js`) lives for the whole visit and owns the renderer, the input listeners and the loop; each hole is a session (`session.js`) that is created and disposed. Rounds and menus load the next hole by disposing the current session and creating a new one, never by reloading the page or binding input again.
- **Data is validated** (Gate A T7): an error names the hole or scenario and the field. Since X12 (load time) the page checks only what it plays: `readyHole` (sets.js) runs `validateHole(hole, { shots: false })` when a hole is first loaded and `resolveScenario` runs `validateScenario` on the spot it returns; the shot simulations (the S21 default tee shot) and every hole and scenario are checked by `node --test` (tests/validate.test.js), so a data error is caught before a merge. A hole that fails in the page throws when it loads (on a direct link, before the first frame, so the C2 start-up message shows it).

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
| 2026-11-16 | **Putting stays 3 clicks for now**; whether it becomes 2 clicks (no accuracy) is an open question (S14). *Superseded on 2026-11-18, see below* | Decide together with the next 3-click system pass | Next swing design pass |
| 2026-11-16 | **Rain and lie:** a wet bunker raises the cap (+0.10, all clubs incl. sand wedge), wet rough shrinks the window (×0.85), other surfaces keep cap and window | Firm wet sand is easier, heavy wet rough is harder; readable on the meter | After the rain playtest |
| 2026-11-16 | **Three.js is committed in the repo** (`vendor/`) instead of loaded from unpkg | Works when the CDN is blocked or down, offline play, no agent workaround, upgrade = swap one file | |
| 2026-11-16 | **Swing tuning 1 ("harder is much better"):** `SWEET` 0.045, old linear curve (`CURVE_SHAPE` 1), meter speed 1.15, wind ×1.5 (`WIND_K` 0.3), harder bunkers, faster greens (S17) | Designer + outside playtesters: the game was too easy, near-misses must hurt, approaches should run out on the green | Next playtest |
| 2026-11-16 | **Default aim is a starting point, not the answer** (S18): approaches aim at the green centre, par 4/5 tee shots at a fairway target, putts at the cup. The landing ring and ⚑ stay but ignore wind | Gives the player a decision on every shot. Wind becomes a real read | After playtest |
| 2026-11-17 | **Menus, scoring and a 9-hole round (solo or vs 5 AI rivals) come before rain** | Makes the prototype a complete game you can play start to finish | |
| 2026-11-17 | **First course: mountain, as a prototype test run**, co-designed hole by hole with the owner (`docs/HOLE_GUIDELINES.md`). Not final content: real courses come after a genre study for the course designer and an art style decision. More settings later | Rocks and trees fit the new obstacle mechanics. Tests the engine and the designer workflow cheaply | After the test run |
| 2026-11-17 | **Trees are real obstacles:** solid trunks, leaves that slow and deflect the ball, a rock/hard surface, and a warning on the aim preview (no blind shots) | Trees "sometimes in the way" create choices (cut the corner or play safe) | After hole 3 playtest |
| 2026-11-17 | **Chip-range aim:** within ~30 m, the default aim is the cup on any surface (S19) | From close to the green the player always wants the flag | |
| 2026-11-17 | **The ⚑ aims where the ball stops** (S15), not where it lands | One rule for every club: the flag means "finish here" | |
| 2026-11-17 | **A course is a playlist of hole ids of any length** (9, 18, 99…), and the same hole can be in several courses. Nothing assumes 9 holes; the scorecard shows groups of 9 (Front 9 / Back 9 / …) with subtotals and a total, and fits a phone in portrait (owner, Phase 6) | Courses can be built and reordered freely from existing holes, and longer or shorter rounds need no code change | |
| 2026-11-18 | **The game opens on a menu; dev links skip it** (Phase 7). Courses and practice items are listed from `sets.js` / `scenarios.js` | A game you can start and finish without editing the address; new courses appear with no code change | |
| 2026-11-18 | **Pausing mid-swing cancels the swing** (no stroke) | The meter runs on real time; freezing it would let a player pause just before the sweet spot | If players complain |
| 2026-11-17 | **A ⚑ chip stops 1.5 m short** (`CHIP_FLAG_SHORT`, PM on PR #31) | No free chip-ins: holing a chip takes extra power on purpose | Owner compares 0 / 1.5 / 3 |
| 2026-11-18 | **Every tee shot aims straight ahead along the tee's facing** (−z unless the hole sets `teeFacing`), at the club's carry (S21, owner playtest 1), not at a solved fairway spot or the green. The default tee shot may end off the fairway, never in water or OB | The default aim was still too easy; the player reads the line and the distance off the tee | After the next playtest |
| 2026-11-18 | **Putting is 2 clicks** (start, power), with no accuracy phase, and a putt is always struck straight (S14, owner: "remove the accuracy entirely when putting… slicing is not really a thing while putting"). Full shots and chips keep 3 clicks | Putting is about reading the line and the speed; timing a slice on a putt is not golf | After the next playtest |
| 2026-11-18 | **No ⚑ on full shots; a power bar in quarters and an aim marker with 25/50/75% ticks and a carry/ground label** (S22, owner playtest 1). Putts keep the ⚑ | The ⚑ answered the power question for the player; the sections and ticks give the information, the player decides | After the next playtest |

### Future direction (not in the prototype)
The owner plans richer graphics, sound, more beautiful courses and characters. When those phases start, plan for: a glTF asset pipeline from Blender, `THREE.AnimationMixer` for characters, Web Audio / `THREE.PositionalAudio` for sound, and lighting and post-processing presets per course. Asset loading should be async with a loading screen.

---

## 12. Supported browsers (Gate A C9)
The game needs **ES modules, import maps and WebGL**. That sets the floor:
- Chrome / Edge **89+**, Firefox **108+**, Safari and iOS Safari **16.4+** (every browser on iOS uses Safari's engine)
- WebGL 1 or 2 must be available. If it isn't, the page says so in plain words ✅ (Gate A C2, also for a too-old browser, `file://` and a file that didn't load)
- Run from a web server (GitHub Pages or `python3 -m http.server`), not from `file://`

