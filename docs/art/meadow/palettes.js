// ART1 Meadow, round 1: two palette options from the owner's mood board (warm yellow-greens, not neon,
// buttercup yellow, cream, brick red). Mock-up data; the approved one becomes src/biomes/meadow-day.js.
// — Agent: artist
const base = {
  edge: '#4E8A30', fringe: '#93CC56', water: '#2C8AD8', waterDeep: '#1D62B8', bank: '#9A7A50', rock: '#A89B8C', path: '#E8D8AE',
  skyTop: '#1C76E2', skyHorizon: '#C9EAFF', cloud: '#FFFFFF', fog: '#D2ECFA',
  sun: '#FFF0D2', ambient: '#EAF4FF', shadow: '#356A40',
  backFar: '#86AECB', backNear: '#5E9A4A', backCap: '#7DB858', backCapShade: '#629E4A', backTrees: '#4A8A40',
  pine: '#3E7E4A', trunk: '#8A5634', leaf: '#56A040', leafTop: '#A8CA5B', leafLow: '#376643', leafAlt: '#3F7A52', trunkAlt: '#7A4E30',
  wood: '#C58A52', roof: '#BC4749', propSnow: '#F4ECD8', propA: '#FFD43A', propB: '#E8573E', glass: '#C4E2F2',
  subAccent: '#FFC21A',
};
export const PALETTES = {
  'meadow-warm': { ...base, id: 'meadow-warm', label: 'Meadow · warm',
    tee: '#9AD45E', fairwayA: '#98D25A', fairwayB: '#88C44E', greenA: '#C8F07E', greenB: '#BEEC72',
    rough: '#5C9E3E', deepRough: '#4A8836', sand: '#F3E8CA', lip: '#C8AE7A', accent: '#BC4749' },
  'meadow-warmer': { ...base, id: 'meadow-warmer', label: 'Meadow · warmer',
    tee: '#A6D45A', fairwayA: '#A4D256', fairwayB: '#94C44A', greenA: '#D2F07C', greenB: '#C8EC6E',
    rough: '#6A9C3A', deepRough: '#568832', sand: '#F5E6C4', lip: '#CAAA74', accent: '#BC4749',
    sun: '#FFE8BE', fog: '#DCEEF6', leaf: '#62A23C', backNear: '#6A9A46', backTrees: '#558A3C' },
};
