import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ss, ell, bump, makeTerrain } from '../src/core/terrain.js';

test('smoothstep and ellipse helpers', () => {
  assert.equal(ss(0, 1, -1), 0); assert.equal(ss(0, 1, 2), 1); assert.equal(ss(0, 1, 0.5), 0.5);
  const e = { cx: 1, cz: 2, rx: 4, rz: 2 };
  assert.equal(ell(1, 2, e), 0); assert.equal(ell(5, 2, e), 1); assert.equal(ell(1, 4, e), 1);
  assert.equal(ell(6, 2, e, 1), 1);
});

test('gradient of a known bump matches the analytic slope', () => {
  const b = { x: 3, z: -4, r: 5, h: 2 };
  const t = makeTerrain({ heightAt: (x, z) => bump(x, z, b), surfaceAt: () => 'green' });
  assert.equal(t.heightAt(3, -4), 2);
  for (const [x, z] of [[0, 0], [5, -6], [3, -1], [-2, -4]]) {
    const dx = x - b.x, dz = z - b.z, h = bump(x, z, b);
    const gx = h * -2 * dx / (b.r * b.r), gz = h * -2 * dz / (b.r * b.r);
    const g = t.gradAt(x, z);
    assert.ok(Math.abs(g.x - gx) < 1e-3 && Math.abs(g.z - gz) < 1e-3, `at ${x},${z}: ${g.x},${g.z} vs ${gx},${gz}`);
    const n = t.normalAt(x, z);
    assert.ok(Math.abs(Math.hypot(n.x, n.y, n.z) - 1) < 1e-12, 'normal is unit length');
    assert.ok(n.y > 0 && Math.sign(n.x) === Math.sign(-gx || 0) , 'normal leans downhill');
  }
});

test('a plane has a constant slope', () => {
  const t = makeTerrain({ heightAt: (x, z) => 0.1 * x - 0.05 * z, surfaceAt: () => 'green' });
  const g = t.gradAt(7, -3);
  assert.ok(Math.abs(g.x - 0.1) < 1e-9 && Math.abs(g.z + 0.05) < 1e-9);
});

test('a hole without heightAt is flat', () => {
  const t = makeTerrain({ surfaceAt: () => 'fairway' });
  assert.equal(t.heightAt(10, -10), 0);
  assert.deepEqual(t.normalAt(1, 2), { x: -0, y: 1, z: -0 });
});
