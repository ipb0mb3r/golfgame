// AP3: the asset loader's proof set (dev only, DESIGN §8b "Model pieces"). The Meadow (day) look with ONE
// model piece: the tee markers are the AP2 test cube (assets/models/test-cube.glb, library testCubeMarkers).
// No hole uses it and no menu lists it: ?biome=test-models (e.g. ?hole=pl-01&biome=test-models).
// tools/session-check.mjs loads it, plays to the next hole (a cache hit), quits (freed) and checks the
// fallback when the file is missing. The palette is meadow-day's, so it passes every rule with no waiver.
export default {
  id: 'test-models',
  name: 'Test: model pieces (AP3)',
  description: 'Dev only (AP3): the Meadow look with the tee markers drawn from a model file (assets/models/test-cube.glb), to prove the asset loader. Never in a menu or on a hole: ?biome=test-models.',
  palette: {
    // surfaces
    tee: '#9ad45e', fairwayA: '#98d25a', fairwayB: '#88c44e', edge: '#4e8a30', fringe: '#93cc56', greenA: '#c8f07e', greenB: '#beec72',
    rough: '#5c9e3e', deepRough: '#4a8836', sand: '#f3e8ca', lip: '#c8ae7a', water: '#2c8ad8', waterDeep: '#1d62b8', bank: '#9a7a50',
    rock: '#a89b8c', path: '#e8d8ae',
    // sky, fog, light
    skyTop: '#1c76e2', skyHorizon: '#c9eaff', cloud: '#ffffff', fog: '#d2ecfa',
    sun: '#fff0d2', ambient: '#eaf4ff', shadow: '#356a40',
    // backdrop
    backFar: '#86aecb', backNear: '#5e9a4a', backCap: '#7db858', backCapShade: '#629e4a', backTrees: '#4a8a40',
    // accents: the flag (brick red, owner), the tee markers (buttercup yellow)
    accent: '#bc4749', subAccent: '#ffc21a',
    // trees and props (roof = the windmill caps, brick red like the flag; propA = buttercups, propB = red flowers)
    pine: '#3e7e4a', trunk: '#8a5634', leaf: '#56a040', leafTop: '#a8ca5b', leafLow: '#376643', leafAlt: '#3f7a52', trunkAlt: '#7a4e30',
    wood: '#c58a52', roof: '#bc4749', propSnow: '#f4ecd8', propA: '#ffd43a', propB: '#e8573e', glass: '#c4e2f2',
    // engine keys (temporary, DESIGN §8b): the putting grid (fill = greenA, lines a darker green), the far
    // ground (= deepRough), the pond surface (= water), the boulders (= rock)
    gridFill: '#c8f07e', gridLine: '#9ad65a', farGround: '#4a8836', pondSurface: '#2c8ad8', boulder: '#a89b8c',
  },
  textures: [],               // none yet (AP6): flat painted colours
  onTrees: ['roundTree'],     // later: the soft round tree + the tall conifer (AP7, ART_STYLE §6.3)
  offTrees: ['coneTree'],     // later: the cheap round treetop wall (AP7)
  rocks: ['roundBoulder'],
  sky: 'flatSky',             // later: the gradient sky with puffy clouds
  backdrop: 'roundHills',
  furniture: { flag: 'clothFlag', teeMarkers: 'testCubeMarkers' /* AP3: a model piece */, stakes: 'whiteStakes', pond: 'flatPond' },
  smallProps: { pieces: [] }, // later: grass tufts, buttercup patches, a few red flowers, bushes (AP7)
  bigProps: [],               // later: windmill, cow, wooden fence (AP7), placed by hand out of bounds
  notes: 'Dev only: not for real holes. Proves the asset loader (load, cache across a round, free, fallback when the file is missing).',
};
