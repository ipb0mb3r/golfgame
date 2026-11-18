# Hole design guidelines: Mountain course (prototype test run)

> **Status: test run, not final content.** This first 9 is a prototype course. It tests the engine (rounds, obstacles, rivals, menus) and the **course designer's workflow**. After it come an **art and assets pass**, then the real courses (each with its own genre talk with the owner first). Expect these holes to be reworked or replaced. Favour quick iteration over polish.

> **For the course designer:** this is your brief, together with **`docs/GENRE_NOTES.md`** (the owner's principles from the genre study, 2026-11-18: read it first). For the prototype, **you design all 9 holes**; **Alexis (owner / game designer)** plays each one and comments, and may bring his own ideas. The PM reviews each hole's PR against this document. Rules marked **MUST** are not negotiable; the rest are guidance. If this file and GENRE_NOTES disagree, ask the PM.

## 1. The course
- **Setting:** a **mountain** course (pines, rock, streams and lakes, elevation, distant peaks). **For the prototype, don't focus on the setting** (owner): the look comes with the art pass. Keep anything mountain-specific in shared course scenery, not inside the engine.
- **Name:** working name "Mountain 9 (prototype)". The final name comes with the real course.
- **9 new holes, par 36:** 2 par 3s, 5 par 4s, 2 par 5s. Don't open or close the 9 with a par 3. The exact order is set in the course plan (TASKS C0).
- **One signature idea for the course**, used in different ways across the holes (GENRE_NOTES §3).

## 2. Difficulty and pacing (MUST)
**Not particularly hard** (owner). The safe line scores **about par or birdie**; the brave (hero) line scores **birdie or better** when it comes off. Difficulty rises gently, and each hole has `difficulty: 1–5` in its data (the AI rivals use it too).

| Holes | Role | Difficulty | Feel |
|---|---|---|---|
| 1–2 | Warm-up | 1 | Wide, readable, one obvious hero line |
| 3–5 | Introduce | 2 | First use of the course's signature idea |
| 6–7 | Test | 3 | Signature idea + wind, elevation or a tight green |
| 8–9 | Climax | 3–4 | The biggest risk/reward of the 9, a big view |

Follow a hard hole with a breather. Never put two big difficulty jumps in a row. Don't stack everything on one hole (elevation + tiny green + penalty on all sides).

## 3. Variety and realism (MUST)
- **Realistic hazards only**, made bolder: bunkers, water (stream, pond, lake), trees, rock, elevation, out of bounds (sparingly). No fantasy hazards or props (no moving obstacles, bumpers, lava, floating islands).
- **Hills, not fields.** Every hole has real ground shape (rolling fairways, mounds, slopes that move the ball, raised or sunken greens). A flat fairway is fine if the land around it is shaped. Mix gentle hills and big drops hole by hole.
- **Hazards sit in the ground:** bunkers are real hollows of varied depth (shallow fairway bunkers, deep greenside ones with a steep face), water sits in a dip.
- **Surfaces make sense together:** an in-play tree stands on a patch of rough (never in the fairway); water gets a lip of rough or rock; greens get fringe.
- **Each hole has its own twist on the course idea**; no two holes play the same. Mix shapes (straight, dogleg left and right, at least one real corner to cut) and point holes in different directions so the wind changes.
- **Greens, a mix:** some flat, some with one clear slope, a few with big breaks. Keep the slope gentle near the cup.

## 4. Fairness rules (MUST)
- **No blind shots, ever.** From the tee and from any normal landing area, the player can see the target and the hazards in the way. Trees and rocks must show on the aim preview warning (K4). A steep bunker face must not hide the sand. If the camera can't show it, the hole is wrong.
- **Two routes on every hole**, both visible from the tee: a safe line (longer, forgiving) and a hero line (shorter or a better angle, risky). On holes 1–2 the hero line can be simple.
- **Proportional punishment:** a small miss costs a little; water and OB sit mainly on the hero line, never in the middle of the safe line. A missed hero shot leaves a recovery shot more often than a penalty drop. No hazard every player must cross unless the carry is short; island greens or forced carries at most once per course.
- **No holes that are too long.** Guide lengths (tee to cup, along the playing line), kept until the prototype is played:
  - par 3: 110–190 m
  - par 4: 260–400 m
  - par 5: 420–500 m
  - A normal player must be able to reach par with good, not perfect, shots.
- **The default tee shot never ends in a penalty** (S21): it aims straight along the tee's facing (down −z, or toward `teeFacing` when the tee box is turned) at the club's carry, and may end in the rough, a bunker or under trees, but never in water or OB (`validateHole` checks it at full and ⚑ power). `aimTarget` (optional) sits out of penalty surfaces.
- **A ball must never get stuck.** No pockets it can't be played out of; a deep bunker can always be escaped with the sand wedge; check rest spots on steep slopes, cliffs and against rocks.

## 5. Building a hole (technical)
- One file: `src/holes/<hole-id>.js` (ids `mtn-01` … `mtn-09`), following the hole contract in DESIGN §9. Shared mountain scenery lives in one course file, not copied per hole.
- Use the existing surfaces (tee, fairway, fringe, green, rough, sand, rock, water, ob) and obstacles (trees, boulders). A natural cliff is terrain (a steep `heightAt` slope + rock), not a new obstacle. A cart path is a strip of rock, never in the main landing zone. **Never change engine code.** If a hole needs a new mechanic, stop and tell Alexis and the PM (the engine wishlist is in TASKS, D2–D7).
- One tee per hole and one cup per hole (owner).
- Required data: `par`, `difficulty`, `maxStrokes`, `tee`, `cup`, `features.green`, optional `aimTarget` (par 4/5: the landing area, sets the tee auto-pick) and `teeFacing` (S21: when the tee box is not square to −z), `obstacles`, `map`, `intro` text.
- 2–3 `?scenario=` spots per hole (the key shot, a recovery spot, a tricky putt).
- v2 shots for the hole, recorded once when it's approved.

## 6. Process
1. **C0 course plan** (once): the course designer proposes the 9 holes (par, length, signature idea, both routes, difficulty); Alexis approves or changes it; the PM checks it against sections 2–4.
2. **One hole per PR**, in course order, on `course/<hole-id>`. Each PR has the brief, a minimap screenshot and tap-ready links.
3. Alexis plays it on his phone from the PR links and comments. Changes go back to the course designer in the same thread.
4. PM review against these guidelines → QA Light → Alexis merges.

## 7. Prototype holes (not part of the course)
`pl-01` (flat par 3), `pl-02` (hilly par 5) and `pl-03` (par 4 dogleg with trees, Phase K) stay as **practice and test holes**. They're not part of the mountain 9 and don't have to follow these guidelines (e.g. pl-03's lone tree on the fairway).
