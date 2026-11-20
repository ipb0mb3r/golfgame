// AP5 biome set: Meadow (day), the proof that a new look needs only a data file (DESIGN §8b).
// Built from today's library pieces only, with the artist's round-2 Meadow palette (ART_STYLE §4.5,
// docs/art/style-r2/palettes.js). It passes every readability rule with no waiver. Not used by any
// hole and not in any menu: try it on any hole with the dev link ?biome=meadow-day.
// The five engine keys (temporary, DESIGN §8b) are the dev's picks from the Meadow palette.
export default {
  id: 'meadow-day',
  name: 'Meadow (day)',
  description: 'A sunny wildflower meadow: bright greens, a pale sky, a poppy pink-red flag and marigold tee markers, round trees in play and pines around.',
  palette: {
    // surfaces
    tee: '#8de05a', fairwayA: '#88da4e', fairwayB: '#79cc42', edge: '#4e9f2e', fringe: '#7dd04a', greenA: '#b6f57c', greenB: '#aaf06c',
    rough: '#4caa36', deepRough: '#3a942e', sand: '#fff0c2', lip: '#c9b27a', water: '#2c8fe3', waterDeep: '#1c66c2', bank: '#9c7a4e',
    rock: '#a89b8e', path: '#e9d9ae',
    // sky, fog, light
    skyTop: '#1877e8', skyHorizon: '#bdeaff', cloud: '#ffffff', fog: '#cbebff',
    sun: '#fff4da', ambient: '#e8f5ff', shadow: '#2f7a4a',
    // backdrop
    backFar: '#7fb0d6', backNear: '#58a85a', backCap: '#8cc96a', backCapShade: '#6db458', backTrees: '#3e9a44',
    // accents: the flag (poppy), the tee markers (marigold)
    accent: '#d91e5b', subAccent: '#ff9a1f',
    // trees and props
    pine: '#23885a', trunk: '#8a5634', leaf: '#3db04a', leafTop: '#8ee05c', leafLow: '#24803c', leafAlt: '#69c83a', trunkAlt: '#a87a4e',
    wood: '#d08b4c', roof: '#e0533e', propSnow: '#ffffff', propA: '#ff5c8e', propB: '#ffd83a', glass: '#bfe6ff',
    // engine keys (temporary): the putting grid (fill = greenA, lines a darker green), the far ground
    // (= deepRough), the pond surface (= water), the boulders (= rock)
    gridFill: '#b6f57c', gridLine: '#84cc52', farGround: '#3a942e', pondSurface: '#2c8fe3', boulder: '#a89b8e',
  },
  textures: [],               // none yet (AP6): flat painted colours
  onTrees: ['roundTree'],
  offTrees: ['coneTree'],
  rocks: ['roundBoulder'],
  sky: 'flatSky',
  backdrop: 'roundHills',
  furniture: { flag: 'clothFlag', teeMarkers: 'ballMarkers', stakes: 'whiteStakes', pond: 'flatPond' },
  smallProps: { pieces: [] }, // none yet (grass tufts, flowers: ART1 / AP7)
  bigProps: [],               // none yet
  notes: 'Gentle, open holes: wide fairways, a few round trees in play, ponds and flower-edged bunkers. Suggested weather: clear, light to medium wind.',
};
