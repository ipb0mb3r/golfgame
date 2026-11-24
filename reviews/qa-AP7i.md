# QA: AP7i cow prop (Light)

- PR #148, branch `dev/AP7i-cow`, SHA 873158544e67f528a2ea76dd9610293e8ef3b9ca
- Environment: headless Chromium (Playwright, software WebGL), phone portrait 390x844, local static server via route interception. Level: LIGHT, about 15 min.
- Note: `mtn-07` with `biome=test-big-props` has 4 cows (the PM comment said 6; not an issue).

| # | Item | Result | Notes |
|---|---|---|---|
| 1 | `node --test` | PASS | 670 pass / 0 fail |
| 2 | Muzzle just above grass, hooves not floating or sunk | PASS | Two close-ups (graze + stand): muzzle clearly clear of the grass, hooves on the ground. Only seen on 2 cows, not all 4, and not from far away |
| 3 | No cow pokes through a fence rail | PASS (limited) | Close-ups show the cows well inside the rail fence. Did not walk the whole fence line |
| 4 | Head bob + tail swish smooth, cows out of step | PARTIAL | 5 frames over ~4 s of one grazing cow: head bob clearly visible and smooth, no pops. Tail swish and the phase offset between the 4 cows not confirmed on screen (code uses a per-cow seed) |
| 5 | No collider | PASS (limited) | No collider code (`src/core/cows.js`: "Looks only"). A ball hit from beside the herd flew on and ended OB (lie "ob", stroke 2). The shot was airborne, so it is a weak test of a rolling ball vs a cow |
| 6 | Other big props / fences / trees unchanged; no console errors | PASS | chalet, chaletTall, windmill, beachHut and the fence all drawn, 0 skipped. Only console output was the headless "GPU stall ReadPixels" warning |
| 7 | Real hole with real set shows no cows | PASS | `mdw-01` does not exist on this branch, so used `mtn-01` (default and `biome=meadow-day`): 0 big props drawn, no cow meshes, no errors |

## Bugs
None found.

## Feel notes for the game designer
1. The cows read as chunky toy cows at once, with a friendly pink muzzle and a red strap, and they fit the look of the course.
2. The grazing head bob is gentle and slow. It adds life without pulling the eye away from the shot.
3. Seen from the pasture side, cows are big (scale about 2) and share the screen with the fence and a chalet, so the pasture looks lived in.
4. From the fairway the herd is small and far away, so most of the charm only shows when the ball is out of bounds near the pasture.
5. The OB label ("191 yd - OB") sat right on top of a cow in one close-up. That is a screen overlap only, not a game problem.

## Verdict
READY TO MERGE (Light scope: tail swish, the phase offset between cows, and a rolling-ball vs cow case were not fully proven in this pass).

— Agent: qa
