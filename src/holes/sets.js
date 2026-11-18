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
import { validateHole } from '../core/validate.js';

export const MTN = [mtn01, mtn02, mtn03, mtn04, mtn05, mtn06];
// Every hole is checked when it loads (Gate A T7): a typo fails here, naming the hole and the field.
export const HOLES = Object.fromEntries([hole1, hole2, hole3, ...MTN].map(h => [validateHole(h).id, h]));
export const DEFAULT_HOLE = hole1.id;

// A set (course) is a playlist of hole ids of ANY length, and the same hole may appear in several
// sets or several times in one (owner rule, DESIGN §8). ?set=<id> plays it as a round (Phase 6).
// Menus (Phase 7, core/menu.js): every set is a course on the Solo menu, in this order, unless
// `menu` says otherwise: 'practice' = its holes are the Practice menu's holes, 'hidden' = only
// reachable with ?set=. `tag` is shown next to the name on the menu.
export const SETS = [
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
  return Object.hasOwn(HOLES, key) ? { hole: HOLES[key], unknown: false } : { hole: HOLES[DEFAULT_HOLE], unknown: true };
}
export const getHole = id => resolveHole(id).hole;

// ?set= value → set, matched case-insensitively; null when missing or unknown.
export function resolveSet(id) {
  const key = (id ?? '').trim().toLowerCase();
  return key ? SETS.find(s => s.id.toLowerCase() === key) ?? null : null;
}
