// AP7a: dev only (?biome=test-trees). The artist's Alpine (day) set with the new gradient trees: pines,
// spruces and birches in play, a mixed spruce / pine forest out of bounds, on the AP6a look.
// No hole uses it and no menu lists it; the artist makes the real pick in alpine-day.js.
import alpineDay from './alpine-day.js';

export default {
  ...alpineDay,
  id: 'test-trees',
  name: 'Test: Alpine trees (AP7a)',
  description: 'Dev only (AP7a): Alpine (day) with the gradient pine, spruce and birch in play and a spruce / pine forest out of bounds. Never in a menu or on a hole: ?biome=test-trees.',
  sky: 'gradientSky',
  backdrop: 'hornPeaks',
  onTrees: ['pineTree', 'spruceTree', 'birchTree'],
  offTrees: ['spruceTree', 'pineTree'],
};
