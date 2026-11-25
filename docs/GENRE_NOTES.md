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
- **Flat is OK, a field is not** (owner): "flat fairways are mostly ok, especially if around it there is a bit of hills for variety (the out of bounds area). I just don't want to feel like we are playing in a field." A flat fairway needs shaped surroundings: hills, mounds or banks in the rough and beyond OB, so the hole sits in a landscape.
- **Mix the terrain** (owner): "it really depends on the holes and even the course themes … sometimes we do gentle hills and sometimes big drops." Decide hole by hole with Alexis.
- **Sloped lies are OK, but fair most of the time** (owner): the main landing zones are mostly playable lies; a sloped lie is the price of a miss or of the hero line, not the norm.
- **Greens: a mix** (owner): "Hilly greens are interesting but if they are always with slopes it will be too hard." Some flat, some with one clear slope, a few with big breaks. Discuss each green when designing its hole.
- **Rivers and lakes are fun, sometimes** (owner): two jobs. (1) A **shortcut / brave line**: carry the river or bite off the lake to save a stroke. (2) A **"don't hit it" hazard** the player must keep clear of on the safe line, with room to miss. Use them on some holes, not every hole.
- **Surfaces make sense together** (owner): every feature sits on the surface you'd expect around it on a real course.
    - **A tree in the way** (sometimes interesting): never planted straight in the fairway. Give it a patch of **rough** around it.
    - **Rivers and lakes** get a **lip** along the edge: a strip of **rock** or **rough** between the fairway and the water.
    - The same idea applies everywhere: a border of fringe around greens, rough around bunkers that sit away from the fairway, and so on.

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
- **The course designer designs all 9 holes of the prototype** (owner, end of the talk: "I want you to do the entire 9 holes of the prototype course"). Alexis plays and comments on each one. On the real courses, sometimes he designs a hole, sometimes the course designer does.
- **The 3 engine holes don't count** (owner): pl-01, pl-02 and pl-03 stay practice / test holes; the prototype is 9 new holes.
- **One tee box per hole** is enough (owner).
- **Lengths:** keep the HOLE_GUIDELINES ranges (par 3 110–190 m, par 4 260–400 m, par 5 420–500 m) and check them after playing the prototype.

## 6. Hole ideas for the prototype
None from Alexis yet: he didn't want to talk about specific holes in this study. The course designer proposes the 9-hole plan (TASKS C0) from these notes.

## 6a. Lessons from inspiration screenshots
Screenshots Alexis sent from games he likes. Only the idea is kept (pictures are not in the repo, and no hole is copied).

| # | What he liked | The lesson |
|---|---|---|
| 1 | Par 4 dogleg, medium difficulty. Ponds inside the turn, bunkers on the outside around the landing zone. "It allows a brave shot on the left above the ponds. It shows the slopes in the bunker and ponds too." | **Two kinds of risk on one corner:** water on the inside is the brave shortcut (a miss costs a stroke); bunkers on the outside are the cost of the safe line (a harder next shot, no penalty). Hazards sit in visible hollows with sloped edges and a rough lip; trees stand in the rough, not the fairway. |
| 2 | Short par 4 (333 y) as an example of an **easy, medium-hilly** course. | **Easy and hilly can go together.** A very wide fairway that rolls in waves, a big hollow to play over, bunkers set into the slopes at the edges and at the bend, a tree line framing both sides out of play, no water. Difficulty comes from width and hazard placement, not flat ground. |
| 3 | A 96 y approach to a slightly raised green. "Sometimes greens with a bit of elevation are really interesting for approaches." | **A small rise makes a short approach a real decision:** come up short and the ball rolls back down the bank; miss on the bunker side (a big bunker cut into the slope) and the chip is hard. A **backdrop behind the green** (tree line, stone wall) frames the target and helps judge depth. Elevation shown as a number (we have the ↑/↓ readout). |
| 4 | Par 5 tee shot from high up (↓ 21.7 y to the pin), the sea and a rocky bay on the right, the course wrapping around it. "Starting with a drop like this is interesting for the drive and is fun to aim on the fairway." | **A raised tee** shows the whole hole (never blind) and makes the drive exciting. **The sea shapes the routing:** the hole wraps around a bay with a rocky shore (the rocky-coast theme), so you play around the water, with a chance to cut across it later as a brave line. |
| 5 | Par 3 (176 yd) through a gap between rocky cliffs, to a green by a beach and the sea; a big boulder near the tee. "Sometimes walls could be fun." | **Natural walls:** rock cliffs on both sides frame a narrow, clear target, and the ball bounces off them. In our engine a cliff can be **terrain** (a steep `heightAt` slope with the rock surface): no engine work, as long as it's not vertical and never traps the ball. |
| 6 | Par 5 (538 yd) curving right around a big beach, a lagoon behind it, the ocean beyond. "An example of how the theme can influence the course design." | **The theme creates the hazards**, it doesn't just decorate a normal hole: on a beach course the **beach is the bunker**. Sand between the fairway and the water layers the punishment (small miss: sand, playable; big miss: water, penalty). Cutting over the beach and lagoon is the brave line to reach in two. Palms and rocks double as aim points. |
| 7 | A drive from a high tee facing a mountain valley, a waterfall and peaks. "While this could be more for art: when starting with a big drop, it can be fun to have a view." | **A high tee earns a view.** Pointing the hole at the best scenery is a routing choice (course design), the scenery itself is the art pass. A natural rock wall along one side and a stream or waterfall ahead fit the mountain theme. |
| 8 | Hole 1, par 4 (358 yd) on a forest course: "an example of a mostly flat, easy first hole." | **The opener is simple:** straight, wide fairway, one bunker at the side of the landing zone, trees scattered in the rough on both sides (out of the fairway), the green in plain view from the tee. One clear idea and nothing hidden. |

- **Raised greens, sometimes** (owner, screenshot 3): a green a little above the approach, with a bank in front and one bad side.
- **Backdrops behind greens** (owner, screenshot 3): a tree line, a stone wall or a slope behind the green so the target reads clearly. A wall or tree line is scenery (art pass) unless it sits in bounds; trees in play follow the usual rules.
- **Walls, sometimes** (owner, screenshots 3 and 5): natural rock walls and cliffs are terrain (steep slope + rock surface), buildable today. Built walls (a stone wall, a thin vertical wall) as in-play obstacles need engine work (D7, below).
- **Cart paths, sometimes** (owner, from screenshot 1): "while not necessary, it could sometimes be interesting." A path beside the fairway, built with the existing **rock** surface (hard bounce). Gameplay detail and scenery at once; use it on a few holes, never in the main landing zone.

## 6d. Lessons from playtest 1 (2026-11-18)
Alexis played the Mountain 9 prototype. These are rules from now on (his words where possible).

| # | Rule | What it means when building |
|---|---|---|
| L1 | **"Be a lot more generous with hills, on fairways AND greens."** Sloped greens make the player compensate: today the aim is too easy. | Rolling fairways with real side slopes; most greens tilt or break enough that aiming straight at the cup misses. Keep the cup itself on a gentle spot. |
| L2 | **Many more trees close to the course** (a forest / mountain biome): "trees are golf's natural obstacle". Trees can be a lot bigger and taller. | Tree lines along both sides of every fairway, on rough, some big (taller than a drive's peak). Every tree in play still shows on the aim warning. |
| L3 | **Holes a little longer overall** (about +10%; caps: par 3 ≤ 210 m, par 4 ≤ 440 m, par 5 ≤ 550 m). | Lengths go up about 10% per hole. |
| L4 | **Fairways flow smoothly: no sharp angles, no thin strips or "notches". Think of fairways, greens and bunkers as BLOBS.** A shortcut spot should morph out of the fairway, not protrude from it (an isolated fairway "spot" is OK sometimes as a shortcut). | Wobbly, rounded edges; legs blend at wide, round joints; a shortcut is a swelling of the fairway toward the brave line. **Check the minimap by eye: no strips, arms, L shapes or notches.** |
| L5 | **Bunkers in the way, where real shots land**, so the player must hit softer or harder. More interesting blob shapes, not just ovals. | Bunkers at the end of the default drive and short of / beside greens on the line; multi-lobe shapes. |
| L6 | **Rough as an obstacle sometimes:** a rough patch cutting into the fairway the way a bunker does. | Rough blobs that bite into the fairway edge or sit in it. |
| L7 | **Not always right turns: some doglegs left.** | Mix the turns across the 9. |
| L8 | **A creek presented as an obstacle must be big enough to be one.** Creek beds widen where they reach a lake (no "balloon"). | Creeks that are in play are 5–8 m of water; the bed widens smoothly into the lake. |
| L9 | **The fairway approach merges smoothly into the green.** | The approach widens to the green's width and runs into its fringe, no neck. |
| L10 | **Creeks meander and vary in width, and widen into lakes; check the minimap by eye for lines and balloons** (PM fix pass, holes 4, 7, 9). | Gentle S-bends, width that breathes, a delta where the bed meets the lake; lakes are blobs, not circles. |
| L11 | **"Tree rules depend on the biome. Forest and mountain courses need lots of trees: along the fairways and behind the greens. Other biomes (seaside, desert, tropical) get their own rule in their genre talk."** (owner, 2026-11-18) | Mountain kit: tree lines along every fairway plus an arc of trees on the rough behind each green (≥ 13 m beyond the fringe, a long ball is a chip), never between the approach and the green, never hiding the flag. |
| L12 | **Bunkers are big and deep, "like a pit" / "like a bowl"** (owner, 2026-11-24, Buttercup Meadows #145: "your bunkers are not big enough and deep enough … the ball should roll into the bunker"). For every hole from now on. | Fairway bunkers about 1.0–1.2 m deep, greenside bunkers about 1.5 m, and big (roughly 8–14 m across, multi-lobe). The ground curves down from the sand's edge to a low middle, so a ball near the edge rolls in. A Sand Wedge must still get out (tests/meadow.test.js checks every bunker). |
| L13 | **Bunkers touch play** (owner, 2026-11-24, #145): "Bunkers can be a bit outside but should overlap with the fairway." Rule. | Every bunker overlaps the fairway edge, sits inside the fairway, or hugs the green; never a lone bunker in the rough (tests/meadow.test.js checks it). |
| L14 | **Bunkers can be in the middle of the fairway** (owner, 2026-11-24). Allowed. | Cross bunkers and pot bunkers in the landing zone or short of the green, with room around them on the safe line. |
| L15 | **Variety, sometimes (not a rule):** patches of rough in the fairway, and 1–2 trees in the fairway (owner, 2026-11-24). | Rough blobs in or biting into the fairway (`roughs`); a lone fairway tree gets a small ring of rough around its base (owner's pick A). Use on a few holes, not every hole. |
| L16 | **Greens are often bigger and blob-shaped** (owner, 2026-11-24): "greens can also be bigger and have other shapes, like beans or blobs. I'd say often all shapes are blobs." Default. | Beans, kidneys, 2–3 lobes, a wobbly edge (`green.lobes`, `wob`, `rot` in the hole kit); an oval only now and then. Fairways, bunkers and greens are all blobs. The cup still sits on a gentle part. |
| L17 | **One shape, not touching circles** (owner, 2026-11-24, #145): "Don't make two bunkers touch like this. Instead make it one shape that covers both of them." Rule. | A bunker (or green) with lobes melts them into one smooth blob (`blend: 0.5` in the hole kit): no waist or crease where two circles meet. Two separate bunkers keep a clear strip of grass between them. |
| L18 | **The cup is often off-centre** (owner, 2026-11-24): "the flag does not have to be in the center of the green. It could be offset to one side of the bean (while still being in the center of a circle, so not on the edge)." Rule. | Put the cup in the middle of one lobe of the green, usually the guarded one (the brave pin), never near the edge. **A dead-centre cup is still fine sometimes** (owner: "let's have it centered on hole 1"). The default approach aims at the green's centre (safe ≈ par); going at the flag is the birdie chance. |
| L19 | **Bunkers and rough never cover the green** (owner, 2026-11-24): "Bunker and rough can overlap a lot of things but not the green." Rule. | Bunkers and rough patches may overlap the fairway, the fringe and the rough, never the putting surface itself: a greenside bunker hugs the fringe (tests/meadow.test.js checks it). |
| L20 | **Deep rough is a layer between the rough and out of bounds** (owner, 2026-11-25): "deep rough is not a perimeter anymore but a layer between rough and out of bound. It has to be blob like like other surfaces." Rule. | Every hole: `land.deepBand: { w, wob, seed }` paints deep rough just inside the clearing's edge, its width swelling and thinning (about 2–14 m), never an even ring. Where it adds a decision it swells into a bigger area merged with the layer (a `deepRoughs` blob, e.g. mdw-02's left), never close to the fairway. The tint (between the rough and OB) is the artist's. |

Note (owner, 2026-11-18, hole 5): a separate small circle of fairway beside the main fairway is a fun shortcut: the challenge is to land on that circle instead of the rough around it. It doesn't have to make you dodge trees (hole 5's happens to). The game's small minimap can make two nearby fairways look joined; judge shapes on the big map.

## 6b. Ideas for later courses (not the prototype)
- **Ocean course** (owner): the coast is lined with either **rocks** or **sand**, depending on the theme we pick together:
    - **Rocky coast:** cliffs and rocky shores, in the mood of famous clifftop and seaside courses (Alexis mentioned Pebble Beach and English cliffs as mood references only; we copy no holes).
    - **White sand beaches:** a tropical feel, with sand between the fairway and the sea.
    - Engine: the sea is the existing water surface (penalty + drop), the shore is rock or sand. No new physics; the look comes with the art pass.

### Greens on the real courses (owner, 2026-11-18)
- **More slope, and sometimes larger greens** than the prototype: "eventually in real courses, I'd like the greens to have more slope and even be larger sometimes." Putting becomes 2 clicks (S14, aim + power, always struck straight), so the read of the slope is the putting skill.

## 6c. Next genre talk
Before the **real courses** (after the prototype and the art pass), have a similar talk with Alexis for each course theme: its signature idea, its surfaces, its hills, more screenshots.

## 7. Needs engine work (for the PM, not built by the course designer)
Sent to the PM on 2026-11-18. Backlog IDs are in docs/TASKS.md, "Engine wishlist from the genre study".

| ID | His doc asks for | Engine today |
|---|---|---|
| ~~D1~~ | ~~3–5 tee sets per hole~~ **Dropped by the owner (2026-11-18): "we don't need multiple tee boxes, a single one is fine."** | 1 tee per hole (enough) |
| D2 | 4+ pin positions per green | 1 cup per hole |
| D3 | Intro flyover: safe route, then hero route, then the green | No flyover camera |
| D4 | Shaping a draw or fade on purpose | The ball curves only on a mistimed 3rd click |
| D5 | More surfaces: deep rough, waste areas, gorse / heather | fairway, fringe, green, rough, sand, rock, water, OB |
| D6 | Wind visible in the landing zones (flags, trees moving) | HUD arrow + mph, and the flag at the cup |
| D7 | Built walls (stone wall, low wall) as in-play obstacles the ball bounces off | Only trees and boulders; a natural cliff can be steep terrain today |
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
- Guidelines §6 say every hole is co-designed with Alexis; for the prototype he now asks the course designer to design all 9 (he plays and comments).
- Guidelines §3 list "lone trees" with no surface rule; he wants every in-play tree on a patch of rough (pl-03's lone tree has `onFairway: true`, against this rule; it's a test hole, so no change asked).
