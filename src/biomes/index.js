// AP5: every biome set, by id (DESIGN §8b). A hole names its set with `biome: '<id>'`.
// Adding a biome set = add a file next to this one and one line here.
import { validateBiomeSet } from '../core/biome.js';
import { LIBRARY } from './library.js';
import mtnDefault from './mtn-default.js';
import protoDefault from './proto-default.js';
import meadowDay from './meadow-day.js';
import alpineDay from './alpine-day.js';
import testModels from './test-models.js'; // AP3: dev only (?biome=test-models), proves the asset loader

export const BIOMES = Object.fromEntries([mtnDefault, protoDefault, meadowDay, alpineDay, testModels].map(b => [b.id, b]));

// The set a hole uses, checked (validateBiomeSet throws with the set and the field). Unknown id → throws.
export function resolveBiome(id) {
  if (!Object.hasOwn(BIOMES, id)) throw new Error(`unknown biome set "${id}" (known: ${Object.keys(BIOMES).join(', ')})`);
  return validateBiomeSet(BIOMES[id], LIBRARY);
}
