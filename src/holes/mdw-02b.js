// Dev comparison (owner, 2026-11-25): mdw-02 with deep rough as a MIX of A and B. B: a perimeter band just inside the
// clearing's edge, between the rough and the OB forest, its width swelling and thinning (a blob, not a ring). A: the real
// mdw-02's dangerous area under the left trees is kept. Played with ?hole=mdw-02b; in no set or menu.
import { makeMdwHole } from './mdw-course.js';
import { MDW02 } from './mdw-02.js';

export default makeMdwHole({
  ...MDW02,
  id: 'mdw-02b', name: 'Buttercup Meadows · 2 (deep rough B)',
  land: { ...MDW02.land, deepBand: { w: 8, wob: 0.75, seed: 3 } },
});
