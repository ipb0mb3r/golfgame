// AP5: every biome set, by id (DESIGN §8b). A hole names its set with `biome: '<id>'`.
// Adding a biome set = add a file next to this one and one line here.
import { validateBiomeSet, normalizeBiomeSet } from '../core/biome.js';
import { LIBRARY } from './library.js';
import mtnDefault from './mtn-default.js';
import protoDefault from './proto-default.js';
import meadowDay from './meadow-day.js';
import alpineDay from './alpine-day.js';
import islandDay from './island-day.js';
import testModels from './test-models.js'; // AP3: dev only (?biome=test-models), proves the asset loader
// AP6a: dev only, the artist's sets with the new sky and backdrop pieces (?biome=test-alpine-look, ...)
import testAlpineLook from './test-alpine-look.js';
import testIslandLook from './test-island-look.js';
import testMeadowLook from './test-meadow-look.js';
// AP7a: dev only, the gradient trees (?biome=test-trees, ?biome=test-island-trees)
import testTrees from './test-trees.js';
import testIslandTrees from './test-island-trees.js';
// AP7c: dev only, the small-prop scatter (?biome=test-small-props)
import testSmallProps from './test-small-props.js';
// AP7e: dev only, the four big props (?hole=mtn-07&biome=test-big-props, with the overlay src/holes/dev-big-props.js)
import testBigProps from './test-big-props.js';

export const BIOMES = Object.fromEntries([mtnDefault, protoDefault, meadowDay, alpineDay, islandDay, testModels, testAlpineLook, testIslandLook, testMeadowLook, testTrees, testIslandTrees, testSmallProps, testBigProps].map(b => [b.id, b]));

// The set a hole uses, checked (validateBiomeSet throws with the set and the field). Unknown id → throws.
// X33 / AP7c: returned as the game reads it (core/biome.js normalizeBiomeSet): every pick as its piece id,
// slot overrides in slotOverrides, smallProps with every pick { id, weight, slots, cluster }.
export function resolveBiome(id) {
  if (!Object.hasOwn(BIOMES, id)) throw new Error(`unknown biome set "${id}" (known: ${Object.keys(BIOMES).join(', ')})`);
  return normalizeBiomeSet(validateBiomeSet(BIOMES[id], LIBRARY));
}
