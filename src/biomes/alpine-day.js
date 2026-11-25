// ART1 biome set: Alpine (day), Swiss Alps (owner-approved 2026-11-20). From the owner's mood board
// (docs/art/alpine/): warm bright grass in a cool world, prominent stylised horn peaks (invented, Matterhorn-like),
// mainly pines, Swiss chalets and wooden hay huts out of bounds, Swiss red accents.
// Palette: option A "warm grass, cool world" (owner), lighter azure sky from his photos (owner), Swiss-red flag,
// alpine-gold tee markers (owner). Source: docs/art/alpine/palettes.js. Until the new pieces exist (AP7 models,
// the horn-peaks backdrop, AP6 ground, gradient sky) it uses today's library pieces; see ART_STYLE §6.4.
// — Agent: artist
export default {
  id: 'alpine-day',
  name: 'Alpine (day)',
  description: 'Swiss Alps in summer: warm, bright grass under a light azure sky, big snowy horn peaks, dark pines and spruces, a Swiss-red flag and alpine-gold tee markers; chalets and hay huts out of bounds.',
  palette: {
    // surfaces
    tee: '#92d45a', fairwayA: '#90d256', fairwayB: '#80c44a', edge: '#3e8a3a', fringe: '#88ca52', greenA: '#c2ee78', greenB: '#b8ea6c',
    rough: '#56a040', deepRough: '#438a3a', sand: '#f2ecd6', lip: '#b8b29c', water: '#2a9ad8', waterDeep: '#1e6cb4', bank: '#8a8478',
    rock: '#9aa2ac', path: '#c9c6be',
    // deep rough (S24, the in-play surface 'deepRough'; not `deepRough` above, which is the ground beyond OB):
    // the owner's tint (2026-11-25), halfway between the rough and the ground beyond OB: a soft step toward OB
    roughDeep: '#4d953d',
    // sky, fog, light (owner: a lighter azure)
    skyTop: '#5cb4f2', skyHorizon: '#b4e4fc', cloud: '#e4eef8', fog: '#bee6fa',
    sun: '#fff6e8', ambient: '#e2eeff', shadow: '#2e5e6a',
    // backdrop: blue-grey peaks with white snow, dark forested slopes, dark pine wall
    backFar: '#7e9cc8', backNear: '#3e6a70', backCap: '#ffffff', backCapShade: '#bcd2ee', backTrees: '#24584a',
    // accents: the flag (Swiss red, owner), the tee markers (alpine gold, owner)
    accent: '#c8102e', subAccent: '#e0a82e',
    // trees and props (wood = dark chalet wood, roof = grey shingles, trunkAlt = birch bark,
    // propA / propB = white and blue wildflowers; the chalet shutters and geraniums use the accent)
    pine: '#22684e', trunk: '#6e4a30', leaf: '#4e9a48', leafTop: '#6fb070', leafLow: '#123e36', leafAlt: '#1e5e5a', trunkAlt: '#e8e4da',
    wood: '#6a4128', roof: '#7a7470', propSnow: '#ffffff', propA: '#f4f4f8', propB: '#4a62d8', glass: '#cfe6f5',
    // engine keys (temporary, DESIGN §8b): the putting grid (fill = greenA, lines a darker green), the far
    // ground (= deepRough), the pond surface (= water), the boulders (= rock)
    gridFill: '#c2ee78', gridLine: '#96d25e', farGround: '#438a3a', pondSurface: '#2a9ad8', boulder: '#9aa2ac',
  },
  textures: [],               // none yet (AP6): flat painted colours
  onTrees: ['pineTree', 'spruceTree', 'birchTree'], // soft pines, teal spruces (leafAlt) and a few birches (AP7a)
  offTrees: ['spruceTree', 'pineTree'], // spruce and pine forest; no birches off course (triangle budget)
  rocks: ['roundBoulder'],
  sky: 'gradientSky', // the gradient sky (AP6a)
  backdrop: 'hornPeaks',  // the wide stylised horn peaks + forested slopes (AP6a, from docs/art/alpine/)
  furniture: { flag: 'clothFlag', teeMarkers: 'ballMarkers', stakes: 'whiteStakes', pond: 'flatPond' },
  // small props (docs/art/small-props/SPEC.md §4, at about half the spec's density: since AP7d they are drawn 2× size)
  // tufts, white (propA) and blue (propB) wildflowers, more stones than Meadow, plain green bushes beyond OB, reeds by the water
  smallProps: {
    pieces: [
      { id: 'grassTuft', perHa: 300, cluster: { count: [1, 3], radius: 2 }, on: ['rough', 'ob'] },
      { id: 'flowerPatch', perHa: 50, cluster: { count: [3, 5], radius: 3 }, on: ['rough', 'ob'] },                               // white
      { id: 'flowerPatch', slots: { petal: 'propB' }, perHa: 30, cluster: { count: [2, 4], radius: 3 }, on: ['rough', 'ob'] },  // blue
      { id: 'pebbles', perHa: 35, cluster: { count: [1, 3], radius: 1.5 }, on: ['rough', 'ob'] },
      { id: 'flatStone', perHa: 15, cluster: { count: [1, 2], radius: 1.5 }, on: ['rough', 'ob'] },
      { id: 'flowerBush', slots: { flower: 'leafTop' }, perHa: 10, cluster: { count: [1, 2], radius: 4 }, on: ['ob'] },  // plain green
      { id: 'reeds', perTenM: 1.5, cluster: { count: [2, 3], radius: 1.2 }, on: ['waterEdge'] },
    ],
  },
  bigProps: ['chalet', 'chaletTall'], // the classic and the tall chalet (docs/art/big-props/SPEC.md); placed by hand beyond OB. Later: hay hut
  fences: ['railFence'],      // post & two rails in dark chalet wood (docs/art/fence/SPEC.md); look only
  // not a tournament set (owner 2026-11-24): no flags or tents, only the park bench by the tee (docs/art/bench/SPEC.md)
  eventProps: ['parkBench'],
  // owner pick 2026-11-25: deep rough sits halfway between the rough and the ground beyond OB, closer than the rules ask;
  // the denser deep-rough grass texture (S24) and the lie readout tell it apart
  readabilityWaivers: {
    'roughDeep/rough': 'owner pick 2026-11-25: deep rough is halfway between the rough and the ground beyond OB, a soft step (the denser texture tells it apart)',
    'roughDeep/ob': 'owner pick 2026-11-25: deep rough is halfway between the rough and the ground beyond OB, a soft step (the denser texture tells it apart)',
  },
  notes: 'Swiss Alps: rolling, elevated holes with raised tees and greens, creeks and small ponds, pines along the fairways, the big peaks always in view. Big props out of bounds: chalets on the slopes, hay huts dotted near the holes, never in play. Suggested weather: clear, light wind.',
};
