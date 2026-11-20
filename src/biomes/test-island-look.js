// AP6a: dev only (?biome=test-island-look). The artist's Island coast (day) set with the gradient sky
// and the ocean backdrop (the sea on the piece's default sides, left + far, unless the hole's
// scenery.seaSide says otherwise). No hole uses it and no menu lists it; the artist makes the real
// pick in island-day.js, then this file can go.
import islandDay from './island-day.js';

export default {
  ...islandDay,
  id: 'test-island-look',
  name: 'Test: Island coast look (AP6a)',
  description: 'Dev only (AP6a): Island coast (day) with the gradient sky and the ocean backdrop. Never in a menu or on a hole: ?biome=test-island-look.',
  sky: 'gradientSky',
  backdrop: 'ocean',
};
