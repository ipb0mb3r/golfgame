import { AUTO_CLUB_REACH, FRINGE_PUTT_DIST, SHAPE_RANGES } from './config.js';
import { lieTune, deepFreeze } from './surfaces.js';

// Club table (DESIGN.md §3). carry = meters a full, straight shot carries on flat ground.
// Frozen (Gate A A5): a ?tune= link changes club lie values through the lie-tune layer, not here.
// Phase BC (core/shape.js): `shape` = how much the impact point shapes a full shot with this club
// (the dev's proposal; the owner tunes them with ?tune=driver.start:8 etc., ranges in config SHAPE_RANGES):
//   start   deg the ball starts out to the side at a full left / right impact (the curve back follows)
//   height  deg the loft changes at a full bottom (higher) / top (lower) impact
//   roll    the first bounce keeps × (1 ± roll) of its speed (top +, bottom −)
//   wind    the wind pushes it × (1 ∓ wind) in the air (bottom +, top −)
// The Driver curves most, the wedges change height most.
export const CLUBS = deepFreeze({
  driver: { id: 'driver', name: 'Driver',  carry: 215, loft: 12, shape: { start: 10, height: 2,   roll: 0.25, wind: 0.2 } },
  '3w':   { id: '3w',     name: '3 Wood',  carry: 195, loft: 17, shape: { start: 9,  height: 3.5, roll: 0.3, wind: 0.2 } },
  '5i':   { id: '5i',     name: '5 Iron',  carry: 170, loft: 21, shape: { start: 8,  height: 4,   roll: 0.3, wind: 0.2 } },
  '7i':   { id: '7i',     name: '7 Iron',  carry: 150, loft: 26, shape: { start: 7,  height: 5,   roll: 0.3, wind: 0.2 } },
  '9i':   { id: '9i',     name: '9 Iron',  carry: 125, loft: 32, shape: { start: 6,  height: 6,   roll: 0.3, wind: 0.2 } },
  pw:     { id: 'pw',     name: 'P Wedge', carry: 105, loft: 38, shape: { start: 5,  height: 7,   roll: 0.3, wind: 0.2 } },
  sw:     { id: 'sw',     name: 'S Wedge', carry: 75,  loft: 46, shape: { start: 4,  height: 8,   roll: 0.3, wind: 0.2 },
            lieOverrides: { sand: { maxPower: 0.75, sweetScale: 0.6 } } }, // the sand wedge is made for bunkers (S17: .85/.7 → .75/.6)
  putter: { id: 'putter', name: 'Putter',  carry: 0,   loft: 0,  putter: true,
            // no power cap where you putt; the surface's sweetScale still applies (PM, PR #12)
            lieOverrides: { fringe: { maxPower: 1 }, green: { maxPower: 1 } } },
});
export const FULL_BAG = ['driver', '3w', '5i', '7i', '9i', 'pw', 'sw', 'putter'];

// A hole's bag, longest club first, putter last.
export function makeBag(ids = FULL_BAG) {
  for (const id of ids) if (!Object.hasOwn(CLUBS, id)) throw new Error(`unknown club "${id}" in the bag`); // Gate A T7: no silent drop
  const bag = FULL_BAG.filter(id => ids.includes(id)).map(id => CLUBS[id]);
  if (!bag.length || !bag[bag.length - 1].putter) throw new Error('a bag must end with the putter');
  return bag;
}

// Phase BC: the club's shaping amounts { start, height, roll, wind }; a ?tune= value (e.g.
// driver.start) wins over the table. A club without a `shape` (the putter) shapes nothing.
export function clubShape(club) {
  const out = {};
  for (const key of Object.keys(SHAPE_RANGES)) out[key] = lieTune(`${club.id}.${key}`) ?? club.shape?.[key] ?? 0;
  return out;
}

// The lie for hitting this club from this surface (S11): { maxPower, sweetScale }.
// The surface's values, unless the club overrides them for that surface (the sand wedge in a bunker).
// A ?tune= club value (e.g. sw.sand.maxPower) wins over the club's own override.
export function lieFor(club, surfaceId, surfaces) {
  const s = surfaces[surfaceId], o = club.lieOverrides?.[surfaceId] ?? {};
  const pick = key => (key in o ? lieTune(`${club.id}.${surfaceId}.${key}`) ?? o[key] : undefined) ?? s[key] ?? 1;
  return { maxPower: pick('maxPower'), sweetScale: pick('sweetScale') };
}

// A putt from here (rule 1 below): on the green, or on the fringe closer than FRINGE_PUTT_DIST to the cup.
export const isPuttLie = (lie, cupDist) => lie === 'green' || (lie === 'fringe' && cupDist < FRINGE_PUTT_DIST);

// The auto-pick for the next shot (S13, designer rules, DESIGN §3 "Club auto-pick"). The player can
// still change to any club in the bag. Returns an index into `bag`.
//   lie   the surface the ball sits on
//   dist  meters to the default aim point (S18; the pin for a putt)
//   reach (i) => meters a full shot with bag[i] carries from here (the lie's cap and the hills included)
// Rules, in order:
//   1. Green, or fringe closer than FRINGE_PUTT_DIST: the putter.
//   2. Bunker: the sand wedge when it reaches the pin within its own bunker cap (the greenside club).
//      From a far bunker, rule 3 inside the bunker cap: a real recovery choice, never the Driver.
//   3. Otherwise the shortest club whose reach is at least AUTO_CLUB_REACH × dist. The Driver only
//      counts on the tee, so it is picked only from the tee and only when nothing shorter gets there.
//      When nothing reaches, the longest club that counts.
//   cupDist (S18) meters to the cup for rule 1 (default: dist). `dist` is the distance to the default
//         aim (the green centre or the tee target), `cupDist` decides whether this is a putt.
export function pickClub(bag, { lie, dist, cupDist = dist, reach }) {
  const putter = bag.length - 1;
  if (isPuttLie(lie, cupDist)) return putter;
  const need = dist * AUTO_CLUB_REACH;
  if (lie === 'sand') { const sw = bag.findIndex(c => c.id === 'sw'); if (sw >= 0 && reach(sw) >= need) return sw; }
  const allowed = [];
  for (let i = 0; i < putter; i++) if (bag[i].id !== 'driver' || lie === 'tee') allowed.push(i);
  let pick = allowed[0] ?? putter;
  for (const i of allowed) if (reach(i) >= need) pick = i;
  return pick;
}
