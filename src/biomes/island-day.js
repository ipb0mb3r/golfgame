// ART1 biome set: Island coast (day), the Honolulu vibe (owner-approved 2026-11-20). From the owner's mood board
// (docs/art/island/): not Caribbean, not US east/west coast; wild turquoise water and wild lime grass, golden sand,
// dark lava rock, the course following the ocean, palms (a few really tall ones), monkeypod trees, bougainvillea,
// a green volcanic ridge and far resort towers. No lighthouse (owner: kept for a future Cape Cod-like set).
// Palette: option B "wilder" (owner), tropical-orange flag, bougainvillea-magenta tee markers.
// Source: docs/art/island/palettes.js. Until the new pieces exist it uses today's library pieces; see ART_STYLE §6.5.
// — Agent: artist
export default {
  id: 'island-day',
  name: 'Island coast (day)',
  description: 'A Honolulu-style coast: wild lime grass, electric turquoise shallows and deep blue sea, golden sand and dark lava rock, palms and monkeypod trees, a tropical-orange flag and magenta tee markers; a green volcanic ridge and resort towers far across the bay.',
  palette: {
    // surfaces (sand is golden, rock is dark lava)
    tee: '#a8e82c', fairwayA: '#a6e62a', fairwayB: '#94d820', edge: '#3ea02a', fringe: '#9cde24', greenA: '#d4fc70', greenB: '#ccfa62',
    rough: '#3ec036', deepRough: '#2ca232', sand: '#feebb8', lip: '#c9a36a', water: '#00e0d8', waterDeep: '#0090e8', bank: '#e8c88a',
    rock: '#3e3a40', path: '#ead8b0',
    // deep rough (S24, the in-play surface 'deepRough'; not `deepRough` above, which is the ground beyond OB):
    // the owner's tint (2026-11-25), halfway between the rough and the ground beyond OB: a soft step toward OB
    roughDeep: '#35b134',
    // sky, fog, light
    skyTop: '#1e90f0', skyHorizon: '#bff2ff', cloud: '#e4f2f8', fog: '#c8f0fa',
    sun: '#fff4dc', ambient: '#eefaff', shadow: '#2a7060',
    // backdrop: the green volcanic ridge, the tree wall
    backFar: '#3e9c7a', backNear: '#2e8a50', backCap: '#6cc48a', backCapShade: '#4fa870', backTrees: '#2e9a44',
    // accents: the flag (tropical orange), the tee markers (bougainvillea magenta)
    accent: '#ff8a2a', subAccent: '#e0309a',
    // trees and props (leafAlt = palm fronds, trunkAlt = palm trunk; propA = bougainvillea, propB = orange flowers)
    pine: '#2a8a50', trunk: '#8e6a46', leaf: '#3cb848', leafTop: '#aef84e', leafLow: '#1e7038', leafAlt: '#3ee04a', trunkAlt: '#c49a68',
    wood: '#b88a5a', roof: '#7a5a3e', propSnow: '#ffffff', propA: '#e0309a', propB: '#ff9a2e', glass: '#bfeff5',
    // engine keys (temporary, DESIGN §8b): the putting grid (fill = greenA, lines a darker green), the far
    // ground (= deepRough), the pond surface (= water), the boulders (= dark lava, like `rock`)
    gridFill: '#d4fc70', gridLine: '#a8e244', farGround: '#2ca232', pondSurface: '#00e0d8', boulder: '#3e3a40',
  },
  textures: [],               // none yet (AP6): flat painted colours
  onTrees: ['palmTree', 'roundCanopy'], // palms (AP7b dome crown) and round trees in play; real Island holes give palms flat colliders (canopyH / 2R ≤ 0.8)
  offTrees: ['palmTree', 'roundCanopy'], // palms (leafAlt fronds) and round trees as scenery (AP7a)
  rocks: ['roundBoulder'],    // dark lava boulders
  sky: 'gradientSky', // the gradient sky (AP6a)
  backdrop: 'ocean',    // the sea along the course (left + far), beach, lava, volcanic ridge, far island (AP6a)
  furniture: { flag: 'clothFlag', teeMarkers: 'ballMarkers', stakes: 'whiteStakes', pond: 'flatPond' },
  // small props (docs/art/small-props/SPEC.md §4, at about half the spec's density: since AP7d they are drawn 2× size)
  // tufts, bougainvillea pink (propA) and orange (propB) flowers, a few dark lava stones, pink-flowering bushes beyond OB, reeds by the water
  smallProps: {
    pieces: [
      { id: 'grassTuft', perHa: 300, cluster: { count: [1, 3], radius: 2 }, on: ['rough', 'ob'] },
      { id: 'flowerPatch', perHa: 45, cluster: { count: [3, 5], radius: 3 }, on: ['rough', 'ob'] },                               // pink
      { id: 'flowerPatch', slots: { petal: 'propB' }, perHa: 30, cluster: { count: [2, 4], radius: 3 }, on: ['rough', 'ob'] },  // orange
      { id: 'pebbles', perHa: 20, cluster: { count: [1, 2], radius: 1.5 }, on: ['rough'] },
      { id: 'flatStone', perHa: 5, on: ['rough'] },
      { id: 'flowerBush', perHa: 20, cluster: { count: [1, 3], radius: 4 }, on: ['ob'] },                                 // pink bougainvillea
      { id: 'reeds', perTenM: 1.5, cluster: { count: [2, 3], radius: 1.2 }, on: ['waterEdge'] },
    ],
  },
  bigProps: ['beachHut'],     // the thatched stilt hut (docs/art/big-props/SPEC.md); placed by hand beyond OB. Later: very tall palm
  fences: ['ropeFence'],      // driftwood posts and two ropes (docs/art/fence/SPEC.md); look only
  // a "tournament" set (owner 2026-11-24): flags with swapped colours (magenta body, orange top) and tents
  eventProps: [{ id: 'featherFlag', slots: { body: 'subAccent', top: 'accent' } }, 'popupTent', 'parkBench'], // + the park bench by the tee (docs/art/bench/SPEC.md)
  // owner pick 2026-11-25: deep rough sits halfway between the rough and the ground beyond OB, closer than the rules ask;
  // the denser deep-rough grass texture (S24) and the lie readout tell it apart
  readabilityWaivers: {
    'roughDeep/rough': 'owner pick 2026-11-25: deep rough is halfway between the rough and the ground beyond OB, a soft step (the denser texture tells it apart)',
    'roughDeep/ob': 'owner pick 2026-11-25: deep rough is halfway between the rough and the ground beyond OB, a soft step (the denser texture tells it apart)',
  },
  notes: 'The course follows the ocean: run fairways along the beach, the sea on one side (often the left), waste bunkers and lava-rock edges, a few really tall palms as landmarks. Low, near sea level. No lighthouse. Suggested weather: sunny, sea wind.',
};
