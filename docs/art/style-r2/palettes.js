// ART0b round 2: direction B "Sunny postcard" palettes for the first biome sets (proposal until the owner approves).
// Same keys as round 1 (docs/ART_STYLE.md §4.1) plus: edge (fairway edge line), lip (bunker rim), bank (water bank),
// leafTop/leafLow (tree light/dark ends), backTrees (the wall of treetops at the back),
// accent/subAccent (the biome's signature: flag, tee markers, flower beds, trims, signs; owner, 2026-11-19). One palette per biome set:
// Alpine sunset is its own set with its own full palette (owner, #73). Mock-up data only, not engine code.
// — Agent: artist
const meadow = {
  id: 'meadow', label: 'Meadow',
  accent: '#D91E5B', subAccent: '#FF9A1F', // poppy pink-red flag / marigold orange: wildflower field
  tee: '#8DE05A', fairwayA: '#88DA4E', fairwayB: '#79CC42', edge: '#4E9F2E', fringe: '#7DD04A', greenA: '#B6F57C', greenB: '#AAF06C',
  rough: '#4CAA36', deepRough: '#3A942E', sand: '#FFF0C2', lip: '#C9B27A', water: '#2C8FE3', waterDeep: '#1C66C2', bank: '#9C7A4E',
  rock: '#A89B8E', path: '#E9D9AE',
  skyTop: '#1877E8', skyHorizon: '#BDEAFF', cloud: '#FFFFFF', fog: '#CBEBFF',
  sun: '#FFF4DA', ambient: '#E8F5FF', shadow: '#2F7A4A',
  backFar: '#7FB0D6', backNear: '#58A85A', backCap: '#8CC96A', backCapShade: '#6DB458', backTrees: '#3E9A44',
  pine: '#23885A', trunk: '#8A5634', leaf: '#3DB04A', leafTop: '#8EE05C', leafLow: '#24803C', leafAlt: '#69C83A', trunkAlt: '#A87A4E',
  wood: '#D08B4C', roof: '#E0533E', propSnow: '#FFFFFF', propA: '#FF5C8E', propB: '#FFD83A', glass: '#BFE6FF',
};
const alpine = {
  id: 'alpine', label: 'Alpine',
  accent: '#B8143C', subAccent: '#3550D8', // deep mountain red flag (darker than the HUD warning red) / gentian blue: red roofs, mountain flowers
  tee: '#86DD6C', fairwayA: '#80D964', fairwayB: '#70CB57', edge: '#3F9A3E', fringe: '#76D05E', greenA: '#B2F590', greenB: '#A6EF82',
  rough: '#3FA64E', deepRough: '#2F8C46', sand: '#FAF3DC', lip: '#BFB79A', water: '#1FA2EA', waterDeep: '#1474C9', bank: '#8C8070',
  rock: '#A4ABB6', path: '#DCD3BE',
  skyTop: '#156BE0', skyHorizon: '#C8EEFF', cloud: '#FFFFFF', fog: '#D0EDFF',
  sun: '#FFF6E6', ambient: '#E4F2FF', shadow: '#2C6A6A',
  backFar: '#6F96D2', backNear: '#4E7FBE', backCap: '#FFFFFF', backCapShade: '#C6DAF4', backTrees: '#25784E',
  pine: '#1F8457', trunk: '#7A4C2E', leaf: '#2FA052', leafTop: '#5FC56E', leafLow: '#145E44', leafAlt: '#1E9C86', trunkAlt: '#8A5A38',
  wood: '#BE7440', roof: '#C9483A', propSnow: '#FFFFFF', propA: '#FF6FA0', propB: '#FFE04A', glass: '#CBE9FF',
};
// Alpine sunset: its own biome set. Values started from Alpine, then every one re-chosen for golden hour.
const alpineSunset = {
  id: 'alpine-sunset', label: 'Alpine sunset',
  accent: '#B0207E', subAccent: '#FFB21E', // magenta flag, reads on the orange sky / golden: golden hour
  tee: '#7ED668', fairwayA: '#7AD25E', fairwayB: '#6AC452', edge: '#3E8A44', fringe: '#70CA58', greenA: '#ACEE84', greenB: '#A0E878',
  rough: '#3C9650', deepRough: '#2E7C48', sand: '#FFE6C4', lip: '#C2A48C', water: '#4A86E0', waterDeep: '#3A5CB8', bank: '#8E6A58',
  rock: '#B49CA4', path: '#E6C9B0',
  skyTop: '#3A4FB6', skyHorizon: '#FFB26E', cloud: '#FFD8BC', fog: '#FFC79E',
  sun: '#FFC48A', ambient: '#E8D4E8', shadow: '#4E4A8E',
  backFar: '#8C74B4', backNear: '#6E5EA6', backCap: '#FFC9B4', backCapShade: '#C79CC4', backTrees: '#3D5E52',
  pine: '#2E7650', trunk: '#7A4630', leaf: '#4A9248', leafTop: '#A9C860', leafLow: '#2A5444', leafAlt: '#3E8A70', trunkAlt: '#8A5638',
  wood: '#C77A44', roof: '#B8453E', propSnow: '#FFE6D8', propA: '#FF7C9A', propB: '#FFD45A', glass: '#FFD6A0',
};
const island = {
  id: 'island', label: 'Island coast',
  accent: '#FF2E8A', subAccent: '#FF7A1A', // hibiscus pink flag / mango orange: tropical flowers and fruit
  tee: '#90E85C', fairwayA: '#8CE652', fairwayB: '#7CD846', edge: '#3FA036', fringe: '#82DC4C', greenA: '#BCFA86', greenB: '#B0F676',
  rough: '#40B43E', deepRough: '#319C3A', sand: '#FFF5D8', lip: '#D6C496', water: '#18C6E2', waterDeep: '#0B8ED2', bank: '#F2E2B4',
  rock: '#5E5866', path: '#EEDDB4',
  skyTop: '#0C82F0', skyHorizon: '#C6F4FF', cloud: '#FFFFFF', fog: '#CCF2FF',
  sun: '#FFF8E4', ambient: '#EEFAFF', shadow: '#2A7A70',
  backFar: '#4E9E86', backNear: '#3E9A5E', backCap: '#7ECB92', backCapShade: '#5EB07C', backTrees: '#2E9446',
  pine: '#2A8A50', trunk: '#8E6A46', leaf: '#3CB648', leafTop: '#8CE45A', leafLow: '#1F7E3E', leafAlt: '#3ECB52', trunkAlt: '#C49A68',
  wood: '#D2A262', roof: '#E8C068', propSnow: '#FFFFFF', propA: '#FF5E94', propB: '#FFD02E', glass: '#CFF4FA',
};
export const PALETTES = { meadow, alpine, 'alpine-sunset': alpineSunset, island };
