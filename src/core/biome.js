// Biome sets (AP5, DESIGN §8b, ART_STYLE §2–4): the format, the colour maths and the checks.
// A biome set is a data file (src/biomes/<id>.js) that the course designer applies to a hole
// (`biome: '<id>'` in the hole data). It holds ONLY the look: a full palette and a pick list of pieces
// from the shared library (src/biomes/library.js). No inheritance: every set names all its pieces and
// all its colours. Physics never comes from a biome set (surfaces.js and the hole data keep it).
// Pure: no Three.js, no DOM (coding rule 1). The game reads the set; this file only checks it.
import { UI_COLORS, MINIMAP_DARKEN } from './config.js';
import { createRng } from './rng.js';
import { modelPieceError } from './assets.js';

// ---- 1. Palette keys: every set defines ALL of them (ART_STYLE §4.1, plus the engine group) ----
export const PALETTE_KEYS = Object.freeze({
  // the ground the course painter colours (fairwayA/B = mowing stripes, greenA/B = the green's two shades)
  surfaces: ['tee', 'fairwayA', 'fairwayB', 'edge', 'fringe', 'greenA', 'greenB', 'rough', 'deepRough', 'sand', 'lip',
    'water', 'waterDeep', 'bank', 'rock', 'path'],
  // sky, fog and the light tints (shadow = the hemisphere light's ground colour, never black)
  sky: ['skyTop', 'skyHorizon', 'cloud', 'fog', 'sun', 'ambient', 'shadow'],
  // the backdrop's tint zones (ART_STYLE §4.3)
  backdrop: ['backFar', 'backNear', 'backCap', 'backCapShade', 'backTrees'],
  // the biome's signature (owner, 2026-11-19): accent = the flag, subAccent = tee markers, flower beds, trims, signs
  accents: ['accent', 'subAccent'],
  // tree and prop material slots
  models: ['pine', 'trunk', 'leafTop', 'leaf', 'leafLow', 'leafAlt', 'trunkAlt', 'wood', 'roof', 'propSnow', 'propA', 'propB', 'glass'],
  // AP5: colours today's pieces need so the look moves into sets with no visual change. They may go
  // once AP6 (ground material) / AP7 (models) replace those pieces.
  engine: ['gridFill', 'gridLine', 'farGround', 'pondSurface', 'boulder'],
});
export const ALL_PALETTE_KEYS = Object.freeze(Object.values(PALETTE_KEYS).flat());

// The pick-list fields of a set and the library group each one picks from (src/biomes/library.js)
export const PICKS = Object.freeze({
  textures: { group: 'textures', list: true },     // the hook: the same greyscale textures in every biome (none exist yet)
  onTrees: { group: 'onTrees', list: true, min: 1, max: 3 }, // the look of the trees in play (collisions stay in the hole)
  offTrees: { group: 'offTrees', list: true, min: 1, max: 3 }, // scenery trees outside OB
  rocks: { group: 'rocks', list: true, min: 1 },  // the look of the boulders in play (collisions stay in the hole)
  sky: { group: 'skies' },
  backdrop: { group: 'backdrops' },               // tint-only (owner, #73)
  furniture: { group: 'furniture', keys: ['flag', 'teeMarkers', 'stakes', 'pond'] }, // the course's own small things
  bigProps: { group: 'bigProps', list: true },     // what the course designer may place by hand (hole scenery.bigProps)
});
const SET_FIELDS = new Set(['id', 'name', 'description', 'palette', 'smallProps', 'notes', 'readabilityWaivers', 'light', ...Object.keys(PICKS)]);
// The optional `light` override (PM on #86): when a set has it, it replaces the hole's scenery light
// (a sunset wants a low sun); without it the hole's own values apply. Fog distances stay in the hole.
export const LIGHT_FIELDS = Object.freeze(['sunIntensity', 'hemiIntensity', 'sunDir']);

// ---- 2. Colours ----
// A colour is '#rrggbb' (what the artist writes). Returns [r, g, b] 0..255, or null.
export function parseColour(c) {
  if (typeof c !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(c)) return null;
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const colourInt = c => parseInt(c.slice(1), 16); // '#rrggbb' → 0xrrggbb (what Three.js takes)
export const mixColour = (a, b) => '#' + parseColour(a).map((v, i) => Math.round((v + parseColour(b)[i]) / 2).toString(16).padStart(2, '0')).join('');
// CIE L*a*b* (D65) and ΔE76, ported from the artist's sheets (docs/art/biome-sets/paint.js)
export function lab(c) {
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const [r, g, b] = parseColour(c).map(lin);
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
export function delta(c1, c2) {
  const a = lab(c1), b = lab(c2);
  return { dE: Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), dL: Math.abs(a[0] - b[0]) };
}

// ---- 3. Readability rules (ART_STYLE §4.4, gameplay rule: no blind shots) ----
// [id, colour A, colour B, ΔE at least, ΔL at least]. A colour is a palette key, a mix of two keys
// ('fairway' = fairwayA/B, 'green' = greenA/B, as on the artist's sheets) or a HUD colour (UI_COLORS).
const MIXES = { fairway: ['fairwayA', 'fairwayB'], green: ['greenA', 'greenB'] };
export const READABILITY = Object.freeze([
  ['fairway/rough', 'fairway', 'rough', 15, 8],
  ['fairwayB/rough', 'fairwayB', 'rough', 15, 8],     // per stripe too (artist on #86): the darker stripe vs rough
  ['green/fairway', 'green', 'fairway', 10, 5],
  ['greenB/fairwayA', 'greenB', 'fairwayA', 10, 5],   // the darker green shade vs the lighter fairway stripe
  ['green/rough', 'green', 'rough', 20, 10],
  ['sand/fairway', 'sand', 'fairway', 20, 10],
  ['sand/rough', 'sand', 'rough', 30, 15],
  ['water/fairway', 'water', 'fairway', 30, 0],
  ['water/rough', 'water', 'rough', 25, 0],
  ['water/green', 'water', 'green', 30, 0],
  ['aim/fairway', 'ui:aim', 'fairway', 20, 0],
  ['warn/rough', 'ui:warn', 'rough', 30, 0],
  ['dots/fairway', 'ui:aimDot', 'fairway', 15, 0],
  ...['greenA', 'greenB', 'rough', 'fairway', 'skyTop', 'skyHorizon'].map(k => [`accent/${k}`, 'accent', k, 30, 0]),
  ['accent/warn', 'accent', 'ui:warn', 15, 0], // a flag must never look like a warning
  ['accent/aim', 'accent', 'ui:aim', 15, 0],
  ...['green', 'rough', 'skyHorizon'].map(k => [`subAccent/${k}`, 'subAccent', k, 30, 0]),
  // the putting grid stays visible on both green shades (ART_STYLE §4.4 "Also", artist on #86)
  ...['greenA', 'greenB'].map(k => [`gridLine/${k}`, 'gridLine', k, 10, 0]),
]);
const colourOf = (palette, name) =>
  name.startsWith('ui:') ? UI_COLORS[name.slice(3)] : MIXES[name] ? mixColour(palette[MIXES[name][0]], palette[MIXES[name][1]]) : palette[name];

// X26 (owner, 2026-11-20): the minimap draws the trees in play in their canopy colour and the boulders in
// their rock colour, so each must stay clearly apart from the fairway AND the rough there (the fairway/rough
// thresholds; rocks: PM on #89). [id, kind, vs, ΔE, ΔL]
export const MINIMAP_READABILITY = Object.freeze([
  ['minimapTree/fairway', 'tree', 'fairway', 15, 8],
  ['minimapTree/rough', 'tree', 'rough', 15, 8],
  ['minimapRock/fairway', 'rock', 'fairway', 15, 8],
  ['minimapRock/rough', 'rock', 'rough', 15, 8],
]);
const darken = (c, k) => '#' + parseColour(c).map(v => Math.round(v * (1 - k)).toString(16).padStart(2, '0')).join('');
const minimapRows = (palette, kind, c, look) => MINIMAP_READABILITY.filter(r => r[1] === kind).map(([id, , b, minE, minL]) => {
  const d = delta(c, colourOf(palette, b));
  return { id, look, a: c, b, dE: d.dE, dL: d.dL, minE, minL, ok: d.dE >= minE && d.dL >= minL };
});
// The minimap colour of a tree canopy (kind 'tree') or a boulder (kind 'rock'): as it is when it passes its
// rules, else darkened by MINIMAP_DARKEN (one fixed step, never searched). → { colour, darkened, rows }
// (rows = the rules on the colour used)
export function minimapShade(palette, kind, colour, look = '') {
  const rows = minimapRows(palette, kind, colour, look);
  if (rows.every(r => r.ok)) return { colour, darkened: false, rows };
  const dark = darken(colour, MINIMAP_DARKEN);
  return { colour: dark, darkened: true, rows: minimapRows(palette, kind, dark, look) };
}
const minimapPieces = (set, library) => {
  const look = pieceColours(set, library);
  return [
    ...set.onTrees.map(id => ({ group: 'trees', id, m: minimapShade(set.palette, 'tree', look('onTrees', id).canopy, id) })),
    { group: 'rock', id: set.rocks[0], m: minimapShade(set.palette, 'rock', look('rocks', set.rocks[0]).body, set.rocks[0]) },
  ];
};
// The minimap's colours from the set (X26): every onTrees look → its tree colour, and the boulders (the
// first rocks piece, as in 3D). The course surfaces, water and sand are the painted course itself, and
// the flag is flagColour; the aim line, warning and ball stay HUD colours (UI_COLORS).
export function minimapColours(set, library) {
  const pieces = minimapPieces(set, library);
  return {
    trees: Object.fromEntries(pieces.filter(p => p.group === 'trees').map(p => [p.id, p.m.colour])),
    rock: pieces.find(p => p.group === 'rock').m.colour,
  };
}
// Every minimap rule's result for each onTrees look and the rock (after the darken step): [{ id, look, ..., ok, darkened }]
export function checkMinimap(set, library) {
  return minimapPieces(set, library).flatMap(({ m }) => m.rows.map(r => ({ ...r, darkened: m.darkened })));
}

// Every rule's result: [{ id, a, b, dE, dL, minE, minL, ok }]. The palette must already be complete.
export function checkReadability(palette) {
  return READABILITY.map(([id, a, b, minE, minL]) => {
    const d = delta(colourOf(palette, a), colourOf(palette, b));
    return { id, a, b, dE: d.dE, dL: d.dL, minE, minL, ok: d.dE >= minE && d.dL >= minL };
  });
}

// ---- 4. validateBiomeSet ----
// Throws an Error naming the set and the field (like validateHole). Returns the set.
// library = src/biomes/library.js LIBRARY (passed in, so core stays free of data files).
// A readability rule may be waived only by name with a reason (readabilityWaivers: { 'accent/warn': 'why' }):
// today's looks (mtn-default, proto-*) don't pass every rule and must not change in AP5.
export function validateBiomeSet(set, library) {
  const name = `biome set "${set?.id ?? '?'}"`;
  const bad = msg => { throw new Error(`${name}: ${msg}`); };
  if (!set || typeof set !== 'object') bad('is not an object');
  if (typeof set.id !== 'string' || !/^[a-z0-9-]+$/.test(set.id)) bad('id must be lower-case letters, digits and dashes');
  for (const k of Object.keys(set)) if (!SET_FIELDS.has(k)) bad(`unknown field "${k}" (known: ${[...SET_FIELDS].join(', ')})`);
  for (const k of ['name', 'description', 'notes']) if (typeof set[k] !== 'string' || !set[k].trim()) bad(`${k} must be a non-empty string`);

  // palette: every key, each a '#rrggbb', nothing else
  const p = set.palette;
  if (!p || typeof p !== 'object') bad('palette is missing');
  for (const k of ALL_PALETTE_KEYS) {
    if (!Object.hasOwn(p, k)) bad(`palette is missing "${k}"`);
    if (!parseColour(p[k])) bad(`palette.${k} must be a colour '#rrggbb' (got ${JSON.stringify(p[k])})`);
  }
  for (const k of Object.keys(p)) if (!ALL_PALETTE_KEYS.includes(k)) bad(`palette has an unknown key "${k}"`);

  // pick list: every piece exists in the library, and every colour slot it uses names a palette key
  const usePiece = (field, group, id) => {
    const piece = library[group]?.[id];
    if (!piece) bad(`${field}: unknown piece "${id}" (the library's ${group}: ${Object.keys(library[group] ?? {}).join(', ') || 'none yet'})`);
    for (const [slot, key] of Object.entries(piece.slots ?? {})) if (!ALL_PALETTE_KEYS.includes(key)) bad(`${field}: piece "${id}" slot ${slot} uses an unknown palette key "${key}" (library error)`);
    const modelError = modelPieceError(library, group, id, field); // AP3: a model piece names a .glb under assets/ and a procedural fallback
    if (modelError) bad(`${field}: ${modelError} (library error)`);
  };
  for (const [field, rule] of Object.entries(PICKS)) {
    const v = set[field];
    if (rule.keys) {
      if (!v || typeof v !== 'object') bad(`${field} must be { ${rule.keys.join(', ')} }`);
      for (const k of rule.keys) { if (typeof v[k] !== 'string') bad(`${field}.${k} must be a piece id`); usePiece(`${field}.${k}`, rule.group, v[k]); }
      for (const k of Object.keys(v)) if (!rule.keys.includes(k)) bad(`${field} has an unknown key "${k}"`);
    } else if (rule.list) {
      if (!Array.isArray(v)) bad(`${field} must be a list of piece ids`);
      if (v.length < (rule.min ?? 0) || v.length > (rule.max ?? Infinity)) bad(`${field} must list ${rule.min ?? 0}–${rule.max ?? 'any'} pieces (got ${v.length})`);
      if (new Set(v).size !== v.length) bad(`${field} lists a piece twice`);
      for (const id of v) usePiece(field, rule.group, id);
    } else {
      if (typeof v !== 'string') bad(`${field} must be a piece id`);
      usePiece(field, rule.group, v);
    }
  }
  // small props: scattered by a rule (owner, #73). { pieces: [...], perHa: n, on: [surface ids] }
  const sp = set.smallProps;
  if (!sp || !Array.isArray(sp.pieces)) bad('smallProps must be { pieces: [...], perHa, on: [...] }');
  for (const id of sp.pieces) usePiece('smallProps', 'smallProps', id);
  if (sp.pieces.length) {
    if (!(typeof sp.perHa === 'number' && sp.perHa >= 0)) bad('smallProps.perHa must be a number ≥ 0 (props per hectare)');
    if (!Array.isArray(sp.on) || !sp.on.length || !sp.on.every(s => typeof s === 'string')) bad('smallProps.on must list the surfaces they are scattered on');
  }

  // light (optional): overrides the hole's scenery light when present
  if (set.light !== undefined) {
    const l = set.light;
    if (!l || typeof l !== 'object') bad('light must be { sunIntensity, hemiIntensity, sunDir }');
    for (const k of Object.keys(l)) if (!LIGHT_FIELDS.includes(k)) bad(`light has an unknown key "${k}" (known: ${LIGHT_FIELDS.join(', ')})`);
    for (const k of ['sunIntensity', 'hemiIntensity']) if (!(Number.isFinite(l[k]) && l[k] >= 0)) bad(`light.${k} must be a number ≥ 0 (got ${l[k]})`);
    if (!(Array.isArray(l.sunDir) && l.sunDir.length === 3 && l.sunDir.every(Number.isFinite) && l.sunDir[1] > 0)) bad(`light.sunDir must be [x, y, z] toward the sun, with y > 0 (got ${JSON.stringify(l.sunDir)})`);
  }

  // readability (ART_STYLE §4.4): every rule passes, or is waived by name with a reason
  // + the minimap rules (X26), on each onTrees look's and the rock's minimap colour (after the darken step)
  const waivers = set.readabilityWaivers ?? {};
  for (const [id, why] of Object.entries(waivers)) {
    if (!READABILITY.some(r => r[0] === id) && !MINIMAP_READABILITY.some(r => r[0] === id)) bad(`readabilityWaivers names an unknown rule "${id}"`);
    if (typeof why !== 'string' || !why.trim()) bad(`readabilityWaivers.${id} needs a reason`);
  }
  const all = [...checkReadability(p), ...checkMinimap(set, library)];
  const fails = all.filter(r => !r.ok && !Object.hasOwn(waivers, r.id));
  if (fails.length) bad(`readability (ART_STYLE §4.4): ${fails.map(r => `${r.id}${r.look ? ` (${r.look})` : ''} ΔE ${r.dE.toFixed(0)} (≥ ${r.minE})${r.minL ? `, ΔL ${r.dL.toFixed(0)} (≥ ${r.minL})` : ''}`).join('; ')}`);
  const unneeded = Object.keys(waivers).filter(id => all.filter(r => r.id === id).every(r => r.ok));
  if (unneeded.length) bad(`readabilityWaivers: ${unneeded.join(', ')} already pass, remove the waiver`);
  return set;
}

// ---- 5. What the game reads (pure helpers, so the choices are tested in Node) ----
// The scene light: the set's `light` when it has one, else the hole's scenery values.
export function sceneLight(set, scenery) {
  const l = set.light;
  return l ? { hemi: l.hemiIntensity, sun: l.sunIntensity, sunPos: l.sunDir } : { hemi: scenery.hemi, sun: scenery.sun.intensity, sunPos: scenery.sun.pos };
}
// The look of each tree in play (PM on #86): the obstacle's own `look` when the set has that piece,
// else a seeded pick from the set's onTrees (rng = a seeded stream of its own, so the look never moves
// another random draw). With one onTrees piece nothing is drawn from rng. trees = the hole's tree obstacles.
export function treeLooks(trees, onTrees, rng) {
  return trees.map(o => onTrees.includes(o.look) ? o.look : onTrees.length === 1 ? onTrees[0] : onTrees[Math.floor(rng() * onTrees.length) % onTrees.length]);
}
// The look of each tree of a hole, with its own seeded stream (the 3D trees and the minimap use the same,
// X26). trees = the tree colliders, data = hole.obstacles (a collider's `i` is its index there).
export const TREE_LOOK_SEED = 78;
export const holeTreeLooks = (trees, data, onTrees) => treeLooks(trees.map(o => data[o.i] ?? {}), onTrees, createRng(TREE_LOOK_SEED));
// A piece's colours by slot ('#rrggbb'), read through the library's slot → palette key map, so a piece
// is coloured the same way in every set: pieceColours(set, LIBRARY)('furniture', 'clothFlag') → { cloth }.
// library = src/biomes/library.js LIBRARY (passed in, so core stays free of data files).
export function pieceColours(set, library) {
  return (group, id) => {
    const piece = library[group]?.[id];
    if (!piece) throw new Error(`biome set "${set.id}": no ${group} piece "${id}"`);
    return Object.fromEntries(Object.entries(piece.slots).map(([slot, key]) => [slot, set.palette[key]]));
  };
}
// The flag cloth's colour (the 3D flag and the minimap's flag)
export const flagColour = (set, library) => pieceColours(set, library)('furniture', set.furniture.flag).cloth;
