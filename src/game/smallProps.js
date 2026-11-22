// AP7c: the small props of a hole (DESIGN §8b "Small props"): the biome set's rule scattered once when the hole
// is built (core/smallProps.js scatterSmallProps, always the same for a hole), drawn instanced, one draw call
// per pick. Each frame (when the camera or the ball has moved) the props to draw are picked again
// (core/smallProps.js visibleSmallProps): the nearest within SMALL_PROPS.drawDist, at most SMALL_PROPS.maxTris
// triangles, and never one that could hide the ball (owner: no blind shots). Looks only: no physics.
// Everything is in the hole's scene, so disposeScene frees it with the hole (no timers, no listeners).
import * as THREE from 'three';
import { SMALL_PROPS, TUNE } from '../core/config.js';
import { scatterSmallProps, smallPropPart, visibleSmallProps } from '../core/smallProps.js';

// biome = the resolved set (its smallProps normalized), look = pieceColours(biome, LIBRARY), keep(x, z) = an
// extra test (the ocean's beach). → { update(camPos, ballPos), stats() } or null when the set scatters nothing.
export function addSmallProps(scene, hole, terrain, biome, look, keep) {
  const rule = biome.smallProps;
  if (!rule?.pieces.length) return null;
  const props = scatterSmallProps(hole, { heightAt: terrain.heightAt, surfaceAt: terrain.surfaceAt, rule, keep });
  if (!props.length) return null;
  const parts = rule.pieces.map(p => smallPropPart(p.id)), part = pick => parts[pick];
  // each copy's matrix, once
  const mats = new Float32Array(props.length * 16), m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  props.forEach((p, i) => m.compose(v.set(p.x, p.y, p.z), q.setFromAxisAngle(up, p.yaw), s.setScalar(p.scale)).toArray(mats, i * 16));
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const meshes = rule.pieces.map((pick, k) => {
    const n = props.filter(p => p.pick === k).length;
    const cap = Math.min(n, Math.floor(SMALL_PROPS.maxTris / parts[k].tris));
    if (!cap) return null;
    const mesh = new THREE.InstancedMesh(propGeometry(parts[k], look('smallProps', pick)), material, cap);
    mesh.count = 0;
    mesh.frustumCulled = false; // its copies change with the camera: the bounding sphere would be stale
    mesh.name = `small props: ${pick.id}${rule.pieces.filter(p => p.id === pick.id).length > 1 ? ` #${k + 1}` : ''} (instanced)`;
    scene.add(mesh);
    return mesh;
  });
  const lastCam = new THREE.Vector3(Infinity, 0, 0), lastBall = new THREE.Vector3(Infinity, 0, 0);
  let drawn = 0, lastClear = -1;
  function update(cam, ball) {
    const clear = TUNE.PROP_BALL_CLEAR, step = SMALL_PROPS.moveStep;
    if (clear === lastClear && lastCam.distanceTo(cam) < step && lastBall.distanceTo(ball) < step / 2) return;
    lastCam.copy(cam); lastBall.copy(ball); lastClear = clear;
    const shown = visibleSmallProps(props, cam, ball, part, { ballClear: clear });
    for (const mesh of meshes) if (mesh) mesh.count = 0;
    for (const i of shown) {
      const mesh = meshes[props[i].pick];
      if (!mesh || mesh.count >= mesh.instanceMatrix.count) continue;
      mesh.instanceMatrix.array.set(mats.subarray(i * 16, i * 16 + 16), mesh.count * 16);
      mesh.count++;
    }
    for (const mesh of meshes) if (mesh) mesh.instanceMatrix.needsUpdate = true;
    drawn = meshes.reduce((n, mesh) => n + (mesh?.count ?? 0), 0);
  }
  // For tools / tests (window.__golf.smallProps()): how many were scattered and drawn, and the props drawn now
  // nearest the ball (3D distance from its centre to the prop's middle)
  function stats(ball) {
    let nearest = Infinity;
    for (const mesh of meshes) if (mesh) for (let j = 0; j < mesh.count; j++) {
      const e = mesh.instanceMatrix.array, x = e[j * 16 + 12], y = e[j * 16 + 13], z = e[j * 16 + 14];
      nearest = Math.min(nearest, Math.hypot(x - ball.x, y - ball.y, z - ball.z));
    }
    return { scattered: props.length, drawn, drawCalls: meshes.filter(Boolean).length, nearestToBall: nearest, tris: meshes.reduce((n, mesh, k) => n + (mesh?.count ?? 0) * parts[k].tris, 0) };
  }
  return { update, stats };
}

// A core/smallProps.js part → a geometry painted per vertex in its slots' colours, every normal straight up
// (lit like the ground under it)
function propGeometry(part, colours) {
  const n = part.slots.length, col = new Float32Array(n * 3), nor = new Float32Array(n * 3), c = new THREE.Color(), cache = new Map();
  part.slots.forEach((slot, i) => {
    if (!cache.has(slot)) cache.set(slot, c.set(colours[slot]).toArray());
    col.set(cache.get(slot), i * 3);
    nor[i * 3 + 1] = 1;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(part.positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
