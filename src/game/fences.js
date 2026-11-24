// AP7f: the fences of a hole (DESIGN §8b "Fences"). The list is the hole's scenery.fences (plus the dev overlay with
// ?biome=test-fences, src/holes/dev-fences.js); only the looks the drawn set offers are drawn (a ?biome= override to
// a set without one skips it, with a console note). Each fence is laid on the drawn ground at FENCE_SCALE
// (core/fences.js layFence: posts sunk, rails sheared to the slope); all fences of one look are merged into ONE static
// mesh (one draw call per look per hole). Flat-shaded toon, fogged. Looks only: no collider, no physics. Everything is
// in the hole's scene (disposeScene frees it).
import * as THREE from 'three';
import { bigPropsFor } from '../core/bigProps.js';
import { layFence } from '../core/fences.js';
import { partGeometry } from './bigProps.js';

// list = the fences asked for, heightAt = the drawn ground, biome = the resolved set, look = pieceColours(biome,
// LIBRARY), toon() = the 3-band ramp, scale = FENCE_SCALE. → { drawn, skipped, drawCalls, tris, posts } (tools:
// window.__golf.fences())
export function addFences(scene, hole, list, heightAt, biome, look, toon, scale) {
  const { keep, skipped } = bigPropsFor(list, biome.fences);
  if (skipped.length) console.info(`Pocket Links: biome set "${biome.id}" has no ${[...new Set(skipped.map(f => f.id))].join(', ')}, so ${skipped.length} fence(s) of ${hole.id} are not drawn.`);
  let drawCalls = 0, tris = 0, posts = 0;
  for (const id of [...new Set(keep.map(f => f.id))]) {
    const laid = keep.filter(f => f.id === id).map(f => layFence(id, f.points, heightAt, scale));
    const part = { positions: [], indices: [], w: [], lo: [], hi: [], tris: 0 }; // every fence of this look, one part
    for (const l of laid) {
      const base = part.positions.length / 3;
      part.positions.push(...l.positions); part.w.push(...l.w); part.lo.push(...l.lo); part.hi.push(...l.hi);
      for (const i of l.indices) part.indices.push(i + base);
      part.tris += l.tris;
    }
    const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toon() });
    mat.flatShading = true; // crisp faces (closed parts: one side is enough, SPEC §2)
    const mesh = new THREE.Mesh(partGeometry(part, look('fences', id)), mat);
    mesh.name = `fences: ${id} (toon, merged)`;
    scene.add(mesh);
    drawCalls++; tris += part.tris; posts += laid.reduce((n, l) => n + l.posts, 0);
  }
  return { drawn: keep, skipped, drawCalls, tris, posts };
}
