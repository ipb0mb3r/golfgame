// Phone performance budget checks (AP0, DESIGN §8b). Pure: the numbers come from the game layer
// (src/game/perf.js reads Three.js renderer.info) or from tools/perf-check.mjs.
import { PERF_BUDGET } from './config.js';

// Each measured item and the budget key it is checked against. `min`: the value must be at least the
// budget (fps); otherwise at most. `warn` (fps, PM on #75): between that budget key and the budget the
// value is 'warn' (amber), below it 'over'. Items not listed here (geometries, textures, the painted
// course map until AP6, the screen buffers) are shown, never rated.
export const PERF_ITEMS = Object.freeze([
  Object.freeze({ key: 'fps', budget: 'fpsOk', min: true, warn: 'fpsFloor' }),
  Object.freeze({ key: 'drawCalls', budget: 'drawCalls' }),
  Object.freeze({ key: 'triangles', budget: 'triangles' }),
  Object.freeze({ key: 'gpuMB', budget: 'gpuMB' }),
  Object.freeze({ key: 'textureSize', budget: 'textureSize' }),
]);

// Rate one value: 'ok', 'warn' (fps between the floor and ok: amber), 'over' (over budget; for fps:
// below the floor) or null (not measured / no budget).
export function rateItem(key, value, budget = PERF_BUDGET) {
  const item = PERF_ITEMS.find(i => i.key === key);
  const limit = item && budget[item.budget];
  if (!item || typeof limit !== 'number' || typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (item.min ? value >= limit : value <= limit) return 'ok';
  const soft = item.warn && budget[item.warn];
  return typeof soft === 'number' && (item.min ? value >= soft : value <= soft) ? 'warn' : 'over';
}

// numbers = { fps, drawCalls, triangles, gpuMB, textureSize, ... } → { key: 'ok' | 'warn' | 'over' } for every
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

// Estimated bytes of the screen buffers for a w × h drawing buffer (PM on #75: shown on its own,
// unrated line, never in the per-hole budget): per sample a colour (RGBA8) and a depth + stencil
// value (4 + 4 bytes), plus, with MSAA (samples > 1), the resolved colour the page shows.
export function screenBytes(w, h, samples = 0) {
  if (!(w > 0 && h > 0)) return 0;
  const s = Math.max(1, samples | 0);
  return w * h * (8 * s + (s > 1 ? 4 : 0));
}
