// Phone performance measuring (AP0): fps, draw calls, triangles, renderer memory and an estimate of
// the graphics memory, checked against PERF_BUDGET (src/core/config.js) by src/core/perf.js.
// Shown in the debug overlay and returned by window.__golf.perf(); tools/perf-check.mjs reads it.
//
// Per frame (frame(), after the render) it only copies a few numbers from renderer.info: no
// allocation. The memory estimate walks the scene, so it runs only when asked (overlay refresh,
// perf()) and only again when Three.js' geometry / texture counts change.
import * as THREE from 'three';
import { PERF_BUDGET } from '../core/config.js';
import { rate, textureBytes, screenBytes, MB } from '../core/perf.js';

const FPS_SMOOTH_S = 0.5; // s: time constant of the smoothed frame time (fps shown = 1 / that)

export function createPerfMeter(renderer, view) {
  const info = renderer.info;
  let frameS = 0, calls = 0, triangles = 0, peakCalls = 0, peakTriangles = 0;
  let memKey = '', mem = { geoMB: 0, texMB: 0, gpuMB: 0, textureSize: 0, mapSize: 0, textures: 0 };

  // Called once per frame right after renderer.render (renderer.info.render holds that frame)
  function frame(rawDt) {
    if (rawDt > 0) frameS = frameS ? frameS + (rawDt - frameS) * Math.min(1, rawDt / FPS_SMOOTH_S) : rawDt;
    calls = info.render.calls; triangles = info.render.triangles;
    if (calls > peakCalls) peakCalls = calls;
    if (triangles > peakTriangles) peakTriangles = triangles;
  }

  // Geometry + texture bytes of everything in the scene (shared objects counted once)
  function memory() {
    const v = view();
    const key = v ? `${v.scene.uuid}:${info.memory.geometries}:${info.memory.textures}` : '';
    if (key === memKey) return mem;
    memKey = key;
    const geos = new Set(), texs = new Set();
    let geo = 0;
    v?.scene.traverse(o => {
      if (o.geometry && !geos.has(o.geometry)) {
        geos.add(o.geometry);
        const g = o.geometry;
        for (const a of Object.values(g.attributes)) geo += a.array?.byteLength ?? 0;
        geo += g.index?.array.byteLength ?? 0;
      }
      if (o.isInstancedMesh) geo += o.instanceMatrix.array.byteLength + (o.instanceColor?.array.byteLength ?? 0);
      for (const m of [].concat(o.material ?? [])) for (const t of Object.values(m)) if (t?.isTexture) texs.add(t);
    });
    if (v?.scene.background?.isTexture) texs.add(v.scene.background);
    let tex = 0, size = 0, mapSize = 0;
    for (const t of texs) {
      const img = t.image, w = img?.width ?? 0, h = img?.height ?? 0;
      tex += textureBytes(w, h, t.generateMipmaps && t.minFilter !== THREE.LinearFilter && t.minFilter !== THREE.NearestFilter);
      // PM on #75: the painted course map (scene.js) is an exception until AP6: its size is shown
      // apart, unrated (its memory still counts in gpuMB)
      if (t.userData?.courseMap) mapSize = Math.max(mapSize, w, h);
      else size = Math.max(size, w, h);
    }
    mem = { geoMB: geo / MB, texMB: tex / MB, gpuMB: (geo + tex) / MB, textureSize: size, mapSize, textures: texs.size };
    return mem;
  }

  // Draw calls the debug collider outlines (K5) add while the overlay is open (an upper bound:
  // outlines out of view are not drawn)
  function outlineCalls() {
    let n = 0;
    view()?.scene.traverseVisible(o => { if (o.isLineSegments) n++; });
    return n;
  }

  // The screen buffers (drawing buffer size × colour + depth, × MSAA samples), estimated
  let samples = null;
  function screenMB() {
    if (samples === null) { try { const gl = renderer.getContext(); samples = gl.getParameter(gl.SAMPLES) | 0; } catch { samples = 0; } }
    const c = renderer.domElement;
    return screenBytes(c.width, c.height, samples) / MB;
  }

  // Everything, as plain numbers (allocates; on demand only)
  function numbers() {
    const m = memory();
    const n = {
      fps: frameS > 0 ? 1 / frameS : 0, frameMs: frameS * 1000,
      drawCalls: calls, triangles, peakDrawCalls: peakCalls, peakTriangles,
      geometries: info.memory.geometries, textures: info.memory.textures, programs: info.programs?.length ?? 0,
      gpuMB: m.gpuMB, geoMB: m.geoMB, texMB: m.texMB, textureSize: m.textureSize, mapSize: m.mapSize, outlineCalls: outlineCalls(),
      screenMB: screenMB(), // PM on #75: unrated, not part of the per-hole budget
    };
    n.rating = rate(n);
    return n;
  }

  // Draw calls by kind of object in the current view (for AP1): visible meshes, lines and points
  // grouped by name (or object / geometry / material type), with how many are inside the camera's view.
  function breakdown() {
    const v = view();
    if (!v) return [];
    v.camera.updateMatrixWorld();
    const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(v.camera.projectionMatrix, v.camera.matrixWorldInverse));
    const rows = new Map();
    v.scene.traverseVisible(o => {
      if (!(o.isMesh || o.isLine || o.isPoints || o.isSprite)) return;
      const mats = [].concat(o.material);
      // the names scene.js gives (terrain, OB stake, cloud puff…); other objects (ball, flag, aim marks) by type
      const key = o.name || `${o.type} ${o.geometry?.type ?? '?'} ${mats.map(m => m.type).join('+')}`;
      const g = o.geometry, tri = o.isMesh && g ? (g.index ? g.index.count : g.attributes.position?.count ?? 0) / 3 : 0;
      const n = o.isInstancedMesh ? o.count : 1;
      const r = rows.get(key) ?? { kind: key, objects: 0, inView: 0, triangles: 0, materials: new Set() };
      r.objects++;
      if (!o.frustumCulled || fr.intersectsObject(o)) { r.inView++; r.triangles += tri * n; }
      for (const m of mats) r.materials.add(m.uuid);
      rows.set(key, r);
    });
    return [...rows.values()].map(r => ({ ...r, materials: r.materials.size })).sort((a, b) => b.inView - a.inView);
  }

  // The overlay block: a few lines whose values are coloured ok / warn (fps only) / over against the
  // budget; the course map and the screen buffers are shown unrated (grey / plain). Built
  // once into `el`, then only the texts and classes change.
  let spans = null;
  function renderInto(el) {
    if (!spans) {
      spans = {};
      const add = (label, key, after = '') => {
        el.append(label);
        const s = document.createElement('span'); el.append(s); spans[key] = s;
        if (after) el.append(after);
      };
      const B = PERF_BUDGET;
      add('fps    ', 'fps'); add('', 'frameMs', '\n');
      add('draws  ', 'drawCalls', ` / ${B.drawCalls}`); add('  ', 'outlines', '\n');
      add('tris   ', 'triangles', ` / ${B.triangles / 1000}k`); add('  peak ', 'peak', '\n');
      add('mem    ', 'geometries', ' geo  '); add('', 'textures', ' tex  ');
      add('', 'textureSize', ' px max'); add('', 'mapSize');
      add('\ngpu    ~', 'gpuMB', ` / ${B.gpuMB} MB`); add('', 'memParts', '\n');
      add('screen ≈ ', 'screenMB', ' MB');
    }
    const n = numbers(), r = n.rating;
    const set = (key, text) => {
      const s = spans[key];
      s.textContent = text;
      s.className = r[key] ? `perf-${r[key]}` : '';
    };
    set('fps', n.fps.toFixed(0)); set('frameMs', `  (${n.frameMs.toFixed(1)} ms)`);
    set('drawCalls', String(n.drawCalls));
    set('outlines', n.outlineCalls ? `(incl. ≤ ${n.outlineCalls} debug outlines)` : '');
    set('triangles', `${(n.triangles / 1000).toFixed(1)}k`);
    set('peak', `${n.peakDrawCalls} draws ${(n.peakTriangles / 1000).toFixed(0)}k tris`);
    set('geometries', String(n.geometries)); set('textures', String(n.textures));
    set('textureSize', String(n.textureSize));
    set('mapSize', n.mapSize ? `\nmap (AP6) ${n.mapSize} px` : ''); spans.mapSize.className = 'perf-na'; // grey, unrated until AP6
    set('screenMB', n.screenMB.toFixed(1));
    set('gpuMB', n.gpuMB.toFixed(1)); set('memParts', `  (geo ${n.geoMB.toFixed(1)}, tex ${n.texMB.toFixed(1)})`);
  }

  return {
    frame, numbers, breakdown, renderInto,
    resetPeak() { peakCalls = 0; peakTriangles = 0; },
  };
}
