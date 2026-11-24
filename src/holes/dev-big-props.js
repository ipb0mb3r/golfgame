// AP7e: dev only. A hole-data overlay that shows one of each big prop beyond OB on a mountain hole without editing a
// real hole file: its props are added to the hole's own scenery.bigProps ONLY when the visit is dressed in the
// dev set test-big-props (?hole=mtn-07&biome=test-big-props). Never used otherwise; no menu lists it. Each entry
// is checked like a hole's own list (tests/big-props.test.js: offered by test-big-props, the scale range, clear of
// OB + 5 m). Real holes get their props from the course designer, in their own scenery.bigProps.
export const DEV_BIG_PROPS_SET = 'test-big-props';
export const DEV_BIG_PROPS = Object.freeze({
  // mtn-07 (OB box x −70…72, z −475…16): the rough's trees in play line the left side and the back of the green, so
  // (spaced and kept off OB so they still fit at BIG_PROP_SCALE up to 2.5; a bigger scale clips what would reach inside OB + 5 m)
  // all four stand beyond the open right rough of the first 160 m, each front turned toward the tee (turn 0 = the
  // front faces +z): from the tee, aim right (▶) to see them all; on a phone they also show as the ball flies.
  'mtn-07': Object.freeze([
    Object.freeze({ id: 'chalet', x: 124, z: -50, turn: -1.3, scale: 1 }),
    Object.freeze({ id: 'chaletTall', x: 118, z: -100, turn: -1.0, scale: 0.95 }),
    Object.freeze({ id: 'windmill', x: 100, z: -150, turn: -0.8, scale: 1 }),
    Object.freeze({ id: 'beachHut', x: 96, z: -198, turn: -0.6, scale: 1.15 }),
    // AP7i: a herd of 4 (2 standing, 2 grazing, the 3 patch layouts) in the rail-fence pasture below, beyond the right
    // OB line next to the tee: every cow ≥ 3 m (scaled footprint) inside the rails, mostly side-on or facing the course
    Object.freeze({ id: 'cow', x: 90, z: -2, turn: -1.3, pose: 'stand', pattern: 0 }),
    Object.freeze({ id: 'cow', x: 98, z: -13, turn: -2.3, scale: 1.05, pose: 'graze', pattern: 1 }),
    Object.freeze({ id: 'cow', x: 90, z: -22, turn: 0.6, scale: 0.95, pose: 'graze', pattern: 2 }),
    Object.freeze({ id: 'cow', x: 100, z: 2, turn: -0.4, scale: 1.1, pattern: 1 }),
  ]),
});
// AP7i: the cows' pasture (a closed railFence: x 80…108, z 12…−34, 148 m), laid with the dev set only, like the props
export const DEV_BIG_PROPS_FENCES = Object.freeze({
  'mtn-07': Object.freeze([
    Object.freeze({ id: 'railFence', points: Object.freeze([[80, 12], [108, 12], [108, -34], [80, -34], [80, 12]]) }),
  ]),
});

// The big props to draw on a hole with the set `biomeId`: the hole's own, plus the overlay's with the dev set
export const holeBigProps = (hole, biomeId) => [...(hole.scenery.bigProps ?? []), ...(biomeId === DEV_BIG_PROPS_SET ? DEV_BIG_PROPS[hole.id] ?? [] : [])];
// AP7i: the overlay's fences (the pasture) with the dev set, added to the hole's own (src/game/scene.js)
export const devBigPropsFences = (hole, biomeId) => (biomeId === DEV_BIG_PROPS_SET ? DEV_BIG_PROPS_FENCES[hole.id] ?? [] : []);
