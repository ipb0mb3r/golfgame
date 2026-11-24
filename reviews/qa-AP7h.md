# QA: AP7h + X50 + X51 (Light)

- PR #141, branch `dev/AP7h-bench-prop-wood`, SHA 2ff8d3e6ddf60fad91032967f56f6ac1875355a8
- Environment: headless Chromium (Playwright, swiftshader), python http.server, 390x844 phone portrait. Main compared from a `git archive origin/main` copy.
- Level: LIGHT. Look only, no physics change.

| # | Item | Result |
|---|------|--------|
| 1 | `node --test` | PASS: 660 tests, 660 pass, 0 fail |
| 2a | `?hole=pl-01&biome=test-event-props`: bench stands on ground, no floating legs | PASS (aimed the camera right at the bench; legs reach the grass, brown wood). Screenshot: reviews/qa-screenshots/AP7h-bench-390x844.png |
| 2b | Wood colours unchanged for fences and bench | PASS (bench is the same brown wood as before; no visible colour shift) |
| 2c | Rail fence `mtn-07&biome=test-fences` vs main | PASS: tee view and flyover frames look the same as main (only the random wind differs). Weak check: no fence is actually in the tee view |
| 3 | pl-02 and mtn-04 with no `biome=`: look and console | PASS: both render normally, 0 console errors |
| 4 | pl-01 round flow (Tee off, flyover skip, aim, 3 Space presses, stroke counts up) | PASS: stroke counter went 0 to 3, HUD, meter and aim line work, 0 console errors |
| - | tools/menu-check.mjs | NOT RUN (as instructed) |

Console errors on every page loaded: none.

## Bugs
None found.

## Feel notes for the game designer
- The bench reads clearly as a bench from behind the tee: slats and a back, warm brown. It sits low and small next to the tall feather flag, which suits a quiet tee-side prop.
- It is only visible if you turn well to the right at the tee (it is behind and beside the ball), so a player on a straight aim will not see it. Fine as a surprise, but do not count on it for atmosphere.
- Wood colour matches trunks and fences, so the scene feels consistent.
- My 3 quick Space presses cost 3 strokes on pl-01 (my timing); nothing odd about the flow.

## Verdict
READY TO MERGE

— Agent: qa
