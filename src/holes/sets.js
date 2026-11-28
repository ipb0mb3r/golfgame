// Every hole, by id, and the hole sets (ordered lists of holes played as one round).
// Adding a hole = add a file next to this one and one line in HOLES.
import hole1 from './hole1.js';
import hole2 from './hole2.js';
import hole3 from './hole3.js';
// Mountain 9 prototype (Phase C, course designer): docs/COURSE_PLAN_MTN.md
import mtn01 from './mtn-01.js';
import mtn02 from './mtn-02.js';
import mtn03 from './mtn-03.js';
import mtn04 from './mtn-04.js';
import mtn05 from './mtn-05.js';
import mtn06 from './mtn-06.js';
import mtn07 from './mtn-07.js';
import mtn08 from './mtn-08.js';
import mtn09 from './mtn-09.js';
// Buttercup Meadows (the first real course, meadow-day): docs/COURSE_PLAN_MEADOW.md. Holes are added as they are built.
import mdw01 from './mdw-01.js';
import mdw02 from './mdw-02.js';
import mdw03 from './mdw-03.js';
import mdw04 from './mdw-04.js';
import mdw05 from './mdw-05.js';
import mdw06 from './mdw-06.js';
import mdw07 from './mdw-07.js';
import mdw08 from './mdw-08.js';
// S24: dev only, the deep-rough practice spot (in no set or menu)
import devDeepRough from './dev-deep-rough.js';
import { validateHole } from '../core/validate.js';
import { resolveBiome } from '../biomes/index.js';
import { LIBRARY } from '../biomes/library.js';
import { bigPropsError } from '../core/bigProps.js';
import { fencesSetError } from '../core/fences.js';
import { eventPropsSetError } from '../core/eventProps.js';

export const MTN = [mtn01, mtn02, mtn03, mtn04, mtn05, mtn06, mtn07, mtn08, mtn09];
export const MDW = [mdw01, mdw02, mdw03, mdw04, mdw05, mdw06, mdw07, mdw08];
// X12: the registry builds nothing. A Mountain 9 hole builds its grids and forest on first use
// (src/holes/lazy.js), and a hole is checked (Gate A T7) when the page first plays it (readyHole), so
// a page only pays for the holes it plays. node --test checks every hole in full (tests/validate.test.js).
export const HOLES = Object.fromEntries([hole1, hole2, hole3, ...MTN, ...MDW].map(h => [h.id, h]));
export const DEFAULT_HOLE = hole1.id;
// S24: dev-only holes, played by ?hole=<id> or a dev test spot only: not in HOLES, so no set, menu or
// every-hole check lists them (tests/deep-rough.test.js checks them).
export const DEV_HOLES = Object.fromEntries([devDeepRough].map(h => [h.id, h]));

// A set (course) is a playlist of hole ids of ANY length, and the same hole may appear in several
// sets or several times in one (owner rule, DESIGN §8). ?set=<id> plays it as a round (Phase 6).
// Menus (Phase 7, core/menu.js): every set is a course on the Solo menu, in this order, unless
// `menu` says otherwise: 'practice' = its holes are the Practice menu's holes, 'hidden' = only
// reachable with ?set=. `tag` is shown next to the name on the menu.
export const SETS = [
  // Buttercup Meadows, the first real course (18 holes planned; holes are added as they are built)
  { id: 'meadows', name: 'Buttercup Meadows', holes: MDW.map(h => h.id) },
  // Phase C: the Mountain 9 prototype course (holes are added as they are built)
  { id: 'mountain9', name: 'Mountain 9', tag: 'Prototype', holes: MTN.map(h => h.id) },
  // Temporary round test sets (R6), only until the real course exists (Phase C)
  { id: 'prototype3', name: 'Prototype 3', tag: 'Prototype', holes: ['pl-01', 'pl-02', 'pl-03'] },
  { id: 'test9', name: 'Test 9', tag: 'Prototype', holes: ['pl-01', 'pl-02', 'pl-03', 'pl-01', 'pl-02', 'pl-03', 'pl-01', 'pl-02', 'pl-03'] },
  { id: 'pl-1-2', name: 'Pocket Links 1–2', menu: 'hidden', holes: ['pl-01', 'pl-02'] },
  { id: 'slope-test', name: 'Slope Test', menu: 'hidden', holes: ['pl-02'] },
  // The practice and test holes (HOLE_GUIDELINES §7), played from the Practice menu (M0)
  { id: 'practice', name: 'Practice holes', menu: 'practice', holes: ['pl-01', 'pl-02', 'pl-03'] },
];
const SET_MENUS = [undefined, 'practice', 'hidden'];
for (const s of SETS) {
  for (const id of s.holes) if (!Object.hasOwn(HOLES, id)) throw new Error(`hole set "${s.id}": unknown hole "${id}"`);
  if (!SET_MENUS.includes(s.menu)) throw new Error(`hole set "${s.id}": menu must be 'practice' or 'hidden' (or left out), not "${s.menu}"`);
}

// ?hole= value → hole. Ids are matched case-insensitively. An unknown id falls back to the
// default hole and reports `unknown: true` so the page can say so.
export function resolveHole(id) {
  const key = (id ?? '').trim().toLowerCase();
  if (!key) return { hole: HOLES[DEFAULT_HOLE], unknown: false };
  if (Object.hasOwn(HOLES, key)) return { hole: HOLES[key], unknown: false };
  return Object.hasOwn(DEV_HOLES, key) ? { hole: DEV_HOLES[key], unknown: false } : { hole: HOLES[DEFAULT_HOLE], unknown: true };
}
export const getHole = id => resolveHole(id).hole;

// X12: a hole about to be played: built (if it was lazy) and checked once (Gate A T7, a typo fails
// here naming the hole and the field), without the shot simulations, which node --test runs on
// every hole. Returns the hole. The game calls it for every hole it loads (src/game/main.js).
const ready = new WeakSet();
export function readyHole(hole) {
  if (!ready.has(hole)) { validateHole(hole, { shots: false }); checkHoleLooks(hole); ready.add(hole); }
  return hole;
}

// AP5: the hole's biome set exists and passes (validateBiomeSet), and every tree `look` is a library
// onTrees piece (a look the set doesn't pick falls back to the set's own pick, core/biome.js treeLooks)
export function checkHoleLooks(hole) {
  const set = resolveBiome(hole.biome);
  // AP7e: every big prop is offered by the hole's own set, in its scale range, its footprint clear of OB + 5 m
  // AP7f / AP7g: every fence look and event prop is offered by the hole's own set (the zone rules are in validateHole)
  const e = bigPropsError(hole, hole.scenery?.bigProps, set, LIBRARY) ?? fencesSetError(hole.scenery?.fences, set) ?? eventPropsSetError(hole.scenery?.eventProps, set);
  if (e) throw new Error(`hole "${hole.id}": ${e}`);
  (hole.obstacles ?? []).forEach((o, i) => {
    if (o.look !== undefined && !Object.hasOwn(LIBRARY.onTrees, o.look)) throw new Error(`hole "${hole.id}": obstacles[${i}].look "${o.look}" is not a tree piece (the library's onTrees: ${Object.keys(LIBRARY.onTrees).join(', ')})`);
  });
  return hole;
}

// ?set= value → set, matched case-insensitively; null when missing or unknown.
export function resolveSet(id) {
  const key = (id ?? '').trim().toLowerCase();
  return key ? SETS.find(s => s.id.toLowerCase() === key) ?? null : null;
}
