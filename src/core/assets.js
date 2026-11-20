// AP3: the pure part of the asset loader (DESIGN §8b "Model pieces", §9). Which model files a hole
// needs, how a library piece names one, and what the loading card shows. The loading, the cache and the
// freeing live in the game layer (src/game/assets.js), which reads these.
// Pure: no Three.js, no DOM (coding rule 1).

// A model piece names one glTF binary under assets/ (lower case, digits, dashes, underscores, folders):
// 'assets/models/<name>.glb'. Relative to the page, so it works on GitHub Pages and a local server.
export const MODEL_PATH = /^assets\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.glb$/;
// The picks of a biome set that may name a model piece today (the game builds these from the model's
// first mesh, src/game/scene.js): the boulders and the tee markers. Trees, sky, backdrop and the rest of
// the furniture follow with AP7 / AP6; a set that picks a model piece elsewhere fails validateBiomeSet.
export const MODEL_PICKS = Object.freeze(['rocks', 'furniture.teeMarkers']);

// The model-piece check (validateBiomeSet runs it on every piece a set picks, with the pick's field; tests
// run it on the whole library). Returns null when the piece is fine, else what is wrong.
//   model:    'assets/…/<name>.glb'
//   fallback: a procedural piece of the same group (no model), drawn when the file is missing or broken
export function modelPieceError(library, group, id, field = null) {
  const piece = library[group]?.[id];
  if (!piece || piece.model === undefined) return null;
  if (field && !MODEL_PICKS.includes(field)) return `piece "${id}" is a model, and ${field} can't draw a model yet (only ${MODEL_PICKS.join(', ')}; AP7 adds the rest)`;
  if (typeof piece.model !== 'string' || !MODEL_PATH.test(piece.model)) return `piece "${id}" model must be a .glb file path under assets/ (e.g. 'assets/models/<name>.glb'), got ${JSON.stringify(piece.model)}`;
  const fb = library[group]?.[piece.fallback];
  if (!fb) return `piece "${id}" needs a fallback: a procedural ${group} piece drawn when its model can't load (got ${JSON.stringify(piece.fallback)})`;
  if (fb.model !== undefined) return `piece "${id}" fallback "${piece.fallback}" must be a procedural piece (no model)`;
  return null;
}

// Every [group, id] a biome set picks, in pick-list order (the same fields validateBiomeSet checks)
export function pickedPieces(set) {
  const out = [];
  const add = (group, ids) => { for (const id of [].concat(ids ?? [])) if (typeof id === 'string') out.push([group, id]); };
  add('textures', set.textures); add('onTrees', set.onTrees); add('offTrees', set.offTrees); add('rocks', set.rocks);
  add('skies', set.sky); add('backdrops', set.backdrop); add('furniture', Object.values(set.furniture ?? {}));
  add('bigProps', set.bigProps); add('smallProps', set.smallProps?.pieces);
  return out;
}

// The model files a hole needs: those of every piece its biome set picks, each once, sorted (the
// cache key is the path itself). A set with only procedural pieces needs nothing: no loading card.
export function modelFiles(set, library) {
  const files = new Set();
  for (const [group, id] of pickedPieces(set)) {
    const m = library[group]?.[id]?.model;
    if (typeof m === 'string') files.add(m);
  }
  return [...files].sort();
}
// Every model file the library names (the node test checks each exists on disk)
export const libraryModelFiles = library => [...new Set(Object.values(library).flatMap(g => Object.values(g).map(p => p.model).filter(m => typeof m === 'string')))].sort();

// What still has to be fetched: the needed files the cache has neither loaded nor tried (a failed file
// is not tried again in the same round: it keeps its fallback). has(path) = the cache knows the path.
export const toLoad = (files, has) => files.filter(f => !has(f));

// The loading card: done / total files → { pct 0..100, text }
export function loadingProgress(done, total) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 100;
  return { pct, text: `Loading… ${pct}%` };
}

// The notice shown when files could not load (the hole is drawn with the fallback pieces instead)
export const missingNotice = files => files.length
  ? `Couldn't load ${files.length === 1 ? 'a model' : `${files.length} models`} (${files.join(', ')}), so simple stand-ins are drawn instead.`
  : '';
