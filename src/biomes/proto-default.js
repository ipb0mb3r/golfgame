// AP5 biome set: today's prototype holes' look (pl-01, pl-02, pl-03), moved into a set with no visual change (DESIGN §8b).
// Every colour below is the one the game drew before biome sets. Keys marked "not drawn yet" are not
// used by any of today's pieces: they hold the artist's Alpine values (ART_STYLE §4.5) as placeholders.
export default {
  id: 'proto-default',
  name: 'Prototype (today)',
  description: 'The prototype holes\' look: light blue sky, muted greens, blue tee markers, a red flag, cone pines and round trees.',
  palette: {
    // surfaces (the course painter)
    tee: '#76c052', fairwayA: '#70b646', fairwayB: '#65a93e', fringe: '#60ac42', greenA: '#7ece5c', greenB: '#75c455',
    rough: '#4a8c34', deepRough: '#3e782e', sand: '#e8d6a0', water: '#3a80c4', rock: '#928e84',
    edge: '#3f9a3e', lip: '#bfb79a', waterDeep: '#1474c9', bank: '#8c8070', path: '#dcd3be', // not drawn yet
    // sky, fog, light
    skyTop: '#9fd3ff', skyHorizon: '#9fd3ff', cloud: '#ffffff', fog: '#9fd3ff',
    sun: '#fff3dd', ambient: '#dff2ff', shadow: '#3a5a2a',
    // backdrop
    backNear: '#4f8a45',
    backFar: '#6f96d2', backCap: '#ffffff', backCapShade: '#c6daf4', backTrees: '#25784e', // not drawn yet
    // accents: the flag, the tee markers (pl-01's; see the AP5 PR question about pl-02 / pl-03)
    accent: '#ff3b3b', subAccent: '#2b6cff',
    // trees and props
    pine: '#2f6b34', trunk: '#6b4a2b', leaf: '#6fab6d',
    leafTop: '#5fc56e', leafLow: '#145e44', leafAlt: '#1e9c86', trunkAlt: '#8a5a38', wood: '#be7440', roof: '#c9483a', // not drawn yet
    propSnow: '#ffffff', propA: '#ff6fa0', propB: '#ffe04a', glass: '#cbe9ff', // not drawn yet
    // engine keys (today's pieces): the putting grid, the far ground plane, the pond surface, the boulders
    gridFill: '#7ccc5a', gridLine: '#5ca846', farGround: '#3d7a30', pondSurface: '#3f8fd8', boulder: '#8d8a82',
  },
  textures: [],               // none yet (AP6): flat painted colours
  onTrees: ['roundTree'],
  offTrees: ['coneTree'],
  rocks: ['roundBoulder'],
  sky: 'flatSky',
  backdrop: 'roundHills',
  furniture: { flag: 'clothFlag', teeMarkers: 'ballMarkers', stakes: 'whiteStakes', pond: 'flatPond' },
  smallProps: { pieces: [] }, // none yet
  bigProps: [],               // none yet
  notes: 'The test and practice holes: flat or gently rolling, a pond, a few trees and rocks in play. Suggested weather: any.',
  // Today's look must not change in AP5, and it misses these rules (ART_STYLE §4.4). Waived by name until
  // the artist's pass (ART1) replaces this set; a new set must pass every rule.
  readabilityWaivers: {
    'green/fairway': 'today\'s green is only ΔE 9 from the fairway (needs 10)',
    'accent/warn': 'today\'s flag is almost the HUD warning red (ΔE 6, needs 15)',
  },
};
