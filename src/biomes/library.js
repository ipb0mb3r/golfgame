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
export const LIBRARY = Object.freeze({
  // Course textures: the same greyscale textures in every biome, recoloured by the palette. None exist
  // yet (AP6): with none picked, the course is painted in flat palette colours, as today.
  textures: {},
  // Trees in play: the look only. Their collisions (trunk, canopy) stay in the hole's `obstacles`.
  onTrees: {
    roundTree: { desc: 'Cylinder trunk + a round faceted canopy (icosahedron), each tree its own shade of the canopy colour (the trees in play since Phase K).', slots: { canopy: 'leaf', trunk: 'trunk' }, shade: { slot: 'canopy', mode: 'around', h: 0.06, l: 0.08 }, tris: 360 },
  },
  // Scenery trees outside OB (never in play)
  offTrees: {
    coneTree: { desc: 'Thin cylinder trunk + one 7-sided cone (the scenery forest since Phase 0), a shade per tree (drawn darker than the pine key).', slots: { canopy: 'pine', trunk: 'trunk' }, shade: { slot: 'canopy', mode: 'multiply', h: [0.3, 0.06], s: 0.45, l: [0.25, 0.1] }, tris: 38 },
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
    hazeHills: { desc: 'The stronger far-hill tint: a near ring of soft round hills in backNear and a far ring in backFar, each mixed toward the fog by distance (10 % / 22 %), their bases fading further into the haze.', slots: { near: 'backNear', far: 'backFar', fog: 'fog' }, tris: 1600 },
    hornPeaks: { desc: 'Alpine: a WIDE hero horn and 6 smaller horns (faceted toon rock in backFar, snow in backCap above the snow line and on flat faces), a low snowy far ridge (backFar / backCap / backCapShade) and a full ring of dark forested slopes in front (backNear).', slots: { rock: 'backFar', slopes: 'backNear', snow: 'backCap', snowShade: 'backCapShade', fog: 'fog' }, tris: 1650 },
    // seaSide: where the sea is when the hole doesn't say (hole scenery.seaSide overrides it)
    ocean: { desc: 'Island coast: a deep sea (waterDeep) to the horizon on the sea side(s), a mid and a shallow shore band (water), a sand beach with lava rock patches beyond OB (drawn only: physics never changes), a green volcanic ridge with soft tops (backFar) and a low far island (backNear).', slots: { shallow: 'water', deep: 'waterDeep', sand: 'sand', rock: 'rock', ridge: 'backFar', island: 'backNear', fog: 'fog' }, seaSide: 'left+far', tris: 330 },
  },
  // The course's own small things, one of each kind per set (flag, tee markers, OB stakes, pond surface)
  furniture: {
    clothFlag: { desc: 'A waving cloth on a white pole (the pole is fixed white: it is gameplay).', slots: { cloth: 'accent' }, tris: 96 },
    ballMarkers: { desc: 'Two balls either side of the tee.', slots: { marker: 'subAccent' }, tris: 160 },
    // AP3: the loader's proof piece (dev only: picked by the test-models set, ?biome=test-models). A model
    // piece names its .glb (`model`) and the procedural piece drawn when the file can't load (`fallback`).
    testCubeMarkers: { desc: 'AP3 test: two cubes from a model file either side of the tee (the AP2 test cube).', slots: { marker: 'subAccent' }, model: 'assets/models/test-cube.glb', fallback: 'ballMarkers', tris: 24 },
    whiteStakes: { desc: 'White out-of-bounds stakes (fixed white: the golf rule colour).', slots: {}, tris: 24 },
    flatPond: { desc: 'A flat, slightly see-through water surface over a pond in a bowl (holes with scenery.water).', slots: { surface: 'pondSurface' }, tris: 48 },
  },
  // Scattered by the set's rule (smallProps). None yet (ART1 / AP7).
  smallProps: {},
  // Placed by hand in the hole data; the set lists which are available. None yet (ART1 / AP7).
  bigProps: {},
});
