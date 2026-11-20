// ART1 Alpine, round 1: two palette options from the owner's mood board (Swiss Alps: warm bright grass
// in a cool world of blue peaks, dark pines and Swiss red). Mock-up data; the approved one becomes
// src/biomes/alpine-day.js. — Agent: artist
const base = {
  edge: '#3E8A3A', water: '#2A9AD8', waterDeep: '#1E6CB4', bank: '#8A8478', rock: '#9AA2AC', path: '#C9C6BE', lip: '#B8B29C',
  skyTop: '#1466D8', skyHorizon: '#BFE6FF', cloud: '#FFFFFF', fog: '#C9E4F6',
  sun: '#FFF6E8', ambient: '#E2EEFF', shadow: '#2E5E6A',
  backFar: '#7E9CC8', backNear: '#3E6A70', backCap: '#FFFFFF', backCapShade: '#BCD2EE', backTrees: '#24584A',
  pine: '#22684E', trunk: '#6E4A30', leaf: '#4E9A48', leafTop: '#6FB070', leafLow: '#123E36', leafAlt: '#1E5E5A', trunkAlt: '#E8E4DA',
  wood: '#6A4128', roof: '#7A7470', propSnow: '#FFFFFF', propA: '#F4F4F8', propB: '#4A62D8', glass: '#CFE6F5',
  accent: '#C8102E', subAccent: '#E0A82E',
};
export const PALETTES = {
  'alpine-warm': { ...base, id: 'alpine-warm', label: 'Alpine · A warm grass, cool world',
    tee: '#92D45A', fairwayA: '#90D256', fairwayB: '#80C44A', fringe: '#88CA52', greenA: '#C2EE78', greenB: '#B8EA6C',
    rough: '#56A040', deepRough: '#438A3A', sand: '#F2ECD6' },
  'alpine-fresh': { ...base, id: 'alpine-fresh', label: 'Alpine · B fresh and cooler',
    tee: '#82D266', fairwayA: '#80D062', fairwayB: '#70C256', fringe: '#78C85C', greenA: '#B4EE8C', greenB: '#A8EA80',
    rough: '#45A050', deepRough: '#358844', sand: '#F4F0E2', edge: '#358A44' },
};
