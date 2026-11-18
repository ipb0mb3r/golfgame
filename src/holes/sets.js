// Every hole, by id, and the hole sets (ordered lists of holes played as one round).
// Adding a hole = add a file next to this one and one line in HOLES.
import hole1 from './hole1.js';
import hole2 from './hole2.js';
import hole3 from './hole3.js';
import { validateHole } from '../core/validate.js';

// Every hole is checked when it loads (Gate A T7): a typo fails here, naming the hole and the field.
export const HOLES = Object.fromEntries([hole1, hole2, hole3].map(h => [validateHole(h).id, h]));
export const DEFAULT_HOLE = hole1.id;

// A set (course) is a playlist of hole ids of ANY length, and the same hole may appear in several
// sets or several times in one (owner rule, DESIGN §8). ?set=<id> plays it as a round (Phase 6).
export const SETS = [
  // Temporary round test sets (R6), only until the real course exists (Phase C)
  { id: 'prototype3', name: 'Prototype 3', holes: ['pl-01', 'pl-02', 'pl-03'] },
  { id: 'test9', name: 'Test 9', holes: ['pl-01', 'pl-02', 'pl-03', 'pl-01', 'pl-02', 'pl-03', 'pl-01', 'pl-02', 'pl-03'] },
  { id: 'pl-1-2', name: 'Pocket Links 1–2', holes: ['pl-01', 'pl-02'] },
  { id: 'slope-test', name: 'Slope Test', holes: ['pl-02'] },
  // The practice and test holes (HOLE_GUIDELINES §7), played from the Practice menu later (M0)
  { id: 'practice', name: 'Practice holes', holes: ['pl-01', 'pl-02', 'pl-03'] },
];
for (const s of SETS) for (const id of s.holes) if (!Object.hasOwn(HOLES, id)) throw new Error(`hole set "${s.id}": unknown hole "${id}"`);

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
