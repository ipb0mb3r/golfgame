// AP7c / AP7d: dev only (?biome=test-small-props). The artist's Meadow (day) look with the six small props at the
// Meadow numbers of docs/art/small-props/SPEC.md §4 (a pick's own perHa, cluster range and surfaces; the X33
// overrides: red flower patches, a plain green bush), so the owner can see them. No hole uses it and no menu lists
// it: ?hole=mtn-07&biome=test-small-props (mtn-07 has a creek and a pond for the reeds). The real sets' picks are
// the artist's, in an art PR.
import meadowDay from './meadow-day.js';

const ground = ['rough', 'ob'];
export default {
  ...meadowDay,
  id: 'test-small-props',
  name: 'Test: small props (AP7d)',
  description: 'Dev only (AP7d): Meadow (day) with the six small props at the spec\'s Meadow density: grass tufts, buttercup and red flower patches, pebbles, flat stones, plain green bushes beyond OB and reeds at the water\'s edge. Never in a menu or on a hole: ?biome=test-small-props.',
  smallProps: {
    pieces: [
      { id: 'grassTuft', perHa: 700, cluster: { count: [1, 3], radius: 1.2 }, on: ground },
      { id: 'flowerPatch', perHa: 120, cluster: { count: [3, 6], radius: 2 }, on: ground },                                  // buttercups (propA)
      { id: 'flowerPatch', slots: { petal: 'propB' }, perHa: 60, cluster: { count: [3, 5], radius: 2 }, on: ground },       // red (X33)
      { id: 'pebbles', perHa: 40, cluster: { count: [1, 3], radius: 1 }, on: ['rough'] },
      { id: 'flatStone', perHa: 15, cluster: { count: [1, 2], radius: 1 }, on: ['rough'] },
      { id: 'flowerBush', slots: { flower: 'leafTop' }, perHa: 30, cluster: { count: [1, 3], radius: 2.5 }, on: ['ob'] },   // plain green (X33)
      { id: 'reeds', perTenM: 2, cluster: { count: [2, 4], radius: 0.8 }, on: ['waterEdge'] },
    ],
  },
};
