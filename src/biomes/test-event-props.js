// AP7g: dev only (?biome=test-event-props). The artist's Meadow (day) set as it is, plus an eventProps list that offers
// both event props (featherFlag, popupTent), so the owner can see a dressed "tournament" tee without editing a real
// hole: with this set (and only with it) the dev overlay src/holes/dev-event-props.js adds them to pl-01
// (?hole=pl-01&biome=test-event-props). No hole uses this set and no menu lists it. The real sets' eventProps lists
// are the artist's; the props on real holes the course designer's.
import meadowDay from './meadow-day.js';

export default {
  ...meadowDay,
  id: 'test-event-props',
  name: 'Test: event props (AP7g)',
  description: 'Dev only (AP7g): Meadow (day) offering the feather flag and the pop-up tent. Never in a menu or on a hole: ?hole=pl-01&biome=test-event-props dresses the tee, the side of the hole and the back of the green.',
  eventProps: ['featherFlag', 'popupTent'],
};
