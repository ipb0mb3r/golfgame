// AP7c / AP7d: the small props of a hole (DESIGN §8b "Small props"): the biome set's rule scattered once when the
// hole is built (core/smallProps.js scatterSmallProps, always the same for a hole), drawn instanced, one draw call
// per pick, toon shaded like the trees. Each frame (when the camera or the ball has moved) the props to draw are
// picked again (core/smallProps.js visibleSmallProps): the nearest within SMALL_PROPS.drawDist, at most
// SMALL_PROPS.maxTris triangles, and never one that could hide the ball (owner: no blind shots). Looks only: no physics.
// Everything is in the hole's scene, so disposeScene frees it with the hole (no timers, no listeners).
import * as THREE from 'three';
import { SMALL_PROPS, TUNE } from '../core/config.js';
import { mixHex } from '../core/backdrop.js';
import { scatterSmallProps, smallPropPart, visibleSmallProps } from '../core/smallProps.js';
import { LIBRARY } from '../biomes/library.js';

// biome = the resolved set (its smallProps normalized), look = pieceColours(biome, LIBRARY), keep(x, z) = an
// extra test (the ocean's beach, clear of trunks and stakes), toon() = the scene's 3-band toon ramp.
// → { update(camera, ballPos), stats(ballPos) } or null when the set scatters nothing.
export function addSmallProps(scene, hole, terrain, biome, look, keep, toon) {
  const rule = biome.smallProps;
  if (!rule?.pieces.length) return null;
  const scaleOf = id => LIBRARY.smallProps[id].scale;
  const props = scatterSmallProps(hole, { heightAt: terrain.heightAt, surfaceAt: terrain.surfaceAt, rule, keep, scaleOf });
  if (!props.length) return null;
  const parts = rule.pieces.map(p => smallPropPart(p.id)), part = pick => parts[pick];
  // each copy's matrix and tint, once
  const mats = new Float32Array(props.length * 16), tints = new Float32Array(props.length * 3);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
  props.forEach((p, i) => {
    m.compose(v.set(p.x, p.y, p.z), q.setFromAxisAngle(up, p.yaw), s.setScalar(p.scale)).toArray(mats, i * 16);
    const shade = LIBRARY.smallProps[rule.pieces[p.pick].id].shade;
    if (shade) tintColour(shade, p.tint, c).toArray(tints, i * 3);
  });
  const ramp = toon();
  const meshes = rule.pieces.map((pick, k) => {
    const n = props.filter(p => p.pick === k).length;
    const cap = Math.min(n, Math.floor(SMALL_PROPS.maxTris / parts[k].tris));
    if (!cap) return null;
    const shade = LIBRARY.smallProps[pick.id].shade;
    const mesh = new THREE.InstancedMesh(propGeometry(parts[k], look('smallProps', pick), shade), propMaterial(ramp, parts[k].doubleSide, !!shade), cap);
    if (shade) mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    mesh.count = 0;
    mesh.frustumCulled = false; // its copies change with the camera: the bounding sphere would be stale
    mesh.name = `small props: ${pick.id}${rule.pieces.filter(p => p.id === pick.id).length > 1 ? ` #${k + 1}` : ''} (toon, instanced)`;
    scene.add(mesh);
    return mesh;
  });
  const lastCam = new THREE.Vector3(Infinity, 0, 0), lastBall = new THREE.Vector3(Infinity, 0, 0), lastDir = new THREE.Vector3(), dir = new THREE.Vector3();
  let drawn = 0, lastClear = -1, lastDist = -1;
  // camera = the hole's camera (its position and view direction), ball = the ball's position
  function update(camera, ball) {
    const clear = TUNE.PROP_BALL_CLEAR, dist = TUNE.PROP_DRAW_DIST, step = SMALL_PROPS.moveStep, cam = camera.position;
    camera.getWorldDirection(dir);
    if (clear === lastClear && dist === lastDist && lastCam.distanceTo(cam) < step && lastBall.distanceTo(ball) < step / 2 && 1 - dir.dot(lastDir) < SMALL_PROPS.turnStep) return;
    lastCam.copy(cam); lastBall.copy(ball); lastDir.copy(dir); lastClear = clear; lastDist = dist;
    const shown = visibleSmallProps(props, cam, ball, part, { ballClear: clear, drawDist: dist, dir });
    for (const mesh of meshes) if (mesh) mesh.count = 0;
    for (const i of shown) {
      const mesh = meshes[props[i].pick];
      if (!mesh || mesh.count >= mesh.instanceMatrix.count) continue;
      mesh.instanceMatrix.array.set(mats.subarray(i * 16, i * 16 + 16), mesh.count * 16);
      mesh.instanceColor?.array.set(tints.subarray(i * 3, i * 3 + 3), mesh.count * 3);
      mesh.count++;
    }
    for (const mesh of meshes) if (mesh) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
    drawn = meshes.reduce((n, mesh) => n + (mesh?.count ?? 0), 0);
  }
  // For tools / tests (window.__golf.smallProps()): how many were scattered and drawn, their triangles, and the
  // drawn prop nearest the ball (3D distance from the ball's centre to the prop's foot)
  function stats(ball) {
    let nearest = Infinity, farthest = 0;
    for (const mesh of meshes) if (mesh) for (let j = 0; j < mesh.count; j++) {
      const e = mesh.instanceMatrix.array, x = e[j * 16 + 12], y = e[j * 16 + 13], z = e[j * 16 + 14];
      nearest = Math.min(nearest, Math.hypot(x - ball.x, y - ball.y, z - ball.z));
      farthest = Math.max(farthest, Math.hypot(x - lastCam.x, y - lastCam.y, z - lastCam.z));
    }
    return { scattered: props.length, drawn, drawCalls: meshes.filter(Boolean).length, nearestToBall: nearest, farthestFromCamera: farthest, tris: meshes.reduce((n, mesh, k) => n + (mesh?.count ?? 0) * parts[k].tris, 0) };
  }
  return { update, stats };
}

// A copy's tint colour (a multiplier on the green slots): the library's tint draw (as the trees' TREE_TINT) taken
// `half` of the way back to white from it (half the spread). t = the prop's two random draws (0..1).
const WHITE = new THREE.Color(1, 1, 1);
function tintColour(shade, t, out) {
  out.setHSL(shade.h[0] + t[0] * shade.h[1], shade.s, shade.l[0] + t[1] * shade.l[1]);
  return out.lerp(WHITE, 1 - shade.half);
}

// Toon in 3 bands (the trees' ramp), white × the vertex colours × the copy's tint on the vertices that take one
// (attribute tintK 1; the flowers and stones keep their exact colour). Thin pieces are drawn from both sides.
function propMaterial(ramp, doubleSide, tinted) {
  const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp, side: doubleSide ? THREE.DoubleSide : THREE.FrontSide });
  if (tinted) {
    mat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float tintK;')
        .replace('#include <color_vertex>', THREE.ShaderChunk.color_vertex.replace('vColor.rgb *= instanceColor.rgb;', 'vColor.rgb *= mix( vec3( 1.0 ), instanceColor.rgb, tintK );'));
    };
    mat.customProgramCacheKey = () => 'smallPropTint';
  }
  return mat;
}

// A core/smallPropShapes.js part → an indexed geometry with smooth normals (soft toon bands), each vertex
// coloured mix(slot lo, slot hi, w) in sRGB (like gradientHex) from the pick's colours, and tintK (1 on a vertex
// whose slot takes the per-copy tint)
function propGeometry(part, colours, shade) {
  const n = part.w.length, col = new Float32Array(n * 3), k = new Float32Array(n), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    c.set(mixHex(colours[part.lo[i]], colours[part.hi[i]], part.w[i])).toArray(col, i * 3);
    k[i] = shade?.slots.includes(part.lo[i]) ? 1 : 0;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(part.positions, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (shade) g.setAttribute('tintK', new THREE.BufferAttribute(k, 1));
  g.setIndex(part.indices);
  g.computeVertexNormals();
  return g;
}
