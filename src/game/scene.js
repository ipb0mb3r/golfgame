// Renderer, lights, sky, the terrain mesh (built from the hole's heightAt) and the scenery.
import * as THREE from 'three';
import { createRng } from '../core/rng.js';
import { TUNE } from '../core/config.js';
import { buildTerrainMesh } from '../core/terrainMesh.js';

// Quality (Gate A C4): ?tune=DPR_CAP:1 renders fewer pixels, ?tune=ANTIALIAS:0 turns MSAA off.
// Throws when WebGL isn't available (main.js shows a plain message, Gate A C2).
export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: TUNE.ANTIALIAS >= 0.5 });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, TUNE.DPR_CAP));
  return renderer;
}

// Free everything a hole's scene holds on the GPU (Gate A A2): geometries, materials, their
// textures, instanced meshes. Shared objects are freed once. The scene is empty afterwards.
export function disposeScene(scene) {
  const done = new Set();
  const free = o => { if (o && !done.has(o)) { done.add(o); o.dispose(); } };
  scene.traverse(obj => {
    free(obj.geometry);
    for (const m of [].concat(obj.material ?? [])) {
      for (const v of Object.values(m)) if (v && v.isTexture) free(v);
      free(m);
    }
    if (obj.isInstancedMesh) obj.dispose();
  });
  scene.clear();
}

// obstacles = play.obstacles (core/obstacles.js colliders): drawn from exactly the shapes the ball hits (K5)
export function buildScene(renderer, hole, terrain, courseCanvas, obstacles = []) {
  const sc = hole.scenery, map = hole.map;
  const { heightAt } = terrain;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(sc.sky);
  scene.fog = new THREE.Fog(sc.sky, sc.fog[0], sc.fog[1]);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.05, sc.cameraFar);

  scene.add(new THREE.HemisphereLight(0xdff2ff, 0x3a5a2a, sc.hemi));
  const sun = new THREE.DirectionalLight(0xfff3dd, sc.sun.intensity);
  sun.position.set(...sc.sun.pos);
  scene.add(sun);

  // Far-away flat ground under everything. K13: it sits below the lowest point of the terrain mesh
  // (validateHole checks it), so it never pokes through a hollow and hides the course or the ball.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(sc.ground.size, sc.ground.size), new THREE.MeshLambertMaterial({ color: 0x3d7a30 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = sc.ground.y; ground.name = 'far ground';
  scene.add(ground);

  // The terrain: tiles whose heights come from heightAt, 1 m cells around the play area and coarser
  // far away (AP1b, core/terrainMesh.js), with the painted course on it. One geometry, one draw call.
  {
    const m = buildTerrainMesh(hole, terrain);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(m.uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(m.index, 1));
    const tex = new THREE.CanvasTexture(courseCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.userData.courseMap = true; // AP1: the perf overlay shows this one apart ("map (AP6)"), unrated until AP6
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex }));
    mesh.name = 'terrain'; // AP0: names only label the draw-call breakdown (window.__golf.perfBreakdown)
    scene.add(mesh);
  }

  // Water surface (holes whose pond sits in a bowl)
  if (sc.water) {
    const w = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshLambertMaterial({ color: 0x3f8fd8, transparent: true, opacity: 0.88 }));
    w.rotation.x = -Math.PI / 2; w.scale.set(sc.water.rx * sc.water.scale, sc.water.rz * sc.water.scale, 1);
    w.position.set(sc.water.cx, sc.water.y, sc.water.cz); w.name = 'water';
    scene.add(w);
  }

  // Tee markers and the white out-of-bounds stakes: one instanced draw call each (AP1)
  {
    const pose = new THREE.Object3D(), tees = [];
    for (const sx of [-2.6, 2.6]) {
      pose.position.set(hole.tee.x + sx, heightAt(hole.tee.x + sx, hole.tee.z - 1.2) + 0.14, hole.tee.z - 1.2);
      tees.push(matrixOf(pose));
    }
    scene.add(instanced(new THREE.SphereGeometry(0.14, 12, 8), new THREE.MeshLambertMaterial({ color: sc.teeColor }), tees, 'tee markers (instanced)'));
    const st = sc.stakes, stakes = [];
    for (let z = st.z0; z > st.z1; z -= st.step) for (const sx of st.xs ?? [-st.x, st.x]) {
      pose.position.set(sx, heightAt(sx, z) + 0.5, z);
      stakes.push(matrixOf(pose));
    }
    scene.add(instanced(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }), stakes, 'OB stakes (instanced)'));
  }
  addTrees(scene, sc.trees, heightAt, terrain.surfaceAt);
  const colliderOutlines = addObstacles(scene, obstacles);
  addBackdrop(scene, sc);
  return { scene, camera, colliderOutlines };
}

// AP1 (fewer draw calls): every repeated object is one InstancedMesh (one draw call for all of them),
// with one geometry and one material. `matrices` = the instances' local matrices (matrixOf below),
// `colors` (optional) = a THREE.Color per instance, multiplied with the material's colour.
function instanced(geo, mat, matrices, name, colors = null) {
  const m = new THREE.InstancedMesh(geo, mat, matrices.length);
  matrices.forEach((x, i) => m.setMatrixAt(i, x));
  if (colors) colors.forEach((c, i) => m.setColorAt(i, c));
  m.name = name; // AP0: names only label the draw-call breakdown (window.__golf.perfBreakdown)
  return m;
}
// The matrix a mesh with this position / rotation / scale would have (so an instance sits exactly
// where the separate mesh used to)
const matrixOf = o => { o.updateMatrix(); return o.matrix.clone(); };
// AP1: many copies of one line geometry, each moved by its matrix, baked into ONE LineSegments
// (debug collider outlines: one draw call per kind instead of one per collider)
function bakedLines(geo, matrices, mat, name) {
  const src = geo.attributes.position, n = src.count, out = new Float32Array(n * 3 * matrices.length), v = new THREE.Vector3();
  matrices.forEach((m, k) => {
    for (let i = 0; i < n; i++) v.fromBufferAttribute(src, i).applyMatrix4(m).toArray(out, (k * n + i) * 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(out, 3));
  const l = new THREE.LineSegments(g, mat);
  l.renderOrder = 10; l.name = name;
  return l;
}

// K5: the trees and boulders in play, from the same colliders the physics uses. A trunk mesh is the
// trunk cylinder (plus a bit below the ground), the leaves are the canopy ellipsoid, a boulder is its
// sphere. Returns a group of wireframe outlines of the colliders themselves (grown by nothing: the
// shapes as the data gives them), hidden until the debug overlay shows them.
// AP1: all trunks are one instanced draw call, all canopies another (each tree keeps its own shade of
// green as an instance colour), all boulders a third; the outlines are one draw call per kind.
function addObstacles(scene, obstacles) {
  const outlines = new THREE.Group();
  outlines.visible = false;
  if (!obstacles.length) { scene.add(outlines); return outlines; }
  const trunkGeo = new THREE.CylinderGeometry(1, 1, 1, 10); trunkGeo.translate(0, 0.5, 0);
  const line = c => new THREE.LineBasicMaterial({ color: c, depthTest: false, transparent: true, opacity: 0.9 });
  const pose = new THREE.Object3D(), r = createRng(77);
  const trunks = [], leaves = [], leafColors = [], rocks = [], trunkLines = [], leafLines = [], rockLines = [];
  const SINK = 0.5; // m of trunk drawn below the ground, so it never floats on a slope
  // One pose: position, rotation, scale → its matrix (rotation reset each time)
  const at = (x, y, z, sx, sy, sz, rx = 0, ry = 0) => {
    pose.position.set(x, y, z); pose.rotation.set(rx, ry, 0); pose.scale.set(sx, sy, sz);
    return matrixOf(pose);
  };
  for (const o of obstacles) { // in the data's order, so the random shades and turns are the same as before
    if (o.type === 'tree') {
      const h = o.top - o.y0 + SINK, c = o.canopy;
      trunks.push(at(o.x, o.y0 - SINK, o.z, o.r, h, o.r));
      leafColors.push(new THREE.Color().setHSL(0.3 + r() * 0.06, 0.45, 0.24 + r() * 0.08));
      leaves.push(at(c.x, c.y, c.z, c.rx, c.ry, c.rx, 0, r() * 6.28));
      trunkLines.push(at(o.x, o.y0, o.z, o.r, o.top - o.y0, o.r));
      leafLines.push(at(c.x, c.y, c.z, c.rx, c.ry, c.rx));
    } else {
      rocks.push(at(o.x, o.y, o.z, o.r, o.r, o.r, r() * 6.28, r() * 6.28));
      rockLines.push(at(o.x, o.y, o.z, o.r, o.r, o.r));
    }
  }
  if (trunks.length) {
    // the canopy material is white: each instance's colour is its shade of green
    scene.add(instanced(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x6b4a2b }), trunks, 'tree trunks (in play, instanced)'));
    scene.add(instanced(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), leaves, 'tree canopies (in play, instanced)', leafColors));
  }
  if (rocks.length) scene.add(instanced(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshLambertMaterial({ color: 0x8d8a82, flatShading: true }), rocks, 'boulders (instanced)'));
  const wireCyl = new THREE.WireframeGeometry(trunkGeo), ball = new THREE.SphereGeometry(1, 16, 10), wireBall = new THREE.WireframeGeometry(ball);
  if (trunkLines.length) outlines.add(bakedLines(wireCyl, trunkLines, line(0xff4040), 'collider outlines: trunks (debug)'), bakedLines(wireBall, leafLines, line(0xffe040), 'collider outlines: leaves (debug)'));
  if (rockLines.length) outlines.add(bakedLines(wireBall, rockLines, line(0x40e0ff), 'collider outlines: boulders (debug)'));
  if (!trunks.length) trunkGeo.dispose();
  wireCyl.dispose(); ball.dispose(); wireBall.dispose(); // only copied from, never drawn
  scene.add(outlines);
  return outlines;
}

// Decoration trees (instanced so hundreds are cheap), standing on the ground. K8: only outside the
// OB line; every tree in play is an obstacle in the hole data (drawn by addObstacles).
function addTrees(scene, t, heightAt, surfaceAt) {
  const r = createRng(42);
  const spots = [];
  let guard = 0;
  while (spots.length < t.count && guard++ < 20000) {
    const x = (r() - 0.5) * t.xSpan, z = t.zTop - r() * t.zSpan;
    if (t.exclude(x, z)) continue;
    spots.push([x, z, 0.8 + r() * 0.7]);
  }
  for (let i = spots.length - 1; i >= 0; i--) if (surfaceAt(spots[i][0], spots[i][1]) !== 'ob') spots.splice(i, 1);
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 3, 6); trunkGeo.translate(0, 1.5, 0);
  const leafGeo = new THREE.ConeGeometry(2.4, 6, 7); leafGeo.translate(0, 5.5, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x6b4a2b }), spots.length);
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshLambertMaterial({ color: 0x2f6b34, flatShading: true }), spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s3 = new THREE.Vector3();
  const col = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
  spots.forEach(([x, z, s], i) => {
    q.setFromAxisAngle(up, r() * 6.28);
    m.compose(v.set(x, heightAt(x, z) - t.sink, z), q, s3.set(s, s, s));
    trunks.setMatrixAt(i, m); leaves.setMatrixAt(i, m);
    leaves.setColorAt(i, col.setHSL(0.3 + r() * 0.06, 0.45, 0.25 + r() * 0.1));
  });
  trunks.name = 'scenery trees: trunks (instanced)'; leaves.name = 'scenery trees: leaves (instanced)';
  scene.add(trunks, leaves);
}

// Distant hills and clouds. AP1: all hills are one instanced draw call, all cloud puffs another
// (a puff is the unit sphere scaled to its radius, flattened as before).
function addBackdrop(scene, sc) {
  const hl = sc.hills, cl = sc.clouds;
  const r = createRng(9), pose = new THREE.Object3D();
  const hills = [];
  for (let i = 0; i < hl.count; i++) {
    const a = (i / hl.count) * Math.PI * 2, d = hl.dist[0] + r() * hl.dist[1];
    pose.scale.set(hl.xz[0] + r() * hl.xz[1], hl.y[0] + r() * hl.y[1], hl.xz[0] + r() * hl.xz[1]);
    pose.position.set(Math.sin(a) * d, hl.posY, hl.cz + Math.cos(a) * d);
    hills.push(matrixOf(pose));
  }
  if (hills.length) scene.add(instanced(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshLambertMaterial({ color: 0x4f8a45 }), hills, 'hills (instanced)'));
  const puffs = [];
  for (let i = 0; i < cl.count; i++) {
    const cloud = [];
    for (let k = 0; k < 4; k++) {
      const rad = 6 + r() * 6;
      cloud.push({ rad, x: k * 9 - 13, y: r() * 3, z: r() * 6 });
    }
    const gx = (r() - 0.5) * cl.xSpan, gy = cl.y[0] + r() * cl.y[1], gz = cl.cz - (r() - cl.zOff) * cl.zSpan;
    for (const p of cloud) {
      pose.position.set(gx + p.x, gy + p.y, gz + p.z); pose.scale.set(p.rad, p.rad * 0.55, p.rad);
      puffs.push(matrixOf(pose));
    }
  }
  if (puffs.length) scene.add(instanced(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), puffs, 'cloud puffs (instanced)'));
}
