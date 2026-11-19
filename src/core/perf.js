// Phone performance budget checks (AP0, DESIGN §8b). Pure: the numbers come from the game layer
// (src/game/perf.js reads Three.js renderer.info) or from tools/perf-check.mjs.
import { PERF_BUDGET } from './config.js';

// Each measured item and the budget key it is checked against. `min`: the value must be at least the
// budget (fps); otherwise at most. Items not listed here (geometries, textures) are shown, never rated.
export const PERF_ITEMS = Object.freeze([
  Object.freeze({ key: 'fps', budget: 'fpsOk', min: true }),
  Object.freeze({ key: 'drawCalls', budget: 'drawCalls' }),
  Object.freeze({ key: 'triangles', budget: 'triangles' }),
  Object.freeze({ key: 'gpuMB', budget: 'gpuMB' }),
  Object.freeze({ key: 'textureSize', budget: 'textureSize' }),
]);

// Rate one value: 'ok', 'over' (over budget; for fps: below it) or null (not measured / no budget).
export function rateItem(key, value, budget = PERF_BUDGET) {
  const item = PERF_ITEMS.find(i => i.key === key);
  const limit = item && budget[item.budget];
  if (!item || typeof limit !== 'number' || typeof value !== 'number' || !Number.isFinite(value)) return null;
  return (item.min ? value >= limit : value <= limit) ? 'ok' : 'over';
}

// numbers = { fps, drawCalls, triangles, gpuMB, textureSize, ... } → { key: 'ok' | 'over' } for every
// rated item present in numbers.
export function rate(numbers, budget = PERF_BUDGET) {
  const out = {};
  for (const { key } of PERF_ITEMS) {
    const r = rateItem(key, numbers[key], budget);
    if (r) out[key] = r;
  }
  return out;
}

// The keys over budget (empty when everything measured is ok); `skip` leaves items out (headless fps).
export const overBudget = (numbers, budget = PERF_BUDGET, skip = []) =>
  Object.entries(rate(numbers, budget)).filter(([k, r]) => r === 'over' && !skip.includes(k)).map(([k]) => k);

// Estimated GPU bytes of one RGBA8 texture, plus a third for the mipmap chain when `mipmaps`.
export function textureBytes(w, h, mipmaps = true) {
  if (!(w > 0 && h > 0)) return 0;
  const base = w * h * 4;
  return mipmaps ? Math.round(base * 4 / 3) : base;
}

export const MB = 1024 * 1024;
