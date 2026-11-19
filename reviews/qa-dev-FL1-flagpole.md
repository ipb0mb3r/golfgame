# QA report: FL1 flagpole (PR #72)

- SHA tested: `4c034a17978de49f3eaacf1487f2154a9681cd75` (branch `dev/FL1-flagpole`)
- Environment: headless Chromium (Playwright), served locally on port 8123 (main build for comparison on 8124), Linux. Desktop 1920x1080, phone 390x844 and 320x568.
- Level: FULL (30 min, hard stop). Scripts were run one at a time. Shots via `window.__golf.testHit`, state polled before reading the ball.
- menu-check was not run (the dev ran it alone, 324/324).

## Results

| # | Item | Result | Notes |
|---|---|---|---|
| 1a | `node --test` | PASS | 462 pass, 0 fail |
| 1b | `node tools/baseline.mjs check` | PASS | all 19 shots match |
| 2 | Chip spot `h1-pin-chip` 27% / 30% | PASS (see B1) | 27% ends holed (0.16 m from cup centre at stop, "In the hole!"). 30% hits the pole, "Off the pin!" shows, ball stops 0.57 m from the cup. At 27% the DOM only ever shows "Nice shot!" then "In the hole!": "Off the pin!" never appears (hit and drop-in land in the same moment; a MutationObserver saw no "Off the pin!"). On the approach spot both flashes show in order. Wobble: not measurable headless (no scene access), flag lean is in code; the cloth moved in the phone screenshot. NOT visually verified frame by frame. |
| 3 | Approach spot `h1-pin-approach` | PASS | 85% and 86.75%: "Off the pin!" then "In the hole!". 88% and 88.75%: "Off the pin!", stops 0.80 m and 0.91 m from the cup. Matches the PR text. |
| 4 | Aim line / marker / K4 warning never red because of the pole | PASS | On both pin spots, with centre impact and two shaped impacts (0.5,0 and -0.4,0.3): `warn` is null, marker hazard and landing/rest points are identical with and without the pole (`FLAG_H:0`). (The hazard shown on the chip spot is "Out of bounds" at full power, same without the pole.) Screenshots of the aim view were not kept (no bug). |
| 5 | Putting `h1-green` | PASS | Long putt (11.7 m): pole and flag shown (screenshot `desktop-1920x1080-putt-pole-shown.png`). At 1.4 m from the cup: pole hidden (`desktop-1920x1080-putt-pole-hidden.png`). 8 putts (powers 0.3 to 1.0), with pole vs `FLAG_H:0`: identical end points to 3 decimals, including the 4 that hole out. A putt never hits the pole. The 3.12 m position still shows the pole (not screenshotted); the exact 3 m switch point was not probed. |
| 6a | `?tune=FLAG_H:0` | PASS | No pole drawn (`desktop-1920x1080-flagh0.png`). Chip 27% and 30% end at exactly the same spots as main (27%: holed at z -152.24, 30%: 3.08 m past, z -155.08). |
| 6b | `FLAG_REST` 0.3 and 0.45 change the result | PASS | See the table in the feel notes. |
| 7 | One full hole, real keyboard, pl-01, desktop | PASS | Played with Space presses (intro to result). Reached the result card (my timing was poor: 10 strokes, hook, OB and a splash), no console errors, no page errors. |
| 8 | Phone 390x844 and 320x568, "Off the pin!" flash | PASS with B2 | 390x844: flash is clear, centred, does not cover the SWING/meter/club controls. 320x568: flash overlaps the stroke panel text (B2). |
| 9 | Full Mountain 9 hole with real input | NOT TESTED | Out of time. |
| - | fps | NOT TESTED | |

## Bugs

- **B1 (Low, demo spot, not a code bug).** On `h1-pin-chip` the 27% chip also holes out with no pole at all (main: same spot z -152.24). So the spot's text "around 27% it hits the pole low and drops in" is true, but the pole is not what holes it: it is a poor demo of "pole saves the ball", and at 27% the "Off the pin!" flash is never actually visible before "In the hole!". The 30% shot is the clear demo. No screenshot.
- **B2 (Low, cosmetic).** At 320x568 the two-line "Off the pin!" flash overlaps the end of the top-left stroke panel text ("Aim: the cup (within 33 yd)"). Steps: open `?scenario=h1-pin-chip` at 320x568, play 30%. Expected: flash clear of the panel. Actual: flash sits over the panel text for its duration. Screenshot: `reviews/qa-screenshots/FL1/phone-320x568-offpin.png`. At 390x844 there is no overlap (`phone-390x844-offpin.png`). This is the shared H1 flash layout, so it likely happens with any long flash at this width, not only FL1.

No High or Med bugs found.

## Feel notes for the game designer

1. A pole hit that stops by the cup (30% chip, 88% approach) feels fair: the ball stays 0.5 to 0.9 m away and the "Off the pin!" message explains why. It reads as a small lucky or unlucky moment, not a hazard.
2. The drop-in is the best case, but on the 27% chip the "Off the pin!" is skipped and you only see "In the hole!", so the player may not realise the pole helped. On the approach spot you get both messages, which is the nicer sequence.
3. On a phone (390x844) the flash is big and readable, and the cloth is visible. At 320x568 the flash is crowded by the stroke panel.
4. Drop-in rate on the chip spot, one shot per power (the same cases at each `FLAG_REST`; "HOLED" or metres from the cup):

| power | 0.15 | 0.3 | 0.45 |
|---|---|---|---|
| 25% | 0.78 | 0.78 | 0.78 |
| 27% | HOLED | HOLED | HOLED |
| 29% | 0.46 | 0.81 | 1.16 |
| 30% | 0.57 | 1.04 | 1.51 |
| 32% | 4.6 | 4.6 | 4.6 |

   The 27% case holes at all three values (also with no pole), so this spot does not show the difference. A higher `FLAG_REST` only makes the ball bounce further from the cup on a miss (0.57 m, 1.04 m, 1.51 m at 30%). With so few shots this is not a drop-in rate. The dev's rate figures (about half, a quarter, one in five) were not re-measured.
5. Long putts keep the flag as the target and it disappears close in, which looks natural. A pole hit on a putt never happens, as agreed.

## Verdict

**READY TO MERGE.** All MUST items pass, with only two Low cosmetic or demo-spot findings (B1, B2). Not tested: Mountain 9 hole, fps, frame-by-frame wobble.

— Agent: qa
