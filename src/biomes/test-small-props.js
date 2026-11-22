// AP7c: dev only (?biome=test-small-props). The artist's Meadow (day) look with a dense small-prop rule on the
// two PLACEHOLDER pieces (grassTuft, flowerPatch), to prove the scatter, the drawing and the per-pick slot
// override (X33: the buttercup patches are flowerPatch with both heads in propA). No hole uses it and no menu
// lists it: ?hole=mtn-07&biome=test-small-props. The artist's real pieces and picks go in the real sets later.
import meadowDay from './meadow-day.js';

export default {
  ...meadowDay,
  id: 'test-small-props',
  name: 'Test: small props (AP7c)',
  description: 'Dev only (AP7c): Meadow (day) with a dense scatter of placeholder grass tufts and flower patches in the rough and beyond OB. Never in a menu or on a hole: ?biome=test-small-props.',
  smallProps: {
    pieces: [
      { id: 'grassTuft', weight: 5 },                                          // single tufts everywhere
      { id: 'grassTuft', weight: 3, cluster: { count: 8, radius: 1.2 } },      // clumps of tufts
      { id: 'flowerPatch', weight: 2, slots: { headB: 'propA' }, cluster: { count: 10, radius: 1.5 } }, // buttercup patches (X33)
      { id: 'flowerPatch', weight: 0.6 },                                      // a few mixed flowers (propA + propB red)
    ],
    perHa: 1200,
    on: ['rough', 'ob'],
  },
};
