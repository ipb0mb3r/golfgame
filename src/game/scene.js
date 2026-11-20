// Renderer, lights, sky, the terrain mesh (built from the hole's heightAt) and the scenery.
import * as THREE from 'three';
import { createRng } from '../core/rng.js';
import { TUNE } from '../core/config.js';
import { buildTerrainMesh } from '../core/terrainMesh.js';
import { sceneLight, holeTreeLooks, pieceColours } from '../core/biome.js';
import { LIBRARY } from '../biomes/library.js';

// Quality (Gate A C4): ?tune=DPR_CAP:1 renders fewer pixels, ?tune=ANTIALIAS:0 turns MSAA off.
// Throws when WebGL isn't available (main.js shows a plain message, Gate A C2).
export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: TUNE.ANTIALIAS >= 0.5 });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, TUNE.DPR_CAP));
  return renderer;
}

// Free everything a hole's scene holds on the GPU (Gate A A2): geometries, materials, their
// textures, instanced meshes. Shared objects are freed once. The scene is empty afterwards.
// AP3: a model's geometry (userData.cached) belongs to the round's asset cache (assets.js), which frees it.
export function disposeScene(scene) {
  const done = new Set();
  const free = o => { if (o && !done.has(o)) { done.add(o); o.dispose(); } };
  scene.traverse(obj => {
    if (!obj.geometry?.userData.cached) free(obj.geometry);
    for (const m of [].concat(obj.material ?? [])) {
      for (const v of Object.values(m)) if (v && v.isTexture) free(v);
      free(m);
    }
    if (obj.isInstancedMesh) obj.dispose();
  });
  scene.clear();
}

// AP5: every colour and piece comes from the hole's biome set (DESIGN §8b): biome = the resolved set
// (src/biomes/), whose pieces are in src/biomes/library.js. `look(group, id)` = that piece's colours by
// slot (core/biome.js pieceColours). Fixed colours (the white flagpole and OB stakes, the debug outlines,
// the HUD's aim colours) never change with the biome.
const FIXED_WHITE = 0xffffff; // the OB stakes (the golf rule colour, library whiteStakes)

// obstacles = play.obstacles (core/obstacles.js colliders): drawn from exactly the shapes the ball hits (K5)
// models (AP3) = path → the loaded model geometry or null (assets.js cache.geometry): a model piece whose
// file is not there is drawn as its procedural fallback (library `fallback`).
export function buildScene(renderer, hole, terrain, courseCanvas, obstacles, biome, models = () => null) {
  const sc = hole.scenery, map = hole.map, P = biome.palette, look = pieceColours(biome, LIBRARY);
  const shapeOf = pieceShape(models);
  const { heightAt } = terrain;
  const scene = new THREE.Scene();
  const sky = look('skies', biome.sky);
  scene.background = new THREE.Color(sky.sky);
  scene.fog = new THREE.Fog(sky.fog, sc.fog[0], sc.fog[1]);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.05, sc.cameraFar);

  // the light colours from the palette; strength and direction from the set's `light`, else the hole's
  const light = sceneLight(biome, sc);
  scene.add(new THREE.HemisphereLight(P.ambient, P.shadow, light.hemi));
  const sun = new THREE.DirectionalLight(P.sun, light.sun);
  sun.position.set(...light.sunPos);
  scene.add(sun);

  // Far-away flat ground under everything. K13: it sits below the lowest point of the terrain mesh
  // (validateHole checks it), so it never pokes through a hollow and hides the course or the ball.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(sc.ground.size, sc.ground.size), new THREE.MeshLambertMaterial({ color: P.farGround }));
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
    const w = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshLambertMaterial({ color: look('furniture', biome.furniture.pond).surface, transparent: true, opacity: 0.88 }));
    w.rotation.x = -Math.PI / 2; w.scale.set(sc.water.rx * sc.water.scale, sc.water.rz * sc.water.scale, 1);
    w.position.set(sc.water.cx, sc.water.y, sc.water.cz); w.name = 'water';
    scene.add(w);
  }

  // Tee markers and the white out-of-bounds stakes: one instanced draw call each (AP1)
  {
    const pose = new THREE.Object3D(), tees = [];
    const marker = shapeOf('furniture', biome.furniture.teeMarkers, FURNITURE, TEE_MARKER_SIZE); // AP3: a model or the procedural ball
    for (const sx of [-2.6, 2.6]) {
      pose.position.set(hole.tee.x + sx, heightAt(hole.tee.x + sx, hole.tee.z - 1.2) + TEE_MARKER_SIZE / 2, hole.tee.z - 1.2);
      tees.push(matrixOf(pose).multiply(marker.fit));
    }
    scene.add(instanced(marker.geometry, new THREE.MeshLambertMaterial({ color: look('furniture', marker.id).marker }), tees, `tee markers (instanced${marker.model ? ', model' : ''})`));
    const st = sc.stakes, stakes = [];
    for (let z = st.z0; z > st.z1; z -= st.step) for (const sx of st.xs ?? [-st.x, st.x]) {
      pose.position.set(sx, heightAt(sx, z) + 0.5, z);
      stakes.push(matrixOf(pose));
    }
    scene.add(instanced(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), new THREE.MeshLambertMaterial({ color: FIXED_WHITE }), stakes, 'OB stakes (instanced)'));
  }
  addTrees(scene, sc.trees, heightAt, terrain.surfaceAt, biome, look);
  const colliderOutlines = addObstacles(scene, obstacles, hole.obstacles ?? [], biome, look, shapeOf);
  addBackdrop(scene, sc, look('backdrops', biome.backdrop), sky, biome.backdrop);
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

// AP5: the game's builder for each library piece (src/biomes/library.js). Geometry only: the colours
// come from the biome set through the piece's slots. Adding a piece = a library entry + a builder here.
const ON_TREES = {
  roundTree: {
    trunk: () => { const g = new THREE.CylinderGeometry(1, 1, 1, 10); g.translate(0, 0.5, 0); return g; }, // unit: scaled to the collider
    canopy: () => new THREE.IcosahedronGeometry(1, 2), // unit sphere: scaled to the canopy ellipsoid
  },
};
const OFF_TREES = {
  coneTree: {
    trunk: () => { const g = new THREE.CylinderGeometry(0.25, 0.35, 3, 6); g.translate(0, 1.5, 0); return g; },
    canopy: () => { const g = new THREE.ConeGeometry(2.4, 6, 7); g.translate(0, 5.5, 0); return g; },
  },
};
const ROCKS = { roundBoulder: () => new THREE.IcosahedronGeometry(1, 2) };
const BACKDROPS = { roundHills: () => new THREE.SphereGeometry(1, 20, 12) };
const TEE_MARKER_SIZE = 0.28; // m: a tee marker's ball (and a model marker's largest side)
const FURNITURE = { ballMarkers: () => new THREE.SphereGeometry(TEE_MARKER_SIZE / 2, 12, 8) };
const builder = (table, id) => table[id] ?? (() => { throw new Error(`no builder for the library piece "${id}" (src/game/scene.js)`); })();

// AP3: the shape of a piece that may be a model (core/assets.js MODEL_PICKS). → { id (the piece drawn:
// its colours), geometry, fit (a matrix applied to each copy after its pose), model (true when from a file) }
// A model is centred and scaled so its largest side is `size` (the procedural piece's own size); its
// geometry belongs to the cache (never disposed with the hole). A model piece whose file did not load
// is drawn as its fallback, exactly as that procedural piece. `size` = the procedural piece's size in
// the copies' pose units (1 for unit pieces scaled by their collider, the marker's 0.28 m).
const pieceShape = models => (group, id, table, size) => {
  const piece = LIBRARY[group][id];
  const geometry = piece.model ? models(piece.model) : null;
  if (!geometry) {
    const use = piece.model ? piece.fallback : id;
    return { id: use, geometry: builder(table, use)(), fit: new THREE.Matrix4(), model: false };
  }
  const box = geometry.boundingBox, dim = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const k = size / Math.max(dim.x, dim.y, dim.z, 1e-6);
  return { id, geometry, fit: new THREE.Matrix4().makeScale(k, k, k).multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z)), model: true };
};

// A piece's per-copy shade (library `shade`), drawn from r in the same order as before AP5.
// 'around': the copy's colour, spread around the slot colour (the material is white).
// 'multiply': a colour the slot colour is multiplied by (the material has the slot colour).
const hsl = { h: 0, s: 0, l: 0 };
function shadeOf(shade, slotColour, r, out) {
  if (shade.mode === 'around') {
    new THREE.Color(slotColour).getHSL(hsl);
    const h = hsl.h + (r() - 0.5) * shade.h; // (h before l: the order of the old code)
    return out.setHSL(h, hsl.s, hsl.l + (r() - 0.5) * shade.l);
  }
  const h = shade.h[0] + r() * shade.h[1];
  return out.setHSL(h, shade.s, shade.l[0] + r() * shade.l[1]);
}
const shadedMaterial = (shade, slotColour, opts = {}) => new THREE.MeshLambertMaterial({ color: shade.mode === 'around' ? 0xffffff : slotColour, ...opts });

// K5: the trees and boulders in play, from the same colliders the physics uses. A trunk mesh is the
// trunk cylinder (plus a bit below the ground), the leaves are the canopy ellipsoid, a boulder is its
// sphere. Returns a group of wireframe outlines of the colliders themselves (grown by nothing: the
// shapes as the data gives them), hidden until the debug overlay shows them.
// AP1: all trunks are one instanced draw call, all canopies another (each tree keeps its own shade of
// green as an instance colour), all boulders a third; the outlines are one draw call per kind.
// AP5: each tree's look is its `look` in the hole data (data = hole.obstacles) if the set has it, else a
// seeded pick from the set's onTrees (core/biome.js treeLooks): one trunk + one canopy draw call per
// look used. The boulders use the set's first rocks piece.
function addObstacles(scene, obstacles, data, biome, look, shapeOf) {
  const outlines = new THREE.Group();
  outlines.visible = false;
  if (!obstacles.length) { scene.add(outlines); return outlines; }
  const line = c => new THREE.LineBasicMaterial({ color: c, depthTest: false, transparent: true, opacity: 0.9 });
  const pose = new THREE.Object3D(), r = createRng(77);
  const rocks = [], trunkLines = [], leafLines = [], rockLines = [];
  const trees = obstacles.filter(o => o.type === 'tree');
  const looks = new Map(holeTreeLooks(trees, data, biome.onTrees).map((id, k) => [trees[k], id])); // core/biome.js, the minimap uses the same
  const byLook = new Map(); // look id → { colours, trunks, leaves, leafColors }
  const SINK = 0.5; // m of trunk drawn below the ground, so it never floats on a slope
  // One pose: position, rotation, scale → its matrix (rotation reset each time)
  const at = (x, y, z, sx, sy, sz, rx = 0, ry = 0) => {
    pose.position.set(x, y, z); pose.rotation.set(rx, ry, 0); pose.scale.set(sx, sy, sz);
    return matrixOf(pose);
  };
  for (const o of obstacles) { // in the data's order, so the random shades and turns are the same as before
    if (o.type === 'tree') {
      const id = looks.get(o);
      if (!byLook.has(id)) byLook.set(id, { colours: look('onTrees', id), trunks: [], leaves: [], leafColors: [] });
      const g = byLook.get(id), h = o.top - o.y0 + SINK, c = o.canopy;
      g.trunks.push(at(o.x, o.y0 - SINK, o.z, o.r, h, o.r));
      g.leafColors.push(shadeOf(LIBRARY.onTrees[id].shade, g.colours.canopy, r, new THREE.Color()));
      g.leaves.push(at(c.x, c.y, c.z, c.rx, c.ry, c.rx, 0, r() * 6.28));
      trunkLines.push(at(o.x, o.y0, o.z, o.r, o.top - o.y0, o.r));
      leafLines.push(at(c.x, c.y, c.z, c.rx, c.ry, c.rx));
    } else {
      rocks.push(at(o.x, o.y, o.z, o.r, o.r, o.r, r() * 6.28, r() * 6.28));
      rockLines.push(at(o.x, o.y, o.z, o.r, o.r, o.r));
    }
  }
  const several = byLook.size > 1; // the names say which look only when there are several
  for (const [id, g] of byLook) {
    const b = builder(ON_TREES, id), tag = several ? `, ${id}` : '';
    scene.add(instanced(b.trunk(), new THREE.MeshLambertMaterial({ color: g.colours.trunk }), g.trunks, `tree trunks (in play, instanced${tag})`));
    scene.add(instanced(b.canopy(), shadedMaterial(LIBRARY.onTrees[id].shade, g.colours.canopy, { flatShading: true }), g.leaves, `tree canopies (in play, instanced${tag})`, g.leafColors));
  }
  if (rocks.length) {
    // AP3: a model boulder is fitted to the unit sphere's box (largest side 2), scaled by the collider like the procedural one
    const rock = shapeOf('rocks', biome.rocks[0], ROCKS, 2);
    scene.add(instanced(rock.geometry, new THREE.MeshLambertMaterial({ color: look('rocks', rock.id).body, flatShading: true }), rocks.map(m => m.multiply(rock.fit)), `boulders (instanced${rock.model ? ', model' : ''})`));
  }
  // the debug outlines are always the collider shapes (a unit cylinder and sphere), whatever the look
  const outlineCyl = new THREE.CylinderGeometry(1, 1, 1, 10); outlineCyl.translate(0, 0.5, 0);
  const wireCyl = new THREE.WireframeGeometry(outlineCyl), ball = new THREE.SphereGeometry(1, 16, 10), wireBall = new THREE.WireframeGeometry(ball);
  if (trunkLines.length) outlines.add(bakedLines(wireCyl, trunkLines, line(0xff4040), 'collider outlines: trunks (debug)'), bakedLines(wireBall, leafLines, line(0xffe040), 'collider outlines: leaves (debug)'));
  if (rockLines.length) outlines.add(bakedLines(wireBall, rockLines, line(0x40e0ff), 'collider outlines: boulders (debug)'));
  outlineCyl.dispose(); wireCyl.dispose(); ball.dispose(); wireBall.dispose(); // only copied from, never drawn
  scene.add(outlines);
  return outlines;
}

// Decoration trees (instanced so hundreds are cheap), standing on the ground. K8: only outside the
// OB line; every tree in play is an obstacle in the hole data (drawn by addObstacles).
// AP5: the look is the set's first offTrees piece (more looks: later).
function addTrees(scene, t, heightAt, surfaceAt, biome, look) {
  const r = createRng(42);
  const spots = [];
  let guard = 0;
  while (spots.length < t.count && guard++ < 20000) {
    const x = (r() - 0.5) * t.xSpan, z = t.zTop - r() * t.zSpan;
    if (t.exclude(x, z)) continue;
    spots.push([x, z, 0.8 + r() * 0.7]);
  }
  for (let i = spots.length - 1; i >= 0; i--) if (surfaceAt(spots[i][0], spots[i][1]) !== 'ob') spots.splice(i, 1);
  const id = biome.offTrees[0], b = builder(OFF_TREES, id), colours = look('offTrees', id), shade = LIBRARY.offTrees[id].shade;
  const trunks = new THREE.InstancedMesh(b.trunk(), new THREE.MeshLambertMaterial({ color: colours.trunk }), spots.length);
  const leaves = new THREE.InstancedMesh(b.canopy(), shadedMaterial(shade, colours.canopy, { flatShading: true }), spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s3 = new THREE.Vector3();
  const col = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
  spots.forEach(([x, z, s], i) => {
    q.setFromAxisAngle(up, r() * 6.28);
    m.compose(v.set(x, heightAt(x, z) - t.sink, z), q, s3.set(s, s, s));
    trunks.setMatrixAt(i, m); leaves.setMatrixAt(i, m);
    leaves.setColorAt(i, shadeOf(shade, colours.canopy, r, col));
  });
  trunks.name = 'scenery trees: trunks (instanced)'; leaves.name = 'scenery trees: leaves (instanced)';
  scene.add(trunks, leaves);
}

// Distant hills and clouds. AP1: all hills are one instanced draw call, all cloud puffs another
// (a puff is the unit sphere scaled to its radius, flattened as before).
// AP5: hills = the set's backdrop piece (colours: its slots), clouds = the sky piece's `clouds` slot.
function addBackdrop(scene, sc, backdrop, sky, backdropId) {
  const hl = sc.hills, cl = sc.clouds;
  const r = createRng(9), pose = new THREE.Object3D();
  const hills = [];
  for (let i = 0; i < hl.count; i++) {
    const a = (i / hl.count) * Math.PI * 2, d = hl.dist[0] + r() * hl.dist[1];
    pose.scale.set(hl.xz[0] + r() * hl.xz[1], hl.y[0] + r() * hl.y[1], hl.xz[0] + r() * hl.xz[1]);
    pose.position.set(Math.sin(a) * d, hl.posY, hl.cz + Math.cos(a) * d);
    hills.push(matrixOf(pose));
  }
  if (hills.length) scene.add(instanced(builder(BACKDROPS, backdropId)(), new THREE.MeshLambertMaterial({ color: backdrop.hills }), hills, 'hills (instanced)'));
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
  if (puffs.length) scene.add(instanced(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: sky.clouds, fog: false }), puffs, 'cloud puffs (instanced)'));
}
