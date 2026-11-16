// ?tune=NAME:value,NAME:value (X8): override whitelisted tunables for one visit.
// Numbers only, each clamped to its range. Anything else is ignored and reported.
// Two kinds of names:
//   config.js TUNABLES, e.g. SWEET:0.06
//   lie values (S11), e.g. rough.maxPower:0.8, sand.sweetScale:0.6, sw.sand.maxPower:0.9
import { TUNABLES, setTunable, resetTunables } from './config.js';
import { BASE_SURFACES, LIE_RANGES } from './surfaces.js';
import { CLUBS } from './clubs.js';

// Every tunable name (upper case for matching) → { name, min, max, set(v), reset() }
const TARGETS = new Map();
for (const [name, r] of Object.entries(TUNABLES)) TARGETS.set(name, { name, ...r, set: v => setTunable(name, v) });
function addLie(name, obj, key) {
  const def = obj[key];
  TARGETS.set(name.toUpperCase(), { name, ...LIE_RANGES[key], set: v => { obj[key] = v; }, reset: () => { obj[key] = def; } });
}
for (const [id, s] of Object.entries(BASE_SURFACES)) for (const key of Object.keys(LIE_RANGES)) if (key in s) addLie(`${id}.${key}`, s, key);
for (const c of Object.values(CLUBS)) for (const [sid, o] of Object.entries(c.lieOverrides ?? {})) for (const key of Object.keys(LIE_RANGES)) if (key in o) addLie(`${c.id}.${sid}.${key}`, o, key);

export const tunableNames = () => [...TARGETS.values()].map(t => t.name);

// Put every tunable (config and lie values) back to its default. Tests use this.
export function resetAllTunables() { resetTunables(); for (const t of TARGETS.values()) t.reset?.(); }

const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)$/;
const MAX_PAIRS = 20;

// Read a tune string without changing anything.
// Returns { set: [{ name, value, asked }], rejected: [{ text, why }] }.
//   value = the clamped value that will be used, asked = the number in the link.
export function parseTune(str) {
  const set = [], rejected = [];
  if (!str) return { set, rejected };
  const parts = String(str).split(',').map(s => s.trim()).filter(Boolean).slice(0, MAX_PAIRS);
  for (const part of parts) {
    const i = part.indexOf(':');
    const target = TARGETS.get((i < 0 ? part : part.slice(0, i)).trim().toUpperCase());
    const raw = i < 0 ? '' : part.slice(i + 1).trim();
    if (!target) { rejected.push({ text: part, why: 'unknown name' }); continue; }
    if (!NUMBER.test(raw)) { rejected.push({ text: part, why: 'not a number' }); continue; }
    const asked = Number(raw);
    const { name, min, max } = target;
    const value = Math.min(max, Math.max(min, asked));
    const prev = set.findIndex(s => s.name === name);
    if (prev >= 0) set.splice(prev, 1); // the last one wins
    set.push({ name, value, asked });
  }
  return { set, rejected };
}

// Parse and apply. Returns the same report as parseTune.
export function applyTune(str) {
  const report = parseTune(str);
  for (const s of report.set) TARGETS.get(s.name.toUpperCase()).set(s.value);
  return report;
}

// Short text for the TUNED badge, e.g. "SWEET 0.06 · CURVE_SHAPE 2".
export function tuneSummary({ set }) {
  return set.map(s => `${s.name} ${s.value}${s.value !== s.asked ? ' (clamped)' : ''}`).join(' · ');
}
