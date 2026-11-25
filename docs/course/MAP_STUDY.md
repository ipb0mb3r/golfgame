# Map study: how good arcade-golf holes are shaped

> Course designer, from 15 hole maps the owner (Alexis) shared from games he likes (2026-11-24). We keep the
> principles, never the holes, names or art. The owner's diagnosis of our first holes: "the main problem is the shape
> of everything. The fairways are too straight and the bunkers and rough are not interesting at all from a gameplay
> perspective" (heights come later). This is the brief for every hole from now on, together with GENRE_NOTES L12–L21.
> How to build it with the hole kit, and the traps we hit: `docs/course/HANDBOOK.md`.

## 1. The hole sits in a place, not a field
- The playable land is a **shaped clearing**: forest, sea, a river or a drop all around, and outside is clearly "out".
  Its edge is irregular: bays, points, a narrow tee clearing that opens up.
- Build: `land: { pts }` (a closed outline) in the hole kit. Outside it is OB, painted dark and filled with forest.
  Props (windmills, cows, fences) still stand outside the OB box.
- The land is much wider than the fairway: **real rough** between the fairway and the tree line (about 2–2.5× the
  fairway's width in the landing zone), with single trees and clumps standing in it near the fairway.

## 2. Fairways have a character, not a width
- They **pinch and swell**: narrow off the tee, a fat landing zone, a waist where hazards squeeze in, then open
  into the green (as wide as the green).
- They **lean and snake**: the landing zone sits off the tee-to-green line; S-bends; diagonals across the land.
- They can be **interrupted**: a pond inside the fairway short of the landing zone; a river crossing; the fairway
  ending at a gap or water with the green beyond; a small separate patch of fairway as the brave landing.
- Build: `fairwayShapes: [{ pts }]` (closed outlines through hand-placed points), not a centre line with a width.

## 3. Bunkers are few, big, and each asks a question
- **Pinch bunkers** facing each other at the landing zone squeeze the fairway.
- **A feature bunker by the green on the bad side**: big, wrapping part of the green. Even the easy opener has one.
- **A long side bunker** following an edge (a beach, a bank).
- **Combos (map 6):** a bunker on one side and a tree placed where you'd go to dodge it. The safe answer is
  distance: lay back short of both. Choices are about *how far* as well as *which side*.
- Big compared with the fairway (often half its width); 2–4 per hole, each guarding something.

## 4. Doglegs: the inside of the bend is the hazard
- The safe route follows the fairway; the brave route cuts across the inside, which is rough filled with bunkers
  and tree clumps (map 7), or water (maps 12, 15). The ground between the legs is never empty grass.

## 5. Trees draw the edges
- Single round trees and **clumps of 2–3** on the edge of the clearing, at irregular gaps, so the outline is alive.
- A few clumps or a lone tree inside the rough (or on a ring of rough in the fairway) as aim points and obstacles.
- The forest closes in behind the green as a backdrop.
- Build: `forest: { edgeGap, inset, clump }` with a land outline plants clumps along its edge.

## 6. Greens
- Big, often as wide as the approach or wider, set at an angle, blob-shaped, framed by trees.
- Sometimes **isolated**: across water, a river or a gap, with the fairway ending at a lay-up spot. Fully
  surrounded by water at most once or twice per course (GENRE_NOTES); set apart by rough or a bank more often.

## 7. Water
- A pond can sit in the fairway short of the landing zone, take half the hole with the line cutting its corner,
  run along a whole side, or cross the hole as a river (a chain of islands).

## 8. The theme shapes the hole (maps 16–23)
- The theme decides **what surrounds the hole** (forest, open parkland, sea and beach, a river, cliffs, desert) and
  **what the hazards are**: on a beach the beach is the long bunker; on a river course the hole is strips of land
  between channels; in a desert the hole is an oasis inside a band of waste ground.
- **Nested tiers of grass** (fairway, a first cut, a rough band) each with its own soft outline (map 16). We have
  no "first cut" surface (D5 wish); the art could tint the band near the fairway.
- **Height shows as terraces and bands**: banks stepping down to water (map 21), contour bands around a hill with
  the fairway curving round its foot (map 22), a beach with terraces climbing away from it (map 17).
- **Owner (2026-11-24): Meadow keeps the dense forest outside the clearing** (option B), as in the hole 1 pilot.
- **Owner (2026-11-25): deep rough is the layer between the rough and OB** (GENRE_NOTES L20): a blob band inside the
  clearing's edge, swelling into a bigger area where it adds a decision.

## 9. Not yet (later steps)
- **Heights:** the maps barely show them. A separate pass with the owner.
- **Minimap contrast:** OB (`deepRough`) is only a little darker than the rough in `meadow-day`, so the
  clearing reads weakly on the minimap. Art question for the artist.
- **OB stakes** are still drawn on the OB box's straight lines (engine); with a land outline they stand inside
  the forest. Dev question if it matters.

— Agent: course-designer
