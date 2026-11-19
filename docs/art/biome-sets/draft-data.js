// ART0 round 1 DRAFT: biome-set data as the artist imagines it. Not the AP5 format (the dev designs that);
// this file only drives the mock-up pages in docs/art/biome-sets/. Plain data, no engine code.
// — Agent: artist

// ---------- 1. Shared library: every piece lives here once, biomes pick pieces by id ----------
export const LIBRARY = {
  // Course textures: ONE greyscale texture per surface, the same in every biome. The palette colours it.
  textures: ['tee', 'fairway', 'fringe', 'green', 'rough', 'deepRough', 'sand', 'water', 'rock', 'path'],
  // Recolourable models. Slots name which palette keys colour which part.
  onTrees: {
    pine:   { tris: 120, parts: { canopy: 'pine', trunk: 'trunk' } },
    aspen:  { tris: 160, parts: { canopy: 'leafAlt', trunk: 'trunkAlt' } },
    round:  { tris: 180, parts: { canopy: 'leaf', trunk: 'trunk' } },
    palm:   { tris: 220, parts: { canopy: 'leafAlt', trunk: 'trunkAlt' } },
    tallPine: { tris: 140, parts: { canopy: 'pine', trunk: 'trunk' } },
  },
  offTrees: {
    pineFar:  { tris: 24, parts: { canopy: 'pine', trunk: 'trunk' } },
    blobFar:  { tris: 30, parts: { canopy: 'leaf', trunk: 'trunk' } },
    aspenFar: { tris: 30, parts: { canopy: 'leafAlt', trunk: 'trunkAlt' } },
    palmFar:  { tris: 40, parts: { canopy: 'leafAlt', trunk: 'trunkAlt' } },
  },
  sky: { gradient: { parts: ['skyTop', 'skyHorizon', 'cloud'] } },
  smallProps: ['grassTuft', 'flowers', 'fence', 'stones', 'flowerBed', 'shell', 'cactusSmall'],
  bigProps: ['logLodge', 'cityBlocks', 'windmill', 'lighthouse', 'beachHut', 'mesaRock', 'skyline'],
  backdrops: ['peaksSnow', 'ridgesWarm', 'hillsRound', 'seaHorizon', 'canyonWalls', 'cityEdge'],
};

// ---------- 2. Palettes (hex). Time of day = another palette. ----------
// Keys: surfaces · sky · fog · light · backdrop · trees · props. Same keys in every palette.
const alpineDay = {
  id: 'alpine-day', label: 'Alpine · day',
  // surfaces
  tee: '#9ADB82', fairwayA: '#86D27A', fairwayB: '#79C46F', fringe: '#8CCB76', greenA: '#B4EA98', greenB: '#A6DE8A',
  rough: '#579E57', deepRough: '#3F7F4A', sand: '#F3EBD3', water: '#3E9EE0', waterDeep: '#2C7FC4',
  rock: '#A7AEB7', path: '#CFC9BD',
  // sky, fog, light
  skyTop: '#5DAEEE', skyHorizon: '#DDF1FF', cloud: '#FFFFFF', fog: '#D3EAF7',
  sun: '#FFF7EA', ambient: '#E2F0FF', shadow: '#55708A',
  // backdrop (recolours the far asset)
  backFar: '#A7BFDB', backNear: '#7F9CC0', backCap: '#FFFFFF', backCapShade: '#D7E5F4',
  // trees
  pine: '#2E7A5E', trunk: '#7A5236', leaf: '#4E9A55', leafAlt: '#E8C34A', trunkAlt: '#EEE8DC',
  // props
  wood: '#B0703F', roof: '#6E4B3B', propSnow: '#FFFFFF', propA: '#E86A5A', propB: '#F6E7A8', glass: '#BFD8EE',
};
// Its own full palette (owner, #73: time of day = its own biome set). The spread only copies the day values
// once, as a starting point for authoring; there is no "variant of" link.
const alpineSunset = {
  ...alpineDay, id: 'alpine-sunset', label: 'Alpine sunset',
  tee: '#A9C978', fairwayA: '#A1C56E', fairwayB: '#92B763', fringe: '#9ABA6C', greenA: '#C6DC8A', greenB: '#B6CE7C',
  rough: '#6B8E56', deepRough: '#4F6E4C', sand: '#F7D9B4', water: '#5F86CC', waterDeep: '#4A6AB0',
  rock: '#B49C9E', path: '#D8BFA8',
  skyTop: '#4A5AA6', skyHorizon: '#FFB27A', cloud: '#FFD2B8', fog: '#F2B999',
  sun: '#FFB07A', ambient: '#FFD8C6', shadow: '#5E4A7C',
  backFar: '#9D87BA', backNear: '#7A699F', backCap: '#FFD8C0', backCapShade: '#C9A6C6',
  pine: '#3D6A58', trunk: '#7A4E3A', wood: '#B8673E', roof: '#5E3E3E', propSnow: '#FFE2D2', glass: '#FFC98A',
};
const rockiesDay = {
  id: 'rockies-day', label: 'Ridge country · day',
  tee: '#A7D96E', fairwayA: '#9AD35C', fairwayB: '#8BC34F', fringe: '#97C860', greenA: '#BDE580', greenB: '#AFD972',
  rough: '#6E9E44', deepRough: '#58823A', sand: '#F1D49A', water: '#3A9CCB', waterDeep: '#2B7EAD',
  rock: '#C98A62', path: '#D7C2A0',
  skyTop: '#4FA2E4', skyHorizon: '#F5E8CF', cloud: '#FFFFFF', fog: '#EDE0C8',
  sun: '#FFF0D6', ambient: '#FFF1DE', shadow: '#6F5A4A',
  backFar: '#C6A68E', backNear: '#A2725A', backCap: '#F6EEE6', backCapShade: '#DCCBC0',
  pine: '#3C7A47', trunk: '#80563A', leaf: '#5E9A47', leafAlt: '#F2C64C', trunkAlt: '#F0EADF',
  wood: '#9C6A45', roof: '#8A5A44', propSnow: '#F6EEE6', propA: '#D9534F', propB: '#F4E3B0', glass: '#B9C3D6',
};
const meadowDay = {
  id: 'meadow-day', label: 'Meadow · day',
  tee: '#A4DC7C', fairwayA: '#92D468', fairwayB: '#84C65C', fringe: '#8FC964', greenA: '#B8E88C', greenB: '#AADC7E',
  rough: '#5E9E48', deepRough: '#4C8A3E', sand: '#F2E2B4', water: '#4A9FDB', waterDeep: '#357FC0',
  rock: '#A8A296', path: '#D9CFB4',
  skyTop: '#68B4EE', skyHorizon: '#E4F3FF', cloud: '#FFFFFF', fog: '#DCEFF8',
  sun: '#FFF5E0', ambient: '#EEF6FF', shadow: '#5B7A55',
  backFar: '#9DC3BA', backNear: '#7DAE80', backCap: '#9DC3BA', backCapShade: '#8DB5A8',
  pine: '#3A7F4C', trunk: '#7E5638', leaf: '#5FA24A', leafAlt: '#79B552', trunkAlt: '#7E5638',
  wood: '#B07A4A', roof: '#C9553F', propSnow: '#F4F1EA', propA: '#F5A3C0', propB: '#FFF2A0', glass: '#CFE3F0',
};
const islandDay = {
  id: 'island-day', label: 'Island coast · day',
  tee: '#A9E07A', fairwayA: '#9BDB62', fairwayB: '#8CCD55', fringe: '#96D25E', greenA: '#C0F08C', greenB: '#B1E47E',
  rough: '#5FA543', deepRough: '#4E9139', sand: '#FBF0D2', water: '#2EC4D6', waterDeep: '#1C93C4',
  rock: '#6E6A70', path: '#E2D6B8',
  skyTop: '#3FA9F0', skyHorizon: '#D8F6FF', cloud: '#FFFFFF', fog: '#D2F1FA',
  sun: '#FFF8E6', ambient: '#F0FAFF', shadow: '#4F7A80',
  backFar: '#86BBA9', backNear: '#4F9A6A', backCap: '#9FD3BC', backCapShade: '#7FBFA6',
  pine: '#3B8A55', trunk: '#8B6A4A', leaf: '#48A852', leafAlt: '#3FAE4C', trunkAlt: '#B08A5E',
  wood: '#C69A62', roof: '#D9B86E', propSnow: '#FFFFFF', propA: '#FF6F91', propB: '#FFD23F', glass: '#CFEFF5',
};
export const PALETTES = { 'meadow-day': meadowDay, 'alpine-day': alpineDay, 'alpine-sunset': alpineSunset, 'rockies-day': rockiesDay, 'island-day': islandDay };

// ---------- 3. Biome sets: a short description + piece ids from the library ----------
export const BIOMES = {
  grassland: {
    name: 'Meadow', desc: 'Rolling green farmland with round leafy trees, wildflowers and a windmill on the hill.',
    palette: 'meadow-day',
    onTrees: ['round', 'pine'], offTrees: ['blobFar', 'pineFar'],
    sky: 'gradient', backdrop: 'hillsRound',
    smallProps: ['grassTuft', 'flowers', 'fence'], bigProps: ['windmill'],
    notes: 'Gentle slopes, ponds rather than creeks, open fairways: the beginner biome. Suggested weather: any.',
  },
  mountain: {
    name: 'Alpine', desc: 'High meadow under snowy peaks. Cool, fresh greens, pale sand, blue water.',
    palette: 'alpine-day',
    onTrees: ['pine'], offTrees: ['pineFar'],
    sky: 'gradient', backdrop: 'peaksSnow',
    smallProps: ['grassTuft', 'flowers', 'fence'], bigProps: ['logLodge'],
    notes: 'Mountain streams: a creek crossing the hole suits it. Elevation changes, raised tees. Suggested weather: clear, light wind.',
  },
  // Time of day = its own biome set (owner, #73): the same pick list as Alpine, another palette.
  'mountain-sunset': {
    name: 'Alpine sunset', desc: 'The Alpine meadow at golden hour: warm low sun, pink snow caps, long blue shade.',
    palette: 'alpine-sunset',
    onTrees: ['pine'], offTrees: ['pineFar'],
    sky: 'gradient', backdrop: 'peaksSnow',
    smallProps: ['grassTuft', 'flowers', 'fence'], bigProps: ['logLodge'],
    notes: 'Same as Alpine. Good for a closing hole. Suggested weather: clear, calm.',
  },
  // Later idea (the owner's mix-and-match illustration, not planned now). A full pick list, no inheritance.
  'mountain-warm': {
    name: 'Ridge country (Rockies-like)', desc: 'Warm high plains under long ridges, red rock, golden aspens.',
    palette: 'rockies-day',
    onTrees: ['pine', 'aspen'], offTrees: ['pineFar', 'aspenFar'],
    sky: 'gradient', backdrop: 'ridgesWarm',
    smallProps: ['grassTuft', 'flowers', 'fence'], bigProps: ['cityBlocks'],
    notes: 'Red-rock outcrops as hazards, wide fairways. Suggested weather: clear, stronger wind.',
  },
  beach: {
    name: 'Island coast (Hawaii-like)', desc: 'Bright tropical greens, white sand, turquoise sea, palms and a green volcano.',
    palette: 'island-day',
    onTrees: ['palm', 'round'], offTrees: ['palmFar', 'blobFar'],
    sky: 'gradient', backdrop: 'seaHorizon',
    smallProps: ['grassTuft', 'flowers'], bigProps: ['beachHut'],
    notes: 'A big body of water along one side of the course (the sea), wide waste bunkers, dark lava rock. Suggested weather: sunny, sea wind.',
  },
};
