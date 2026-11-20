# QA report: X26 minimap in the biome's colours (+ X25), PR #89

- **SHA tested:** 7d220cfd8791d9fe426b7c7896593d394ce9da7a (dev/X26-minimap-biome), with origin/main (ccf80bc, Meadow palette #90) merged locally (not pushed). Compared with origin/main served alongside.
- **Environment:** headless Chromium (Playwright, swiftshader), phone portrait 390x844 DPR 2, two local servers.
- **Level:** LIGHT (15 min)

## Results

| # | Item | Result |
|---|---|---|
| 1a | `node --test` | PASS: 533 pass, 0 fail (on the merged tree) |
| 1b | `node tools/biome-check.mjs` | PASS: exit 0. minimapTree/fairway+rough and minimapRock/fairway+rough pass for mtn-default, proto-default (ΔE 37-71, ΔL 19-36) and meadow-day (ΔE 38-74, ΔL 26-42) |
| 2a | Minimap mtn-07: trees in biome colour, visible, markers as on main | PASS (aim line, landing marker, ball dot, flag dot unchanged) |
| 2b | Minimap mtn-07 `&biome=meadow-day` | PASS (deeper green trees, clearly visible) |
| 2c | Minimap pl-02 | PASS (the small dark trees are still readable, a little lighter than main) |
| 2d | Minimap with boulders: mtn-03 (one boulder) | PASS: boulder in a dark grey, visible |
| 2d | pl-03 (boulder at the top of the minimap) | PASS: a grey blob, similar to main |
| 2e | Warning x on the minimap | NOT TESTED (no tree-warning aim found in the time) |
| 3 | 3D view unchanged on mtn-07 (tee, aim step) | PASS: screenshots main vs PR show the same HUD, trees, aim line, water marker (blue `#46b4ff`-style "248 yd · Water" label). Only differences are clouds and flyover wind arrow (random) |
| 3 | Capped grey marker, red tree warning | NOT TESTED (not triggered) |
| 4 | Real keyboard on pl-01 (Enter, arrows, Space x4 swing) | PASS: states went aim, grace, flight, roll, aim; 0 console errors, 0 page errors across all runs |

## Bugs
None found.

## Screenshots (`reviews/qa-screenshots/X26/`)
Minimap crops, main on the left, PR on the right: `minimap-mtn-07-...`, `minimap-mtn-07-meadow-...`, `minimap-pl-02-...`, `minimap-pl-03-...`, `minimap-mtn-03-...`. Phone views: `phone-390x844-mtn-07-tee-pr.png`, `phone-390x844-mtn-07-aim-water-pr.png`.

## Feel notes for the game designer
1. The trees on the minimap are now a mid dark green instead of main's very dark green, so on mtn-03 and pl-02 the tree clusters look softer and a bit less punchy than before. They still read clearly as dots against the fairway; against the rough they are the least contrast. Worth a look on the real phone in sunlight; one number in config.js (the darken step) changes it.
2. Boulders now read as a dark grey blob, and on mtn-03 and pl-03 they stand out from the grass about as well as before. On pl-03 the boulder sits at the very top edge of the minimap and is easy to miss, but that is the hole layout, not the colours.

## Verdict
**READY TO MERGE** (Light level). Not tested: red warn x and the grey "capped" marker; the owner should glance at them on a hole with a tree in the aim line.

— Agent: qa
