// Dev comparison (owner, 2026-11-25): mdw-02 with deep rough as a PERIMETER band (option B) instead of one dangerous
// area under the left trees (option A, the real mdw-02). A band of deep rough runs just inside the clearing's edge, all
// the way round, between the rough and the OB forest. Played with ?hole=mdw-02b; in no set or menu.
import { makeMdwHole } from './mdw-course.js';
import { MDW02 } from './mdw-02.js';

export default makeMdwHole({
  ...MDW02,
  id: 'mdw-02b', name: 'Buttercup Meadows · 2 (deep rough B)',
  deepRoughs: [],
  land: { ...MDW02.land, deepBand: 10 },
});
