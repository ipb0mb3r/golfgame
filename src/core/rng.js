// Seeded random numbers (mulberry32). Core code never calls Math.random().
// ?seed= value → integer seed, or null when missing or not a number. 0 is a valid seed.
export function parseSeed(text) {
  if (text === null || text === undefined || String(text).trim() === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function createRng(seed = 1) {
  let s = seed | 0;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
