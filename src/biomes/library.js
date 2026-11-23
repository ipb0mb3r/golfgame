// AP5: the shared library of biome-set pieces (DESIGN §8b, ART_STYLE §3 "pick list"). Every piece lives
// here ONCE; a biome set (src/biomes/<id>.js) names the pieces it uses by id. Plain data: the game
// (src/game/scene.js, props.js) knows how to build each piece; this file only says which exist and which
// palette keys colour them.
//   slots: material slot → palette key (ART_STYLE §4.3). A slot not listed has a fixed colour that never
//          changes with the biome (the white flagpole, the white OB stakes).
//   shade: per-copy variation of one slot (instanced trees). 'around': each copy's hue / lightness is
//          spread (± half of h, l) around the palette colour. 'multiply': the palette colour is multiplied
//          by a colour picked in the hsl ranges [from, spread], so copies are drawn darker than the key.
//   tris:  rough triangle count of one copy (ART_STYLE §5 budget).
//   model:    (AP3, optional) 'assets/models/<name>.glb': the piece is drawn from that file (its first
//             mesh's shape; the colours still come from the slots), loaded by src/game/assets.js before
//             the hole starts and cached for the round. fallback = the procedural piece of the same group
//             drawn when the file is missing or broken (core/assets.js modelPieceError checks both).
// Today (AP5) every piece is the procedural one the game already drew before biome sets; new pieces
// (glTF models, textures, props) are added here by AP6 / AP7 and the artist (ART1).
// AP7a: the gradient trees' slots (low → canopy → top, bottom to top) and per-copy tint
const TREE_GRADIENT_SLOTS = Object.freeze({ low: 'leafLow', canopy: 'leaf', top: 'leafTop', trunk: 'trunk' });
const PINE_SLOTS = Object.freeze({ ...TREE_GRADIENT_SLOTS, canopy: 'pine' });
// artist Q4 on #105: the spruce and the palm take leafAlt as their mid colour
const SPRUCE_SLOTS = Object.freeze({ ...TREE_GRADIENT_SLOTS, canopy: 'leafAlt' });
const PALM_SLOTS = Object.freeze({ ...TREE_GRADIENT_SLOTS, canopy: 'leafAlt', trunk: 'trunkAlt', mark: 'trunk' });
const BIRCH_SLOTS = Object.freeze({ ...TREE_GRADIENT_SLOTS, trunk: 'trunkAlt', mark: 'trunk' });
const TREE_TINT =Object.freeze({ slot: 'canopy', mode: 'tint', h: [0.2, 0.15], s: 0.25, l: [0.84, 0.16] });
// AP7d: a small prop's per-copy tint: the trees' tint at half the spread, on the listed (green) slots only
const smallTint = slots => Object.freeze({ ...TREE_TINT, slot: undefined, slots: Object.freeze(slots), half: 0.5 });
export const LIBRARY = Object.freeze({
  // Course textures: the same greyscale textures in every biome, recoloured by the palette. None exist
  // yet (AP6): with none picked, the course is painted in flat palette colours, as today.
  textures: {},
  // Trees in play: the look only. Their collisions (trunk, canopy) stay in the hole's `obstacles`.
  onTrees: {
    roundTree: { desc: 'Cylinder trunk + a round faceted canopy (icosahedron), each tree its own shade of the canopy colour (the trees in play since Phase K).', slots: { canopy: 'leaf', trunk: 'trunk' }, shade: { slot: 'canopy', mode: 'around', h: 0.06, l: 0.08 }, tris: 360 },
    // AP7a: the gradient trees (core/trees.js, config TREE_LOOK). gradient: true = the canopy is toon shaded
    // (3 bands, AP6a's ramp) and painted per vertex low → canopy → top from bottom to top; `canopy` is
    // its mid colour (the minimap's tree colour). shade 'tint': each copy is multiplied by a near-white
    // colour picked in the hsl ranges (h, l: [from, spread]), so copies differ a little in shade.
    // Mid colours: the pine `pine`, the spruce and the palm `leafAlt`, the round canopy and the birch `leaf`. `mark` = the trunk's second colour (palm grooves, birch bark marks).
    // Each copy in play also gets a random turn and a slight lean of its canopy (inside its collider).
    // The same pieces can be offTrees (below); `tris` = one tree in play (trunk + canopy).
    pineTree: { desc: 'Soft pine: a tapered trunk and 4 stacked, overlapping tiers (AP7b), each with a rounded shoulder and a drooping, gently wavy skirt, toon shaded with the leafLow → pine → leafTop gradient.', slots: PINE_SLOTS, gradient: true, shade: TREE_TINT, tris: 332 },
    spruceTree: { desc: 'Spruce: narrower and taller-looking than the pine, 5 tiers, the leafLow → leafAlt → leafTop gradient, toon shaded.', slots: SPRUCE_SLOTS, gradient: true, shade: TREE_TINT, tris: 372 },
    palmTree: { desc: 'Palm: a bowed trunk (trunkAlt) with darker ring grooves (trunk), a round dome crown (AP7b, owner "C + a little B") of 11 wide, pointed fronds in two layers that arch up and curl down, a small tuft on top, the leafLow → leafAlt → leafTop gradient. Needs a wide, flat canopy collider (half-height ≤ 0.8 × radius, validateHole).', slots: PALM_SLOTS, gradient: true, shade: TREE_TINT, tris: 330 },
    roundCanopy: { desc: 'The artist\'s round tree: round lobes filling its collider (AP7b: 3 low lobes on its floor and a round top dome, at most 2 rows; in a tall collider the lobes grow instead of stacking; never stretched into an egg), flat-ish bottoms, the leafLow → leaf → leafTop gradient, toon shaded.', slots: TREE_GRADIENT_SLOTS, gradient: true, shade: TREE_TINT, tris: 340 },
    birchTree: { desc: 'Birch (Alpine): a slim pale trunk (trunkAlt) with dark bark marks (trunk) and a light, airy canopy of 5 lobes in two rows (AP7b: lower and wider, from ~40–45 % of its height).', slots: BIRCH_SLOTS, gradient: true, shade: TREE_TINT, tris: 408 },
  },
  // Scenery trees outside OB (never in play)
  offTrees: {
    coneTree: { desc: 'Thin cylinder trunk + one 7-sided cone (the scenery forest since Phase 0), a shade per tree (drawn darker than the pine key).', slots: { canopy: 'pine', trunk: 'trunk' }, shade: { slot: 'canopy', mode: 'multiply', h: [0.3, 0.06], s: 0.45, l: [0.25, 0.1] }, tris: 38 },
    // AP7a: the gradient trees as scenery, one draw call per piece (trunk + canopy merged, config TREE_LOOK
    // .scenery size); a lighter version (TREE_LOOK lod) as there are hundreds; each copy its own size,
    // width, lean, turn and tint. tris = one scenery tree.
    // AP7b, the cheap far tree wall: farTris = one tree of the piece's far version (config TREE_LOOK[id].far:
    // 2 tiers / 2-3 lobes), drawn instead beyond TREE_FAR.from m outside the course's OB box (one more draw
    // call per piece), so the big forests stay as dense within the budget. Automatic: a set picks nothing.
    // The palm's far version since AP7b (3 + 5 fronds of 2 stations).
    pineTree: { desc: 'The soft pine as scenery (3 tiers, fewer sides, a simpler tier outline).', slots: PINE_SLOTS, gradient: true, shade: TREE_TINT, tris: 96, farTris: 66 },
    spruceTree: { desc: 'The spruce as scenery (3 tiers, fewer sides).', slots: SPRUCE_SLOTS, gradient: true, shade: TREE_TINT, tris: 96, farTris: 66 },
    palmTree: { desc: 'The palm as scenery (3 stations per frond, fewer sides).', slots: PALM_SLOTS, gradient: true, shade: TREE_TINT, tris: 166, farTris: 82 },
    roundCanopy: { desc: 'The round tree as scenery (AP7b lighter: 3 five-sided base lobes and a six-sided dome).', slots: TREE_GRADIENT_SLOTS, gradient: true, shade: TREE_TINT, tris: 102, farTris: 70 },
    birchTree: { desc: 'The birch as scenery (3 lobes, 2 bark marks, fewer sides).', slots: BIRCH_SLOTS, gradient: true, shade: TREE_TINT, tris: 144, farTris: 66 },
  },
  // Boulders in play: the look only; their collision sphere stays in the hole's `obstacles`
  rocks: {
    roundBoulder: { desc: 'A faceted sphere (icosahedron), turned at random.', slots: { body: 'boulder' }, tris: 320 },
  },
  skies: {
    flatSky: { desc: 'One flat sky colour that the fog fades into, with white cloud puffs (today\'s sky; skyTop is not drawn yet).', slots: { sky: 'skyHorizon', fog: 'fog', clouds: 'cloud' }, tris: 0 },
    // AP6a: the artist's sky (docs/art/ap6a-artist-notes.md, core/backdrop.js, config SKY_LOOK)
    gradientSky: { desc: 'A dome from skyTop overhead to skyHorizon at the horizon (melting into the fog just under it, no seam), with 9 groups of big toon puffy clouds in `cloud`, bright (emissive) and never fogged, high and far in front.', slots: { sky: 'skyHorizon', top: 'skyTop', fog: 'fog', clouds: 'cloud' }, tris: 15000 },
  },
  backdrops: {
    roundHills: { desc: 'A ring of big round hills far around the course (one tint zone, backNear).', slots: { hills: 'backNear' }, tris: 440 },
    // AP6a (docs/art/ap6a-artist-notes.md; geometry in core/backdrop.js, numbers in config.js). Drawn unfogged with
    // the haze baked into their colours (mixed toward `fog`), fitted inside the hole's cameraFar (BACKDROP_FIT).
    hazeHills: { desc: 'The stronger far-hill tint: a near ring of soft round hills in backNear and a far ring in backFar, each mixed toward the fog by distance (10 % / 22 %), their bases fading further into the haze.', slots: { near: 'backNear', far: 'backFar', fog: 'fog' }, tris: 3200 },
    hornPeaks: { desc: 'Alpine: a WIDE hero horn and 6 smaller horns (faceted toon rock in backFar, snow in backCap above the snow line and on flat faces), a low snowy far ridge (backFar / backCap / backCapShade) and a full ring of dark forested slopes in front (backNear).', slots: { rock: 'backFar', slopes: 'backNear', snow: 'backCap', snowShade: 'backCapShade', fog: 'fog' }, tris: 1650 },
    // seaSide: where the sea is when the hole doesn't say (hole scenery.seaSide overrides it)
    ocean: { desc: 'Island coast: a deep sea (waterDeep) to the horizon on the sea side(s), a mid and a shallow shore band (water), a sand beach with lava rock patches beyond OB (drawn only: physics never changes), a green volcanic ridge with soft tops (backFar) and a low far island (backNear).', slots: { shallow: 'water', deep: 'waterDeep', sand: 'sand', rock: 'rock', ridge: 'backFar', island: 'backNear', fog: 'fog' }, seaSide: 'left+far', tris: 380 },
  },
  // The course's own small things, one of each kind per set (flag, tee markers, OB stakes, pond surface)
  furniture: {
    clothFlag: { desc: 'A waving cloth on a white pole (the pole is fixed white: it is gameplay).', slots: { cloth: 'accent' }, tris: 96 },
    ballMarkers: { desc: 'Two balls either side of the tee.', slots: { marker: 'subAccent' }, tris: 160 },
    // AP3: the loader's proof piece (dev only: picked by the test-models set, ?biome=test-models). A model
    // piece names its .glb (`model`) and the procedural piece drawn when the file can't load (`fallback`).
    testCubeMarkers: { desc: 'AP3 test: two cubes from a model file either side of the tee (the AP2 test cube).', slots: { marker: 'subAccent' }, model: 'assets/models/test-cube.glb', fallback: 'ballMarkers', tris: 24 },
    whiteStakes: { desc: 'White out-of-bounds stakes (fixed white: the golf rule colour).', slots: {}, tris: 24 },
    flatPond: { desc: 'Not drawn since X43 (the see-through water surface covers every water area); kept while the biome sets still pick it (furniture.pond).', slots: { surface: 'pondSurface' }, tris: 48 },
  },
  // Scattered by the set's rule (smallProps, AP7c / AP7d; core/smallPropShapes.js builds the shapes, the artist's
  // docs/art/small-props/SPEC.md). One draw call per pick (all its copies instanced, every part in one geometry,
  // each vertex mixed from its lo / hi slot by w), toon shaded like the trees, fogged; at most SMALL_PROPS.maxTris
  // triangles of them per frame, the nearest first. tris = one copy (ART_STYLE §5: a small prop ≤ 50).
  //   scale = [min, max] size of a copy (a random draw); shade = the per-copy colour tint (TREE_TINT at half the
  //   spread: `half` 0.5 = half way back to white) on the listed green `slots` only: petals, flowers and stones
  //   keep their exact colour.
  smallProps: {
    grassTuft: { desc: 'A thin fan of 7 slim, pointed blades (0.3–0.45 m): deepRough at the foot, leafTop at the tips, each blade drooping a little; drawn from both sides.', slots: { base: 'deepRough', tip: 'leafTop' }, scale: [0.8, 1.3], shade: smallTint(['base', 'tip']), tris: 21 },
    flowerPatch: { desc: 'A flat carpet of 9 five-point flower heads lying 3 cm above the grass over ~0.8 × 0.65 m: no stems, no leaves, so it never hides the ball. One colour (petal).', slots: { petal: 'propA' }, scale: [0.8, 1.3], tris: 45 },
    flowerBush: { desc: 'A round green dome 1.36 m across and 0.92 m tall (foot low, crown top) with 4 raised flower clumps (flower). Tall: scenery beyond OB only.', slots: { low: 'leafLow', top: 'leafTop', flower: 'propA' }, scale: [0.8, 1.25], shade: smallTint(['low', 'top']), tris: 46 },
    pebbles: { desc: 'Three squashed 5-sided stones close together, ~0.45 m across.', slots: { stone: 'boulder' }, scale: [0.8, 1.4], tris: 30 },
    flatStone: { desc: 'One flat 6-sided stepping stone, 0.64 × 0.52 m and 0.12 m tall.', slots: { stone: 'boulder' }, scale: [0.8, 1.4], tris: 24 },
    reeds: { desc: 'A bunch of 10 tall blades (0.7–1.15 m) bending gently outward: deepRough at the foot, leafTop at the tips; drawn from both sides. Meant for a water edge (perTenM).', slots: { base: 'deepRough', tip: 'leafTop' }, scale: [0.8, 1.3], shade: smallTint(['base', 'tip']), tris: 30 },
  },
  // AP7e: placed by hand in the hole data (scenery.bigProps: [{ id, x, z, turn, scale }], beyond OB only); the set
  // lists which it offers. The artist's owner-approved spec docs/art/big-props/SPEC.md; shapes in
  // core/bigPropShapes.js. Flat-shaded toon (crisp faces), fogged, instanced: one draw call per piece part per hole
  // (the windmill: body + sails, a part of their own so they could turn later; owner: still). No collider, no
  // physics. tris = one copy (ART_STYLE §5: a big prop ≤ 1,500); scale = the [min, max] a hole may give it; size = the piece's drawn size (× the hole's scale, × the BIG_PROP_SCALE tunable; owner pick 2026-11-23).
  bigProps: {
    windmill: { desc: 'Meadow: a white 8-sided smock mill (13 m) on a grey stone base, a wooden gallery ring, a brick-red onion cap and 4 still cloth sails (6.8 m) on a wooden hub, a door and a window on the front.', slots: { wall: 'propSnow', base: 'rock', cap: 'roof', spar: 'wood', sail: 'propSnow', glass: 'glass' }, scale: [0.9, 1.15], size: 2.5, tris: 328 },
    chalet: { desc: 'Alpine: a classic chalet, 12 × 9 m, 8.5 m tall: a white stone ground floor, a dark wood upper floor, a wide low roof of two thick slabs, a front balcony with 3 geranium boxes, red shutters, a door and a white chimney.', slots: { stone: 'propSnow', wood: 'wood', roof: 'roof', shut: 'accent', flower: 'accent', leaf: 'leaf', glass: 'glass' }, scale: [0.9, 1.15], size: 1.8, tris: 404 },
    chaletTall: { desc: 'Alpine: the tall chalet, 10 × 9 m, 11 m tall: stone and two wood floors, two balconies with 2 geranium boxes each, a steeper roof.', slots: { stone: 'propSnow', wood: 'wood', roof: 'roof', shut: 'accent', flower: 'accent', leaf: 'leaf', glass: 'glass' }, scale: [0.9, 1.15], size: 1.8, tris: 404 },
    beachHut: { desc: 'Island: a thatched stilt hut, 3.6 × 3.6 m (+ deck), 4.7 m tall: 4 short stilts, a wooden deck and room, a steep thatch pyramid roof, a turquoise door and side shutter, a step. Never below scale 0.9 (its door reads door-sized next to the golfer).', slots: { wall: 'wood', post: 'trunk', roof: 'roof', door: 'water', trim: 'propSnow' }, scale: [0.9, 1.15], size: 1.8, tris: 114 },
  },
  // AP7f: fence looks laid along a line in the hole data (scenery.fences: [{ id, points }], beyond OB + 2 m only); the
  // set lists which it offers (`fences`). The artist's owner-approved spec docs/art/fence/SPEC.md; shapes in
  // core/fenceShapes.js (a post part and a span part, repeated along the line). Flat-shaded toon, fogged, one merged
  // mesh per look per hole. No collider, no physics. tris = one segment (a post + a span; ≤ 100, tested); spacing = m
  // between posts at 1× (× the FENCE_SCALE tunable, default 1.5, like the size). Each slot pair is lo (foot / underside)
  // → hi (top).
  fences: {
    railFence: { desc: 'Meadow, Alpine: a tidy paddock fence, square posts (0.16 m, 1.2 m tall) and two flat rails at 0.45 and 0.95 m on the posts\' front face, dark at the foot / underside, lighter on top.', slots: { post: 'trunk', postTop: 'wood', rail: 'trunk', railTop: 'wood' }, spacing: 3, tris: 36 },
    ropeFence: { desc: 'Island: crooked 5-sided driftwood posts (1.0 m, leaning, each turned its own way) and two sagging ropes at 0.85 and 0.45 m, lighter on top.', slots: { post: 'trunk', postTop: 'bank', rope: 'lip', ropeTop: 'propSnow' }, spacing: 2.6, tris: 63 },
  },
  // AP7g: event props placed by hand in the hole data (scenery.eventProps: [{ id, x, z, turn, scale }]: at the tee,
  // the side of the course, behind the green; core/eventProps.js checks the zones); the set lists which it offers
  // (`eventProps`). The artist's owner-approved spec docs/art/tee-props/SPEC.md; shapes in core/eventPropShapes.js.
  // Coloured from the biome's accents. Flat-shaded toon, fogged, double-sided, one instanced draw call per piece per
  // hole, drawn at the EVENT_PROP_SCALE tunable (default 1.3). No collider, no physics. tris = one copy (≤ 300, tested).
  eventProps: {
    featherFlag: { desc: 'A tall feather flag, 0.75 × 3.4 m: a banner with a rounded top on a thin white pole in a small stone base; body accent, a white stripe, the top cap subAccent. Still (no wind sway yet).', slots: { pole: 'propSnow', body: 'accent', top: 'subAccent', stripe: 'propSnow', base: 'rock' }, tris: 45 },
    popupTent: { desc: 'An open pop-up tent, 3 × 3 m, 3.2 m tall: 4 thin white legs, an accent pyramid roof and a subAccent valance on all four sides, no walls.', slots: { leg: 'propSnow', roof: 'accent', valance: 'subAccent' }, tris: 104 },
  },
});
