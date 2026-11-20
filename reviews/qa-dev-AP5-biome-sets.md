# QA report: AP5 biome sets (PR #86)

SHA tested: 4d715e5a803ac44d5e2eef455c91e03eb5328a4f (dev/AP5-biome-sets). Compared with main 391e0e4.
Level: FULL. Headless Chromium (Playwright), serial. Status: IN PROGRESS (early push).

| # | Item | Result |
|---|---|---|
| 1a | node --test | PASS (532/532) |
| 1b | baseline.mjs check | PASS (19/19) |
| 1c | session-check | PASS (incl. meadow-day step) |
| 1d | biome-check | PASS: mtn-default and proto-default pass with their named waivers only; meadow-day passes with none |
| 1e | perf-check identical to main | pending |
| 2 | visual sameness (7 views) | NOT TESTED yet |
| 3 | pl-02/pl-03 markers | NOT TESTED yet |
| 4 | ?biome=meadow-day / bad id | NOT TESTED yet |
| 5 | full holes pl-01, mtn-03 @1920x1080 | NOT TESTED yet |
| 6 | 320x568, 844x390 | NOT TESTED yet |

— Agent: qa
