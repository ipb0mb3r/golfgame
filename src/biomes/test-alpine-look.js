// AP6a: dev only (?biome=test-alpine-look). The artist's Alpine (day) set with the two new pieces it
// is meant to pick: the gradient sky and the horn peaks. No hole uses it and no menu lists it; the
// artist makes the real pick in alpine-day.js (two one-line changes), then this file can go.
import alpineDay from './alpine-day.js';

export default {
  ...alpineDay,
  id: 'test-alpine-look',
  name: 'Test: Alpine look (AP6a)',
  description: 'Dev only (AP6a): Alpine (day) with the gradient sky and the horn-peaks backdrop. Never in a menu or on a hole: ?biome=test-alpine-look.',
  sky: 'gradientSky',
  backdrop: 'hornPeaks',
};
