# Genre notes: what the owner wants from a course

> Written by the course designer from a talk with **Alexis (owner / game designer)** on 2026-11-18 and his design document **"Arcade Golf Course Design Principles"** (claude.ai doc, linked in the PR). His doc is the full reference. This file is the short version the course designer works from, plus what the engine can't do yet.
>
> We keep the design principles, never the holes, names or art of existing games.

## 1. Games he loves
- **Mario Golf 64** and **Mario Golf: World Tour**
- **Hot Shots Golf**, the Vita one most of all. **Hot Shots is the closest model**: realistic courses, arcade controls.

## 2. His principles (his words where possible)
- Every hole must be **fun on the first play**, **readable in one camera pass**, and offer **at least two real ways to reach the green**.
- **Realistic courses, arcade feel.** Every hazard must exist on a real golf course, made bolder (bigger elevation, wider carries, striking scenery). No moving obstacles, bumpers, jump pads, lava or floating islands.
- **Fun beats punishment. Choice beats execution. Readable beats surprising. Variety beats repetition.**
- **Not particularly hard.** "Don't focus on the trees that matter and rock bounces, these were for the prototype of the engine."
- **Risk/reward:** "when you take the safe line it should be around par or birdie, but when you take the brave line it should be birdie or better."
- **No blind shots** (prototype decision, 2026-11-18).
- **Hills, not flat holes** (owner, 2026-11-18): "I don't really like when holes are flat." Every hole has real ground shape: rolling fairways, mounds, slopes that move the ball, raised or sunken greens.
- **Hazards live in the ground, not on it** (owner): "a bunker needs to be an actual hole like in a real golf course. Sometimes the hole is deep and sometimes not." Vary bunker depth: shallow fairway bunkers you can advance from, deep greenside or pot bunkers with a steep face. Ponds and creeks sit in a dip too.
- **Mix the terrain** (owner): "it really depends on the holes and even the course themes … sometimes we do gentle hills and sometimes big drops." Decide hole by hole with Alexis.
- **Sloped lies are OK, but fair most of the time** (owner): the main landing zones are mostly playable lies; a sloped lie is the price of a miss or of the hero line, not the norm.
- **Greens: a mix** (owner): "Hilly greens are interesting but if they are always with slopes it will be too hard." Some flat, some with one clear slope, a few with big breaks. Discuss each green when designing its hole.
- **Rivers and lakes are fun, sometimes** (owner): two jobs. (1) A **shortcut / brave line**: carry the river or bite off the lake to save a stroke. (2) A **"don't hit it" hazard** the player must keep clear of on the safe line, with room to miss. Use them on some holes, not every hole.

## 3. Do
- **Two routes on every hole** (except the first warm-up holes): a safe line (longer, forgiving, par most of the time) and a hero line (shorter or a better angle, risky, saves a stroke).
- **Both routes visible from the tee**, and the two routes test different things (carry vs accuracy).
- **Proportional punishment:** a small miss costs a little; water and OB sit mainly on the hero line, never in the middle of the safe line.
- **A missed hero shot leaves a recovery shot** (a chip, a punch out) more often than a penalty drop.
- **Design the green first**, then the approach, the landing zone, the tee. Every green has a good side (easy chip) and a bad side (hard chip). Keep the slope gentle near the cup.
- **Wide landing zones**, with one side of the fairway giving a better angle in. Narrow only the hero line.
- **One idea per hazard**, and every hazard guards something. If it guards nothing, remove it.
- **Use terrain as a hazard too:** slopes, mounds, ridges, false fronts.
- **Landmarks mark aim points** (a lone tree, a big rock) so a player can say "aim at the big rock".
- **Point holes in different directions** so the wind changes from hole to hole.
- **Pacing in a 9:**

| Holes | Role | Feel |
|---|---|---|
| 1–2 | Warm-up | Wide, readable, one obvious hero line |
| 3–5 | Introduce | First use of the course's signature idea |
| 6–7 | Test | Signature idea + wind, elevation or a tight green |
| 8–9 | Climax | Biggest risk/reward of the 9, a big view |

- Follow a hard hole with a breather. Don't open or close a 9 with a par 3.

## 4. Don't
- No fantasy hazards or props (see §2).
- No hazard every player must cross, unless the carry is short for everyone.
- No surprise penalties: nothing hidden behind a ridge, no unmarked OB.
- Don't stack everything on one hole (elevation + tiny green + penalty on all sides).
- Don't be plain either: the setting must change how shots play, not only how they look.
- No island greens or fully forced carries except as a rare signature moment (1–2 per course at most).
- No medium in-between lies: a ball near a bunker either stops short or goes in.

## 5. The 9-hole prototype
- It's a **test of the course designer's workflow**, not the final course. After it: an **art and assets pass**, then the real courses.
- **Don't think too much about the mountain setting for now.**
- **Alexis will give hole ideas** and we keep talking; sometimes he designs a hole, sometimes the course designer designs it alone.
- **Lengths:** keep the HOLE_GUIDELINES ranges (par 3 110–190 m, par 4 260–400 m, par 5 420–500 m) and check them after playing the prototype.

## 6. Hole ideas for the prototype
_To fill as Alexis and the course designer talk._

## 7. Needs engine work (for the PM, not built by the course designer)
Sent to the PM on 2026-11-18. Backlog IDs are in docs/TASKS.md, "Engine wishlist from the genre study".

| ID | His doc asks for | Engine today |
|---|---|---|
| D1 | 3–5 tee sets per hole (offset, flat) | 1 tee per hole |
| D2 | 4+ pin positions per green | 1 cup per hole |
| D3 | Intro flyover: safe route, then hero route, then the green | No flyover camera |
| D4 | Shaping a draw or fade on purpose | The ball curves only on a mistimed 3rd click |
| D5 | More surfaces: deep rough, waste areas, gorse / heather | fairway, fringe, green, rough, sand, rock, water, OB |
| D6 | Wind visible in the landing zones (flags, trees moving) | HUD arrow + mph, and the flag at the cup |
| Phase 5 | Rain as a difficulty lever | Planned (DESIGN §7), not built |
| — | Hero carries checked against character stats | No characters (out of scope, DESIGN §1) |

Already there: the elevation change is shown (↑/↓ yards to the cup in the distance readout).

### Engine notes for hills and deep bunkers (no engine work, to check while building)
- Bunker depth is hole data (`heightAt`), so deep bunkers need no new code. Today's bunkers are only 0.30–0.35 m deep.
- To check on each hole: a ball can always get out of a deep bunker with the sand wedge (no stuck ball, guidelines §4), a steep face doesn't hide the sand from the camera (no blind shots), and a ball on a slope comes to rest where it can be played.

## 8. Differences with HOLE_GUIDELINES.md (not changed here, listed in the PR)
- Guidelines §2 ramp ("Demanding", "hard but fair") and the earlier "harder is much better" taste vs. "not particularly hard" now.
- Guidelines have no two-route rule; his doc makes it the core rule.
- Guidelines §3 asks every hole to use a different signature hazard; his doc asks for **one signature idea per course**, used in different ways across holes.
- Guidelines §1 mountain setting is set in detail; for the prototype he says not to focus on it.
- Guidelines §3 lists OB "sparingly"; his doc agrees, and also bans fantasy hazards (not mentioned in the guidelines).
