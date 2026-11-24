// AP7g: the event props of a hole (DESIGN §8b "Event props"): feather flags and pop-up tents. The list is the hole's
// scenery.eventProps (plus the dev overlay with ?biome=test-event-props, src/holes/dev-event-props.js), already scaled
// by EVENT_PROP_SCALE (core/eventProps.js scaleEventProps); only the pieces the drawn set offers are drawn (a ?biome=
// override to a set without one skips it, with a console note). Each stands at the lowest ground under its footprint.
// Flat-shaded toon, fogged, double-sided (the banner and the roof are single sheets); the piece's parts (the banner
// is a part of its own, for a later wind sway) share one geometry, so ONE instanced draw call per piece per hole.
// Looks only: no collider, no physics. Everything is in the hole's scene (disposeScene frees it).
import * as THREE from 'three';
import { bigPropsFor } from '../core/bigProps.js';
import { placeEventProps } from '../core/eventProps.js';
import { eventPropShape } from '../core/eventPropShapes.js';
import { merge } from '../core/bigPropShapes.js';
import { partGeometry } from './bigProps.js';

// → { drawn, skipped, drawCalls, tris } (tools: window.__golf.eventProps())
export function addEventProps(scene, hole, scaled, heightAt, biome, look, toon) {
  const { keep, skipped } = bigPropsFor(scaled, biome.eventProps);
  if (skipped.length) console.info(`Pocket Links: biome set "${biome.id}" has no ${[...new Set(skipped.map(p => p.id))].join(', ')}, so ${skipped.length} event prop(s) of ${hole.id} are not drawn.`);
  const placed = placeEventProps(keep, heightAt);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let drawCalls = 0, tris = 0;
  for (const id of [...new Set(placed.map(p => p.id))]) {
    const copies = placed.filter(p => p.id === id), shape = eventPropShape(id);
    const parts = Object.values(shape.parts), all = merge(parts.map((p, k) => ({ ...p, lo: k, hi: k }))); // one geometry
    all.lo = parts.flatMap(p => p.lo); all.hi = parts.flatMap(p => p.hi);                                 // the slots per vertex
    const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toon(), side: THREE.DoubleSide });
    mat.flatShading = true;
    const mesh = new THREE.InstancedMesh(partGeometry(all, look('eventProps', id)), mat, copies.length);
    copies.forEach((p, i) => mesh.setMatrixAt(i, m.compose(v.set(p.x, p.y, p.z), q.setFromAxisAngle(up, p.turn), s.setScalar(p.scale))));
    mesh.computeBoundingSphere();
    mesh.name = `event props: ${id} (toon, instanced)`;
    scene.add(mesh);
    drawCalls++; tris += shape.tris * copies.length;
  }
  return { drawn: placed, skipped, drawCalls, tris };
}
