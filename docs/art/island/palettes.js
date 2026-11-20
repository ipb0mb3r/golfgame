// ART1 Island coast, round 1: two palette options from the owner's mood board (Honolulu: wild turquoise water,
// wild chartreuse grass, golden sand, dark lava rock, palms, bougainvillea, tropical orange). Mock-up data;
// the approved one becomes src/biomes/island-day.js. — Agent: artist
const base = {
  edge: '#3E9A2C', lip: '#C9A36A', bank: '#E8C88A', rock: '#3E3A40', path: '#EAD8B0',
  skyTop: '#1E90F0', skyHorizon: '#BFF2FF', cloud: '#E4F2F8', fog: '#C8F0FA',
  sun: '#FFF4DC', ambient: '#EEFAFF', shadow: '#2A7060',
  backFar: '#3E9C7A', backNear: '#2E8A50', backCap: '#6CC48A', backCapShade: '#4FA870', backTrees: '#2E9A44',
  pine: '#2A8A50', trunk: '#8E6A46', leaf: '#3CB848', leafTop: '#9CEC50', leafLow: '#1E7038', leafAlt: '#46D04E', trunkAlt: '#C49A68',
  wood: '#B88A5A', roof: '#7A5A3E', propSnow: '#FFFFFF', propA: '#E0309A', propB: '#FF9A2E', glass: '#BFEFF5',
  accent: '#FF8A2A', subAccent: '#E0309A',
};
export const PALETTES = {
  'island-wild': { ...base, id: 'island-wild', label: 'Island · A wild',
    tee: '#9ADC34', fairwayA: '#96DA30', fairwayB: '#86CC26', fringe: '#8ED42C', greenA: '#CCF870', greenB: '#C2F462',
    rough: '#4CB430', deepRough: '#379A2C', sand: '#FAE4B0', water: '#19D3D0', waterDeep: '#0A7FD0' },
  'island-wilder': { ...base, id: 'island-wilder', label: 'Island · B wilder',
    tee: '#A8E82C', fairwayA: '#A6E62A', fairwayB: '#94D820', fringe: '#9CDE24', greenA: '#D4FC70', greenB: '#CCFA62', edge: '#3EA02A',
    rough: '#3EC036', deepRough: '#2CA232', sand: '#FEEBB8', water: '#00E0D8', waterDeep: '#0090E8', leafAlt: '#3EE04A', leafTop: '#AEF84E' },
};
