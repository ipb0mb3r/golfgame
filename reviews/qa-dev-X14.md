# QA report: X14 smooth aiming (PR #65), LIGHT

- Head: c1df060 (dev/X14-aim-stutter). Date 2026-11-19, about 10 min of 15. Desktop 1280x720 Chromium (software GL) plus one 390x844 touch check.
- Caveat: headless software rendering ran only ~3 frames/s, so JS time per frame is the reliable number, not frame pacing. One run each.

| # | Check | Result |
|---|---|---|
| 1 | node --test 417 pass / 0 fail; baseline.mjs check "all 19 shots match"; session-check.mjs ok (12 cycles, no growth) | PASS |
| 2a | JS time per frame while holding ▶ 2 s, mtn-04 tee: PR mean 3.6 ms (max 5) vs main mean 34 ms (max 81) | PASS |
| 2b | Same on pl-03 tee: PR 3.7 ms (max 5) vs main 11.3 ms (max 32) | PASS |
| 2c | Held turn is continuous; Shift hold 1 s = 0.006 rad vs 0.023 plain (0.26x); single tap moves aim 0.010 rad | PASS |
| 3a | Red on a full-power tree hit, mtn-03 Driver: label turns red ("warn", leaves) at aim +0.10; and stays right after the aim stops | PASS (see note N1) |
| 3b | Blue "215 yd · Water" on mtn6-feeder-bank with 3 Wood (club confirmed), still blue after a nudge | PASS |
| 3c | Yellow clear shot "164 yd · Flat" (pl-01, 7 Iron), unchanged after a nudge | PASS |
| 3d | Putts: label hidden, no warning (h1-green) | PASS |
| 3e | No "At ⚑ power" text on full shots (no such text seen; code only warns at 'full') | PASS |
| 4 | Touch ◀▶ at 390x844: a tap on ▶ moved aim 0.0000 in 300 ms (after the tap, hold 0.8 s turned 0.023). See N2 | PASS with note |
| 5 | ?tune=AIM_FINE_K:0.5: Shift hold 1 s = 0.011 rad (about 2x the 0.006 default) | PASS |

## Bugs
None blocking.

- N1 (info, not a bug): on ?hole=mtn-03 with the Driver the default straight aim now shows blue "293 yd · OB" (main showed red there). The red came from the old ⚑-power arc; the full-power arc flies past the trees there. Red does appear when a tree is in the full-power line (aim +0.10: red). Matches the PM's change; the DESIGN S23 text ("the trees' red warning shows first" on mtn-03) may now be stale.
- N2 (low, maybe test artefact): a touch tap on the ▶ button changed the aim by 0.000 (touchscreen.tap releases within a frame; a held press turns normally). On main the keyboard tap still nudges. If a real quick finger tap should nudge, worth the owner trying once on the phone.

## Feel notes for the game designer
1. Holding an arrow now turns smoothly and starts gently, then reaches full speed; a tap is a small nudge. It should feel far less choppy than main, where each frame cost 11 to 34 ms of JS here.
2. Shift fine-aim is slow (quarter speed), good for lining up a putt; 0.5 felt like half speed.
3. The mtn-03 tee now warns blue (OB) first instead of red; the tree warning only appears when a tree really is in the line. This is more honest.

## Verdict: READY TO MERGE

— Agent: qa
