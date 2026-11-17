// Terrain helpers (DESIGN.md §5). A hole supplies heightAt(x, z) and surfaceAt(x, z);
// the engine derives slopes and normals from heightAt. Holes never compute normals themselves.
import { GRAD_EPS } from './config.js';

// Smoothstep from e0 to e1
export const ss = (e0, e1, x) => { const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t); };

// Squared "ellipse distance" of (x, z) from ellipse e = { cx, cz, rx, rz } (1 = on the edge). grow widens it.
export function ell(x, z, e, grow = 0) {
  const dx = (x - e.cx) / (e.rx + grow), dz = (z - e.cz) / (e.rz + grow);
  return dx * dx + dz * dz;
}

// Gaussian hill (h > 0) or dip (h < 0) of radius r centred on (b.x, b.z)
export function bump(x, z, b) {
  const dx = x - b.x, dz = z - b.z;
  return b.h * Math.exp(-(dx * dx + dz * dz) / (b.r * b.r));
}

// Build the terrain functions for a hole. A hole without heightAt is flat.
export function makeTerrain(hole) {
  const heightAt = hole.heightAt ? (x, z) => hole.heightAt(x, z) : () => 0;
  const surfaceAt = (x, z) => hole.surfaceAt(x, z);
  // Slope (rise per meter) in x and z
  function gradAt(x, z) {
    const e = GRAD_EPS;
    return {
      x: (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e),
      z: (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e),
    };
  }
  // Unit surface normal
  function normalAt(x, z) {
    const g = gradAt(x, z);
    const nx = -g.x, ny = 1, nz = -g.z;
    const inv = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1);
    return { x: nx * inv, y: ny * inv, z: nz * inv };
  }
  return { heightAt, gradAt, normalAt, surfaceAt };
}

// The x (or z) coordinates of a terrain grid from [start, end, step] parts (hole.scenery.mesh.xs / zs).
// The 3D scene draws its terrain mesh on exactly these points, and validateHole checks the
// background ground plane against the same points (K13), so both see the same drawn surface.
export function meshAxis(parts) {
  const out = [];
  for (const [a, b, step] of parts) for (let v = a; v < b - 1e-6; v += step) out.push(+v.toFixed(3));
  out.push(parts[parts.length - 1][1]);
  return out;
}
