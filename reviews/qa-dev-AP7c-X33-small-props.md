# QA report: AP7c + X33 (PR #116)

- SHA: d267d879a00c909c03a9bf202e0ecc2b84bb7632 (branch dev/AP7c-X33-small-props)
- Environment: headless Chromium (Playwright, software WebGL), viewport 390x844 only, served from the checkout
- Level: LIGHT (15 min). `node --test` and `tools/menu-check.mjs` not run (the PM did, as instructed)
- Verdict: **READY TO MERGE**

## PASS / FAIL

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | `?hole=mtn-07&biome=test-small-props` loads; props only in rough / OB; same on reload | PASS | 10829 props scattered. Surface under every prop: rough 8373, ob 2456, nothing else (no tee, fairway, fringe, green, sand, water). The scatter run twice and after a fresh page load is identical (same hash). 4 draw calls. No console errors. |
| 2 | Ball-hide rule | PASS | Ball placed in the rough beside a prop at 6 spots on mtn-07 (`__golf.place`). The nearest drawn prop to the ball was 3.43, 1.26, 2.98, 1.57, 1.39 and 1.58 m, never under the 1.2 m clear radius. NOT TESTED: the 0.5 m camera lane by eye, and a ball in flight. |
| 3 | Props don't affect play | PASS | Same seed (`&seed=5`), same shot (`testHit(0.7, 0)` from the tee): test-small-props, meadow-day and test-small-props again all stop at x -20.971, z -177.435 (identical). Note: without a fixed seed the wind differs per load and results differ (-14.3, -10.4, -12.8), so compare with a seed. |
| 4 | Real sets unchanged | PASS | `?hole=mtn-07` (biome mtn-default) and `?hole=pl-01` (proto-default): `__golf.smallProps()` is null, no props, no errors. Not compared pixel by pixel with main. |
| 5a | `node tools/session-check.mjs` | PASS | "ok: 12 load/dispose cycles, no growth in renderer memory". test-small-props on mtn-07: 31 geometries on all 3 loads, 557 of 10829 props drawn, 4 draw calls. |
| 5b | `node tools/perf-check.mjs --biome test-small-props` | PASS | "Every hole is within budget." Summary below. |
| 6 | Feel note + 1 screenshot | DONE | See feel notes. Screenshot: `reviews/qa-screenshots/ap7c-tee-rough-390x844.png` (also `ap7c-ball-in-rough-390x844.png`). |

### perf-check summary (`--biome test-small-props`, 390x844)
```
hole    | tee draws | tee tris | flyover peak draws | flyover peak tris | gpu MB | over budget
pl-01   |  33 |  44k | 29 |  42k |  7.7 | ok
pl-02   |  34 | 196k | 25 | 194k | 18.8 | ok
pl-03   |  30 | 134k | 22 | 132k | 13.9 | ok
mtn-01  |  33 | 216k | 25 | 215k | 11.0 | ok
mtn-02  |  29 | 181k | 25 | 181k | 11.4 | ok
mtn-03  |  33 | 127k | 29 | 126k |  5.8 | ok
mtn-04  |  33 | 268k | 25 | 267k | 16.0 | ok
mtn-05  |  29 | 209k | 26 | 208k | 14.0 | ok
mtn-06  |  34 | 116k | 29 | 115k |  5.4 | ok
mtn-07  |  34 | 295k | 25 | 293k | 14.5 | ok
mtn-08  |  33 | 172k | 25 | 172k |  8.5 | ok
mtn-09  |  30 | 274k | 25 | 273k | 20.0 | ok
Budget: draw calls <= 150, triangles <= 300k, GPU memory <= 64 MB, textures <= 512 px.
Every hole is within budget.
```
Watch: mtn-07 is at 295k of the 300k triangle line at the tee (X36 already covers the 10k prop cap).

## Bugs
None found.

## Feel notes for the game designer
1. The props are small and low. At the phone tee view they read as a light speckle of green and colour in the rough: some texture, nothing hidden.
2. Popping at 45 m and near the ball: I could only check this by numbers in a headless run, not by watching it move, so it is NOT TESTED by eye. With fog and props this small the 45 m edge should be hard to notice. The 1.2 m ball clear zone leaves a small bare patch around the ball, which is the intended trade-off. This is for the owner's phone playtest, as the PM said.
3. From the flyover height almost no props are drawn (0 at the first frame), so the hole does not look "dressed" from above. By design, but only visible when playing.
4. The placeholder tufts and flower patches are simple. Judge the look when the artist's real pieces arrive.

— Agent: qa
