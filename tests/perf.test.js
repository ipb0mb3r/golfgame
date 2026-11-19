// AP0: the phone budget (PERF_BUDGET in config.js) and the pure rating helper (core/perf.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PERF_BUDGET } from '../src/core/config.js';
import { rate, rateItem, overBudget, textureBytes, screenBytes, PERF_ITEMS } from '../src/core/perf.js';

test('AP0: the budget holds the numbers of DESIGN §8b and is frozen', () => {
  assert.ok(Object.isFrozen(PERF_BUDGET));
  assert.equal(PERF_BUDGET.drawCalls, 150);
  assert.equal(PERF_BUDGET.triangles, 300000);
  assert.equal(PERF_BUDGET.terrainTriangles, 200000);
  assert.equal(PERF_BUDGET.gpuMB, 64);
  assert.equal(PERF_BUDGET.textureSize, 512);
  assert.equal(PERF_BUDGET.textureSizePs1, 256);
  assert.equal(PERF_BUDGET.downloadMB, 8);
  assert.equal(PERF_BUDGET.fpsTarget, 60);
  assert.equal(PERF_BUDGET.fpsFloor, 30);
  assert.ok(PERF_BUDGET.fpsOk <= PERF_BUDGET.fpsTarget && PERF_BUDGET.fpsOk > PERF_BUDGET.fpsFloor);
  for (const it of PERF_ITEMS) assert.equal(typeof PERF_BUDGET[it.budget], 'number', `${it.key} has a budget`);
});

test('AP0: rate() says ok at the limit and over past it; fps is a minimum', () => {
  const B = PERF_BUDGET;
  assert.deepEqual(rate({ drawCalls: B.drawCalls, triangles: B.triangles, gpuMB: B.gpuMB, textureSize: B.textureSize, fps: B.fpsOk }),
    { fps: 'ok', drawCalls: 'ok', triangles: 'ok', gpuMB: 'ok', textureSize: 'ok' });
  assert.deepEqual(rate({ drawCalls: B.drawCalls + 1, triangles: B.triangles + 1, gpuMB: B.gpuMB + 0.1, textureSize: 1024, fps: B.fpsFloor - 1 }),
    { fps: 'over', drawCalls: 'over', triangles: 'over', gpuMB: 'over', textureSize: 'over' });
});

test('AP1 (PM on #75): fps has three levels: ok at 55 and up, warn (amber) from 30 to 55, over below 30', () => {
  const B = PERF_BUDGET;
  assert.equal(B.fpsOk, 55); assert.equal(B.fpsFloor, 30);
  assert.equal(rateItem('fps', 60), 'ok');
  assert.equal(rateItem('fps', 55), 'ok');
  assert.equal(rateItem('fps', 54.9), 'warn');
  assert.equal(rateItem('fps', 30), 'warn');
  assert.equal(rateItem('fps', 29.9), 'over');
  assert.equal(rateItem('drawCalls', 151), 'over', 'only fps has the amber level');
  assert.deepEqual(overBudget({ fps: 40 }), [], 'amber is not over budget');
});

test('AP1 (PM on #75): screen buffer estimate (colour + depth per sample, plus the resolved colour with MSAA)', () => {
  assert.equal(screenBytes(100, 50), 100 * 50 * 8);
  assert.equal(screenBytes(100, 50, 1), 100 * 50 * 8);
  assert.equal(screenBytes(100, 50, 4), 100 * 50 * (8 * 4 + 4));
  assert.equal(screenBytes(0, 50, 4), 0);
});

test('AP0: items missing, not numbers or without a budget are not rated', () => {
  assert.deepEqual(rate({}), {});
  assert.deepEqual(rate({ drawCalls: NaN, triangles: '12', geometries: 9999 }), {});
  assert.equal(rateItem('geometries', 5), null);
  assert.equal(rateItem('drawCalls', 10, { drawCalls: 5 }), 'over', 'another budget can be passed');
});

test('AP0: overBudget lists the items over, and skips the ones asked', () => {
  const n = { fps: 7, drawCalls: 200, triangles: 1000, gpuMB: 10 };
  assert.deepEqual(overBudget(n), ['fps', 'drawCalls']);
  assert.deepEqual(overBudget(n, PERF_BUDGET, ['fps']), ['drawCalls']);
  assert.deepEqual(overBudget({ drawCalls: 1 }), []);
});

test('AP0: texture memory estimate (RGBA8, mipmaps add a third)', () => {
  assert.equal(textureBytes(512, 512, false), 512 * 512 * 4);
  assert.equal(textureBytes(512, 512), Math.round(512 * 512 * 4 * 4 / 3));
  assert.equal(textureBytes(0, 512), 0);
  assert.equal(textureBytes(undefined, undefined), 0);
});
