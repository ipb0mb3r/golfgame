// ART1 biome set: Meadow (day), the DEFAULT theme (owner, 2026-11-20). Approved by the owner from his mood board
// (docs/art/meadow/): warm yellow-greens, not neon; lots of round trees and a few tall conifers; buttercup
// yellow; a deep blue sky; wooden windmills and grazing cows out of bounds (no barns: not a farm).
// Palette: option A "warm" (owner) with the brick-red flag (owner). Source: docs/art/meadow/palettes.js.
// Until the new pieces exist (AP7 models, AP6 ground, gradient sky) it uses today's library pieces; the
// pieces it is waiting for are listed in docs/ART_STYLE.md §6.3. — Agent: artist
export default {
  id: 'meadow-day',
  name: 'Meadow (day)',
  description: 'The default theme: a warm, sunny meadow park. Yellow-green grass, round trees and tall conifers, buttercups in the rough, a deep blue sky, a brick-red flag and buttercup-yellow tee markers; wooden windmills and grazing cows out of bounds.',
  palette: {
    // surfaces
    tee: '#9ad45e', fairwayA: '#98d25a', fairwayB: '#88c44e', edge: '#4e8a30', fringe: '#93cc56', greenA: '#c8f07e', greenB: '#beec72',
    rough: '#5c9e3e', deepRough: '#315a24', sand: '#f3e8ca', lip: '#c8ae7a', water: '#2c8ad8', waterDeep: '#1d62b8', bank: '#9a7a50',
    rock: '#a89b8c', path: '#e8d8ae',
    // deep rough (S24, the in-play surface 'deepRough'; not `deepRough` above, which is the ground beyond OB):
    // owner (2026-11-25): halfway between the rough and the ground beyond OB; the OB ground (`deepRough`) was made
    // deeper so this midpoint passes every readability rule with no waiver
    roughDeep: '#477c31',
    // sky, fog, light
    skyTop: '#1c76e2', skyHorizon: '#c9eaff', cloud: '#e2ecf6', fog: '#d2ecfa',
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
    gridFill: '#c8f07e', gridLine: '#9ad65a', farGround: '#315a24', pondSurface: '#2c8ad8', boulder: '#a89b8c',
  },
  textures: [],               // none yet (AP6): flat painted colours
  onTrees: ['roundCanopy', 'pineTree'], // the soft round tree + a soft pine (AP7a)
  offTrees: ['roundCanopy', 'spruceTree'], // round trees with dark spruces (owner: lots of round trees); fits mtn-07 with the AP7b lighter scenery round tree and far tree wall
  rocks: ['roundBoulder'],
  sky: 'gradientSky', // the gradient sky (AP6a)
  backdrop: 'hazeHills',  // the soft hazy hills, near ring backNear + far ring backFar (AP6a)
  furniture: { flag: 'clothFlag', teeMarkers: 'ballMarkers', stakes: 'whiteStakes', pond: 'flatPond' },
  // small props (docs/art/small-props/SPEC.md §4, at about half the spec's density: since AP7d they are drawn 2× size)
  // tufts, buttercups (propA) and a few red flowers (propB), stones in the rough, plain green bushes beyond OB, reeds by the water
  smallProps: {
    pieces: [
      { id: 'grassTuft', perHa: 350, cluster: { count: [1, 3], radius: 2 }, on: ['rough', 'ob'] },
      { id: 'flowerPatch', perHa: 60, cluster: { count: [3, 5], radius: 3 }, on: ['rough', 'ob'] },                               // buttercups
      { id: 'flowerPatch', slots: { petal: 'propB' }, perHa: 30, cluster: { count: [2, 4], radius: 3 }, on: ['rough', 'ob'] },  // red flowers
      { id: 'pebbles', perHa: 20, cluster: { count: [1, 2], radius: 1.5 }, on: ['rough'] },
      { id: 'flatStone', perHa: 8, on: ['rough'] },
      { id: 'flowerBush', slots: { flower: 'leafTop' }, perHa: 15, cluster: { count: [1, 2], radius: 4 }, on: ['ob'] },  // plain green (owner: flowers on Island only)
      { id: 'reeds', perTenM: 1.5, cluster: { count: [2, 3], radius: 1.2 }, on: ['waterEdge'] },
    ],
  },
  bigProps: ['windmill', 'cow'], // the white smock mill (docs/art/big-props/SPEC.md), high on a hill; the cow (docs/art/cow/SPEC.md), 3-4 in a fenced pasture. Both placed by hand beyond OB (course designer)
  fences: ['railFence'],      // post & two rails (docs/art/fence/SPEC.md), along OB or around a pasture; look only
  // a "tournament" set (owner 2026-11-24): feather flags (colours swapped so they never read as a hole flag) and tents
  // at the tee, along the course and near the green (docs/art/tee-props/SPEC.md §4)
  eventProps: [{ id: 'featherFlag', slots: { body: 'subAccent', top: 'accent' } }, 'popupTent', 'parkBench'], // + the park bench by the tee (docs/art/bench/SPEC.md)
  notes: 'The default, classic theme: gentle open holes, wide fairways, plenty of trees along the fairways and a few in play, ponds, cream bunkers. Big props out of bounds: 1-3 windmills on the hills, a few cows grazing behind a wooden fence (never in play, no barns). Suggested weather: clear, light to medium wind.',
};
