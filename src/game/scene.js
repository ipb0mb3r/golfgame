// Renderer, lights, sky, the terrain mesh (built from the hole's heightAt) and the scenery.
import * as THREE from 'three';
import { createRng } from '../core/rng.js';
import { TUNE } from '../core/config.js';
import { meshAxis as axis } from '../core/terrain.js';

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
  ground.rotation.x = -Math.PI / 2; ground.position.y = sc.ground.y;
  scene.add(ground);

  // The terrain: a grid whose heights come from heightAt, with the painted course on it
  {
    const XS = axis(sc.mesh.xs), ZS = axis(sc.mesh.zs);
    const nx = XS.length, nz = ZS.length;
    const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = XS[i], z = ZS[j], k = j * nx + i;
      pos[k * 3] = x; pos[k * 3 + 1] = heightAt(x, z); pos[k * 3 + 2] = z;
      uv[k * 2] = (x - map.x0) / (map.x1 - map.x0);
      uv[k * 2 + 1] = (map.z1 - z) / (map.z1 - map.z0);
    }
    const idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
    let p = 0;
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      idx[p++] = a; idx[p++] = c; idx[p++] = b;
      idx[p++] = b; idx[p++] = c; idx[p++] = d;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    const tex = new THREE.CanvasTexture(courseCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex })));
  }

  // Water surface (holes whose pond sits in a bowl)
  if (sc.water) {
    const w = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshLambertMaterial({ color: 0x3f8fd8, transparent: true, opacity: 0.88 }));
    w.rotation.x = -Math.PI / 2; w.scale.set(sc.water.rx * sc.water.scale, sc.water.rz * sc.water.scale, 1);
    w.position.set(sc.water.cx, sc.water.y, sc.water.cz);
    scene.add(w);
  }

  // Tee markers
  for (const sx of [-2.6, 2.6]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), new THREE.MeshLambertMaterial({ color: sc.teeColor }));
    m.position.set(hole.tee.x + sx, heightAt(hole.tee.x + sx, hole.tee.z - 1.2) + 0.14, hole.tee.z - 1.2); scene.add(m);
  }
  // White out-of-bounds stakes
  {
    const stakeGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 6);
    const stakeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const st = sc.stakes;
    for (let z = st.z0; z > st.z1; z -= st.step) for (const sx of st.xs ?? [-st.x, st.x]) {
      const s = new THREE.Mesh(stakeGeo, stakeMat); s.position.set(sx, heightAt(sx, z) + 0.5, z); scene.add(s);
    }
  }
  addTrees(scene, sc.trees, heightAt, terrain.surfaceAt);
  const colliderOutlines = addObstacles(scene, obstacles);
  addBackdrop(scene, sc);
  return { scene, camera, colliderOutlines };
}

// K5: the trees and boulders in play, from the same colliders the physics uses. A trunk mesh is the
// trunk cylinder (plus a bit below the ground), the leaves are the canopy ellipsoid, a boulder is its
// sphere. Returns a group of wireframe outlines of the colliders themselves (grown by nothing: the
// shapes as the data gives them), hidden until the debug overlay shows them.
function addObstacles(scene, obstacles) {
  const outlines = new THREE.Group();
  outlines.visible = false;
  if (!obstacles.length) { scene.add(outlines); return outlines; }
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2b });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f6b34, flatShading: true });
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x8d8a82, flatShading: true });
  const trunkGeo = new THREE.CylinderGeometry(1, 1, 1, 10); trunkGeo.translate(0, 0.5, 0);
  const leafGeo = new THREE.IcosahedronGeometry(1, 2);
  const rockGeo = new THREE.IcosahedronGeometry(1, 2);
  const line = c => new THREE.LineBasicMaterial({ color: c, depthTest: false, transparent: true, opacity: 0.9 });
  const wireCyl = new THREE.WireframeGeometry(trunkGeo), wireBall = new THREE.WireframeGeometry(new THREE.SphereGeometry(1, 16, 10));
  const trunkLine = line(0xff4040), leafLine = line(0xffe040), rockLine = line(0x40e0ff);
  const col = new THREE.Color(), r = createRng(77);
  const SINK = 0.5; // m of trunk drawn below the ground, so it never floats on a slope
  for (const o of obstacles) {
    if (o.type === 'tree') {
      const h = o.top - o.y0 + SINK;
      const t = new THREE.Mesh(trunkGeo, trunkMat); t.scale.set(o.r, h, o.r); t.position.set(o.x, o.y0 - SINK, o.z);
      const c = o.canopy;
      const leafM = leafMat.clone(); leafM.color.copy(col.setHSL(0.3 + r() * 0.06, 0.45, 0.24 + r() * 0.08));
      const l = new THREE.Mesh(leafGeo, leafM); l.scale.set(c.rx, c.ry, c.rx); l.position.set(c.x, c.y, c.z);
      l.rotation.y = r() * 6.28;
      scene.add(t, l);
      const tw = new THREE.LineSegments(wireCyl, trunkLine); tw.scale.set(o.r, o.top - o.y0, o.r); tw.position.set(o.x, o.y0, o.z);
      const lw = new THREE.LineSegments(wireBall, leafLine); lw.scale.set(c.rx, c.ry, c.rx); lw.position.set(c.x, c.y, c.z);
      outlines.add(tw, lw);
    } else {
      const b = new THREE.Mesh(rockGeo, rockMat); b.scale.setScalar(o.r); b.position.set(o.x, o.y, o.z);
      b.rotation.set(r() * 6.28, r() * 6.28, 0);
      scene.add(b);
      const bw = new THREE.LineSegments(wireBall, rockLine); bw.scale.setScalar(o.r); bw.position.set(o.x, o.y, o.z);
      outlines.add(bw);
    }
  }
  for (const o of outlines.children) o.renderOrder = 10;
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
  scene.add(trunks, leaves);
}

// Distant hills and clouds
function addBackdrop(scene, sc) {
  const hl = sc.hills, cl = sc.clouds;
  const hillMat = new THREE.MeshLambertMaterial({ color: 0x4f8a45 });
  const r = createRng(9);
  for (let i = 0; i < hl.count; i++) {
    const a = (i / hl.count) * Math.PI * 2, d = hl.dist[0] + r() * hl.dist[1];
    const h = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), hillMat);
    h.scale.set(hl.xz[0] + r() * hl.xz[1], hl.y[0] + r() * hl.y[1], hl.xz[0] + r() * hl.xz[1]);
    h.position.set(Math.sin(a) * d, hl.posY, hl.cz + Math.cos(a) * d);
    scene.add(h);
  }
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
  for (let i = 0; i < cl.count; i++) {
    const g = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(6 + r() * 6, 12, 8), cloudMat);
      p.position.set(k * 9 - 13, r() * 3, r() * 6); p.scale.y = 0.55; g.add(p);
    }
    g.position.set((r() - 0.5) * cl.xSpan, cl.y[0] + r() * cl.y[1], cl.cz - (r() - cl.zOff) * cl.zSpan);
    scene.add(g);
  }
}
