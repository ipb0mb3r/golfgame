# Hole design guidelines: Mountain course (prototype test run)

> **Status: test run, not final content.** This first 9 is a prototype course. It tests the engine (rounds, obstacles, rivals, menus) and the course designer's workflow. Before real courses are designed, the owner will (1) teach the course designer from games in this genre (`docs/GENRE_NOTES.md`, to come) and (2) decide on an art style. Expect these holes to be reworked or replaced. Favour quick iteration over polish.

> **For the course designer:** this is your brief. Every hole is co-designed with **Alexis (owner / game designer)**. He brings the idea or picks from your proposals, and you build it as data. The PM reviews each hole's PR against this document. Rules marked **MUST** are not negotiable; the rest are guidance.

## 1. The course
- **Setting:** a **mountain** course. Pine and larch trees, rock outcrops, scree, alpine streams and lakes, elevation changes, distant peaks. More settings (seaside, desert, tropical…) come later, so keep everything mountain-specific in shared course scenery, not inside the engine.
- **Name:** working name "Mountain 9 (prototype)". The final name comes with the real course.
- **9 holes, par 36:** 2 par 3s, 5 par 4s, 2 par 5s. The exact order is set in the course plan (TASKS C0).

## 2. Difficulty ramp (MUST)
Difficulty rises **slowly** from hole 1 to hole 9. Each hole has `difficulty: 1–5` in its data (the AI rivals use it too).

| Holes | Difficulty | Feel |
|---|---|---|
| 1–2 | 1 | Welcoming: wide fairway, one clear hazard, an easy par |
| 3–4 | 2 | First real decisions: a bunker to carry, a tree to avoid |
| 5–6 | 3 | Risk/reward: a corner to cut, water near the green |
| 7–8 | 4 | Demanding: tight landing areas, elevation, sloped greens |
| 9 | 4–5 | A memorable finishing hole, hard but fair |

Never put two big difficulty jumps in a row.

## 3. Variety (MUST)
- **Every hole has one "signature" hazard or idea**, and no two holes rely on the same one.
- Across the 9 holes, use all of: **bunkers**, **water** (stream, pond or lake), **trees** (lone trees, tree lines, a stand of trees at a corner), **rock** (outcrops, a rock strip, boulders), **elevation** (uphill and downhill holes, a raised or sunken green), **out of bounds** (sparingly).
- Mix shapes: straight, dogleg left, dogleg right, at least one hole where cutting a corner is a real option.
- Mix greens: flat, tilted, two-tier, with a ridge. At least one green that's hard to read.

## 4. Fairness rules (MUST)
- **No blind shots.** From the tee and from any normal landing area, the player can see the target (flag, green or fairway target) and the hazards in the way. Trees and rocks must show on the aim preview warning (K4). If the camera can't show it, the hole is wrong.
- **No holes that are too long.** Guide lengths (tee to cup, along the playing line):
  - par 3: 110–190 m
  - par 4: 260–400 m
  - par 5: 420–500 m
  - A normal player must be able to reach par with good, not perfect, shots.
- **Every hazard has a way around it.** A safe route always exists (longer or harder to score from), and the brave route is shorter.
- **The default aim never points into a hazard** (`aimTarget` for par 4/5 tee shots sits on the fairway, `validateHole` checks it).
- A ball must never get stuck. No pockets where it can't be played out of; check rest spots on steep slopes and against rocks.

## 5. Building a hole (technical)
- One file: `src/holes/<hole-id>.js` (ids `mtn-01` … `mtn-09`), following the hole contract in DESIGN §9. Shared mountain scenery lives in one course file, not copied per hole.
- Use the existing surfaces (tee, fairway, fringe, green, rough, sand, rock, water, ob) and obstacles (trees, boulders). **Never change engine code.** If a hole needs a new mechanic, stop and tell Alexis and the PM.
- Required data: `par`, `difficulty`, `maxStrokes`, `tee`, `cup`, `aimTarget` (par 4/5), `features.green`, `obstacles`, `map`, `intro` text.
- 2–3 `?scenario=` spots per hole (the key shot, a recovery spot, a tricky putt).
- v2 shots for the hole, recorded once when it's approved.

## 6. Process
1. **C0 course plan** (once): Alexis + course designer agree on the 9 holes (par, length, signature idea, difficulty). The PM checks it against sections 2–4.
2. **One hole per PR**, in course order, on `course/<hole-id>`. Each PR has the brief, a minimap screenshot and tap-ready links.
3. Alexis plays it on his phone from the PR links. Changes go back to the course designer in the same thread.
4. PM review against these guidelines → QA Light → Alexis merges.

## 7. Prototype holes (not part of the course)
`pl-01` (flat par 3), `pl-02` (hilly par 5) and `pl-03` (par 4 dogleg with trees, Phase K) stay as **practice and test holes**. They're not part of the mountain 9.
