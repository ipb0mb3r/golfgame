# QA: S24 deep rough (Light)

- PR #152, branch `dev/S24-deep-rough`, SHA `ca513d66c30e11f35529912945747e00139a9be7`
- Environment: headless Chromium (Playwright) at 390x844, local static server, `seed=7`, `tune=ANTIALIAS:0,DPR_CAP:1`. Shots fired with `__golf.testHit(cap, 0)` (meter top at the lie cap, perfect timing, same path as a real swing). Real keyboard play-through not done (Light).
- Level: LIGHT, about 15 min

## Results
| # | Item | Result |
|---|---|---|
| 1 | `node --test` | PASS: 725 / 725 |
| 2 | Same club from the 3 spots, cap and window | PASS (numbers below). Lie line reads "Deep rough · max 60% · harder timing". Meter top is hatched grey from 60% and the accuracy window is visibly narrow |
| 3 | Ball landing in deep strip stops sooner than rough | PASS: roll 0.09 m (deep) vs 1.32 m (rough), same shot mirrored |
| 4 | Grey marker at cap, auto-club, shaped preview | PASS: marker `capped:true` at power 0.6; auto-club picked 3 Wood (max 128 yd) from deep; shaped preview (impact x 0.5) predicted (15.50, -209.87), ball ended (15.48, -210.09) |
| 5 | Looks at 390x844 (3D + minimap), seams | PASS with note: deep rough clearly darker than rough and the fairway; no seams or holes seen where it meets fairway or rough. Minimap shows the strip as a darker band, readable but subtle. The green-side pocket was not inspected up close |
| 6 | `tune=deepRough.maxPower:0.55`, `?hole=mdw-01` | PASS: lie reads "max 55%", cap 0.55. mdw-01 loaded and a full shot played fine. No console or page errors in any run |

## Measured distances (m; cap power, perfect timing, flat, no wind, aim straight down -z)
Total = start to rest. Carry = predicted landing distance at the cap.

| Club | Fairway carry / total | Rough (cap 85%) carry / total | Deep rough (cap 60%) carry / total |
|---|---|---|---|
| 7 Iron | 150 / 143 (landed on the green, pulled up short) | 127 / 130 | 90 / 90 |
| 5 Iron | 169 / 173 (ended in rough past the green) | 144 / 148 | 102 / 102 |
| 3 Wood | 191 (out the back of the hole, ball returned) | 164 / 169 | 117 / 118 |

Deep rough total is about 69% of rough, matching the caps (0.60 / 0.85 = 70%). Roll after landing: 0 to 0.5 m in deep rough, 2 to 4 m in rough.
Landing in the strip (7 Iron, 50% power, mirrored aim): deep rough rolled 0.09 m, rough 1.32 m.

## Bugs
None found.

Observations (not bugs, Low):
- The dev hole is flat, so a full fairway 3 Wood goes out the back of the hole. That is the scenario, not the surface.
- The test strip is deep only from about z -255 onward (rough before that), so a shot has to be far enough to land in it.
- The minimap strip is a faint darker band. Fine at this size, but the owner may want it stronger on a real phone.

## Feel notes for the game designer
1. The grey hatched top of the meter is easy to read. From deep rough it feels like a real penalty without being a dead stop: a 7 Iron still goes 90 m.
2. The ball stops almost dead on landing in deep rough (under half a metre). It feels heavy and sticky, while rough still lets the ball run a few metres. The contrast is clear and good.
3. The auto-pick gives a 3 Wood (max 128 yd) from 160 yd out in deep rough. It is sensible by the "shortest club that reaches" rule, but a wood from heavy grass feels odd. The PM chose to keep it. Worth asking the owner after he plays it.
4. The darkening is strong against the fairway and clearly different from rough. Next to a dark out-of-bounds ground it could read as OB to a new player. Owner's call on the phone.
5. The accuracy window at 0.45 is small. With real thumb timing it will be hard. Try 0.55 (tune link) to compare.

Verdict: READY TO MERGE

— Agent: qa

🤖 Generated with [Claude Code](https://claude.ai/code)

https://claude.ai/code/session_01Rv6NgBMGj1H3c7Vx6coEV8
