// AP7i: the cows drawn (DESIGN §8b "Big props: the cow", docs/art/cow/SPEC.md §5 / §6). Three instanced draw calls
// per hole, whatever the herd: body, head and tail (core/cowShape.js groups). The 3 patch layouts are the same
// vertices with other colours, so the body and head geometries carry all three colour sets and each copy picks its
// own (a per-instance `cowPattern`, read in the vertex shader): no extra triangles, no extra draw calls.
// The head and the tail turn about their pivots: one matrix each per cow per frame (core/cows.js cowMotion), only
// while the cow is on screen and within COW_ANIM_FAR m of the camera (else it holds still). Looks only.
import * as THREE from 'three';
import { mixHex } from '../core/backdrop.js';
import { TUNE, COW } from '../core/config.js';
import { cowGroups, cowHeadPose } from '../core/cowShape.js';
import { cowMotion, cowSeed } from '../core/cows.js';
import { bigPropShape } from '../core/bigPropShapes.js';

// a cow group → a geometry: colour sets per patch layout ('color', 'colorB', 'colorC'), mix(slot lo, slot hi, w)
function groupGeometry(g, colours, layouts) {
  const geo = new THREE.BufferGeometry(), n = g.lo.length, c = new THREE.Color();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(g.positions, 3));
  ['color', 'colorB', 'colorC'].slice(0, layouts).forEach((name, k) => {
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.set(mixHex(colours[g.lo[i]], colours[g.hi[i]], g.ws[k][i])).toArray(col, i * 3);
    geo.setAttribute(name, new THREE.BufferAttribute(col, 3));
  });
  geo.setIndex(g.indices);
  return geo;
}
// the toon material; with `patterned`, each copy takes the colour set of its own layout
function cowMaterial(toon, patterned) {
  const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toon(), side: THREE.DoubleSide });
  mat.flatShading = true;
  if (patterned) {
    mat.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 colorB;\nattribute vec3 colorC;\nattribute float cowPattern;')
        .replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_COLOR\n  vColor.rgb = cowPattern < 0.5 ? color.rgb : (cowPattern < 1.5 ? colorB : colorC);\n#endif');
    };
    mat.customProgramCacheKey = () => 'cow-pattern';
  }
  return mat;
}

// copies = the placed cows ({ x, y, z, turn, scale, pose, pattern }), colours = look('bigProps', 'cow'), toon() = the ramp.
// → { meshes: [body, head, tail], drawCalls, tris, update(t, camera) }
export function addCows(scene, copies, colours, toon) {
  const { groups, tailRoot, tris } = cowGroups(), n = copies.length;
  const base = new THREE.Matrix4(), m = new THREE.Matrix4(), r = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const cows = copies.map((p, i) => ({ ...p, seed: cowSeed(i, p), head: cowHeadPose(p.pose), rest: p.pitch,
    world: new THREE.Matrix4().compose(v.set(p.x, p.y, p.z), q.setFromAxisAngle(up, p.turn), s.setScalar(p.scale)),
    centre: new THREE.Vector3(p.x, p.y + bigPropShape('cow').height * p.scale / 2, p.z), radius: bigPropShape('cow').height * p.scale }));
  const mesh = (name, g, patterned) => {
    const geo = groupGeometry(g, colours, patterned ? 3 : 1);
    if (patterned) geo.setAttribute('cowPattern', new THREE.InstancedBufferAttribute(new Float32Array(cows.map(c => c.pattern)), 1));
    const im = new THREE.InstancedMesh(geo, cowMaterial(toon, patterned), n);
    im.name = `big props: cow ${name} (toon, instanced${patterned ? ', 3 patch layouts' : ''})`;
    scene.add(im);
    return im;
  };
  const body = mesh('body', groups.body, true), head = mesh('head', groups.head, true), tail = mesh('tail', groups.tail, false);
  // the head about its neck pivot (+ = nose down), the tail about its root (tipped back, swished about z)
  const place = (i, { pitch, swish }) => {
    const c = cows[i], [px, py, pz] = c.head.pivot;
    head.setMatrixAt(i, m.multiplyMatrices(c.world, base.makeTranslation(px, py, pz)).multiply(r.makeRotationX(pitch)));
    tail.setMatrixAt(i, m.multiplyMatrices(c.world, base.makeTranslation(tailRoot[0], tailRoot[1], tailRoot[2])).multiply(r.makeRotationZ(swish)).multiply(base.makeRotationX(COW.tailTip)));
  };
  cows.forEach((c, i) => { body.setMatrixAt(i, c.world); place(i, { pitch: c.rest, swish: 0 }); });
  // the bounding spheres cover every pose (the head lifted or down, the tail out): from the still pose, grown a little
  for (const im of [body, head, tail]) { im.computeBoundingSphere(); im.boundingSphere.radius += 2 * Math.max(...cows.map(c => c.scale)); }
  const frustum = new THREE.Frustum(), pv = new THREE.Matrix4(), sphere = new THREE.Sphere();
  return {
    meshes: [body, head, tail], drawCalls: 3, tris: tris * n,
    // t = the clock (s). Only cows on screen and within COW_ANIM_FAR m move; the rest hold their last pose.
    update(t, camera) {
      camera.updateMatrixWorld();
      frustum.setFromProjectionMatrix(pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      let moved = false;
      for (const [i, c] of cows.entries()) {
        if (c.centre.distanceTo(camera.position) > TUNE.COW_ANIM_FAR || !frustum.intersectsSphere(sphere.set(c.centre, c.radius))) continue;
        place(i, cowMotion(t, c, TUNE));
        moved = true;
      }
      if (moved) { head.instanceMatrix.needsUpdate = true; tail.instanceMatrix.needsUpdate = true; }
    },
  };
}
