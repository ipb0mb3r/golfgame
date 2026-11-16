// ?tune=NAME:value,NAME:value (X8): override whitelisted tunables from config.js for one visit.
// Numbers only, each clamped to its range in TUNABLES. Anything else is ignored and reported.
import { TUNABLES, setTunable } from './config.js';

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
    const name = (i < 0 ? part : part.slice(0, i)).trim().toUpperCase();
    const raw = i < 0 ? '' : part.slice(i + 1).trim();
    if (!Object.hasOwn(TUNABLES, name)) { rejected.push({ text: part, why: 'unknown name' }); continue; }
    if (!NUMBER.test(raw)) { rejected.push({ text: part, why: 'not a number' }); continue; }
    const asked = Number(raw);
    const { min, max } = TUNABLES[name];
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
  for (const s of report.set) setTunable(s.name, s.value);
  return report;
}

// Short text for the TUNED badge, e.g. "SWEET 0.06 · CURVE_SHAPE 2".
export function tuneSummary({ set }) {
  return set.map(s => `${s.name} ${s.value}${s.value !== s.asked ? ' (clamped)' : ''}`).join(' · ');
}
