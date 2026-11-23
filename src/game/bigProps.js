// AP7e: the hand-placed big props of a hole (DESIGN §8b "Big props"): windmill, chalets, beach hut, beyond OB only.
// The list is the hole's scenery.bigProps (plus the dev overlay with ?biome=test-big-props, src/holes/dev-big-props.js);
// only the pieces the drawn set offers are drawn (a ?biome= override to a set without one skips it, with a console
// note). Each stands at the lowest ground under its footprint (core/bigProps.js placeBigProps). Flat-shaded toon,
// fogged, one instanced draw call per piece part (the windmill's sails are their own part). Looks only: no collider,
// no physics, never hidden by the small-props ball rule. Everything is in the hole's scene (disposeScene frees it).
import * as THREE from 'three';
import { mixHex } from '../core/backdrop.js';
import { bigPropsFor, placeBigProps } from '../core/bigProps.js';
import { bigPropShape } from '../core/bigPropShapes.js';

// list = the props asked for, biome = the resolved set, look = pieceColours(biome, LIBRARY), toon() = the 3-band ramp.
// → { drawn, skipped, drawCalls, tris } (for tools: window.__golf.bigProps())
export function addBigProps(scene, hole, list, heightAt, biome, look, toon) {
  const { keep, skipped } = bigPropsFor(list, biome.bigProps);
  if (skipped.length) console.info(`Pocket Links: biome set "${biome.id}" has no ${[...new Set(skipped.map(p => p.id))].join(', ')}, so ${skipped.length} big prop(s) of ${hole.id} are not drawn.`);
  const placed = placeBigProps(keep, heightAt), ids = [...new Set(placed.map(p => p.id))];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let drawCalls = 0, tris = 0;
  for (const id of ids) {
    const copies = placed.filter(p => p.id === id), shape = bigPropShape(id), colours = look('bigProps', id);
    for (const [name, part] of Object.entries(shape.parts)) {
      const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toon(), side: THREE.DoubleSide });
      mat.flatShading = true; // crisp faces (the face normal per pixel; MeshToonMaterial takes it set, not as an option)
      const mesh = new THREE.InstancedMesh(partGeometry(part, colours), mat, copies.length);
      copies.forEach((p, i) => mesh.setMatrixAt(i, m.compose(v.set(p.x, p.y, p.z), q.setFromAxisAngle(up, p.turn), s.setScalar(p.scale))));
      mesh.computeBoundingSphere();
      mesh.name = `big props: ${id} ${name} (toon, instanced)`;
      scene.add(mesh);
      drawCalls++; tris += part.tris * copies.length;
    }
  }
  return { drawn: placed, skipped, drawCalls, tris };
}

// A core/bigPropShapes.js part → an indexed geometry, each vertex coloured mix(slot lo, slot hi, w) (sRGB)
function partGeometry(part, colours) {
  const n = part.w.length, col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) c.set(mixHex(colours[part.lo[i]], colours[part.hi[i]], part.w[i])).toArray(col, i * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(part.positions, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(part.indices); // no normals: flat shading takes each face's own
  return g;
}
