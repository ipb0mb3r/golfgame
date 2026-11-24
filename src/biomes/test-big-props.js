// AP7e: dev only (?biome=test-big-props). The artist's Meadow (day) set as it is, plus a bigProps list that offers
// all four big props (windmill, chalet, chaletTall, beachHut), so the owner can see one of each beyond OB on a
// mountain hole without editing a real hole: with this set (and only with it) the dev overlay
// src/holes/dev-big-props.js adds them to mtn-07 (?hole=mtn-07&biome=test-big-props). No hole uses this set and
// no menu lists it. The real sets' bigProps lists are the artist's; the placements on real holes the course designer's.
import meadowDay from './meadow-day.js';

export default {
  ...meadowDay,
  id: 'test-big-props',
  name: 'Test: big props (AP7e)',
  description: 'Dev only (AP7e): Meadow (day) offering all the big props: the windmill, the two chalets, the beach hut and the cow. Never in a menu or on a hole: ?hole=mtn-07&biome=test-big-props shows one of each beyond OB and a herd of 4 cows in a rail-fence pasture right of the tee.',
  bigProps: ['windmill', 'chalet', 'chaletTall', 'beachHut', 'cow'], // AP7i: + the cow (a herd of 4 in a rail-fence pasture)
};
