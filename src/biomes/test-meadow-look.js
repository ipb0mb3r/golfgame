// AP6a: dev only (?biome=test-meadow-look). The artist's Meadow (day) set with the gradient sky and
// the stronger far-hill tint (hazeHills: a near ring in backNear, a far ring in backFar). No hole uses
// it and no menu lists it; the artist decides whether meadow-day picks them.
import meadowDay from './meadow-day.js';

export default {
  ...meadowDay,
  id: 'test-meadow-look',
  name: 'Test: Meadow look (AP6a)',
  description: 'Dev only (AP6a): Meadow (day) with the gradient sky and the haze hills. Never in a menu or on a hole: ?biome=test-meadow-look.',
  sky: 'gradientSky',
  backdrop: 'hazeHills',
};
