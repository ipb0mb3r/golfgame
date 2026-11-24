// AP7f: dev only. A hole-data overlay that shows both fence looks beyond OB on a mountain hole without editing a real
// hole file: its fences are added to the hole's own scenery.fences ONLY when the visit is dressed in the dev set
// test-fences (?hole=mtn-07&biome=test-fences). Never used otherwise; no menu lists it. Each entry is checked like a
// hole's own list (tests/fences.test.js: offered by test-fences, legs ≥ 1 m, OB + 2 m, ≤ 600 m in all). Real holes
// get their fences from the course designer, in their own scenery.fences.
export const DEV_FENCES_SET = 'test-fences';
export const DEV_FENCES = Object.freeze({
  // mtn-07 (OB box x −70…72, z −475…16; the forest starts 7 m beyond OB): a railFence 3 m beyond the left OB line,
  // over the bank of the left hill (≈ 11 % at z −145, the sloped run) and turning away at the far end; a ropeFence
  // 3 m beyond the right OB line. 595 m in all (SPEC §7.7: the perf check with ~600 m on mtn-07).
  'mtn-07': Object.freeze([
    Object.freeze({ id: 'railFence', points: Object.freeze([[-73, 14], [-73, -300], [-95, -330]]) }),
    Object.freeze({ id: 'ropeFence', points: Object.freeze([[75, 14], [75, -230]]) }),
  ]),
});

// The fences to draw on a hole with the set `biomeId`: the hole's own, plus the overlay's with the dev set
export const holeFences = (hole, biomeId) => [...(hole.scenery.fences ?? []), ...(biomeId === DEV_FENCES_SET ? DEV_FENCES[hole.id] ?? [] : [])];
