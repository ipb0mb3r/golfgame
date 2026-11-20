// AP3: the asset loader and its cache (DESIGN §8b "Model pieces", §9). Lives for the whole visit in
// main.js. It loads the .glb files a hole's biome set names (core/assets.js modelFiles) with GLTFLoader +
// the Meshopt decoder (AP2 add-ons, imported only when a file is first needed, so a visit without models
// never downloads them), keeps each one for the rest of the round (a model used on holes 1–9 loads once)
// and frees them all in clear() (main.js: the round ends, the player quits to the menu, a new game starts).
//
// What a file gives today: the shape of its first mesh (one BufferGeometry, the node's transform baked
// in); the file's materials and textures are freed at once, since the colours come from the biome
// set's palette (library slots). The geometry is flagged `userData.cached`, so a hole's disposeScene
// leaves it to the cache. A missing or broken file never throws: it is remembered as failed for the
// round (not fetched again), and the scene draws the piece's procedural fallback instead.
let addons = null; // the loader add-ons, imported once on first use
const loaderAddons = () => (addons ??= Promise.all([
  import('three/addons/loaders/GLTFLoader.js'),
  import('three/addons/libs/meshopt_decoder.module.js'),
]).then(([{ GLTFLoader }, { MeshoptDecoder }]) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)));

export function createAssetCache() {
  // path → { promise (never rejects), done, geometry (or null), error (or null) }
  const entries = new Map();
  let generation = 0; // clear() bumps it: a file that finishes loading after a clear is freed, not kept

  function keep(path) {
    if (entries.has(path)) return entries.get(path);
    const gen = generation, e = { done: false, geometry: null, error: null };
    e.promise = loaderAddons()
      .then(loader => loader.loadAsync(path))
      .then(gltf => {
        const geometry = firstMeshGeometry(gltf);
        if (gen !== generation) { geometry.dispose(); return; } // cleared while it loaded
        geometry.userData.cached = true; // AP3: disposeScene leaves it to the cache (clear() frees it)
        e.geometry = geometry;
      })
      .catch(err => {
        e.error = err;
        console.warn(`Pocket Links: couldn't load the model ${path}, drawing its fallback piece instead.`, err);
      })
      .finally(() => { e.done = true; });
    entries.set(path, e);
    return e;
  }

  return {
    // the cache knows this file (loaded, loading or failed): core/assets.js toLoad
    has: path => entries.has(path),
    // every file of the list is settled (loaded or failed): the hole can be built without waiting
    ready: paths => paths.every(p => entries.get(p)?.done),
    // the loaded shape, or null (not loaded, or failed: draw the fallback)
    geometry: path => entries.get(path)?.geometry ?? null,
    // the files of the list that failed this round
    failed: paths => paths.filter(p => entries.get(p)?.error),
    // Load every file of the list (those already known are reused); onProgress(done, total) after each.
    // Resolves when all are settled; never rejects.
    async load(paths, onProgress = () => {}) {
      let done = 0;
      const all = paths.map(p => keep(p).promise.then(() => onProgress(++done, paths.length)));
      onProgress(0, paths.length);
      await Promise.all(all);
    },
    // Start loading the files in the background (the next hole of a round) without waiting
    prefetch(paths) { for (const p of paths) keep(p); },
    // Free everything (the round is over): every loaded geometry, and forget the failures
    clear() {
      generation++;
      for (const e of entries.values()) e.geometry?.dispose();
      entries.clear();
    },
    get size() { return entries.size; },
  };
}

// The first mesh's geometry with its node transform baked in; everything else of the file is freed
function firstMeshGeometry(gltf) {
  const meshes = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
  if (!meshes.length) throw new Error('the file has no mesh');
  const geometry = meshes[0].geometry.clone().applyMatrix4(meshes[0].matrixWorld);
  const done = new Set();
  const free = x => { if (x && !done.has(x)) { done.add(x); x.dispose(); } };
  for (const m of meshes) {
    free(m.geometry);
    for (const mat of [].concat(m.material ?? [])) {
      for (const v of Object.values(mat)) if (v && v.isTexture) free(v);
      free(mat);
    }
  }
  if (!geometry.attributes.normal) geometry.computeVertexNormals(); // the palette's Lambert material needs normals
  geometry.computeBoundingBox();
  return geometry;
}
