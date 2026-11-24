// AP7f: dev only (?biome=test-fences). The artist's Meadow (day) set as it is, plus a fences list that offers both
// fence looks (railFence, ropeFence; the rope one here in Meadow's colours), so the owner can see them beyond OB on a
// mountain hole without editing a real hole: with this set (and only with it) the dev overlay src/holes/dev-fences.js
// adds them to mtn-07 (?hole=mtn-07&biome=test-fences). No hole uses this set and no menu lists it. The real sets'
// fences lists are the artist's; the fences on real holes the course designer's.
import meadowDay from './meadow-day.js';

export default {
  ...meadowDay,
  id: 'test-fences',
  name: 'Test: fences (AP7f)',
  description: 'Dev only (AP7f): Meadow (day) offering both fence looks, the rail fence and the rope fence. Never in a menu or on a hole: ?hole=mtn-07&biome=test-fences shows ~600 m of fence beyond OB.',
  fences: ['railFence', 'ropeFence'],
};
