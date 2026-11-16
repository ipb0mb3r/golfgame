// Every hole, by id, and the hole sets (ordered lists of holes played as one round).
// Adding a hole = add a file next to this one and one line in HOLES.
import hole1 from './hole1.js';
import hole2 from './hole2.js';

export const HOLES = { [hole1.id]: hole1, [hole2.id]: hole2 };
export const DEFAULT_HOLE = hole1.id;

export const SETS = [
  { id: 'pl-1-2', name: 'Pocket Links 1–2', holes: ['pl-01', 'pl-02'] },
  { id: 'slope-test', name: 'Slope Test', holes: ['pl-02'] },
];

// ?hole= value → hole. Ids are matched case-insensitively. An unknown id falls back to the
// default hole and reports `unknown: true` so the page can say so.
export function resolveHole(id) {
  const key = (id ?? '').trim().toLowerCase();
  if (!key) return { hole: HOLES[DEFAULT_HOLE], unknown: false };
  return HOLES[key] ? { hole: HOLES[key], unknown: false } : { hole: HOLES[DEFAULT_HOLE], unknown: true };
}
export const getHole = id => resolveHole(id).hole;
