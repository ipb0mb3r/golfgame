// AP7a: dev only (?biome=test-island-trees). The artist's Island coast (day) set with the new gradient
// trees: palms and round canopies in play, a palm / round-tree wall out of bounds, on the AP6a ocean look.
// No hole uses it and no menu lists it; the artist makes the real pick in island-day.js.
import islandDay from './island-day.js';

export default {
  ...islandDay,
  id: 'test-island-trees',
  name: 'Test: Island trees (AP7a)',
  description: 'Dev only (AP7a): Island coast (day) with the gradient palm and round canopy in play and out of bounds. Never in a menu or on a hole: ?biome=test-island-trees.',
  sky: 'gradientSky',
  backdrop: 'ocean',
  onTrees: ['palmTree', 'roundCanopy'],
  offTrees: ['palmTree', 'roundCanopy'],
};
