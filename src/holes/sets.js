// Every hole, by id, and the hole sets (ordered lists of holes played as one round).
// Adding a hole = add a file next to this one and one line in HOLES.
import hole1 from './hole1.js';
import hole2 from './hole2.js';
import { validateHole } from '../core/validate.js';

// Every hole is checked when it loads (Gate A T7): a typo fails here, naming the hole and the field.
export const HOLES = Object.fromEntries([hole1, hole2].map(h => [validateHole(h).id, h]));
export const DEFAULT_HOLE = hole1.id;

export const SETS = [
  { id: 'pl-1-2', name: 'Pocket Links 1–2', holes: ['pl-01', 'pl-02'] },
  { id: 'slope-test', name: 'Slope Test', holes: ['pl-02'] },
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
