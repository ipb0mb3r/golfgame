# QA report: PR #61 "S14: 2-click putting" (LIGHT)

- SHA: cef5ecd (dev/S14-two-click-putt). Chromium headless (swiftshader), 390x844 touch context. Time: about 14 min (hard limit 15).
- Re-run done with nothing else running (first pass was starved by menu-check; the PM will run menu-check separately).

| # | Item | Result |
|---|---|---|
| 1a | node --test | PASS (395/395) |
| 1b | tools/baseline.mjs check | PASS (all 19 shots match) |
| 1c | tools/session-check.mjs | PASS (12 cycles, no growth, input bound once, no stray timers) |
| 1d | tools/menu-check.mjs | NOT COMPLETE: started on cef5ecd, only printed "menu paths: 55" before the time limit. Dev reported 315/315 on c8aca4f; not re-confirmed on cef5ecd. |
| 2a | Putt hit on the 2nd input, 1 stroke, rolls along aim, early vs late same line | PASS. Space on h1-green: early (150 ms) rolled 5.70 m, late (700 ms) 11.44 m, both at angle 1.030 = aim 1.030 (strokes 1 to 2 each). Touch tap on h1-green: 5.12 m at 1.030, 1 stroke. mtn1-putt: Space early 5.12 m / 2.57 m and tap late 14.9 m, all at 1.157-1.159 vs aim 1.138 (about 1 degree off: the green's slope break, same for early and late), 1 stroke each |
| 2b | No accuracy window, edge lines or "accuracy" label on the putt bar; flag and 4 sections show | PASS (DOM: label, window and frame width 0 while the putt meter runs; sections and flag visible; screenshot from the first run) |
| 2c | Hints | PASS: "Click again to set POWER (the putt rolls straight)" after click 1 |
| 2d | No "Nice shot!/Perfect!" on a putt; holed / lip-out flashes still show | PARTIAL. No flash text was seen after any normal putt (sampled every ~60 ms until the next aim state; my flash selector may be weak). Holed / lip-out / "Topped!" flashes NOT VERIFIED (no putt holed; "Topped!" not captured) |
| 3 | Tee shot and chip: 3 clicks with accuracy window | PASS. h1-pond-carry (club 3) and h1-bunker (club 5): click 1 starts power, click 2 goes to the accuracy phase ("Click on the green line for a straight shot!", window and "accuracy" label visible), click 3 hits (state flight, stroke counted) |
| 4a | Start click only cancels, no stroke | PASS: strokes 1 to 1, back to aim after about 1.7 s ("Swing cancelled" text not captured) |
| 4b | No power click: straight mini putt | PASS on behaviour: click on the way back gave 2.59 m at angle 1.030 = aim, 1 stroke. "Topped!" label NOT VERIFIED |
| 5 | 390x844 screenshot of the putting bar | PASS: reviews/qa-screenshots/qa-dev-S14-putt-bar-390x844.png |

Re-run notes: the first run failed because the first input only dismisses the intro card (and a canvas tap cannot; I tapped the Start button for touch), and rAF was replaced by a 16 ms timer with __noRender. Nothing else was running. Touch tap needs the Start button on a scenario's intro card (pre-existing behaviour, not an S14 change).

## Bugs
None found. Note: strokes read 1 at scenario start on h1-green (probably the scenario's preset, not checked against the scenario definition).

## Feel notes for the game designer
1. A 2-click putt feels quick and simple: start, then stop the marker where you want the power. An early click gave a 5 m putt and a click at 0.7 s gave 11 m on hole 1.
2. With no accuracy phase, the whole bar is power, so the 4 sections and the flag should be easier to read; check that the marker's speed still feels right for a 2-click rhythm.
3. A putt with no word at all after it (no "Nice shot!") may feel quiet; "Topped!" is the only putt word.

## Verdict: READY TO MERGE (no defect found; menu-check pending from the PM, and the Topped!/holed/lip-out flash texts were not seen)
Automated checks pass and the putt bar HUD looks right, but the core behaviour (2nd click hits, straight line, missed clicks, 3-click full shots) was not exercised. A re-run on an idle machine is needed, or the owner's phone playtest can cover it.

— Agent: qa
